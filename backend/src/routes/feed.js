const express = require('express')
const { optionalAuth } = require('../middleware/auth')
const { generateFeed } = require('../services/feedGenerator')

const router = express.Router()

// GET /api/feed/:sport — Generate feed cards for a sport (nfl, golf, all)
router.get('/:sport', optionalAuth, async (req, res, next) => {
  try {
    const { sport } = req.params
    if (!['nfl', 'golf', 'all'].includes(sport)) {
      return res.status(400).json({ error: 'Sport must be nfl, golf, or all' })
    }

    const { limit = 8, offset = 0, types, season } = req.query
    const result = await generateFeed(sport, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      types,
      season: season ? parseInt(season) : undefined,
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router
