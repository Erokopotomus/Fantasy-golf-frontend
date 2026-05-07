const prisma = require('../src/lib/prisma')
const dg = require('../src/services/datagolfClient')

async function main() {
  const t = await prisma.tournament.findFirst({ where: { datagolfId: '480', status: 'IN_PROGRESS' } })

  // McCarty (leader at -8) and Scheffler (the bug)
  for (const last of ['McCarty', 'Scheffler', 'Sungjae']) {
    const p = await prisma.player.findFirst({
      where: { name: { contains: last } },
      select: { id: true, name: true, datagolfId: true },
    })
    const perf = await prisma.performance.findFirst({
      where: { tournamentId: t.id, playerId: p.id },
      select: { round1: true, round2: true, round3: true, round4: true, totalScore: true, totalToPar: true, position: true, status: true, updatedAt: true },
    })
    const live = await prisma.liveScore.findFirst({
      where: { tournamentId: t.id, playerId: p.id },
      select: { totalToPar: true, todayToPar: true, position: true, thru: true, currentRound: true, updatedAt: true },
    })
    console.log(`\n${p.name} (dg ${p.datagolfId})`)
    console.log('  Performance:', perf)
    console.log('  LiveScore:  ', live)
  }

  // Sample DG response for the same players
  console.log('\n=== DG /preds/in-play?event_id=480 raw entries ===')
  const live = await dg.getLiveInPlay('480')
  const players = live?.data || live?.players || []
  for (const last of ['McCarty', 'Scheffler', 'Sungjae']) {
    const e = players.find(p => (p.player_name || '').includes(last))
    if (e) {
      const keys = ['player_name', 'dg_id', 'current_pos', 'current_score', 'today', 'thru', 'current_round', 'R1', 'R2', 'R3', 'R4', 'r1', 'r2', 'r3', 'r4', 'round_1', 'round_2', 'round_3', 'round_4']
      const subset = Object.fromEntries(keys.filter(k => k in e).map(k => [k, e[k]]))
      console.log(`  ${last}:`, subset)
    } else {
      console.log(`  ${last}: NOT IN DG RESPONSE`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
