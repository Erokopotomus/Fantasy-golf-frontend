const { registerExtractor } = require('../extractor')
const { getTransactionsForUser } = require('../lib/transactionParser')
const { mean, stdDev } = require('../lib/stats')

/**
 * faab_front_load_pct
 *
 * Intrinsic timing pattern: of the FAAB the user spent in a given season,
 * what fraction landed in the FIRST 4 WEEKS of their season activity? High
 * values flag managers who blow their budget early chasing breakouts; low
 * values flag back-loaders who hoard for late-season streaming and injuries.
 *
 * Per season:
 *   userClaims     = waiver-type txns w/ status='complete', isUserInvolved,
 *                    faabAmount > 0
 *   activityStart  = min(timestamp) across user's claims this season
 *   frontWindow    = [activityStart, activityStart + 28 days]
 *   frontLoadSpend = sum of faabAmount for claims in frontWindow
 *   totalSpend     = sum of all faabAmount for the season
 *   frontLoadPct   = frontLoadSpend / totalSpend
 *
 * Why 28 days (≈4 weeks) anchored to user's first claim rather than the
 * literal first 4 calendar weeks of the season: the parser doesn't reliably
 * resolve week numbers across platforms (Yahoo's add/drop rows have no week
 * field), and not every manager engages on Sleeper waivers from week 1. The
 * relative-to-first-claim window is platform-agnostic and a reasonable proxy
 * for "early in their season activity."
 *
 * Aggregated:
 *   avgFrontLoadPct = mean of per-season ratios
 *   sampleSize      = number of seasons where totalSpend > 0
 *   consistencyPct  = 1 / (1 + stdDev(perSeasonRatios)) gated to N >= 2
 *                     (0.5 sentinel else — same pattern as MI-7)
 *   effectSize      = |avgFrontLoadPct - 0.33| / 0.20
 *     Baseline 0.33 = even spread across a 12-week season puts ~33% of FAAB
 *     in the first 4 weeks (4/12 ≈ 0.33). 0.20 normalizing band means
 *     a value >= 0.53 (front-loader, ~1σ above even) or <= 0.13 (back-
 *     loader, ~1σ below even) yields effectSize >= 1.0 (HIGH).
 *
 * Returns null if no seasons had FAAB spend at all.
 */
