/**
 * Clutch Rating Engine
 *
 * Computes a 0-100 composite Clutch Rating for each manager:
 *   Rating = Accuracy(40%) + Consistency(25%) + Volume(20%) + Breadth(15%)
 *
 * Minimum 50 graded calls to receive a rating.
 *
 * Tier thresholds:
 *   90+ Elite, 80+ Expert, 70+ Sharp, 60+ Solid, 50+ Average, <50 Developing
 *
 * Trend: Compare current vs 30-day-ago rating. >3 up, <-3 down, else stable.
 */

const MIN_GRADED_CALLS = 50
const RECENCY_WINDOW_DAYS = 90
const TREND_WINDOW_DAYS = 30
const TREND_THRESHOLD = 3

const TIER_MAP = [
  { min: 90, tier: 'elite' },
  { min: 80, tier: 'expert' },
  { min: 70, tier: 'sharp' },
  { min: 60, tier: 'solid' },
  { min: 50, tier: 'average' },
  { min: 0,  tier: 'developing' },
]

function getTier(rating) {
  if (rating == null) return 'developing'
  for (const { min, tier } of TIER_MAP) {
    if (rating >= min) return tier
  }
  return 'developing'
}

/**
 * Compute accuracy component (0-100).
 * Weighted accuracy with 90-day recency decay.
 */
function computeAccuracy(predictions) {
  if (predictions.length === 0) return 0

  const now = Date.now()
  const decayMs = RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  let weightedCorrect = 0
  let totalWeight = 0

  for (const p of predictions) {
    const resolvedAt = p.resolvedAt ? new Date(p.resolvedAt).getTime() : now
    const age = now - resolvedAt
    // Exponential decay: weight = e^(-age/decayWindow)
    const weight = Math.exp(-age / decayMs)
    totalWeight += weight
    if (p.outcome === 'CORRECT') {
      weightedCorrect += weight
    }
  }

  if (totalWeight === 0) return 0
  return Math.round((weightedCorrect / totalWeight) * 100)
}

/**
 * Compute consistency component (0-100).
 * Inverse of weekly accuracy standard deviation.
 * Lower variance = higher score.
 */
function computeConsistency(predictions) {
  if (predictions.length < 10) return 50 // Default to average if too few

  // Group by week
  const weekMap = {}
  for (const p of predictions) {
    const d = new Date(p.resolvedAt || p.createdAt)
    const weekKey = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
    if (!weekMap[weekKey]) weekMap[weekKey] = { correct: 0, total: 0 }
    weekMap[weekKey].total++
    if (p.outcome === 'CORRECT') weekMap[weekKey].correct++
  }

  const weeklyAccuracies = Object.values(weekMap)
    .filter(w => w.total >= 2) // Only weeks with 2+ calls
    .map(w => w.correct / w.total)

  if (weeklyAccuracies.length < 3) return 50

  const mean = weeklyAccuracies.reduce((a, b) => a + b, 0) / weeklyAccuracies.length
  const variance = weeklyAccuracies.reduce((sum, v) => sum + (v - mean) ** 2, 0) / weeklyAccuracies.length
  const stdDev = Math.sqrt(variance)

  // Convert stdDev to 0-100 score: stdDev of 0 = 100, stdDev of 0.5 = 0
  const score = Math.max(0, Math.min(100, Math.round((1 - stdDev / 0.5) * 100)))
  return score
}

/**
 * Compute volume component (0-100).
 * Log-scaled prediction count from last 90 days.
 * 50 calls = ~50, 200 calls = ~80, 500+ calls = ~100
 */
function computeVolume(recentCount) {
  if (recentCount <= 0) return 0
  // log2 scaling: log2(50)=5.6, log2(200)=7.6, log2(500)=8.9
  // Map 0-log2(500) → 0-100
  const maxLog = Math.log2(500)
  const score = Math.min(100, Math.round((Math.log2(recentCount) / maxLog) * 100))
  return score
}

/**
 * Compute breadth component (0-100).
 * Based on unique prediction types used + sports coverage.
 * Max types = 4 (performance_call, player_benchmark, weekly_winner, bold_call)
 * Max sports = 4 (golf, nfl, nba, mlb)
 */
function computeBreadth(predictions) {
  if (predictions.length === 0) return 0

  const types = new Set()
  const sports = new Set()
  for (const p of predictions) {
    types.add(p.predictionType)
    sports.add(p.sport)
  }

  // Types contribute 60%, sports 40%
  const typeScore = (types.size / 4) * 60
  const sportScore = (sports.size / 4) * 40
  return Math.min(100, Math.round(typeScore + sportScore))
}

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

