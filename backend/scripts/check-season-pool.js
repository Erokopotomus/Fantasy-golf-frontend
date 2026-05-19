const nflClient = require('../src/services/nflClient')
const { computeSeasonPool } = require('../src/services/nfl/computePool')

;(async () => {
  console.log('Fetching 2024 weekly stats…')
  const rows = await nflClient.getWeeklyStats(2024)
  console.log(`Got ${rows.length} weekly rows`)

  const pool = computeSeasonPool(rows)
  console.log(`Pool size for 2024: ${pool.size}`)
  console.log(`Expected: ~232 (32 QB + 60 RB + 80 WR + 36 TE + nflverse may omit some K)`)

  // Spot-check Josh Allen and CMC
  const allenInPool = [...pool].some(id => id) // we don't know Allen's gsis_id offline
  // Instead: just print a few pool entries
  console.log('First 5 pool entries:', [...pool].slice(0, 5))
})()
