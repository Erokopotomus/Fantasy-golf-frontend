const express = require('express')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

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
      leagueId,
      sport,
      position,
      team,
    } = req.query

    const where = {}

    // Sport filter: 'nfl' filters to NFL players, 'golf' or default filters to golf players
    if (sport === 'nfl') {
      where.nflPosition = { not: null }
      if (position) where.nflPosition = position.toUpperCase()
      if (team) where.nflTeamAbbr = team.toUpperCase()
    } else if (sport === 'golf' || !sport) {
      // Default: golf players (those without NFL position, or with golf data)
      where.nflPosition = null
    }

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
        skip: parseInt(offset),
        include: {
          performances: {
            orderBy: { tournament: { startDate: 'desc' } },
            take: 5,
            select: { position: true, positionTied: true, status: true },
          },
        },
      }),
      prisma.player.count({ where })
    ])

    // Batch-fetch current-season stats from performances (not career totals)
    const playerIds = players.map(p => p.id)
    const currentYear = new Date().getFullYear()
    const seasonStart = new Date(`${currentYear}-01-01T00:00:00Z`)
    const seasonEnd = new Date(`${currentYear + 1}-01-01T00:00:00Z`)

    const seasonPerfs = playerIds.length > 0 ? await prisma.performance.findMany({
      where: {
        playerId: { in: playerIds },
        tournament: {
          startDate: { gte: seasonStart, lt: seasonEnd },
        },
      },
      select: {
        playerId: true,
        position: true,
        status: true,
      },
    }) : []

    // Aggregate per-player season stats
    const seasonStatsMap = new Map()
    for (const perf of seasonPerfs) {
      if (!seasonStatsMap.has(perf.playerId)) {
        seasonStatsMap.set(perf.playerId, { events: 0, wins: 0, top5s: 0, top10s: 0, top25s: 0, cutsMade: 0 })
      }
      const s = seasonStatsMap.get(perf.playerId)
      s.events++
      if (perf.status !== 'CUT' && perf.status !== 'WD' && perf.status !== 'DQ') {
        s.cutsMade++
        const pos = perf.position
        if (pos != null) {
          if (pos === 1) s.wins++
          if (pos <= 5) s.top5s++
          if (pos <= 10) s.top10s++
          if (pos <= 25) s.top25s++
        }
      }
    }

    // Batch-fetch ClutchScores for listed players (latest weekly snapshot)
    const clutchScores = playerIds.length > 0 ? await prisma.clutchScore.findMany({
      where: {
        playerId: { in: playerIds },
        tournamentId: null,
        formulaVersion: 'v1.0',
      },
      orderBy: { computedAt: 'desc' },
      distinct: ['playerId'],
    }) : []
    const clutchMap = new Map(clutchScores.map(cs => [cs.playerId, cs]))

    // Add recentForm array to each player
    const playersWithForm = players.map(p => {
      const recentForm = (p.performances || [])
        .map(perf => {
          if (perf.status === 'CUT') return 'CUT'
          if (perf.status === 'WD') return 'WD'
          if (perf.position == null) return null
          return perf.positionTied ? `T${perf.position}` : String(perf.position)
        })
        .filter(Boolean)
      const { performances, ...rest } = p
      const cs = clutchMap.get(p.id)
      const ss = seasonStatsMap.get(p.id)
      return {
        ...rest,
        // Override career totals with current-season stats when available
        ...(ss ? {
          events: ss.events,
          wins: ss.wins,
          top5s: ss.top5s,
          top10s: ss.top10s,
          top25s: ss.top25s,
          cutsMade: ss.cutsMade,
        } : {}),
        recentForm,
        clutchMetrics: cs ? {
          cpi: cs.cpi,
          formScore: cs.formScore,
          pressureScore: cs.pressureScore,
          computedAt: cs.computedAt,
        } : null,
      }
    })

    res.json({
      players: playersWithForm,
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

// GET /api/players/:id/schedule — Upcoming tournaments with confirmed/TBD field status
router.get('/:id/schedule', async (req, res, next) => {
  try {
    const playerId = req.params.id

    // Get next 4 upcoming + any in-progress tournaments
    const upcoming = await prisma.tournament.findMany({
      where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] } },
      orderBy: { startDate: 'asc' },
      take: 5,
      select: {
        id: true, name: true, shortName: true, startDate: true, endDate: true,
        status: true, purse: true, tour: true, isMajor: true, isSignature: true,
        fieldSize: true,
        course: { select: { id: true, name: true, nickname: true } },
      },
    })

    // Check which tournaments this player is confirmed in
    const tournamentIds = upcoming.map(t => t.id)
    const performances = tournamentIds.length > 0 ? await prisma.performance.findMany({
      where: { playerId, tournamentId: { in: tournamentIds } },
      select: { tournamentId: true },
    }) : []
    const confirmedSet = new Set(performances.map(p => p.tournamentId))

    const schedule = upcoming.map(t => ({
      ...t,
      inField: confirmedSet.has(t.id),
      fieldAnnounced: t.fieldSize > 0 || confirmedSet.has(t.id),
    }))

    res.json({ schedule })
  } catch (error) {
    next(error)
  }
})

