const express = require('express')
const { authenticate } = require('../middleware/auth')
const { refreshAllViews } = require('../services/viewRefresher')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// ─── GET /api/analytics/player/:id/history ──────────────────────────────────
// Multi-season fantasy performance for a player
router.get('/player/:id/history', authenticate, async (req, res, next) => {
  try {
    const { scoringSystem } = req.query

    const seasonStats = await prisma.playerSeasonStats.findMany({
      where: { playerId: req.params.id },
      include: { season: { select: { id: true, name: true, year: true, slug: true } } },
      orderBy: { season: { year: 'desc' } },
    })

    // Get week-by-week scores if a scoring system is specified
    let weeklyBreakdown = []
    if (scoringSystem) {
      const ss = await prisma.scoringSystem.findFirst({ where: { slug: scoringSystem } })
      if (ss) {
        weeklyBreakdown = await prisma.fantasyScore.findMany({
          where: { playerId: req.params.id, scoringSystemId: ss.id },
          include: { fantasyWeek: { select: { weekNumber: true, name: true, startDate: true } } },
          orderBy: { fantasyWeek: { weekNumber: 'asc' } },
        })
      }
    }

    res.json({ seasonStats, weeklyBreakdown })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/player/:id/consistency ──────────────────────────────
// Boom/bust, floor/ceiling for a player
router.get('/player/:id/consistency', authenticate, async (req, res, next) => {
  try {
    const { season, scoringSystem = 'standard' } = req.query

    const where = { playerId: req.params.id }

    // Find scoring system
    const ss = await prisma.scoringSystem.findFirst({ where: { slug: scoringSystem } })
    if (ss) where.scoringSystemId = ss.id

    if (season) {
      const seasonRecord = await prisma.season.findFirst({ where: { slug: season } })
      if (seasonRecord) where.seasonId = seasonRecord.id
    }

    const consistency = await prisma.playerConsistency.findMany({
      where,
      include: {
        season: { select: { name: true, year: true, slug: true } },
        scoringSystem: { select: { name: true, slug: true } },
      },
      orderBy: { season: { year: 'desc' } },
    })

    res.json({ consistency })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/rankings ────────────────────────────────────────────
// Fantasy rankings by season and scoring system
router.get('/rankings', authenticate, async (req, res, next) => {
  try {
    const { season, scoringSystem = 'standard', limit = 50, offset = 0 } = req.query

    // Try materialized view first for speed
    try {
      const ss = await prisma.scoringSystem.findFirst({ where: { slug: scoringSystem } })
      let seasonRecord
      if (season) {
        seasonRecord = await prisma.season.findFirst({ where: { slug: season } })
      } else {
        seasonRecord = await prisma.season.findFirst({ where: { isCurrent: true } })
      }

      if (ss && seasonRecord) {
        const rankings = await prisma.$queryRaw`
          SELECT r.*, p.name as player_name, p."headshotUrl", p."primaryTour", p."owgrRank"
          FROM mv_player_fantasy_rankings r
          JOIN players p ON r."playerId" = p.id
          WHERE r."seasonId" = ${seasonRecord.id}
            AND r."scoringSystemId" = ${ss.id}
          ORDER BY r.season_rank ASC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `
        return res.json({ rankings, source: 'materialized_view' })
      }
    } catch (e) {
      // Fall through to direct query
    }

    // Fallback: query PlayerSeasonStats
    let seasonId
    if (season) {
      const s = await prisma.season.findFirst({ where: { slug: season } })
      seasonId = s?.id
    } else {
      const s = await prisma.season.findFirst({ where: { isCurrent: true } })
      seasonId = s?.id
    }

    if (!seasonId) return res.json({ rankings: [] })

    const stats = await prisma.playerSeasonStats.findMany({
      where: { seasonId },
      include: { player: { select: { id: true, name: true, headshotUrl: true, primaryTour: true, owgrRank: true } } },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    })

    // Sort by fantasy points for the requested system
    const sorted = stats
      .map(s => ({ ...s, sortPoints: s.fantasyPoints?.[scoringSystem] || 0 }))
      .sort((a, b) => b.sortPoints - a.sortPoints)
      .map((s, i) => ({ ...s, rank: i + 1 + parseInt(offset) }))

    res.json({ rankings: sorted, source: 'direct_query' })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/draft/adp ───────────────────────────────────────────
// ADP table with value metrics
router.get('/draft/adp', authenticate, async (req, res, next) => {
  try {
    const { season, limit = 100 } = req.query

    let seasonId
    if (season) {
      const s = await prisma.season.findFirst({ where: { slug: season } })
      seasonId = s?.id
    } else {
      const s = await prisma.season.findFirst({ where: { isCurrent: true } })
      seasonId = s?.id
    }

    if (!seasonId) return res.json({ adp: [] })

    const adp = await prisma.aDPEntry.findMany({
      where: { seasonId },
      include: { player: { select: { id: true, name: true, headshotUrl: true, primaryTour: true, owgrRank: true } } },
      orderBy: { adp: 'asc' },
      take: parseInt(limit),
    })

    res.json({ adp })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/draft/value ─────────────────────────────────────────
// Draft value analysis by round
router.get('/draft/value', authenticate, async (req, res, next) => {
  try {
    const { leagueId, season } = req.query

    let where = {}

    if (leagueId) {
      const ls = await prisma.leagueSeason.findFirst({
        where: { leagueId },
        orderBy: { createdAt: 'desc' },
      })
      if (ls) where.leagueSeasonId = ls.id
    }

    const trackers = await prisma.draftValueTracker.findMany({
      where,
      include: {
        player: { select: { id: true, name: true, headshotUrl: true } },
        draftPick: { select: { pickedAt: true, isAutoPick: true } },
      },
      orderBy: { pickNumber: 'asc' },
    })

    // Group by round for summary stats
    const byRound = {}
    for (const t of trackers) {
      if (!byRound[t.round]) byRound[t.round] = { round: t.round, picks: [], avgPoints: 0, avgVOR: 0 }
      byRound[t.round].picks.push(t)
    }
    for (const r of Object.values(byRound)) {
      const pts = r.picks.map(p => p.totalFantasyPoints || 0)
      r.avgPoints = pts.length > 0 ? Math.round(pts.reduce((s, p) => s + p, 0) / pts.length * 100) / 100 : 0
      const vors = r.picks.map(p => p.valueOverReplacement || 0)
      r.avgVOR = vors.length > 0 ? Math.round(vors.reduce((s, v) => s + v, 0) / vors.length * 100) / 100 : 0
    }

    res.json({ picks: trackers, byRound: Object.values(byRound) })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/ownership ───────────────────────────────────────────
// Ownership rates
router.get('/ownership', authenticate, async (req, res, next) => {
  try {
    const { season, week, limit = 50 } = req.query

    let seasonId
    if (season) {
      const s = await prisma.season.findFirst({ where: { slug: season } })
      seasonId = s?.id
    } else {
      const s = await prisma.season.findFirst({ where: { isCurrent: true } })
      seasonId = s?.id
    }

    if (!seasonId) return res.json({ ownership: [] })

    let fantasyWeekId = null
    if (week) {
      const fw = await prisma.fantasyWeek.findFirst({
        where: { seasonId, weekNumber: parseInt(week) },
      })
      fantasyWeekId = fw?.id
    }

    const ownership = await prisma.ownershipRate.findMany({
      where: {
        seasonId,
        ...(fantasyWeekId ? { fantasyWeekId } : { fantasyWeekId: null }),
      },
      include: { player: { select: { id: true, name: true, headshotUrl: true, primaryTour: true } } },
      orderBy: { ownershipPct: 'desc' },
      take: parseInt(limit),
    })

    res.json({ ownership })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/analytics/league/:id/history ──────────────────────────────────
// All seasons, champions, standings for a league
router.get('/league/:id/history', authenticate, async (req, res, next) => {
  try {
    const leagueSeasons = await prisma.leagueSeason.findMany({
      where: { leagueId: req.params.id },
      include: {
        season: { select: { name: true, year: true, slug: true } },
        teamSeasons: {
          include: {
            team: {
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
          },
          orderBy: { totalPoints: 'desc' },
        },
      },
      orderBy: { season: { year: 'desc' } },
    })

    const history = leagueSeasons.map(ls => ({
      seasonId: ls.seasonId,
      seasonName: ls.season.name,
      year: ls.season.year,
      status: ls.status,
      champion: ls.teamSeasons.find(ts => ts.isChampion),
      finalStandings: ls.finalStandings,
      teams: ls.teamSeasons.map(ts => ({
        teamId: ts.teamId,
        teamName: ts.team.name,
        userName: ts.team.user?.name,
        totalPoints: ts.totalPoints,
        wins: ts.wins,
        losses: ts.losses,
        finalRank: ts.finalRank,
        isChampion: ts.isChampion,
        bestWeekPoints: ts.bestWeekPoints,
        worstWeekPoints: ts.worstWeekPoints,
        stats: ts.stats,
      })),
    }))

    res.json({ history })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/analytics/backtest ───────────────────────────────────────────
// Strategy simulation engine (delegated to backtestEngine)
router.post('/backtest', authenticate, async (req, res, next) => {
  try {
    const { strategy, seasonIds } = req.body

    if (!strategy || !strategy.picks || !Array.isArray(strategy.picks)) {
      return res.status(400).json({ error: { message: 'Strategy must include a "picks" array' } })
    }

    const backtestEngine = require('../services/backtestEngine')
    const results = await backtestEngine.runBacktest(strategy, seasonIds, prisma)

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/analytics/refresh ────────────────────────────────────────────
// Admin: manually trigger analytics refresh
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const { secret } = req.body
    if (secret !== process.env.SYNC_ADMIN_SECRET) {
      return res.status(403).json({ error: { message: 'Unauthorized' } })
    }

    const analytics = require('../services/analyticsAggregator')
    const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
    if (!currentSeason) return res.status(404).json({ error: { message: 'No current season' } })

    const results = await analytics.refreshAll(currentSeason.id, prisma)
    const viewResults = await refreshAllViews(prisma)

    res.json({ analytics: results, views: viewResults })
  } catch (error) {
    next(error)
  }
})

module.exports = router
