/**
 * Clean Myrtle Beach Classic LiveScore + Performance rows that were polluted
 * when syncLiveScoring(553) returned Truist players (DG /preds/in-play likely
 * conflates the primary tour event when given an opposite-field event_id).
 *
 * Strategy:
 *  1. Get current Myrtle Beach field from DG /field-updates (authoritative)
 *  2. Delete LiveScore records (they're all tainted with Truist data)
 *  3. Delete Performance rows whose playerId is NOT in the current field
 *  4. Reset Performance state (round1-4, totalScore, position) on legit rows
 */
const prisma = require('../src/lib/prisma')
const dg = require('../src/services/datagolfClient')

async function main() {
  const myrtle = await prisma.tournament.findFirst({
    where: { datagolfId: '553', status: 'IN_PROGRESS' },
    select: { id: true, name: true },
  })
  if (!myrtle) { console.log('No live Myrtle Beach found — nothing to clean'); return }

  // Pull current authoritative field from DG
  const fieldData = await dg.getFieldUpdates('553')
  const dgField = fieldData?.field || fieldData || []
  const fieldDgIds = new Set(dgField.map(e => String(e.dg_id)))
  console.log(`DG field for ${myrtle.name}: ${fieldDgIds.size} dg ids`)

  // Map dg_id → playerId
  const players = await prisma.player.findMany({
    where: { datagolfId: { in: Array.from(fieldDgIds) } },
    select: { id: true, datagolfId: true },
  })
  const fieldPlayerIds = new Set(players.map(p => p.id))
  console.log(`Resolved to ${fieldPlayerIds.size} player ids`)

  // 1. Wipe LiveScore (contaminated)
  const lsDeleted = await prisma.liveScore.deleteMany({ where: { tournamentId: myrtle.id } })
  console.log(`Deleted ${lsDeleted.count} LiveScore rows`)

  // 2. Find polluted Performance rows (player not in current field)
  const allPerfs = await prisma.performance.findMany({
    where: { tournamentId: myrtle.id },
    select: { id: true, playerId: true },
  })
  const polluted = allPerfs.filter(p => !fieldPlayerIds.has(p.playerId)).map(p => p.id)
  console.log(`Found ${polluted.length} polluted Performance rows (out of ${allPerfs.length})`)

  if (polluted.length > 0) {
    const perfDeleted = await prisma.performance.deleteMany({ where: { id: { in: polluted } } })
    console.log(`Deleted ${perfDeleted.count} polluted Performance rows`)
  }

  // 3. Clear scoring fields on legit rows so they don't carry stale numbers
  const reset = await prisma.performance.updateMany({
    where: { tournamentId: myrtle.id },
    data: {
      round1: null, round2: null, round3: null, round4: null,
      totalScore: null, totalToPar: null, position: null, positionTied: false,
    },
  })
  console.log(`Reset scoring fields on ${reset.count} legit Performance rows`)

  // 4. Update fieldSize
  await prisma.tournament.update({
    where: { id: myrtle.id },
    data: { fieldSize: fieldPlayerIds.size },
  })
  console.log(`Set fieldSize=${fieldPlayerIds.size}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
