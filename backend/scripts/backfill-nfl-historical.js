#!/usr/bin/env node
/**
 * NFL Historical Data Backfill (2019-2025)
 *
 * Usage:
 *   node scripts/backfill-nfl-historical.js                    # all 2019-2025
 *   node scripts/backfill-nfl-historical.js --season 2022      # single season
 *   node scripts/backfill-nfl-historical.js --force             # reprocess existing
 *   node scripts/backfill-nfl-historical.js --verify            # check data, no writes
 *   node scripts/backfill-nfl-historical.js --skip-weather      # stats only
 *   node scripts/backfill-nfl-historical.js --weather-only      # weather only
 *   node scripts/backfill-nfl-historical.js --fix-2024          # fix kicker+DST gaps
 *   node scripts/backfill-nfl-historical.js --players-only      # just sync players
 */

const { PrismaClient } = require('@prisma/client')
const { syncHistoricalPlayers, backfillSeason, verifySeason, backfillAll } = require('../src/services/nflHistoricalSync')
const { backfillNflWeather } = require('../src/services/nflWeatherBackfill')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'

const ALL_SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]

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

  const prisma = new PrismaClient({
    datasources: { db: { url: RAILWAY_URL } },
    log: ['error'],
  })

  const startTime = Date.now()

  try {
    await prisma.$connect()
    console.log('[backfill] Connected to Railway database\n')

    // Determine seasons
    const seasonArg = getArg('--season')
    const seasons = seasonArg ? [parseInt(seasonArg)] : ALL_SEASONS
    const force = hasFlag('--force')

    // ── Verify only ──
    if (hasFlag('--verify')) {
      console.log('═══ Verification Mode ═══\n')
      for (const season of seasons) {
        await verifySeason(prisma, season)
        console.log()
      }
      return
    }

    // ── Players only ──
    if (hasFlag('--players-only')) {
      console.log('═══ Player Sync Only ═══\n')
      await syncHistoricalPlayers(prisma, seasons)
      return
    }

    // ── Weather only ──
    if (hasFlag('--weather-only')) {
      console.log('═══ Weather Backfill Only ═══\n')
      await backfillNflWeather(prisma, { seasons, force })
      return
    }

    // ── Fix 2024 gaps (kicker + DST only) ──
    if (hasFlag('--fix-2024')) {
      console.log('═══ Fixing 2024 Kicker + DST Gaps ═══\n')
      // Import the raw sync functions
      const hist = require('../src/services/nflHistoricalSync')
      // backfillSeason with force will redo everything, but we only want kicking+DST
      // So we directly call the internal functions via a workaround:
      // Just run the full backfill for 2024 with force — the schedule and stats
      // will upsert (no-op for unchanged data), and kicking+DST will fill gaps.
      await backfillSeason(prisma, 2024, { force: true })
      console.log('\n═══ Verifying 2024 ═══\n')
      await verifySeason(prisma, 2024)
      return
    }

    // ── Single season ──
    if (seasonArg) {
      const season = parseInt(seasonArg)
      console.log(`═══ Single Season Backfill: ${season} ═══\n`)

      // Players first
      await syncHistoricalPlayers(prisma, [season])

      // Season data
      await backfillSeason(prisma, season, { force })

      // Weather (unless --skip-weather)
      if (!hasFlag('--skip-weather')) {
        console.log('\n═══ Weather ═══\n')
        await backfillNflWeather(prisma, { seasons: [season], force })
      }

      // Verify
      console.log('\n═══ Verification ═══\n')
      await verifySeason(prisma, season)
      return
    }

    // ── Full backfill ──
    console.log('═══ Full NFL Historical Backfill ═══\n')
    await backfillAll(prisma, {
      seasons,
      force,
      skipWeather: hasFlag('--skip-weather'),
    })

    // Weather pass (separate because it's I/O-bound with rate limiting)
    if (!hasFlag('--skip-weather')) {
      console.log('\n═══ Weather Backfill ═══\n')
      await backfillNflWeather(prisma, { seasons, force })
    }

  } catch (err) {
    console.error('\n[backfill] Fatal error:', err)
    process.exit(1)
  } finally {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n[backfill] Total runtime: ${elapsed}s`)
    await prisma.$disconnect()
  }
}

main()
