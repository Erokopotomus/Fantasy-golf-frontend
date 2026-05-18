const { registerExtractor } = require('../extractor')
const {
  getDraftsWithCohort,
  tierAllPicksInDraft,
} = require('../lib/auctionParser')
const { mean, stdDev } = require('../lib/stats')

const TIER_ORDER = ['top-12', '13-24', '25-50', '51-100', '101+']
const MIN_COHORT_SIZE = 3 // require at least 3 peers in same draft+tier
const Z_THRESHOLD = 1.0

/**
 * For one user, walk every auction draft and every tier within that draft to
 * compute z-scores for the user's picks against the same-draft same-tier
 * cohort. Returns a paired list of { pick, zScore, tier } plus tier stats per
 * draft for evidence.
 *
 * Skips:
 *   - picks where tier has < MIN_COHORT_SIZE peers in the same draft
 *   - picks where the cohort's price stddev is 0 (would divide by zero)
 *   - the user's free / autopick picks (amount <= 0) — filtered by tierer
 */
async function classifyDraftsForUser(userId, db) {
  const drafts = await getDraftsWithCohort(userId, db)
  if (drafts.length === 0) {
    return {
      drafts: [],
      paired: [],
      tierStatsByDraft: [],
      totalAuctionPicks: 0,
      classifiableTotal: 0,
    }
  }

  // Count user's auction picks (filtered to amount > 0) across all drafts.
  // This is the denominator for `totalAuctionPicks` in the value payload.
  let totalAuctionPicks = 0
  for (const d of drafts) {
    for (const p of d.userPicks) {
      if (p.amount != null && p.amount > 0) totalAuctionPicks += 1
    }
  }

  const paired = []
  const tierStatsByDraft = []

  for (const draft of drafts) {
    const byTier = await tierAllPicksInDraft(draft, db)

    // Per-tier means/stddevs for evidence.
    const tierStats = {}
    for (const tier of TIER_ORDER) {
      const cohort = byTier[tier]
      if (cohort.length === 0) {
        tierStats[tier] = { meanPrice: null, stdDev: null, count: 0 }
        continue
      }
      const prices = cohort.map((p) => p.amount)
      tierStats[tier] = {
        meanPrice: Math.round(mean(prices) * 100) / 100,
        stdDev: Math.round(stdDev(prices) * 100) / 100,
        count: cohort.length,
      }
    }
    tierStatsByDraft.push({
      leagueId: draft.leagueId,
      seasonYear: draft.seasonYear,
      tierStats,
    })

    // For each user pick in this draft, compute its z-score against the
    // same-draft+same-tier cohort.
    for (const tier of TIER_ORDER) {
      const cohort = byTier[tier]
      if (cohort.length < MIN_COHORT_SIZE) continue

      const prices = cohort.map((p) => p.amount)
      const tMean = mean(prices)
      const tStd = stdDev(prices)
      if (tStd === 0 || !Number.isFinite(tStd)) continue // can't z-score

      const userInTier = cohort.filter((p) => p.isUserPick)
      for (const up of userInTier) {
        const zScore = (up.amount - tMean) / tStd
        if (!Number.isFinite(zScore)) continue
        paired.push({
          pick: {
            pickNum: up.pickNum,
            playerName: up.playerName,
            position: up.position,
            amount: up.amount,
            tier,
            leagueId: draft.leagueId,
            seasonYear: draft.seasonYear,
            importId: draft.importId,
          },
          zScore,
        })
      }
    }
  }

  return {
    drafts,
    paired,
    tierStatsByDraft,
    totalAuctionPicks,
    classifiableTotal: paired.length,
  }
}

/**
 * Build a "z-score above/below threshold rate" extractor.
 *
 * direction: 'over' (z >= +Z_THRESHOLD) or 'under' (z <= -Z_THRESHOLD).
 *
 * effectSize math:
 *   Under a standard normal, ~16% of observations fall >1σ above the mean
 *   (one-tailed normal tail probability ≈ 0.1587). So a Bernoulli with
 *   p=0.16 has stddev = sqrt(0.16 * 0.84) ≈ 0.367. We normalize the
 *   observed rate's deviation from the 0.16 baseline by 0.37 — meaning a
 *   manager who overpays at 53%-of-picks gets effectSize ≈ 1.0 (HIGH).
 *   The lower tail (bargain rate) uses the same 0.16 / 0.37 (mirror).
 */
