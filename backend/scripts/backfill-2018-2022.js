#!/usr/bin/env node
/**
 * One-off script: Backfill 2018-2022 ESPN data against Railway DB
 * This adds 5 more years of historical data (already have 2023-2026).
 * Usage: node scripts/backfill-2018-2022.js
 */

const { PrismaClient } = require('@prisma/client')
const backfill = require('../src/services/historicalBackfill')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } })

  try {
    const years = [2018, 2019, 2020, 2021, 2022]
    console.log(`=== Backfilling ${years.join(', ')} from ESPN ===\n`)

    const result = await backfill.backfillMultipleYears(years, prisma)
    console.log('\n=== Backfill Results ===')
    console.log(JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Backfill failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
