try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }) } catch {}

const { syncAllFormats } = require('../src/services/nfl/ffcAdpSync')
const prisma = require('../src/lib/prisma')

const SEASON = parseInt(process.env.SEASON || String(new Date().getUTCFullYear()), 10)
const TEAMS = parseInt(process.env.TEAMS || '12', 10)

;(async () => {
  try {
    const results = await syncAllFormats({ season: SEASON, teams: TEAMS })
    console.log('\n=== Summary ===')
    for (const r of results) {
      if (r.error) {
        console.log(`  ${r.format}: ERROR — ${r.error}`)
      } else {
        console.log(`  ${r.format.padEnd(10)} matched ${r.matched}/${r.fetched} (${((r.matched / r.fetched) * 100).toFixed(0)}%)`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
