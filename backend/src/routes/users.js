const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/users/me - Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        teams: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
                format: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: {
            leagues: true,
            teams: true
          }
        }
      }
    })

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/users/me - Update current user profile
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, avatar } = req.body

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar })
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true
      }
    })

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// GET /api/users/:id - Get user by ID (public profile)
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } })
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

module.exports = router
