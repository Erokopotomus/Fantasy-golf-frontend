/**
 * Prediction Engine Service
 *
 * Handles prediction submission, resolution, accuracy tracking,
 * and reputation/tier management.
 *
 * Language rules (from CLAUDE.md):
 *  - "Performance Calls" not "picks" or "bets"
 *  - "Player Benchmarks" not "over/under"
 *  - "Projections" not "odds"
 */

const { recordEvent } = require('./opinionTimelineService')

const TIERS = ['rookie', 'contender', 'sharp', 'expert', 'elite']
const TIER_THRESHOLDS = {
  rookie: { minPredictions: 0, minAccuracy: 0 },
  contender: { minPredictions: 20, minAccuracy: 0.50 },
  sharp: { minPredictions: 50, minAccuracy: 0.58 },
  expert: { minPredictions: 100, minAccuracy: 0.65 },
  elite: { minPredictions: 200, minAccuracy: 0.72 },
}

const PREDICTION_TYPES = [
  'performance_call',   // start/sit
  'player_benchmark',   // over/under a stat line
  'weekly_winner',      // who wins this week's matchup
  'bold_call',          // unlikely outcome prediction
]

/**
 * Submit a new prediction.
 * Validates type, checks deadline, and creates the record.
 */
async function submitPrediction(userId, data, prisma) {
  const {
    sport,
    predictionType,
    category = 'weekly',
    eventId,
    subjectPlayerId,
    leagueId,
    predictionData,
    isPublic = true,
    locksAt,
    thesis,
    confidenceLevel,
    keyFactors,
  } = data

  // Validate prediction type
  if (!PREDICTION_TYPES.includes(predictionType)) {
    throw new Error(`Invalid prediction type: ${predictionType}`)
  }

  // Validate sport
  if (!['golf', 'nfl', 'nba', 'mlb'].includes(sport)) {
    throw new Error(`Invalid sport: ${sport}`)
  }

  // Auto-calculate locksAt from tournament startDate for golf predictions
  let effectiveLocksAt = locksAt ? new Date(locksAt) : null
  if (!effectiveLocksAt && eventId && sport === 'golf') {
    const tournament = await prisma.tournament.findUnique({
      where: { id: eventId },
      select: { startDate: true, status: true },
    })
    if (tournament) {
      if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
        throw new Error('Predictions are locked — this tournament has already started')
      }
      if (tournament.startDate) {
        effectiveLocksAt = tournament.startDate
      }
    }
  }

  // Check deadline — reject if locked
  if (effectiveLocksAt && effectiveLocksAt <= new Date()) {
    throw new Error('Predictions are locked — this tournament has already started')
  }

  // Check for duplicate prediction (same user, same event, same subject, same type)
  if (eventId && subjectPlayerId) {
    const existing = await prisma.prediction.findFirst({
      where: {
        userId,
        eventId,
        subjectPlayerId,
        predictionType,
        outcome: 'PENDING',
      },
    })
    if (existing) {
      throw new Error('You already have a pending prediction for this')
    }
  }

  const prediction = await prisma.prediction.create({
    data: {
      userId,
      sport,
      predictionType,
      category,
      eventId,
      subjectPlayerId,
      leagueId: leagueId || null,
      predictionData,
      isPublic,
      locksAt: effectiveLocksAt || null,
      outcome: 'PENDING',
      thesis: thesis || null,
      confidenceLevel: confidenceLevel != null ? Math.min(5, Math.max(1, parseInt(confidenceLevel))) : null,
      keyFactors: Array.isArray(keyFactors) && keyFactors.length > 0 ? keyFactors : null,
    },
  })

  // Fire-and-forget: opinion timeline
  if (subjectPlayerId) {
    recordEvent(userId, subjectPlayerId, sport, 'PREDICTION_MADE', {
      predictionType, thesis: thesis || null,
      confidence: confidenceLevel || null,
    }, prediction.id, 'Prediction').catch(() => {})
  }

  return prediction
}