function buildRateExtractor(direction) {
  const isOver = direction === 'over'
  return async function (userId, db) {
    const {
      drafts,
      paired,
      tierStatsByDraft,
      totalAuctionPicks,
      classifiableTotal,
    } = await classifyDraftsForUser(userId, db)

    if (drafts.length === 0) return null
    if (classifiableTotal === 0) return null

    const matches = paired.filter((c) =>
      isOver ? c.zScore >= Z_THRESHOLD : c.zScore <= -Z_THRESHOLD
    )
    const rate = matches.length / classifiableTotal

    // Bernoulli(0.16) stddev ≈ 0.367 — see header comment for derivation.
    const effectSize = Math.abs(rate - 0.16) / 0.37

    // Sample: top 20 by |z| in the target direction, sorted away from zero.
    const sorted = isOver
      ? [...matches].sort((a, b) => b.zScore - a.zScore)
      : [...matches].sort((a, b) => a.zScore - b.zScore)
    const sample = sorted.slice(0, 20).map((c) => ({
      pickNum: c.pick.pickNum,
      playerName: c.pick.playerName,
      position: c.pick.position,
      amount: c.pick.amount,
      zScore: Math.round(c.zScore * 100) / 100,
      tier: c.pick.tier,
      leagueId: c.pick.leagueId,
      seasonYear: c.pick.seasonYear,
    }))

    // Tier evidence: merge per-draft tier stats into a flat summary keyed by tier.
    // For each tier, summarize total cohort count across drafts plus the
    // average mean/stddev (weighted by per-draft cohort size).
    // Display-purposes weighted average of per-draft stddevs. Not a pooled stddev
    // (which would combine variances). Used in rawEvidence only, not in any downstream math.
    const tiers = {}
    for (const t of TIER_ORDER) {
      let totalCount = 0
      let weightedMeanSum = 0
      let weightedStdSum = 0
      for (const d of tierStatsByDraft) {
        const s = d.tierStats[t]
        if (!s || !s.count) continue
        totalCount += s.count
        weightedMeanSum += s.meanPrice * s.count
        weightedStdSum += s.stdDev * s.count
      }
      tiers[t] =
        totalCount > 0
          ? {
              meanPrice: Math.round((weightedMeanSum / totalCount) * 100) / 100,
              stdDev: Math.round((weightedStdSum / totalCount) * 100) / 100,
              count: totalCount,
            }
          : { meanPrice: null, stdDev: null, count: 0 }
    }

    const sourceImportIds = [
      ...new Set(paired.map((c) => c.pick.importId).filter(Boolean)),
    ]

    return {
      value: {
        rate,
        count: matches.length,
        classifiableTotal,
        totalAuctionPicks,
      },
      sampleSize: classifiableTotal,
      consistencyPct: rate, // for rate-based characteristics, rate IS the consistency value
      effectSize,
      rawEvidence: {
        adpSource: 'adp_entry_point_in_time',
        cohortRule: `within-draft, within-tier z-score (z ${isOver ? '>=' : '<='} ${isOver ? '+' : '-'}${Z_THRESHOLD})`,
        minCohortSize: MIN_COHORT_SIZE,
        tiers,
        perDraftTierStats: tierStatsByDraft,
        sample,
      },
      sourceImportIds,
    }
  }
}

/**
 * auction_spend_concentration
 *
 * Pure user-only measure (no peer-cohort z-scoring needed): how does the user
 * distribute their own auction budget across their own roster slots in a given
 * draft? Averaged across drafts.
 *
 *   top3Pct = sum(top-3 prices) / sum(all prices) — per draft
 *   top5Pct = sum(top-5 prices) / sum(all prices) — per draft
 *   coefOfVariation = stddev(prices) / mean(prices) — per draft
 *
 * effectSize:
 *   Baseline assumption: a "balanced" auction strategy lands ~50% of budget
 *   in the top-3 picks (typical for moderate stars-and-scrubs / balanced
 *   roster construction). A 0.15 normalizing band means a top3Pct of 0.65
 *   (stars-and-scrubs extreme) or 0.35 (flat / no-aces) yields
 *   effectSize ≈ 1.0 (HIGH). This is calibrated to standard auction
 *   strategy literature, not a Bernoulli baseline.
 *
 * consistencyPct:
 *   1 / (1 + stdDevOfTop3PctAcrossDrafts). A user with top3Pct of 0.60 every
 *   year (stddev = 0) gets consistency = 1.0; a user who swings between 0.30
 *   and 0.70 (stddev ≈ 0.2) gets ~0.83.
 */
