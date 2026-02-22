/**
 * Check if the teamId format from roster data matches what's in matchup data
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Get raw standings for 2020 season (Bro Montana league key for 2020)
  // First find a standings record for this league
  const raw = await p.rawProviderData.findFirst({
    where: { provider: 'yahoo', dataType: 'standings', eventRef: '399.l.784389' }, // 2020
    select: { payload: true, eventRef: true },
  })

  if (!raw) {
    // Try to find any standings for the league
    const all = await p.rawProviderData.findMany({
      where: { provider: 'yahoo', dataType: 'standings' },
      select: { eventRef: true },
    })
    console.log('Available standings eventRefs:', all.map(a => a.eventRef))

    // Also check what league keys we have from Bro Montana
    const imports = await p.leagueImport.findFirst({
      where: { clutchLeagueId: 'cmlkzxdcr00itsz2t7ys484og' },
      select: { id: true, sourceLeagueId: true, seasonsParsed: true },
    })
    console.log('Import record:', JSON.stringify(imports, null, 2))
    await p.$disconnect()
    return
  }

  const data = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
  const league = data?.fantasy_content?.league
  const standingsArr = Array.isArray(league) ? league[1]?.standings : league?.standings
  const teams = standingsArr?.[0]?.teams || standingsArr?.teams || {}

  console.log('=== Roster team IDs from standings ===')
  for (const entry of Object.values(teams)) {
    const teamArr = entry?.team
    if (!teamArr || !Array.isArray(teamArr)) continue
    const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
    const teamMeta = {}
    for (const f of metaFields) {
      if (f && typeof f === 'object') Object.assign(teamMeta, f)
    }
    console.log(`  teamId=${teamMeta.team_id} teamKey=${teamMeta.team_key} name=${teamMeta.name}`)
  }

  // Now check scoreboard for same league key
  const scoreboard = await p.rawProviderData.findFirst({
    where: { provider: 'yahoo', dataType: 'scoreboard_sample', eventRef: raw.eventRef },
    select: { payload: true },
  })
  if (scoreboard) {
    const sbData = typeof scoreboard.payload === 'string' ? JSON.parse(scoreboard.payload) : scoreboard.payload
    const sbLeague = sbData?.fantasy_content?.league
    const sb = Array.isArray(sbLeague) ? sbLeague[1]?.scoreboard : sbLeague?.scoreboard
    const matchups = sb?.[0]?.matchups || sb?.matchups || {}

    console.log('\n=== Matchup team IDs from scoreboard ===')
    for (const entry of Object.values(matchups)) {
      const matchup = entry?.matchup
      if (!matchup) continue
      const teams2 = matchup.teams || matchup['0']?.teams || {}
      // The "0" wrapper is from Yahoo's JSON format
      const innerTeams = matchup['0']?.teams || teams2

      // Try to extract teams
      for (const key of Object.keys(innerTeams)) {
        const wrapper = innerTeams[key]?.team || innerTeams[key]
        if (!wrapper) continue
        if (Array.isArray(wrapper)) {
          const meta = {}
          const fields = Array.isArray(wrapper[0]) ? wrapper[0] : [wrapper[0]]
          for (const f of fields) {
            if (f && typeof f === 'object') Object.assign(meta, f)
          }
          console.log(`  teamId=${meta.team_id} teamKey=${meta.team_key} name=${meta.name}`)
        }
      }
    }
  }

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
