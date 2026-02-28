/**
 * Yahoo Player Cache Service
 *
 * Persistent DB cache of Yahoo player IDs → names.
 * Avoids redundant Yahoo API calls and Sleeper lookups across imports.
 */

const prisma = require('../lib/prisma.js')

/**
 * Batch lookup player names from cache.
 * @param {number[]} yahooIds - Array of numeric Yahoo player IDs
 * @returns {Object} Map of { yahooId: fullName }
 */
async function lookupNames(yahooIds) {
  if (!yahooIds || yahooIds.length === 0) return {}

  const rows = await prisma.yahooPlayerCache.findMany({
    where: { yahooId: { in: yahooIds.map(Number) } },
    select: { yahooId: true, fullName: true },
  })

  const map = {}
  for (const row of rows) {
    map[row.yahooId] = row.fullName
  }
  return map
}

/**
 * Bulk upsert players into cache.
 * @param {Array<{yahooId: number, fullName: string, position?: string}>} players
 */
async function upsertPlayers(players) {
  if (!players || players.length === 0) return

  // Deduplicate by yahooId (last-write-wins) to avoid ON CONFLICT duplicate row error
  const deduped = new Map()
  for (const p of players) {
    const id = Number(p.yahooId)
    if (!id || !p.fullName) continue
    deduped.set(id, p)
  }

  const unique = Array.from(deduped.values())
  if (unique.length === 0) return

  // Batch in chunks of 500 to avoid parameter limits
  const CHUNK = 500
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    const values = []
    const params = []
    let idx = 1

    for (const p of chunk) {
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, NOW())`)
      params.push(Number(p.yahooId), p.fullName, p.position || null)
      idx += 3
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO yahoo_player_cache ("yahooId", "fullName", "position", "updatedAt")
       VALUES ${values.join(', ')}
       ON CONFLICT ("yahooId") DO UPDATE SET
         "fullName" = EXCLUDED."fullName",
         "position" = COALESCE(EXCLUDED."position", yahoo_player_cache."position"),
         "updatedAt" = NOW()`,
      ...params
    )
  }
}

/**
 * Seed cache from Sleeper's public NFL player API.
 * Populates ~6,700 entries with yahoo_id → full_name mappings.
 * @returns {number} Number of players seeded
 */
async function seedFromSleeper() {
  const res = await fetch('https://api.sleeper.app/v1/players/nfl')
  const players = await res.json()

  const toUpsert = []
  for (const [, p] of Object.entries(players)) {
    if (p.yahoo_id && p.full_name) {
      toUpsert.push({
        yahooId: Number(p.yahoo_id),
        fullName: p.full_name,
        position: p.position || null,
      })
    }
  }

  if (toUpsert.length > 0) {
    await upsertPlayers(toUpsert)
  }

  console.log(`[YahooPlayerCache] Seeded ${toUpsert.length} players from Sleeper API`)
  return toUpsert.length
}

module.exports = { lookupNames, upsertPlayers, seedFromSleeper }
