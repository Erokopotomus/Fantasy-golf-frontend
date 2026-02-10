const express = require('express')
const { authenticate } = require('../middleware/auth')
const { getClutchRankings, getAdpRankings, syncAllProjections } = require('../services/projectionSync')

const router = express.Router()

// GET /api/projections/:sport/:format — get Clutch Rankings
router.get('/:sport/:format', authenticate, async (req, res, next) => {
  try {
    const { sport, format } = req.params
    const season = parseInt(req.query.season) || 2026
    const limit = Math.min(parseInt(req.query.limit) || 300, 500)

    if (!['nfl', 'golf'].includes(sport)) {
      return res.status(400).json({ error: { message: 'Invalid sport. Use nfl or golf.' } })
    }

    const validFormats = sport === 'nfl'
      ? ['ppr', 'half_ppr', 'standard']
      : ['overall']
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: { message: `Invalid format. Use: ${validFormats.join(', ')}` } })
    }

    const rankings = await getClutchRankings(sport, format, season, limit)
    res.json({
      rankings: rankings.map(r => ({
        playerId: r.playerId,
        clutchRank: r.clutchRank,
        projectedPts: r.projectedPts,
        adpRank: r.adpRank,
        position: r.position,
        player: r.player,
      })),
      meta: {
        sport,
        scoringFormat: format,
        season,
        count: rankings.length,
        computedAt: rankings[0]?.computedAt || null,
      },
    })
  } catch (err) { next(err) }
})

// GET /api/projections/:sport/:format/adp — get ADP-only rankings
router.get('/:sport/:format/adp', authenticate, async (req, res, next) => {
  try {
    const { format } = req.params
    const season = parseInt(req.query.season) || 2026
    const limit = Math.min(parseInt(req.query.limit) || 300, 500)

    const rankings = await getAdpRankings(format, season, limit)
    res.json({
      rankings: rankings.map(r => ({
        playerId: r.playerId,
        adpRank: r.adpRank,
        projectedPts: r.projectedPts,
        clutchRank: r.clutchRank,
        position: r.position,
        player: r.player,
      })),
      meta: { scoringFormat: format, season, count: rankings.length },
    })
  } catch (err) { next(err) }
})

// POST /api/projections/sync — admin trigger for sync (dev/testing)
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    // Only allow admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin only' } })
    }
    const season = parseInt(req.body.season) || 2026
    const results = await syncAllProjections(season)
    res.json({ results })
  } catch (err) { next(err) }
})

module.exports = router
