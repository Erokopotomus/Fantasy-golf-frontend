const prisma = require('../src/lib/prisma')
// Node 18+ has global fetch; fall back to node-fetch if running on older Node.
const fetchFn = typeof fetch === 'function'
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const BASE = process.env.TEST_BASE || 'http://localhost:3001/api'

async function run() {
  const failures = []

  // Test 1: PPR returns the full FFC pool (~170 players)
  const ppr = await (await fetchFn(`${BASE}/nfl/draft-players?scoring=ppr`)).json()
  if (!Array.isArray(ppr.players)) failures.push('ppr: players is not an array')
  if (ppr.players.length < 150 || ppr.players.length > 200) {
    failures.push(`ppr: expected 150-200 players, got ${ppr.players.length}`)
  }

  // Test 2: First player has ADP populated and lower than the last
  if (ppr.players[0]?.adp == null) failures.push('ppr: first player missing adp')
  if (ppr.players[0]?.adp >= ppr.players[ppr.players.length - 1]?.adp) {
    failures.push('ppr: not sorted ADP ascending')
  }

  // Test 3: Every returned player has team color fields (null acceptable, key must exist)
  const missingColor = ppr.players.find(p => !('teamPrimaryColor' in p))
  if (missingColor) failures.push(`ppr: player ${missingColor.name} missing teamPrimaryColor field`)

  // Test 4: half_ppr smaller than ppr (FFC publishes fewer half-ppr players)
  const half = await (await fetchFn(`${BASE}/nfl/draft-players?scoring=half_ppr`)).json()
  if (half.players.length >= ppr.players.length) {
    failures.push(`half_ppr should be <= ppr, got half=${half.players.length} ppr=${ppr.players.length}`)
  }

  // Test 5: Invalid scoring returns 400
  const bad = await fetchFn(`${BASE}/nfl/draft-players?scoring=bogus`)
  if (bad.status !== 400) failures.push(`invalid scoring: expected 400, got ${bad.status}`)

  if (failures.length) {
    console.error('FAIL:\n  ' + failures.join('\n  '))
    process.exit(1)
  }
  console.log(`PASS — ppr=${ppr.players.length} half_ppr=${half.players.length}`)
}

run().finally(() => prisma.$disconnect())
