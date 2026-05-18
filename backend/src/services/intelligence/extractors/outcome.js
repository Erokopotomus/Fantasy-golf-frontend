const { registerExtractor } = require('../extractor')
const { fetchDedupedSeasons } = require('../lib/seasonFetcher')
const { mean, stdDev } = require('../lib/stats')

/**
 * MI-10: Outcome baseline extractors (four characteristics).
 *
 * All four read HistoricalSeason scalar fields (finalStanding, playoffResult,
 * seasonYear, leagueId) rather than JSON blobs. These are INTRINSIC measures
 * of a manager's own record — no cohort z-scoring against league peers.
 *
 * Schema confirmed (May 2026):
 *   finalStanding  Int?         — 1 = first place
 *   playoffResult  String?      — one of:
 *                                   'champion'    won league
 *                                   'runner_up'   lost championship game
 *                                   'third_place' won 3rd-place game
 *                                   'playoffs'    made playoffs, mid-bracket
 *                                   'eliminated'  made playoffs, lost
 *                                   'missed'      did not make playoffs
 *                                 null = not classifiable (importer didn't
 *                                       resolve, or season incomplete)
 *
 * "Made playoffs" set = anything except 'missed' AND not null. The 'eliminated'
 *   bucket is the largest (196 rows) because most platforms label first-round
 *   playoff losers as "eliminated" rather than computing exact placement.
 *
 *   IMPORTANT: do NOT treat null as "missed." Null means we don't know
 *   (incomplete import or in-progress season). Filter null out of the
 *   denominator, don't count it as a miss.
 */

/**
 * Fetch all of a user's deduped seasons with the outcome-relevant fields.
 *
 * Returns rows shaped:
 *   { leagueId, seasonYear, importId, finalStanding, playoffResult,
 *     wins, losses, ties, pointsFor, pointsAgainst }
 *
 * One row per (leagueId, seasonYear) — fetchDedupedSeasons handles that.
 */
async function getUserSeasons(userId, db) {
  return fetchDedupedSeasons(userId, {
    db,
    select: {
      leagueId: true,
      seasonYear: true,
      importId: true,
      finalStanding: true,
      playoffResult: true,
      wins: true,
      losses: true,
      ties: true,
      pointsFor: true,
      pointsAgainst: true,
    },
  })
}

/**
 * League size lookup: count distinct ownerName rows per (leagueId, seasonYear)
 * across ALL of HistoricalSeason (not just the user's rows). Used by
 * finish_volatility for normalization context AND championship_rate as the
 * baseline expected win rate (1 / leagueSize).
 *
 * Returns Map<"leagueId::seasonYear", leagueSize>.
 */
async function getLeagueSizes(keys, db) {
  if (keys.length === 0) return new Map()
  // Build OR list — each (leagueId, seasonYear) is a separate filter.
  const orFilters = keys.map(({ leagueId, seasonYear }) => ({
    leagueId,
    seasonYear,
  }))
  const rows = await db.historicalSeason.groupBy({
    by: ['leagueId', 'seasonYear'],
    where: { OR: orFilters },
    _count: { _all: true },
  })
  const map = new Map()
  for (const r of rows) {
    map.set(`${r.leagueId}::${r.seasonYear}`, r._count._all)
  }
  return map
}

// Enum sets — kept inline (not exported) so accidental drift is local.
const MADE_PLAYOFFS = new Set([
  'champion',
  'runner_up',
  'third_place',
  'playoffs',
  'eliminated',
])
const MISSED_PLAYOFFS = new Set(['missed'])

