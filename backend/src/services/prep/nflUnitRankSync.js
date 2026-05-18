/**
 * NFL Team Unit Rank Sync (DS-4)
 *
 * Populates `NflTeamUnitRank` rows for OL and DL overall rank across
 * multiple seasons. 192 expected rows per full run (32 teams × 2 units
 * × 3 seasons).
 *
 * **Why ESPN's JSON API instead of HTML scraping:**
 * ESPN's public `/nfl/stats/team/_/...` web pages are React SPAs —
 * the initial SSR HTML contains the table skeleton but the `<td>`
 * cells are empty (`<td class="Table__TD"></td>`) until the client
 * hydrates. The data IS available via ESPN's public JSON endpoint
 * (`site.web.api.espn.com/.../statistics/byteam`), which returns a
 * fully-populated payload including pre-computed ranks per metric.
 * This means we don't need cheerio, headless Chrome, or composite
 * rank calculation — ESPN ranks every stat 1-32 for us.
 *
 * **Why "yards per rush attempt" as the OL/DL proxy:**
 * ESPN does NOT publicly expose Football Outsiders' "Adjusted Line
 * Yards" metric (the ALY URL in the original DS-4 brief is the
 * sort key for an unrelated page; the actual ALY data isn't in any
 * public ESPN endpoint). For v1, "yards per rush attempt" is the
 * cleanest single-number OL/DL proxy because it:
 *   1. Normalizes for volume (run-heavy teams don't dominate just
 *      by attempting more carries),
 *   2. Reflects line play more directly than total rushing yards
 *      (which is heavily QB/RB-dependent on big breakaways),
 *   3. Has a stable, sortable rank in ESPN's payload.
 *
 * OL rank = team's own offensive yards-per-rush-attempt rank
 *           (splitId="0" on the offense endpoint, rank 1=best).
 * DL rank = team's opponent rushing yards-per-attempt allowed rank
 *           (splitId="900" on the defense endpoint, rank 1=best).
 *
 * `source` column captures the metric used so downstream consumers
 * can disambiguate if we later layer in a better source:
 *   - 'espn_ypc'         (OL: yards per rush attempt)
 *   - 'espn_ypc_allowed' (DL: yards per rush attempt allowed)
 *
 * **Endpoints (one HTTP request per season × category):**
 *   https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam
 *     ?season={year}&seasontype=2&limit=32&category={offense|defense}
 *
 * **Quirks observed:**
 * - ESPN's offense endpoint nests stats under `team.categories[]`
 *   with `splitId="0"` (own) and `splitId="1"` (opponent). The defense
 *   endpoint uses `splitId="900"` for opponent stats. Don't assume "1".
 * - ESPN abbreviation `WSH` maps to our DB `WAS` (Washington
 *   Commanders). All other 31 abbreviations are identical.
 * - Field schema lives at the top-level `categories` array; each
 *   category has parallel `names[]`, `labels[]`, and `values[]` arrays
 *   on team rows. Match by category `name` ('rushing'), then index by
 *   `names.indexOf('yardsPerRushAttempt')`.
 *
 * Fail-loud: <80% of expected rows triggers throw. Catches ESPN API
 * schema drift (renamed fields, restructured payload).
 */

const axios = require('axios')
const prisma = require('../../lib/prisma')

const ESPN_API_BASE =
  'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam'

// ESPN team abbreviation → our NflTeam.abbreviation. Only WSH→WAS
// differs; everything else is identity. Kept as an explicit map so
// the mismatch is documented in code (vs hiding in a one-liner).
const ESPN_ABBR_TO_OURS = {
  WSH: 'WAS',
}

function mapEspnAbbr(espnAbbr) {
  return ESPN_ABBR_TO_OURS[espnAbbr] || espnAbbr
}

const SLEEP_BETWEEN_REQUESTS_MS = 750
const REQUEST_TIMEOUT_MS = 20000
const USER_AGENT =
  'ClutchFantasySportsBot/1.0 (https://clutchfantasysports.com; ericmsaylor@gmail.com)'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch one (season, category) payload from ESPN's stats-by-team API.
 *
 * @param {number} season - Season year (e.g. 2024)
 * @param {'offense'|'defense'} category - Which endpoint to hit
 * @returns {Promise<Object>} parsed JSON response
 */
async function fetchEspnTeamStats(season, category) {
  const res = await axios.get(ESPN_API_BASE, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT },
    params: { season, seasontype: 2, limit: 32, category },
  })
  if (!res.data || !Array.isArray(res.data.teams)) {
    throw new Error(
      `ESPN API returned unexpected shape (no teams[]) for season=${season} category=${category}`
    )
  }
  return res.data
}

/**
 * Given an ESPN stats payload (offense or defense) and a split id,
 * extract per-team `yardsPerRushAttempt` rank.
 *
 * @param {Object} payload - ESPN API response
 * @param {string} splitId - '0' for own stats, '900' for opponent
 *                           (defense endpoint uses 900, not 1)
 * @returns {Array<{teamAbbr:string, rank:number, score:number|null}>}
 */
function extractYpcRanks(payload, splitId) {
  // Find the rushing category schema to know which array index holds YPC.
  const rushingSchema = (payload.categories || []).find((c) => c.name === 'rushing')
  if (!rushingSchema) {
    throw new Error("ESPN payload missing 'rushing' category schema")
  }
  const ypcIdx = (rushingSchema.names || []).indexOf('yardsPerRushAttempt')
  if (ypcIdx < 0) {
    throw new Error(
      "ESPN payload missing 'yardsPerRushAttempt' in rushing.names — schema drift?"
    )
  }

  const results = []
  for (const team of payload.teams || []) {
    const espnAbbr = team?.team?.abbreviation
    if (!espnAbbr) continue
    const teamAbbr = mapEspnAbbr(espnAbbr)

    // Find the rushing entry matching the requested split.
    const rushing = (team.categories || []).find(
      (c) => c.name === 'rushing' && String(c.splitId) === String(splitId)
    )
    if (!rushing) continue

    const rankStr = rushing.ranks?.[ypcIdx]
    const value = rushing.values?.[ypcIdx]
    const rank = parseInt(rankStr, 10)
    if (!Number.isFinite(rank) || rank < 1 || rank > 32) continue

    results.push({
      teamAbbr,
      rank,
      score: Number.isFinite(value) ? Number(value) : null,
    })
  }
  return results
}

