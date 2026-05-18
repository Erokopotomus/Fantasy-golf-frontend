const prisma = require('../../../lib/prisma')

/**
 * Pull all draft picks made by a user across their imported leagues.
 * Returns normalized pick objects ready for classification.
 *
 * The mapping from a HistoricalSeason → user is via `ownerUserId` (set by the
 * Vault claim wizard). Within that season's draftData JSON, we keep only picks
 * whose `ownerName` matches the season's stored `ownerName`, since one user
 * may own one of N teams in a given season.
 *
 * @returns {Promise<Array>} picks: { round, pickNum, rawPlayerId, playerName,
 *   position, isAuction, amount, leagueId, seasonYear, importId, ownerName }
 */
async function getDraftPicksForUser(userId, db = prisma) {
  const seasons = await db.historicalSeason.findMany({
    where: {
      ownerUserId: userId,
      draftData: { not: null },
    },
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      importId: true,
      draftData: true,
      ownerName: true,
    },
  })

  const picks = []
  for (const s of seasons) {
    const data = s.draftData
    if (!data || !Array.isArray(data.picks)) continue
    // Filter to picks matching this season's ownerName (which has been mapped
    // to userId via vault claim).
    const userPicks = data.picks.filter(
      (p) => p.ownerName && s.ownerName && p.ownerName === s.ownerName
    )
    for (const p of userPicks) {
      picks.push({
        round: p.round,
        pickNum: p.pick,
        rawPlayerId: p.playerId, // platform-specific ID string
        playerName: p.playerName,
        position: p.position,
        isAuction: data.type === 'auction',
        // Different importers persist the auction price under different keys.
        // Yahoo stores it as `cost`; Sleeper/ESPN/etc. as `amount`. Normalize
        // here so downstream extractors get a single canonical field.
        amount: p.amount != null ? p.amount : p.cost,
        leagueId: s.leagueId,
        seasonYear: s.seasonYear,
        importId: s.importId,
        ownerName: p.ownerName,
      })
    }
  }
  return picks
}

/**
 * Resolve a raw platform player ID to a canonical Clutch Player record.
 * Tries sleeperId, externalId, yahooId, espnId, mflId, fantraxId in order.
 * Returns null if no match.
 *
 * Defaults to selecting `id` only — pickQuality already has playerName/position
 * captured on the draft pick itself. Downstream extractors that need richer
 * Player data can pass a custom `select` (e.g. `{ id: true, name: true }`)
 * without an extra round-trip.
 */
async function resolvePlayer(rawPlayerId, db = prisma, select = { id: true }) {
  if (!rawPlayerId) return null
  const player = await db.player.findFirst({
    where: {
      OR: [
        { sleeperId: rawPlayerId },
        { externalId: rawPlayerId },
        { yahooId: rawPlayerId },
        { espnId: rawPlayerId },
        { mflId: rawPlayerId },
        { fantraxId: rawPlayerId },
      ],
    },
    select,
  })
  return player
}

/**
 * Look up ADP for a player in a specific season year.
 * Returns the ADP value (number) or null if no ADPEntry exists.
 */
async function lookupAdp(clutchPlayerId, seasonYear, db = prisma) {
  if (!clutchPlayerId) return null
  // Find the Season row for this year (NFL sport — Manager Intelligence is
  // NFL-focused for v1).
  const season = await db.season.findFirst({
    where: {
      year: seasonYear,
      sport: { slug: 'nfl' },
    },
    select: { id: true },
  })
  if (!season) return null
  const adpEntry = await db.aDPEntry.findUnique({
    where: {
      playerId_seasonId: { playerId: clutchPlayerId, seasonId: season.id },
    },
    select: { adp: true },
  })
  return adpEntry?.adp ?? null
}

/**
 * Bulk-resolve all picks in two queries (one Player.findMany, one
 * ADPEntry.findMany) to avoid the 3-queries-per-pick N+1 inside
 * pickQuality. Returns a Map keyed by rawPlayerId.
 *
 *   rawPlayerId -> {
 *     clutchPlayerId: string | null,
 *     adpBySeasonYear: Map<number, number>   // year -> adp value
 *   }
 *
 * Picks with no rawPlayerId are skipped (still classifiable as null upstream).
 * Auction picks are skipped (handled by MI-6, not pickQuality).
 *
 * Perf: 20-season Eric dataset goes from ~600 serial queries to 2 batches.
 */
