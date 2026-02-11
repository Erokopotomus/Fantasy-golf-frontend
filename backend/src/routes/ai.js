/**
 * AI API Routes (Phases 6C-6F)
 *
 * All AI endpoints: insights, coaching, reports, scout, sim.
 * All endpoints authenticated. Rate limits per spec.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const aiInsightPipeline = require('../services/aiInsightPipeline')
const aiCoachService = require('../services/aiCoachService')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Simple per-user rate limiter
const rateLimitMap = new Map()
function rateLimit(userId, group, maxPerHour) {
  const key = `${userId}:${group}`
  const now = Date.now()
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, [])
  const log = rateLimitMap.get(key).filter(t => t > now - 3600000)
  rateLimitMap.set(key, log)
  if (log.length >= maxPerHour) return false
  log.push(now)
  return true
}

// ═══════════════════════════════════════════════
//  INSIGHTS (Mode 1 — Ambient)
// ═══════════════════════════════════════════════

// GET /api/ai/insights — Get active insights for current user
router.get('/insights', authenticate, async (req, res) => {
  try {
    const insights = await aiInsightPipeline.getActiveInsights(req.user.id, {
      sport: req.query.sport || undefined,
      limit: parseInt(req.query.limit) || 20,
    })
    res.json({ insights })
  } catch (err) {
    console.error('[AI] Insights error:', err.message)
    res.status(500).json({ error: 'Failed to get insights' })
  }
})

// POST /api/ai/insights/:id/dismiss — Dismiss an insight
router.post('/insights/:id/dismiss', authenticate, async (req, res) => {
  try {
    await aiInsightPipeline.dismissInsight(req.params.id, req.user.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[AI] Dismiss error:', err.message)
    res.status(500).json({ error: 'Failed to dismiss insight' })
  }
})

// POST /api/ai/insights/:id/acted — Mark as acted upon
router.post('/insights/:id/acted', authenticate, async (req, res) => {
  try {
    await aiInsightPipeline.markActedOn(req.params.id, req.user.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[AI] ActedOn error:', err.message)
    res.status(500).json({ error: 'Failed to mark insight' })
  }
})

// ═══════════════════════════════════════════════
//  CONTEXTUAL COACHING (Mode 2)
// ═══════════════════════════════════════════════

// POST /api/ai/draft-nudge — Get draft room nudge
router.post('/draft-nudge', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.draftCoaching ?? true)) return res.json({ nudge: null })

    if (!rateLimit(req.user.id, 'draft-nudge', 20)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const nudge = await aiCoachService.generateDraftNudge(req.user.id, req.body)
    res.json({ nudge })
  } catch (err) {
    console.error('[AI] Draft nudge error:', err.message)
    res.json({ nudge: null }) // graceful degradation
  }
})

// POST /api/ai/board-coach — Get board editor coaching card
router.post('/board-coach', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.boardCoaching ?? true)) return res.json({ card: null })

    // Data confidence: board must have 30+ entries
    const { boardId, triggerAction, context } = req.body
    if (boardId) {
      const entryCount = await prisma.boardEntry.count({ where: { boardId } })
      if (entryCount < 30) {
        return res.json({ card: null, gated: true, reason: `Board needs ${30 - entryCount} more entries to unlock AI coaching` })
      }
    }

    if (!rateLimit(req.user.id, 'board-coach', 5)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const card = await aiCoachService.generateBoardCoachingCard(req.user.id, boardId, triggerAction, context)
    res.json({ card })
  } catch (err) {
    console.error('[AI] Board coach error:', err.message)
    res.json({ card: null }) // graceful degradation
  }
})

// POST /api/ai/prediction-context — Get prediction submission context
router.post('/prediction-context', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.predictionCoaching ?? true)) return res.json({ context: null })

    if (!rateLimit(req.user.id, 'prediction-context', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const context = await aiCoachService.generatePredictionContext(req.user.id, req.body)
    res.json({ context })
  } catch (err) {
    console.error('[AI] Prediction context error:', err.message)
    res.json({ context: null })
  }
})

// POST /api/ai/prediction-resolution — Get prediction resolution insight
router.post('/prediction-resolution', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.predictionCoaching ?? true)) return res.json({ insight: null })

    if (!rateLimit(req.user.id, 'prediction-context', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const insight = await aiCoachService.generateResolutionInsight(req.user.id, req.body)
    res.json({ insight })
  } catch (err) {
    console.error('[AI] Resolution insight error:', err.message)
    res.json({ insight: null })
  }
})

// ═══════════════════════════════════════════════
//  DEEP REPORTS (Mode 3)
// ═══════════════════════════════════════════════

// POST /api/ai/report/pre-draft — Generate pre-draft report
router.post('/report/pre-draft', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport } = req.body
    const report = await aiCoachService.generatePreDraftReport(req.user.id, sport || 'nfl')
    if (!report) return res.json({ report: null })

    // Store in DB
    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'pre_draft',
        contentJson: report,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Pre-draft report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// POST /api/ai/report/mid-season — Generate mid-season report
router.post('/report/mid-season', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport, season } = req.body
    const report = await aiCoachService.generateMidSeasonReport(req.user.id, sport || 'nfl', season || new Date().getFullYear())
    if (!report) return res.json({ report: null })

    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'mid_season',
        contentJson: report,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Mid-season report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// POST /api/ai/report/post-season — Generate post-season report
router.post('/report/post-season', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport, season } = req.body
    const report = await aiCoachService.generatePostSeasonReport(req.user.id, sport || 'nfl', season || new Date().getFullYear())
    if (!report) return res.json({ report: null })

    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'post_season',
        contentJson: report,
        expiresAt: new Date(Date.now() + 365 * 86400000), // 1 year
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Post-season report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// GET /api/ai/reports — Get all reports for current user
router.get('/reports', authenticate, async (req, res) => {
  try {
    const reports = await prisma.aiReport.findMany({
      where: { userId: req.user.id },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    })
    res.json({ reports })
  } catch (err) {
    console.error('[AI] Reports list error:', err.message)
    res.status(500).json({ error: 'Failed to get reports' })
  }
})

// GET /api/ai/reports/:id — Get specific report
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    const report = await prisma.aiReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json({ report })
  } catch (err) {
    console.error('[AI] Report get error:', err.message)
    res.status(500).json({ error: 'Failed to get report' })
  }
})

// ═══════════════════════════════════════════════
//  SCOUT + SIM (Phase 6F)
// ═══════════════════════════════════════════════

// POST /api/ai/scout-report — Generate/retrieve scout report
router.post('/scout-report', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'scout', 5)) {
      return res.status(429).json({ error: 'Rate limit exceeded (5/day)' })
    }
    const { sport, eventId } = req.body

    // Check for cached report
    const cached = await prisma.aiReport.findFirst({
      where: {
        sport,
        reportType: sport === 'golf' ? 'scout_golf' : 'scout_nfl',
        subjectId: eventId,
        expiresAt: { gt: new Date() },
      },
    })
    if (cached) {
      // Personalize for user
      const personalized = await aiCoachService.personalizeScoutReport(req.user.id, cached.contentJson, sport)
      return res.json({ report: personalized, cached: true })
    }

    // Generate new report
    let report
    if (sport === 'golf') {
      report = await aiCoachService.generateGolfScoutReport(eventId)
    } else {
      report = await aiCoachService.generateNflScoutReport(eventId)
    }
    if (!report) return res.json({ report: null })

    // Cache it
    await prisma.aiReport.create({
      data: {
        sport,
        reportType: report.reportType,
        subjectId: eventId,
        contentJson: report,
        expiresAt: new Date(Date.now() + 24 * 3600000), // 24h cache
        tokenCount: report.tokenCount || null,
      },
    })

    // Personalize for user
    const personalized = await aiCoachService.personalizeScoutReport(req.user.id, report, sport)
    res.json({ report: personalized, cached: false })
  } catch (err) {
    console.error('[AI] Scout report error:', err.message)
    res.status(500).json({ error: 'Failed to generate scout report' })
  }
})

// POST /api/ai/player-brief — Generate player AI brief
router.post('/player-brief', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'player-brief', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded (10/day)' })
    }
    const { playerId, sport } = req.body
    const brief = await aiCoachService.generatePlayerBrief(req.user.id, playerId, sport || 'nfl')
    res.json({ brief })
  } catch (err) {
    console.error('[AI] Player brief error:', err.message)
    res.json({ brief: null })
  }
})

// POST /api/ai/simulate — Matchup simulator
router.post('/simulate', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'sim', 5)) {
      return res.status(429).json({ error: 'Rate limit exceeded (5/day)' })
    }
    const { player1Id, player2Id, sport } = req.body
    if (!player1Id || !player2Id) return res.status(400).json({ error: 'Two players required' })

    const result = await aiCoachService.simulateMatchup(player1Id, player2Id, sport || 'nfl', req.user.id)
    res.json({ result })
  } catch (err) {
    console.error('[AI] Simulate error:', err.message)
    res.json({ result: null })
  }
})

// ═══════════════════════════════════════════════
//  USER AI PREFERENCES
// ═══════════════════════════════════════════════

// GET /api/ai/preferences — Get user's AI coaching preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { aiPreferences: true },
    })
    res.json({ preferences: user?.aiPreferences || { ambient: true, draftCoaching: true, boardCoaching: true, predictionCoaching: true } })
  } catch (err) {
    console.error('[AI] Preferences get error:', err.message)
    res.status(500).json({ error: 'Failed to get AI preferences' })
  }
})

// PATCH /api/ai/preferences — Update user's AI coaching preferences
router.patch('/preferences', authenticate, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { aiPreferences: true },
    })
    const currentPrefs = current?.aiPreferences || { ambient: true, draftCoaching: true, boardCoaching: true, predictionCoaching: true }
    const updated = { ...currentPrefs, ...req.body }

    // Only allow known keys
    const clean = {
      ambient: !!updated.ambient,
      draftCoaching: !!updated.draftCoaching,
      boardCoaching: !!updated.boardCoaching,
      predictionCoaching: !!updated.predictionCoaching,
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { aiPreferences: clean },
    })

    res.json({ preferences: clean })
  } catch (err) {
    console.error('[AI] Preferences update error:', err.message)
    res.status(500).json({ error: 'Failed to update AI preferences' })
  }
})

module.exports = router
