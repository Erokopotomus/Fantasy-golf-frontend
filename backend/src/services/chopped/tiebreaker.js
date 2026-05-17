const crypto = require('crypto');

/**
 * Resolve tied teams in elimination order. Input: array of teams already
 * known to be tied on weekly score. Output: same array sorted so that the
 * team to chop is FIRST.
 *
 * Order:
 *   1. lowest cumulative season points
 *   2. worst (lowest) point differential vs opponents this season
 *   3. deterministic coinflip from sha256(leagueId:week:sortedTeamIds)
 *
 * The coinflip is deterministic so re-running the auto-chop after a
 * crash/restart yields the same result — important for audit trails.
 */
function resolveTiebreaker({ tiedTeams, leagueId, week }) {
  return [...tiedTeams].sort((a, b) => {
    if (a.cumulativePoints !== b.cumulativePoints) {
      return a.cumulativePoints - b.cumulativePoints;
    }
    if (a.pointDifferential !== b.pointDifferential) {
      return a.pointDifferential - b.pointDifferential;
    }
    const seed = crypto
      .createHash('sha256')
      .update(`${leagueId}:${week}:${[a.teamId, b.teamId].sort().join(',')}`)
      .digest('hex');
    // First hex char of seed deterministically orders the pair
    return seed < '8' ? -1 : 1;
  });
}

/**
 * Given the team being chopped + the other tied teams, return which
 * tiebreaker rule actually decided the outcome. For ChopEvent.tiebreakerUsed.
 */
function describeTiebreaker(loser, others) {
  const tiedAtPoints = others.filter(o => o.weeklyPoints === loser.weeklyPoints);
  if (tiedAtPoints.length === 0) return null;
  if (loser.cumulativePoints < tiedAtPoints[0].cumulativePoints) return 'cumulative_pts';
  if (loser.pointDifferential < tiedAtPoints[0].pointDifferential) return 'point_diff';
  return 'coinflip';
}

module.exports = { resolveTiebreaker, describeTiebreaker };
