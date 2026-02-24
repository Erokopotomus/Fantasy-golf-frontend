/**
 * Historical Tournament Results Backfill
 *
 * Fetches historical round-level data from DataGolf for past seasons,
 * creates Tournament and Performance records, then recalculates all
 * Player career stats from the Performance table.
 *
 * Usage (via API):
 *   POST /api/sync/backfill-historical  { year: 2024 }
 *   POST /api/sync/recalculate-stats
 *
 * Or standalone:
 *   DATABASE_URL="..." DATAGOLF_API_KEY="..." node -e "require('./src/services/historicalBackfill').backfillYear(2024)"
 */

const dg = require('./datagolfClient')

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse finishing position text like "1", "T5", "CUT", "WD", "DQ" → number or null */
function parseFinPos(finText) {
  if (!finText) return { position: null, status: 'ACTIVE' }
  const s = String(finText).trim().toUpperCase()
  if (s === 'CUT' || s === 'MC') return { position: null, status: 'CUT' }
  if (s === 'WD' || s === 'W/D') return { position: null, status: 'WD' }
  if (s === 'DQ') return { position: null, status: 'DQ' }
  // "T5" → 5, "1" → 1, "T25" → 25
  const num = parseInt(s.replace(/^T/i, ''), 10)
  if (!isNaN(num)) return { position: num, status: 'ACTIVE' }
  return { position: null, status: 'ACTIVE' }
}

/** Run an array of Prisma operations in batched transactions (chunks of 50) */
async function batchTransaction(prisma, operations, chunkSize = 50) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize)
    await prisma.$transaction(chunk)
  }
}

// ─── Backfill Historical Results for a Year ─────────────────────────────────

