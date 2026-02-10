const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { authenticate } = require('../middleware/auth')
const { gradeLeagueDraft, gradeMockDraft } = require('../services/draftGrader')

// All routes require auth
router.use(authenticate)

// ─── League Draft History ───────────────────────────────────────────────────

/**
 * GET /leagues — All user's completed league drafts with grades
 */
router.get('/leagues', async (req, res) => {
  try {
    const userId = req.user.id

    // Get all leagues the user is in
    const memberships = await prisma.leagueMember.findMany({
      where: { userId },
      select: { leagueId: true },
    })
    const leagueIds = memberships.map(m => m.leagueId)

    if (leagueIds.length === 0) return res.json([])

    // Get all completed drafts in those leagues
    const drafts = await prisma.draft.findMany({
      where: {
        leagueId: { in: leagueIds },
        status: 'COMPLETED',
      },
      include: {
        league: { select: { id: true, name: true, sport: true, draftType: true, maxTeams: true } },
        draftGrades: {
          where: {
            team: { userId },
          },
        },
        _count: { select: { picks: true } },
      },
      orderBy: { endTime: 'desc' },
    })

    const results = drafts.map(draft => {
      const userGrade = draft.draftGrades[0] || null
      return {
        id: draft.id,
        leagueId: draft.leagueId,
        leagueName: draft.league.name,
        draftType: draft.league.draftType,
        sport: draft.league.sport,
        teamCount: draft.league.maxTeams,
        totalPicks: draft._count.picks,
        totalRounds: draft.totalRounds,
        endTime: draft.endTime,
        startTime: draft.startTime,
        hasGrades: !!userGrade,
        overallGrade: userGrade?.overallGrade || null,
        overallScore: userGrade?.overallScore || null,
        bestPick: userGrade?.bestPick || null,
        worstPick: userGrade?.worstPick || null,
      }
    })

    res.json(results)
  } catch (error) {
    console.error('Error fetching draft history:', error)
    res.status(500).json({ error: { message: 'Failed to fetch draft history' } })
  }
})

/**
 * GET /drafts/:draftId — Full draft recap with all picks and teams
 */
router.get('/drafts/:draftId', async (req, res) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.draftId },
      include: {
        league: {
          select: { id: true, name: true, sport: true, draftType: true, maxTeams: true, format: true },
        },
        picks: {
          include: {
            player: {
              select: { id: true, name: true, owgrRank: true, datagolfRank: true, headshotUrl: true, countryFlag: true, primaryTour: true, sgTotal: true },
            },
            team: { select: { id: true, name: true, userId: true } },
          },
          orderBy: { pickNumber: 'asc' },
        },
        draftOrder: {
          include: { },
          orderBy: { position: 'asc' },
        },
        draftGrades: {
          include: { team: { select: { id: true, name: true, userId: true } } },
        },
      },
    })

    if (!draft) return res.status(404).json({ error: { message: 'Draft not found' } })

    // Check user has access (is in this league)
    const membership = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId: draft.leagueId } },
    })
    if (!membership) return res.status(403).json({ error: { message: 'Not a member of this league' } })

    res.json({
      id: draft.id,
      status: draft.status,
      leagueId: draft.leagueId,
      leagueName: draft.league.name,
      leagueFormat: draft.league.format,
      draftType: draft.league.draftType,
      sport: draft.league.sport,
      teamCount: draft.league.maxTeams,
      totalRounds: draft.totalRounds,
      startTime: draft.startTime,
      endTime: draft.endTime,
      picks: draft.picks.map(p => ({
        pickNumber: p.pickNumber,
        round: p.round,
        teamId: p.teamId,
        teamName: p.team.name,
        teamUserId: p.team.userId,
        playerId: p.playerId,
        playerName: p.player.name,
        playerRank: p.player.datagolfRank || p.player.owgrRank,
        headshotUrl: p.player.headshotUrl,
        countryFlag: p.player.countryFlag,
        primaryTour: p.player.primaryTour,
        sgTotal: p.player.sgTotal,
        amount: p.amount,
        isAutoPick: p.isAutoPick,
      })),
      draftOrder: draft.draftOrder.map(d => ({ position: d.position, teamId: d.teamId })),
      grades: draft.draftGrades.map(g => ({
        teamId: g.teamId,
        teamName: g.team.name,
        teamUserId: g.team.userId,
        overallGrade: g.overallGrade,
        overallScore: g.overallScore,
        pickGrades: g.pickGrades,
        bestPick: g.bestPick,
        worstPick: g.worstPick,
        sleepers: g.sleepers,
        reaches: g.reaches,
        totalValue: g.totalValue,
      })),
      userTeamId: (await prisma.team.findFirst({
        where: { userId: req.user.id, leagueId: draft.leagueId },
        select: { id: true },
      }))?.id,
    })
  } catch (error) {
    console.error('Error fetching draft recap:', error)
    res.status(500).json({ error: { message: 'Failed to fetch draft recap' } })
  }
})

/**
 * GET /drafts/:draftId/grades — Compute grades on-the-fly if missing, return cached
 */
