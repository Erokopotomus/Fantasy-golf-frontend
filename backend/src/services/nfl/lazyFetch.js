const nfl = require('../nflClient')
const nflHistoricalSync = require('../nflHistoricalSync')
const { syncFilteredWeeklyStats } = require('./filteredBackfill')

const LAZY_FETCH_SEASONS = [2021, 2022, 2023, 2024, 2025]

/**
 * On-demand fetch of a single player's recent career.
 * Fast-fails if the player has no gsisId. Idempotent — re-running is safe.
 *
 * @param {PrismaClient} prisma
 * @param {string} playerId - canonical Player.id
 * @returns {Promise<{ status: 'fetched' | 'already-loaded' | 'no-gsis-id' | 'not-found', inserted?: number, seasonStats?: object }>}
 */
async function lazyFetchPlayer(prisma, playerId) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, gsisId: true, name: true },
  })
  if (!player) return { status: 'not-found' }
  if (!player.gsisId) return { status: 'no-gsis-id' }

  const existing = await prisma.nflPlayerDataState.findUnique({ where: { playerId } })
  if (existing && (existing.inPool || (existing.lazyFetchedAt && !existing.lazyFetchError))) {
    return { status: 'already-loaded' }
  }

  console.log(`[lazyFetch] Loading career for ${player.name} (${player.gsisId})`)

  const pool = new Set([player.gsisId])
  const playerMap = new Map([[player.gsisId, player.id]])

  let totalInserted = 0
  let hadError = false
  const errorMessages = []
  const seasonStats = {}

  for (const season of LAZY_FETCH_SEASONS) {
    try {
      await nflHistoricalSync.syncScheduleRaw(prisma, season)
      const games = await prisma.nflGame.findMany({
        where: { season },
        select: {
          id: true,
          week: true,
          homeTeam: { select: { abbreviation: true } },
          awayTeam: { select: { abbreviation: true } },
        },
      })
      const gameMap = new Map()
      for (const g of games) {
        const homeAbbr = g.homeTeam?.abbreviation
        const awayAbbr = g.awayTeam?.abbreviation
        if (homeAbbr) gameMap.set(`${season}_${g.week}_${homeAbbr}`, g.id)
        if (awayAbbr) gameMap.set(`${season}_${g.week}_${awayAbbr}`, g.id)
      }

      const r = await syncFilteredWeeklyStats(prisma, season, playerMap, gameMap, pool)
      totalInserted += r.inserted
      seasonStats[season] = r.inserted
      if (r.insertErrors > 0) {
        hadError = true
        errorMessages.push(`${season}: ${r.insertErrors} chunk(s) failed during insert`)
      }
    } catch (e) {
      console.warn(`[lazyFetch] ${season} failed for ${player.name}: ${e.message}`)
      seasonStats[season] = `ERROR: ${e.message}`
      hadError = true
      errorMessages.push(`${season}: ${e.message}`)
    }
  }

  const now = new Date()
  const lastSeason = LAZY_FETCH_SEASONS[LAZY_FETCH_SEASONS.length - 1]
  const firstSeason = LAZY_FETCH_SEASONS[0]
  if (hadError) {
    // Don't stamp lazyFetchedAt so a future drawer click retries.
    // Write the error summary so an operator can see what happened.
    await prisma.nflPlayerDataState.upsert({
      where: { playerId: player.id },
      create: {
        playerId: player.id,
        inPool: false,
        lazyFetchError: errorMessages.join(' | ').slice(0, 500),
      },
      update: {
        lazyFetchError: errorMessages.join(' | ').slice(0, 500),
      },
    })
    return { status: 'fetch-error', inserted: totalInserted, seasonStats, errors: errorMessages }
  }

  await prisma.nflPlayerDataState.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      inPool: false,
      lazyFetchedAt: now,
      fetchedThrough: lastSeason,
      earliestFetched: firstSeason,
      lazyFetchError: null,
    },
    update: {
      lazyFetchedAt: now,
      fetchedThrough: lastSeason,
      earliestFetched: firstSeason,
      lazyFetchError: null,
    },
  })

  return { status: 'fetched', inserted: totalInserted, seasonStats }
}

module.exports = { lazyFetchPlayer, LAZY_FETCH_SEASONS }
