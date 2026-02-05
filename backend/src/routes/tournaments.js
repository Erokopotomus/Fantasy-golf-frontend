const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/tournaments - Get all tournaments
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query

    const where = {}
    if (status) {
      where.status = status
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.tournament.count({ where })
    ])

    res.json({
      tournaments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + tournaments.length < total
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/current - Get current/upcoming tournament
router.get('/current', async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: {
        status: { in: ['IN_PROGRESS', 'UPCOMING'] }
      },
      orderBy: { startDate: 'asc' }
    })

    res.json({ tournament })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/:id - Get tournament details
router.get('/:id', async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        performances: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                country: true,
                countryFlag: true,
                imageUrl: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { totalScore: 'asc' }
          ]
        }
      }
    })

    if (!tournament) {
      return res.status(404).json({ error: { message: 'Tournament not found' } })
    }

    res.json({ tournament })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/:id/leaderboard - Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const performances = await prisma.performance.findMany({
      where: { tournamentId: req.params.id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            country: true,
            countryFlag: true,
            imageUrl: true,
            rank: true
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { totalScore: 'asc' }
      ]
    })

    const leaderboard = performances.map((perf, index) => ({
      position: perf.position || index + 1,
      player: perf.player,
      totalScore: perf.totalScore,
      today: perf.score,
      thru: 18, // Would come from live data
      rounds: {
        r1: perf.round1,
        r2: perf.round2,
        r3: perf.round3,
        r4: perf.round4
      },
      fantasyPoints: perf.fantasyPoints
    }))

    res.json({ leaderboard })
  } catch (error) {
    next(error)
  }
})

module.exports = router
