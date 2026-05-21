const { normalCdf, teamVariance } = require('./variance');
const prisma = require('../../lib/prisma');
const { getLiveStatsProvider } = require('../liveStats');

/**
 * Pure math: given mean + variance per alive team, returns each team's
 * pairwise approximation of "P(not the lowest scorer this week)".
 *
 * For each team i, safePct[i] = product over j≠i of P(score_i > score_j),
 * where P(score_i > score_j) = Φ((mean_i - mean_j) / sqrt(var_i + var_j)).
 *
 * This is NOT the exact min-probability but is a well-behaved proxy:
 * monotonically increasing with mean, decreasing with variance, identical
 * teams get identical results, and the bottom team consistently rates low.
 *
 * Returns array sorted by safePct descending (safest first, rank=1).
 */
function computeSafePercentsFromTeams(teams) {
  const results = teams.map(t => {
    let safe = 1;
    for (const j of teams) {
      if (j.teamId === t.teamId) continue;
      const z = (t.mean - j.mean) / Math.sqrt(t.variance + j.variance);
      safe *= normalCdf(z);
    }
    return { teamId: t.teamId, teamName: t.teamName, mean: t.mean, variance: t.variance, safePct: safe };
  });
  results.sort((a, b) => b.safePct - a.safePct);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * DB-aware wrapper. Loads alive teams, their ACTIVE starters, projections
 * (preweek mode) or live points + game-progress weighting (live mode).
 *
 * @param {object} args
 * @param {string} args.leagueId
 * @param {number} args.week
 * @param {'preweek'|'live'} args.mode
 */
async function computeSafePercents({ leagueId, week, mode = 'preweek' }) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        where: { eliminatedAt: null },
        include: {
          roster: {
            where: { isActive: true, rosterStatus: 'ACTIVE' },
            include: { player: true },
          },
        },
      },
    },
  });
  if (!league) throw new Error(`League not found: ${leagueId}`);

  const provider = getLiveStatsProvider();
  let projByPlayer = {};
  if (mode === 'preweek') {
    const projections = await provider.getProjections(week);
    projByPlayer = Object.fromEntries(
      projections.map(p => [p.playerId, p.projectedPoints])
    );
  }

  const teams = await Promise.all(league.teams.map(async (t) => {
    const starters = t.roster
      .filter(r => r.player)
      .map(r => ({ playerId: r.player.id, position: r.player.position }));

    let mean = 0;
    let varianceMultiplier = 1;

    if (mode === 'live') {
      const liveStats = await Promise.all(
        starters.map(s => provider.getPlayerStats(week, s.playerId))
      );
      mean = liveStats.reduce((acc, ls) => {
        const remaining = (ls.projectedPoints || 0) * (1 - (ls.gameProgress || 0));
        return acc + (ls.points || 0) + remaining;
      }, 0);
      const avgProgress = starters.length === 0
        ? 0
        : liveStats.reduce((a, ls) => a + (ls.gameProgress || 0), 0) / starters.length;
      varianceMultiplier = Math.max(0.05, 1 - avgProgress);
    } else {
      mean = starters.reduce((acc, s) => acc + (projByPlayer[s.playerId] || 0), 0);
    }

    const variance = teamVariance(starters) * varianceMultiplier;
    return { teamId: t.id, teamName: t.name, mean, variance };
  }));

  return computeSafePercentsFromTeams(teams);
}

module.exports = { computeSafePercents, computeSafePercentsFromTeams };
