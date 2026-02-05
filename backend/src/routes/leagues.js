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
    const { name, format, draftType, maxTeams, isPublic, settings } = req.body

    const league = await prisma.league.create({
      data: {
        name,
        format: format || 'FULL_LEAGUE',
        draftType: draftType || 'SNAKE',
        maxTeams: maxTeams || 10,
        isPublic: isPublic || false,
        settings: settings || {},
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'OWNER'
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

    res.status(201).json({ league })
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
