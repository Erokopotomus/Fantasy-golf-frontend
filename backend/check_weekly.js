const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Check 2010-2012 (repaired seasons) and 2020 (normal import)
  for (const year of [2010, 2011, 2012, 2015, 2020, 2024]) {
    const samples = await p.historicalSeason.findMany({
      where: { leagueId: 'cmlkzxdcr00itsz2t7ys484og', seasonYear: year },
      select: { seasonYear: true, ownerName: true, weeklyScores: true },
      take: 1,
    })
    for (const s of samples) {
      const ws = s.weeklyScores
      const len = Array.isArray(ws) ? ws.length : (ws ? typeof ws : 'null')
      console.log(`${s.seasonYear} (${s.ownerName}): weeklyScores=${len}${Array.isArray(ws) && ws.length > 0 ? ' first=' + JSON.stringify(ws[0]) : ''}`)
    }
    if (samples.length === 0) console.log(`${year}: no records`)
  }
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
