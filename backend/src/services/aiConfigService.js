/**
 * AI Engine Config Service
 *
 * Manages the singleton AiEngineConfig row: kill switch, feature toggles,
 * token budget, and spend tracking. All reads are cached in-memory with
 * a short TTL to avoid hitting the DB on every Claude API call.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// In-memory cache for the config (avoids DB read on every AI call)
let configCache = null
let cacheExpiresAt = 0
const CACHE_TTL = 30000 // 30 seconds

/**
 * Get the current AI engine config (cached).
 */
async function getConfig() {
  const now = Date.now()
  if (configCache && now < cacheExpiresAt) return configCache

  const config = await prisma.aiEngineConfig.findUnique({ where: { id: 'singleton' } })
  if (!config) {
    // Should never happen (migration inserts default), but graceful fallback
    return {
      id: 'singleton',
      enabled: false,
      featureToggles: { ambient: false, draftNudge: false, boardCoach: false, predictionContext: false, deepReports: false, scoutReports: false, sim: false },
      dailyTokenBudget: 100000,
      tokensUsedToday: 0,
      tokensUsedThisWeek: 0,
      tokensUsedThisMonth: 0,
      totalTokensAllTime: 0,
      totalCallsAllTime: 0,
    }
  }

  configCache = config
  cacheExpiresAt = now + CACHE_TTL
  return config
}

/**
 * Update config fields. Invalidates cache.
 */
async function updateConfig(updates) {
  const config = await prisma.aiEngineConfig.update({
    where: { id: 'singleton' },
    data: { ...updates, updatedAt: new Date() },
  })
  configCache = config
  cacheExpiresAt = Date.now() + CACHE_TTL
  return config
}

/**
 * Check if a specific feature is enabled.
 * Returns false if kill switch is off OR the specific feature is toggled off.
 * Feature names: ambient, draftNudge, boardCoach, predictionContext, deepReports, scoutReports, sim
 */
async function isFeatureEnabled(featureName) {
  const config = await getConfig()
  if (!config.enabled) return false

  const toggles = config.featureToggles || {}
  return !!toggles[featureName]
}

/**
 * Check if the daily token budget has been exceeded.
 */
async function isBudgetExceeded() {
  const config = await getConfig()

  // Reset daily counter if needed
  const lastReset = new Date(config.lastDailyReset)
  const now = new Date()
  if (lastReset.toDateString() !== now.toDateString()) {
    await resetDailyCounters()
    return false // just reset, not exceeded
  }

  return config.tokensUsedToday >= config.dailyTokenBudget
}

/**
 * Track token usage after a successful API call.
 * Also checks and resets daily/weekly/monthly counters if needed.
 */
async function trackTokenUsage(inputTokens, outputTokens) {
  const totalTokens = (inputTokens || 0) + (outputTokens || 0)
  if (totalTokens === 0) return

  const config = await getConfig()
  const now = new Date()

  // Check if we need to reset counters
  const lastDaily = new Date(config.lastDailyReset)
  const lastWeekly = new Date(config.lastWeeklyReset)
  const lastMonthly = new Date(config.lastMonthlyReset)

  const updates = {}

  if (lastDaily.toDateString() !== now.toDateString()) {
    updates.tokensUsedToday = totalTokens
    updates.lastDailyReset = now
  } else {
    updates.tokensUsedToday = config.tokensUsedToday + totalTokens
  }

  // Weekly reset: different ISO week
  if (getWeekNumber(lastWeekly) !== getWeekNumber(now) || lastWeekly.getFullYear() !== now.getFullYear()) {
    updates.tokensUsedThisWeek = totalTokens
    updates.lastWeeklyReset = now
  } else {
    updates.tokensUsedThisWeek = config.tokensUsedThisWeek + totalTokens
  }

  // Monthly reset
  if (lastMonthly.getMonth() !== now.getMonth() || lastMonthly.getFullYear() !== now.getFullYear()) {
    updates.tokensUsedThisMonth = totalTokens
    updates.lastMonthlyReset = now
  } else {
    updates.tokensUsedThisMonth = config.tokensUsedThisMonth + totalTokens
  }

  updates.totalTokensAllTime = config.totalTokensAllTime + totalTokens
  updates.totalCallsAllTime = config.totalCallsAllTime + 1

  await updateConfig(updates)
}

/**
 * Reset daily counters (called automatically on first call each day).
 */
async function resetDailyCounters() {
  await updateConfig({
    tokensUsedToday: 0,
    lastDailyReset: new Date(),
  })
}

/**
 * Get spend dashboard data.
 */
async function getSpendDashboard() {
  const config = await getConfig()
  return {
    enabled: config.enabled,
    featureToggles: config.featureToggles,
    dailyTokenBudget: config.dailyTokenBudget,
    tokensUsedToday: config.tokensUsedToday,
    tokensUsedThisWeek: config.tokensUsedThisWeek,
    tokensUsedThisMonth: config.tokensUsedThisMonth,
    totalTokensAllTime: config.totalTokensAllTime,
    totalCallsAllTime: config.totalCallsAllTime,
    dailyBudgetPercent: config.dailyTokenBudget > 0
      ? Math.round((config.tokensUsedToday / config.dailyTokenBudget) * 100)
      : 0,
  }
}

// Helper: ISO week number
function getWeekNumber(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/**
 * Invalidate cache (for testing or manual refresh).
 */
function invalidateCache() {
  configCache = null
  cacheExpiresAt = 0
}

module.exports = {
  getConfig,
  updateConfig,
  isFeatureEnabled,
  isBudgetExceeded,
  trackTokenUsage,
  getSpendDashboard,
  invalidateCache,
}
