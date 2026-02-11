/**
 * AI Insight Pipeline (Phase 6C)
 *
 * Orchestrator that runs on schedule, determines which insights to
 * generate for each user, calls the pattern engine and AI service,
 * and stores results.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const patternEngine = require('./patternEngine')
const aiCoachService = require('./aiCoachService')

// All available insight types
const INSIGHT_TYPES = [
  'POSITION_BIAS_ALERT',
  'PREDICTION_PATTERN',
  'TAG_ACCURACY_UPDATE',
  'BOARD_DIVERGENCE_TREND',
  'RESEARCH_INTENSITY',
  'WAIVER_PATTERN',
  'LINEUP_POINTS_LEFT',
  'CAPTURE_CALLBACK',
  'DRAFT_PREP_READINESS',
  'OPINION_EVOLUTION',
  'SEASON_MILESTONE',
]

// Data requirements per insight type
const INSIGHT_REQUIREMENTS = {
  POSITION_BIAS_ALERT: (p) => p.draftPatterns?.hasDraftData && p.draftPatterns?.positionAllocation?.flags?.length > 0,
  PREDICTION_PATTERN: (p) => p.predictionPatterns?.hasPredictionData && p.predictionPatterns?.resolved >= 5,
  TAG_ACCURACY_UPDATE: (p) => p.draftPatterns?.boardTagAccuracy?.total >= 5,
  BOARD_DIVERGENCE_TREND: (p) => p.draftPatterns?.boardAdherence != null,
  RESEARCH_INTENSITY: (p) => p.capturePatterns?.hasCaptureData && p.capturePatterns?.totalCaptures >= 5,
  WAIVER_PATTERN: (p) => p.rosterPatterns?.waiverTendencies?.wonClaims >= 3,
  LINEUP_POINTS_LEFT: (p) => p.rosterPatterns?.lineupOptimality?.weeksWithScoring >= 3,
  CAPTURE_CALLBACK: (p) => p.capturePatterns?.sentimentAccuracy?.total >= 3,
  DRAFT_PREP_READINESS: (p) => p.draftPatterns?.hasDraftData,
  OPINION_EVOLUTION: (p) => (p.tendencies?.length || 0) + (p.biases?.length || 0) >= 2,
  SEASON_MILESTONE: (p) => (p.predictionPatterns?.totalPredictions || 0) >= 10 || (p.capturePatterns?.totalCaptures || 0) >= 10,
}

/**
 * Run the daily insight pipeline for all active users.
 * Generates up to 3 insights per user per day.
 */
async function runDailyInsightPipeline() {
  const activeUsers = await getActiveUsers()
  let totalGenerated = 0
  let totalSkipped = 0

  for (const user of activeUsers) {
    try {
      const generated = await generateInsightsForUser(user.id)
      totalGenerated += generated
    } catch (err) {
      totalSkipped++
      console.error(`[InsightPipeline] Failed for user ${user.id}:`, err.message)
    }
  }

  return { totalGenerated, totalSkipped, usersProcessed: activeUsers.length }
}

/**
 * Generate up to 3 insights for a specific user.
 */
async function generateInsightsForUser(userId, maxInsights = 3) {
  // Get existing active insights to avoid duplicates
  const existingInsights = await prisma.aiInsight.findMany({
    where: { userId, status: 'active' },
    select: { insightType: true },
  })
  const existingTypes = new Set(existingInsights.map(i => i.insightType))

  // Get user profiles for both sports
  let generated = 0
  for (const sport of ['nfl', 'golf']) {
    if (generated >= maxInsights) break

    let profile
    try {
      profile = await patternEngine.getUserProfile(userId, sport)
    } catch {
      continue
    }
    if (!profile) continue

    // Determine eligible insight types
    const eligibleTypes = INSIGHT_TYPES.filter(type => {
      if (existingTypes.has(type)) return false // already active
      const checker = INSIGHT_REQUIREMENTS[type]
      return checker ? checker(profile) : false
    })

    // Shuffle to vary which insights get generated
    const shuffled = eligibleTypes.sort(() => Math.random() - 0.5)

    for (const type of shuffled) {
      if (generated >= maxInsights) break

      try {
        const insight = await aiCoachService.generateAmbientInsight(userId, sport, type, profile)
        if (insight && insight.title && insight.body) {
          await storeInsight(userId, insight)
          generated++
        }
      } catch (err) {
        console.error(`[InsightPipeline] Failed to generate ${type} for user ${userId}:`, err.message)
      }
    }
  }

  return generated
}

/**
 * Store a generated insight in the database.
 */
async function storeInsight(userId, insight) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 1 week expiry

  return prisma.aiInsight.create({
    data: {
      userId,
      sport: insight.sport || null,
      insightType: insight.insightType,
      title: insight.title,
      body: insight.body,
      metadata: insight.metadata || null,
      priority: insight.priority || 5,
      status: 'active',
      expiresAt,
      tokenCount: insight.tokenCount || null,
    },
  })
}

/**
 * Get active users (had activity in last 30 days).
 */
async function getActiveUsers() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  return prisma.user.findMany({
    where: {
      OR: [
        { labCaptures: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { predictions: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { boardActivities: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { opinionEvents: { some: { createdAt: { gte: thirtyDaysAgo } } } },
      ],
    },
    select: { id: true },
  })
}

/**
 * Get active insights for a user.
 */
async function getActiveInsights(userId, { sport, limit = 20 } = {}) {
  const where = { userId, status: 'active' }
  if (sport) where.sport = sport

  // Also expire old insights
  await prisma.aiInsight.updateMany({
    where: { userId, status: 'active', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  })

  return prisma.aiInsight.findMany({
    where,
    orderBy: { priority: 'asc' },
    take: limit,
  })
}

/**
 * Dismiss an insight.
 */
async function dismissInsight(insightId, userId) {
  return prisma.aiInsight.updateMany({
    where: { id: insightId, userId },
    data: { status: 'dismissed', dismissedAt: new Date() },
  })
}

/**
 * Mark an insight as acted upon.
 */
async function markActedOn(insightId, userId) {
  return prisma.aiInsight.updateMany({
    where: { id: insightId, userId },
    data: { status: 'acted_on' },
  })
}

module.exports = {
  runDailyInsightPipeline,
  generateInsightsForUser,
  getActiveInsights,
  dismissInsight,
  markActedOn,
}
