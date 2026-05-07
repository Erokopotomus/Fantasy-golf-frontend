/**
 * One-shot data fix for May 7 2026:
 *  1. Flag Truist Championship as a Signature Event so /current routes to it
 *  2. Manually run field sync for Myrtle Beach Classic so its leaderboard populates
 *
 * Root cause: two PGA events share May 7-10. The /current priority chain ties on
 * every flag and falls through to Postgres heap order (which returns Myrtle Beach).
 * The field-sync crons all use findFirst, so only one event per week gets synced.
 */
const prisma = require('../src/lib/prisma')
const sync = require('../src/services/datagolfSync')

async function main() {
  // First: list ALL Truist + Myrtle Beach rows so we know what we're touching
  const truistAll = await prisma.tournament.findMany({
    where: { name: { contains: 'Truist' } },
    select: { id: true, name: true, isSignature: true, datagolfId: true, startDate: true, status: true },
  })
  console.log('Truist rows:', JSON.stringify(truistAll, null, 2))

  const myrtleAll = await prisma.tournament.findMany({
    where: { name: { contains: 'Myrtle Beach' } },
    select: { id: true, name: true, datagolfId: true, fieldSize: true, startDate: true, status: true },
  })
  console.log('Myrtle Beach rows:', JSON.stringify(myrtleAll, null, 2))

  // 1. Truist: target the row with datagolfId set, May 2026 start
  const truist = truistAll.find(t => t.datagolfId && t.startDate?.toISOString().startsWith('2026-05'))
  if (!truist) {
    console.log('Could not find live Truist row with datagolfId for May 2026 — manual review needed')
  } else if (truist.isSignature) {
    console.log(`Truist already isSignature=true (${truist.id})`)
  } else {
    await prisma.tournament.update({
      where: { id: truist.id },
      data: { isSignature: true },
    })
    console.log(`Set isSignature=true on Truist (${truist.id}, dg ${truist.datagolfId})`)
  }

  // 2. Myrtle Beach: target the row with datagolfId set, May 2026 start
  const myrtle = myrtleAll.find(t => t.datagolfId && t.startDate?.toISOString().startsWith('2026-05'))
  if (!myrtle?.datagolfId) {
    console.log('Could not find live Myrtle Beach row with datagolfId for May 2026 — manual review needed')
    return
  }

  console.log(`Syncing field for ${myrtle.name} (id=${myrtle.id}, dg ${myrtle.datagolfId}, current fieldSize=${myrtle.fieldSize})`)
  const result = await sync.syncFieldAndTeeTimesForTournament(myrtle.datagolfId, prisma)
  console.log(`  → ${result.playersInField} players, ${result.teeTimes} tee times`)

  try {
    const live = await sync.syncLiveScoring(myrtle.datagolfId, prisma)
    console.log(`  → live scoring: ${live.updated ?? JSON.stringify(live)} players updated`)
  } catch (e) {
    console.log(`  → live scoring skipped: ${e.message}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
