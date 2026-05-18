const prisma = require('../../../lib/prisma')
const { fetchDedupedSeasons } = require('./seasonFetcher')

/**
 * Transaction parser for Manager Intelligence trade extractors.
 *
 * `HistoricalSeason.transactions` is a JSON blob whose shape varies by platform.
 * This parser normalizes per-platform into a unified per-season structure that
 * the trade extractors consume. Same dedupe-by-(leagueId, seasonYear) pattern
 * as MI-6's auctionParser.
 *
 * ─── Platform coverage notes (as observed in Eric's data, May 2026) ───
 *
 * SLEEPER (best coverage):
 *   - transactions array of objects with shape:
 *     { transactionId, type, status, week, timestamp, rosterIds, adds, drops,
 *       settings, draftPicks, creatorRosterId }
 *   - type ∈ {'trade', 'waiver', 'free_agent', 'commissioner'}
 *   - status === 'complete' (Sleeper importer already filters)
 *   - adds/drops are objects: { playerId: rosterId }
 *   - User attribution via roster_id lookup from draftData picks
 *   - rosterData.players present → endowment ratio computable
 *
 * YAHOO (lossy on trades):
 *   - transactions array of objects with shape:
 *     { transactionKey, type, timestamp, status, faabBid, tradeNote,
 *       playersAdded[], playersDropped[] }
 *   - type ∈ {'add', 'drop', 'add/drop', 'trade', 'commish'}
 *   - status ∈ {'successful', 'vetoed'} → normalize 'successful' → 'complete'
 *   - WARNING: yahoo trades (type === 'trade') come through with EMPTY
 *     playersAdded/playersDropped arrays. The raw Yahoo API DOES expose
 *     `trader_team_key` / `tradee_team_key` and per-player transaction_data
 *     with source/destination team_keys for trades, but the current importer
 *     only captures add/drop moveTypes (lines 509-511 of yahooImport.js drop
 *     transaction_data with type === 'trade'). Per-user trade counts are
 *     therefore not reliably extractable from persisted Yahoo data.
 *   - We DO have league-wide trade counts (length of trade subset).
 *   - rosterData is always empty {} for Yahoo (end-of-season roster not
 *     captured) → endowment ratio not computable.
 *   - User team_key is recoverable via draftData.picks where ownerName matches.
 *
 * ESPN / FANTRAX / MFL:
 *   - No transaction import wired (confirmed: grep for `transactions`/`txn`
 *     returns nothing in those importers). transactions JSON is always null
 *     on these platforms. Parser correctly skips.
 *
 * The extractors are designed to gracefully degrade — they emit a
 * `coverageNote` per season indicating which platforms contributed clean data
 * vs. which had to fall back to league-aggregate-only counts.
 */

/**
 * Normalize a transaction's type to one of the canonical buckets used by the
 * extractors. We collapse Yahoo 'add'/'drop'/'add/drop' into 'waiver' when a
 * FAAB bid is present, else 'free_agent'.
 */
function normalizeTxnType(rawType, faabBid) {
  if (!rawType) return 'other'
  const t = String(rawType).toLowerCase()
  if (t === 'trade') return 'trade'
  if (t === 'waiver') return 'waiver'
  if (t === 'free_agent') return 'free_agent'
  if (t === 'commissioner' || t === 'commish') return 'commish'
  // Yahoo's add/drop/add-drop is either a waiver (with faab bid) or a free-agent pickup.
  if (t === 'add' || t === 'drop' || t === 'add/drop') {
    return faabBid != null && faabBid > 0 ? 'waiver' : 'free_agent'
  }
  return 'other'
}

/**
 * Normalize per-platform status strings to 'complete' / 'failed' / 'pending'.
 */
function normalizeStatus(rawStatus) {
  if (!rawStatus) return 'pending'
  const s = String(rawStatus).toLowerCase()
  if (s === 'complete' || s === 'successful' || s === 'success') return 'complete'
  if (s === 'failed' || s === 'vetoed' || s === 'cancelled' || s === 'canceled')
    return 'failed'
  return 'pending'
}

/**
 * Parse a single Sleeper transaction blob into the unified shape.
 * `userRosterId` is the integer roster_id of the user's team in this season.
 */
