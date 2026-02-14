const express = require('express')
const { optionalAuth } = require('../middleware/auth')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('../services/scoringService')

const router = express.Router()
const prisma = require('../lib/prisma.js')

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
        include: {
          course: {
            select: { id: true, name: true, nickname: true, city: true, state: true, par: true, yardage: true },
          },
        },
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

    // For live tournaments, ensure currentRound accounts for date-based expected round
    // (API data may lag between rounds, e.g. early morning before tee times)
    if (tournament && tournament.status === 'IN_PROGRESS' && tournament.startDate) {
      const daysSinceStart = Math.floor((Date.now() - new Date(tournament.startDate).getTime()) / 86400000)
      const dateBasedRound = Math.min(Math.max(daysSinceStart + 1, 1), 4)
      if (dateBasedRound > (tournament.currentRound || 0)) {
        tournament.currentRound = dateBasedRound
      }
    }

    res.json({ tournament })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/upcoming-with-fields — Next 4 upcoming + current in-progress tournaments with field data
router.get('/upcoming-with-fields', optionalAuth, async (req, res, next) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] } },
      orderBy: { startDate: 'asc' },
      take: 5,
      include: {
        course: {
          select: { id: true, name: true, nickname: true, city: true, state: true, par: true },
        },
        performances: {
          select: {
            playerId: true,
            player: {
              select: { id: true, name: true, countryFlag: true, owgrRank: true, sgTotal: true, primaryTour: true },
            },
          },
        },
      },
    })

    const result = tournaments.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      purse: t.purse,
      tour: t.tour,
      isMajor: t.isMajor,
      isSignature: t.isSignature,
      currentRound: t.currentRound,
      fieldSize: t.fieldSize || t.performances.length,
      course: t.course,
      field: t.performances.map(p => ({
        playerId: p.player.id,
        playerName: p.player.name,
        countryFlag: p.player.countryFlag,
        owgrRank: p.player.owgrRank,
        sgTotal: p.player.sgTotal,
        primaryTour: p.player.primaryTour,
      })),
    }))

    res.json({ tournaments: result })
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
        course: true,
        performances: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                country: true,
                countryFlag: true,
                headshotUrl: true
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

    // Date-based round floor for live tournaments
    if (tournament.status === 'IN_PROGRESS' && tournament.startDate) {
      const daysSinceStart = Math.floor((Date.now() - new Date(tournament.startDate).getTime()) / 86400000)
      const dateBasedRound = Math.min(Math.max(daysSinceStart + 1, 1), 4)
      if (dateBasedRound > (tournament.currentRound || 0)) {
        tournament.currentRound = dateBasedRound
      }
    }

    res.json({ tournament })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/:id/leaderboard - Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const { scoringPreset } = req.query

    // Check if tournament is live to decide whether to use LiveScore data
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      select: { status: true },
    })
    const isLive = tournament?.status === 'IN_PROGRESS'

    const [performances, allRoundScores, liveScores] = await Promise.all([
      prisma.performance.findMany({
        where: { tournamentId: req.params.id },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              country: true,
              countryFlag: true,
              headshotUrl: true,
              owgrRank: true,
              primaryTour: true,
            }
          },
        },
        orderBy: [
          { position: 'asc' },
          { totalScore: 'asc' }
        ]
      }),
      prisma.roundScore.findMany({
        where: { tournamentId: req.params.id },
        orderBy: { roundNumber: 'asc' },
      }),
      // Only fetch live scores when tournament is in progress
      isLive
        ? prisma.liveScore.findMany({ where: { tournamentId: req.params.id } })
        : Promise.resolve([]),
    ])

    // Index round scores by playerId
    const roundScoresByPlayer = {}
    const teeTimesByPlayer = {} // { playerId: { 1: teeTime, 2: teeTime, ... } }
    for (const rs of allRoundScores) {
      if (!roundScoresByPlayer[rs.playerId]) roundScoresByPlayer[rs.playerId] = []
      roundScoresByPlayer[rs.playerId].push(rs)
      if (rs.teeTime) {
        if (!teeTimesByPlayer[rs.playerId]) teeTimesByPlayer[rs.playerId] = {}
        teeTimesByPlayer[rs.playerId][rs.roundNumber] = rs.teeTime
      }
    }

    // Index live scores by playerId
    const liveByPlayer = {}
    for (const ls of liveScores) {
      liveByPlayer[ls.playerId] = ls
    }

    // Determine scoring config
    const scoringConfig = scoringPreset
      ? getDefaultScoringConfig(scoringPreset)
      : getDefaultScoringConfig('standard')

    // Fetch Clutch metrics for all players in the field
    const fieldPlayerIds = performances.map(p => p.playerId)
    const clutchScores = fieldPlayerIds.length > 0 ? await prisma.clutchScore.findMany({
      where: {
        playerId: { in: fieldPlayerIds },
        tournamentId: req.params.id,
      },
    }) : []
    const clutchMap = new Map(clutchScores.map(cs => [cs.playerId, cs]))

    // Also fetch weekly snapshots for players without event-specific scores
    const playersWithoutEventScores = fieldPlayerIds.filter(pid => !clutchMap.has(pid))
    if (playersWithoutEventScores.length > 0) {
      const weeklyScores = await prisma.clutchScore.findMany({
        where: {
          playerId: { in: playersWithoutEventScores },
          tournamentId: null,
        },
        orderBy: { computedAt: 'desc' },
        distinct: ['playerId'],
      })
      for (const ws of weeklyScores) {
        if (!clutchMap.has(ws.playerId)) clutchMap.set(ws.playerId, ws)
      }
    }

    // For UPCOMING tournaments, fetch course history for field players
    const tournamentFull = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      select: { status: true, courseId: true },
    })
    let courseHistoryMap = new Map()
    if (tournamentFull?.status === 'UPCOMING' && tournamentFull?.courseId && fieldPlayerIds.length > 0) {
      const histories = await prisma.playerCourseHistory.findMany({
        where: {
          playerId: { in: fieldPlayerIds },
          courseId: tournamentFull.courseId,
        },
      })
      for (const h of histories) {
        courseHistoryMap.set(h.playerId, h)
      }
    }

    const leaderboard = performances.map((perf, index) => {
      // Attach round scores for bonus calculation
      const perfWithRounds = { ...perf, roundScores: roundScoresByPlayer[perf.playerId] || [] }
      const { total: fantasyPoints, breakdown } = calculateFantasyPoints(perfWithRounds, scoringConfig)

      const live = liveByPlayer[perf.playerId]

      // Derive "today" score from last completed round
      const completedRounds = [perf.round1, perf.round2, perf.round3, perf.round4].filter((r) => r != null)
      const today = completedRounds.length > 0 ? completedRounds[completedRounds.length - 1] : null

      const entry = {
        position: (live?.position ?? perf.position) || index + 1,
        positionTied: live?.positionTied ?? perf.positionTied,
        player: perf.player,
        totalScore: perf.totalScore,
        totalToPar: live?.totalToPar ?? perf.totalToPar,
        today: live?.todayToPar ?? today,
        thru: live?.thru ?? (perf.status === 'CUT' ? 'CUT' : 18),
        status: perf.status,
        rounds: {
          r1: perf.round1,
          r2: perf.round2,
          r3: perf.round3,
          r4: perf.round4
        },
        fantasyPoints,
        breakdown,
        eagles: perf.eagles,
        birdies: perf.birdies,
        bogeys: perf.bogeys,
        teeTimes: teeTimesByPlayer[perf.playerId] || null,
      }

      // Include Clutch metrics
      const cs = clutchMap.get(perf.playerId)
      if (cs) {
        entry.clutchMetrics = {
          cpi: cs.cpi,
          formScore: cs.formScore,
          pressureScore: cs.pressureScore,
          courseFitScore: cs.courseFitScore,
        }
      }

      // Include course history for UPCOMING tournaments
      const ch = courseHistoryMap.get(perf.playerId)
      if (ch) {
        entry.courseHistory = {
          rounds: ch.rounds,
          avgToPar: ch.avgToPar,
          bestFinish: ch.bestFinish,
          wins: ch.wins,
          top10s: ch.top10s,
          cuts: ch.cuts,
          cutsMade: ch.cutsMade,
          sgTotal: ch.sgTotal,
        }
      }

      // Include live probabilities when tournament is in progress
      if (live) {
        entry.currentHole = live.currentHole
        entry.currentRound = live.currentRound
        entry.probabilities = {
          win: live.winProbability,
          top5: live.top5Probability,
          top10: live.top10Probability,
          top20: live.top20Probability,
          makeCut: live.makeCutProbability,
        }
        entry.sgTotalLive = live.sgTotalLive
      }

      return entry
    })

    // Sort by live position when available, fallback to performance position
    if (isLive) {
      leaderboard.sort((a, b) => {
        const posA = a.position ?? 999
        const posB = b.position ?? 999
        if (posA !== posB) return posA - posB
        return (a.totalToPar ?? 999) - (b.totalToPar ?? 999)
      })
    }

    res.json({ leaderboard, isLive })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/:id/scorecards/:playerId - Get hole-by-hole scores for a player
router.get('/:id/scorecards/:playerId', async (req, res, next) => {
  try {
    const { id: tournamentId, playerId } = req.params

    const roundScores = await prisma.roundScore.findMany({
      where: { tournamentId, playerId },
      include: {
        holeScores: {
          orderBy: { holeNumber: 'asc' },
        },
      },
      orderBy: { roundNumber: 'asc' },
    })

    // Shape: { [roundNumber]: [{ hole, par, score, toPar }] }
    const scorecards = {}
    for (const rs of roundScores) {
      scorecards[rs.roundNumber] = rs.holeScores.map((hs) => ({
        hole: hs.holeNumber,
        par: hs.par,
        score: hs.score,
        toPar: hs.toPar,
      }))
    }

    res.json({ scorecards })
  } catch (error) {
    next(error)
  }
})

// GET /api/tournaments/:id/weather - Get tournament weather forecast
router.get('/:id/weather', async (req, res, next) => {
  try {
    const weather = await prisma.weather.findMany({
      where: { tournamentId: req.params.id },
      orderBy: { round: 'asc' },
    })

    res.json({ weather })
  } catch (error) {
    next(error)
  }
})

module.exports = router
