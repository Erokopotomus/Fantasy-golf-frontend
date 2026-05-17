const axios = require('axios');
const BaseLiveStatsProvider = require('./baseProvider');

const ESPN_NFL_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

class EspnStatsProvider extends BaseLiveStatsProvider {
  async getWeekScoreboard(week) {
    const url = `${ESPN_NFL_SCOREBOARD}?week=${week}&seasontype=2`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return (data.events || []).map(ev => {
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      const status = comp.status.type.state; // 'pre' | 'in' | 'post'
      const period = comp.status.period || 0;
      const clock = comp.status.displayClock || '';
      let gameProgress;
      if (status === 'pre') gameProgress = 0;
      else if (status === 'post') gameProgress = 1;
      else gameProgress = Math.min(0.99, (period - 1) / 4 + 0.25);
      return {
        gameId: ev.id,
        homeTeam: home.team.abbreviation,
        awayTeam: away.team.abbreviation,
        status,
        homeScore: parseInt(home.score, 10) || 0,
        awayScore: parseInt(away.score, 10) || 0,
        clock,
        gameProgress,
      };
    });
  }

  async getPlayerStats(week, playerId) {
    // v1: stub. Player-level live stats will be wired to existing
    // nflFantasyTracker in a later phase. Returns zero so safe-percent
    // service can fall back to projections-only mode.
    return {
      points: 0,
      projectedPoints: 0,
      gameStatus: 'pre',
      gameProgress: 0,
      statsBreakdown: {},
    };
  }

  async getProjections(week) {
    // v1: stub. Projection source (nflverse or Sleeper) wired in a
    // later task. Returns empty so safe-percent service falls back to
    // position-variance defaults uniformly.
    return [];
  }
}

module.exports = EspnStatsProvider;
