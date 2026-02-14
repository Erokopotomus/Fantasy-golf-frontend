const express = require('express')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// POST /api/leagues/:leagueId/waivers/claim - Submit a waiver claim
router.post('/:leagueId/waivers/claim', authenticate, async (req, res, next) => {
  try {
    const { playerId, bidAmount = 0, dropPlayerId, priority = 0, reasoning } = req.body
    const { leagueId } = req.params

    if (!playerId) {
      return res.status(400).json({ error: { message: 'playerId is required' } })
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: { select: { userId: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: { message: 'Not a member of this league' } })
    }

    // Find user's team
    const team = await prisma.team.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId } },
    })
    if (!team) {
      return res.status(400).json({ error: { message: 'No team found in this league' } })
    }

    // Validate bid amount for FAAB
    const waiverType = league.settings?.waiverType
    if (waiverType === 'faab' && bidAmount < 0) {
      return res.status(400).json({ error: { message: 'Bid amount cannot be negative' } })
    }

    // Check if player is already rostered
    const alreadyRostered = await prisma.rosterEntry.findFirst({
      where: { playerId, isActive: true, team: { leagueId } },
    })
    if (alreadyRostered) {
      return res.status(400).json({ error: { message: 'Player is already rostered' } })
    }

    // Check for duplicate pending claim on same player by same team
    const existingClaim = await prisma.waiverClaim.findFirst({
      where: { teamId: team.id, playerId, status: 'PENDING' },
    })
    if (existingClaim) {
      return res.status(400).json({ error: { message: 'You already have a pending claim on this player' } })
    }

    const claim = await prisma.waiverClaim.create({
      data: {
        leagueId,
        teamId: team.id,
        userId: req.user.id,
        playerId,
        dropPlayerId: dropPlayerId || null,
        bidAmount: waiverType === 'faab' ? bidAmount : 0,
        priority,
        status: 'PENDING',
        reasoning: reasoning ? String(reasoning).substring(0, 280) : null,
      },
      include: {
        player: { select: { id: true, name: true, owgrRank: true, headshotUrl: true } },
      },
    })

    res.status(201).json({ claim })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:leagueId/waivers/claims - User's pending claims + budget
router.get('/:leagueId/waivers/claims', authenticate, async (req, res, next) => {
  try {
    const { leagueId } = req.params

    const team = await prisma.team.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId } },
    })
    if (!team) {
      return res.status(400).json({ error: { message: 'No team found in this league' } })
    }

    // Get pending claims
    const pendingClaims = await prisma.waiverClaim.findMany({
      where: { teamId: team.id, status: 'PENDING' },
      include: {
        player: { select: { id: true, name: true, owgrRank: true, headshotUrl: true, primaryTour: true, sgTotal: true } },
      },
      orderBy: { priority: 'asc' },
    })

    // Get recent results (last 20)
    const recentResults = await prisma.waiverClaim.findMany({
      where: { teamId: team.id, status: { in: ['WON', 'LOST', 'INVALID'] } },
      include: {
        player: { select: { id: true, name: true, owgrRank: true, headshotUrl: true } },
      },
      orderBy: { processedAt: 'desc' },
      take: 20,
    })

    // Get budget
    let budget = null
    const league = await prisma.league.findUnique({ where: { id: leagueId } })
    if (league?.settings?.waiverType === 'faab') {
      const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
      if (currentSeason) {
        const leagueSeason = await prisma.leagueSeason.findFirst({
          where: { leagueId, seasonId: currentSeason.id },
        })
        if (leagueSeason) {
          budget = await prisma.teamBudget.findUnique({
            where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: leagueSeason.id } },
          })
        }
      }
    }

    res.json({
      pendingClaims,
      recentResults,
      budget: budget ? { total: budget.totalBudget, spent: budget.spent, remaining: budget.remaining } : null,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/leagues/:leagueId/waivers/claims/:claimId - Update a pending claim
router.patch('/:leagueId/waivers/claims/:claimId', authenticate, async (req, res, next) => {
  try {
    const { bidAmount, priority, dropPlayerId } = req.body

    const claim = await prisma.waiverClaim.findUnique({
      where: { id: req.params.claimId },
    })

    if (!claim) {
      return res.status(404).json({ error: { message: 'Claim not found' } })
    }

    if (claim.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: { message: 'Can only update pending claims' } })
    }

    const updateData = {}
    if (bidAmount !== undefined) updateData.bidAmount = bidAmount
    if (priority !== undefined) updateData.priority = priority
    if (dropPlayerId !== undefined) updateData.dropPlayerId = dropPlayerId || null

    const updated = await prisma.waiverClaim.update({
      where: { id: claim.id },
      data: updateData,
      include: {
        player: { select: { id: true, name: true, owgrRank: true, headshotUrl: true } },
      },
    })

    res.json({ claim: updated })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/leagues/:leagueId/waivers/claims/:claimId - Cancel a pending claim
router.delete('/:leagueId/waivers/claims/:claimId', authenticate, async (req, res, next) => {
  try {
    const claim = await prisma.waiverClaim.findUnique({
      where: { id: req.params.claimId },
    })

    if (!claim) {
      return res.status(404).json({ error: { message: 'Claim not found' } })
    }

    if (claim.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: { message: 'Can only cancel pending claims' } })
    }

    await prisma.waiverClaim.update({
      where: { id: claim.id },
      data: { status: 'CANCELLED', processedAt: new Date() },
    })

    res.json({ message: 'Claim cancelled' })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:leagueId/waivers/history - All processed claims for league
router.get('/:leagueId/waivers/history', authenticate, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query

    const league = await prisma.league.findUnique({
      where: { id: req.params.leagueId },
      include: { members: { select: { userId: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    const claims = await prisma.waiverClaim.findMany({
      where: {
        leagueId: req.params.leagueId,
        status: { in: ['WON', 'LOST', 'INVALID'] },
      },
      include: {
        player: { select: { id: true, name: true, owgrRank: true, headshotUrl: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { processedAt: 'desc' },
      take: parseInt(limit),
    })

    res.json({ claims })
  } catch (error) {
    next(error)
  }
})

module.exports = router
