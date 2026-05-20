try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }) } catch {}

const prisma = require('../src/lib/prisma')
const { syncScheduleRaw } = require('../src/services/nflHistoricalSync')

;(async () => {
  try {
    const season = parseInt(process.env.SEASON || '2026', 10)
    console.log(`[schedule-sync] Starting sync for ${season}...`)
    const result = await syncScheduleRaw(prisma, season)
    console.log(`[schedule-sync] Done:`, result)
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
