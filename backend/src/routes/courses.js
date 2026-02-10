const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/courses — List courses with optional search
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query

    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          city: true,
          state: true,
          country: true,
          par: true,
          yardage: true,
          grassType: true,
          architect: true,
          imageUrl: true,
          _count: { select: { tournaments: true } },
        },
        orderBy: { name: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.course.count({ where }),
    ])

    res.json({
      courses,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + courses.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/courses/:id — Full course detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        holes: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            par: true,
            yardage: true,
            handicap: true,
          },
        },
        tournaments: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            purse: true,
            fieldSize: true,
            isMajor: true,
            isSignature: true,
          },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
        playerHistory: {
          select: {
            id: true,
            rounds: true,
            avgScore: true,
            avgToPar: true,
            bestFinish: true,
            wins: true,
            top10s: true,
            cuts: true,
            cutsMade: true,
            sgTotal: true,
            sgPutting: true,
            sgApproach: true,
            sgOffTee: true,
            lastPlayed: true,
            player: {
              select: {
                id: true,
                name: true,
                country: true,
                countryFlag: true,
                headshotUrl: true,
              },
            },
          },
          orderBy: { avgToPar: 'asc' },
          take: 25,
          where: { rounds: { gte: 4 } },
        },
      },
    })

    if (!course) {
      return res.status(404).json({ error: { message: 'Course not found' } })
    }

    // Compute course stats from tournament history
    const completedTournaments = course.tournaments.filter(t => t.status === 'COMPLETED')
    if (completedTournaments.length > 0) {
      const tIds = completedTournaments.map(t => t.id)
      const stats = await prisma.performance.aggregate({
        where: {
          tournamentId: { in: tIds },
          position: 1,
          totalToPar: { not: null },
        },
        _avg: { totalToPar: true },
      })
      const cutStats = await prisma.performance.aggregate({
        where: {
          tournamentId: { in: tIds },
          status: 'CUT',
          totalToPar: { not: null },
        },
        _avg: { totalToPar: true },
      })
      course.courseStats = {
        avgWinningScore: stats._avg.totalToPar,
        avgCutLine: cutStats._avg.totalToPar,
        tournamentsPlayed: completedTournaments.length,
      }
    }

    // ── Active/upcoming tournament enrichment ──────────────────────────────
    const activeTournament = course.tournaments.find(
      t => t.status === 'IN_PROGRESS' || t.status === 'UPCOMING'
    )

    if (activeTournament) {
      // Top 10 course fits from ClutchScore
      const topFits = await prisma.clutchScore.findMany({
        where: { tournamentId: activeTournament.id, courseFitScore: { not: null } },
        orderBy: { courseFitScore: 'desc' },
        take: 10,
        select: {
          courseFitScore: true,
          cpi: true,
          formScore: true,
          player: {
            select: {
              id: true,
              name: true,
              headshotUrl: true,
              countryFlag: true,
              sgTotal: true,
              owgr: true,
            },
          },
        },
      })
      course.topCourseFits = topFits.map(cs => ({
        ...cs.player,
        courseFitScore: cs.courseFitScore,
        cpi: cs.cpi,
        formScore: cs.formScore,
      }))

      // Weather forecast
      const weather = await prisma.weather.findMany({
        where: { tournamentId: activeTournament.id },
        orderBy: { round: 'asc' },
      })
      course.weather = weather
      course.activeTournamentId = activeTournament.id
    }

    // ── Related news ─────────────────────────────────────────────────────
    const searchTerms = [course.nickname || course.name]
    if (activeTournament) searchTerms.push(activeTournament.name)

    let news = await prisma.newsArticle.findMany({
      where: {
        sport: 'golf',
        OR: searchTerms.flatMap(term => [
          { headline: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ]),
      },
      orderBy: { published: 'desc' },
      take: 6,
    })

    // Fallback to recent golf news if nothing matched
    if (news.length < 2) {
      news = await prisma.newsArticle.findMany({
        where: { sport: 'golf' },
        orderBy: [{ priority: 'asc' }, { published: 'desc' }],
        take: 6,
      })
    }
    course.news = news

    res.json({ course })
  } catch (error) {
    next(error)
  }
})

module.exports = router
