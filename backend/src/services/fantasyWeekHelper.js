/**
 * Fantasy Week Helper Service
 *
 * Determines the current fantasy week for a league and whether lineups are locked.
 * Locked when: FantasyWeek status is LOCKED/IN_PROGRESS OR tournament.startDate <= now
 */

/**
 * Get the current fantasy week for a league.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ fantasyWeek, tournament, isLocked, lockTime } | null}
 */
async function getCurrentFantasyWeek(leagueId, prisma) {
  // Find current season
  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  if (!currentSeason) return null

  // Find the league's sport
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sportId: true },
  })
  if (!league) return null

  // Find the first UPCOMING, LOCKED, or IN_PROGRESS fantasy week for this season
  const fantasyWeek = await prisma.fantasyWeek.findFirst({
    where: {
      seasonId: currentSeason.id,
      status: { in: ['UPCOMING', 'LOCKED', 'IN_PROGRESS'] },
    },
    orderBy: { startDate: 'asc' },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  if (!fantasyWeek) return null

  const now = new Date()
  const tournament = fantasyWeek.tournament
  const lockTime = tournament?.startDate || fantasyWeek.startDate

  // Determine lock status
  const isLocked =
    fantasyWeek.status === 'LOCKED' ||
    fantasyWeek.status === 'IN_PROGRESS' ||
    (lockTime && now >= new Date(lockTime))

  return {
    fantasyWeek: {
      id: fantasyWeek.id,
      name: fantasyWeek.name,
      weekNumber: fantasyWeek.weekNumber,
      status: fantasyWeek.status,
      startDate: fantasyWeek.startDate,
      endDate: fantasyWeek.endDate,
    },
    tournament: tournament
      ? {
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.startDate,
          status: tournament.status,
        }
      : null,
    isLocked,
    lockTime: lockTime ? new Date(lockTime).toISOString() : null,
  }
}

module.exports = { getCurrentFantasyWeek }