/**
 * Update an existing prediction (only if still PENDING and not locked).
 */
async function updatePrediction(predictionId, userId, updates, prisma) {
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
  })

  if (!prediction) throw new Error('Prediction not found')
  if (prediction.userId !== userId) throw new Error('Not your prediction')
  if (prediction.outcome !== 'PENDING') throw new Error('Prediction already resolved')
  if (prediction.locksAt && new Date(prediction.locksAt) <= new Date()) {
    throw new Error('Prediction is locked')
  }

  return prisma.prediction.update({
    where: { id: predictionId },
    data: {
      predictionData: updates.predictionData || prediction.predictionData,
      isPublic: updates.isPublic !== undefined ? updates.isPublic : prediction.isPublic,
      thesis: updates.thesis !== undefined ? (updates.thesis || null) : prediction.thesis,
      confidenceLevel: updates.confidenceLevel !== undefined
        ? (updates.confidenceLevel != null ? Math.min(5, Math.max(1, parseInt(updates.confidenceLevel))) : null)
        : prediction.confidenceLevel,
      keyFactors: updates.keyFactors !== undefined
        ? (Array.isArray(updates.keyFactors) && updates.keyFactors.length > 0 ? updates.keyFactors : null)
        : prediction.keyFactors,
    },
  })
}

/**
 * Delete a pending prediction.
 */
async function deletePrediction(predictionId, userId, prisma) {
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
  })

  if (!prediction) throw new Error('Prediction not found')
  if (prediction.userId !== userId) throw new Error('Not your prediction')
  if (prediction.outcome !== 'PENDING') throw new Error('Cannot delete resolved prediction')

  await prisma.prediction.delete({ where: { id: predictionId } })
  return { deleted: true }
}

/**
 * Resolve a single prediction.
 * Called by the scoring pipeline or admin.
 */
async function resolvePrediction(predictionId, outcome, accuracyScore, prisma) {
  if (!['CORRECT', 'INCORRECT', 'PUSH', 'VOIDED'].includes(outcome)) {
    throw new Error(`Invalid outcome: ${outcome}`)
  }

  const prediction = await prisma.prediction.update({
    where: { id: predictionId },
    data: {
      outcome,
      accuracyScore: accuracyScore != null ? accuracyScore : (outcome === 'CORRECT' ? 1.0 : 0.0),
      resolvedAt: new Date(),
    },
  })

  // Update user reputation (skip VOIDED and PUSH)
  if (outcome === 'CORRECT' || outcome === 'INCORRECT') {
    await updateReputation(prediction.userId, prediction.sport, prisma)
  }

  // Fire-and-forget: opinion timeline
  if (prediction.subjectPlayerId) {
    recordEvent(prediction.userId, prediction.subjectPlayerId, prediction.sport, 'PREDICTION_RESOLVED', {
      outcome, accuracy: accuracyScore, thesis: prediction.thesis || null,
    }, prediction.id, 'Prediction').catch(() => {})
  }

  return prediction
}

/**
 * Batch resolve predictions for an event.
 * Used by the tournament finalization cron to resolve all predictions for a completed event.
 */
async function resolveEventPredictions(eventId, resolverFn, prisma) {
  const pending = await prisma.prediction.findMany({
    where: { eventId, outcome: 'PENDING' },
  })

  const results = { resolved: 0, correct: 0, incorrect: 0, voided: 0, push: 0 }
  const affectedUsers = new Set()

  for (const prediction of pending) {
    try {
      const { outcome, accuracyScore } = await resolverFn(prediction)

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          outcome,
          accuracyScore: accuracyScore != null ? accuracyScore : (outcome === 'CORRECT' ? 1.0 : 0.0),
          resolvedAt: new Date(),
        },
      })

      results.resolved++
      results[outcome.toLowerCase()]++

      if (outcome === 'CORRECT' || outcome === 'INCORRECT') {
        affectedUsers.add(prediction.userId)
      }
    } catch (err) {
      console.error(`Failed to resolve prediction ${prediction.id}:`, err.message)
    }
  }

  // Batch update reputations for all affected users
  for (const userId of affectedUsers) {
    try {
      // Update per-sport reputation
      const sports = [...new Set(pending.filter(p => p.userId === userId).map(p => p.sport))]
      for (const sport of sports) {
        await updateReputation(userId, sport, prisma)
      }
      // Update all-sports aggregate
      await updateReputation(userId, 'all', prisma)
    } catch (err) {
      console.error(`Failed to update reputation for user ${userId}:`, err.message)
    }
  }

  return results
}

