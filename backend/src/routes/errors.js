const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma.js')
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')

// POST /batch — receive error batches from frontend (auth optional)
router.post('/batch', async (req, res) => {
  try {
    const { errors } = req.body
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return res.status(400).json({ error: { message: 'No errors provided' } })
    }

    const batch = errors.slice(0, 50)

    const created = await prisma.appError.createMany({
      data: batch.map(e => ({
        type: e.type || 'unknown',
        category: e.category || 'unknown',
        severity: e.severity || 'low',
        message: (e.message || '').slice(0, 2000),
        metadata: e.metadata || null,
        url: e.url || null,
        userId: e.userId || null,
        sessionId: e.sessionId || null,
        userAgent: (e.userAgent || '').slice(0, 500),
        viewport: e.viewport || null,
      })),
      skipDuplicates: true,
    })

    res.json({ received: created.count })
  } catch (error) {
    console.error('[ErrorCapture] Failed to store errors:', error.message)
    res.json({ received: 0 })
  }
})

// GET /summary — admin dashboard: error summary (last 24h, 7d)
router.get('/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [last24h, last7d, bySeverity, byType, topEndpoints, affectedUsers, unresolvedCount] = await Promise.all([
      prisma.appError.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.appError.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.appError.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
      }),
      prisma.appError.groupBy({
        by: ['type'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
        orderBy: { _count: { type: 'desc' } },
      }),
      prisma.$queryRaw`
        SELECT metadata->>'endpoint' as endpoint, metadata->>'status' as status, COUNT(*)::int as count
        FROM "AppError"
        WHERE type = 'api_error' AND "createdAt" > ${sevenDaysAgo}
        AND metadata->>'endpoint' IS NOT NULL
        GROUP BY metadata->>'endpoint', metadata->>'status'
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.appError.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.appError.count({ where: { resolved: false } }),
    ])

    res.json({
      last24h,
      last7d,
      unresolvedCount,
      affectedUserCount: affectedUsers.length,
      bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s.severity]: s._count?._all || s._count }), {}),
      byType: byType.map(t => ({ type: t.type, count: t._count?._all || t._count })),
      topEndpoints,
    })
  } catch (error) {
    console.error('[ErrorCapture] Summary failed:', error.message)
    res.status(500).json({ error: { message: 'Failed to fetch error summary' } })
  }
})

// GET /recent — admin: recent errors with pagination
router.get('/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const severity = req.query.severity || null
    const type = req.query.type || null
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined

    const where = {}
    if (severity) where.severity = severity
    if (type) where.type = type
    if (resolved !== undefined) where.resolved = resolved

    const [errors, total] = await Promise.all([
      prisma.appError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appError.count({ where }),
    ])

    res.json({ errors, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to fetch errors' } })
  }
})

// PATCH /:id/resolve — admin: mark error as resolved
router.patch('/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const updated = await prisma.appError.update({
      where: { id: req.params.id },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to resolve error' } })
  }
})

// POST /resolve-bulk — admin: bulk resolve by type or endpoint
router.post('/resolve-bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, endpoint } = req.body
    const where = { resolved: false }
    if (type) where.type = type
    if (endpoint) {
      const result = await prisma.$executeRaw`
        UPDATE "AppError" SET resolved = true, "resolvedAt" = NOW(), "resolvedBy" = ${req.user.id}
        WHERE resolved = false AND metadata->>'endpoint' = ${endpoint}
      `
      return res.json({ resolved: result })
    }
    const result = await prisma.appError.updateMany({
      where,
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id },
    })
    res.json({ resolved: result.count })
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to bulk resolve' } })
  }
})

module.exports = router