async function backfillYear(year, prisma) {
  if (!prisma) {
    // Standalone mode
    prisma = require('../lib/prisma')
  }

  console.log(`[Backfill] Starting historical backfill for ${year}...`)

  // 1. Fetch all historical rounds for this year from DataGolf
  console.log(`[Backfill] Fetching historical rounds for PGA ${year}...`)
  const rawData = await dg.getHistoricalRounds('pga', undefined, year)

  // DataGolf returns an array of round objects (or nested in a key)
  const rounds = Array.isArray(rawData) ? rawData
    : rawData?.rounds || rawData?.data || rawData?.results || []

  if (rounds.length === 0) {
    console.log(`[Backfill] No historical round data returned for ${year}`)
    return { year, tournaments: 0, performances: 0 }
  }

  console.log(`[Backfill] Got ${rounds.length} round records for ${year}`)

  // Log a sample record to understand the shape
  console.log(`[Backfill] Sample round record keys: ${Object.keys(rounds[0]).join(', ')}`)
  console.log(`[Backfill] Sample round:`, JSON.stringify(rounds[0]).slice(0, 500))

  // 2. Group rounds by tournament (event_id or event_name)
  const tournamentMap = new Map() // eventKey → { name, rounds: [] }
  for (const round of rounds) {
    const eventKey = String(round.event_id || round.dg_event_id || round.event_name || 'unknown')
    if (!tournamentMap.has(eventKey)) {
      tournamentMap.set(eventKey, {
        eventId: eventKey,
        eventName: round.event_name || round.tournament_name || round.event || eventKey,
        courseName: round.course_name || round.course || null,
        year: round.year || round.calendar_year || round.season || year,
        tour: round.tour || 'pga',
        rounds: [],
      })
    }
    tournamentMap.get(eventKey).rounds.push(round)
  }

  console.log(`[Backfill] Found ${tournamentMap.size} tournaments for ${year}`)

  // 3. Load existing player map (datagolfId → playerId)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))
  console.log(`[Backfill] ${playerMap.size} players in DB with datagolfId`)

  // 4. Load existing tournaments
  const existingTournaments = await prisma.tournament.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const tournamentDbMap = new Map(existingTournaments.map((t) => [t.datagolfId, t.id]))

  let tournamentsCreated = 0
  let performancesUpserted = 0
  let playersNotFound = 0

  // 5. Process each tournament
  for (const [eventKey, tourData] of tournamentMap) {
    const dgId = String(eventKey)

    // a. Find or create Tournament record
    let tournamentId = tournamentDbMap.get(dgId)
    if (!tournamentId) {
      // Create a new Tournament for this historical event
      try {
        const tournament = await prisma.tournament.create({
          data: {
            datagolfId: dgId,
            name: tourData.eventName,
            shortName: tourData.eventName,
            tour: tourData.tour === 'euro' ? 'DP World' : 'PGA',
            status: 'COMPLETED',
            startDate: new Date(`${tourData.year}-01-01`), // placeholder
            endDate: new Date(`${tourData.year}-01-04`),   // placeholder
            sourceProvider: 'datagolf_backfill',
            sourceIngestedAt: new Date(),
          },
        })
        tournamentId = tournament.id
        tournamentDbMap.set(dgId, tournamentId)
        tournamentsCreated++
        console.log(`[Backfill] Created tournament: ${tourData.eventName} (DG: ${dgId})`)
      } catch (err) {
        // Might be a unique constraint violation if race condition
        const existing = await prisma.tournament.findFirst({ where: { datagolfId: dgId } })
        if (existing) {
          tournamentId = existing.id
          tournamentDbMap.set(dgId, tournamentId)
        } else {
          console.error(`[Backfill] Failed to create tournament ${dgId}: ${err.message}`)
          continue
        }
      }
    }

    // b. Group rounds by player within this tournament
    const playerRounds = new Map() // dgPlayerId → [round, round, ...]
    for (const round of tourData.rounds) {
      const playerDgId = String(round.dg_id || round.player_id || round.datagolf_id)
      if (!playerDgId || playerDgId === 'undefined') continue
      if (!playerRounds.has(playerDgId)) playerRounds.set(playerDgId, [])
      playerRounds.get(playerDgId).push(round)
    }

    // c. Create Performance records for each player
    const perfOps = []
    for (const [playerDgId, pRounds] of playerRounds) {
      const playerId = playerMap.get(playerDgId)
      if (!playerId) {
        playersNotFound++
        continue
      }

      // Derive final position from first round's fin_text (all rounds share same fin position)
      const { position, status } = parseFinPos(
        pRounds[0]?.fin_text || pRounds[0]?.finish_position || pRounds[0]?.fin_pos
      )

      // Calculate average SG stats across rounds (DataGolf provides per-round SG)
      const activeRounds = pRounds.filter(r => {
        const s = String(r.fin_text || '').toUpperCase()
        return s !== 'CUT' && s !== 'MC' && s !== 'WD' && s !== 'DQ'
      })
      const roundCount = activeRounds.length || pRounds.length

      const sgFields = ['sg_total', 'sg_putt', 'sg_app', 'sg_arg', 'sg_ott', 'sg_t2g']
      const sgAvg = {}
      for (const field of sgFields) {
        const vals = pRounds.filter(r => r[field] != null).map(r => parseFloat(r[field]))
        sgAvg[field] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }

      // Sum round scores for total
      const roundScores = pRounds
        .filter(r => r.score != null || r.round_score != null)
        .sort((a, b) => (a.round_num || a.round || 0) - (b.round_num || b.round || 0))

      const totalScore = roundScores.reduce((sum, r) => sum + (r.score || r.round_score || 0), 0) || null

      // Extract individual round scores
      const r1 = roundScores.find(r => (r.round_num || r.round) === 1)
      const r2 = roundScores.find(r => (r.round_num || r.round) === 2)
      const r3 = roundScores.find(r => (r.round_num || r.round) === 3)
      const r4 = roundScores.find(r => (r.round_num || r.round) === 4)

      const perfData = {
        status,
        position: typeof position === 'number' ? position : null,
        totalScore: totalScore || null,
        round1: r1 ? (r1.score || r1.round_score || null) : null,
        round2: r2 ? (r2.score || r2.round_score || null) : null,
        round3: r3 ? (r3.score || r3.round_score || null) : null,
        round4: r4 ? (r4.score || r4.round_score || null) : null,
        sgTotal: sgAvg.sg_total,
        sgPutting: sgAvg.sg_putt,
        sgApproach: sgAvg.sg_app,
        sgAroundGreen: sgAvg.sg_arg,
        sgOffTee: sgAvg.sg_ott,
        sgTeeToGreen: sgAvg.sg_t2g,
      }

      // Remove null/undefined keys
      for (const k of Object.keys(perfData)) {
        if (perfData[k] === undefined) delete perfData[k]
      }

      perfOps.push(
        prisma.performance.upsert({
          where: { tournamentId_playerId: { tournamentId, playerId } },
          update: perfData,
          create: { tournamentId, playerId, ...perfData },
        })
      )
    }

    // Execute performance upserts in batches
    if (perfOps.length > 0) {
      await batchTransaction(prisma, perfOps)
      performancesUpserted += perfOps.length
    }

    console.log(`[Backfill] ${tourData.eventName}: ${perfOps.length} performances`)
  }

  console.log(`[Backfill] Year ${year} complete: ${tournamentsCreated} new tournaments, ${performancesUpserted} performances, ${playersNotFound} player refs not found`)
  return { year, tournamentsCreated, performancesUpserted, playersNotFound }
}

