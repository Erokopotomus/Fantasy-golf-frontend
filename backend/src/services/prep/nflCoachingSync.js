/**
 * NFL Coaching Staff Sync (DS-3)
 *
 * Scrapes a single-page HC/OC/DC/ST table to populate
 * NflCoachingStaff rows for HC / OC / DC across all 32 teams.
 *
 * **Source URL:**
 *   https://gridironexperts.com/nfl-coaches-list/
 *
 * **Why this source (and not FantasyPros):**
 * Eric's intuition was FantasyPros — but FantasyPros' coordinator/
 * coaches pages (rankings/head-coach-cheatsheets.php and friends) are
 * a JS-rendered React shell with no inline data; the coordinator URL
 * variants all 302 to the consensus-cheatsheets page which contains
 * an empty `players: []` array. GridironExperts hosts the exact table
 * Eric described (Teams, HC, OC, DC, ST Coach, OFF Scheme, DEF Scheme),
 * server-rendered HTML, all 32 teams in one `<table>`, page title
 * "Current NFL Head Coaches and Coordinator List 2026", and the
 * coaching shuffle Eric flagged (Joe Brady HC + Pete Carmichael OC for
 * BUF, John Harbaugh + Matt Nagy + Dennard Wilson for NYG, Mike McCarthy
 * for PIT, Mike Vrabel for NE, Ben Johnson for CHI, Aaron Glenn for NYJ,
 * Kellen Moore for NO, Brian Schottenheimer for DAL) is all present.
 *
 * **Why this beats the prior Wikipedia approach:**
 * Wikipedia's 2026 team-season pages return last year's staffs because
 * the {{Coaching staff}} templates haven't been updated for the
 * offseason. GridironExperts is editorially maintained and reflects
 * current 2026 reality. Also: one HTTP request instead of 32, no
 * polite-delay loop, ~1-2s total runtime.
 *
 * **Fail-loud threshold:** require at least 80 of 96 expected rows
 * (32 teams × HC/OC/DC) to be upserted. Catches HTML schema drift
 * (column reorder, table replaced with a different layout, etc.).
 */

const axios = require('axios')
const { parse } = require('node-html-parser')
const prisma = require('../../lib/prisma')

const SOURCE_URL = 'https://gridironexperts.com/nfl-coaches-list/'
const REQUEST_TIMEOUT_MS = 20000

// Browser-realistic UA. Plain "Mozilla/5.0" gets a 403 from this host's
// bot protection; a full Chrome UA returns 200.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// Maps the source's full team display name to our NflTeam.abbreviation.
// 32 entries — verified at import time below.
const TEAM_NAME_TO_ABBR = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
}

if (Object.keys(TEAM_NAME_TO_ABBR).length !== 32) {
  throw new Error(
    `TEAM_NAME_TO_ABBR must contain exactly 32 entries, got ${Object.keys(TEAM_NAME_TO_ABBR).length}`
  )
}

// Header text → expected column index. We validate the actual <thead>
// against this at parse time, so if the page reorders columns we throw
// immediately rather than silently swapping HC/OC names.
const EXPECTED_HEADERS = [
  'Teams',
  'Head Coach',
  'Offensive Coordinator',
  'Defensive Coordinator',
  'Special Teams Coach',
  'OFF Scheme',
  'DEF Scheme',
]

/**
 * Strip whitespace and decode the few HTML entities node-html-parser
 * leaves behind in .text (mostly &#8217; right single quote in names
 * like "Chris O'Leary").
 */
function cleanName(raw) {
  if (raw == null) return null
  const trimmed = String(raw)
    .replace(/&#8217;/g, '’')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (trimmed.length < 2 || trimmed.length > 80) return null
  return trimmed
}

/**
 * Fetch + parse the GridironExperts coaching-staff table.
 * Returns an array of { teamName, teamAbbr, hc, oc, dc, stc, offScheme, defScheme }.
 *
 * Throws if the table is missing or the column headers don't match
 * EXPECTED_HEADERS (defends against silent schema drift).
 *
 * Exported so the smoke test can call it independently of the DB.
 */
async function fetchCoachingTable() {
  const res = await axios.get(SOURCE_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  })

  const root = parse(res.data)
  const tables = root.querySelectorAll('table')
  if (tables.length === 0) {
    throw new Error('GridironExperts coaches page: no <table> found in HTML')
  }

  // Find the coaching staff table by matching its header row. The page
  // currently has only one table, but be defensive in case ads or
  // unrelated tables appear later.
  let table = null
  for (const t of tables) {
    const ths = t.querySelectorAll('thead th')
    if (ths.length !== EXPECTED_HEADERS.length) continue
    const labels = ths.map((h) => h.text.trim())
    if (EXPECTED_HEADERS.every((expected, idx) => labels[idx] === expected)) {
      table = t
      break
    }
  }
  if (!table) {
    const firstHeaders = tables[0]
      .querySelectorAll('thead th')
      .map((h) => h.text.trim())
    throw new Error(
      `GridironExperts coaches page: could not find table with expected headers. ` +
        `First table headers were [${firstHeaders.join(', ')}]. ` +
        `Expected [${EXPECTED_HEADERS.join(', ')}]. ` +
        `Page HTML may have changed; check source URL ${SOURCE_URL}.`
    )
  }

  const bodyRows = table.querySelectorAll('tbody tr')
  const rows = []
  for (const tr of bodyRows) {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 4) continue
    const teamName = cleanName(tds[0].text)
    if (!teamName) continue
    const teamAbbr = TEAM_NAME_TO_ABBR[teamName]
    if (!teamAbbr) {
      // Unknown team name — keep the row so the caller can warn, but
      // mark abbr null so it gets reported in stats.errors.
      rows.push({ teamName, teamAbbr: null })
      continue
    }
    rows.push({
      teamName,
      teamAbbr,
      hc: cleanName(tds[1]?.text),
      oc: cleanName(tds[2]?.text),
      dc: cleanName(tds[3]?.text),
      stc: cleanName(tds[4]?.text),
      offScheme: cleanName(tds[5]?.text),
      defScheme: cleanName(tds[6]?.text),
    })
  }
  return rows
}