/**
 * Scrape one season's OL rank (offense yards-per-rush-attempt).
 * Exported for unit testing.
 *
 * @param {number} season
 * @returns {Promise<Array<{teamAbbr, rank, score}>>}
 */
async function scrapeOlRanks(season) {
  const payload = await fetchEspnTeamStats(season, 'offense')
  return extractYpcRanks(payload, '0')
}

/**
 * Scrape one season's DL rank (defense yards-per-rush-attempt allowed).
 * Uses splitId="900" (opponent stats on the defense endpoint).
 * Exported for unit testing.
 *
 * @param {number} season
 * @returns {Promise<Array<{teamAbbr, rank, score}>>}
 */
async function scrapeDlRanks(season) {
  const payload = await fetchEspnTeamStats(season, 'defense')
  return extractYpcRanks(payload, '900')
}

/**
 * Sync `NflTeamUnitRank` rows for OL + DL across the given seasons.
 *
 * @param {Object} [opts]
 * @param {PrismaClient} [opts.db] - Prisma client (defaults to singleton)
 * @param {number[]} [opts.seasons] - Seasons to fetch. Default [2023,2024,2025].
 * @returns {Promise<Object>} stats
 */
async function syncUnitRanks({ db = prisma, seasons = [2023, 2024, 2025] } = {}) {
  const startedAt = Date.now()
  const stats = {
    seasonsAttempted: 0,
    rowsUpserted: 0,
    seasons: {},
    errors: [],
    unmappedAbbreviations: new Set(),
  }

  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map((t) => [t.abbreviation, t.id]))
  console.log(
    `[prep unit-rank-sync] starting seasons=[${seasons.join(',')}], ${teams.length} teams`
  )

  for (const season of seasons) {
    stats.seasonsAttempted++
    stats.seasons[season] = { OL: 0, DL: 0 }

    // --- OL ---
    try {
      const olRanks = await scrapeOlRanks(season)
      for (const r of olRanks) {
        const teamId = teamByAbbr[r.teamAbbr]
        if (!teamId) {
          stats.unmappedAbbreviations.add(r.teamAbbr)
          continue
        }
        await db.nflTeamUnitRank.upsert({
          where: { teamId_season_unit: { teamId, season, unit: 'OL' } },
          create: {
            teamId,
            season,
            unit: 'OL',
            rank: r.rank,
            score: r.score,
            source: 'espn_ypc',
          },
          update: { rank: r.rank, score: r.score, source: 'espn_ypc' },
        })
        stats.rowsUpserted++
        stats.seasons[season].OL++
      }
    } catch (e) {
      console.error(`[prep unit-rank-sync] OL season ${season} failed:`, e.message)
      stats.errors.push({ season, unit: 'OL', error: e.message })
    }

    await sleep(SLEEP_BETWEEN_REQUESTS_MS)

    // --- DL ---
    try {
      const dlRanks = await scrapeDlRanks(season)
      for (const r of dlRanks) {
        const teamId = teamByAbbr[r.teamAbbr]
        if (!teamId) {
          stats.unmappedAbbreviations.add(r.teamAbbr)
          continue
        }
        await db.nflTeamUnitRank.upsert({
          where: { teamId_season_unit: { teamId, season, unit: 'DL' } },
          create: {
            teamId,
            season,
            unit: 'DL',
            rank: r.rank,
            score: r.score,
            source: 'espn_ypc_allowed',
          },
          update: { rank: r.rank, score: r.score, source: 'espn_ypc_allowed' },
        })
        stats.rowsUpserted++
        stats.seasons[season].DL++
      }
    } catch (e) {
      console.error(`[prep unit-rank-sync] DL season ${season} failed:`, e.message)
      stats.errors.push({ season, unit: 'DL', error: e.message })
    }

    await sleep(SLEEP_BETWEEN_REQUESTS_MS)
    console.log(
      `[prep unit-rank-sync] season ${season}: OL=${stats.seasons[season].OL} DL=${stats.seasons[season].DL}`
    )
  }

  // Convert set to array for JSON serialization.
  stats.unmappedAbbreviations = Array.from(stats.unmappedAbbreviations)

  // Fail-loud: 192 expected (32 × 2 × 3). Allow up to 20% miss for v1.
  const expectedTotal = teams.length * 2 * seasons.length
  if (stats.rowsUpserted < expectedTotal * 0.8) {
    throw new Error(
      `[prep unit-rank-sync] FAILED: ${stats.rowsUpserted}/${expectedTotal} rows upserted (<80%). ` +
        `ESPN API schema may have changed; check field names ('yardsPerRushAttempt', splitId values).`
    )
  }

  stats.durationMs = Date.now() - startedAt
  console.log(
    `[prep unit-rank-sync] done in ${(stats.durationMs / 1000).toFixed(1)}s: ` +
      `${stats.rowsUpserted}/${expectedTotal} rows, ${stats.errors.length} errors`
  )
  return stats
}

module.exports = {
  syncUnitRanks,
  scrapeOlRanks,
  scrapeDlRanks,
  extractYpcRanks,
  fetchEspnTeamStats,
  ESPN_ABBR_TO_OURS,
}