/**
 * Recompute user reputation from all resolved predictions.
 */
async function updateReputation(userId, sport, prisma) {
  const where = { userId }
  if (sport !== 'all') {
    where.sport = sport
  }

  const resolved = await prisma.prediction.findMany({
    where: {
      ...where,
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    },
    orderBy: { resolvedAt: 'asc' },
    select: { outcome: true, accuracyScore: true, predictionData: true, resolvedAt: true },
  })

  if (resolved.length === 0) return

  const total = resolved.length
  const correct = resolved.filter(p => p.outcome === 'CORRECT').length
  const accuracy = total > 0 ? correct / total : 0

  // Compute streaks
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0

  for (const p of resolved) {
    if (p.outcome === 'CORRECT') {
      tempStreak++
      if (tempStreak > bestStreak) bestStreak = tempStreak
    } else {
      tempStreak = 0
    }
  }
  // Current streak = count backwards from end
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i].outcome === 'CORRECT') {
      currentStreak++
    } else {
      break
    }
  }

  // Confidence score — weighted accuracy factoring prediction confidence
  let weightedCorrect = 0
  let totalWeight = 0
  for (const p of resolved) {
    const conf = p.predictionData?.confidence || 'medium'
    const weight = conf === 'high' ? 1.5 : conf === 'low' ? 0.75 : 1.0
    totalWeight += weight
    if (p.outcome === 'CORRECT') {
      weightedCorrect += weight
    }
  }
  const confidenceScore = totalWeight > 0 ? weightedCorrect / totalWeight : 0

  // Determine tier
  const tier = computeTier(total, accuracy)

  // Check for new badges
  const badges = await checkBadges(userId, sport, { total, correct, accuracy, currentStreak, bestStreak }, prisma)

  await prisma.userReputation.upsert({
    where: { userId_sport: { userId, sport } },
    create: {
      userId,
      sport,
      totalPredictions: total,
      correctPredictions: correct,
      accuracyRate: Math.round(accuracy * 10000) / 10000,
      streakCurrent: currentStreak,
      streakBest: bestStreak,
      confidenceScore: Math.round(confidenceScore * 10000) / 10000,
      tier,
      badges,
    },
    update: {
      totalPredictions: total,
      correctPredictions: correct,
      accuracyRate: Math.round(accuracy * 10000) / 10000,
      streakCurrent: currentStreak,
      streakBest: bestStreak,
      confidenceScore: Math.round(confidenceScore * 10000) / 10000,
      tier,
      badges,
    },
  })
}

/**
 * Compute tier based on total predictions and accuracy rate.
 * Minimum 20 predictions to earn a tier above rookie.
 */
function computeTier(total, accuracy) {
  let tier = 'rookie'
  for (const t of TIERS) {
    const { minPredictions, minAccuracy } = TIER_THRESHOLDS[t]
    if (total >= minPredictions && accuracy >= minAccuracy) {
      tier = t
    }
  }
  return tier
}

/**
 * Check and return earned badges.
 * Checks streaks, volume, accuracy, upset calls, and iron predictor.
 */
