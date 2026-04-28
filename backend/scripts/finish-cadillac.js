/**
 * Set Course DNA importance values for Trump National Doral (Blue Monster)
 * and run the Clutch metrics computation for Cadillac Championship so FIT
 * scores populate on the Field Analysis table.
 */
const prisma = require('../src/lib/prisma')
const { computeForEvent } = require('../src/services/clutchMetrics')

async function main() {
  // Step 1 — set Course DNA on Doral. Blue Monster characterization:
  // long bermuda course, demanding tee shots, big receptive greens,
  // moderate around-green/putting differentiation.
  const course = await prisma.course.update({
    where: { externalId: 'trump-national-doral-blue-monster' },
    data: {
      drivingImportance: 0.30,
      approachImportance: 0.30,
      aroundGreenImportance: 0.20,
      puttingImportance: 0.20,
    },
    select: { id: true, name: true, nickname: true, drivingImportance: true, approachImportance: true, aroundGreenImportance: true, puttingImportance: true },
  })
  console.log(`Doral DNA set: OTT=${course.drivingImportance} APP=${course.approachImportance} ARG=${course.aroundGreenImportance} PUT=${course.puttingImportance}\n`)

  // Step 2 — find tournament + run metrics
  const t = await prisma.tournament.findFirst({
    where: { name: { contains: 'Cadillac', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  console.log(`Computing Clutch metrics for ${t.name}...`)
  const result = await computeForEvent(t.id, prisma)
  console.log('Metrics result:', result)

  // Step 3 — verify a few players got FIT scores
  const sample = await prisma.clutchScore.findMany({
    where: { tournamentId: t.id, courseFitScore: { not: null } },
    orderBy: { courseFitScore: 'desc' },
    take: 5,
    include: { player: { select: { name: true } } },
  })
  console.log(`\nTop 5 FIT scores for Cadillac:`)
  sample.forEach((s) => console.log(`  ${s.player.name}: ${s.courseFitScore?.toFixed(1)}`))

  const fitCount = await prisma.clutchScore.count({
    where: { tournamentId: t.id, courseFitScore: { not: null } },
  })
  console.log(`\nTotal players with FIT score: ${fitCount} of 72`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
