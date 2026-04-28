/**
 * One-off: pull DataGolf field for Cadillac Championship and run weather sync.
 * Run: node backend/scripts/sync-cadillac.js
 */
const prisma = require('../src/lib/prisma')
const { syncFieldAndTeeTimesForTournament } = require('../src/services/datagolfSync')
const { syncTournamentWeather } = require('../src/services/weatherSync')

async function main() {
  const t = await prisma.tournament.findFirst({
    where: { name: { contains: 'Cadillac', mode: 'insensitive' } },
    select: { id: true, name: true, datagolfId: true },
  })
  if (!t?.datagolfId) {
    console.error('Cadillac tournament missing datagolfId')
    process.exit(1)
  }

  console.log(`\n=== Field sync (DG ID ${t.datagolfId}) ===`)
  try {
    const result = await syncFieldAndTeeTimesForTournament(t.datagolfId, prisma)
    console.log('Field sync result:', result)
  } catch (e) {
    console.error('Field sync failed:', e.message)
  }

  console.log(`\n=== Weather sync (top 3 upcoming) ===`)
  try {
    const result = await syncTournamentWeather(prisma)
    console.log('Weather sync result:', result)
  } catch (e) {
    console.error('Weather sync failed:', e.message)
  }

  const after = await prisma.tournament.findUnique({
    where: { id: t.id },
    include: { _count: { select: { performances: true, weather: true } } },
  })
  console.log(`\nAfter sync — Cadillac: ${after._count.performances} field entries, ${after._count.weather} weather records`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
