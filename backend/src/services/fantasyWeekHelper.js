/**
 * Fantasy Week Helper Service
 *
 * Determines the current fantasy week for a league and whether lineups are locked.
 * Locked when: FantasyWeek status is LOCKED/IN_PROGRESS, OR for golf: 7 AM ET on tournament start day, OR for NFL: earliest kickoff time.
 * When two tournaments share a week (e.g., main event + alternate), prefers non-alternate > major > signature > higher purse.
 */

/**
 * Get the current fantasy week for a league.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ fantasyWeek, tournament, isLocked, lockTime } | null}
 */
async function getCurrentFantasyWeek(leagueId, prisma) {
  // Find the league's sport
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sportId: true },
  })
  if (!league) return null

  // Find current season for this league's sport
  const currentSeason = await prisma.season.findFirst({
    where: { isCurrent: true, ...(league.sportId ? { sportId: league.sportId } : {}) },
  })
  if (!currentSeason) return null

  // Find ALL active fantasy weeks, then pick the best when multiple share the same date
  // (e.g., Arnold Palmer Invitational vs Puerto Rico Open in the same week)
  const candidateWeeks = await prisma.fantasyWeek.findMany({
    where: {
      seasonId: currentSeason.id,
      status: { in: ['UPCOMING', 'LOCKED', 'IN_PROGRESS'] },
    },
    orderBy: { startDate: 'asc' },
    take: 10,
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
          isAlternate: true,
          isMajor: true,
          isSignature: true,
          purse: true,
        },
      },
    },
  })

  if (candidateWeeks.length === 0) return null

  // Among weeks sharing the earliest start date, prefer:
  // non-alternate > major > signature > higher purse
  const earliestDate = candidateWeeks[0].startDate?.toISOString?.()?.split('T')[0]
  const sameWeekCandidates = candidateWeeks.filter(w => {
    const d = w.startDate?.toISOString?.()?.split('T')[0]
    return d === earliestDate
  })

  sameWeekCandidates.sort((a, b) => {
    const aT = a.tournament || {}
    const bT = b.tournament || {}
    // Non-alternate events first
    if ((aT.isAlternate || false) !== (bT.isAlternate || false)) {
      return (aT.isAlternate ? 1 : 0) - (bT.isAlternate ? 1 : 0)
    }
    // Majors first
    if ((aT.isMajor || false) !== (bT.isMajor || false)) return bT.isMajor ? 1 : -1
    // Signature events next
    if ((aT.isSignature || false) !== (bT.isSignature || false)) return bT.isSignature ? 1 : -1
    // Higher purse wins
    return (bT.purse || 0) - (aT.purse || 0)
  })

  const fantasyWeek = sameWeekCandidates[0]

  const now = new Date()
  const tournament = fantasyWeek.tournament

  // Determine lock time based on sport
  let lockTime
  const isNfl = league.sportId
    ? (await prisma.sport.findUnique({ where: { id: league.sportId }, select: { slug: true } }))?.slug === 'nfl'
    : false

  if (isNfl) {
    // NFL: lock at the earliest game kickoff in this week
    const season = await prisma.season.findUnique({
      where: { id: fantasyWeek.seasonId },
      select: { year: true },
    })
    if (season) {
      const earliestGame = await prisma.nflGame.findFirst({
        where: { season: season.year, week: fantasyWeek.weekNumber, gameType: 'REG' },
        orderBy: { kickoff: 'asc' },
        select: { kickoff: true },
      })
      lockTime = earliestGame?.kickoff || fantasyWeek.startDate
    } else {
      lockTime = fantasyWeek.startDate
    }
  } else {
    // Golf: lock at 7 AM ET on tournament start day (first tee time),
    // not midnight UTC which falsely shows "locked" the evening before.
    lockTime = tournament?.startDate || fantasyWeek.startDate
  }

  // Determine lock status
  let isLocked =
    fantasyWeek.status === 'LOCKED' ||
    fantasyWeek.status === 'IN_PROGRESS'

  if (!isLocked && lockTime) {
    if (isNfl) {
      // NFL: lock at exact kickoff time (already a precise timestamp)
      isLocked = now >= new Date(lockTime)
    } else {
      // Golf: locked once it's past 7 AM ET on tournament start day
      const etOffset = -5 // Eastern Time (EST; adjust to -4 for EDT if needed)
      const nowET = new Date(now.getTime() + etOffset * 60 * 60 * 1000)
      const todayET = nowET.toISOString().split('T')[0]
      const etHour = nowET.getUTCHours()
      const startDay = new Date(lockTime).toISOString().split('T')[0]
      isLocked = todayET > startDay || (todayET === startDay && etHour >= 7)
    }
  }

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

/**
 * Get the effective starter count for a league + fantasy week.
 * Checks for a WeeklyRosterOverride first, falls back to league default.
 *
 * @param {string} leagueId
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<number>}
 */
async function getEffectiveStarterCount(leagueId, fantasyWeekId, prisma) {
  const override = await prisma.weeklyRosterOverride.findUnique({
    where: { leagueId_fantasyWeekId: { leagueId, fantasyWeekId } },
    select: { starterCount: true },
  })
  if (override) return override.starterCount

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  return league?.settings?.maxActiveLineup || 4
}

module.exports = { getCurrentFantasyWeek, getEffectiveStarterCount }
