const { computeMultiSeasonPool } = require('../src/services/nfl/computeMultiSeasonPool')

;(async () => {
  // Start small to verify, then run full range later
  const seasons = [2020, 2021, 2022, 2023, 2024]
  const { pool, perSeasonSizes } = await computeMultiSeasonPool(seasons)
  console.log('\n=== Pool union ===')
  console.log(`Total unique players: ${pool.size}`)
  console.log('Per-season sizes:', perSeasonSizes)
})()
