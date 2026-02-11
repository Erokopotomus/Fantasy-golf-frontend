/**
 * Intelligence API Routes (Phase 6B)
 *
 * Exposes the Decision Graph and Pattern Engine for testing
 * and future frontend consumption.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const patternEngine = require('../services/patternEngine')
const decisionGraph = require('../services/decisionGraphService')

// GET /api/intelligence/profile/:sport — Get or generate user intelligence profile
router.get('/profile/:sport', authenticate, async (req, res) => {
  try {
    const profile = await patternEngine.getUserProfile(req.user.id, req.params.sport)
    res.json({ profile })
  } catch (err) {
    console.error('[Intelligence] Profile error:', err.message)
    res.status(500).json({ error: 'Failed to generate profile' })
  }
})

// POST /api/intelligence/profile/:sport/regenerate — Force-regenerate profile
router.post('/profile/:sport/regenerate', authenticate, async (req, res) => {
  try {
    const profile = await patternEngine.generateUserProfile(req.user.id, req.params.sport)
    res.json({ profile })
  } catch (err) {
    console.error('[Intelligence] Regenerate error:', err.message)
    res.status(500).json({ error: 'Failed to regenerate profile' })
  }
})

// GET /api/intelligence/player/:playerId — Get player decision graph
router.get('/player/:playerId', authenticate, async (req, res) => {
  try {
    const graph = await decisionGraph.getPlayerGraph(req.user.id, req.params.playerId)
    res.json({ graph })
  } catch (err) {
    console.error('[Intelligence] Player graph error:', err.message)
    res.status(500).json({ error: 'Failed to get player graph' })
  }
})

// GET /api/intelligence/predictions/:sport — Get prediction graph
router.get('/predictions/:sport', authenticate, async (req, res) => {
  try {
    const graph = await decisionGraph.getPredictionGraph(req.user.id, req.params.sport, req.query.season || null)
    res.json({ graph })
  } catch (err) {
    console.error('[Intelligence] Prediction graph error:', err.message)
    res.status(500).json({ error: 'Failed to get prediction graph' })
  }
})

module.exports = router