/**
 * Compute Clutch Rating for a single user.
 */
async function computeClutchRating(userId, prisma) {
  // Get all resolved predictions for this user
  const allResolved = await prisma.prediction.findMany({
    where: {
      userId,
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    },
    select: {
      outcome: true,
      resolvedAt: true,
      createdAt: true,
      predictionType: true,
      sport: true,
    },
    orderBy: { resolvedAt: 'asc' },
  })

  const totalGraded = allResolved.length
  if (totalGraded < MIN_GRADED_CALLS) {
    // Not enough calls — store as unrated
    return prisma.clutchManagerRating.upsert({
      where: { userId },
      create: {
        userId,
        overallRating: null,
        accuracyComponent: null,
        consistencyComponent: null,
        volumeComponent: null,
        breadthComponent: null,
        tier: 'developing',
        trend: 'stable',
        totalGradedCalls: totalGraded,
        computationInputs: { reason: 'insufficient_calls', needed: MIN_GRADED_CALLS },
      },
      update: {
        overallRating: null,
        accuracyComponent: null,
        consistencyComponent: null,
        volumeComponent: null,
        breadthComponent: null,
        tier: 'developing',
        trend: 'stable',
        totalGradedCalls: totalGraded,
        computationInputs: { reason: 'insufficient_calls', needed: MIN_GRADED_CALLS },
      },
    })
  }

  // Filter recent predictions (last 90 days) for volume calc
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENCY_WINDOW_DAYS)
  const recentPredictions = allResolved.filter(p => {
    const d = new Date(p.resolvedAt || p.createdAt)
    return d >= cutoff
  })

  // Compute components
  const accuracy = computeAccuracy(allResolved)
  const consistency = computeConsistency(allResolved)
  const volume = computeVolume(recentPredictions.length)
  const breadth = computeBreadth(allResolved)

  // Weighted composite
  const overall = Math.round(
    accuracy * 0.40 +
    consistency * 0.25 +
    volume * 0.20 +
    breadth * 0.15
  )

  const tier = getTier(overall)

  // Compute trend: compare to existing rating
  let trend = 'stable'
  const existing = await prisma.clutchManagerRating.findUnique({
    where: { userId },
    select: { overallRating: true, updatedAt: true },
  })

  if (existing?.overallRating != null) {
    const daysSinceUpdate = (Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate >= 1) { // Only compute trend if at least 1 day has passed
      const diff = overall - existing.overallRating
      if (diff > TREND_THRESHOLD) trend = 'up'
      else if (diff < -TREND_THRESHOLD) trend = 'down'
    }
  }

  return prisma.clutchManagerRating.upsert({
    where: { userId },
    create: {
      userId,
      overallRating: overall,
      accuracyComponent: accuracy,
      consistencyComponent: consistency,
      volumeComponent: volume,
      breadthComponent: breadth,
      tier,
      trend,
      totalGradedCalls: totalGraded,
      computationInputs: {
        totalResolved: allResolved.length,
        recentCount: recentPredictions.length,
        uniqueTypes: [...new Set(allResolved.map(p => p.predictionType))],
        uniqueSports: [...new Set(allResolved.map(p => p.sport))],
      },
    },
    update: {
      overallRating: overall,
      accuracyComponent: accuracy,
      consistencyComponent: consistency,
      volumeComponent: volume,
      breadthComponent: breadth,
      tier,
      trend,
      totalGradedCalls: totalGraded,
      computationInputs: {
        totalResolved: allResolved.length,
        recentCount: recentPredictions.length,
        uniqueTypes: [...new Set(allResolved.map(p => p.predictionType))],
        uniqueSports: [...new Set(allResolved.map(p => p.sport))],
      },
    },
  })
}

/**
 * Recompute Clutch Rating for all users who have resolved predictions.
 */
async function recomputeAll(prisma) {
  // Find all users with resolved predictions
  const usersWithPredictions = await prisma.prediction.groupBy({
    by: ['userId'],
    where: { outcome: { in: ['CORRECT', 'INCORRECT'] } },
    _count: true,
  })

  let computed = 0
  let skipped = 0

  for (const { userId } of usersWithPredictions) {
    try {
      await computeClutchRating(userId, prisma)
      computed++
    } catch (err) {
      console.error(`[ClutchRating] Failed for user ${userId}:`, err.message)
      skipped++
    }
  }

  return { computed, skipped }
}

module.exports = {
  computeClutchRating,
  recomputeAll,
  getTier,
  MIN_GRADED_CALLS,
  TIER_MAP,
}
