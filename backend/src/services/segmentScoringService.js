/**
 * Segment Scoring Service
 *
 * Processes segment completion for Full League format.
 * When the last fantasy week of a segment completes, awards bonus points
 * to the segment winner and records it in TeamSeason.stats.
 */

const { getLeagueSeasonWeeks, computeSegmentBoundaries } = require('./seasonRangeService')

/**
 * Process segment completion for a just-completed fantasy week.
 * Checks all active league seasons to see if this week ends any segment.
 *
 * @param {string} fantasyWeekId - The completed fantasy week ID
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function processSegmentCompletion(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
    select: { id: true, weekNumber: true, seasonId: true },
  })
  if (!fantasyWeek) return

  // Find all active league seasons for this season
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { status: 'ACTIVE', seasonId: fantasyWeek.seasonId },
    include: {
      league: { select: { id: true, settings: true, format: true } },
      teamSeasons: {
        include: {
          team: { select: { id: true, name: true, userId: true } },
        },
      },
    },
  })

  for (const ls of leagueSeasons) {
    // Only process Full League format
    if (ls.league.format !== 'FULL_LEAGUE') continue

    const settings = ls.league.settings || {}
    const segmentCount = settings.segments || settings.formatSettings?.segments || 1
    const segmentBonus = settings.segmentBonus ?? settings.formatSettings?.segmentBonus ?? 25

    // Skip if no segments or no bonus
    if (segmentCount <= 1 || segmentBonus <= 0) continue

    // Check if league has a season range configured
    const seasonRange = settings.seasonRange || settings.formatSettings?.seasonRange
    if (!seasonRange) continue // No range = can't compute segments meaningfully

    const weeks = await getLeagueSeasonWeeks(ls.league.id, prisma)
    if (weeks.length === 0) continue

    const boundaries = computeSegmentBoundaries(weeks, segmentCount)

    // Check if the completed week is the last week of any segment
    for (const seg of boundaries) {
      const lastWeek = seg.weeks[seg.weeks.length - 1]
      if (lastWeek.id !== fantasyWeekId) continue

      // Verify all weeks in this segment are completed
      const allCompleted = seg.weeks.every(w => w.status === 'COMPLETED')
      if (!allCompleted) continue

      // Check if segment bonus was already awarded
      const alreadyAwarded = ls.teamSeasons.some(ts => {
        const segWins = ts.stats?.segmentWins || []
        return segWins.some(sw => sw.segmentNumber === seg.segmentNumber)
      })
      if (alreadyAwarded) continue

      // Sum WeeklyTeamResults for this segment's weeks
      const segWeekIds = seg.weeks.map(w => w.id)
      const weeklyResults = await prisma.weeklyTeamResult.findMany({
        where: {
          leagueSeasonId: ls.id,
          fantasyWeekId: { in: segWeekIds },
        },
      })

      // Aggregate points per team
      const teamPoints = new Map()
      const teamBestWeek = new Map()
      for (const wr of weeklyResults) {
        const prev = teamPoints.get(wr.teamId) || 0
        teamPoints.set(wr.teamId, prev + wr.totalPoints)
        const prevBest = teamBestWeek.get(wr.teamId) || 0
        if (wr.totalPoints > prevBest) {
          teamBestWeek.set(wr.teamId, wr.totalPoints)
        }
      }

      // Find winner (tiebreak: best single-week score in segment)
      const standings = Array.from(teamPoints.entries())
        .map(([teamId, points]) => ({
          teamId,
          points: Math.round(points * 100) / 100,
          bestWeek: teamBestWeek.get(teamId) || 0,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          return b.bestWeek - a.bestWeek // Tiebreak
        })

      const winner = standings[0]
      if (!winner) continue

      const winnerTs = ls.teamSeasons.find(ts => ts.teamId === winner.teamId)
      if (!winnerTs) continue

      // Award bonus points to TeamSeason
      const currentStats = winnerTs.stats || {}
      const segmentWins = currentStats.segmentWins || []
      segmentWins.push({
        segmentNumber: seg.segmentNumber,
        points: winner.points,
        bonus: segmentBonus,
        awardedAt: new Date().toISOString(),
      })

      await prisma.teamSeason.update({
        where: { id: winnerTs.id },
        data: {
          totalPoints: { increment: segmentBonus },
          stats: {
            ...currentStats,
            segmentWins,
          },
        },
      })

      console.log(
        `Segment ${seg.segmentNumber} winner: ${winnerTs.team.name} (+${segmentBonus} bonus) in league ${ls.league.id}`
      )
    }
  }
}

module.exports = {
  processSegmentCompletion,
}
