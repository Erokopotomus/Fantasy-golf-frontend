// Note: imports EspnStatsProvider directly rather than going through the
// liveStats factory, because the factory eagerly requires
// SportsDataIOProvider (Task 6) which doesn't exist yet. Once Task 6
// lands, this can be swapped to `getLiveStatsProvider()` if desired.
const EspnStatsProvider = require('../../src/services/liveStats/espnProvider');

(async () => {
  const provider = new EspnStatsProvider();
  console.log('Provider:', provider.constructor.name);
  const games = await provider.getWeekScoreboard(1);
  console.log(`Week 1 games: ${games.length}`);
  if (games.length === 0) {
    console.log('Note: 0 games returned. ESPN may not have published week 1 yet for the current season.');
    console.log('That is not a hard failure for this smoke test — provider returned a valid array.');
  } else {
    console.log('Sample:', JSON.stringify(games[0], null, 2));
    if (typeof games[0].gameProgress !== 'number') throw new Error('Missing gameProgress');
    if (!games[0].gameId) throw new Error('Missing gameId');
  }
  console.log('✓ ESPN provider smoke test passed');
})().catch(e => { console.error('✗', e.message); process.exit(1); });
