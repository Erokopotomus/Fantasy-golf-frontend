const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/players - Get all players with optional filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      search,
      limit = 100,
      offset = 0,
      sortBy = 'owgrRank',
      sortOrder = 'asc',
      available,
      leagueId
    } = req.query

    const where = {}

    // Search by name
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    // Filter available players (not on any roster in the league)
    if (available === 'true' && leagueId) {
      const rostered = await prisma.rosterEntry.findMany({
        where: {
          team: { leagueId }
        },
        select: { playerId: true }
      })
      const rosteredIds = rostered.map(r => r.playerId)
      where.id = { notIn: rosteredIds }
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.player.count({ where })
    ])

    res.json({
      players,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + players.length < total
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/players/:id - Get player details
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        performances: {
          include: {
            tournament: {
              select: { id: true, name: true, startDate: true }
            }
          },
          orderBy: { tournament: { startDate: 'desc' } },
          take: 10
        }
      }
    })

    if (!player) {
      return res.status(404).json({ error: { message: 'Player not found' } })
    }

    res.json({ player })
  } catch (error) {
    next(error)
  }
})

// GET /api/players/:id/stats - Get player stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        performances: {
          include: {
            tournament: true
          },
          orderBy: { tournament: { startDate: 'desc' } }
        }
      }
    })

    if (!player) {
      return res.status(404).json({ error: { message: 'Player not found' } })
    }

    // Calculate additional stats
    const performances = player.performances
    const totalTournaments = performances.length
    const avgFantasyPoints = totalTournaments > 0
      ? performances.reduce((sum, p) => sum + p.fantasyPoints, 0) / totalTournaments
      : 0

    res.json({
      player,
      stats: {
        totalTournaments,
        avgFantasyPoints: Math.round(avgFantasyPoints * 10) / 10,
        recentForm: performances.slice(0, 5).map(p => ({
          tournament: p.tournament.name,
          position: p.position,
          points: p.fantasyPoints
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