router.get('/drafts/:draftId/grades', async (req, res) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.draftId },
      select: { id: true, status: true, leagueId: true },
    })
    if (!draft) return res.status(404).json({ error: { message: 'Draft not found' } })
    if (draft.status !== 'COMPLETED') {
      return res.status(400).json({ error: { message: 'Draft is not completed' } })
    }

    // Check existing grades
    let grades = await prisma.draftGrade.findMany({
      where: { draftId: draft.id },
      include: { team: { select: { id: true, name: true, userId: true } } },
    })

    // If no grades exist, compute them now
    if (grades.length === 0) {
      await gradeLeagueDraft(draft.id, prisma)
      grades = await prisma.draftGrade.findMany({
        where: { draftId: draft.id },
        include: { team: { select: { id: true, name: true, userId: true } } },
      })
    }

    res.json(grades.map(g => ({
      teamId: g.teamId,
      teamName: g.team.name,
      teamUserId: g.team.userId,
      overallGrade: g.overallGrade,
      overallScore: g.overallScore,
      pickGrades: g.pickGrades,
      positionGrades: g.positionGrades,
      bestPick: g.bestPick,
      worstPick: g.worstPick,
      sleepers: g.sleepers,
      reaches: g.reaches,
      totalValue: g.totalValue,
      algorithm: g.algorithm,
      gradedAt: g.gradedAt,
    })))
  } catch (error) {
    console.error('Error fetching draft grades:', error)
    res.status(500).json({ error: { message: 'Failed to fetch draft grades' } })
  }
})

/**
 * POST /drafts/:draftId/regrade — Re-compute grades (commissioner only)
 */
router.post('/drafts/:draftId/regrade', async (req, res) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.draftId },
      select: { id: true, leagueId: true, status: true },
    })
    if (!draft) return res.status(404).json({ error: { message: 'Draft not found' } })

    // Check commissioner
    const league = await prisma.league.findUnique({
      where: { id: draft.leagueId },
      select: { ownerId: true },
    })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only commissioner can regrade' } })
    }

    const grades = await gradeLeagueDraft(draft.id, prisma)
    res.json({ regraded: grades.length, grades: grades.map(g => ({ teamId: g.teamId, overallGrade: g.overallGrade, overallScore: g.overallScore })) })
  } catch (error) {
    console.error('Error regrading draft:', error)
    res.status(500).json({ error: { message: 'Failed to regrade draft' } })
  }
})

// ─── Mock Draft History ─────────────────────────────────────────────────────

/**
 * GET /mock-drafts — User's mock draft history (paginated)
 */
router.get('/mock-drafts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      prisma.mockDraftResult.findMany({
        where: { userId: req.user.id },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mockDraftResult.count({ where: { userId: req.user.id } }),
    ])

    res.json({
      results: results.map(r => ({
        id: r.id,
        draftType: r.draftType,
        teamCount: r.teamCount,
        rosterSize: r.rosterSize,
        userPosition: r.userPosition,
        dataSource: r.dataSource,
        overallGrade: r.overallGrade,
        overallScore: r.overallScore,
        bestPick: r.bestPick,
        worstPick: r.worstPick,
        completedAt: r.completedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching mock draft history:', error)
    res.status(500).json({ error: { message: 'Failed to fetch mock draft history' } })
  }
})

/**
 * GET /mock-drafts/:id — Single mock draft detail with grades
 */
router.get('/mock-drafts/:id', async (req, res) => {
  try {
    const result = await prisma.mockDraftResult.findUnique({
      where: { id: req.params.id },
      include: { sport: { select: { slug: true, name: true } } },
    })
    if (!result) return res.status(404).json({ error: { message: 'Mock draft not found' } })
    if (result.userId !== req.user.id) return res.status(403).json({ error: { message: 'Not your mock draft' } })

    res.json(result)
  } catch (error) {
    console.error('Error fetching mock draft:', error)
    res.status(500).json({ error: { message: 'Failed to fetch mock draft' } })
  }
})

/**
 * POST /mock-drafts — Save + grade a completed mock draft
 */
router.post('/mock-drafts', async (req, res) => {
  try {
    const { draftType, teamCount, rosterSize, userPosition, dataSource, picks, userPicks, teamNames } = req.body

    if (!picks || !userPicks || !teamCount || !rosterSize) {
      return res.status(400).json({ error: { message: 'Missing required fields' } })
    }

    // Grade the user's picks
    const gradeResult = gradeMockDraft(
      userPicks.map(p => ({
        pickNumber: p.pickNumber,
        round: p.round,
        playerId: p.playerId,
        playerName: p.playerName,
        playerRank: p.playerRank,
      })),
      { teamCount, rosterSize }
    )

    // Get sport ID from request (defaults to golf for backward compat)
    const { sport: sportSlug = 'golf' } = req.body
    const sportRecord = await prisma.sport.findFirst({ where: { slug: sportSlug } })

    const result = await prisma.mockDraftResult.create({
      data: {
        userId: req.user.id,
        sportId: sportRecord?.id || null,
        draftType: draftType || 'snake',
        teamCount,
        rosterSize,
        userPosition: userPosition || null,
        dataSource: dataSource || 'api',
        picks,
        userPicks,
        teamNames: teamNames || [],
        overallGrade: gradeResult.overallGrade,
        overallScore: gradeResult.overallScore,
        positionGrades: gradeResult.positionGrades,
        pickGrades: gradeResult.pickGrades,
        bestPick: gradeResult.bestPick,
        worstPick: gradeResult.worstPick,
      },
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('Error saving mock draft:', error)
    res.status(500).json({ error: { message: 'Failed to save mock draft' } })
  }
})

/**
 * DELETE /mock-drafts/:id — Delete a mock draft result
 */
router.delete('/mock-drafts/:id', async (req, res) => {
  try {
    const result = await prisma.mockDraftResult.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    })
    if (!result) return res.status(404).json({ error: { message: 'Mock draft not found' } })
    if (result.userId !== req.user.id) return res.status(403).json({ error: { message: 'Not your mock draft' } })

    await prisma.mockDraftResult.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting mock draft:', error)
    res.status(500).json({ error: { message: 'Failed to delete mock draft' } })
  }
})

module.exports = router
