const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

const TOURNAMENT_ROUNDS = 4 // PGA majors / standard PGA tour events

// Slug: 6 lowercase alphanumeric chars (~36^6 ≈ 2B possibilities, fine for low collision risk).
function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function generateUniqueSlug(maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = randomSlug()
    const existing = await prisma.pool.findUnique({ where: { slug }, select: { id: true } })
    if (!existing) return slug
  }
  throw new Error('Could not generate unique slug after 8 attempts')
}

function generateAdminToken() {
  return crypto.randomBytes(24).toString('hex')
}

/**
 * Recompute fantasyPoints on every PoolPick for this pool, then sum into
 * PoolEntry.totalFantasyPoints. Idempotent — safe to run repeatedly.
 */
async function recomputePoolScores(poolId, prismaClient = prisma) {
  const pool = await prismaClient.pool.findUnique({
    where: { id: poolId },
    select: { tournamentId: true, scoringPreset: true },
  })
  if (!pool) return { updated: 0 }

  const scoringConfig = getDefaultScoringConfig(pool.scoringPreset || 'standard')

  const performances = await prismaClient.performance.findMany({
    where: { tournamentId: pool.tournamentId },
    include: {
      roundScores: { where: { tournamentId: pool.tournamentId } },
    },
  })
  const perfByPlayer = new Map(performances.map(p => [p.playerId, p]))

  const entries = await prismaClient.poolEntry.findMany({
    where: { poolId },
    include: { picks: true },
  })

  const pickUpdates = []
  const entryUpdates = []
  for (const entry of entries) {
    let entryTotal = 0
    for (const pick of entry.picks) {
      const perf = perfByPlayer.get(pick.playerId)
      const points = perf ? (calculateFantasyPoints({ ...perf, roundScores: perf.roundScores || [] }, scoringConfig).total || 0) : 0
      if (pick.fantasyPoints !== points) {
        pickUpdates.push(prismaClient.poolPick.update({ where: { id: pick.id }, data: { fantasyPoints: points } }))
      }
      entryTotal += points
    }
    if (entry.totalFantasyPoints !== entryTotal) {
      entryUpdates.push(prismaClient.poolEntry.update({ where: { id: entry.id }, data: { totalFantasyPoints: entryTotal } }))
    }
  }

  await Promise.all([...pickUpdates, ...entryUpdates])
  return { entries: entries.length, picksUpdated: pickUpdates.length, entriesUpdated: entryUpdates.length }
}

/**
 * To Par pool scoring — the "office pool" model.
 *
 * For each pick:
 *   - Sum actual round strokes from RoundScore records
 *   - For every missing/unplayed round (cut, WD, future): add `cutScore` strokes
 *   - Player's pick score = (totalStrokes) − (4 × course par)
 *
 * For each entry:
 *   - If pool.countPicks is set, only the lowest N pick scores count
 *   - Sum the counted picks' to-par scores
 *   - Lowest total wins
 */
async function recomputePoolScoresToPar(poolId, prismaClient = prisma) {
  const pool = await prismaClient.pool.findUnique({
    where: { id: poolId },
    select: {
      tournamentId: true,
      cutScoreToPar: true,
      countPicks: true,
      tournament: {
        select: {
          status: true,
          course: { select: { par: true } },
        },
      },
    },
  })
  if (!pool) return { updated: 0 }

  const coursePar = pool.tournament?.course?.par ?? 72
  // Strokes assigned per missed round = course par + the over-par offset (default +2)
  const cutStrokes = coursePar + (pool.cutScoreToPar ?? 2)
  // Only apply the cut-round penalty to unplayed rounds once the tournament is
  // over OR the player is out (CUT/WD). While play is live, unplayed rounds
  // simply don't count yet — otherwise everyone reads +80 at Thursday tee time.
  const tournamentDone = pool.tournament?.status === 'COMPLETED'

  // Load performances — Performance has round1..round4 columns directly (strokes per round)
  const performances = await prismaClient.performance.findMany({
    where: { tournamentId: pool.tournamentId },
    select: { playerId: true, status: true, round1: true, round2: true, round3: true, round4: true },
  })
  const perfByPlayer = new Map(performances.map(p => [p.playerId, p]))

  // Load all entries with picks
  const entries = await prismaClient.poolEntry.findMany({
    where: { poolId },
    include: { picks: true },
  })

  const pickUpdates = []
  const entryUpdates = []

  for (const entry of entries) {
    const scoredPicks = []
    for (const pick of entry.picks) {
      const perf = perfByPlayer.get(pick.playerId)
      const rounds = perf ? [perf.round1, perf.round2, perf.round3, perf.round4] : [null, null, null, null]

      // Sum actual round strokes that are present.
      let actualStrokes = 0
      let roundsPlayed = 0
      for (const r of rounds) {
        if (r != null && r > 0) {
          actualStrokes += r
          roundsPlayed += 1
        }
      }
      const isPlayerOut = perf?.status === 'CUT' || perf?.status === 'WD'
      let totalStrokes, expectedPar
      if (tournamentDone || isPlayerOut) {
        // Penalize unplayed rounds with the cut-score offset
        const missingRounds = TOURNAMENT_ROUNDS - roundsPlayed
        totalStrokes = actualStrokes + (missingRounds * cutStrokes)
        expectedPar = TOURNAMENT_ROUNDS * coursePar
      } else {
        // Live tournament, player still in: only count what they've played
        totalStrokes = actualStrokes
        expectedPar = roundsPlayed * coursePar
      }
      const scoreToPar = totalStrokes - expectedPar

      scoredPicks.push({ pickId: pick.id, scoreToPar, roundsPlayed })

      // Persist per-pick score
      if (pick.scoreToPar !== scoreToPar || pick.roundsPlayed !== roundsPlayed) {
        pickUpdates.push(prismaClient.poolPick.update({
          where: { id: pick.id },
          data: { scoreToPar, roundsPlayed },
        }))
      }
    }

    // Determine which picks count
    let countedPicks = scoredPicks
    if (pool.countPicks && pool.countPicks > 0 && pool.countPicks < scoredPicks.length) {
      countedPicks = [...scoredPicks].sort((a, b) => a.scoreToPar - b.scoreToPar).slice(0, pool.countPicks)
    }

    const totalScoreToPar = countedPicks.reduce((sum, p) => sum + p.scoreToPar, 0)

    if (entry.totalScoreToPar !== totalScoreToPar) {
      entryUpdates.push(prismaClient.poolEntry.update({
        where: { id: entry.id },
        data: { totalScoreToPar },
      }))
    }
  }

  await Promise.all([...pickUpdates, ...entryUpdates])
  return {
    entries: entries.length,
    picksUpdated: pickUpdates.length,
    entriesUpdated: entryUpdates.length,
    coursePar,
    cutScoreStrokes: cutStrokes,
  }
}

/**
 * Dispatch wrapper: route to the right scorer based on pool.scoringMode.
 */
async function recomputePool(poolId, prismaClient = prisma) {
  const pool = await prismaClient.pool.findUnique({
    where: { id: poolId },
    select: { scoringMode: true },
  })
  if (!pool) return { updated: 0 }

  if (pool.scoringMode === 'to_par') {
    return recomputePoolScoresToPar(poolId, prismaClient)
  }
  // Legacy fantasy-points scoring (for pools created before V2)
  return recomputePoolScores(poolId, prismaClient)
}

module.exports = {
  generateUniqueSlug,
  generateAdminToken,
  randomSlug,
  recomputePoolScores,       // legacy fantasy-points
  recomputePoolScoresToPar,  // V2 strokes-to-par
  recomputePool,             // dispatcher — call this from cron
}
