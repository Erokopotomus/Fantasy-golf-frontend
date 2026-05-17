/**
 * Compute the `leagueContext` object embedded in every decision-capture row.
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md (DecisionEnvelope.leagueContext).
 *
 * Phase A.1 v1 populates the obvious fields that are computable from existing
 * data (standings, record, weeks remaining). Fields that need a model — roster
 * strength, weekly win probability, schedule strength — are left null. The
 * bias engine treats null as "missing not at random" and the Phase A.2 sprint
 * can backfill them later once we ship a power-rank model.
 *
 * Performance: a single query for the league + all teams. No matchup history
 * scan, no per-player projection lookups. Safe to call on every decision write.
 */

const HEAD_TO_HEAD_FORMATS = new Set(['HEAD_TO_HEAD'])

async function buildLeagueContext({ leagueId, teamId, prisma }) {
  if (!leagueId || !teamId) return null

  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        format: true,
        sport: true,
        sportRef: { select: { slug: true } },
        teams: {
          select: { id: true, wins: true, losses: true, ties: true, totalPoints: true },
        },
      },
    })

    if (!league) return null

    const isH2H = HEAD_TO_HEAD_FORMATS.has(league.format)
    const sortedTeams = [...league.teams].sort((a, b) => {
      if (isH2H) {
        const winDiff = (b.wins || 0) - (a.wins || 0)
        if (winDiff !== 0) return winDiff
        return (b.totalPoints || 0) - (a.totalPoints || 0)
      }
      return (b.totalPoints || 0) - (a.totalPoints || 0)
    })

    const idx = sortedTeams.findIndex(t => t.id === teamId)
    const myTeam = idx >= 0 ? sortedTeams[idx] : null
    if (!myTeam) return null

    const standingsPosition = idx + 1
    const leagueSize = sortedTeams.length
    const standingsRecord = isH2H
      ? { wins: myTeam.wins || 0, losses: myTeam.losses || 0, ties: myTeam.ties || 0 }
      : null

    const weeksRemaining = await computeWeeksRemaining(league, prisma)

    return {
      standingsPosition,
      standingsRecord,
      standingsRank: `${standingsPosition} of ${leagueSize}`,
      playoffProbability: null, // Phase A.2 — needs model
      weeksRemaining,
      isInPlayoffs: null,       // Phase A.2 — needs playoff config
      isEliminated: null,       // Phase A.2 — needs mathematical elimination check

      // Roster + schedule strength: Phase A.2. Bias engine treats null as
      // "data we didn't know yet" — same as old captured decisions before
      // these were instrumented.
      rosterStrengthRank: null,
      rosterStrengthScore: null,
      recordVsStrengthGap: null,
      weeklyMatchupWinProb: null,
      pastScheduleStrength: null,
      rosScheduleStrength: null,
      playoffScheduleStrength: null,
    }
  } catch (err) {
    console.error('[leagueContextService] buildLeagueContext failed:', err.message)
    return null
  }
}

/**
 * Count FantasyWeeks still upcoming in the current season. NFL-only for v1;
 * golf leagues use tournament cadence which would require season-range lookup.
 */
async function computeWeeksRemaining(league, prisma) {
  const sportSlug = (league.sportRef?.slug || league.sport || '').toLowerCase()
  if (sportSlug !== 'nfl') return null

  try {
    const currentSeason = await prisma.season.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    })
    if (!currentSeason) return null

    return await prisma.fantasyWeek.count({
      where: { seasonId: currentSeason.id, status: 'UPCOMING' },
    })
  } catch {
    return null
  }
}

module.exports = { buildLeagueContext }
