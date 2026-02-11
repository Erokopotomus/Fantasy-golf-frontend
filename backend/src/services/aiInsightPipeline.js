/**
 * AI Insight Pipeline (Phase 6C)
 *
 * Orchestrator that runs on schedule, determines which insights to
 * generate for each user, calls the pattern engine and AI service,
 * and stores results.
 *
 * Includes data confidence gating:
 * - Ambient insights require MEDIUM confidence
 * - Below threshold → onboarding card instead of pattern insights
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
  // Check user's AI preferences — skip if ambient insights disabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiPreferences: true },
  })
  const prefs = user?.aiPreferences || { ambient: true, draftCoaching: true, boardCoaching: true, predictionCoaching: true }
  if (!prefs.ambient) {
    return 0 // user opted out of ambient insights
  }

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

    // ── Data Confidence Gating ──
    // Ambient insights require at least MEDIUM confidence
    if (profile.dataConfidence === 'LOW') {
      // Generate onboarding card instead (only once — check for existing)
      if (!existingTypes.has('ONBOARDING') && generated < maxInsights) {
        const onboarding = buildOnboardingCard(profile, sport)
        await storeInsight(userId, onboarding)
        existingTypes.add('ONBOARDING')
        generated++
      }
      continue // skip pattern-based insights for this sport
    }

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
 * Build an onboarding card for users below the confidence threshold.
 * No AI call — deterministic content.
 */
function buildOnboardingCard(profile, sport) {
  const suggestions = []

  const draftCount = profile.draftPatterns?.draftCount || 0
  const predCount = profile.predictionPatterns?.totalPredictions || 0
  const captureCount = profile.capturePatterns?.totalCaptures || 0

  if (draftCount === 0) {
    suggestions.push('Complete a mock draft to unlock draft coaching')
  }
  if (predCount < 20) {
    suggestions.push(`Make ${20 - predCount} more predictions to unlock prediction insights`)
  }
  if (captureCount < 5) {
    suggestions.push('Add research captures in The Lab to unlock capture analysis')
  }

  // Check for boards
  const hasBoard = profile.draftPatterns?.boardAdherence != null
  if (!hasBoard) {
    suggestions.push('Create a draft board in The Lab to unlock board coaching')
  }

  const body = suggestions.length > 0
    ? `Your AI coaching is warming up! Here's how to unlock personalized insights:\n\n${suggestions.map(s => `- ${s}`).join('\n')}`
    : 'Keep using Clutch to unlock more personalized AI coaching insights.'

  return {
    insightType: 'ONBOARDING',
    sport,
    title: 'Unlock AI Coaching',
    body,
    priority: 2,
    metadata: { onboarding: true, suggestions },
  }
}

/**
 * Assess data confidence for contextual coaching gating.
 * Returns { level: 'HIGH'|'MEDIUM'|'LOW', details }
 */
async function assessUserConfidence(userId) {
  const [draftCount, predCount, boardsWithEntries, captureCount, leagueCount] = await Promise.all([
    prisma.draftPick.count({ where: { team: { userId } } }).then(c => c > 0 ? 1 : 0), // has at least 1 draft
    prisma.prediction.count({ where: { userId } }),
    prisma.draftBoard.findMany({
      where: { userId },
      select: { id: true, _count: { select: { entries: true } } },
    }),
    prisma.labCapture.count({ where: { userId } }),
    prisma.team.count({ where: { userId } }), // proxy for imported league history
  ])

  const completedDrafts = draftCount
  const hasImportedLeague = leagueCount > 0
  const boardsWith30Plus = boardsWithEntries.filter(b => b._count.entries >= 30)

  // MEDIUM: 1+ completed draft OR 20+ predictions OR imported league history
  const hasMedium = completedDrafts >= 1 || predCount >= 20 || hasImportedLeague

  // HIGH: 2+ seasons of data (approximated by having drafts + predictions + captures)
  const hasHigh = completedDrafts >= 1 && predCount >= 20 && captureCount >= 10

  return {
    level: hasHigh ? 'HIGH' : hasMedium ? 'MEDIUM' : 'LOW',
    completedDrafts,
    predictionCount: predCount,
    captureCount,
    hasImportedLeague,
    boardsWith30PlusEntries: boardsWith30Plus.length,
    boardsWith30PlusIds: boardsWith30Plus.map(b => b.id),
  }
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
  assessUserConfidence,
  getActiveInsights,
  dismissInsight,
  markActedOn,
}
