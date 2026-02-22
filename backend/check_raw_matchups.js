const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Check raw scoreboard data
  const rawScoreboards = await p.rawProviderData.findMany({
    where: { provider: 'yahoo', dataType: { startsWith: 'scoreboard' } },
    select: { dataType: true, eventRef: true, ingestedAt: true },
  })
  console.log('Raw scoreboard records:', rawScoreboards.length)
  for (const r of rawScoreboards) {
    console.log(`  ${r.dataType} | ${r.eventRef} | ${r.createdAt}`)
  }

  // Check if we have any raw standings to get a league key
  const rawStandings = await p.rawProviderData.findMany({
    where: { provider: 'yahoo', dataType: 'standings' },
    select: { eventRef: true },
    take: 3,
  })
  console.log('\nRaw standings refs:', rawStandings.map(r => r.eventRef))

  // Check one scoreboard to see if it has team points
  if (rawScoreboards.length > 0) {
    const sample = await p.rawProviderData.findFirst({
      where: { provider: 'yahoo', dataType: { startsWith: 'scoreboard' } },
      select: { payload: true, eventRef: true, dataType: true },
    })
    const data = typeof sample.payload === 'string' ? JSON.parse(sample.payload) : sample.payload
    const league = data?.fantasy_content?.league
    const scoreboard = Array.isArray(league) ? league[1]?.scoreboard : league?.scoreboard
    const matchups = scoreboard?.[0]?.matchups || scoreboard?.matchups || {}
    const keys = Object.keys(matchups)
    console.log(`\nSample scoreboard (${sample.eventRef}): ${keys.length} matchup keys`)
    // Show first matchup structure
    const first = matchups[keys[0]]
    if (first) {
      console.log('First matchup teams:', JSON.stringify(first).slice(0, 500))
    }
  }

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
