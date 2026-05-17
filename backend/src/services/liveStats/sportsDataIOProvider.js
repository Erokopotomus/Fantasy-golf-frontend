const BaseLiveStatsProvider = require('./baseProvider');

/**
 * SportsDataIO stub — returns deterministic mock data with the same shape
 * as the live API. Flip via LIVE_STATS_PROVIDER=sportsdataio once the paid
 * subscription is active. Do NOT delete this stub; we want to be able to
 * test the SDIO code path end-to-end without burning trial API calls.
 *
 * Once the real subscription is live, replace these method bodies with
 * actual axios calls against api.sportsdata.io/v3/nfl/...
 */
class SportsDataIOProvider extends BaseLiveStatsProvider {
  async getWeekScoreboard(week) {
    return [
      {
        gameId: `sdio-${week}-mock`,
        homeTeam: 'KC',
        awayTeam: 'BUF',
        status: 'in',
        homeScore: 21,
        awayScore: 17,
        clock: '5:32',
        gameProgress: 0.65,
      },
    ];
  }

  async getPlayerStats(week, playerId) {
    return {
      points: 12.4,
      projectedPoints: 18.0,
      gameStatus: 'in',
      gameProgress: 0.65,
      statsBreakdown: {},
    };
  }

  async getProjections(week) {
    return [];
  }
}

module.exports = SportsDataIOProvider;