function parseSleeperTxn(raw, userRosterId) {
  const type = normalizeTxnType(raw?.type, raw?.settings?.waiver_bid)
  const status = normalizeStatus(raw?.status)
  // Any time we Number() a value off the raw Sleeper payload we follow with
  // Number.isFinite — Sleeper occasionally leaves rosterIds null on certain
  // legacy transactions and NaN keys downstream would silently break the
  // perTeamMap / isUserInvolved checks in the trade extractor.
  const adds = []
  const drops = []
  if (raw?.adds && typeof raw.adds === 'object') {
    for (const [playerId, rosterId] of Object.entries(raw.adds)) {
      const r = Number(rosterId)
      if (!Number.isFinite(r)) continue
      adds.push({ playerId, rosterId: r })
    }
  }
  if (raw?.drops && typeof raw.drops === 'object') {
    for (const [playerId, rosterId] of Object.entries(raw.drops)) {
      const r = Number(rosterId)
      if (!Number.isFinite(r)) continue
      drops.push({ playerId, rosterId: r })
    }
  }
  const rosterIds = Array.isArray(raw?.rosterIds)
    ? raw.rosterIds.map(Number).filter(Number.isFinite)
    : []
  const teamsInvolved = rosterIds.map((r) => ({ rosterId: r, ownerName: null }))

  // User involvement: any add/drop/roster_id mentions user's roster_id.
  let isUserInvolved = false
  if (userRosterId != null) {
    if (rosterIds.includes(userRosterId)) isUserInvolved = true
    if (!isUserInvolved && adds.some((a) => a.rosterId === userRosterId))
      isUserInvolved = true
    if (!isUserInvolved && drops.some((d) => d.rosterId === userRosterId))
      isUserInvolved = true
  }

  return {
    type,
    status,
    timestamp: raw?.timestamp ? new Date(raw.timestamp) : null,
    teamsInvolved,
    adds,
    drops,
    faabAmount: raw?.settings?.waiver_bid ?? null,
    isUserInvolved,
  }
}

/**
 * Parse a single Yahoo transaction blob into the unified shape.
 * `userTeamKey` is the user's team_key string (e.g. "423.l.155785.t.5").
 * NOTE: Yahoo trades have empty playersAdded/playersDropped — we cannot
 * derive isUserInvolved for trade rows from persisted data alone.
 */
function parseYahooTxn(raw, userTeamKey) {
  const type = normalizeTxnType(raw?.type, raw?.faabBid)
  const status = normalizeStatus(raw?.status)

  const adds = []
  const drops = []
  const teamsInvolvedSet = new Set()

  for (const p of raw?.playersAdded || []) {
    if (p.playerKey) adds.push({ playerId: p.playerKey, rosterId: p.destTeamKey })
    if (p.destTeamKey) teamsInvolvedSet.add(p.destTeamKey)
    if (p.sourceTeamKey) teamsInvolvedSet.add(p.sourceTeamKey)
  }
  for (const p of raw?.playersDropped || []) {
    if (p.playerKey) drops.push({ playerId: p.playerKey, rosterId: p.sourceTeamKey })
    if (p.destTeamKey) teamsInvolvedSet.add(p.destTeamKey)
    if (p.sourceTeamKey) teamsInvolvedSet.add(p.sourceTeamKey)
  }

  const teamsInvolved = [...teamsInvolvedSet].map((tk) => ({
    rosterId: tk,
    ownerName: null,
  }))

  // For trades, Yahoo doesn't populate player arrays, so we can't tag user
  // involvement from the persisted payload. For waivers / free-agents / adds /
  // drops the user team_key DOES appear on the player movement records.
  let isUserInvolved = false
  if (userTeamKey) {
    if (adds.some((a) => a.rosterId === userTeamKey)) isUserInvolved = true
    if (!isUserInvolved && drops.some((d) => d.rosterId === userTeamKey))
      isUserInvolved = true
  }

  return {
    type,
    status,
    timestamp: raw?.timestamp ? new Date(raw.timestamp) : null,
    teamsInvolved,
    adds,
    drops,
    faabAmount: raw?.faabBid ?? null,
    isUserInvolved,
  }
}

/**
 * Detect platform from import.sourcePlatform first, then fall back to
 * heuristics on the transactions shape itself (in case importId is null).
 */
