const prisma = require('../src/lib/prisma')
const espnSync = require('../src/services/espnSync')

async function main() {
  const t = await prisma.tournament.findFirst({
    where: { datagolfId: '553', status: 'IN_PROGRESS' },
    select: { id: true, name: true, espnEventId: true },
  })
  if (!t?.espnEventId) { console.log('Missing espnEventId'); return }
  console.log(`ESPN syncing ${t.name} (espnEventId=${t.espnEventId})`)

  const r = await espnSync.syncHoleScores(t.id, prisma)
  console.log(`syncHoleScores: ${r.matched} players, ${r.holes} holes${r.error ? ` (error: ${r.error})` : ''}`)

  const a = await espnSync.aggregateHoleScoresToPerformance(t.id, prisma)
  console.log(`aggregate: ${a.performances} performances, ${a.rounds} rounds`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
