const express = require('express')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// ─── GET /api/managers/:id/profile ──────────────────────────────────────────
// Lifetime ManagerProfile (all sports + per-sport) + bio + Clutch Rating
router.get('/:id/profile', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.id

    const [profiles, user, achievementCount, clutchRating] = await Promise.all([
      prisma.managerProfile.findMany({
        where: { userId },
        include: {
          sport: { select: { id: true, slug: true, name: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true, username: true, bio: true, tagline: true, socialLinks: true, createdAt: true },
      }),
      prisma.achievementUnlock.count({ where: { userId } }),
      prisma.clutchManagerRating.findUnique({ where: { userId } }).catch(() => null),
    ])

    if (!user) return res.status(404).json({ error: { message: 'User not found' } })

    // Separate aggregate (sportId=null) from per-sport
    const aggregate = profiles.find(p => p.sportId === null) || null
    const bySport = profiles.filter(p => p.sportId !== null)

    res.json({
      user,
      aggregate,
      bySport,
      achievementCount,
      clutchRating: clutchRating || null,
    })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/managers/:id/clutch-rating ───────────────────────────────────
// Returns Clutch Rating V2 — 7-component confidence-weighted rating
router.get('/:id/clutch-rating', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.id
    const clutchRatingService = require('../services/clutchRatingService')

    // Try to get cached V2 rating first
    let formatted = await clutchRatingService.getRating(userId, prisma)

    if (!formatted) {
      // Fall back to V1 format for backward compatibility
      const rating = await prisma.clutchManagerRating.findUnique({
        where: { userId },
      })

      if (!rating) {
        return res.json({ clutchRating: null, message: 'No Clutch Rating computed yet' })
      }

      // Return V1 format
      return res.json({
        clutchRating: {
          overall: rating.overallRating,
          tier: rating.tier,
          trend: rating.trend,
          totalGradedCalls: rating.totalGradedCalls,
          updatedAt: rating.updatedAt,
          // V1 legacy fields
          accuracy: rating.accuracyComponent,
          consistency: rating.consistencyComponent,
          volume: rating.volumeComponent,
          breadth: rating.breadthComponent,
        },
      })
    }

    res.json({ clutchRating: formatted })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/managers/:id/clutch-rating/compute ───────────────────────────
// On-demand rating computation (e.g., after vault reveal)
router.post('/:id/clutch-rating/compute', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id
    const clutchRatingService = require('../services/clutchRatingService')
    const result = await clutchRatingService.calculateRatingForUser(userId, prisma)
    res.json({ clutchRating: result })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/managers/:id/season/:seasonSlug ───────────────────────────────
// ManagerSeasonSummary for a specific season
router.get('/:id/season/:seasonSlug', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id
    const { seasonSlug } = req.params

    const season = await prisma.season.findFirst({
      where: { slug: seasonSlug },
      select: { id: true, name: true, year: true, slug: true, sportId: true },
    })
    if (!season) return res.status(404).json({ error: { message: 'Season not found' } })

    const summary = await prisma.managerSeasonSummary.findUnique({
      where: {
        userId_sportId_seasonId: {
          userId,
          sportId: season.sportId,
          seasonId: season.id,
        },
      },
    })

    if (!summary) return res.status(404).json({ error: { message: 'No season data for this user' } })

    // Get per-league breakdown
    const teamSeasons = await prisma.teamSeason.findMany({
      where: {
        team: { userId },
        leagueSeason: { seasonId: season.id },
      },
      include: {
        team: { select: { id: true, name: true } },
        leagueSeason: {
          include: {
            league: { select: { id: true, name: true, format: true, draftType: true } },
          },
        },
      },
    })

    res.json({
      season,
      summary,
      leagues: teamSeasons.map(ts => ({
        leagueId: ts.leagueSeason.league.id,
        leagueName: ts.leagueSeason.league.name,
        format: ts.leagueSeason.league.format,
        draftType: ts.leagueSeason.league.draftType,
        teamName: ts.team.name,
        totalPoints: ts.totalPoints,
        wins: ts.wins,
        losses: ts.losses,
        ties: ts.ties,
        finalRank: ts.finalRank,
        isChampion: ts.isChampion,
        bestWeekPoints: ts.bestWeekPoints,
        worstWeekPoints: ts.worstWeekPoints,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/managers/:id/h2h/:opponentId ──────────────────────────────────
// Head-to-head record between two managers
router.get('/:id/h2h/:opponentId', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id
    const opponentId = req.params.opponentId

    // Records are stored with lower cuid first
    const [u1, u2] = userId < opponentId ? [userId, opponentId] : [opponentId, userId]
    const isForward = userId === u1

    const records = await prisma.headToHeadRecord.findMany({
      where: { userId: u1, opponentUserId: u2 },
      include: {
        sport: { select: { id: true, slug: true, name: true } },
      },
    })

    // Flip perspective if needed (records stored from u1's perspective)
    const formatted = records.map(r => {
      if (isForward) {
        return {
          sportId: r.sportId,
          sportName: r.sport?.name || 'All Sports',
          leagueFormat: r.leagueFormat,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          pointsFor: r.pointsFor,
          pointsAgainst: r.pointsAgainst,
          matchupsPlayed: r.matchupsPlayed,
          lastMatchupAt: r.lastMatchupAt,
          stats: r.stats,
        }
      }
      // Flip W/L and points
      return {
        sportId: r.sportId,
        sportName: r.sport?.name || 'All Sports',
        leagueFormat: r.leagueFormat,
        wins: r.losses,
        losses: r.wins,
        ties: r.ties,
        pointsFor: r.pointsAgainst,
        pointsAgainst: r.pointsFor,
        matchupsPlayed: r.matchupsPlayed,
        lastMatchupAt: r.lastMatchupAt,
        stats: {
          ...(r.stats || {}),
          avgMargin: r.stats?.avgMargin != null ? -r.stats.avgMargin : null,
        },
      }
    })

    // Separate aggregate (format=null) from per-format
    const allFormats = formatted.filter(r => r.leagueFormat === null)
    const perFormat = formatted.filter(r => r.leagueFormat !== null)

    // Get opponent info
    const opponent = await prisma.user.findUnique({
      where: { id: opponentId },
      select: { id: true, name: true, avatar: true },
    })

    res.json({
      opponent,
      aggregate: allFormats,
      byFormat: perFormat,
    })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/managers/:id/achievements ─────────────────────────────────────
// All achievements: unlocked + locked
router.get('/:id/achievements', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.id

    // Get all achievements
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { tier: 'asc' }],
    })

    // Get user's unlocks
    const unlocks = await prisma.achievementUnlock.findMany({
      where: { userId },
    })
    const unlockMap = new Map(unlocks.map(u => [u.achievementId, u]))

    // Load profile for progress computation
    const profile = await prisma.managerProfile.findFirst({ where: { userId, sportId: null } })
    const { getProgress } = require('../services/achievementEngine')

    const achievements = []
    for (const a of allAchievements) {
      if (a.isHidden && !unlockMap.has(a.id)) continue
      const unlock = unlockMap.get(a.id)
      let progress = null
      if (!unlock && a.criteria?.threshold) {
        progress = await getProgress(userId, a.criteria, profile).catch(() => null)
      }
      achievements.push({
        id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        tier: a.tier,
        icon: a.icon,
        category: a.category,
        isHidden: a.isHidden,
        unlocked: !!unlock,
        unlockedAt: unlock?.unlockedAt || null,
        context: unlock?.context || null,
        progress,
      })
    }

    const stats = {
      total: allAchievements.filter(a => !a.isHidden).length,
      unlocked: unlocks.length,
      byCategory: {},
      byTier: {},
    }

    for (const a of achievements) {
      if (!stats.byCategory[a.category]) stats.byCategory[a.category] = { total: 0, unlocked: 0 }
      stats.byCategory[a.category].total++
      if (a.unlocked) stats.byCategory[a.category].unlocked++

      if (!stats.byTier[a.tier]) stats.byTier[a.tier] = { total: 0, unlocked: 0 }
      stats.byTier[a.tier].total++
      if (a.unlocked) stats.byTier[a.tier].unlocked++
    }

    res.json({ achievements, stats })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/managers/leaderboard ──────────────────────────────────────────
// Manager power rankings
router.get('/leaderboard/rankings', optionalAuth, async (req, res, next) => {
  try {
    const { sport, limit = 25, sortBy = 'championships' } = req.query

    let sportId = null
    if (sport) {
      const s = await prisma.sport.findFirst({ where: { slug: sport } })
      sportId = s?.id || null
    }

    // Dynamic sort
    const sortMap = {
      championships: [{ championships: 'desc' }, { winPct: 'desc' }],
      winPct: [{ winPct: 'desc' }, { wins: 'desc' }],
      totalPoints: [{ totalPoints: 'desc' }],
      draftEfficiency: [{ draftEfficiency: 'desc' }],
      avgFinish: [{ avgFinish: 'asc' }],
    }
    const orderBy = sortMap[sortBy] || sortMap.championships

    const profiles = await prisma.managerProfile.findMany({
      where: {
        ...(sportId ? { sportId } : { sportId: null }),
        totalLeagues: { gt: 0 },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
      },
      orderBy,
      take: parseInt(limit),
    })

    const userIds = profiles.map(p => p.userId)

    // Batch fetch achievement counts + clutch ratings
    const [achievementCounts, ratings] = await Promise.all([
      prisma.achievementUnlock.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: true,
      }),
      prisma.clutchManagerRating.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, overallRating: true, tier: true, trend: true },
      }),
    ])
    const achMap = new Map(achievementCounts.map(a => [a.userId, a._count]))
    const ratingMap = new Map(ratings.map(r => [r.userId, r]))

    let leaderboard = profiles.map((p, i) => {
      const rating = ratingMap.get(p.userId)
      return {
        rank: i + 1,
        user: p.user,
        championships: p.championships,
        wins: p.wins,
        losses: p.losses,
        ties: p.ties,
        winPct: p.winPct,
        avgFinish: p.avgFinish,
        bestFinish: p.bestFinish,
        totalPoints: p.totalPoints,
        totalLeagues: p.totalLeagues,
        totalSeasons: p.totalSeasons,
        draftEfficiency: p.draftEfficiency,
        achievementCount: achMap.get(p.userId) || 0,
        clutchRating: rating?.overallRating || null,
        ratingTier: rating?.tier || null,
        ratingTrend: rating?.trend || null,
      }
    })

    // If sorting by clutchRating, re-sort since it wasn't in the DB query
    if (sortBy === 'clutchRating') {
      leaderboard.sort((a, b) => (b.clutchRating || 0) - (a.clutchRating || 0))
      leaderboard.forEach((entry, i) => { entry.rank = i + 1 })
    }

    res.json({ leaderboard })
  } catch (error) {
    next(error)
  }
})

// GET /api/managers/:id/rating-history — Rating snapshots over time
router.get('/:id/rating-history', async (req, res, next) => {
  try {
    const snapshots = await prisma.ratingSnapshot.findMany({
      where: { userId: req.params.id },
      orderBy: { snapshotDate: 'asc' },
      select: { overall: true, snapshotDate: true },
    })
    res.json({ snapshots })
  } catch (err) {
    next(err)
  }
})

module.exports = router
