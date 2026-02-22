const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const raw = await p.rawProviderData.findFirst({
    where: { provider: 'yahoo', dataType: 'standings', eventRef: '242.l.263452' },
    select: { payload: true }
  })
  const data = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
  const league = data?.fantasy_content?.league
  const standingsArr = Array.isArray(league) ? league[1]?.standings : league?.standings
  const teams = standingsArr?.[0]?.teams || standingsArr?.teams || {}
  const teamEntries = typeof teams === 'object' ? Object.values(teams) : []

  for (const entry of teamEntries) {
    const teamArr = entry?.team
    if (!teamArr || !Array.isArray(teamArr)) continue
    const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
    const teamMeta = {}
    for (const f of metaFields) {
      if (f && typeof f === 'object') Object.assign(teamMeta, f)
    }
    if (!teamMeta.team_key) continue
    const managers = teamMeta.managers || []
    const manager = Array.isArray(managers) ? managers[0]?.manager : managers.manager
    console.log(teamMeta.name, '| nickname:', manager?.nickname, '| guid:', manager?.guid, '| managers_raw:', JSON.stringify(managers).substring(0, 200))
  }

  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
