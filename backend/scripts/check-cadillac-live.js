const prisma = require('../src/lib/prisma')

async function main() {
  const t = await prisma.tournament.findFirst({
    where: { name: { contains: 'Cadillac' } },
    select: { id: true, name: true, status: true, currentRound: true, startDate: true, endDate: true },
  })
  console.log('Tournament:', t)

  // Top of leaderboard
  const perfs = await prisma.performance.findMany({
    where: { tournamentId: t.id },
    orderBy: { totalScore: 'asc' },
    take: 10,
    include: { player: { select: { id: true, name: true } } },
  })
  console.log('\nTop 10 by totalScore:')
  for (const p of perfs) {
    const rs = await prisma.roundScore.findMany({
      where: { tournamentId: t.id, playerId: p.player.id },
      orderBy: { roundNumber: 'asc' },
    })
    const rounds = rs.map(r => `R${r.roundNumber}=${r.score ?? '—'}(thru ${r.holesPlayed ?? '—'},stat=${r.status ?? '—'})`).join(' ')
    console.log(`  ${p.player.name}: total=${p.totalScore} pos=${p.position} status=${p.status} thru=${p.thru} fantasyPts=${p.fantasyPoints} | ${rounds}`)
  }

  // Counts of statuses
  const statuses = await prisma.performance.groupBy({
    by: ['status'],
    where: { tournamentId: t.id },
    _count: true,
  })
  console.log('\nStatus counts:', statuses)

}

main().catch(console.error).finally(() => prisma.$disconnect())