async function batchResolvePicks(picks, db = prisma) {
  const map = new Map()
  if (!picks || picks.length === 0) return map

  // 1. Collect unique raw player IDs (skip auction picks; pickQuality won't
  //    classify them and we don't want them inflating the OR clause).
  const rawIds = new Set()
  const seasonYears = new Set()
  for (const p of picks) {
    if (p.isAuction) continue
    if (!p.rawPlayerId) continue
    rawIds.add(p.rawPlayerId)
    if (p.seasonYear) seasonYears.add(p.seasonYear)
  }
  if (rawIds.size === 0) return map

  // 2. ONE player lookup across all platform-specific ID fields.
  const idList = Array.from(rawIds)
  const players = await db.player.findMany({
    where: {
      OR: [
        { sleeperId: { in: idList } },
        { externalId: { in: idList } },
        { yahooId: { in: idList } },
        { espnId: { in: idList } },
        { mflId: { in: idList } },
        { fantraxId: { in: idList } },
      ],
    },
    select: {
      id: true,
      sleeperId: true,
      externalId: true,
      yahooId: true,
      espnId: true,
      mflId: true,
      fantraxId: true,
    },
  })

  // Build rawPlayerId -> clutchPlayerId. A given Player row may match via
  // multiple ID fields; we register each match.
  const rawToClutch = new Map()
  for (const pl of players) {
    for (const field of [
      pl.sleeperId,
      pl.externalId,
      pl.yahooId,
      pl.espnId,
      pl.mflId,
      pl.fantraxId,
    ]) {
      if (field && rawIds.has(field) && !rawToClutch.has(field)) {
        rawToClutch.set(field, pl.id)
      }
    }
  }

  // 3. ONE season lookup, then ONE ADPEntry batch covering every
  //    (clutchPlayerId × seasonId) pair.
  const clutchIds = Array.from(new Set(rawToClutch.values()))
  const years = Array.from(seasonYears)
  let adpRows = []
  let yearToSeasonId = new Map()
  if (clutchIds.length > 0 && years.length > 0) {
    const seasons = await db.season.findMany({
      where: { year: { in: years }, sport: { slug: 'nfl' } },
      select: { id: true, year: true },
    })
    for (const s of seasons) yearToSeasonId.set(s.year, s.id)
    const seasonIds = seasons.map((s) => s.id)
    if (seasonIds.length > 0) {
      adpRows = await db.aDPEntry.findMany({
        where: {
          playerId: { in: clutchIds },
          seasonId: { in: seasonIds },
        },
        select: { playerId: true, seasonId: true, adp: true },
      })
    }
  }

  // Build clutchPlayerId -> Map<year, adp>
  const seasonIdToYear = new Map()
  for (const [year, sid] of yearToSeasonId.entries()) seasonIdToYear.set(sid, year)
  const clutchToAdp = new Map()
  for (const row of adpRows) {
    const year = seasonIdToYear.get(row.seasonId)
    if (year == null) continue
    if (!clutchToAdp.has(row.playerId)) clutchToAdp.set(row.playerId, new Map())
    clutchToAdp.get(row.playerId).set(year, row.adp)
  }

  // 4. Final map shape: rawPlayerId -> { clutchPlayerId, adpBySeasonYear }
  for (const rawId of rawIds) {
    const clutchId = rawToClutch.get(rawId) || null
    const adpBySeasonYear = clutchId ? clutchToAdp.get(clutchId) || new Map() : new Map()
    map.set(rawId, { clutchPlayerId: clutchId, adpBySeasonYear })
  }

  return map
}

/**
 * Classify one pick. Returns 'STEAL' | 'VALUE' | 'PAR' | 'REACH' | null
 * (unclassifiable). Match the forward decision-capture computation EXACTLY
 * for parity with `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` v3 line 148:
 *   adp - pick >= 10 → STEAL
 *   3..9 → VALUE
 *   -2..2 → PAR
 *   <= -3 → REACH
 *
 * If `prebuiltMap` is provided (from batchResolvePicks), skips the per-pick
 * DB queries and uses the map. Falls back to original 2-query path when
 * absent so other consumers don't break.
 */
async function classifyPick(pick, db = prisma, prebuiltMap = null) {
  if (pick.isAuction) return null // auction math handled in MI-6
  if (!pick.rawPlayerId) return null

  let clutchPlayerId = null
  let adp = null

  if (prebuiltMap) {
    const entry = prebuiltMap.get(pick.rawPlayerId)
    if (!entry || !entry.clutchPlayerId) return null
    clutchPlayerId = entry.clutchPlayerId
    adp = entry.adpBySeasonYear.get(pick.seasonYear) ?? null
  } else {
    const player = await resolvePlayer(pick.rawPlayerId, db)
    if (!player) return null
    clutchPlayerId = player.id
    adp = await lookupAdp(clutchPlayerId, pick.seasonYear, db)
  }
  if (adp == null) return null

  const delta = adp - pick.pickNum
  if (delta >= 10) return 'STEAL'
  if (delta >= 3) return 'VALUE'
  if (delta >= -2) return 'PAR'
  return 'REACH'
}

module.exports = {
  getDraftPicksForUser,
  resolvePlayer,
  lookupAdp,
  batchResolvePicks,
  classifyPick,
}
