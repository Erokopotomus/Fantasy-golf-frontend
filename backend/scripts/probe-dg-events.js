require('../src/lib/prisma') // loads .env via dotenv side-effect
const dg = require('../src/services/datagolfClient')

async function main() {
  console.log('=== /field-updates?event_id=480 (Truist) ===')
  const t = await dg.getFieldUpdates('480')
  const tField = t?.field || []
  console.log(`event_name in response: ${t?.event_name || '(none)'}`)
  console.log(`field count: ${tField.length}`)
  console.log(`first 5 names: ${tField.slice(0, 5).map(p => p.player_name).join(', ')}`)

  console.log('\n=== /field-updates?event_id=553 (Myrtle Beach) ===')
  const m = await dg.getFieldUpdates('553')
  const mField = m?.field || []
  console.log(`event_name in response: ${m?.event_name || '(none)'}`)
  console.log(`field count: ${mField.length}`)
  console.log(`first 5 names: ${mField.slice(0, 5).map(p => p.player_name).join(', ')}`)

  console.log('\n=== Field overlap ===')
  const tNames = new Set(tField.map(p => p.player_name))
  const overlap = mField.filter(p => tNames.has(p.player_name))
  console.log(`Players in BOTH responses: ${overlap.length} of ${mField.length}`)

  console.log('\n=== /preds/in-play?event_id=553 ===')
  const live = await dg.getLiveInPlay('553')
  const livePlayers = live?.data || []
  console.log(`event_name in response: ${live?.info?.event_name || live?.event_name || '(none)'}`)
  console.log(`player count: ${livePlayers.length}`)
  console.log(`first 5: ${livePlayers.slice(0, 5).map(p => `${p.player_name} ${p.current_score ?? p.total ?? ''}`).join(' | ')}`)
}

main().catch(console.error)