// ─── Recalculate Player Career Stats from Performance Table ─────────────────

async function recalculatePlayerCareerStats(prisma) {
  if (!prisma) {
    prisma = require('../lib/prisma')
  }

  console.log('[Recalc] Recalculating all player career stats from Performance records...')

  // Get aggregated stats from Performance table
  const stats = await prisma.$queryRaw`
    SELECT
      "playerId",
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE status = 'ACTIVE' OR status IS NULL)::int AS "cutsMade",
      COUNT(*) FILTER (WHERE position = 1)::int AS wins,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 5)::int AS top5s,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 10)::int AS top10s,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 25)::int AS top25s,
      COALESCE(SUM(earnings), 0)::float AS earnings
    FROM performances
    WHERE "playerId" IS NOT NULL
    GROUP BY "playerId"
  `

  console.log(`[Recalc] Got stats for ${stats.length} players`)

  // Update each player's career stats
  const ops = []
  for (const row of stats) {
    ops.push(
      prisma.player.update({
        where: { id: row.playerId },
        data: {
          events: row.events || 0,
          cutsMade: row.cutsMade || 0,
          wins: row.wins || 0,
          top5s: row.top5s || 0,
          top10s: row.top10s || 0,
          top25s: row.top25s || 0,
          earnings: row.earnings || 0,
        },
      })
    )
  }

  await batchTransaction(prisma, ops)
  console.log(`[Recalc] Updated career stats for ${ops.length} players`)

  // Log top performers for sanity check
  const topWinners = await prisma.player.findMany({
    where: { wins: { gt: 0 } },
    orderBy: { wins: 'desc' },
    take: 10,
    select: { name: true, wins: true, top10s: true, events: true },
  })
  console.log('[Recalc] Top 10 winners:')
  for (const p of topWinners) {
    console.log(`  ${p.name}: ${p.wins}W, ${p.top10s} top-10s, ${p.events} events`)
  }

  return { playersUpdated: ops.length, topWinners }
}

// ─── Full Backfill (Multiple Years) ─────────────────────────────────────────

async function backfillMultipleYears(years, prisma) {
  if (!prisma) {
    prisma = require('../lib/prisma')
  }

  const results = []
  for (const year of years) {
    try {
      const result = await backfillYear(year, prisma)
      results.push(result)
    } catch (err) {
      console.error(`[Backfill] Year ${year} failed: ${err.message}`)
      results.push({ year, error: err.message })
    }
  }

  // After all years are done, recalculate career stats
  const statsResult = await recalculatePlayerCareerStats(prisma)

  return { years: results, statsRecalculated: statsResult }
}

module.exports = {
  backfillYear,
  backfillMultipleYears,
  recalculatePlayerCareerStats,
}