function detectPlatform(season) {
  const fromImport = season?.import?.sourcePlatform
  if (fromImport) return String(fromImport).toLowerCase()
  // Heuristic: Sleeper transactions have transactionId+rosterIds; Yahoo has
  // transactionKey + playersAdded/playersDropped.
  const sample = Array.isArray(season?.transactions)
    ? season.transactions[0]
    : null
  if (!sample) return 'unknown'
  if (sample.transactionKey || sample.playersAdded || sample.playersDropped)
    return 'yahoo'
  if (sample.transactionId || sample.rosterIds || sample.adds || sample.drops)
    return 'sleeper'
  return 'unknown'
}

/**
 * Extract user's team identifier for a season — the platform-specific
 * "rosterId" / "team_key" we use to identify the user's team in transactions.
 *   - Sleeper: roster_id (int). Look up from draftData.picks where ownerName
 *     === userOwnerName (each pick has rosterId).
 *   - Yahoo: team_key (string). Same lookup pattern (each pick has teamKey).
 * Returns null if not derivable.
 */
function extractUserRosterId(season, userOwnerName, platform) {
  if (!userOwnerName) return null
  const picks = season?.draftData?.picks
  if (!Array.isArray(picks)) return null
  for (const p of picks) {
    if (p.ownerName !== userOwnerName) continue
    if (platform === 'sleeper' && p.rosterId != null) {
      const r = Number(p.rosterId)
      if (Number.isFinite(r)) return r
      continue
    }
    if (platform === 'yahoo' && p.teamKey) return p.teamKey
  }
  return null
}

/**
 * Walk every HistoricalSeason for the user, dedupe by (leagueId, seasonYear),
 * normalize transactions per-platform. Returns one entry per unique season.
 *
 * @returns {Promise<Array<{
 *   leagueId: string,
 *   seasonYear: number,
 *   importId: string|null,
 *   platform: string,
 *   userOwnerName: string|null,
 *   userRosterId: number|string|null,
 *   transactions: Array,
 *   coverageNote: string|null,
 * }>>}
 */
async function getTransactionsForUser(userId, db = prisma) {
  const seasons = await fetchDedupedSeasons(userId, {
    db,
    where: { transactions: { not: null } },
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      importId: true,
      ownerName: true,
      transactions: true,
      draftData: true,
      rosterData: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  const out = []

  for (const s of seasons) {
    const rawTxns = Array.isArray(s.transactions) ? s.transactions : null
    if (!rawTxns || rawTxns.length === 0) continue

    const platform = detectPlatform(s)
    const userRosterId = extractUserRosterId(s, s.ownerName, platform)

    let parsed = []
    let coverageNote = null

    if (platform === 'sleeper') {
      parsed = rawTxns.map((raw) => parseSleeperTxn(raw, userRosterId))
    } else if (platform === 'yahoo') {
      parsed = rawTxns.map((raw) => parseYahooTxn(raw, userRosterId))
      coverageNote =
        'yahoo: trade rows have empty player arrays in persisted data; isUserInvolved=false for trade-type rows'
    } else {
      // espn / fantrax / mfl: no transaction parser wired in current importers
      coverageNote = `${platform}: no transaction parser; skipped`
      continue
    }

    out.push({
      leagueId: s.leagueId,
      seasonYear: s.seasonYear,
      importId: s.importId,
      platform,
      userOwnerName: s.ownerName,
      userRosterId,
      transactions: parsed,
      coverageNote,
    })
  }

  return out
}

/**
 * Helper for the endowment-ratio extractor: returns the user's end-of-season
 * roster (playerIds) for a single HistoricalSeason if known, else null. Same
 * dedupe pattern — caller already has the season picked.
 *
 * Sleeper: rosterData.players is the array.
 * Yahoo / others: rosterData is always {} → returns null.
 */
function getFinalRosterPlayerIds(season) {
  const rd = season?.rosterData
  if (!rd || typeof rd !== 'object') return null
  if (Array.isArray(rd.players) && rd.players.length > 0) return rd.players
  return null
}

/**
 * Sibling fetch: full season payload (including rosterData and draftData)
 * deduped by (leagueId, seasonYear). Used by the endowment extractor.
 */
async function getSeasonsForUser(userId, db = prisma) {
  return fetchDedupedSeasons(userId, {
    db,
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      importId: true,
      ownerName: true,
      transactions: true,
      draftData: true,
      rosterData: true,
      import: { select: { sourcePlatform: true } },
    },
  })
}

module.exports = {
  getTransactionsForUser,
  getSeasonsForUser,
  getFinalRosterPlayerIds,
  extractUserRosterId,
  detectPlatform,
  normalizeTxnType,
  normalizeStatus,
}
