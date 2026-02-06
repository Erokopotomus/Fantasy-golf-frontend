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

// GET /api/players/:id - Get player details with performances, upcoming, and projection
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const [player, upcomingTournaments] = await Promise.all([
      prisma.player.findUnique({
        where: { id: req.params.id },
        include: {
          performances: {
            include: {
              tournament: {
                select: { id: true, name: true, startDate: true, endDate: true, tour: true, isMajor: true, purse: true, location: true }
              }
            },
            orderBy: { tournament: { startDate: 'desc' } },
            take: 10
          }
        }
      }),
      prisma.tournament.findMany({
        where: { status: 'UPCOMING' },
        orderBy: { startDate: 'asc' },
        take: 3,
        select: { id: true, name: true, startDate: true, endDate: true, tour: true, isMajor: true, purse: true, location: true }
      })
    ])

    if (!player) {
      return res.status(404).json({ error: { message: 'Player not found' } })
    }

    // Build projection from SG stats and recent form
    const perfs = player.performances || []
    const completedPerfs = perfs.filter(p => p.status !== 'WD' && p.status !== 'DQ')
    const recentPerfs = completedPerfs.slice(0, 5)
    const avgFpts = completedPerfs.length > 0
      ? completedPerfs.reduce((s, p) => s + (p.fantasyPoints || 0), 0) / completedPerfs.length
      : 0
    const recentFpts = recentPerfs.length > 0
      ? recentPerfs.reduce((s, p) => s + (p.fantasyPoints || 0), 0) / recentPerfs.length
      : 0

    // Trend: compare recent 3 vs previous 3
    const last3 = completedPerfs.slice(0, 3)
    const prev3 = completedPerfs.slice(3, 6)
    const last3avg = last3.length > 0 ? last3.reduce((s, p) => s + (p.fantasyPoints || 0), 0) / last3.length : 0
    const prev3avg = prev3.length > 0 ? prev3.reduce((s, p) => s + (p.fantasyPoints || 0), 0) / prev3.length : 0
    const trend = prev3avg > 0 ? ((last3avg - prev3avg) / prev3avg * 100) : 0

    // SG-based projected points: weight recent form (60%) and season SG (40%)
    const sgProjected = (player.sgTotal || 0) * 25 + 20 // calibrated: SG 2.45 -> ~81 pts
    const projected = recentFpts > 0
      ? Math.round((recentFpts * 0.6 + sgProjected * 0.4) * 10) / 10
      : Math.round(sgProjected * 10) / 10

    // Floor/ceiling from variance in recent results
    const fptValues = completedPerfs.map(p => p.fantasyPoints || 0)
    const floor = fptValues.length > 0 ? Math.round(Math.min(...fptValues) * 10) / 10 : 0
    const ceiling = fptValues.length > 0 ? Math.round(Math.max(...fptValues) * 10) / 10 : 0

    // Consistency: std deviation of fantasy points
    const mean = avgFpts
    const variance = fptValues.length > 1
      ? fptValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (fptValues.length - 1)
      : 0
    // Scale: stddev of 0 = 100 consistency, stddev of 40+ = 0 consistency
    const stddev = Math.sqrt(variance)
    const consistency = Math.round(Math.max(0, 100 - stddev * 2.5) * 10) / 10

    const projection = {
      projected: Math.max(projected, 0),
      floor: Math.max(floor, 0),
      ceiling: Math.max(ceiling, 0),
      avgFantasyPoints: Math.round(avgFpts * 10) / 10,
      recentAvg: Math.round(recentFpts * 10) / 10,
      trend: Math.round(trend * 10) / 10, // positive = trending up
      consistency, // 0-100, higher = more consistent
      totalEvents: completedPerfs.length,
    }

    res.json({ player, upcomingTournaments, projection })
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
