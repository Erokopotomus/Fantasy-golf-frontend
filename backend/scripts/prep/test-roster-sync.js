/**
 * Smoke test for DS-2 (nflRosterSync).
 *
 * Runs syncCurrentRosters() against the live Sleeper API and verifies:
 *   - 32 teams processed
 *   - >=500 slots upserted (cache size depends on prior Player.sleeperId backfill)
 *   - KC has at least some active slots
 *   - No errors
 *
 * Exit 0 on pass, 1 on any failure.
 */

try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }) } catch {}

const { syncCurrentRosters } = require('../../src/services/prep/nflRosterSync')
const prisma = require('../../src/lib/prisma')

;(async () => {
  console.log('=== Roster sync smoke test ===\n')
  const result = await syncCurrentRosters()
  console.log('\n=== Stats ===')
  console.log(JSON.stringify(result, null, 2))

  // Sanity checks
  if (result.errors.length > 0) {
    console.error('\nErrors encountered:')
    console.error(JSON.stringify(result.errors, null, 2))
    process.exit(1)
  }

  if (result.teamsProcessed !== 32) {
    console.error(`\nExpected 32 teams processed, got ${result.teamsProcessed}`)
    process.exit(1)
  }

  if (result.slotsUpserted < 500) {
    console.error(`\nExpected >=500 slots upserted, got ${result.slotsUpserted}`)
    process.exit(1)
  }

  // Spot-check: query KC roster, verify at least some active slots
  const kcSlots = await prisma.nflRosterSlot.findMany({
    where: {
      team: { abbreviation: 'KC' },
      snapshotType: 'current',
      status: 'active',
    },
  })
  console.log(`\nKC active roster slots: ${kcSlots.length}`)
  if (kcSlots.length < 5) {
    console.error(`\nKC has ${kcSlots.length} active slots, expected at least 5`)
    process.exit(1)
  }

  // Sample 5 KC players by depth rank
  const sample = await prisma.nflRosterSlot.findMany({
    where: { team: { abbreviation: 'KC' }, snapshotType: 'current', status: 'active' },
    include: { player: { select: { name: true } } },
    orderBy: { depthRank: 'asc' },
    take: 5,
  })
  console.log('\nKC top 5 (by depth rank):')
  sample.forEach((s) => console.log(`  ${s.position} #${s.depthRank} - ${s.player.name}`))

  console.log('\nRoster sync smoke passed')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
