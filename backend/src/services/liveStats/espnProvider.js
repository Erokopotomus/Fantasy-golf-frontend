const axios = require('axios');
const BaseLiveStatsProvider = require('./baseProvider');
const prisma = require('../../lib/prisma');

const ESPN_NFL_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const NFL_GAME_MS = 3 * 60 * 60 * 1000;
const REG_SEASON_GAMES = 17;
const DEFAULT_SCORING = 'half_ppr';

class EspnStatsProvider extends BaseLiveStatsProvider {
  constructor() {
    super();
    this._seasonPromise = null;
    this._projectionsPromise = null;
  }

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
    const season = await this._currentSeason();
    const projections = await this._projectionsBySeason();
    const seasonProj = projections.get(playerId) || 0;
    const projectedPoints = seasonProj / REG_SEASON_GAMES;

    const row = await prisma.nflPlayerGame.findFirst({
      where: { playerId, game: { season, week } },
      select: {
        fantasyPtsHalf: true,
        game: { select: { status: true, kickoff: true } },
      },
    });

    if (!row) {
      return {
        points: 0,
        projectedPoints,
        gameStatus: 'pre',
        gameProgress: 0,
        statsBreakdown: {},
      };
    }

    const dbStatus = row.game.status;
    let gameProgress;
    let gameStatus;
    if (dbStatus === 'FINAL') {
      gameProgress = 1;
      gameStatus = 'post';
    } else if (dbStatus === 'IN_PROGRESS') {
      const elapsed = Date.now() - new Date(row.game.kickoff).getTime();
      gameProgress = Math.max(0.01, Math.min(0.99, elapsed / NFL_GAME_MS));
      gameStatus = 'in';
    } else {
      gameProgress = 0;
      gameStatus = 'pre';
    }

    return {
      points: row.fantasyPtsHalf || 0,
      projectedPoints,
      gameStatus,
      gameProgress,
      statsBreakdown: {},
    };
  }

  async getProjections(_week) {
    const projections = await this._projectionsBySeason();
    return Array.from(projections.entries()).map(([playerId, seasonProj]) => ({
      playerId,
      projectedPoints: seasonProj / REG_SEASON_GAMES,
    }));
  }

  async _currentSeason() {
    if (!this._seasonPromise) {
      this._seasonPromise = prisma.nflGame
        .findFirst({ orderBy: { season: 'desc' }, select: { season: true } })
        .then(row => row?.season || new Date().getFullYear());
    }
    return this._seasonPromise;
  }

  async _projectionsBySeason() {
    if (!this._projectionsPromise) {
      this._projectionsPromise = (async () => {
        const season = await this._currentSeason();
        const rows = await prisma.nflPlayerProjection.findMany({
          where: { season, scoringType: DEFAULT_SCORING },
          select: { playerId: true, projectedPoints: true },
        });
        return new Map(rows.map(r => [r.playerId, r.projectedPoints]));
      })();
    }
    return this._projectionsPromise;
  }
}

module.exports = EspnStatsProvider;
