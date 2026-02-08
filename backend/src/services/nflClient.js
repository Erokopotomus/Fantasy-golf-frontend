/**
 * nflClient.js — NFL data fetcher from nflverse GitHub releases
 *
 * nflverse publishes pre-aggregated CSV data (MIT license):
 * - Weekly player stats (passing, rushing, receiving, defense, kicking)
 * - Rosters, schedules, player IDs, draft picks
 * - Advanced metrics: EPA, CPOE, success rate (pre-computed)
 *
 * We pull weekly aggregates — NOT raw play-by-play (too large, unnecessary).
 * Source attribution: "Data via nflverse" (required)
 */

const https = require('https')
const { parse } = require('csv-parse/sync')

const NFLVERSE_BASE = 'https://github.com/nflverse/nflverse-data/releases/download'

// Rate limiting: be polite to GitHub
let lastRequest = 0
const MIN_INTERVAL_MS = 500

async function rateLimitedFetch(url) {
  const now = Date.now()
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequest))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequest = Date.now()

  return fetchCsv(url)
}

/**
 * Fetch a CSV file from a URL and parse it into an array of objects
 */
function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    const request = (urlToFetch) => {
      https.get(urlToFetch, { headers: { 'User-Agent': 'ClutchFantasySports/1.0' } }, (res) => {
        // Follow redirects (GitHub releases redirect to CDN)
        if (res.statusCode === 301 || res.statusCode === 302) {
          return request(res.headers.location)
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`))
        }

        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          try {
            const csv = Buffer.concat(chunks).toString('utf-8')
            const records = parse(csv, {
              columns: true,
              skip_empty_lines: true,
              cast: true,
              cast_date: false,
              relaxColumnCount: true,
            })
            resolve(records)
          } catch (err) {
            reject(new Error(`CSV parse error for ${url}: ${err.message}`))
          }
        })
        res.on('error', reject)
      }).on('error', reject)
    }
    request(url)
  })
}

// ──────── PUBLIC API ────────

/**
 * Fetch all NFL players with cross-platform IDs
 * Contains: gsis_id, name, position, team, espn_id, yahoo_id, pfr_id, sleeper_id, etc.
 */
async function getPlayers() {
  const url = `${NFLVERSE_BASE}/players/players.csv`
  const rows = await rateLimitedFetch(url)
  console.log(`[nflClient] Fetched ${rows.length} players from nflverse`)
  return rows
}

/**
 * Fetch NFL schedule for a given season (or all seasons in one file)
 * Contains: game_id, season, week, game_type, home_team, away_team, home_score, away_score, etc.
 */
async function getSchedule() {
  const url = `${NFLVERSE_BASE}/schedules/schedules.csv`
  const rows = await rateLimitedFetch(url)
  console.log(`[nflClient] Fetched ${rows.length} schedule rows from nflverse`)
  return rows
}

/**
 * Fetch weekly player stats for a season
 * Contains: player_id, player_name, position, team, completions, attempts, passing_yards, etc.
 * This is the KEY data source — pre-aggregated, includes fantasy points
 */
async function getWeeklyStats(season) {
  const url = `${NFLVERSE_BASE}/player_stats/player_stats_${season}.csv`
  const rows = await rateLimitedFetch(url)
  console.log(`[nflClient] Fetched ${rows.length} weekly stat rows for ${season}`)
  return rows
}

/**
 * Fetch weekly rosters for a season
 * Contains: player_id, team, position, jersey_number, status, depth_chart_position
 */
async function getWeeklyRosters(season) {
  const url = `${NFLVERSE_BASE}/weekly_rosters/roster_weekly_${season}.csv`
  const rows = await rateLimitedFetch(url)
  console.log(`[nflClient] Fetched ${rows.length} roster rows for ${season}`)
  return rows
}

/**
 * Fetch NFL draft picks
 * Contains: season, round, pick, team, player_name, position, college
 */
async function getDraftPicks(season) {
  const url = `${NFLVERSE_BASE}/draft_picks/draft_picks.csv`
  const allRows = await rateLimitedFetch(url)
  const filtered = season ? allRows.filter(r => Number(r.season) === season) : allRows
  console.log(`[nflClient] Fetched ${filtered.length} draft picks${season ? ` for ${season}` : ''}`)
  return filtered
}

/**
 * Fetch team-level season stats (from player stats aggregated)
 * We compute these ourselves from player game data
 */

/**
 * Fetch advanced stats (ngs - Next Gen Stats) if available
 * These include EPA, CPOE, etc. — but these are ALSO in the weekly player stats
 * So we primarily use getWeeklyStats which has everything pre-joined
 */

module.exports = {
  getPlayers,
  getSchedule,
  getWeeklyStats,
  getWeeklyRosters,
  getDraftPicks,
  // Utility for custom URLs
  fetchCsv: rateLimitedFetch,
}
