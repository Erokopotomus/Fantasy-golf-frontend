/**
 * Wipe all Myrtle Beach Classic data — Performance, LiveScore, RoundScore,
 * HoleScore, DFSEntry. The DataGolf sync wrote Truist players in (DG's PGA
 * feed conflates opposite-field events). With the new event-name guard,
 * future DG syncs will be aborted; ESPN's cron will repopulate from
 * espnEventId 401811946 once it runs.
 */
const prisma = require('../src/lib/prisma')

async function main() {
  const myrtle = await prisma.tournament.findFirst({
    where: { datagolfId: '553', status: 'IN_PROGRESS' },
    select: { id: true, name: true },
  })
  if (!myrtle) { console.log('No live Myrtle Beach found'); return }
  console.log(`Wiping ${myrtle.name} (${myrtle.id})`)

  const tx = [
    prisma.holeScore.deleteMany({ where: { tournamentId: myrtle.id } }),
    prisma.roundScore.deleteMany({ where: { tournamentId: myrtle.id } }),
    prisma.liveScore.deleteMany({ where: { tournamentId: myrtle.id } }),
    prisma.performance.deleteMany({ where: { tournamentId: myrtle.id } }),
  ]
  // DFSSlate + entries — delete entries first then slates
  const slates = await prisma.dFSSlate.findMany({ where: { tournamentId: myrtle.id }, select: { id: true } })
  for (const s of slates) {
    tx.push(prisma.playerDFSEntry.deleteMany({ where: { slateId: s.id } }))
  }
  if (slates.length > 0) {
    tx.push(prisma.dFSSlate.deleteMany({ where: { tournamentId: myrtle.id } }))
  }
  tx.push(
    prisma.tournament.update({ where: { id: myrtle.id }, data: { fieldSize: null } })
  )

  const results = await prisma.$transaction(tx)
  console.log('Delete counts:', results.map(r => r?.count ?? 'ok'))
  console.log('Done. ESPN cron will repopulate from espnEventId.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
