const { computeHalfPpr } = require('./computeFantasyPoints')

const POSITION_LIMITS = {
  QB: 32,
  RB: 60,
  WR: 80,
  TE: 36,
  K: 32,
}

/**
 * Compute the top-N-per-position pool for a single season.
 *
 * @param {Array} weeklyRows - nflverse weekly stat rows (one per player-week)
 * @returns {Set<string>} gsisIds that qualify for the pool
 */
function computeSeasonPool(weeklyRows) {
  // Aggregate weekly rows → per-player season totals
  const byPlayer = new Map() // gsisId → { position, totalPts }
  for (const row of weeklyRows) {
    const gsisId = row.player_id
    if (!gsisId) continue
    const position = (row.position || row.position_group || '').toUpperCase()
    if (!position) continue
    const pts = computeHalfPpr(row)
    const acc = byPlayer.get(gsisId) || { position, totalPts: 0 }
    acc.totalPts += pts
    byPlayer.set(gsisId, acc)
  }

  // Group by position, sort desc, take top N per position
  const byPosition = new Map()
  for (const [gsisId, { position, totalPts }] of byPlayer) {
    if (!POSITION_LIMITS[position]) continue
    if (!byPosition.has(position)) byPosition.set(position, [])
    byPosition.get(position).push({ gsisId, totalPts })
  }

  const pool = new Set()
  for (const [position, players] of byPosition) {
    players.sort((a, b) => b.totalPts - a.totalPts)
    const limit = POSITION_LIMITS[position]
    for (const p of players.slice(0, limit)) pool.add(p.gsisId)
  }
  return pool
}

module.exports = { computeSeasonPool, POSITION_LIMITS }
