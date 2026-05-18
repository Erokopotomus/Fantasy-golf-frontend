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
 * We select only `id` because pickQuality already has playerName/position
 * captured on the draft pick itself; downstream extractors that need richer
 * Player data can re-fetch with the desired select.
 */
async function resolvePlayer(rawPlayerId, db = prisma) {
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
    select: { id: true },
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
 * Classify one pick. Returns 'STEAL' | 'VALUE' | 'PAR' | 'REACH' | null
 * (unclassifiable). Match the forward decision-capture computation EXACTLY
 * for parity with `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` v3 line 148:
 *   adp - pick >= 10 → STEAL
 *   3..9 → VALUE
 *   -2..2 → PAR
 *   <= -3 → REACH
 */
async function classifyPick(pick, db = prisma) {
  if (pick.isAuction) return null // auction math handled in MI-6
  if (!pick.rawPlayerId) return null

  const player = await resolvePlayer(pick.rawPlayerId, db)
  if (!player) return null

  const adp = await lookupAdp(player.id, pick.seasonYear, db)
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
  classifyPick,
}
