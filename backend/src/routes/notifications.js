const express = require('express')
const { authenticate } = require('../middleware/auth')
const { DEFAULT_PREFERENCES } = require('../services/notificationService')

const router = express.Router()
const prisma = require('../lib/prisma.js')

const ALLOWED_PREF_KEYS = [
  'trades', 'waivers', 'drafts', 'roster_moves',
  'league_activity', 'scores', 'chat',
  'push_enabled', 'email_enabled',
]

// GET /api/notifications - Get user's notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 30, unreadOnly } = req.query

    const where = { userId: req.user.id }
    if (unreadOnly === 'true') {
      where.read = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
      }),
      prisma.notification.count({
        where: { userId: req.user.id, read: false },
      }),
    ])

    res.json({ notifications, unreadCount })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/notifications/:id/read - Mark one notification as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: { message: 'Notification not found' } })
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    })

    res.json({ message: 'Marked as read' })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    })

    res.json({ message: 'All marked as read' })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: { message: 'Notification not found' } })
    }

    await prisma.notification.delete({ where: { id: req.params.id } })

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    next(error)
  }
})

// ============ PUSH TOKENS ============

// POST /api/notifications/tokens - Register a push token
router.post('/tokens', authenticate, async (req, res, next) => {
  try {
    const { type, token, deviceId, userAgent, endpoint, p256dh, auth } = req.body

    if (!type || !token) {
      return res.status(400).json({ error: { message: 'type and token are required' } })
    }

    const validTypes = ['WEB_PUSH', 'APNS', 'FCM']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: { message: `type must be one of: ${validTypes.join(', ')}` } })
    }

    const pushToken = await prisma.pushToken.upsert({
      where: {
        userId_token: { userId: req.user.id, token },
      },
      update: {
        isActive: true,
        lastUsed: new Date(),
        deviceId: deviceId || undefined,
        userAgent: userAgent || undefined,
        endpoint: endpoint || undefined,
        p256dh: p256dh || undefined,
        auth: auth || undefined,
      },
      create: {
        userId: req.user.id,
        type,
        token,
        deviceId: deviceId || null,
        userAgent: userAgent || null,
        endpoint: endpoint || null,
        p256dh: p256dh || null,
        auth: auth || null,
      },
    })

    res.status(201).json({ pushToken })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/notifications/tokens/:id - Deactivate a push token
router.delete('/tokens/:id', authenticate, async (req, res, next) => {
  try {
    const pushToken = await prisma.pushToken.findUnique({
      where: { id: req.params.id },
    })

    if (!pushToken || pushToken.userId !== req.user.id) {
      return res.status(404).json({ error: { message: 'Token not found' } })
    }

    await prisma.pushToken.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })

    res.json({ message: 'Token deactivated' })
  } catch (error) {
    next(error)
  }
})

// GET /api/notifications/tokens - List user's active tokens
router.get('/tokens', authenticate, async (req, res, next) => {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { lastUsed: 'desc' },
    })

    res.json({ tokens })
  } catch (error) {
    next(error)
  }
})

// ============ PREFERENCES ============

// GET /api/notifications/preferences - Get notification preferences
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationPreferences: true },
    })

    const prefs = { ...DEFAULT_PREFERENCES, ...(user?.notificationPreferences || {}) }
    res.json({ preferences: prefs })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/notifications/preferences - Update notification preferences
router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const updates = req.body

    // Validate keys
    const invalidKeys = Object.keys(updates).filter(k => !ALLOWED_PREF_KEYS.includes(k))
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: { message: `Invalid preference keys: ${invalidKeys.join(', ')}` } })
    }

    // Validate values are booleans
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'boolean') {
        return res.status(400).json({ error: { message: `${key} must be a boolean` } })
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationPreferences: true },
    })

    const merged = { ...(user?.notificationPreferences || {}), ...updates }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationPreferences: merged },
    })

    const prefs = { ...DEFAULT_PREFERENCES, ...merged }
    res.json({ preferences: prefs })
  } catch (error) {
    next(error)
  }
})

module.exports = router
