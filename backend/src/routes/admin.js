const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const aiConfig = require('../services/aiConfigService')

const router = express.Router()
const prisma = new PrismaClient()

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin)

// GET /api/admin/stats - Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const [users, leagues, activeDrafts, activeTournaments] = await Promise.all([
      prisma.user.count(),
      prisma.league.count(),
      prisma.draft.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PAUSED'] } } }),
      prisma.tournament.count({ where: { status: 'IN_PROGRESS' } }),
    ])

    res.json({ stats: { users, leagues, activeDrafts, activeTournaments } })
  } catch (error) {
    next(error)
  }
})

// GET /api/admin/users - Paginated user list
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = search
      ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { teams: true, ownedLeagues: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ])

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error) {
    next(error)
  }
})

// GET /api/admin/leagues - Paginated league list
router.get('/leagues', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {}

    const [leagues, total] = await Promise.all([
      prisma.league.findMany({
        where,
        select: {
          id: true,
          name: true,
          format: true,
          status: true,
          maxTeams: true,
          createdAt: true,
          owner: { select: { id: true, name: true } },
          _count: { select: { members: true, teams: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.league.count({ where }),
    ])

    res.json({ leagues, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error) {
    next(error)
  }
})

// GET /api/admin/tournaments - Paginated tournament list
router.get('/tournaments', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, status } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {}
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (status) where.status = status

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        select: {
          id: true,
          name: true,
          tour: true,
          startDate: true,
          endDate: true,
          status: true,
          currentRound: true,
          isMajor: true,
          isSignature: true,
          purse: true,
          location: true,
          course: { select: { name: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.tournament.count({ where }),
    ])

    res.json({ tournaments, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error) {
    next(error)
  }
})

// POST /api/admin/users/:id/role - Update user role
router.post('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: { message: 'Invalid role. Must be "user" or "admin".' } })
    }

    // Prevent self-demotion
    if (req.params.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: { message: 'Cannot remove your own admin role' } })
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })

    res.json({ user: updated })
  } catch (error) {
    next(error)
  }
})

// ═══════════════════════════════════════════════
//  AI ENGINE CONFIG
// ═══════════════════════════════════════════════

// GET /api/admin/ai-config — Get current AI engine config
router.get('/ai-config', async (req, res, next) => {
  try {
    const config = await aiConfig.getConfig()
    res.json({ config })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/admin/ai-config — Update AI engine config
router.patch('/ai-config', async (req, res, next) => {
  try {
    const { enabled, featureToggles, dailyTokenBudget } = req.body
    const updates = {}

    if (typeof enabled === 'boolean') updates.enabled = enabled
    if (featureToggles && typeof featureToggles === 'object') updates.featureToggles = featureToggles
    if (typeof dailyTokenBudget === 'number' && dailyTokenBudget >= 0) updates.dailyTokenBudget = dailyTokenBudget

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'No valid fields to update' } })
    }

    const config = await aiConfig.updateConfig(updates)
    res.json({ config })
  } catch (error) {
    next(error)
  }
})

// GET /api/admin/ai-spend — Get AI spend dashboard
router.get('/ai-spend', async (req, res, next) => {
  try {
    const spend = await aiConfig.getSpendDashboard()
    res.json({ spend })
  } catch (error) {
    next(error)
  }
})

module.exports = router
