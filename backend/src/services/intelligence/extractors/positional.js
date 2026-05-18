const { registerExtractor } = require('../extractor')
const { getDraftPicksForUser } = require('../lib/draftPickParser')

/**
 * Normalize a raw position string into a canonical bucket.
 * Returns one of: 'QB', 'RB', 'WR', 'TE', 'K', 'DST', 'Other'
 * (Bench/null/unknown all collapse to 'Other'.)
 */
function normalizePosition(raw) {
  if (!raw) return 'Other'
  const p = String(raw).toUpperCase().trim()
  if (p === 'QB') return 'QB'
  if (p === 'RB') return 'RB'
  if (p === 'WR') return 'WR'
  if (p === 'TE') return 'TE'
  if (p === 'K') return 'K'
  if (p === 'DEF' || p === 'DST' || p === 'D/ST' || p === 'DEFENSE') return 'DST'
  return 'Other'
}

const R1_BUCKETS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'Other']
const REAL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

// Typical league-wide first-draft round per position (used as baseline for effectSize).
const LEAGUE_BASELINES = { QB: 8, RB: 3, WR: 4, TE: 7, K: 14, DST: 14 }

/**
 * r1_position_distribution
 * For each user, tally positions of their Round-1 picks across all seasons.
 * Captures whether the manager has a clear positional anchor in Round 1.
 */
async function r1PositionDistribution(userId, db) {
  const allPicks = await getDraftPicksForUser(userId, db)
  // Auction picks don't have meaningful round values; only snake picks have a real Round 1.
  const snakePicks = allPicks.filter((p) => !p.isAuction)
  const r1Picks = snakePicks.filter((p) => p.round === 1)
  if (r1Picks.length === 0) return null

  // Tally by normalized position
  const counts = Object.fromEntries(R1_BUCKETS.map((b) => [b, 0]))
  for (const p of r1Picks) {
    const bucket = normalizePosition(p.position)
    counts[bucket] += 1
  }

  // Convert to rates
  const total = r1Picks.length
  const value = Object.fromEntries(
    R1_BUCKETS.map((b) => [b, counts[b] / total])
  )

  // consistencyPct = max rate (1.0 if all R1 picks one position)
  const maxRate = Math.max(...Object.values(value))

  // effectSize relative to a chance baseline of 1/6 across the 6 real positions.
  // (Other isn't a "real" position; if everything goes to Other we still want a
  // moderate effectSize, but the baseline is chance-uniform-over-6.)
  const baseline = 1 / 6
  // 0.5 is a deliberate normalizing band (half the rate range): a maxRate of ~0.66
  // yields effectSize ~1.0 (HIGH). Using the true max deviation (1 - 1/6) would
  // understate realistic R1 concentration patterns.
  const effectSize = Math.abs(maxRate - baseline) / 0.5

  const sourceImportIds = [
    ...new Set(r1Picks.map((p) => p.importId).filter(Boolean)),
  ]

  return {
    value,
    sampleSize: new Set(r1Picks.map((p) => `${p.leagueId}::${p.seasonYear}`)).size,
    consistencyPct: maxRate,
    effectSize,
    rawEvidence: {
      picks: r1Picks.map((p) => ({
        pickNum: p.pickNum,
        playerName: p.playerName,
        position: normalizePosition(p.position),
        rawPosition: p.position,
        leagueId: p.leagueId,
        seasonYear: p.seasonYear,
      })),
    },
    sourceImportIds,
  }
}

/**
 * Population (uncorrected) standard deviation of a numeric array. Returns 0
 * for arrays of length 0 or 1 (no variance to measure).
 */
