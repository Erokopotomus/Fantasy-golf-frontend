const prisma = require('../../lib/prisma')

/**
 * Returns each team's finalized fantasy points for the most recently
 * completed PGA Tour tournament for this league.
 *
 * The connection chain is Tournament → FantasyWeek → WeeklyTeamResult;
 * WeeklyTeamResult does not carry a tournamentId directly.
 *
 * Returns: [{ teamId, teamName, totalPoints, tournamentId, tournamentName,
 *             fantasyWeekId, completedAt }]
 *           sorted ascending by totalPoints (lowest first — the team most
 *           likely to be chopped is at index 0).
 *
 * Returns [] if:
 *   - league not found
 *   - league sport is not golf
 *   - no FINAL tournament exists for this league's season
 */
async function getMostRecentTournamentResults(leagueId) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      season: { include: { sport: true } },
      teams: { where: { eliminatedAt: null } },
    },
  })
  if (!league) return []
  if (league.season?.sport?.slug !== 'golf') return []

  // Most recently finalized tournament for this league's season,
  // joined through the FantasyWeek that links to it.
  const fantasyWeek = await prisma.fantasyWeek.findFirst({
    where: {
      seasonId: league.seasonId,
      tournamentId: { not: null },
      tournament: { status: 'FINAL' },
    },
    include: { tournament: true },
    orderBy: { endDate: 'desc' },
  })
  if (!fantasyWeek || !fantasyWeek.tournament) return []

  const teamIds = league.teams.map(t => t.id)
  const results = await prisma.weeklyTeamResult.findMany({
    where: {
      teamId: { in: teamIds },
      fantasyWeekId: fantasyWeek.id,
    },
  })

  // Map results back to teams; teams with no row treated as 0 points
  // (surfaces the gap rather than silently skipping — they'll be chopped)
  const resultByTeam = new Map(results.map(r => [r.teamId, r]))
  const rows = league.teams.map(t => {
    const r = resultByTeam.get(t.id)
    return {
      teamId: t.id,
      teamName: t.name,
      totalPoints: r?.totalPoints ?? 0,
      tournamentId: fantasyWeek.tournament.id,
      tournamentName: fantasyWeek.tournament.name,
      fantasyWeekId: fantasyWeek.id,
      completedAt: fantasyWeek.tournament.endDate,
    }
  })
  rows.sort((a, b) => a.totalPoints - b.totalPoints)
  return rows
}

module.exports = { getMostRecentTournamentResults }
