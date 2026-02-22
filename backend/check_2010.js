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

  const ownerNames = []
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

    const ownerName = (manager?.nickname && manager.nickname !== '--hidden--')
      ? manager.nickname
      : (teamMeta.name || manager?.guid || `Team ${teamMeta.team_id}`)

    ownerNames.push(ownerName)
    console.log('Team:', teamMeta.name, '→ ownerName:', ownerName)
  }

  const dupes = ownerNames.filter((n, i) => ownerNames.indexOf(n) !== i)
  if (dupes.length > 0) {
    console.log('\n!!! DUPLICATE OWNER NAMES:', dupes)
  } else {
    console.log('\nAll owner names unique')
  }

  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
