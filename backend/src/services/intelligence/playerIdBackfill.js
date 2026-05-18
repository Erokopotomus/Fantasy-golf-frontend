const prisma = require('../../lib/prisma')
const { matchAndLink, matchPlayer } = require('../playerMatcher')

/**
 * Walk every HistoricalSeason.draftData row, classify each pick as
 * exact-match / fuzzy-enriched / missed / skipped, populate Player.{platform}Id
 * via matchAndLink as a side effect.
 *
 * @param {object} args
 * @param {boolean} args.dryRun - if true, no DB writes (just classify)
 * @param {object} [args.db] - Prisma client (defaults to singleton)
 * @param {function} [args.onProgress] - called periodically with { picksProcessed, totalPicksEstimate, currentSeasonIndex, totalSeasons, stats }
 * @returns {Promise<{stats, misses, durationMs}>}
 */
async function runBackfill({ dryRun = false, db = prisma, onProgress = null } = {}) {
  const start = Date.now()

  const seasons = await db.historicalSeason.findMany({
    where: { draftData: { not: null } },
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
      draftData: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  const stats = {
    totalPicks: 0,
    skippedNoPlatform: 0,
    skippedNoPlayerId: 0,
    skippedFantrax: 0,
    skippedMflNoName: 0,
    exactMatch: 0,
    fuzzyMatchEnriched: 0,
    missed: 0,
    errors: 0,
  }
  const misses = []

  // Rough total estimate for progress callbacks
  const totalSeasons = seasons.length
  const totalPicksEstimate = seasons.reduce((acc, s) => {
    return acc + (Array.isArray(s.draftData?.picks) ? s.draftData.picks.length : 0)
  }, 0)
  const PROGRESS_EVERY = 200 // emit progress callback every N picks

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i]
    const platform = season.import?.sourcePlatform?.toLowerCase()
    if (!platform) { stats.skippedNoPlatform++; continue }
    if (platform === 'fantrax') { stats.skippedFantrax++; continue }

    const picks = Array.isArray(season.draftData?.picks) ? season.draftData.picks : []

    for (const pick of picks) {
      stats.totalPicks++

      if (!pick.playerId) { stats.skippedNoPlayerId++; continue }
      if (platform === 'mfl' && !pick.playerName) { stats.skippedMflNoName++; }

      try {
        const idField = `${platform}Id`
        const preMatch = await db.player.findFirst({
          where: { [idField]: String(pick.playerId) },
          select: { id: true },
        })

        if (dryRun) {
          if (preMatch) { stats.exactMatch++; continue }
          const fuzzy = await matchPlayer({
            name: pick.playerName,
            platform,
            platformId: pick.playerId,
            position: pick.position,
            sport: 'nfl',
          }, db)
          if (fuzzy) { stats.fuzzyMatchEnriched++; continue }
          stats.missed++
          misses.push({
            platform, playerId: pick.playerId, playerName: pick.playerName,
            position: pick.position, seasonYear: season.seasonYear,
            ownerName: season.ownerName, leagueId: season.leagueId,
          })
        } else {
          const matched = await matchAndLink({
            name: pick.playerName,
            platform,
            platformId: String(pick.playerId),
            position: pick.position,
            sport: 'nfl',
          }, db, { createIfMissing: false })

          if (matched) {
            if (preMatch) stats.exactMatch++
            else stats.fuzzyMatchEnriched++
          } else {
            stats.missed++
            misses.push({
              platform, playerId: pick.playerId, playerName: pick.playerName,
              position: pick.position, seasonYear: season.seasonYear,
              ownerName: season.ownerName, leagueId: season.leagueId,
            })
          }
        }
      } catch (e) {
        stats.errors++
        if (onProgress) {
          // Don't block, but surface the error via progress so client can see
        }
      }

      // Progress callback every PROGRESS_EVERY picks
      if (onProgress && stats.totalPicks % PROGRESS_EVERY === 0) {
        try {
          await onProgress({
            picksProcessed: stats.totalPicks,
            totalPicksEstimate,
            currentSeasonIndex: i,
            totalSeasons,
            stats: { ...stats },
          })
        } catch (cbError) {
          // Don't let progress callback crash the backfill
          console.warn('[backfill] progress callback error:', cbError.message)
        }
      }
    }
  }

  return { stats, misses, durationMs: Date.now() - start }
}

/**
 * Aggregate miss data by platform for reporting.
 */
function summarizeMisses(misses) {
  const byPlatform = {}
  for (const m of misses) {
    byPlatform[m.platform] = byPlatform[m.platform] || { count: 0, samples: [] }
    byPlatform[m.platform].count++
    if (byPlatform[m.platform].samples.length < 10) {
      byPlatform[m.platform].samples.push(m.playerName || '(no name)')
    }
  }
  return byPlatform
}

module.exports = { runBackfill, summarizeMisses }
