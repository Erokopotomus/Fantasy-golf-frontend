#!/usr/bin/env node
/**
 * Backfill Strokes Gained data from DataGolf historical rounds API.
 *
 * Usage:
 *   node scripts/backfill-datagolf-sg.js                    # all years (2018-2026)
 *   node scripts/backfill-datagolf-sg.js --year 2025        # single year
 *   node scripts/backfill-datagolf-sg.js --year 2024 --force  # reprocess even if SG exists
 *   node scripts/backfill-datagolf-sg.js --map-only         # only map DG event IDs, no backfill
 *   node scripts/backfill-datagolf-sg.js --limit 5          # process only 5 tournaments
 *
 * Requires DATAGOLF_API_KEY env var (loaded from .env or set directly).
 */

const { PrismaClient } = require('@prisma/client')
const { mapDataGolfEvents, backfillAllSG } = require('../src/services/datagolfHistoricalSync')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'

// Parse CLI args
const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(name)
  if (idx === -1) return null
  return args[idx + 1] || true
}
const hasFlag = (name) => args.includes(name)

async function main() {
  // Load .env if present
  try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }) } catch {}

  if (!process.env.DATAGOLF_API_KEY) {
    console.error('ERROR: DATAGOLF_API_KEY env var is required')
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } })

  try {
    // Step 1: Always map events first
    console.log('=== Step 1: Mapping DataGolf Event IDs ===\n')
    const mapResult = await mapDataGolfEvents(prisma)
    console.log('\nMapping result:', JSON.stringify(mapResult, null, 2))

    if (hasFlag('--map-only')) {
      console.log('\n--map-only flag set, skipping SG backfill')
      return
    }

    // Step 2: Backfill SG data
    console.log('\n=== Step 2: Backfilling Strokes Gained Data ===\n')

    const options = {
      forceReprocess: hasFlag('--force'),
      limit: getArg('--limit') ? parseInt(getArg('--limit')) : 0,
    }

    const yearArg = getArg('--year')
    if (yearArg) {
      options.year = parseInt(yearArg)
    }

    const result = await backfillAllSG(prisma, options)
    console.log('\n=== Backfill Complete ===')
    console.log(JSON.stringify(result.summary, null, 2))
  } catch (err) {
    console.error('Backfill failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