function stdDev(values) {
  if (!values || values.length <= 1) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * position_round_profile
 * For each real position (QB/RB/WR/TE/K/DST), compute the average round at
 * which the user first drafted that position across seasons. Captures the
 * manager's positional draft cadence.
 */
async function positionRoundProfile(userId, db) {
  const allPicks = await getDraftPicksForUser(userId, db)
  // Auction picks don't have meaningful round values; exclude them from round-cadence math.
  const snakePicks = allPicks.filter((p) => !p.isAuction)
  if (snakePicks.length === 0) return null

  // Group picks by (leagueId, seasonYear) — one draft per season per league.
  const seasonKey = (p) => `${p.leagueId}::${p.seasonYear}`
  const seasonGroups = new Map()
  for (const p of snakePicks) {
    const k = seasonKey(p)
    if (!seasonGroups.has(k)) seasonGroups.set(k, [])
    seasonGroups.get(k).push(p)
  }

  // For each season, find the first round each real position was drafted in.
  // profile[pos] = array of "first round drafted" values, one per season that had any pick of that position.
  const profile = Object.fromEntries(REAL_POSITIONS.map((pos) => [pos, []]))
  const contributingImportIds = new Set()

  let seasonsWithAnyParseablePosition = 0
  for (const [, picks] of seasonGroups) {
    let hadParseable = false
    // For each real position, find min round drafted in this season
    for (const pos of REAL_POSITIONS) {
      const positionPicks = picks.filter(
        (p) => normalizePosition(p.position) === pos
      )
      if (positionPicks.length === 0) continue
      const minRound = Math.min(...positionPicks.map((p) => p.round))
      if (Number.isFinite(minRound)) {
        profile[pos].push(minRound)
        hadParseable = true
        for (const p of positionPicks) {
          if (p.importId) contributingImportIds.add(p.importId)
        }
      }
    }
    if (hadParseable) seasonsWithAnyParseablePosition += 1
  }

  // Drop positions never drafted by this user
  const observedPositions = REAL_POSITIONS.filter(
    (pos) => profile[pos].length > 0
  )
  if (observedPositions.length === 0) return null

  // Build the value: { pos: avgRound, ... } and rich profile for evidence
  const value = {}
  const evidenceProfile = {}
  for (const pos of observedPositions) {
    const samples = profile[pos]
    const avgRound =
      samples.reduce((a, b) => a + b, 0) / samples.length
    value[pos] = Math.round(avgRound * 10) / 10 // one decimal
    evidenceProfile[pos] = {
      avgRound: Math.round(avgRound * 100) / 100,
      stdDev: Math.round(stdDev(samples) * 100) / 100,
      samples: [...samples],
    }
  }

  // sampleSize = min sample count across observed positions (conservative)
  const sampleSize = Math.min(
    ...observedPositions.map((pos) => profile[pos].length)
  )

  // consistencyPct = 1 / (1 + meanStdDev) across observed positions
  const meanStdDev =
    observedPositions.reduce((acc, pos) => acc + stdDev(profile[pos]), 0) /
    observedPositions.length
  const consistencyPct = 1 / (1 + meanStdDev)

  // effectSize: mean abs delta from league baseline, normalized by 5
  const meanAbsDelta =
    observedPositions.reduce((acc, pos) => {
      const samples = profile[pos]
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length
      return acc + Math.abs(avg - LEAGUE_BASELINES[pos])
    }, 0) / observedPositions.length
  // 5 rounds is the normalizing band: reaching a position 5 rounds early/late vs
  // league baseline is a strong signal (effectSize ~1.0). Most patterns are 1-3 off.
  const effectSize = meanAbsDelta / 5

  return {
    value,
    sampleSize,
    consistencyPct,
    effectSize,
    rawEvidence: {
      profile: evidenceProfile,
      leagueBaselines: LEAGUE_BASELINES,
      seasonsObserved: seasonsWithAnyParseablePosition,
    },
    sourceImportIds: [...contributingImportIds],
  }
}

registerExtractor('r1_position_distribution', r1PositionDistribution)
registerExtractor('position_round_profile', positionRoundProfile)

module.exports = {}
