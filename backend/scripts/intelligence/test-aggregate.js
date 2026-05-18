const { aggregateAll } = require('../../src/services/intelligence/aggregateCron')

;(async () => {
  console.log('Running aggregate snapshot manually...')
  const result = await aggregateAll()
  console.log(`\nCompleted in ${result.durationMs}ms`)
  console.log(`Total users: ${result.totalUsers}`)
  console.log('\nPer-characteristic results:')
  for (const r of result.results) {
    if (!r.ok) {
      console.log(`  ${r.type}: FAIL ${r.error}`)
    } else {
      console.log(`  ${r.type}: ${r.usersWithData} users (H:${r.highConfidenceCount} M:${r.medConfidenceCount} L:${r.lowConfidenceCount})`)
    }
  }
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