async function auctionSpendConcentration(userId, db) {
  const drafts = await getDraftsWithCohort(userId, db)
  if (drafts.length === 0) return null

  const perDraft = []
  const sourceImportIds = new Set()

  for (const d of drafts) {
    // User picks with amount > 0 (drop autopicks / freebies).
    const myPicks = d.userPicks.filter(
      (p) => p.amount != null && p.amount > 0
    )
    if (myPicks.length === 0) continue

    const sorted = [...myPicks].sort((a, b) => b.amount - a.amount)
    const totalSpent = sorted.reduce((a, p) => a + p.amount, 0)
    if (totalSpent <= 0) continue

    const top3Sum = sorted.slice(0, 3).reduce((a, p) => a + p.amount, 0)
    const top5Sum = sorted.slice(0, 5).reduce((a, p) => a + p.amount, 0)
    const top3Pct = top3Sum / totalSpent
    const top5Pct = top5Sum / totalSpent

    const prices = myPicks.map((p) => p.amount)
    const m = mean(prices)
    const s = stdDev(prices)
    const coefOfVariation = m > 0 ? s / m : 0

    perDraft.push({
      leagueId: d.leagueId,
      seasonYear: d.seasonYear,
      top3Pct: Math.round(top3Pct * 1000) / 1000,
      top5Pct: Math.round(top5Pct * 1000) / 1000,
      totalSpent: Math.round(totalSpent * 100) / 100,
      coefOfVariation: Math.round(coefOfVariation * 1000) / 1000,
      picks: sorted.map((p) => ({
        amount: p.amount,
        playerName: p.playerName,
      })),
    })
    if (d.importId) sourceImportIds.add(d.importId)
  }

  if (perDraft.length === 0) return null

  const top3Vals = perDraft.map((d) => d.top3Pct)
  const top5Vals = perDraft.map((d) => d.top5Pct)
  const cvVals = perDraft.map((d) => d.coefOfVariation)
  const avgTop3Pct = mean(top3Vals)
  const avgTop5Pct = mean(top5Vals)
  const avgCoefOfVariation = mean(cvVals)

  // Consistency: stable top3Pct across drafts. Single-draft samples produce
  // stdDev([x]) = 0 → 1/(1+0) = 1.0 — a false "perfectly consistent" signal.
  // Use a neutral 0.5 sentinel for N < 2 (schema's consistencyPct is Float
  // NOT NULL so null isn't storable).
  const top3Std = stdDev(top3Vals)
  const consistencyPct = perDraft.length < 2 ? 0.5 : 1 / (1 + top3Std)

  // 0.15 is the normalizing band: deviation from a 0.50 balanced baseline
  // of ±0.15 (so top3Pct of ~0.65 or ~0.35) is a "strong" signal. See header
  // comment for the auction-strategy rationale.
  const effectSize = Math.abs(avgTop3Pct - 0.5) / 0.15

  return {
    value: {
      avgTop3Pct: Math.round(avgTop3Pct * 1000) / 1000,
      avgTop5Pct: Math.round(avgTop5Pct * 1000) / 1000,
      avgCoefOfVariation: Math.round(avgCoefOfVariation * 1000) / 1000,
    },
    sampleSize: perDraft.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perDraft,
    },
    sourceImportIds: [...sourceImportIds],
  }
}

registerExtractor('auction_overpay_rate', buildRateExtractor('over'))
registerExtractor('auction_bargain_rate', buildRateExtractor('under'))
registerExtractor('auction_spend_concentration', auctionSpendConcentration)

module.exports = {}
