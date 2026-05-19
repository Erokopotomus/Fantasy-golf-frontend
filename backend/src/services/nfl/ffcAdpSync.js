/**
 * Standalone FFC ADP sync — runs unconditionally to refresh ADP on the
 * existing NflPlayerProjection rows (source='sleeper_consensus') for the
 * current season across all three fantasy scoring formats.
 *
 * Distinct from the legacy fallback inside projectionSync.js, which only
 * fired when Sleeper ADP was fully empty. FFC publishes consensus ADP
 * aggregated across 8 fantasy platforms, free, no auth. Their API caps
 * each request at ~170 players — the natural 12-team-league draftable
 * pool. We only refresh ADP on rows the projection sync already wrote
 * (so points projections stay intact). If a matched player has no row
 * yet for this season+format, we skip — they'll get picked up next time
 * Sleeper sync runs.
 */

const prisma = require('../../lib/prisma')

const FFC_BASE = 'https://fantasyfootballcalculator.com/api/v1'
const FORMATS = ['ppr', 'half_ppr', 'standard']
const DEFAULT_SEASON = new Date().getUTCFullYear()
const DEFAULT_TEAMS = 12

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .replace(/['-]/g, '')
    .trim()
}

const TEAM_ALIASES = {
  JAX: 'JAC', JAC: 'JAC',
  WSH: 'WAS', WAS: 'WAS',
  LVR: 'LV', LV: 'LV', OAK: 'LV',
  LAR: 'LA', LA: 'LA',
}

function normalizeTeam(team) {
  if (!team) return ''
  const t = String(team).toUpperCase()
  return TEAM_ALIASES[t] || t
}

async function fetchFfcAdp(format, { teams = DEFAULT_TEAMS, year = DEFAULT_SEASON } = {}) {
  const ffcFormat = format === 'half_ppr' ? 'half-ppr' : format
  const url = `${FFC_BASE}/adp/${ffcFormat}?teams=${teams}&year=${year}`
  // FFC's API occasionally hangs on consecutive calls; cap individual fetches.
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(`FFC ADP API failed (${format}): ${res.status}`)
    const data = await res.json()
    return data?.players || []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Sync FFC ADP for a single scoring format. Returns { fetched, matched, updated, unmatchedSamples }.
 */
async function syncFormat(format, season = DEFAULT_SEASON, teams = DEFAULT_TEAMS) {
  const players = await fetchFfcAdp(format, { season, teams, year: season })

  // Build name+team and name-only lookups against active NFL Player records
  const dbPlayers = await prisma.player.findMany({
    where: { gsisId: { not: null }, nflPosition: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] } },
    select: { id: true, name: true, nflTeamAbbr: true, nflPosition: true },
  })
  const byNameTeam = new Map()
  const byName = new Map()
  const byDstTeam = new Map() // team abbr → DST player id (one per team)
  for (const p of dbPlayers) {
    const nk = normalizeName(p.name)
    const tk = normalizeTeam(p.nflTeamAbbr)
    byNameTeam.set(`${nk}|${tk}`, p.id)
    if (!byName.has(nk)) byName.set(nk, p.id)
    if (p.nflPosition === 'DST' && tk) byDstTeam.set(tk, p.id)
  }

  let matched = 0
  let updated = 0
  let noRow = 0
  const unmatched = []
  for (const fp of players) {
    if (!fp?.adp) continue
    const nk = normalizeName(fp.name)
    const tk = normalizeTeam(fp.team)
    // FFC sends DSTs as "Denver Defense" while we store them as
    // "Denver Broncos" — fall back to a team-abbr+position lookup.
    const isDefense = fp.position === 'DEF' || /\bdefense\b/i.test(fp.name || '')
    const playerId =
      byNameTeam.get(`${nk}|${tk}`) ??
      byName.get(nk) ??
      (isDefense ? byDstTeam.get(tk) : null)
    if (!playerId) {
      unmatched.push({ name: fp.name, team: fp.team, adp: fp.adp })
      continue
    }
    matched++

    // Refresh ADP on the existing sleeper_consensus row. Don't insert a new
    // row — FFC doesn't publish projectedPoints and we don't want to fragment
    // sources downstream. If Sleeper hasn't written a row for this player
    // yet, log + skip; next projection sync will pick them up.
    const result = await prisma.nflPlayerProjection.updateMany({
      where: {
        playerId,
        season,
        scoringType: format,
        source: 'sleeper_consensus',
      },
      data: { adp: fp.adp },
    })
    if (result.count > 0) {
      updated += result.count
    } else {
      noRow++
    }
  }

  return {
    format,
    fetched: players.length,
    matched,
    updated,
    noSleeperRow: noRow,
    unmatchedCount: unmatched.length,
    unmatchedSamples: unmatched.slice(0, 5),
  }
}

/**
 * Sync all 3 scoring formats. Logs progress per format.
 */
async function syncAllFormats({ season = DEFAULT_SEASON, teams = DEFAULT_TEAMS } = {}) {
  console.log(`[ffcAdpSync] === FFC ADP sync for ${season} (${teams} teams) ===`)
  const results = []
  for (const format of FORMATS) {
    try {
      const r = await syncFormat(format, season, teams)
      console.log(
        `[ffcAdpSync] ${format.padEnd(10)} fetched=${r.fetched} matched=${r.matched} updated=${r.updated} noSleeperRow=${r.noSleeperRow} unmatched=${r.unmatchedCount}`,
      )
      if (r.unmatchedSamples.length > 0) {
        console.log(`[ffcAdpSync]   first few unmatched:`, r.unmatchedSamples.map(s => `${s.name} (${s.team})`).join(', '))
      }
      results.push(r)
    } catch (e) {
      console.error(`[ffcAdpSync] ${format} failed: ${e.message}`)
      results.push({ format, error: e.message })
    }
  }
  return results
}

module.exports = { syncAllFormats, syncFormat, fetchFfcAdp, normalizeName, normalizeTeam }
