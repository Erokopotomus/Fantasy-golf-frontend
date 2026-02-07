const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/leagues/:id/roster-slots - League's roster construction
router.get('/leagues/:id/roster-slots', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      select: { id: true, scoringSystemId: true },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Check league-level slots first, then fall back to scoring system slots
    let slots = await prisma.rosterSlotDefinition.findMany({
      where: { leagueId: league.id },
      include: {
        eligibility: {
          include: { position: { select: { id: true, abbr: true, name: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    if (slots.length === 0 && league.scoringSystemId) {
      slots = await prisma.rosterSlotDefinition.findMany({
        where: { scoringSystemId: league.scoringSystemId },
        include: {
          eligibility: {
            include: { position: { select: { id: true, abbr: true, name: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })
    }

    res.json({ slots })
  } catch (error) {
    next(error)
  }
})

// GET /api/teams/:id/budget - Team's auction budget
router.get('/teams/:id/budget', authenticate, async (req, res, next) => {
  try {
    const { season } = req.query

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      select: { id: true, leagueId: true },
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    // Find the league season
    let where = { leagueId: team.leagueId }
    if (season) {
      const seasonRecord = await prisma.season.findFirst({ where: { slug: season } })
      if (seasonRecord) where.seasonId = seasonRecord.id
    }

    const leagueSeason = await prisma.leagueSeason.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    })

    if (!leagueSeason) {
      return res.json({ budget: null })
    }

    const budget = await prisma.teamBudget.findUnique({
      where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: leagueSeason.id } },
    })

    res.json({ budget })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/my/spend-by-position - "How much did I spend on RBs?"
router.get('/analytics/my/spend-by-position', authenticate, async (req, res, next) => {
  try {
    const { season } = req.query

    // Find all teams for this user
    const teams = await prisma.team.findMany({
      where: { userId: req.user.id },
      select: { id: true, name: true, leagueId: true },
    })

    if (teams.length === 0) {
      return res.json({ budgets: [] })
    }

    const results = []
    for (const team of teams) {
      let leagueSeasonWhere = { leagueId: team.leagueId }
      if (season) {
        const seasonRecord = await prisma.season.findFirst({ where: { slug: season } })
        if (seasonRecord) leagueSeasonWhere.seasonId = seasonRecord.id
      }

      const leagueSeason = await prisma.leagueSeason.findFirst({
        where: leagueSeasonWhere,
        orderBy: { createdAt: 'desc' },
        include: { season: { select: { name: true, year: true } } },
      })

      if (!leagueSeason) continue

      const budget = await prisma.teamBudget.findUnique({
        where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: leagueSeason.id } },
      })

      if (budget) {
        results.push({
          teamId: team.id,
          teamName: team.name,
          seasonName: leagueSeason.season.name,
          seasonYear: leagueSeason.season.year,
          totalBudget: budget.totalBudget,
          spent: budget.spent,
          remaining: budget.remaining,
          spentByPosition: budget.spentByPosition,
        })
      }
    }

    res.json({ budgets: results })
  } catch (error) {
    next(error)
  }
})

// GET /api/analytics/league/:id/budget-summary - League average spend by position
router.get('/analytics/league/:id/budget-summary', authenticate, async (req, res, next) => {
  try {
    const { season } = req.query

    let leagueSeasonWhere = { leagueId: req.params.id }
    if (season) {
      const seasonRecord = await prisma.season.findFirst({ where: { slug: season } })
      if (seasonRecord) leagueSeasonWhere.seasonId = seasonRecord.id
    }

    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: leagueSeasonWhere,
      orderBy: { createdAt: 'desc' },
    })

    if (!leagueSeason) {
      return res.json({ summary: null })
    }

    const budgets = await prisma.teamBudget.findMany({
      where: { leagueSeasonId: leagueSeason.id },
      include: { team: { select: { id: true, name: true } } },
    })

    if (budgets.length === 0) {
      return res.json({ summary: null })
    }

    // Compute averages
    const avgSpent = budgets.reduce((s, b) => s + b.spent, 0) / budgets.length
    const avgRemaining = budgets.reduce((s, b) => s + b.remaining, 0) / budgets.length

    // Aggregate spentByPosition across all teams
    const positionTotals = {}
    const positionCounts = {}
    for (const b of budgets) {
      const sbp = b.spentByPosition || {}
      for (const [pos, amount] of Object.entries(sbp)) {
        positionTotals[pos] = (positionTotals[pos] || 0) + amount
        positionCounts[pos] = (positionCounts[pos] || 0) + 1
      }
    }

    const avgByPosition = {}
    for (const pos of Object.keys(positionTotals)) {
      avgByPosition[pos] = Math.round((positionTotals[pos] / budgets.length) * 100) / 100
    }

    res.json({
      summary: {
        leagueSeasonId: leagueSeason.id,
        teamCount: budgets.length,
        avgSpent: Math.round(avgSpent * 100) / 100,
        avgRemaining: Math.round(avgRemaining * 100) / 100,
        avgByPosition,
        teams: budgets.map(b => ({
          teamId: b.team.id,
          teamName: b.team.name,
          spent: b.spent,
          remaining: b.remaining,
          spentByPosition: b.spentByPosition,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
