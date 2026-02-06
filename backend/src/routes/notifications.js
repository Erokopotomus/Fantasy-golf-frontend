const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

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

module.exports = router
