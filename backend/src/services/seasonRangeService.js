/**
 * Season Range Service
 *
 * Provides utilities for filtering fantasy weeks by a league's configured
 * season range and computing segment boundaries.
 *
 * Used by scoringService, fantasyTracker, and segmentScoringService.
 */

/**
 * Get the fantasy weeks that fall within a league's configured season range.
 * If no range is configured, returns ALL fantasy weeks for the season.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<Array<{id, weekNumber, name, tournamentId, status}>>}
 */
async function getLeagueSeasonWeeks(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, sportId: true },
  })
  if (!league) return []

  // Find active LeagueSeason
  const leagueSeason = await prisma.leagueSeason.findFirst({
    where: { leagueId, status: 'ACTIVE' },
    select: { seasonId: true },
  })

  // Fallback: find current season for the sport
  let seasonId = leagueSeason?.seasonId
  if (!seasonId && league.sportId) {
    const currentSeason = await prisma.season.findFirst({
      where: { sportId: league.sportId, isCurrent: true },
      select: { id: true },
    })
    seasonId = currentSeason?.id
  }
  if (!seasonId) return []

  const seasonRange = league.settings?.seasonRange || league.settings?.formatSettings?.seasonRange
  const startWeek = seasonRange?.startWeekNumber
  const endWeek = seasonRange?.endWeekNumber

  const where = { seasonId }

  if (startWeek != null && endWeek != null) {
    where.weekNumber = { gte: startWeek, lte: endWeek }
  }

  const weeks = await prisma.fantasyWeek.findMany({
    where,
    select: {
      id: true,
      weekNumber: true,
      name: true,
      tournamentId: true,
      status: true,
    },
    orderBy: { weekNumber: 'asc' },
  })

  return weeks
}

/**
 * Get the tournament IDs that fall within a league's season range.
 * Returns empty array if no range configured (meaning: no filter needed).
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<string[]>}
 */
async function getLeagueTournamentIds(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })

  const seasonRange = league?.settings?.seasonRange || league?.settings?.formatSettings?.seasonRange
  if (!seasonRange) return [] // No filter — backward compat

  const weeks = await getLeagueSeasonWeeks(leagueId, prisma)
  return weeks.map(w => w.tournamentId).filter(Boolean)
}

/**
 * Divide an ordered array of weeks into segments.
 * Distributes remainder weeks to earlier segments.
 *
 * @param {Array<{weekNumber: number}>} weeks - Ordered week objects
 * @param {number} segmentCount - Number of segments (1, 2, or 4)
 * @returns {Array<{segmentNumber, startWeekNumber, endWeekNumber, weeks: Array}>}
 */
function computeSegmentBoundaries(weeks, segmentCount) {
  if (!weeks || weeks.length === 0 || segmentCount <= 0) return []
  if (segmentCount === 1) {
    return [{
      segmentNumber: 1,
      startWeekNumber: weeks[0].weekNumber,
      endWeekNumber: weeks[weeks.length - 1].weekNumber,
      weeks,
    }]
  }

  const segments = []
  const baseSize = Math.floor(weeks.length / segmentCount)
  const remainder = weeks.length % segmentCount
  let offset = 0

  for (let i = 0; i < segmentCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0)
    const segWeeks = weeks.slice(offset, offset + size)
    if (segWeeks.length > 0) {
      segments.push({
        segmentNumber: i + 1,
        startWeekNumber: segWeeks[0].weekNumber,
        endWeekNumber: segWeeks[segWeeks.length - 1].weekNumber,
        weeks: segWeeks,
      })
    }
    offset += size
  }

  return segments
}

module.exports = {
  getLeagueSeasonWeeks,
  getLeagueTournamentIds,
  computeSegmentBoundaries,
}
