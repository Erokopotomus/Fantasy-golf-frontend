/**
 * Smoke test for MI-14 admin API routes.
 *
 * Two modes:
 *   1. HTTP mode (default): hits a running backend with an admin JWT from env
 *      ADMIN_JWT and base URL ADMIN_API_BASE (default https://clutch-production-8def.up.railway.app).
 *      Tests auth gating (401 / 403) + shape of each endpoint.
 *
 *   2. In-process mode (NODE_ENV=test or --in-process flag): bypasses HTTP and
 *      calls the Prisma queries directly. Useful when no admin JWT is available
 *      or running offline against the local DB.
 *
 * Usage:
 *   ADMIN_JWT=eyJ... node backend/scripts/intelligence/test-admin-api.js
 *   node backend/scripts/intelligence/test-admin-api.js --in-process
 */

const prisma = require('../../src/lib/prisma')
const { EXTRACTORS } = require('../../src/services/intelligence')

const BASE = process.env.ADMIN_API_BASE || 'https://clutch-production-8def.up.railway.app'
const JWT = process.env.ADMIN_JWT
const IN_PROCESS = process.argv.includes('--in-process') || !JWT

async function http(path, opts = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

function shape(obj, depth = 0) {
  if (obj == null) return String(obj)
  if (Array.isArray(obj)) {
    return obj.length === 0 ? '[]' : `[${shape(obj[0], depth + 1)}, ...${obj.length}]`
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj)
    if (depth > 1) return `{${keys.slice(0, 5).join(',')}${keys.length > 5 ? ',...' : ''}}`
    return `{ ${keys.slice(0, 8).map((k) => `${k}: ${shape(obj[k], depth + 1)}`).join(', ')}${keys.length > 8 ? ', ...' : ''} }`
  }
  return typeof obj
}

async function httpMode() {
  console.log(`\n=== HTTP MODE — base: ${BASE} ===\n`)
  const auth = { Authorization: `Bearer ${JWT}` }

  // Auth gating
  console.log('--- Auth gating ---')
  const noAuth = await http('/api/admin/intelligence/library')
  console.log(`  no token → status ${noAuth.status} (expected 401)`)

  // Library
  console.log('\n--- GET /library ---')
  const lib = await http('/api/admin/intelligence/library', { headers: auth })
  console.log(`  status ${lib.status}`)
  console.log(`  characteristics.length = ${lib.body?.characteristics?.length}`)
  if (lib.body?.characteristics?.[0]) {
    console.log(`  sample row: ${shape(lib.body.characteristics[0])}`)
  }

  // Pick the first characteristic with data (or first one period)
  const first = lib.body?.characteristics?.find((c) => c.usersWithData > 0) || lib.body?.characteristics?.[0]
  const type = first?.type
  if (!type) {
    console.log('No characteristics returned — aborting per-type tests.')
    return
  }

  // Detail
  console.log(`\n--- GET /characteristics/${type} ---`)
  const detail = await http(`/api/admin/intelligence/characteristics/${type}`, { headers: auth })
  console.log(`  status ${detail.status}`)
  console.log(`  meta: ${shape(detail.body?.meta)}`)
  console.log(`  topUsers.length = ${detail.body?.topUsers?.length}`)
  console.log(`  distribution.buckets.length = ${detail.body?.distribution?.buckets?.length}`)

  // Invalid type → 404
  const bad = await http('/api/admin/intelligence/characteristics/not_a_real_type', { headers: auth })
  console.log(`\n  invalid type → status ${bad.status} (expected 404)`)

  // User profile — pick a user with data if possible
  const userWithData = detail.body?.topUsers?.[0]?.userId
  if (userWithData) {
    console.log(`\n--- GET /users/${userWithData} ---`)
    const user = await http(`/api/admin/intelligence/users/${userWithData}`, { headers: auth })
    console.log(`  status ${user.status}`)
    console.log(`  user: ${shape(user.body?.user)}`)
    console.log(`  importSummary: ${shape(user.body?.importSummary)}`)
    console.log(`  characteristics.length = ${user.body?.characteristics?.length}`)
  }

  // User 404
  const badUser = await http('/api/admin/intelligence/users/not_a_real_user_id', { headers: auth })
  console.log(`\n  invalid userId → status ${badUser.status} (expected 404)`)

  // Threshold validation
  console.log(`\n--- POST /characteristics/${type}/thresholds (bad body) ---`)
  const badThresh = await http(`/api/admin/intelligence/characteristics/${type}/thresholds`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ highMinN: 'oops' }),
  })
  console.log(`  status ${badThresh.status} (expected 400)`)

  // Toggle promote validation
  console.log(`\n--- POST /characteristics/${type}/toggle-promote (bad body) ---`)
  const badPromote = await http(`/api/admin/intelligence/characteristics/${type}/toggle-promote`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({}),
  })
  console.log(`  status ${badPromote.status} (expected 400)`)
}

async function inProcessMode() {
  console.log(`\n=== IN-PROCESS MODE (no JWT or --in-process) ===\n`)

  // Library shape
  console.log('--- /library shape (synthetic) ---')
  const aggregates = await prisma.characteristicAggregate.findMany()
  const aggByType = new Map(aggregates.map((a) => [a.characteristicType, a]))
  const totalUsers = await prisma.user.count()
  console.log(`  totalUsers = ${totalUsers}`)
  console.log(`  EXTRACTORS.length = ${EXTRACTORS.length}`)
  console.log(`  aggregate rows = ${aggregates.length}`)

  for (const { type } of EXTRACTORS) {
    const a = aggByType.get(type)
    const usersWithData = a?.usersWithData ?? 0
    const high = a?.highConfidenceCount ?? 0
    const med = a?.medConfidenceCount ?? 0
    const low = a?.lowConfidenceCount ?? 0
    console.log(`    ${type.padEnd(32)} users=${usersWithData} H=${high} M=${med} L=${low}`)
  }

  // Pick a type with data
  const typeWithData = EXTRACTORS.find(({ type }) => {
    const a = aggByType.get(type)
    return (a?.usersWithData ?? 0) > 0
  })?.type
  if (!typeWithData) {
    console.log('\nNo characteristic has any user rows yet — try running aggregate first.')
    return
  }

  console.log(`\n--- /characteristics/${typeWithData} shape ---`)
  const rows = await prisma.managerCharacteristic.findMany({
    where: { characteristicType: typeWithData },
    orderBy: { confidenceScore: 'desc' },
    include: { user: { select: { id: true, name: true, username: true } } },
  })
  console.log(`  rows = ${rows.length}`)
  console.log(`  top user = ${rows[0]?.user?.name} (score ${rows[0]?.confidenceScore})`)

  // User profile shape
  const sampleUserId = rows[0]?.userId
  if (sampleUserId) {
    console.log(`\n--- /users/${sampleUserId} shape ---`)
    const user = await prisma.user.findUnique({
      where: { id: sampleUserId },
      select: { id: true, name: true, username: true, email: true },
    })
    const imports = await prisma.leagueImport.findMany({ where: { userId: sampleUserId } })
    const seasons = await prisma.historicalSeason.count({ where: { ownerUserId: sampleUserId } })
    const chars = await prisma.managerCharacteristic.count({ where: { userId: sampleUserId } })
    console.log(`  user.name = ${user?.name}`)
    console.log(`  imports = ${imports.length}, seasons = ${seasons}, characteristics = ${chars}`)
  }
}

;(async () => {
  try {
    if (IN_PROCESS) {
      await inProcessMode()
    } else {
      await httpMode()
    }
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
