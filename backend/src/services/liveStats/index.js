const EspnStatsProvider = require('./espnProvider');
const SportsDataIOProvider = require('./sportsDataIOProvider');

/**
 * Returns the active LiveStatsProvider. Toggle via LIVE_STATS_PROVIDER env:
 *   - 'espn' (default): free ESPN public scoreboard
 *   - 'sportsdataio': paid SportsDataIO (requires SPORTSDATAIO_API_KEY)
 * Tasks 5 and 6 implement the two concrete providers.
 */
function getLiveStatsProvider() {
  const choice = process.env.LIVE_STATS_PROVIDER || 'espn';
  switch (choice) {
    case 'sportsdataio':
      return new SportsDataIOProvider();
    case 'espn':
    default:
      return new EspnStatsProvider();
  }
}

module.exports = { getLiveStatsProvider };
