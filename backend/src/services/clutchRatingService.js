/**
 * Clutch Rating Service V2
 *
 * Computes a 0-100 confidence-weighted composite rating across 7 dimensions:
 *   Win Rate (20%) | Draft IQ (18%) | Roster Mgmt (18%) | Predictions (15%)
 *   Trade Acumen (12% — deferred V2) | Championships (10%) | Consistency (7%)
 *
 * Each component has a score (0-100) and confidence (0-100%).
 * Components with 0% confidence (no data) are excluded and weight redistributed.
 * confidence_factor = confidence ^ 0.6 (softened curve)
 *
 * Tier thresholds:
 *   90+ ELITE, 80+ VETERAN, 70+ COMPETITOR, 60+ CONTENDER,
 *   50+ DEVELOPING, 40+ ROOKIE, <40 UNRANKED
 */

const COMPONENT_WEIGHTS = {
  winRate:       0.20,
  draftIq:       0.18,
  rosterMgmt:    0.18,
  predictions:   0.15,
  tradeAcumen:   0.12,
  championships: 0.10,
  consistency:   0.07,
}

const TIER_MAP = [
  { min: 90, tier: 'ELITE' },
  { min: 80, tier: 'VETERAN' },
  { min: 70, tier: 'COMPETITOR' },
  { min: 60, tier: 'CONTENDER' },
  { min: 50, tier: 'DEVELOPING' },
  { min: 40, tier: 'ROOKIE' },
  { min: 0,  tier: 'UNRANKED' },
]

const TREND_THRESHOLD = 3
const TREND_WINDOW_DAYS = 30

function getTier(rating) {
  if (rating == null) return 'UNRANKED'
  for (const { min, tier } of TIER_MAP) {
    if (rating >= min) return tier
  }
  return 'UNRANKED'
}

// ─── Confidence Curve Helpers ────────────────────────────────────────
// Interpolate confidence from a curve of [dataPoints, confidence] pairs

function interpolateConfidence(value, curve) {
  if (value <= curve[0][0]) return curve[0][1]
  if (value >= curve[curve.length - 1][0]) return curve[curve.length - 1][1]
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i]
    const [x1, y1] = curve[i + 1]
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return curve[curve.length - 1][1]
}

// ─── Component: Win Rate Intelligence (20%) ──────────────────────────