async function faabFrontLoadPct(userId, db) {
  const seasons = await getTransactionsForUser(userId, db)
  if (seasons.length === 0) return null

  const perSeason = []
  const sourceImportIds = new Set()
  const WINDOW_MS = 28 * 24 * 60 * 60 * 1000 // 28 days

  for (const season of seasons) {
    // User's successful FAAB claims this season.
    const userFaabClaims = season.transactions.filter(
      (t) =>
        t.type === 'waiver' &&
        t.status === 'complete' &&
        t.isUserInvolved &&
        t.faabAmount != null &&
        Number.isFinite(t.faabAmount) &&
        t.faabAmount > 0 &&
        t.timestamp instanceof Date
    )
    if (userFaabClaims.length === 0) continue

    // Earliest claim establishes the "front 4 weeks" reference point.
    let activityStartMs = Infinity
    for (const c of userFaabClaims) {
      const ms = c.timestamp.getTime()
      if (Number.isFinite(ms) && ms < activityStartMs) activityStartMs = ms
    }
    if (!Number.isFinite(activityStartMs)) continue
    const windowEnd = activityStartMs + WINDOW_MS

    let frontLoadSpend = 0
    let totalSpend = 0
    for (const c of userFaabClaims) {
      const ms = c.timestamp.getTime()
      totalSpend += c.faabAmount
      if (ms >= activityStartMs && ms < windowEnd) {
        frontLoadSpend += c.faabAmount
      }
    }
    if (totalSpend <= 0) continue

    const frontLoadPct = frontLoadSpend / totalSpend
    if (!Number.isFinite(frontLoadPct)) continue

    perSeason.push({
      leagueId: season.leagueId,
      seasonYear: season.seasonYear,
      platform: season.platform,
      claimCount: userFaabClaims.length,
      frontLoadSpend,
      totalSpend,
      frontLoadPct: Math.round(frontLoadPct * 1000) / 1000,
      isLowVolume: userFaabClaims.length < 3, // flag, don't filter — MI-16 will tune thresholds
    })
    if (season.importId) sourceImportIds.add(season.importId)
  }

  if (perSeason.length === 0) return null

  const ratios = perSeason.map((s) => s.frontLoadPct)
  const totalSpends = perSeason.map((s) => s.totalSpend)
  const avgFrontLoadPct = mean(ratios)
  const avgSeasonSpend = mean(totalSpends)
  // N<2 stdDev=0 → 1/(1+0)=1.0 falsely "perfectly consistent." Use 0.5
  // neutral sentinel for single-season samples. Same pattern as MI-7.
  const consistencyPct =
    perSeason.length < 2 ? 0.5 : 1 / (1 + stdDev(ratios))
  // Baseline 0.33 (even-spread in 12-wk season); 0.20 band → 1σ at 0.53/0.13.
  const effectSize = Math.abs(avgFrontLoadPct - 0.33) / 0.2

  if (!Number.isFinite(avgFrontLoadPct) || !Number.isFinite(effectSize))
    return null

  return {
    value: {
      avgFrontLoadPct: Math.round(avgFrontLoadPct * 1000) / 1000,
      totalSeasonsWithSpend: perSeason.length,
      avgSeasonSpend: Math.round(avgSeasonSpend * 100) / 100,
    },
    sampleSize: perSeason.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      baseline:
        'even-spread ≈ 33% in first 4 weeks of 12-week season; window anchored to user\'s first claim of the season (28 days)',
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * top_bid_rate
 *
 * League-relative competition signal: of contested waivers the user bid on,
 * how often did they have the winning bid? Contested = same player adds on
 * the same waiver day from multiple teams. The user "won" the contest if
 * their claim status is 'complete'; they "lost" if status is 'failed'.
 *
 * IMPORTANT DATA LIMITATION (verified May 2026):
 * The Sleeper importer filters out non-complete transactions before
 * persisting (sleeperImport.js line 118: `if (txn.status !== 'complete')
 * continue`). 0 of 4,680 persisted Sleeper waiver rows in Eric's DB have
 * status='failed'. Yahoo doesn't expose competing bids at all. ESPN/Fantrax/
 * MFL importers don't import transactions.
 *
 * Result: no contested-waiver evidence is currently extractable from
 * persisted data. This extractor returns null for every user until the
 * Sleeper importer is updated to persist failed waiver attempts. We keep
 * the implementation in place so that fix immediately activates this signal
 * (no second-pass code change needed) — but for now `top_bid_rate` is
 * honestly null, not silently fabricated.
 *
 * Detection (when failed claims ARE persisted):
 *   - Only Sleeper transactions are considered (cohort visibility needed).
 *   - Group every waiver transaction (not just user's) by:
 *       (firstPlayerAdded, dayBucket = floor(timestamp_ms / 86_400_000))
 *     The dayBucket approximation treats each calendar day as one waiver
 *     round — Sleeper waivers typically run nightly so same-day claims on
 *     the same player are nearly always the same round.
 *   - A group is "contested" if it has 2+ waiver rows.
 *   - If user has a row in a contested group:
 *       status='complete' → user won (top bid)
 *       status='failed'   → user lost (outbid)
 *
 * Math:
 *   topBidRate     = wins / contestedClaims
 *   sampleSize     = contestedClaims (uncontested don't contribute signal)
 *   consistencyPct = topBidRate (rate IS the consistency — same as MI-4
 *                    pickQuality), gated to sampleSize >= 2 (0.5 else)
 *   effectSize     = |topBidRate - 0.5| / 0.5
 *     Baseline 0.5 = a 2-way contest is 50/50 by chance. 0.65+ = bids high.
 *     0.35- = bids low.
 *
 * Returns null if no contested claims across all seasons (the typical case
 * given the current importer state — see limitation above).
 */
async function topBidRate(userId, db) {
  const seasons = await getTransactionsForUser(userId, db)
  if (seasons.length === 0) return null

  const sourceImportIds = new Set()
  const platformsUsed = new Set()
  const perSeason = []
  let totalContested = 0
  let totalWins = 0
  let totalUserClaims = 0

  for (const season of seasons) {
    // Need cohort visibility — only Sleeper currently exposes per-team waiver
    // rows. Yahoo trade attribution is lossy; ESPN/Fantrax/MFL don't import
    // transactions at all. Skip non-Sleeper to avoid false-positive contests.
    if (season.platform !== 'sleeper') continue
    platformsUsed.add(season.platform)

    // ALL waiver txns this season, not just user's — needed to detect
    // contests. Then we'll filter to ones the user participated in.
    const allWaivers = season.transactions.filter(
      (t) => t.type === 'waiver' && t.timestamp instanceof Date
    )
    if (allWaivers.length === 0) continue

    // Group by (firstPlayerAdded, dayBucket). Sleeper waivers usually run
    // nightly so same-day same-player claims are effectively the same round.
    const groups = new Map()
    for (const t of allWaivers) {
      const playerId = t.adds.length > 0 ? t.adds[0].playerId : null
      if (!playerId) continue
      const ms = t.timestamp.getTime()
      if (!Number.isFinite(ms)) continue
      // Sleeper waiver settlement timestamps cluster within a single run, so UTC
      // day bucketing groups same-round bids correctly in the common case. If
      // non-Sleeper waiver data becomes available, revisit (may need 36-48h windows).
      const dayBucket = Math.floor(ms / 86_400_000)
      const key = `${playerId}::${dayBucket}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(t)
    }

    // Count user's claims this season (for context in value object).
    const userWaiverCount = allWaivers.filter((t) => t.isUserInvolved).length
    totalUserClaims += userWaiverCount

    let seasonContests = 0
    let seasonWins = 0
    const sampleContests = []

    for (const [key, txns] of groups) {
      if (txns.length < 2) continue
      // Did user participate?
      const userRows = txns.filter((t) => t.isUserInvolved)
      if (userRows.length === 0) continue
      // If the user has multiple rows in the same contest, count just once.
      // A winning row (complete) takes precedence over a failed one (the
      // user did ultimately win that contest).
      const userWon = userRows.some((t) => t.status === 'complete')
      seasonContests += 1
      if (userWon) seasonWins += 1

      // Up to 3 sample contests per season for rawEvidence (avoid bloating
      // the JSONB column).
      if (sampleContests.length < 3) {
        const [playerId, dayBucket] = key.split('::')
        const userBid =
          userRows.find((t) => t.status === 'complete')?.faabAmount ??
          userRows[0]?.faabAmount ??
          null
        const opponentBids = txns
          .filter((t) => !t.isUserInvolved)
          .map((t) => t.faabAmount)
          .filter((v) => v != null)
        sampleContests.push({
          playerAdded: playerId,
          dayBucket: Number(dayBucket),
          userBid,
          opponentBids,
          outcome: userWon ? 'win' : 'loss',
        })
      }
    }

    if (seasonContests === 0) continue

    perSeason.push({
      leagueId: season.leagueId,
      seasonYear: season.seasonYear,
      platform: season.platform,
      contests: seasonContests,
      wins: seasonWins,
      sampleContests,
    })
    totalContested += seasonContests
    totalWins += seasonWins
    if (season.importId) sourceImportIds.add(season.importId)
  }

  if (totalContested === 0) {
    // Honest null — no contested claims because failed claims aren't
    // currently persisted by any importer (see limitation above).
    return null
  }

  const rate = totalWins / totalContested
  if (!Number.isFinite(rate)) return null

  // Rate IS the consistency (same pattern as MI-4 pick_reach_rate). Gate
  // to N >= 2 contested claims; below that, neutral 0.5 sentinel.
  const consistencyPct = totalContested < 2 ? 0.5 : rate
  // Baseline 0.5 (50/50 by chance); 0.5 band → rate of 1.0 or 0.0 = effect 1.0.
  const effectSize = Math.abs(rate - 0.5) / 0.5

  return {
    value: {
      topBidRate: Math.round(rate * 1000) / 1000,
      wins: totalWins,
      contestedClaims: totalContested,
      totalUserClaims,
    },
    sampleSize: totalContested,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      platformsUsed: [...platformsUsed],
      coverageNote:
        'top_bid_rate requires failed waiver claims to be persisted. Only Sleeper currently exposes per-team waiver rows; Sleeper importer (sleeperImport.js:118) filters status!=complete before persisting, so contested-bid detection currently has no input. Returns null until importer change.',
      groupingNote:
        'contests grouped by (firstPlayerAdded, dayBucket=floor(timestampMs/86400000)) — one calendar day = one waiver round, approximating Sleeper\'s nightly waiver run',
    },
    sourceImportIds: [...sourceImportIds],
  }
}

registerExtractor('faab_front_load_pct', faabFrontLoadPct)
registerExtractor('top_bid_rate', topBidRate)

module.exports = {}
