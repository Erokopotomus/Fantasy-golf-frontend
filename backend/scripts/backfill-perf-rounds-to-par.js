/**
 * One-time backfill: convert Performance.round1-4 values that look like raw
 * stroke counts (>= 50) to to-par by subtracting the course par. Caused by
 * syncLiveScoring writing DG's R1-R4 fields (raw strokes) directly into
 * a column that was supposed to hold to-par. Going forward, syncLiveScoring
 * does the conversion at write time.
 */
const prisma = require('../src/lib/prisma')

async function main() {
  // Pull every Performance row with any round value >= 50 (raw strokes)
  const bad = await prisma.performance.findMany({
    where: {
      OR: [
        { round1: { gte: 50 } },
        { round2: { gte: 50 } },
        { round3: { gte: 50 } },
        { round4: { gte: 50 } },
      ],
    },
    select: {
      id: true, tournamentId: true, playerId: true,
      round1: true, round2: true, round3: true, round4: true,
      tournament: { select: { name: true, courseId: true, course: { select: { par: true } } } },
    },
  })
  console.log(`Found ${bad.length} Performance rows with raw-stroke round values`)

  // Group by tournament so we apply the right par
  const byTournament = new Map()
  for (const p of bad) {
    if (!byTournament.has(p.tournamentId)) byTournament.set(p.tournamentId, { name: p.tournament.name, par: p.tournament.course?.par || 72, rows: [] })
    byTournament.get(p.tournamentId).rows.push(p)
  }
  console.log(`Across ${byTournament.size} tournaments`)
  for (const [tid, info] of byTournament) {
    console.log(`  ${info.name} (par ${info.par}): ${info.rows.length} rows`)
  }

  // Apply conversion
  let updated = 0
  for (const [tid, info] of byTournament) {
    const par = info.par
    for (const p of info.rows) {
      const data = {}
      for (const r of ['round1', 'round2', 'round3', 'round4']) {
        if (p[r] != null && p[r] >= 50) data[r] = p[r] - par
      }
      if (Object.keys(data).length === 0) continue
      await prisma.performance.update({ where: { id: p.id }, data })
      updated++
    }
  }
  console.log(`Updated ${updated} rows`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
