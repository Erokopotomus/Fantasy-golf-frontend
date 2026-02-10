/**
 * One-time backfill: Aggregate all Performance data into PlayerCourseHistory
 *
 * Usage: node prisma/seedCourseHistory.js
 */
const { PrismaClient } = require('@prisma/client')
const { aggregateAllCourseHistory } = require('../src/services/courseHistoryAggregator')

const prisma = new PrismaClient()

async function main() {
  console.log('[SeedCourseHistory] Starting backfill...')
  const result = await aggregateAllCourseHistory(prisma)
  console.log(`[SeedCourseHistory] Complete: ${result.aggregated} records`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