// GET /api/players/:id - Get player details with performances, upcoming, and projection
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    // Year filtering: ?year=2026 (default: current year), ?year=all (career totals)
    const yearParam = req.query.year
    const currentYear = new Date().getFullYear()
    const selectedYear = yearParam === 'all' ? 'all' : parseInt(yearParam) || currentYear
    const yearFilter = selectedYear === 'all' ? {} : {
      tournament: {
        startDate: {
          gte: new Date(`${selectedYear}-01-01T00:00:00Z`),
          lt: new Date(`${selectedYear + 1}-01-01T00:00:00Z`),
        }
      }
    }

    // Find the current or next upcoming tournament for predictions
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'IN_PROGRESS' },
      select: { id: true, name: true }
    })
    const upcomingForPredictions = activeTournament || await prisma.tournament.findFirst({
      where: { status: 'UPCOMING' },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true }
    })

    const [player, allPerformances, upcomingTournaments, predictions, liveScore, availableYearsRaw] = await Promise.all([
      prisma.player.findUnique({
        where: { id: req.params.id },
        include: {
          performances: {
            where: yearFilter,
            include: {
              tournament: {
                select: { id: true, name: true, startDate: true, endDate: true, tour: true, isMajor: true, purse: true, location: true }
              }
            },
            orderBy: { tournament: { startDate: 'desc' } },
          }
        }
      }),
      // Get performances filtered by year for stats computation
      prisma.performance.findMany({
        where: { playerId: req.params.id, ...yearFilter },
        include: {
          tournament: { select: { id: true, name: true, startDate: true, status: true } }
        }
      }),
      prisma.tournament.findMany({
        where: { status: 'UPCOMING' },
        orderBy: { startDate: 'asc' },
        take: 3,
        select: { id: true, name: true, startDate: true, endDate: true, tour: true, isMajor: true, purse: true, location: true }
      }),
      // Predictions for current/upcoming tournament
      upcomingForPredictions ? prisma.playerPrediction.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId: upcomingForPredictions.id,
            playerId: req.params.id
          }
        },
        include: {
          tournament: { select: { id: true, name: true, startDate: true } }
        }
      }) : null,
      // Live score if player is in an active tournament
      activeTournament ? prisma.liveScore.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId: activeTournament.id,
            playerId: req.params.id
          }
        }
      }) : null,
      // Get distinct years this player has performances in
      prisma.$queryRaw`
        SELECT DISTINCT EXTRACT(YEAR FROM t."startDate")::int AS year
        FROM "performances" p
        JOIN "tournaments" t ON p."tournamentId" = t.id
        WHERE p."playerId" = ${req.params.id}
        ORDER BY year DESC
      `
    ])

    if (!player) {
      return res.status(404).json({ error: { message: 'Player not found' } })
    }

    // Build projection from SG stats and recent form
    const perfs = player.performances || []
    const completedPerfs = perfs.filter(p => p.status !== 'WD' && p.status !== 'DQ')
    const recentPerfs = completedPerfs.slice(0, 5)

    // Fantasy points: use stored value if populated, otherwise derive from totalScore
    // totalScore is relative to par (e.g., -20 = 20 under par). Convert to points: 100 + (-totalScore * 3)
    const getPoints = (p) => {
      if (p.fantasyPoints > 0) return p.fantasyPoints
      if (p.totalScore != null) return Math.max(0, 100 + (-p.totalScore * 3))
      return 0
    }

    const avgFpts = completedPerfs.length > 0
      ? completedPerfs.reduce((s, p) => s + getPoints(p), 0) / completedPerfs.length
      : 0
    const recentFpts = recentPerfs.length > 0
      ? recentPerfs.reduce((s, p) => s + getPoints(p), 0) / recentPerfs.length
      : 0

    // Trend: compare recent 3 vs previous 3 (only if enough data for both buckets)
    const scoredPerfs = completedPerfs.filter(p => getPoints(p) > 0)
    const last3 = scoredPerfs.slice(0, 3)
    const prev3 = scoredPerfs.slice(3, 6)
    const last3avg = last3.length >= 2 ? last3.reduce((s, p) => s + getPoints(p), 0) / last3.length : 0
    const prev3avg = prev3.length >= 2 ? prev3.reduce((s, p) => s + getPoints(p), 0) / prev3.length : 0
    const rawTrend = prev3avg > 0 ? ((last3avg - prev3avg) / prev3avg * 100) : 0
    // Cap trend at ±50% — anything higher is noise from small samples
    const trend = Math.max(-50, Math.min(50, rawTrend))

    // SG-based projected points: weight recent form (60%) and season SG (40%)
    const sgProjected = (player.sgTotal || 0) * 25 + 20 // calibrated: SG 2.45 -> ~81 pts
    const projected = recentFpts > 0
      ? Math.round((recentFpts * 0.6 + sgProjected * 0.4) * 10) / 10
      : Math.round(sgProjected * 10) / 10

    // Floor/ceiling from variance in recent results
    const fptValues = completedPerfs.map(p => getPoints(p)).filter(v => v > 0)
    const floor = fptValues.length > 0 ? Math.round(Math.min(...fptValues) * 10) / 10 : 0
    const ceiling = fptValues.length > 0 ? Math.round(Math.max(...fptValues) * 10) / 10 : 0

    // Consistency: coefficient of variation (stddev / mean) → 0-100 scale
    // CV of 0% = perfectly consistent (100), CV of 30%+ = very inconsistent (0)
    const mean = avgFpts
    const variance = fptValues.length > 1
      ? fptValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (fptValues.length - 1)
      : 0
    const stddev = Math.sqrt(variance)
    const cv = mean > 0 ? (stddev / mean) : 0 // coefficient of variation (0.0 to ~0.5)
    const consistency = fptValues.length >= 3
      ? Math.round(Math.max(0, Math.min(100, 100 - cv * 333)) * 10) / 10 // CV 0%=100, CV 15%=50, CV 30%=0
      : null // not enough data

    // Avg score from performances or player's scoringAvg
    const scoresWithTotal = completedPerfs.filter(p => p.totalScore != null)
    const avgScore = scoresWithTotal.length > 0
      ? scoresWithTotal.reduce((s, p) => s + p.totalScore, 0) / scoresWithTotal.length
      : (player.scoringAvg || null)

    const projection = {
      projected: Math.max(projected, 0),
      floor: Math.max(floor, 0),
      ceiling: Math.max(ceiling, 0),
      avgFantasyPoints: Math.round(avgFpts * 10) / 10,
      recentAvg: Math.round(recentFpts * 10) / 10,
      trend: Math.round(trend * 10) / 10, // positive = trending up
      consistency, // 0-100, higher = more consistent
      totalEvents: completedPerfs.length,
      avgScore, // avg total score relative to par (e.g., -18.3)
    }

    // Compute season stats dynamically from all performances
    // Use DB fields if populated, otherwise derive from performance records
    const derivedStats = { events: 0, wins: 0, top5s: 0, top10s: 0, top25s: 0, cutsMade: 0, earnings: 0 }
    for (const perf of allPerformances) {
      derivedStats.events++
      if (perf.status === 'CUT') continue
      if (perf.status !== 'WD' && perf.status !== 'DQ') {
        derivedStats.cutsMade++
      }
      const pos = perf.position
      if (typeof pos === 'number') {
        if (pos === 1) derivedStats.wins++
        if (pos <= 5) derivedStats.top5s++
        if (pos <= 10) derivedStats.top10s++
        if (pos <= 25) derivedStats.top25s++
      }
      if (perf.earnings) derivedStats.earnings += perf.earnings
    }
    // Prefer DB values if they're non-zero (from syncTournamentResults), otherwise use derived
    const seasonStats = {
      events: player.events > 0 ? player.events : derivedStats.events,
      wins: player.wins > 0 ? player.wins : derivedStats.wins,
      top5s: player.top5s > 0 ? player.top5s : derivedStats.top5s,
      top10s: player.top10s > 0 ? player.top10s : derivedStats.top10s,
      top25s: player.top25s > 0 ? player.top25s : derivedStats.top25s,
      cutsMade: player.cutsMade > 0 ? player.cutsMade : derivedStats.cutsMade,
      earnings: player.earnings > 0 ? player.earnings : derivedStats.earnings,
    }

    // Fetch latest Clutch metrics (weekly snapshot + event-specific if applicable)
    const [clutchMetricsWeekly, clutchMetricsEvent] = await Promise.all([
      prisma.clutchScore.findFirst({
        where: { playerId: req.params.id, tournamentId: null },
        orderBy: { computedAt: 'desc' },
      }),
      upcomingForPredictions ? prisma.clutchScore.findFirst({
        where: { playerId: req.params.id, tournamentId: upcomingForPredictions.id },
        orderBy: { computedAt: 'desc' },
      }) : null,
    ])

    const clutchMetrics = {
      cpi: clutchMetricsWeekly?.cpi ?? null,
      formScore: clutchMetricsWeekly?.formScore ?? null,
      pressureScore: clutchMetricsWeekly?.pressureScore ?? null,
      courseFitScore: clutchMetricsEvent?.courseFitScore ?? null,
      cpiComponents: clutchMetricsWeekly?.cpiComponents ?? null,
      formComponents: clutchMetricsWeekly?.formComponents ?? null,
      pressureComponents: clutchMetricsWeekly?.pressureComponents ?? null,
      fitComponents: clutchMetricsEvent?.fitComponents ?? null,
      computedAt: clutchMetricsWeekly?.computedAt ?? null,
    }

    const availableYears = (availableYearsRaw || []).map(r => r.year).filter(Boolean)

    res.json({ player, upcomingTournaments, projection, predictions, liveScore, seasonStats, clutchMetrics, availableYears, selectedYear })
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
