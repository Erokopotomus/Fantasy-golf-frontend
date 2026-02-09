const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const SOCIAL_KEYS = ['twitter', 'youtube', 'podcast', 'website', 'instagram', 'tiktok']

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
        username: true,
        bio: true,
        tagline: true,
        socialLinks: true,
        pinnedBadges: true,
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
    const { name, avatar, bio, tagline, socialLinks, username, pinnedBadges } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (avatar) updateData.avatar = avatar
    if (bio !== undefined) updateData.bio = bio ? String(bio).slice(0, 2000) : null
    if (tagline !== undefined) updateData.tagline = tagline ? String(tagline).slice(0, 280) : null
    if (socialLinks !== undefined) {
      const cleaned = {}
      if (socialLinks && typeof socialLinks === 'object') {
        for (const key of SOCIAL_KEYS) {
          if (socialLinks[key]) cleaned[key] = String(socialLinks[key]).slice(0, 500)
        }
      }
      updateData.socialLinks = cleaned
    }

    // Pinned badges validation (max 3, must be in user's earned badges)
    if (pinnedBadges !== undefined) {
      if (!Array.isArray(pinnedBadges) || pinnedBadges.length > 3) {
        return res.status(400).json({ error: { message: 'pinnedBadges must be an array with at most 3 entries' } })
      }
      // Validate each badge exists in user's earned badges
      const reps = await prisma.userReputation.findMany({
        where: { userId: req.user.id },
        select: { badges: true },
      })
      const earnedBadges = new Set()
      for (const rep of reps) {
        const badges = Array.isArray(rep.badges) ? rep.badges : []
        for (const b of badges) {
          const badgeName = typeof b === 'string' ? b : (b?.type || b?.name || '')
          if (badgeName) earnedBadges.add(badgeName)
        }
      }
      for (const badge of pinnedBadges) {
        if (typeof badge !== 'string' || !earnedBadges.has(badge)) {
          return res.status(400).json({ error: { message: `Badge "${badge}" not earned` } })
        }
      }
      updateData.pinnedBadges = pinnedBadges
    }

    // Username validation
    if (username !== undefined) {
      if (username === null || username === '') {
        updateData.username = null
      } else {
        const u = String(username).toLowerCase().trim()
        if (u.length < 3 || u.length > 30) {
          return res.status(400).json({ error: { message: 'Username must be 3-30 characters' } })
        }
        if (!USERNAME_REGEX.test(u)) {
          return res.status(400).json({ error: { message: 'Username must contain only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.' } })
        }
        updateData.username = u
      }
    }

    let user
    try {
      user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          username: true,
          bio: true,
          tagline: true,
          socialLinks: true,
          pinnedBadges: true,
          createdAt: true
        }
      })
    } catch (err) {
      if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
        return res.status(409).json({ error: { message: 'Username is already taken' } })
      }
      throw err
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// GET /api/users/by-username/:username - Public profile by username (no auth required)
router.get('/by-username/:username', async (req, res, next) => {
  try {
    const username = req.params.username.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        avatar: true,
        username: true,
        bio: true,
        tagline: true,
        socialLinks: true,
        pinnedBadges: true,
        createdAt: true,
      }
    })

    if (!user) {
      return res.status(404).json({ error: { message: 'Profile not found' } })
    }

    // Parallel fetch: reputation, clutch rating, manager profile, recent predictions, achievements
    const [reputations, clutchRating, managerProfiles, recentPredictions, achievements] = await Promise.all([
      prisma.userReputation.findMany({ where: { userId: user.id } }),
      prisma.clutchManagerRating.findUnique({ where: { userId: user.id } }).catch(() => null),
      prisma.managerProfile.findMany({
        where: { userId: user.id },
        include: { sport: { select: { id: true, slug: true, name: true } } },
      }),
      prisma.prediction.findMany({
        where: { userId: user.id, outcome: { not: 'PENDING' }, isPublic: true },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          sport: true,
          predictionType: true,
          predictionData: true,
          outcome: true,
          accuracyScore: true,
          resolvedAt: true,
          createdAt: true,
        },
      }),
      prisma.achievementUnlock.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
        take: 10,
      }),
    ])

    // Split manager profiles
    const aggregate = managerProfiles.find(p => p.sportId === null) || null
    const bySport = managerProfiles.filter(p => p.sportId !== null)

    res.json({
      user,
      reputations,
      clutchRating: clutchRating ? {
        overall: clutchRating.overallRating,
        accuracy: clutchRating.accuracyComponent,
        consistency: clutchRating.consistencyComponent,
        volume: clutchRating.volumeComponent,
        breadth: clutchRating.breadthComponent,
        tier: clutchRating.tier,
        trend: clutchRating.trend,
        totalGradedCalls: clutchRating.totalGradedCalls,
        updatedAt: clutchRating.updatedAt,
      } : null,
      managerStats: {
        aggregate,
        bySport,
      },
      recentCalls: recentPredictions,
      achievements: achievements.map(u => ({
        id: u.achievement.id,
        name: u.achievement.name,
        icon: u.achievement.icon,
        tier: u.achievement.tier,
        category: u.achievement.category,
        unlockedAt: u.unlockedAt,
      })),
    })
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
        username: true,
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