/**
 * Daily/weekly sync: scrape one page, upsert NflCoachingStaff rows for
 * all 32 teams (HC/OC/DC) under {season}. Single HTTP request total —
 * no per-team loop, no polite-delay sleeps.
 *
 * @param {Object} [opts]
 * @param {PrismaClient} [opts.db]
 * @param {number} [opts.season] - Target season. Default 2026.
 * @returns {Promise<Object>} stats
 */
async function syncCoachingStaff({ db = prisma, season = 2026 } = {}) {
  const startedAt = Date.now()
  const stats = {
    teamsAttempted: 0,
    teamsSucceeded: 0,
    rowsUpserted: 0,
    rolesNotFound: [],
    errors: [],
  }

  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map((t) => [t.abbreviation, t.id]))
  console.log(
    `[prep coaching-sync] starting season=${season}, ${teams.length} teams in DB, source=${SOURCE_URL}`
  )

  // Existing rows for change detection — preserve previousTeamAbbr/
  // previousRole fields if a name change occurs (movement-inference
  // layer is responsible for populating those; we just don't clobber).
  const existingRows = await db.nflCoachingStaff.findMany({ where: { season } })
  const existingByKey = new Map()
  for (const row of existingRows) {
    existingByKey.set(`${row.teamId}::${row.role}`, row)
  }

  let scraped
  try {
    scraped = await fetchCoachingTable()
  } catch (e) {
    throw new Error(`[prep coaching-sync] fetch/parse failed: ${e.message}`)
  }
  console.log(
    `[prep coaching-sync] scraped ${scraped.length} rows from source`
  )

  for (const row of scraped) {
    stats.teamsAttempted++

    if (!row.teamAbbr) {
      stats.errors.push({
        team: row.teamName,
        error: 'no NflTeam abbreviation mapping for source team name',
      })
      continue
    }

    const teamId = teamByAbbr[row.teamAbbr]
    if (!teamId) {
      stats.errors.push({
        team: row.teamAbbr,
        error: `no NflTeam row in DB for abbreviation ${row.teamAbbr}`,
      })
      continue
    }

    try {
      for (const [role, name] of [
        ['HC', row.hc],
        ['OC', row.oc],
        ['DC', row.dc],
      ]) {
        if (!name) {
          stats.rolesNotFound.push(`${row.teamAbbr}/${role}`)
          continue
        }

        const existing = existingByKey.get(`${teamId}::${role}`)
        const isChange = existing && existing.name !== name

        await db.nflCoachingStaff.upsert({
          where: {
            teamId_season_role: { teamId, season, role },
          },
          create: {
            teamId,
            season,
            role,
            name,
            previousTeamAbbr: null,
            previousRole: null,
          },
          update: isChange
            ? {
                name,
                // Preserve any movement fields a downstream inference
                // layer has already populated; do not clobber them.
                previousTeamAbbr: existing.previousTeamAbbr ?? null,
                previousRole: existing.previousRole ?? null,
              }
            : { name },
        })
        stats.rowsUpserted++
      }
      stats.teamsSucceeded++
      console.log(
        `[prep coaching-sync] ${row.teamAbbr}: HC=${row.hc} OC=${row.oc} DC=${row.dc}`
      )
    } catch (e) {
      console.error(
        `[prep coaching-sync] ${row.teamAbbr} upsert failed:`,
        e.message
      )
      stats.errors.push({ team: row.teamAbbr, error: e.message })
    }
  }

  // Fail-loud: expect 96 rows (32 teams × HC/OC/DC). Allow some slack
  // for teams that legitimately have an unannounced coordinator at the
  // moment, but throw if we lose meaningful structure (<80 = 83%).
  if (stats.rowsUpserted < 80) {
    throw new Error(
      `[prep coaching-sync] FAILED: only ${stats.rowsUpserted}/96 rows upserted. ` +
        `Source HTML may have changed; check selectors and URL ${SOURCE_URL}.`
    )
  }

  stats.durationMs = Date.now() - startedAt
  console.log(
    `[prep coaching-sync] done in ${(stats.durationMs / 1000).toFixed(1)}s: ` +
      `${stats.teamsSucceeded}/${stats.teamsAttempted} teams, ${stats.rowsUpserted} rows, ` +
      `${stats.rolesNotFound.length} roles not found, ${stats.errors.length} team errors`
  )
  return stats
}

module.exports = {
  syncCoachingStaff,
  fetchCoachingTable,
}
