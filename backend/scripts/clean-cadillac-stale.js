/**
 * Clear stale round1-4 + totalScore/totalToPar/position fields on Cadillac
 * Performance records. Live data will repopulate from LiveScore for the 73
 * players currently on the live feed; the 18 without live data will show
 * blank instead of fake completed scores.
 */
const prisma = require('../src/lib/prisma')

async function main() {
  const t = await prisma.tournament.findFirst({
    where: { name: { contains: 'Cadillac' } },
    select: { id: true, name: true },
  })

  const before = await prisma.performance.count({
    where: { tournamentId: t.id, round4: { not: null } },
  })
  console.log(`Performance rows with R4 populated before: ${before}`)

  const result = await prisma.performance.updateMany({
    where: { tournamentId: t.id },
    data: {
      round1: null,
      round2: null,
      round3: null,
      round4: null,
      totalScore: null,
      totalToPar: null,
      position: null,
      positionTied: false,
    },
  })
  console.log(`Cleared ${result.count} Performance rows for ${t.name}`)

  const after = await prisma.performance.count({
    where: { tournamentId: t.id, round4: { not: null } },
  })
  console.log(`Performance rows with R4 populated after: ${after}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
