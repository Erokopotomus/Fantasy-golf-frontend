const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const raw = await p.rawProviderData.findFirst({
    where: { provider: 'yahoo', dataType: 'scoreboard_sample', eventRef: '399.l.784389' },
    select: { payload: true },
  })
  const data = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
  const league = data?.fantasy_content?.league
  const scoreboard = Array.isArray(league) ? league[1]?.scoreboard : league?.scoreboard
  const matchups = scoreboard?.[0]?.matchups || scoreboard?.matchups || {}

  // Look at first matchup entry
  const firstKey = Object.keys(matchups).filter(k => k !== 'count')[0]
  const entry = matchups[firstKey]
  console.log('entry keys:', Object.keys(entry))

  const matchup = entry?.matchup
  console.log('matchup type:', typeof matchup)
  console.log('matchup keys:', Object.keys(matchup))

  // The "0" key inside matchup contains the actual matchup data
  const inner = matchup?.['0']
  if (inner) {
    console.log('\nmatchup["0"] keys:', Object.keys(inner))
    const innerTeams = inner?.teams
    if (innerTeams) {
      console.log('inner teams keys:', Object.keys(innerTeams))
      for (const tk of Object.keys(innerTeams).filter(k => k !== 'count')) {
        const tw = innerTeams[tk]
        console.log(`  team ${tk}:`, tw?.team ? 'has team array' : 'no team array')
        if (tw?.team && Array.isArray(tw.team)) {
          // Extract team_id and points
          const meta = {}
          const fields = Array.isArray(tw.team[0]) ? tw.team[0] : [tw.team[0]]
          for (const f of fields) {
            if (f && typeof f === 'object') Object.assign(meta, f)
          }
          let points = 0
          for (let j = 1; j < tw.team.length; j++) {
            if (tw.team[j]?.team_points?.total) {
              points = parseFloat(tw.team[j].team_points.total)
              break
            }
          }
          console.log(`    teamId=${meta.team_id} name=${meta.name} points=${points}`)
        }
      }
    }
  }

  // Also check: does matchup.teams exist at the top level?
  console.log('\nmatchup.teams:', matchup.teams ? Object.keys(matchup.teams) : 'undefined')

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
