const prisma = require('../../../lib/prisma')
const { lookupAdp, resolvePlayer } = require('./draftPickParser')
const { fetchDedupedSeasons } = require('./seasonFetcher')
const { mean, stdDev } = require('./stats')

/**
 * ADP tier bucketing for within-draft, within-tier auction comparisons.
 * Buckets chosen to roughly match elite / mid-early / mid / late / deep tiers.
 *
 * Returns null when adp is null/undefined so callers can skip picks without
 * ADP coverage rather than mis-tiering them.
 */
function adpTier(adp) {
  if (adp == null) return null
  if (adp <= 12) return 'top-12'
  if (adp <= 24) return '13-24'
  if (adp <= 50) return '25-50'
  if (adp <= 100) return '51-100'
  return '101+'
}

/**
 * Fetch every auction draft the user participated in, with the full peer
 * cohort (all picks in the draft, not just the user's). One HistoricalSeason
 * row stores the entire draft in `draftData.picks[]`, regardless of which
 * manager owns the row — so we can read all picks from one row per
 * (leagueId, seasonYear) and identify the user's picks via ownerName match.
 *
 * To avoid double-walking the same draft when multiple HistoricalSeason rows
 * exist for it (one per manager-team after vault claim), we dedupe by
 * (leagueId, seasonYear) and only use rows where ownerUserId === userId so
 * we have the user's authoritative ownerName for that season.
 *
 * @returns {Promise<Array>} drafts, each:
 *   {
 *     leagueId, seasonYear, importId,
 *     userOwnerName,
 *     userPicks: [{round, pickNum, rawPlayerId, playerName, position, amount, ownerName}],
 *     allPicks: [{round, pickNum, rawPlayerId, playerName, position, amount, ownerName, isUserPick}],
 *     isAuction: true
 *   }
 */
async function getDraftsWithCohort(userId, db = prisma) {
  const seasons = await fetchDedupedSeasons(userId, {
    db,
    where: { draftData: { not: null } },
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      importId: true,
      draftData: true,
      ownerName: true,
    },
  })

  const drafts = []

  for (const s of seasons) {
    const data = s.draftData
    if (!data || !Array.isArray(data.picks)) continue
    if (data.type !== 'auction') continue

    const userOwnerName = s.ownerName
    const allPicks = data.picks.map((p) => ({
      round: p.round,
      pickNum: p.pick,
      rawPlayerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      amount: p.amount,
      ownerName: p.ownerName,
      isUserPick: !!(
        p.ownerName && userOwnerName && p.ownerName === userOwnerName
      ),
    }))
    const userPicks = allPicks.filter((p) => p.isUserPick)

    drafts.push({
      leagueId: s.leagueId,
      seasonYear: s.seasonYear,
      importId: s.importId,
      userOwnerName,
      userPicks,
      allPicks,
      isAuction: true,
    })
  }

  return drafts
}

/**
 * For a single draft, look up ADP for every pick and bucket into tiers.
 * Returns a map: tier => array of picks (with adp attached) for that tier
 * (regardless of owner). Picks without ADP coverage are dropped.
 *
 * Resolves each pick's clutch player + ADP serially-but-concurrently via
 * Promise.all. seasonYear is the draft's year (used to find the right
 * ADPEntry row).
 */
async function tierAllPicksInDraft(draft, db = prisma) {
  const seasonYear = draft.seasonYear
  // Resolve ADP for every pick in parallel.
  const picksWithAdp = await Promise.all(
    draft.allPicks.map(async (p) => {
      if (!p.rawPlayerId) return null
      const player = await resolvePlayer(p.rawPlayerId, db)
      if (!player) return null
      const adp = await lookupAdp(player.id, seasonYear, db)
      if (adp == null) return null
      const tier = adpTier(adp)
      if (!tier) return null
      return { ...p, adp, tier }
    })
  )

  const byTier = {
    'top-12': [],
    '13-24': [],
    '25-50': [],
    '51-100': [],
    '101+': [],
  }
  for (const p of picksWithAdp) {
    if (!p) continue
    // Auction-validity filter: amount > 0. Free picks (amount === 0) are
    // autopicks / leftover assignments — they distort price means.
    if (p.amount == null || p.amount <= 0) continue
    byTier[p.tier].push(p)
  }
  return byTier
}

module.exports = {
  adpTier,
  getDraftsWithCohort,
  tierAllPicksInDraft,
}
