/**
 * LiveStatsProvider — interface every implementation must satisfy.
 * All methods return promises. Player IDs are canonical Clutch playerIds
 * (mapped from provider IDs via existing player matching service).
 */
class BaseLiveStatsProvider {
  /**
   * @param {number} week NFL week (1-18)
   * @returns {Promise<Array<{gameId, homeTeam, awayTeam, status, homeScore, awayScore, clock, gameProgress}>>}
   * gameProgress: 0.0 (not started) → 1.0 (final)
   */
  async getWeekScoreboard(week) { throw new Error('not implemented'); }

  /**
   * @param {number} week
   * @param {string} playerId Clutch playerId
   * @returns {Promise<{points, projectedPoints, gameStatus, gameProgress, statsBreakdown}>}
   */
  async getPlayerStats(week, playerId) { throw new Error('not implemented'); }

  /**
   * @param {number} week
   * @returns {Promise<Array<{playerId, projectedPoints, position}>>}
   */
  async getProjections(week) { throw new Error('not implemented'); }
}

module.exports = BaseLiveStatsProvider;
