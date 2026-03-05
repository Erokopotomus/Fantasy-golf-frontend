/**
 * Fantasy Week Helper Service
 *
 * Determines the current fantasy week for a league and whether lineups are locked.
 * Locked when: FantasyWeek status is LOCKED/IN_PROGRESS, OR for golf: actual R1 first tee time (from RoundScore data, fallback 7 AM ET), OR for NFL: earliest kickoff time.
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
    // Golf: lock at the ACTUAL first tee time of Round 1.
    // Query RoundScore for the earliest R1 tee time for this tournament.
    // Fallback: 7 AM ET on tournament start day if no tee times synced yet.
    let firstTeeTime = null
    if (tournament?.id) {
      const earliestTee = await prisma.roundScore.findFirst({
        where: { tournamentId: tournament.id, roundNumber: 1, teeTime: { not: null } },
        orderBy: { teeTime: 'asc' },
        select: { teeTime: true },
      })
      firstTeeTime = earliestTee?.teeTime || null
    }

    if (firstTeeTime) {
      // Use the actual first tee time as the lock moment
      lockTime = firstTeeTime
    } else {
      // Fallback: 7 AM ET on tournament start day
      const rawStart = tournament?.startDate || fantasyWeek.startDate
      if (rawStart) {
        const startDay = new Date(rawStart).toISOString().split('T')[0]
        // Determine EST vs EDT (DST starts 2nd Sunday of March)
        const sd = new Date(rawStart)
        const m = sd.getUTCMonth(), d = sd.getUTCDate()
        let utcHour = 12 // 7 AM EST = 12 UTC
        if (m > 2 && m < 10) { utcHour = 11 } // Apr-Oct = EDT
        else if (m === 2) {
          const firstDay = new Date(sd.getUTCFullYear(), 2, 1).getDay()
          const secondSunday = firstDay === 0 ? 8 : 15 - firstDay
          if (d >= secondSunday) utcHour = 11 // After 2nd Sunday = EDT
        } else if (m === 10) {
          const firstDay = new Date(sd.getUTCFullYear(), 10, 1).getDay()
          const firstSunday = firstDay === 0 ? 1 : 8 - firstDay
          if (d < firstSunday) utcHour = 11 // Before 1st Sunday Nov = still EDT
        }
        lockTime = new Date(`${startDay}T${String(utcHour).padStart(2, '0')}:00:00.000Z`)
      } else {
        lockTime = fantasyWeek.startDate
      }
    }
  }

  // Determine lock status
  let isLocked =
    fantasyWeek.status === 'LOCKED' ||
    fantasyWeek.status === 'IN_PROGRESS'

  if (!isLocked && lockTime) {
    // lockTime is now a precise timestamp for both NFL (kickoff) and golf (first tee time or 7AM ET fallback)
    isLocked = now >= new Date(lockTime)
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
