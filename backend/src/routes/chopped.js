const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const prisma = require('../lib/prisma.js')
const { computeSafePercents } = require('../services/chopped/safePercentService')
const { executeChop } = require('../services/chopped/survivalService')

// Mount: app.use('/api/leagues', choppedRoutes) — leagueId is path param on each route
// (Matches the waiverRoutes pattern in waivers.js)

// GET /api/leagues/:leagueId/chopped/safe-percents?week=N&mode=preweek|live
router.get('/:leagueId/chopped/safe-percents', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const week = parseInt(req.query.week, 10)
    const mode = req.query.mode === 'live' ? 'live' : 'preweek'
    if (!week || week < 1 || week > 18) {
      return res.status(400).json({ error: 'invalid week (1-18 required)' })
    }
    const results = await computeSafePercents({ leagueId, week, mode })
    res.json({ leagueId, week, mode, results })
  } catch (e) {
    console.error('[chopped] safe-percents error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/leagues/:leagueId/chopped/chop
// Body: { week: number, teamIds: string[], reasoning?: string }
router.post('/:leagueId/chopped/chop', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const { week, teamIds, reasoning } = req.body

    if (!week || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ error: 'week and teamIds required' })
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, ownerId: true, format: true, settings: true },
    })
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.format !== 'CHOPPED') {
      return res.status(400).json({ error: 'League is not CHOPPED format' })
    }
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Commissioner only' })
    }

    const chopConfig = (league.settings && league.settings.chopped) || {}
    const maxChops = chopConfig.chopsPerWeek || 1
    if (teamIds.length > maxChops) {
      return res.status(400).json({ error: `Max ${maxChops} chops per week` })
    }
    if (chopConfig.manualChopEnabled === false) {
      return res.status(403).json({ error: 'Manual chop disabled for this league' })
    }

    const result = await executeChop({
      leagueId,
      week,
      teamIds,
      triggerType: 'manual',
      triggeredByUserId: req.user.id,
      reasoning: reasoning || null,
    })
    res.json(result)
  } catch (e) {
    console.error('[chopped] chop error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/leagues/:leagueId/chopped/events
router.get('/:leagueId/chopped/events', authenticate, async (req, res) => {
  try {
    const events = await prisma.chopEvent.findMany({
      where: { leagueId: req.params.leagueId },
      include: { team: { select: { id: true, name: true, avatar: true, avatarUrl: true } } },
      orderBy: { week: 'desc' },
    })
    res.json({ events })
  } catch (e) {
    console.error('[chopped] events error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
