const { PrismaClient } = require('@prisma/client')
const { computeMultiSeasonPool } = require('../src/services/nfl/computeMultiSeasonPool')
const {
  syncFilteredPlayers,
  runFilteredSeason,
} = require('../src/services/nfl/filteredBackfill')
const { markPoolPlayersFetched } = require('../src/services/nfl/playerDataState')

const prisma = new PrismaClient()

// Parameterized via env so we can test small first.
//   START=2020 END=2025 node scripts/run-nfl-career-backfill.js
const START = parseInt(process.env.START || '1999', 10)
const END = parseInt(process.env.END || '2025', 10)

if (!Number.isFinite(START) || !Number.isFinite(END) || START > END) {
  console.error(`[backfill] Invalid START/END (got START=${process.env.START}, END=${process.env.END})`)
  process.exit(1)
}

;(async () => {
  const seasons = []
  for (let y = START; y <= END; y++) seasons.push(y)
  console.log(`[backfill] Range: ${START}-${END} (${seasons.length} seasons)`)

  console.log('\n=== Phase 1: Compute pool ===')
  const { pool, perSeasonSizes } = await computeMultiSeasonPool(seasons)
  console.log(`Pool union: ${pool.size} unique gsisIds`)
  console.log('Per-season:', perSeasonSizes)

  console.log('\n=== Phase 2: Create Player records for pool ===')
  const { created, gsisIdToPlayerId } = await syncFilteredPlayers(prisma, seasons, pool)
  console.log(`Created ${created} new Player rows`)

  console.log('\n=== Phase 3: Per-season filtered backfill ===')
  let totalInserted = 0
  for (const season of seasons) {
    try {
      const r = await runFilteredSeason(prisma, season, gsisIdToPlayerId, pool)
      totalInserted += r.inserted
    } catch (e) {
      console.error(`[backfill] Season ${season} failed: ${e.message}`)
    }
  }
  console.log(`\n[backfill] Total NflPlayerGame rows inserted: ${totalInserted}`)

  console.log('\n=== Phase 4: Mark NflPlayerDataState ===')
  const { updated } = await markPoolPlayersFetched(prisma, gsisIdToPlayerId, pool, END)
  console.log(`Marked ${updated} player data-state rows`)

  await prisma.$disconnect()
  console.log('\n✓ Done.')
})().catch(async (e) => {
  console.error(e)
  try { await prisma.$disconnect() } catch {}
  process.exit(1)
})