/**
 * finish_volatility — intrinsic stability metric.
 *
 * Question: does this manager finish consistently or swing between great and
 * terrible?
 *
 * Per season: take finalStanding (rank, 1=first). Aggregate across all the
 * user's deduped seasons.
 *
 * Math:
 *   stdDevRanks       = stdDev(finalStandings)  (population)
 *   avgFinish, best, worst = standard summaries
 *   consistencyPct    = 1 / (1 + stdDevRanks/2)
 *                       Dividing the stdDev by 2 means a stdDev of 2 ranks
 *                       maps to 0.5 consistency (mid). 0 stdDev → 1.0 (rock
 *                       solid). 4 ranks → 0.33 (very swingy).
 *   effectSize        = stdDevRanks / 2
 *                       At stdDev=2 ranks the effect=1.0 (HIGH volatility).
 *                       Intentionally symmetric with consistencyPct: a manager
 *                       at the consistency=0.5 midpoint also has effect=1.0,
 *                       a clear "characteristic worth surfacing" threshold.
 *
 * Returns null if <2 seasons with non-null finalStanding (stdDev of 1 sample
 * is 0, which would falsely signal "perfectly consistent").
 */
async function finishVolatility(userId, db) {
  const seasons = await getUserSeasons(userId, db)
  if (seasons.length === 0) return null

  const withStanding = seasons.filter(
    (s) => s.finalStanding != null && Number.isFinite(s.finalStanding)
  )

  // Junk-row defense: drop rows that contradict themselves. A row claiming a
  // top-3 finish while also marked playoffResult='missed' is a known importer
  // artifact (seen in Eric's 2022 row: finalStanding=1, playoffResult='missed',
  // wins=0/losses=0). Filter those out and surface them in rawEvidence so we
  // can audit at the source rather than silently letting a bogus "1st place"
  // pull avgFinish toward 1.
  const valid = []
  const contradictoryNotes = []
  for (const s of withStanding) {
    if (s.playoffResult === 'missed' && s.finalStanding <= 3) {
      contradictoryNotes.push(
        `${s.leagueId}/${s.seasonYear}: finalStanding=${s.finalStanding} but playoffResult='missed' (junk row, skipped)`
      )
      continue
    }
    valid.push(s)
  }
  if (valid.length < 2) return null

  // League size for normalization context (not used in the math but useful
  // in rawEvidence — a stdDev of 2 in a 10-team league is more volatile than
  // the same stdDev in a 20-team league).
  //
  // NOTE: championshipRate also calls getLeagueSizes with overlapping season
  // keys, so there's 1 redundant groupBy query per user run. Acceptable per-user
  // cost; revisit during MI-19 backfill (TODO: thread a per-user leagueSizeMap
  // through the orchestrator if backfill scale makes this a hotspot).
  const leagueSizeMap = await getLeagueSizes(
    valid.map((s) => ({ leagueId: s.leagueId, seasonYear: s.seasonYear })),
    db
  )

  const standings = valid.map((s) => s.finalStanding)
  const stdDevRanks = stdDev(standings)
  const avgFinish = mean(standings)
  const bestFinish = Math.min(...standings)
  const worstFinish = Math.max(...standings)

  // consistencyPct: 1 / (1 + stdDevRanks/2). See header comment for rationale.
  const consistencyPct = 1 / (1 + stdDevRanks / 2)
  // effectSize: stdDevRanks/2. stdDev of 2 ranks = effect 1.0 (HIGH volatility).
  const effectSize = stdDevRanks / 2

  if (
    !Number.isFinite(stdDevRanks) ||
    !Number.isFinite(consistencyPct) ||
    !Number.isFinite(effectSize)
  ) {
    return null
  }

  const sourceImportIds = new Set()
  const perSeason = []
  for (const s of valid) {
    const ls = leagueSizeMap.get(`${s.leagueId}::${s.seasonYear}`) ?? null
    perSeason.push({
      leagueId: s.leagueId,
      seasonYear: s.seasonYear,
      finalStanding: s.finalStanding,
      leagueSize: ls,
      playoffResult: s.playoffResult,
    })
    if (s.importId) sourceImportIds.add(s.importId)
  }

  return {
    value: {
      stdDevRanks: Math.round(stdDevRanks * 100) / 100,
      avgFinish: Math.round(avgFinish * 100) / 100,
      bestFinish,
      worstFinish,
      seasonsContributing: valid.length,
    },
    sampleSize: valid.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      normalizationNote:
        'consistencyPct = 1/(1+stdDev/2): stdDev=0→1.0 (perfect), stdDev=2→0.5, stdDev=4→0.33. effectSize = stdDev/2: stdDev=2 ranks→1.0 (HIGH). leagueSize on each season for context — same stdDev means more in a 10-team league than a 20-team one.',
      contradictoryNotes:
        contradictoryNotes.length > 0 ? contradictoryNotes : undefined,
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * championship_rate — intrinsic.
 *
 * Question: how often does this manager win their league?
 *
 * Per season: classifiable = playoffResult is not null AND playoffResult is
 * not 'missed' isn't required — even a 'missed' season counts toward the
 * denominator since the manager was eligible to win. Only null is excluded
 * (we don't know what happened).
 *
 * Math:
 *   championships = count of playoffResult === 'champion'
 *   classifiable  = count of playoffResult != null
 *   rate          = championships / classifiable
 *   sampleSize    = classifiable
 *   consistencyPct= rate  (same pattern as pick_reach_rate: rate IS consistency)
 *   effectSize    = |rate - 1/avgLeagueSize| / 0.20
 *                   Baseline = 1/avgLeagueSize (e.g. 1/12 ≈ 0.083 — expected
 *                   rate by chance in a 12-team league). 0.20 normalizing band
 *                   means rate of ~0.28 in a 12-team league = effect 1.0 (1σ
 *                   above baseline). Compatible with pickQuality's effectSize
 *                   normalization band.
 *
 * Returns null if <2 classifiable seasons.
 */
async function championshipRate(userId, db) {
  const seasons = await getUserSeasons(userId, db)
  if (seasons.length === 0) return null

  const classifiable = seasons.filter((s) => s.playoffResult != null)
  if (classifiable.length < 2) return null

  const championships = classifiable.filter(
    (s) => s.playoffResult === 'champion'
  )
  const championshipSeasons = championships.map((s) => ({
    leagueId: s.leagueId,
    seasonYear: s.seasonYear,
  }))
  const rate = championships.length / classifiable.length

  // Average league size across classifiable seasons (baseline = 1/avgLeagueSize).
  const leagueSizeMap = await getLeagueSizes(
    classifiable.map((s) => ({ leagueId: s.leagueId, seasonYear: s.seasonYear })),
    db
  )
  const sizes = []
  for (const s of classifiable) {
    const sz = leagueSizeMap.get(`${s.leagueId}::${s.seasonYear}`)
    if (sz != null && sz > 0) sizes.push(sz)
  }
  const avgLeagueSize = sizes.length > 0 ? mean(sizes) : 12 // fallback to 12
  const baselineRate = 1 / avgLeagueSize

  // Rate IS the consistency (same pattern as MI-4 pick_reach_rate).
  const consistencyPct = rate
  // Baseline = 1/avgLeagueSize, 0.20 normalizing band → rate of (baseline +
  // 0.20) ≈ +1σ. Matches championship-rate's compatibility with pickQuality's
  // 0.20 band.
  const effectSize = Math.abs(rate - baselineRate) / 0.2

  if (
    !Number.isFinite(rate) ||
    !Number.isFinite(consistencyPct) ||
    !Number.isFinite(effectSize)
  ) {
    return null
  }

  const sourceImportIds = new Set()
  for (const s of classifiable) {
    if (s.importId) sourceImportIds.add(s.importId)
  }

  return {
    value: {
      rate: Math.round(rate * 1000) / 1000,
      championships: championships.length,
      totalSeasons: classifiable.length,
    },
    sampleSize: classifiable.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      championshipSeasons,
      totalClassifiable: classifiable.length,
      baselineRate: Math.round(baselineRate * 1000) / 1000,
      avgLeagueSize: Math.round(avgLeagueSize * 10) / 10,
      normalizationNote:
        'baseline = 1/avgLeagueSize (chance rate). effectSize normalizes |rate - baseline| by 0.20 — at +0.20 above baseline (e.g. ~28% in a 12-team league) effect = 1.0 (HIGH).',
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * playoff_rate — intrinsic.
 *
 * Question: how often does this manager make the playoffs?
 *
 * "Made playoffs" = playoffResult ∈ MADE_PLAYOFFS (champion, runner_up,
 * third_place, playoffs, eliminated). "Missed" = playoffResult === 'missed'.
 * playoffResult === null is excluded from BOTH numerator and denominator (the
 * importer didn't classify, or season is in-progress).
 *
 * Math:
 *   madePlayoffs  = count where playoffResult ∈ MADE_PLAYOFFS
 *   classifiable  = madePlayoffs + count where playoffResult === 'missed'
 *   rate          = madePlayoffs / classifiable
 *   sampleSize    = classifiable
 *   consistencyPct= rate (rate IS consistency)
 *   effectSize    = |rate - 0.5| / 0.2
 *                   Baseline 0.5 — top half of a 12-team league (≈6 of 12)
 *                   makes playoffs in most formats. 0.20 band → +1σ at 0.70
 *                   (consistent playoff team), -1σ at 0.30 (consistent miss).
 *
 * Returns null if <2 classifiable seasons.
 */
async function playoffRate(userId, db) {
  const seasons = await getUserSeasons(userId, db)
  if (seasons.length === 0) return null

  const classifiable = seasons.filter(
    (s) =>
      s.playoffResult != null &&
      (MADE_PLAYOFFS.has(s.playoffResult) ||
        MISSED_PLAYOFFS.has(s.playoffResult))
  )
  if (classifiable.length < 2) return null

  const made = classifiable.filter((s) => MADE_PLAYOFFS.has(s.playoffResult))
  const rate = made.length / classifiable.length

  const consistencyPct = rate
  // Baseline 0.5 (half the league makes it in most formats); 0.20 band → +1σ
  // at 0.70, -1σ at 0.30.
  const effectSize = Math.abs(rate - 0.5) / 0.2

  if (
    !Number.isFinite(rate) ||
    !Number.isFinite(consistencyPct) ||
    !Number.isFinite(effectSize)
  ) {
    return null
  }

  const sourceImportIds = new Set()
  const playoffSeasons = []
  for (const s of made) {
    playoffSeasons.push({
      leagueId: s.leagueId,
      seasonYear: s.seasonYear,
      playoffResult: s.playoffResult,
    })
  }
  for (const s of classifiable) {
    if (s.importId) sourceImportIds.add(s.importId)
  }

  return {
    value: {
      rate: Math.round(rate * 1000) / 1000,
      madePlayoffs: made.length,
      totalSeasons: classifiable.length,
    },
    sampleSize: classifiable.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      playoffSeasons,
      totalClassifiable: classifiable.length,
      definitionNote:
        "made playoffs = playoffResult ∈ {champion, runner_up, third_place, playoffs, eliminated}; missed = 'missed'; null excluded from denominator. baseline 0.5 (half the league makes it); effectSize normalizes |rate - 0.5| by 0.20 — rate of 0.70 (or 0.30) = effect 1.0 (HIGH).",
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * Simple linear regression. xs and ys are equal-length arrays.
 * Returns { slope, intercept, r2 } where r2 ∈ [0, 1] (coefficient of
 * determination).
 *
 * Edge case: if all x values are identical (denomX === 0), slope is
 * undefined → return { slope: 0, intercept: meanY, r2: 0 } as a neutral
 * "no trend" answer. Caller should treat this case by checking sampleSize
 * threshold.
 */
function linearRegression(xs, ys) {
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let numerator = 0
  let denomX = 0
  let denomTot = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomTot += dy * dy
  }
  if (denomX === 0) return { slope: 0, intercept: meanY, r2: 0 }
  const slope = numerator / denomX
  const intercept = meanY - slope * meanX
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept
    ssRes += (ys[i] - predicted) ** 2
  }
  const r2 = denomTot > 0 ? Math.max(0, 1 - ssRes / denomTot) : 0
  return { slope, intercept, r2 }
}

/**
 * career_trajectory_slope — intrinsic trend.
 *
 * Question: is this manager getting better or worse over time?
 *
 * Per season: (seasonYear, finalStanding) point. Fit a line y = m·x + b.
 *
 * In fantasy, LOWER finalStanding = BETTER (1 = first place). So:
 *   slope < 0  → improving (rank getting smaller over time)
 *   slope > 0  → declining (rank getting larger over time)
 *   slope = 0  → flat
 *
 * Math:
 *   slope, intercept, r2 = linear regression on (year, standing) pairs
 *   improvingTrend       = slope < 0 when r² >= 0.10; else null (fit too weak
 *                          to make a directional claim — sign of a noisy slope
 *                          is meaningless)
 *   consistencyPct       = r² (clamped to [0,1]) — strong fit → high consistency
 *   effectSize           = |slope| / 0.5
 *                          Baseline: 0.5 ranks/year of drift is "moderate"
 *                          trajectory. 1.0 rank/year (e.g. 9th → 5th over
 *                          4 years) = effect 2.0 (very high). 0.5 = effect 1.0.
 *
 * Returns null if <3 seasons with finalStanding (slope of 2 points is
 * meaningless — would be a perfect line through both with r²=1).
 */
async function careerTrajectorySlope(userId, db) {
  const seasons = await getUserSeasons(userId, db)
  if (seasons.length === 0) return null

  const valid = seasons.filter(
    (s) =>
      s.finalStanding != null &&
      Number.isFinite(s.finalStanding) &&
      Number.isFinite(s.seasonYear)
  )
  if (valid.length < 3) return null

  // Sort by year for stable rawEvidence ordering.
  valid.sort((a, b) => a.seasonYear - b.seasonYear)

  const xs = valid.map((s) => s.seasonYear)
  const ys = valid.map((s) => s.finalStanding)
  const { slope, intercept, r2 } = linearRegression(xs, ys)

  if (
    !Number.isFinite(slope) ||
    !Number.isFinite(intercept) ||
    !Number.isFinite(r2)
  ) {
    return null
  }

  // If all years were identical, denomX === 0 → slope=0, r²=0 — degenerate.
  // Treat as "no trajectory signal" via sampleSize gate (but technically
  // valid.length >= 3 should never give us all-same-year; guard anyway).
  const avgFinish = mean(ys)
  // improvingTrend is null when r² is too low (<0.10) to make a confident
  // directional claim — a slope sign with essentially no fit is noise, not a
  // trend. Sloppy fits shouldn't be surfaced to downstream coaching/UX as
  // "improving" or "declining."
  const improvingTrend = r2 < 0.1 ? null : slope < 0
  const consistencyPct = Math.max(0, Math.min(1, r2))
  // |slope|/0.5: a slope of 0.5 ranks per year = effect 1.0 (a manager
  // shifting half a rank a year is meaningfully trending).
  const effectSize = Math.abs(slope) / 0.5

  if (!Number.isFinite(effectSize)) return null

  const sourceImportIds = new Set()
  const dataPoints = []
  for (const s of valid) {
    dataPoints.push({ year: s.seasonYear, standing: s.finalStanding })
    if (s.importId) sourceImportIds.add(s.importId)
  }

  return {
    value: {
      slope: Math.round(slope * 1000) / 1000,
      r2: Math.round(r2 * 1000) / 1000,
      improvingTrend,
      avgFinish: Math.round(avgFinish * 100) / 100,
      seasonsContributing: valid.length,
    },
    sampleSize: valid.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      slope: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 100) / 100,
      r2: Math.round(r2 * 1000) / 1000,
      dataPoints,
      normalizationNote:
        'slope = ranks per year (negative = improving, positive = declining). consistencyPct = r² (fit strength). effectSize = |slope|/0.5: 0.5 ranks/year drift = 1.0 (moderate trajectory).',
    },
    sourceImportIds: [...sourceImportIds],
  }
}

registerExtractor('finish_volatility', finishVolatility)
registerExtractor('championship_rate', championshipRate)
registerExtractor('playoff_rate', playoffRate)
registerExtractor('career_trajectory_slope', careerTrajectorySlope)

module.exports = {}
