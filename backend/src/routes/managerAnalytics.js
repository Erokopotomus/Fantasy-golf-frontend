const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

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
// Returns Clutch Rating + component breakdown
router.get('/:id/clutch-rating', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.id

    const rating = await prisma.clutchManagerRating.findUnique({
      where: { userId },
    })

    if (!rating) {
      return res.json({
        clutchRating: null,
        message: 'No Clutch Rating computed yet',
      })
    }

    res.json({
      clutchRating: {
        overall: rating.overallRating,
        accuracy: rating.accuracyComponent,
        consistency: rating.consistencyComponent,
        volume: rating.volumeComponent,
        breadth: rating.breadthComponent,
        tier: rating.tier,
        trend: rating.trend,
        totalGradedCalls: rating.totalGradedCalls,
        updatedAt: rating.updatedAt,
      },
    })
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

    const achievements = allAchievements
      .filter(a => !a.isHidden || unlockMap.has(a.id)) // hide hidden unless unlocked
      .map(a => {
        const unlock = unlockMap.get(a.id)
        return {
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
        }
      })

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
router.get('/leaderboard/rankings', authenticate, async (req, res, next) => {
  try {
    const { sport, limit = 25 } = req.query

    let sportId = null
    if (sport) {
      const s = await prisma.sport.findFirst({ where: { slug: sport } })
      sportId = s?.id || null
    }

    const profiles = await prisma.managerProfile.findMany({
      where: {
        ...(sportId ? { sportId } : { sportId: null }),
        totalLeagues: { gt: 0 },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [
        { championships: 'desc' },
        { winPct: 'desc' },
        { totalPoints: 'desc' },
      ],
      take: parseInt(limit),
    })

    // Add achievement counts
    const userIds = profiles.map(p => p.userId)
    const achievementCounts = await prisma.achievementUnlock.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: true,
    })
    const achMap = new Map(achievementCounts.map(a => [a.userId, a._count]))

    const leaderboard = profiles.map((p, i) => ({
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
    }))

    res.json({ leaderboard })
  } catch (error) {
    next(error)
  }
})

module.exports = router
