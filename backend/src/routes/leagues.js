const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/leagues - Get user's leagues
router.get('/', authenticate, async (req, res, next) => {
  try {
    const leagues = await prisma.league.findMany({
      where: {
        members: {
          some: { userId: req.user.id }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true, teams: true }
        },
        teams: {
          where: { userId: req.user.id },
          select: {
            id: true,
            name: true,
            totalPoints: true,
            wins: true,
            losses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ leagues })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues - Create a new league
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, format, draftType, maxTeams, maxMembers, isPublic, settings, formatSettings, rosterSize, scoringType, budget } = req.body

    // Map frontend format strings to enum values
    const formatMap = {
      'full-league': 'FULL_LEAGUE',
      'head-to-head': 'HEAD_TO_HEAD',
      'roto': 'ROTO',
      'survivor': 'SURVIVOR',
      'one-and-done': 'ONE_AND_DONE',
    }

    const draftTypeMap = {
      'snake': 'SNAKE',
      'auction': 'AUCTION',
      'none': 'NONE',
    }

    const resolvedFormat = formatMap[format] || format || 'FULL_LEAGUE'
    const resolvedDraftType = draftTypeMap[draftType] || draftType || 'SNAKE'
    const resolvedMaxTeams = maxTeams || maxMembers || 10

    // Combine settings
    const combinedSettings = {
      ...(settings || {}),
      ...(formatSettings || {}),
      rosterSize: rosterSize || 6,
      scoringType: scoringType || 'standard',
      budget: budget || null,
    }

    const league = await prisma.league.create({
      data: {
        name,
        format: resolvedFormat,
        draftType: resolvedDraftType,
        maxTeams: resolvedMaxTeams,
        isPublic: isPublic || false,
        settings: combinedSettings,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'OWNER'
          }
        },
        // Also create a team for the owner
        teams: {
          create: {
            name: `${req.user.name}'s Team`,
            userId: req.user.id
          }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    // Return with joinCode alias for frontend compatibility
    res.status(201).json({
      ...league,
      joinCode: league.inviteCode,
      league: {
        ...league,
        joinCode: league.inviteCode
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id - Get league details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        teams: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            },
            roster: {
              include: {
                player: true
              }
            }
          },
          orderBy: { totalPoints: 'desc' }
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Check if user is a member
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized to view this league' } })
    }

    // Add standings/rankings
    const standings = league.teams.map((team, index) => ({
      ...team,
      rank: index + 1
    }))

    res.json({
      league: {
        ...league,
        standings
      }
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/leagues/:id - Update league settings (commissioner only)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, format, settings, isPublic } = req.body

    const league = await prisma.league.findUnique({
      where: { id: req.params.id }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Only owner can update league
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can update league settings' } })
    }

    // Build update data
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (isPublic !== undefined) updateData.isPublic = isPublic

    // Handle format change
    if (format !== undefined) {
      const formatMap = {
        'full-league': 'FULL_LEAGUE',
        'head-to-head': 'HEAD_TO_HEAD',
        'roto': 'ROTO',
        'survivor': 'SURVIVOR',
        'one-and-done': 'ONE_AND_DONE',
      }
      updateData.format = formatMap[format] || format
    }

    // Merge settings if provided
    if (settings !== undefined) {
      updateData.settings = { ...league.settings, ...settings }
    }

    const updatedLeague = await prisma.league.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    res.json({ league: updatedLeague })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/leagues/:id - Delete league (commissioner only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Only owner can delete league
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can delete the league' } })
    }

    // Delete league and all related data (cascading deletes handled by schema)
    await prisma.league.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'League deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/join - Join a league
router.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const { inviteCode } = req.body
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { members: true } }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Verify invite code if league is private
    if (!league.isPublic && league.inviteCode !== inviteCode) {
      return res.status(403).json({ error: { message: 'Invalid invite code' } })
    }

    // Check if league is full
    if (league._count.members >= league.maxTeams) {
      return res.status(400).json({ error: { message: 'League is full' } })
    }

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId: league.id
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ error: { message: 'Already a member of this league' } })
    }

    // Add member and create team
    await prisma.$transaction([
      prisma.leagueMember.create({
        data: {
          userId: req.user.id,
          leagueId: league.id,
          role: 'MEMBER'
        }
      }),
      prisma.team.create({
        data: {
          name: `${req.user.name}'s Team`,
          userId: req.user.id,
          leagueId: league.id
        }
      })
    ])

    res.json({ message: 'Successfully joined league' })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/join-by-code - Join league by invite code
router.post('/join-by-code', authenticate, async (req, res, next) => {
  try {
    const { inviteCode } = req.body

    const league = await prisma.league.findUnique({
      where: { inviteCode },
      include: {
        _count: { select: { members: true } }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'Invalid invite code' } })
    }

    // Check if league is full
    if (league._count.members >= league.maxTeams) {
      return res.status(400).json({ error: { message: 'League is full' } })
    }

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId: league.id
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ error: { message: 'Already a member of this league' } })
    }

    // Add member and create team
    await prisma.$transaction([
      prisma.leagueMember.create({
        data: {
          userId: req.user.id,
          leagueId: league.id,
          role: 'MEMBER'
        }
      }),
      prisma.team.create({
        data: {
          name: `${req.user.name}'s Team`,
          userId: req.user.id,
          leagueId: league.id
        }
      })
    ])

    res.json({ league, message: 'Successfully joined league' })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/messages - Get league chat messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query

    const messages = await prisma.message.findMany({
      where: {
        leagueId: req.params.id,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })

    res.json({ messages: messages.reverse() })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/messages - Send a message
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body

    const message = await prisma.message.create({
      data: {
        content,
        userId: req.user.id,
        leagueId: req.params.id
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    // Emit via Socket.IO
    const io = req.app.get('io')
    io.to(`league-${req.params.id}`).emit('new-message', message)

    res.status(201).json({ message })
  } catch (error) {
    next(error)
  }
})

module.exports = router