async function checkBadges(userId, sport, stats, prisma) {
  const badges = []
  const now = new Date().toISOString()

  // Hot Streak badges
  if (stats.bestStreak >= 5) badges.push({ type: 'hot_streak_5', name: 'Hot Streak', tier: 'bronze', earnedAt: now })
  if (stats.bestStreak >= 10) badges.push({ type: 'hot_streak_10', name: 'On Fire', tier: 'silver', earnedAt: now })
  if (stats.bestStreak >= 20) badges.push({ type: 'hot_streak_20', name: 'Unstoppable', tier: 'gold', earnedAt: now })

  // Volume badges
  if (stats.total >= 50) badges.push({ type: 'volume_50', name: 'Getting Started', tier: 'bronze', earnedAt: now })
  if (stats.total >= 100) badges.push({ type: 'volume_100', name: 'Dedicated', tier: 'silver', earnedAt: now })
  if (stats.total >= 500) badges.push({ type: 'volume_500', name: 'Prediction Machine', tier: 'gold', earnedAt: now })

  // Sharpshooter — 80%+ accuracy overall with 10+ resolved predictions
  if (stats.total >= 10 && stats.accuracy >= 0.80) {
    badges.push({ type: 'sharpshooter', name: 'Sharpshooter', tier: 'gold', earnedAt: now })
  }

  // Upset Caller — had a correct call where <20% of community agreed
  try {
    const upsetCalls = await prisma.prediction.findMany({
      where: {
        userId,
        outcome: 'CORRECT',
        ...(sport !== 'all' ? { sport } : {}),
        eventId: { not: null },
        subjectPlayerId: { not: null },
        isPublic: true,
      },
      select: { eventId: true, subjectPlayerId: true, predictionType: true, predictionData: true },
      take: 50,
      orderBy: { resolvedAt: 'desc' },
    })

    for (const call of upsetCalls) {
      const allForTarget = await prisma.prediction.count({
        where: {
          eventId: call.eventId,
          subjectPlayerId: call.subjectPlayerId,
          predictionType: call.predictionType,
          isPublic: true,
          outcome: { in: ['CORRECT', 'INCORRECT'] },
        },
      })
      if (allForTarget < 5) continue

      const direction = call.predictionData?.direction || call.predictionData?.action
      const sameDirection = await prisma.prediction.count({
        where: {
          eventId: call.eventId,
          subjectPlayerId: call.subjectPlayerId,
          predictionType: call.predictionType,
          isPublic: true,
          predictionData: { path: ['direction'], equals: direction },
        },
      })
      const pct = sameDirection / allForTarget
      if (pct < 0.20) {
        badges.push({ type: 'upset_caller', name: 'Upset Caller', tier: 'gold', earnedAt: now })
        break
      }
    }
  } catch { /* skip if query fails */ }

  // Bold & Right — correct bold_call prediction
  try {
    const boldCorrect = await prisma.prediction.count({
      where: {
        userId,
        predictionType: 'bold_call',
        outcome: 'CORRECT',
        ...(sport !== 'all' ? { sport } : {}),
      },
    })
    if (boldCorrect >= 1) badges.push({ type: 'bold_and_right', name: 'Bold & Right', tier: 'silver', earnedAt: now })
    if (boldCorrect >= 5) badges.push({ type: 'bold_and_right_5', name: 'Fearless', tier: 'gold', earnedAt: now })
  } catch { /* skip */ }

  // Iron Predictor — made predictions in 10+ consecutive weeks
  try {
    const weeklyPredictions = await prisma.prediction.findMany({
      where: {
        userId,
        ...(sport !== 'all' ? { sport } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    if (weeklyPredictions.length > 0) {
      const weeks = new Set()
      for (const p of weeklyPredictions) {
        const d = new Date(p.createdAt)
        const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), 0, 1).getDay()) / 7)}`
        weeks.add(weekKey)
      }
      const sortedWeeks = [...weeks].sort()
      let maxConsecutive = 1
      let consecutive = 1
      for (let i = 1; i < sortedWeeks.length; i++) {
        // Simple consecutive check — if weeks are adjacent
        const [y1, w1] = sortedWeeks[i - 1].split('-W').map(Number)
        const [y2, w2] = sortedWeeks[i].split('-W').map(Number)
        if ((y1 === y2 && w2 === w1 + 1) || (y2 === y1 + 1 && w1 >= 52 && w2 <= 1)) {
          consecutive++
          if (consecutive > maxConsecutive) maxConsecutive = consecutive
        } else {
          consecutive = 1
        }
      }
      if (maxConsecutive >= 10) badges.push({ type: 'iron_predictor', name: 'Iron Predictor', tier: 'gold', earnedAt: now })
      if (maxConsecutive >= 20) badges.push({ type: 'iron_predictor_20', name: 'Never Miss', tier: 'platinum', earnedAt: now })
    }
  } catch { /* skip */ }

  return badges
}

/**
 * Get leaderboard for a sport + timeframe.
 */
async function getLeaderboard(sport, options = {}, prisma) {
  const { timeframe = 'all', leagueId, limit = 50, offset = 0 } = options

  if (timeframe === 'weekly' || leagueId) {
    // Weekly leaderboard or league-level — use raw SQL for flexibility
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Build dynamic WHERE clauses
    const conditions = []
    const params = []

    if (timeframe === 'weekly') {
      conditions.push(`p."resolvedAt" >= $${params.length + 1}`)
      params.push(weekAgo)
    }
    if (sport !== 'all') {
      conditions.push(`p.sport = $${params.length + 1}`)
      params.push(sport)
    }
    if (leagueId) {
      conditions.push(`p."leagueId" = $${params.length + 1}`)
      params.push(leagueId)
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    const sql = `
      SELECT
        p."userId",
        u.name,
        u.avatar,
        COUNT(*) FILTER (WHERE p.outcome IN ('CORRECT', 'INCORRECT')) as total,
        COUNT(*) FILTER (WHERE p.outcome = 'CORRECT') as correct,
        CASE
          WHEN COUNT(*) FILTER (WHERE p.outcome IN ('CORRECT', 'INCORRECT')) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE p.outcome = 'CORRECT')::numeric /
               COUNT(*) FILTER (WHERE p.outcome IN ('CORRECT', 'INCORRECT'))::numeric, 4)
          ELSE 0
        END as accuracy
      FROM predictions p
      JOIN users u ON u.id = p."userId"
      ${whereClause}
      GROUP BY p."userId", u.name, u.avatar
      HAVING COUNT(*) FILTER (WHERE p.outcome IN ('CORRECT', 'INCORRECT')) >= ${leagueId ? 1 : 3}
      ORDER BY accuracy DESC, correct DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    params.push(limit, offset)

    const results = await prisma.$queryRawUnsafe(sql, ...params)

    return results.map((r, i) => ({
      rank: offset + i + 1,
      userId: r.userId,
      name: r.name,
      avatar: r.avatar,
      total: Number(r.total),
      correct: Number(r.correct),
      accuracy: Number(r.accuracy),
    }))
  }

  // All-time leaderboard from user_reputation table
  const where = { totalPredictions: { gte: 5 } }
  if (sport !== 'all') {
    where.sport = sport
  }

  const reputations = await prisma.userReputation.findMany({
    where,
    orderBy: [{ accuracyRate: 'desc' }, { totalPredictions: 'desc' }],
    include: { user: { select: { name: true, avatar: true } } },
    take: limit,
    skip: offset,
  })

  return reputations.map((r, i) => ({
    rank: offset + i + 1,
    userId: r.userId,
    name: r.user.name,
    avatar: r.user.avatar,
    total: r.totalPredictions,
    correct: r.correctPredictions,
    accuracy: r.accuracyRate,
    streak: r.streakCurrent,
    bestStreak: r.streakBest,
    tier: r.tier,
    badges: r.badges,
  }))
}

