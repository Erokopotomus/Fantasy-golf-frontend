const nflClient = require('../nflClient')
const { computeSeasonPool } = require('./computePool')

/**
 * Compute the union of position-tiered pools across multiple seasons.
 *
 * @param {Array<number>} seasons - e.g., [1999, 2000, ..., 2025]
 * @returns {Promise<{ pool: Set<string>, perSeasonSizes: Object }>}
 */
async function computeMultiSeasonPool(seasons) {
  const pool = new Set()
  const perSeasonSizes = {}

  for (const season of seasons) {
    try {
      console.log(`[pool] Fetching ${season} weekly stats…`)
      const rows = await nflClient.getWeeklyStats(season)
      const seasonPool = computeSeasonPool(rows)
      perSeasonSizes[season] = seasonPool.size
      for (const id of seasonPool) pool.add(id)
      if (seasonPool.size === 0) {
        console.warn(`[pool] ${season}: 0 qualifiers — ${rows.length} rows fetched (possible nflverse format issue or empty CSV)`)
      } else {
        console.log(`[pool] ${season}: ${seasonPool.size} qualifiers (running union: ${pool.size})`)
      }
    } catch (e) {
      console.warn(`[pool] Season ${season} failed: ${e.message} — skipping`)
      perSeasonSizes[season] = 'ERROR'
    }
  }

  return { pool, perSeasonSizes }
}

module.exports = { computeMultiSeasonPool }
