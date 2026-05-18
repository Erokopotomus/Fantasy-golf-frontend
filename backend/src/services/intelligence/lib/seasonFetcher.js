const prisma = require('../../../lib/prisma')

/**
 * Fetch HistoricalSeason rows for a user, deduped to one row per
 * (leagueId, seasonYear). Stable ordering for snapshot determinism — we
 * `orderBy: id ASC` so the same dedupe always picks the same surviving row
 * across runs.
 *
 * Used by MI-6 (auction), MI-7 (trade), and any subsequent extractor that
 * needs the canonical "one row per league-season" view of HistoricalSeason.
 *
 * @param {string} userId
 * @param {object} opts
 * @param {object} [opts.db]      Prisma client (default: shared singleton)
 * @param {object} [opts.select]  Prisma select clause — pass exactly the
 *                                columns you need
 * @param {object} [opts.where]   Additional WHERE clauses merged with
 *                                { ownerUserId: userId }
 * @returns {Promise<Array<object>>} deduped rows in stable order
 */
async function fetchDedupedSeasons(
  userId,
  { db = prisma, select, where = {} } = {}
) {
  const rows = await db.historicalSeason.findMany({
    where: { ownerUserId: userId, ...where },
    select,
    orderBy: { id: 'asc' },
  })
  const seen = new Set()
  const out = []
  for (const s of rows) {
    const k = `${s.leagueId}::${s.seasonYear}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

module.exports = { fetchDedupedSeasons }
