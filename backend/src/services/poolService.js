const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

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

module.exports = { generateUniqueSlug, generateAdminToken, randomSlug, recomputePoolScores }
