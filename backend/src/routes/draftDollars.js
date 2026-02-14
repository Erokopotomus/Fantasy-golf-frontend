const express = require('express')
const { authenticate } = require('../middleware/auth')
const { getOrCreateAccounts, transferDollars } = require('../services/draftDollarService')

const router = express.Router()
const prisma = require('../lib/prisma.js')

/**
 * GET /api/leagues/:id/draft-dollars
 * Get all team balances + settings for this league.
 */
router.get('/:id/draft-dollars', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      select: { id: true, settings: true },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })

    const draftDollarSettings = league.settings?.draftDollarSettings || {}
    if (!draftDollarSettings.enabled) {
      return res.json({ enabled: false, accounts: [], settings: draftDollarSettings })
    }

    // Find active league season
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId: league.id, status: { in: ['ACTIVE', 'PLAYOFFS'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!leagueSeason) {
      return res.json({ enabled: true, accounts: [], settings: draftDollarSettings, message: 'No active season' })
    }

    // Get or create accounts
    const accounts = await getOrCreateAccounts(
      league.id,
      leagueSeason.id,
      draftDollarSettings.defaultBudget || 200,
      prisma
    )

    // Enrich with team info
    const teams = await prisma.team.findMany({
      where: { leagueId: league.id },
      select: { id: true, name: true, userId: true, user: { select: { name: true } } },
    })
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

    const enriched = accounts.map(a => ({
      ...a,
      teamName: teamMap[a.teamId]?.name || 'Unknown',
      ownerName: teamMap[a.teamId]?.user?.name || 'Unknown',
      userId: teamMap[a.teamId]?.userId,
    }))

    res.json({
      enabled: true,
      accounts: enriched,
      settings: draftDollarSettings,
      leagueSeasonId: leagueSeason.id,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/leagues/:id/draft-dollars/ledger
 * Transaction history (paginated, filterable by team).
 */
router.get('/:id/draft-dollars/ledger', authenticate, async (req, res, next) => {
  try {
    const { teamId, limit = '50', offset = '0' } = req.query

    const where = { leagueId: req.params.id }
    if (teamId) {
      where.OR = [
        { fromTeamId: teamId },
        { toTeamId: teamId },
      ]
    }

    const [transactions, total] = await Promise.all([
      prisma.draftDollarTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          fromTeam: { select: { id: true, name: true } },
          toTeam: { select: { id: true, name: true } },
        },
      }),
      prisma.draftDollarTransaction.count({ where }),
    ])

    res.json({ transactions, total })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/leagues/:id/draft-dollars/transaction
 * Record a standalone transaction (side bet, wager, etc.) — Commissioner only.
 */
router.post('/:id/draft-dollars/transaction', authenticate, async (req, res, next) => {
  try {
    const { fromTeamId, toTeamId, amount, yearType, category, description } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: { message: 'Amount must be positive' } })
    }
    if (!['current', 'next'].includes(yearType)) {
      return res.status(400).json({ error: { message: 'yearType must be "current" or "next"' } })
    }

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      select: { id: true, ownerId: true, settings: true },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can record transactions' } })
    }

    const draftDollarSettings = league.settings?.draftDollarSettings || {}
    if (!draftDollarSettings.enabled) {
      return res.status(400).json({ error: { message: 'Draft dollar trading is not enabled' } })
    }

    if (yearType === 'next' && !draftDollarSettings.allowNextYearTrades) {
      return res.status(400).json({ error: { message: 'Next-year dollar trades are not allowed in this league' } })
    }

    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId: league.id, status: { in: ['ACTIVE', 'PLAYOFFS'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!leagueSeason) {
      return res.status(400).json({ error: { message: 'No active season' } })
    }

    const transaction = await transferDollars({
      fromTeamId: fromTeamId || null,
      toTeamId: toTeamId || null,
      amount: parseInt(amount),
      yearType,
      leagueId: league.id,
      leagueSeasonId: leagueSeason.id,
      category: category || 'side_bet',
      description,
      initiatedById: req.user.id,
      settings: draftDollarSettings,
    }, prisma)

    res.status(201).json({ transaction })
  } catch (error) {
    if (error.message?.includes('balance') || error.message?.includes('minimum') || error.message?.includes('maximum')) {
      return res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

/**
 * POST /api/leagues/:id/draft-dollars/adjust
 * Direct balance adjustment with reason — Commissioner only.
 */
router.post('/:id/draft-dollars/adjust', authenticate, async (req, res, next) => {
  try {
    const { teamId, amount, yearType, description } = req.body

    if (!teamId || amount == null) {
      return res.status(400).json({ error: { message: 'teamId and amount are required' } })
    }
    if (!['current', 'next'].includes(yearType)) {
      return res.status(400).json({ error: { message: 'yearType must be "current" or "next"' } })
    }

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      select: { id: true, ownerId: true, settings: true },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can adjust balances' } })
    }

    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId: league.id, status: { in: ['ACTIVE', 'PLAYOFFS'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!leagueSeason) {
      return res.status(400).json({ error: { message: 'No active season' } })
    }

    const parsedAmount = parseInt(amount)
    const balanceField = yearType === 'current' ? 'currentBalance' : 'nextYearBalance'

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.draftDollarAccount.update({
        where: {
          teamId_leagueSeasonId: { teamId, leagueSeasonId: leagueSeason.id },
        },
        data: {
          [balanceField]: { increment: parsedAmount },
        },
      })

      const transaction = await tx.draftDollarTransaction.create({
        data: {
          leagueId: league.id,
          leagueSeasonId: leagueSeason.id,
          fromTeamId: parsedAmount < 0 ? teamId : null,
          toTeamId: parsedAmount > 0 ? teamId : null,
          amount: Math.abs(parsedAmount),
          yearType,
          category: 'commissioner_adjustment',
          description: description || 'Commissioner adjustment',
          initiatedById: req.user.id,
        },
      })

      return { account: updated, transaction }
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router
