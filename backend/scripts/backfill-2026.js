#!/usr/bin/env node
/**
 * One-off script: Backfill 2026 ESPN data against Railway DB
 * Usage: DATABASE_URL="postgresql://..." node scripts/backfill-2026.js
 */

const { PrismaClient } = require('@prisma/client')
const backfill = require('../src/services/historicalBackfill')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } })

  try {
    console.log('=== Backfilling 2026 from ESPN ===\n')
    const result = await backfill.backfillYear(2026, prisma)
    console.log('\n=== 2026 Backfill Results ===')
    console.log(JSON.stringify(result, null, 2))

    console.log('\n=== Recalculating career stats ===')
    const stats = await backfill.recalculatePlayerCareerStats(prisma)
    console.log('\n=== Stats Recalc Results ===')
    console.log(JSON.stringify(stats, null, 2))
  } catch (err) {
    console.error('Backfill failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
