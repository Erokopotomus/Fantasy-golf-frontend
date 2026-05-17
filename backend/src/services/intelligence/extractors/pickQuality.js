const { registerExtractor } = require('../extractor')
const {
  getDraftPicksForUser,
  classifyPick,
} = require('../lib/draftPickParser')

/**
 * Internal: classify every snake pick the user has made. Returns paired
 * { pick, classification } records, filtering out unclassifiable ones.
 */
async function classifyAllPicks(userId, db) {
  const allPicks = await getDraftPicksForUser(userId, db)
  const snakePicks = allPicks.filter((p) => !p.isAuction)
  if (snakePicks.length === 0) {
    return { paired: [], totalPicks: 0, classifiablePicks: 0 }
  }
  const classifications = await Promise.all(
    snakePicks.map((p) => classifyPick(p, db))
  )
  const paired = snakePicks
    .map((p, i) => ({ pick: p, classification: classifications[i] }))
    .filter((c) => c.classification != null)
  return {
    paired,
    totalPicks: snakePicks.length,
    classifiablePicks: paired.length,
  }
}

/**
 * Build one of the four pick-quality extractors.
 * Each returns the rate of one label (STEAL / VALUE / PAR / REACH).
 */
function buildExtractor(targetLabel) {
  return async function (userId, db) {
    const { paired, totalPicks, classifiablePicks } = await classifyAllPicks(
      userId,
      db
    )
    if (classifiablePicks === 0) return null

    const matches = paired.filter(
      (c) => c.classification === targetLabel
    ).length
    const rate = matches / classifiablePicks

    // Baseline: each of 4 classes is ~25% by chance.
    // effectSize = |observed - 0.25| / std_dev_baseline, where
    // std_dev_baseline ≈ 0.43 for a Bernoulli(0.25).
    const effectSize = Math.abs(rate - 0.25) / 0.43

    return {
      value: {
        rate,
        count: matches,
        classifiableTotal: classifiablePicks,
        totalPicks, // includes unclassifiable
        coveragePct: classifiablePicks / totalPicks,
      },
      sampleSize: classifiablePicks,
      consistencyPct: rate, // for rate-based characteristics, rate IS the consistency value
      effectSize,
      rawEvidence: {
        adpSource: 'adp_entry_point_in_time',
        coverageNote:
          classifiablePicks < totalPicks
            ? `Only ${classifiablePicks} of ${totalPicks} historical picks had ADPEntry coverage`
            : null,
        sample: paired.slice(0, 20).map((c) => ({
          pickNum: c.pick.pickNum,
          round: c.pick.round,
          playerName: c.pick.playerName,
          position: c.pick.position,
          classification: c.classification,
          leagueId: c.pick.leagueId,
          seasonYear: c.pick.seasonYear,
        })),
      },
      sourceImportIds: [
        ...new Set(paired.map((c) => c.pick.importId).filter(Boolean)),
      ],
    }
  }
}

registerExtractor('pick_reach_rate', buildExtractor('REACH'))
registerExtractor('pick_steal_rate', buildExtractor('STEAL'))
registerExtractor('pick_par_rate', buildExtractor('PAR'))
registerExtractor('pick_value_rate', buildExtractor('VALUE'))

module.exports = {}