async function computeWinRate(userId, prisma) {
  // Gather historical seasons + Clutch-native TeamSeason records
  const historicalSeasons = await prisma.historicalSeason.findMany({
    where: { ownerUserId: userId },
    select: { seasonYear: true, wins: true, losses: true, ties: true, pointsFor: true, pointsAgainst: true, leagueId: true },
    orderBy: { seasonYear: 'asc' },
  })

  const teamSeasons = await prisma.teamSeason.findMany({
    where: { team: { userId } },
    select: { wins: true, losses: true, ties: true, totalPoints: true, leagueSeasonId: true },
  })

  // Combine into unified season records
  const seasons = []

  for (const hs of historicalSeasons) {
    const games = hs.wins + hs.losses + (hs.ties || 0)
    if (games === 0) continue
    seasons.push({
      year: hs.seasonYear,
      winPct: hs.wins / games,
      pf: hs.pointsFor || 0,
      pa: hs.pointsAgainst || 0,
      source: 'historical',
    })
  }

  for (const ts of teamSeasons) {
    const games = ts.wins + ts.losses + (ts.ties || 0)
    if (games === 0) continue
    seasons.push({
      year: 9999, // Clutch-native, treated as most recent
      winPct: ts.wins / games,
      pf: ts.totalPoints || 0,
      pa: 0,
      source: 'clutch',
    })
  }

  if (seasons.length === 0) return { score: null, confidence: 0 }

  // Career win% (all seasons equally weighted)
  const totalWins = [...historicalSeasons, ...teamSeasons].reduce((s, r) => s + r.wins, 0)
  const totalLosses = [...historicalSeasons, ...teamSeasons].reduce((s, r) => s + r.losses, 0)
  const totalTies = [...historicalSeasons, ...teamSeasons].reduce((s, r) => s + (r.ties || 0), 0)
  const totalGames = totalWins + totalLosses + totalTies
  const careerWinPct = totalGames > 0 ? totalWins / totalGames : 0.5

  // Recent win% (last 3 seasons, weighted more)
  const sortedSeasons = seasons.sort((a, b) => b.year - a.year)
  const recentSeasons = sortedSeasons.slice(0, 3)
  const recentWinPcts = recentSeasons.map(s => s.winPct)
  const recentWinPct = recentWinPcts.length > 0
    ? recentWinPcts.reduce((a, b) => a + b, 0) / recentWinPcts.length
    : careerWinPct

  // PF vs average — normalized around 0.5 (above avg = positive, below = negative)
  // Use the average PF across all their seasons as a simple proxy
  const allPF = seasons.filter(s => s.pf > 0).map(s => s.pf)
  let pfNormalized = 0.5
  if (allPF.length >= 2) {
    const avgPF = allPF.reduce((a, b) => a + b, 0) / allPF.length
    const maxPF = Math.max(...allPF)
    const minPF = Math.min(...allPF)
    const range = maxPF - minPF
    if (range > 0) {
      // Normalize: are they consistently above their own average?
      const aboveAvgSeasons = allPF.filter(pf => pf >= avgPF).length
      pfNormalized = aboveAvgSeasons / allPF.length
    }
  }

  // Combined score: win% mapped to 0-100
  // .500 = ~50, .600 = ~70, .700 = ~85, .400 = ~35
  const rawScore = (careerWinPct * 0.4) + (recentWinPct * 0.4) + (pfNormalized * 0.2)
  const score = Math.round(Math.min(100, Math.max(0, rawScore * 130 - 15)))

  // Confidence curve: 1→25%, 3→55%, 5→75%, 8→90%, 12+→98%
  const confidence = interpolateConfidence(seasons.length, [
    [1, 25], [3, 55], [5, 75], [8, 90], [12, 98],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Component: Draft IQ (18%) ───────────────────────────────────────

async function computeDraftIQ(userId, prisma) {
  const draftGrades = await prisma.draftGrade.findMany({
    where: { team: { userId } },
    select: { overallScore: true, pickGrades: true, sleepers: true, reaches: true },
  })

  if (draftGrades.length === 0) return { score: null, confidence: 0 }

  // Base score: average of all draft grade scores (already 0-100)
  const avgScore = draftGrades.reduce((sum, dg) => sum + dg.overallScore, 0) / draftGrades.length

  // If pick-level data available, blend in additional signals
  let blendedScore = avgScore
  const gradesWithPicks = draftGrades.filter(dg => Array.isArray(dg.pickGrades) && dg.pickGrades.length > 0)

  if (gradesWithPicks.length > 0) {
    let totalEarlyHits = 0
    let totalEarlyPicks = 0
    let totalLateGems = 0
    let totalLatePicks = 0

    for (const dg of gradesWithPicks) {
      const picks = dg.pickGrades
      for (const pick of picks) {
        if (pick.round <= 3) {
          totalEarlyPicks++
          if (pick.score >= 70) totalEarlyHits++ // Good early picks
        } else if (pick.round >= 8) {
          totalLatePicks++
          if (pick.score >= 75) totalLateGems++ // Late-round steals
        }
      }
    }

    const earlyHitRate = totalEarlyPicks > 0 ? (totalEarlyHits / totalEarlyPicks) * 100 : 50
    const lateStealRate = totalLatePicks > 0 ? (totalLateGems / totalLatePicks) * 100 : 50

    // Blend: 40% overall grade + 35% early hit rate + 25% late steal rate
    blendedScore = (avgScore * 0.40) + (earlyHitRate * 0.35) + (lateStealRate * 0.25)
  }

  const score = Math.round(Math.min(100, Math.max(0, blendedScore)))

  // Confidence curve: 1→30%, 3→60%, 5→80%, 8+→95%
  const confidence = interpolateConfidence(draftGrades.length, [
    [1, 30], [3, 60], [5, 80], [8, 95],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Component: Roster Management (18%) ──────────────────────────────

async function computeRosterMgmt(userId, prisma) {
  // Get lineup snapshots with optimal points data
  const snapshots = await prisma.lineupSnapshot.findMany({
    where: { team: { userId } },
    select: { activePoints: true, benchPoints: true, optimalPoints: true },
  })

  // Also get weekly results for bench efficiency
  const weeklyResults = await prisma.weeklyTeamResult.findMany({
    where: { team: { userId } },
    select: { totalPoints: true, optimalPoints: true, pointsLeftOnBench: true },
  })

  // Use whichever dataset has more records
  const records = weeklyResults.length > 0 ? weeklyResults : snapshots
  const totalWeeks = records.length

  if (totalWeeks === 0) return { score: null, confidence: 0 }

  // Optimal lineup percentage — how often did they set near-optimal lineups?
  let optimalCount = 0
  let benchEfficiencySum = 0
  let benchWeeks = 0

  if (weeklyResults.length > 0) {
    for (const wr of weeklyResults) {
      if (wr.optimalPoints && wr.optimalPoints > 0) {
        const ratio = wr.totalPoints / wr.optimalPoints
        if (ratio >= 0.90) optimalCount++
      }
      if (wr.pointsLeftOnBench != null && wr.totalPoints > 0) {
        benchEfficiencySum += 1 - Math.min(1, wr.pointsLeftOnBench / wr.totalPoints)
        benchWeeks++
      }
    }
  } else {
    for (const snap of snapshots) {
      if (snap.optimalPoints && snap.optimalPoints > 0 && snap.activePoints) {
        const ratio = snap.activePoints / snap.optimalPoints
        if (ratio >= 0.90) optimalCount++
      }
      if (snap.benchPoints != null && snap.activePoints > 0) {
        benchEfficiencySum += 1 - Math.min(1, snap.benchPoints / snap.activePoints)
        benchWeeks++
      }
    }
  }

  const optimalPct = (optimalCount / totalWeeks) * 100
  const benchEfficiency = benchWeeks > 0 ? (benchEfficiencySum / benchWeeks) * 100 : 50
  const engagementScore = Math.min(100, (totalWeeks / 17) * 100) // Normalize to 1 full season

  // Weighted score
  const rawScore = (optimalPct * 0.40) + (benchEfficiency * 0.30) + (engagementScore * 0.30)
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))

  // Confidence curve: 4→20%, 8→45%, 17→65%, 51→85%, 85+→95%
  const confidence = interpolateConfidence(totalWeeks, [
    [4, 20], [8, 45], [17, 65], [51, 85], [85, 95],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Component: Prediction Accuracy (15%) ────────────────────────────

async function computePredictions(userId, prisma) {
  const resolved = await prisma.prediction.findMany({
    where: {
      userId,
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    },
    select: { outcome: true, resolvedAt: true, createdAt: true },
    orderBy: { resolvedAt: 'asc' },
  })

  if (resolved.length === 0) return { score: null, confidence: 0 }

  // Recency-weighted accuracy (90-day decay) — same algorithm as clutchRatingEngine.js
  const now = Date.now()
  const decayMs = 90 * 24 * 60 * 60 * 1000
  let weightedCorrect = 0
  let totalWeight = 0

  for (const p of resolved) {
    const resolvedAt = p.resolvedAt ? new Date(p.resolvedAt).getTime() : now
    const age = now - resolvedAt
    const weight = Math.exp(-age / decayMs)
    totalWeight += weight
    if (p.outcome === 'CORRECT') weightedCorrect += weight
  }

  const score = totalWeight > 0 ? Math.round((weightedCorrect / totalWeight) * 100) : 0

  // Confidence curve: 10→15%, 50→40%, 200→70%, 500+→90%
  const confidence = interpolateConfidence(resolved.length, [
    [10, 15], [50, 40], [200, 70], [500, 90],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Component: Championship Pedigree (10%) ──────────────────────────

async function computeChampionships(userId, prisma) {
  const historicalSeasons = await prisma.historicalSeason.findMany({
    where: { ownerUserId: userId },
    select: { playoffResult: true, seasonYear: true },
  })

  const teamSeasons = await prisma.teamSeason.findMany({
    where: { team: { userId } },
    select: { isChampion: true, finalRank: true },
  })

  const totalSeasons = historicalSeasons.length + teamSeasons.length
  if (totalSeasons === 0) return { score: null, confidence: 0 }

  // Count championships, playoff appearances, runner-ups
  let titles = 0
  let playoffAppearances = 0
  let playoffWins = 0
  let runnerUps = 0
  let playoffGames = 0

  for (const hs of historicalSeasons) {
    const result = hs.playoffResult?.toLowerCase()
    if (!result || result === 'missed') continue
    playoffAppearances++
    if (result === 'champion') { titles++; playoffWins += 3 }
    else if (result === 'runner_up') { runnerUps++; playoffWins += 2 }
    else if (result === 'semifinal') { playoffWins += 1 }
    playoffGames += (result === 'champion' ? 3 : result === 'runner_up' ? 3 : result === 'semifinal' ? 2 : 1)
  }

  for (const ts of teamSeasons) {
    if (ts.isChampion) { titles++; playoffAppearances++ }
    else if (ts.finalRank && ts.finalRank <= 4) { playoffAppearances++ }
  }

  // Title rate normalized: 0 titles = 20, 1 in 10 = 55, 2 in 10 = 70, 3+ in 10 = 85+
  const titleRate = totalSeasons > 0 ? titles / totalSeasons : 0
  const titleScore = Math.min(100, 20 + titleRate * 600)

  // Playoff appearance rate
  const playoffRate = totalSeasons > 0 ? playoffAppearances / totalSeasons : 0
  const playoffScore = Math.min(100, playoffRate * 120)

  // Playoff win %
  const playoffWinPct = playoffGames > 0 ? playoffWins / playoffGames : 0
  const playoffWinScore = Math.min(100, playoffWinPct * 100)

  // Runner-up bonus (shows they get close)
  const runnerUpBonus = Math.min(100, runnerUps * 25 + 20)

  const rawScore = (titleScore * 0.35) + (playoffScore * 0.25) + (playoffWinScore * 0.25) + (runnerUpBonus * 0.15)
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))

  // Confidence curve: 1-2→20%, 4→50%, 8→80%, 12+→95%
  const confidence = interpolateConfidence(totalSeasons, [
    [1, 20], [2, 20], [4, 50], [8, 80], [12, 95],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Component: Consistency (7%) ─────────────────────────────────────

async function computeConsistency(userId, prisma) {
  const historicalSeasons = await prisma.historicalSeason.findMany({
    where: { ownerUserId: userId },
    select: { seasonYear: true, wins: true, losses: true, ties: true },
    orderBy: { seasonYear: 'asc' },
  })

  // Also include Clutch-native seasons
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { team: { userId } },
    select: { wins: true, losses: true, ties: true },
  })

  // Build array of season win percentages
  const winPcts = []

  for (const hs of historicalSeasons) {
    const games = hs.wins + hs.losses + (hs.ties || 0)
    if (games < 4) continue // Skip very short seasons
    winPcts.push(hs.wins / games)
  }

  for (const ts of teamSeasons) {
    const games = ts.wins + ts.losses + (ts.ties || 0)
    if (games < 4) continue
    winPcts.push(ts.wins / games)
  }

  if (winPcts.length < 2) return { score: null, confidence: winPcts.length === 1 ? 10 : 0 }

  // 1. Low variance score (40%) — lower std dev = better
  const mean = winPcts.reduce((a, b) => a + b, 0) / winPcts.length
  const variance = winPcts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / winPcts.length
  const stdDev = Math.sqrt(variance)
  // StdDev of 0 = 100, StdDev of 0.3 = 0
  const lowVariance = Math.max(0, Math.min(100, Math.round((1 - stdDev / 0.3) * 100)))

  // 2. No losing streak score (25%) — longest streak without sub-.400 season
  let currentStreak = 0
  let bestStreak = 0
  for (const wp of winPcts) {
    if (wp >= 0.400) {
      currentStreak++
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }
  // Normalize: 1 = 20, 3 = 50, 5 = 75, 8+ = 95
  const noLosingStreak = Math.min(100, Math.round(interpolateConfidence(bestStreak, [
    [1, 20], [3, 50], [5, 75], [8, 95], [12, 100],
  ])))

  // 3. Improvement trend (20%) — linear regression slope of win% over time
  let improvementTrend = 50 // Default neutral
  if (winPcts.length >= 3) {
    const n = winPcts.length
    const xMean = (n - 1) / 2
    const yMean = mean
    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (winPcts[i] - yMean)
      denominator += (i - xMean) ** 2
    }
    const slope = denominator !== 0 ? numerator / denominator : 0
    // Slope of +0.05/season = improving, -0.05 = declining
    // Map: -0.1 = 0, 0 = 50, +0.1 = 100
    improvementTrend = Math.max(0, Math.min(100, Math.round(50 + slope * 500)))
  }

  // 4. Floor protection (15%) — worst season win%
  const worstWinPct = Math.min(...winPcts)
  // 0.500 = 80, 0.300 = 40, 0.100 = 10, 0 = 0
  const floorProtection = Math.max(0, Math.min(100, Math.round(worstWinPct * 160)))

  const rawScore = (lowVariance * 0.40) + (noLosingStreak * 0.25) + (improvementTrend * 0.20) + (floorProtection * 0.15)
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))

  // Confidence curve: 1-2→10%, 4→45%, 6→70%, 10+→90%
  const confidence = interpolateConfidence(winPcts.length, [
    [1, 10], [2, 10], [4, 45], [6, 70], [10, 90],
  ])

  return { score, confidence: Math.round(confidence) }
}

// ─── Overall Rating Aggregation ──────────────────────────────────────

function computeOverallRating(components) {
  // components: { winRate: {score, confidence}, draftIq: {...}, ... }
  const CONFIDENCE_SOFTENER = 0.6

  // 1. Identify active components (confidence > 0 AND score is not null)
  const active = {}
  const inactive = {}
  for (const [key, val] of Object.entries(components)) {
    if (val.confidence > 0 && val.score != null) {
      active[key] = val
    } else {
      inactive[key] = val
    }
  }

  const activeKeys = Object.keys(active)
  if (activeKeys.length === 0) {
    return { overall: null, confidence: 0, tier: 'UNRANKED' }
  }

  // 2. Redistribute weights from inactive components
  const inactiveWeightSum = Object.keys(inactive).reduce((sum, key) => sum + (COMPONENT_WEIGHTS[key] || 0), 0)
  const activeWeightSum = activeKeys.reduce((sum, key) => sum + (COMPONENT_WEIGHTS[key] || 0), 0)

  const adjustedWeights = {}
  for (const key of activeKeys) {
    const baseWeight = COMPONENT_WEIGHTS[key] || 0
    // Proportionally add inactive weight
    adjustedWeights[key] = baseWeight + (baseWeight / activeWeightSum) * inactiveWeightSum
  }

  // 3. Compute weighted score with confidence softening
  let numerator = 0
  let denominator = 0
  let confidenceWeightedSum = 0
  let weightSum = 0

  for (const key of activeKeys) {
    const { score, confidence } = active[key]
    const w = adjustedWeights[key]
    const cf = Math.pow(confidence / 100, CONFIDENCE_SOFTENER)

    numerator += score * w * cf
    denominator += w * cf

    confidenceWeightedSum += confidence * (COMPONENT_WEIGHTS[key] || 0)
    weightSum += COMPONENT_WEIGHTS[key] || 0
  }

  const overall = denominator > 0 ? Math.round(numerator / denominator) : null
  const overallConfidence = weightSum > 0 ? Math.round(confidenceWeightedSum / weightSum) : 0

  return {
    overall: Math.min(100, Math.max(0, overall)),
    confidence: overallConfidence,
    tier: getTier(overall),
  }
}

// ─── Main Orchestrator ───────────────────────────────────────────────

async function calculateRatingForUser(userId, prisma) {
  // Run all component calculations in parallel
  const [winRate, draftIq, rosterMgmt, predictions, championships, consistency] = await Promise.all([
    computeWinRate(userId, prisma),
    computeDraftIQ(userId, prisma),
    computeRosterMgmt(userId, prisma),
    computePredictions(userId, prisma),
    computeChampionships(userId, prisma),
    computeConsistency(userId, prisma),
  ])

  // Trade acumen deferred — always null/0 for V1
  const tradeAcumen = { score: null, confidence: 0 }

  const components = { winRate, draftIq, rosterMgmt, predictions, tradeAcumen, championships, consistency }

  // Compute overall
  const { overall, confidence, tier } = computeOverallRating(components)

  // Compute trend from snapshots
  let trend = 'new'
  if (overall != null) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TREND_WINDOW_DAYS)

    const oldSnapshot = await prisma.ratingSnapshot.findFirst({
      where: {
        userId,
        snapshotDate: { lte: thirtyDaysAgo },
      },
      orderBy: { snapshotDate: 'desc' },
      select: { overall: true },
    })

    if (oldSnapshot) {
      const diff = overall - oldSnapshot.overall
      if (diff > TREND_THRESHOLD) trend = 'up'
      else if (diff < -TREND_THRESHOLD) trend = 'down'
      else trend = 'stable'
    }
  }

  // Build data source summary
  const sources = []
  if (winRate.confidence > 0) {
    const seasonCount = (await prisma.historicalSeason.count({ where: { ownerUserId: userId } }))
      + (await prisma.teamSeason.count({ where: { team: { userId } } }))
    sources.push(`${seasonCount} season${seasonCount !== 1 ? 's' : ''}`)
  }
  if (draftIq.confidence > 0) {
    const draftCount = await prisma.draftGrade.count({ where: { team: { userId } } })
    sources.push(`${draftCount} draft${draftCount !== 1 ? 's' : ''}`)
  }
  if (predictions.confidence > 0) {
    const predCount = await prisma.prediction.count({ where: { userId, outcome: { in: ['CORRECT', 'INCORRECT'] } } })
    sources.push(`${predCount} predictions`)
  }
  if (rosterMgmt.confidence > 0) sources.push('lineup data')
  const dataSourceSummary = sources.length > 0 ? `Based on ${sources.join(' + ')}` : 'No data yet'

  // Total graded calls (for backward compat)
  const totalGradedCalls = await prisma.prediction.count({
    where: { userId, outcome: { in: ['CORRECT', 'INCORRECT'] } },
  })

  // Upsert the rating
  const ratingRecord = await prisma.clutchManagerRating.upsert({
    where: { userId },
    create: {
      userId,
      version: 2,
      overallRating: overall,
      confidence,
      tier: tier || 'UNRANKED',
      trend,
      dataSourceSummary,
      activeSince: new Date(),
      winRateScore: winRate.score,
      winRateConfidence: winRate.confidence,
      draftIqScore: draftIq.score,
      draftIqConfidence: draftIq.confidence,
      rosterMgmtScore: rosterMgmt.score,
      rosterMgmtConfidence: rosterMgmt.confidence,
      predictionsScore: predictions.score,
      predictionsConfidence: predictions.confidence,
      tradeAcumenScore: tradeAcumen.score,
      tradeAcumenConfidence: tradeAcumen.confidence,
      championshipsScore: championships.score,
      championshipsConfidence: championships.confidence,
      consistencyScore: consistency.score,
      consistencyConfidence: consistency.confidence,
      totalGradedCalls,
      computationInputs: {
        version: 2,
        componentSources: {
          winRate: winRate.confidence > 0 ? 'active' : 'no_data',
          draftIq: draftIq.confidence > 0 ? 'active' : 'no_data',
          rosterMgmt: rosterMgmt.confidence > 0 ? 'active' : 'no_data',
          predictions: predictions.confidence > 0 ? 'active' : 'no_data',
          tradeAcumen: 'deferred_v2',
          championships: championships.confidence > 0 ? 'active' : 'no_data',
          consistency: consistency.confidence > 0 ? 'active' : 'no_data',
        },
      },
    },
    update: {
      version: 2,
      overallRating: overall,
      confidence,
      tier: tier || 'UNRANKED',
      trend,
      dataSourceSummary,
      winRateScore: winRate.score,
      winRateConfidence: winRate.confidence,
      draftIqScore: draftIq.score,
      draftIqConfidence: draftIq.confidence,
      rosterMgmtScore: rosterMgmt.score,
      rosterMgmtConfidence: rosterMgmt.confidence,
      predictionsScore: predictions.score,
      predictionsConfidence: predictions.confidence,
      tradeAcumenScore: tradeAcumen.score,
      tradeAcumenConfidence: tradeAcumen.confidence,
      championshipsScore: championships.score,
      championshipsConfidence: championships.confidence,
      consistencyScore: consistency.score,
      consistencyConfidence: consistency.confidence,
      totalGradedCalls,
      computationInputs: {
        version: 2,
        componentSources: {
          winRate: winRate.confidence > 0 ? 'active' : 'no_data',
          draftIq: draftIq.confidence > 0 ? 'active' : 'no_data',
          rosterMgmt: rosterMgmt.confidence > 0 ? 'active' : 'no_data',
          predictions: predictions.confidence > 0 ? 'active' : 'no_data',
          tradeAcumen: 'deferred_v2',
          championships: championships.confidence > 0 ? 'active' : 'no_data',
          consistency: consistency.confidence > 0 ? 'active' : 'no_data',
        },
      },
    },
  })

  // Save snapshot for trend tracking (one per day max)
  if (overall != null) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingSnapshot = await prisma.ratingSnapshot.findFirst({
      where: {
        userId,
        snapshotDate: { gte: today, lt: tomorrow },
      },
    })

    if (!existingSnapshot) {
      await prisma.ratingSnapshot.create({
        data: {
          userId,
          overall,
          components: {
            winRate: winRate.score,
            draftIq: draftIq.score,
            rosterMgmt: rosterMgmt.score,
            predictions: predictions.score,
            championships: championships.score,
            consistency: consistency.score,
          },
        },
      })
    }
  }

  // Return the formatted ClutchRating interface
  return formatRatingResponse(ratingRecord, components)
}

// ─── Format Response ─────────────────────────────────────────────────

function formatRatingResponse(record, components) {
  if (!components) {
    // Build components from record fields
    components = {
      winRate: { score: record.winRateScore, confidence: record.winRateConfidence || 0 },
      draftIq: { score: record.draftIqScore, confidence: record.draftIqConfidence || 0 },
      rosterMgmt: { score: record.rosterMgmtScore, confidence: record.rosterMgmtConfidence || 0 },
      predictions: { score: record.predictionsScore, confidence: record.predictionsConfidence || 0 },
      tradeAcumen: { score: record.tradeAcumenScore, confidence: record.tradeAcumenConfidence || 0 },
      championships: { score: record.championshipsScore, confidence: record.championshipsConfidence || 0 },
      consistency: { score: record.consistencyScore, confidence: record.consistencyConfidence || 0 },
    }
  }

  return {
    overall: record.overallRating,
    tier: record.tier?.toUpperCase() || 'UNRANKED',
    confidence: record.confidence || 0,
    trend: record.trend || 'new',
    components: {
      winRate: {
        score: components.winRate.score,
        confidence: components.winRate.confidence,
        active: components.winRate.confidence > 0 && components.winRate.score != null,
      },
      draftIQ: {
        score: components.draftIq.score,
        confidence: components.draftIq.confidence,
        active: components.draftIq.confidence > 0 && components.draftIq.score != null,
      },
      rosterMgmt: {
        score: components.rosterMgmt.score,
        confidence: components.rosterMgmt.confidence,
        active: components.rosterMgmt.confidence > 0 && components.rosterMgmt.score != null,
      },
      predictions: {
        score: components.predictions.score,
        confidence: components.predictions.confidence,
        active: components.predictions.confidence > 0 && components.predictions.score != null,
      },
      tradeAcumen: {
        score: components.tradeAcumen.score,
        confidence: components.tradeAcumen.confidence,
        active: false, // Deferred V2
      },
      championships: {
        score: components.championships.score,
        confidence: components.championships.confidence,
        active: components.championships.confidence > 0 && components.championships.score != null,
      },
      consistency: {
        score: components.consistency.score,
        confidence: components.consistency.confidence,
        active: components.consistency.confidence > 0 && components.consistency.score != null,
      },
    },
    dataSourceSummary: record.dataSourceSummary || 'No data yet',
    activeSince: record.activeSince?.toISOString() || null,
    lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString(),
  }
}

// ─── Batch Recompute ─────────────────────────────────────────────────

async function recomputeAllV2(prisma) {
  // Find all users who have any ratable data
  const [historyUsers, draftUsers, lineupUsers, predictionUsers] = await Promise.all([
    prisma.historicalSeason.groupBy({ by: ['ownerUserId'], where: { ownerUserId: { not: null } } }),
    prisma.draftGrade.findMany({
      select: { team: { select: { userId: true } } },
      distinct: ['teamId'],
    }),
    prisma.lineupSnapshot.findMany({
      select: { team: { select: { userId: true } } },
      distinct: ['teamId'],
    }),
    prisma.prediction.groupBy({
      by: ['userId'],
      where: { outcome: { in: ['CORRECT', 'INCORRECT'] } },
    }),
  ])

  // Collect unique user IDs
  const userIds = new Set()
  for (const r of historyUsers) { if (r.ownerUserId) userIds.add(r.ownerUserId) }
  for (const r of draftUsers) { if (r.team?.userId) userIds.add(r.team.userId) }
  for (const r of lineupUsers) { if (r.team?.userId) userIds.add(r.team.userId) }
  for (const r of predictionUsers) { userIds.add(r.userId) }

  let computed = 0
  let skipped = 0
  const errors = []

  for (const userId of userIds) {
    try {
      await calculateRatingForUser(userId, prisma)
      computed++
    } catch (err) {
      console.error(`[ClutchRating V2] Failed for user ${userId}:`, err.message)
      errors.push({ userId, error: err.message })
      skipped++
    }
  }

  console.log(`[ClutchRating V2] Recompute complete: ${computed} computed, ${skipped} skipped`)
  return { computed, skipped, errors }
}

// ─── Get Rating (from DB, no recompute) ──────────────────────────────

async function getRating(userId, prisma) {
  const record = await prisma.clutchManagerRating.findUnique({
    where: { userId },
  })

  if (!record || record.version < 2) return null
  return formatRatingResponse(record)
}

module.exports = {
  calculateRatingForUser,
  recomputeAllV2,
  getRating,
  formatRatingResponse,
  getTier,
  COMPONENT_WEIGHTS,
  TIER_MAP,
}
