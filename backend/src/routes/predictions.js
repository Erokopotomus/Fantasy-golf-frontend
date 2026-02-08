const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { authenticate, optionalAuth } = require('../middleware/auth')
const { validateBody } = require('../middleware/validate')
const predictionService = require('../services/predictionService')

const prisma = new PrismaClient()

const validatePrediction = validateBody({
  sport: { required: true, type: 'string', enum: ['golf', 'nfl', 'nba', 'mlb'] },
  predictionType: { required: true, type: 'string', enum: ['performance_call', 'player_benchmark', 'weekly_winner', 'bold_call'] },
  predictionData: { required: true },
})

// ─── Submit a prediction ────────────────────────────────────────────────────
// POST /api/predictions
router.post('/', authenticate, validatePrediction, async (req, res) => {
  try {
    const prediction = await predictionService.submitPrediction(req.user.id, req.body, prisma)
    res.status(201).json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Update a pending prediction ────────────────────────────────────────────
// PATCH /api/predictions/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const prediction = await predictionService.updatePrediction(req.params.id, req.user.id, req.body, prisma)
    res.json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Delete a pending prediction ────────────────────────────────────────────
// DELETE /api/predictions/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await predictionService.deletePrediction(req.params.id, req.user.id, prisma)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Get my predictions ─────────────────────────────────────────────────────
// GET /api/predictions/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { sport, predictionType, outcome, limit, offset } = req.query
    const result = await predictionService.getUserPredictions(
      req.user.id,
      {
        sport,
        predictionType,
        outcome,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
      prisma
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get my reputation ──────────────────────────────────────────────────────
// GET /api/predictions/reputation
router.get('/reputation', authenticate, async (req, res) => {
  try {
    const reputation = await predictionService.getUserReputation(req.user.id, prisma)
    res.json(reputation)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get any user's reputation ──────────────────────────────────────────────
// GET /api/predictions/reputation/:userId
router.get('/reputation/:userId', async (req, res) => {
  try {
    const reputation = await predictionService.getUserReputation(req.params.userId, prisma)
    res.json(reputation)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get leaderboard ────────────────────────────────────────────────────────
// GET /api/predictions/leaderboard?sport=golf&timeframe=weekly&leagueId=...
router.get('/leaderboard', async (req, res) => {
  try {
    const { sport = 'all', timeframe = 'all', leagueId, limit, offset } = req.query
    const leaderboard = await predictionService.getLeaderboard(
      sport,
      {
        timeframe,
        leagueId,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
      prisma
    )
    res.json({ leaderboard })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get community consensus ────────────────────────────────────────────────
// GET /api/predictions/consensus?eventId=...&playerId=...&type=player_benchmark
router.get('/consensus', async (req, res) => {
  try {
    const { eventId, playerId, type = 'player_benchmark' } = req.query
    if (!eventId || !playerId) {
      return res.status(400).json({ error: { message: 'eventId and playerId required' } })
    }
    const consensus = await predictionService.getCommunityConsensus(eventId, playerId, type, prisma)
    res.json(consensus)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get event slate (open predictions for an event) ────────────────────────
// GET /api/predictions/slate/:eventId
router.get('/slate/:eventId', async (req, res) => {
  try {
    const { sport, predictionType, limit } = req.query
    const slate = await predictionService.getEventSlate(
      req.params.eventId,
      { sport, predictionType, limit: parseInt(limit) || 50 },
      prisma
    )
    res.json({ slate })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get predictions for a specific event ───────────────────────────────────
// GET /api/predictions/event/:eventId
router.get('/event/:eventId', optionalAuth, async (req, res) => {
  try {
    const { predictionType, limit, offset } = req.query
    const where = {
      eventId: req.params.eventId,
      isPublic: true,
    }
    if (predictionType) where.predictionType = predictionType

    // If authenticated, also include user's private predictions
    if (req.user) {
      where.OR = [
        { isPublic: true },
        { userId: req.user.id },
      ]
      delete where.isPublic
    }

    const predictions = await prisma.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      take: parseInt(limit) || 50,
      skip: parseInt(offset) || 0,
    })

    res.json({ predictions })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Resolve a prediction (admin only) ──────────────────────────────────────
// POST /api/predictions/:id/resolve
router.post('/:id/resolve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin access required' } })
    }

    const { outcome, accuracyScore } = req.body
    const prediction = await predictionService.resolvePrediction(
      req.params.id,
      outcome,
      accuracyScore,
      prisma
    )
    res.json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Resolve all predictions for an event (admin / cron) ────────────────────
// POST /api/predictions/resolve-event/:eventId
router.post('/resolve-event/:eventId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin access required' } })
    }

    // For golf tournaments, fetch performances and resolve
    const performances = await prisma.performance.findMany({
      where: { tournamentId: req.params.eventId },
    })

    const perfMap = {}
    for (const p of performances) {
      perfMap[p.playerId] = p
    }

    const results = await predictionService.resolveEventPredictions(
      req.params.eventId,
      (prediction) => {
        const perf = perfMap[prediction.subjectPlayerId]
        if (!perf) return { outcome: 'VOIDED', accuracyScore: null }

        if (prediction.predictionType === 'player_benchmark') {
          return predictionService.resolveGolfBenchmark(prediction, perf)
        }

        // Default: void unhandled types for now
        return { outcome: 'VOIDED', accuracyScore: null }
      },
      prisma
    )

    res.json({ results })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

module.exports = router
