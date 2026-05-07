/**
 * Find Performance rows whose totalToPar / round1-4 look like stale data
 * (impossible values for the current tournament round count).
 */
const prisma = require('../src/lib/prisma')

async function main() {
  const truist = await prisma.tournament.findFirst({
    where: { datagolfId: '480', status: 'IN_PROGRESS' },
    select: { id: true, name: true, currentRound: true, startDate: true },
  })
  console.log('Tournament:', truist)

  // Pull Scheffler's row + a few obvious bad ones
  const scheffler = await prisma.player.findFirst({
    where: { name: { contains: 'Scheffler' } },
    select: { id: true, name: true, datagolfId: true },
  })
  console.log('\nScheffler player:', scheffler)

  const sPerf = await prisma.performance.findFirst({
    where: { tournamentId: truist.id, playerId: scheffler.id },
  })
  console.log('Scheffler Truist Performance:', sPerf)

  const sLive = await prisma.liveScore.findFirst({
    where: { tournamentId: truist.id, playerId: scheffler.id },
  })
  console.log('Scheffler Truist LiveScore:', sLive)

  // Find any Performance in this tournament with abs(round1) > 20 — physically impossible
  const bad = await prisma.performance.findMany({
    where: {
      tournamentId: truist.id,
      OR: [
        { round1: { gt: 20 } }, { round1: { lt: -20 } },
        { round2: { gt: 20 } }, { round2: { lt: -20 } },
        { round3: { gt: 20 } }, { round3: { lt: -20 } },
        { round4: { gt: 20 } }, { round4: { lt: -20 } },
        { totalToPar: { gt: 30 } }, { totalToPar: { lt: -30 } },
      ],
    },
    include: { player: { select: { name: true, datagolfId: true } } },
  })
  console.log(`\n${bad.length} Performance rows with impossible scoring values:`)
  for (const p of bad.slice(0, 20)) {
    console.log(`  ${p.player.name} (dg ${p.player.datagolfId}): r1=${p.round1} r2=${p.round2} r3=${p.round3} r4=${p.round4} total=${p.totalToPar} status=${p.status}`)
  }

  // Total Performance count
  const total = await prisma.performance.count({ where: { tournamentId: truist.id } })
  const withRound1 = await prisma.performance.count({ where: { tournamentId: truist.id, round1: { not: null } } })
  console.log(`\nTotal Truist Perfs: ${total}, with round1 populated: ${withRound1}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