/**
 * Get user's prediction history and reputation.
 */
async function getUserPredictions(userId, options = {}, prisma) {
  const { sport, predictionType, outcome, limit = 50, offset = 0 } = options

  const where = { userId }
  if (sport) where.sport = sport
  if (predictionType) where.predictionType = predictionType
  if (outcome) where.outcome = outcome

  const [predictions, total] = await Promise.all([
    prisma.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.prediction.count({ where }),
  ])

  return { predictions, total, limit, offset }
}

/**
 * Get user reputation across all sports.
 */
async function getUserReputation(userId, prisma) {
  const reputations = await prisma.userReputation.findMany({
    where: { userId },
  })

  const bySport = {}
  let overall = null
  for (const r of reputations) {
    if (r.sport === 'all') {
      overall = r
    } else {
      bySport[r.sport] = r
    }
  }

  return { overall, bySport }
}

/**
 * Get community consensus for a specific prediction target.
 * Returns % of users who chose each direction.
 */
async function getCommunityConsensus(eventId, subjectPlayerId, predictionType, prisma) {
  const predictions = await prisma.prediction.findMany({
    where: {
      eventId,
      subjectPlayerId,
      predictionType,
      isPublic: true,
    },
    select: { predictionData: true },
  })

  if (predictions.length === 0) return { total: 0, consensus: {} }

  // Count by direction/action
  const counts = {}
  for (const p of predictions) {
    const key = p.predictionData?.direction || p.predictionData?.action || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  }

  const consensus = {}
  for (const [key, count] of Object.entries(counts)) {
    consensus[key] = Math.round((count / predictions.length) * 100)
  }

  return { total: predictions.length, consensus }
}

