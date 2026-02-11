/**
 * Claude API Service (Phase 6C)
 *
 * Wrapper around @anthropic-ai/sdk with retries, rate limiting,
 * token tracking, and graceful degradation.
 *
 * All calls go through the AI Engine config gate:
 *  1. Kill switch must be ON (enabled: true)
 *  2. Feature-specific toggle must be ON
 *  3. Daily token budget must not be exceeded
 * If any gate fails, returns null gracefully.
 */

const Anthropic = require('@anthropic-ai/sdk')
const aiConfig = require('./aiConfigService')

const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const PREMIUM_MODEL = 'claude-opus-4-6'
const DEFAULT_TIMEOUT = 30000
const MAX_RETRIES = 3

// Simple in-memory rate limiter
const requestLog = []
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 30 // max requests per minute

function checkRateLimit() {
  const now = Date.now()
  // Clean old entries
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW) {
    requestLog.shift()
  }
  if (requestLog.length >= RATE_LIMIT_MAX) {
    return false
  }
  requestLog.push(now)
  return true
}

/**
 * Generate a completion from Claude.
 * Returns { text, inputTokens, outputTokens } or null on failure.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options
 * @param {string} options.feature - Feature name for toggle check (ambient, draftNudge, boardCoach, predictionContext, deepReports, scoutReports, sim)
 * @param {boolean} options.premium - Use Opus model
 * @param {number} options.maxTokens
 * @param {number} options.timeout
 * @param {boolean} options.skipConfigCheck - Skip kill switch / feature check (for admin-triggered calls)
 */
async function generateCompletion(systemPrompt, userPrompt, options = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Claude] No ANTHROPIC_API_KEY set — skipping AI call')
    return null
  }

  // ── AI Engine Config Gate ──
  if (!options.skipConfigCheck) {
    // Check kill switch + feature toggle
    if (options.feature) {
      const featureEnabled = await aiConfig.isFeatureEnabled(options.feature)
      if (!featureEnabled) {
        console.info(`[Claude] Feature "${options.feature}" is disabled — skipping AI call`)
        return null
      }
    } else {
      // No specific feature — just check kill switch
      const config = await aiConfig.getConfig()
      if (!config.enabled) {
        console.info('[Claude] AI Engine kill switch is OFF — skipping AI call')
        return null
      }
    }

    // Check daily token budget
    const budgetExceeded = await aiConfig.isBudgetExceeded()
    if (budgetExceeded) {
      console.warn('[Claude] Daily token budget exceeded — skipping AI call')
      return null
    }
  }

  if (!checkRateLimit()) {
    console.warn('[Claude] Rate limit exceeded — skipping AI call')
    return null
  }

  const model = options.premium ? PREMIUM_MODEL : (options.model || DEFAULT_MODEL)
  const maxTokens = options.maxTokens || 2048
  const timeout = options.timeout || DEFAULT_TIMEOUT

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await Promise.race([
        client.messages.create({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claude API timeout')), timeout)
        ),
      ])

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')

      const inputTokens = response.usage?.input_tokens || 0
      const outputTokens = response.usage?.output_tokens || 0

      // Track token usage (fire-and-forget)
      aiConfig.trackTokenUsage(inputTokens, outputTokens).catch(() => {})

      return {
        text,
        inputTokens,
        outputTokens,
        model,
      }
    } catch (err) {
      const isRetryable = err.status === 429 || err.status === 529 || err.status >= 500
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000 // exponential backoff
        console.warn(`[Claude] Attempt ${attempt} failed (${err.message}), retrying in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      console.error(`[Claude] Failed after ${attempt} attempts:`, err.message)
      return null
    }
  }

  return null
}

/**
 * Generate a JSON completion — parses the response as JSON.
 * Returns parsed object or null on failure.
 */
async function generateJsonCompletion(systemPrompt, userPrompt, options = {}) {
  const result = await generateCompletion(
    systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation.',
    userPrompt,
    options
  )
  if (!result) return null

  try {
    // Strip potential markdown code fences
    let text = result.text.trim()
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const parsed = JSON.parse(text)
    return { data: parsed, inputTokens: result.inputTokens, outputTokens: result.outputTokens, model: result.model }
  } catch (err) {
    console.error('[Claude] Failed to parse JSON response:', err.message)
    return null
  }
}

module.exports = {
  generateCompletion,
  generateJsonCompletion,
  DEFAULT_MODEL,
  PREMIUM_MODEL,
}
