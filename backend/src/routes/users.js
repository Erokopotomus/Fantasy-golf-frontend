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
    const { name, avatar, bio, tagline, socialLinks } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (avatar) updateData.avatar = avatar
    if (bio !== undefined) updateData.bio = bio ? String(bio).slice(0, 2000) : null
    if (tagline !== undefined) updateData.tagline = tagline ? String(tagline).slice(0, 280) : null
    if (socialLinks !== undefined) {
      // Validate socialLinks is an object with allowed keys
      const allowed = ['twitter', 'youtube', 'podcast', 'website']
      const cleaned = {}
      if (socialLinks && typeof socialLinks === 'object') {
        for (const key of allowed) {
          if (socialLinks[key]) cleaned[key] = String(socialLinks[key]).slice(0, 500)
        }
      }
      updateData.socialLinks = cleaned
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        tagline: true,
        socialLinks: true,
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