/**
 * Get open predictions for an event (the "slate").
 */
async function getEventSlate(eventId, options = {}, prisma) {
  const { sport, predictionType, limit = 50 } = options

  const where = {
    eventId,
    outcome: 'PENDING',
  }
  if (sport) where.sport = sport
  if (predictionType) where.predictionType = predictionType

  // Only return open (unlocked) predictions
  where.OR = [
    { locksAt: null },
    { locksAt: { gt: new Date() } },
  ]

  const predictions = await prisma.prediction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      sport: true,
      predictionType: true,
      eventId: true,
      subjectPlayerId: true,
      predictionData: true,
      locksAt: true,
      createdAt: true,
    },
  })

  return predictions
}

/**
 * Golf-specific resolver for player_benchmark predictions.
 * Called by resolveEventPredictions with tournament performance data.
 */
function resolveGolfBenchmark(prediction, performance) {
  const data = prediction.predictionData
  if (!data?.benchmarkValue || !data?.direction) {
    return { outcome: 'VOIDED', accuracyScore: null }
  }

  let actualValue
  const stat = data.stat || data.metric || 'sgTotal'
  if (stat === 'position') actualValue = performance?.position
  else if (stat === 'totalToPar') actualValue = performance?.totalToPar
  else if (stat === 'sgTotal') actualValue = performance?.sgTotal
  else if (stat === 'birdies') actualValue = performance?.birdies
  else actualValue = performance?.[stat]

  if (actualValue == null) {
    // Player withdrew or didn't play — void
    return { outcome: 'VOIDED', accuracyScore: null }
  }

  const benchmark = data.benchmarkValue
  const direction = data.direction // 'over' or 'under'

  // For position, lower is better → 'under' means they finished better
  if (direction === 'over') {
    if (actualValue > benchmark) return { outcome: 'CORRECT', accuracyScore: 1.0 }
    if (actualValue === benchmark) return { outcome: 'PUSH', accuracyScore: null }
    return { outcome: 'INCORRECT', accuracyScore: 0.0 }
  } else {
    if (actualValue < benchmark) return { outcome: 'CORRECT', accuracyScore: 1.0 }
    if (actualValue === benchmark) return { outcome: 'PUSH', accuracyScore: null }
    return { outcome: 'INCORRECT', accuracyScore: 0.0 }
  }
}

module.exports = {
  submitPrediction,
  updatePrediction,
  deletePrediction,
  resolvePrediction,
  resolveEventPredictions,
  updateReputation,
  computeTier,
  getLeaderboard,
  getUserPredictions,
  getUserReputation,
  getCommunityConsensus,
  getEventSlate,
  resolveGolfBenchmark,
  TIERS,
  TIER_THRESHOLDS,
  PREDICTION_TYPES,
}
