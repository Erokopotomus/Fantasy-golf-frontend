/**
 * AI API Routes (Phases 6C-6F)
 *
 * All AI endpoints: insights, coaching, reports, scout, sim.
 * All endpoints authenticated. Rate limits per spec.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const aiInsightPipeline = require('../services/aiInsightPipeline')
const aiCoachService = require('../services/aiCoachService')
const { buildBoardSnapshot } = require('../services/draftBoardService')
const leagueIntelligence = require('../services/leagueIntelligenceService')
const prisma = require('../lib/prisma.js')

// Simple per-user rate limiter
const rateLimitMap = new Map()
function rateLimit(userId, group, maxPerHour) {
  const key = `${userId}:${group}`
  const now = Date.now()
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, [])
  const log = rateLimitMap.get(key).filter(t => t > now - 3600000)
  rateLimitMap.set(key, log)
  if (log.length >= maxPerHour) return false
  log.push(now)
  return true
}

// ═══════════════════════════════════════════════
//  COACH BRIEFING (Living Dashboard Headline)
// ═══════════════════════════════════════════════

// GET /api/ai/coach-briefing — Personalized coach headline for dashboard / league home
router.get('/coach-briefing', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { leagueId } = req.query

    // Gather user data state
    const [leagueCount, boardCount, predictionCount] = await Promise.all([
      prisma.leagueMember.count({ where: { userId } }),
      prisma.draftBoard.count({ where: { userId } }),
      prisma.prediction.count({ where: { userId } }),
    ])

    // ── League-specific briefing ──
    if (leagueId) {
      const member = await prisma.leagueMember.findUnique({
        where: { userId_leagueId: { userId, leagueId } },
      })
      if (!member) return res.json({ briefing: null })

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          drafts: { orderBy: { createdAt: 'desc' }, take: 1 },
          teams: {
            select: { id: true, userId: true, totalPoints: true, wins: true, losses: true, name: true },
            orderBy: { totalPoints: 'desc' },
          },
        },
      })
      if (!league) return res.json({ briefing: null })

      const draft = league.drafts?.[0]
      const sport = (league.sport || 'golf').toLowerCase()

      // Draft upcoming — enrich with board stats and tournament context
      if (draft?.status === 'SCHEDULED' && draft.scheduledFor) {
        const diff = new Date(draft.scheduledFor) - new Date()
        const days = Math.floor(diff / 86400000)
        const timeframe = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`

        // Check user's board for this sport
        const board = await prisma.draftBoard.findFirst({
          where: { userId, sport },
          include: {
            entries: { select: { tags: true, notes: true } },
            _count: { select: { entries: true } },
          },
        })
        const entryCount = board?._count?.entries || 0
        const taggedEntries = board?.entries?.filter(e => e.tags && Object.keys(e.tags).length > 0) || []
        const notedEntries = board?.entries?.filter(e => e.notes && e.notes.trim().length > 0) || []

        let body = 'Get your rankings locked in before the clock starts.'
        if (entryCount === 0) {
          body = "You haven't started your board yet. Even 30 minutes of prep gives you an edge."
        } else if (taggedEntries.length === 0) {
          body = `You have ${entryCount} players ranked but no targets tagged. Tag your must-haves and avoid list.`
        } else if (taggedEntries.length < 5) {
          body = `${entryCount} players ranked, ${taggedEntries.length} tagged. The mid-rounds win drafts — spend time on the 50-100 range.`
        } else {
          body = `${entryCount} players ranked, ${taggedEntries.length} tagged${notedEntries.length > 0 ? `, ${notedEntries.length} with notes` : ''}. You're well prepped.`
        }

        return res.json({
          briefing: {
            headline: `Draft day is ${timeframe} — are you ready?`,
            body,
            type: 'draft_prep',
          },
        })
      }

      // In-season — enrich with standings position and roster context
      if (draft?.status === 'COMPLETED' && league.teams?.length > 0) {
        const userTeam = league.teams.find(t => t.userId === userId)
        const totalTeams = league.teams.length
        const userRank = userTeam ? league.teams.indexOf(userTeam) + 1 : null

        // Check for live tournament (golf)
        const liveTournament = sport === 'golf'
          ? await prisma.tournament.findFirst({
              where: { status: 'IN_PROGRESS' },
              select: { id: true, name: true, currentRound: true },
            }).catch(() => null)
          : null

        let headline, body = null

        if (liveTournament) {
          // Count user's rostered players in the live tournament
          const rosteredInEvent = userTeam ? await prisma.rosterEntry.count({
            where: {
              teamId: userTeam.id,
              isActive: true,
              player: { performances: { some: { tournamentId: liveTournament.id } } },
            },
          }).catch(() => 0) : 0

          headline = `${liveTournament.name} is live${liveTournament.currentRound ? ` — Round ${liveTournament.currentRound}` : ''}`
          body = rosteredInEvent > 0
            ? `You have ${rosteredInEvent} player${rosteredInEvent > 1 ? 's' : ''} in the field. ${userRank ? `You're ${userRank === 1 ? 'leading' : `${userRank}${userRank === 2 ? 'nd' : userRank === 3 ? 'rd' : 'th'}`} in your league.` : ''}`
            : userRank ? `You're sitting ${userRank === 1 ? '1st' : `${userRank}${userRank === 2 ? 'nd' : userRank === 3 ? 'rd' : 'th'}`} of ${totalTeams} teams.` : null
        } else if (userRank) {
          const leader = league.teams[0]
          const pointsBack = userRank > 1 ? (leader.totalPoints - (userTeam?.totalPoints || 0)).toFixed(1) : null

          if (userRank === 1) {
            headline = "You're on top — don't get comfortable"
            body = `Leading by ${((userTeam?.totalPoints || 0) - (league.teams[1]?.totalPoints || 0)).toFixed(1)} points over ${league.teams[1]?.name || '2nd place'}.`
          } else if (userRank <= 3) {
            headline = `You're ${userRank}${userRank === 2 ? 'nd' : 'rd'} — the gap is closable`
            body = pointsBack ? `${pointsBack} points behind ${leader.name || 'the leader'}. A strong week changes everything.` : null
          } else {
            headline = `${userRank}${userRank === 4 ? 'th' : 'th'} of ${totalTeams} — time to make moves`
            body = pointsBack ? `${pointsBack} points off the lead. Check the wire for upgrades.` : null
          }
        } else {
          headline = `Season is live — ${totalTeams} teams competing`
        }

        return res.json({
          briefing: { headline, body, type: liveTournament ? 'live' : 'in_season' },
        })
      }

      // Pre-draft default
      return res.json({
        briefing: {
          headline: 'Start building your draft board — your prep is your edge',
          body: null,
          type: 'pre_draft',
        },
      })
    }

    // ── Global dashboard briefing ──

    // COLD START: no leagues, no boards
    if (leagueCount === 0 && boardCount === 0) {
      return res.json({
        briefing: {
          headline: 'Your coaching brain is warming up',
          body: 'Join or create a league to activate your AI coach. The more you play, the more I learn.',
          cta: { label: 'Create League', to: '/leagues/create' },
          type: 'onboarding',
        },
      })
    }

    // HAS LEAGUES, NO ACTIVITY: no predictions, no boards — nudge toward league
    if (leagueCount > 0 && predictionCount === 0 && boardCount === 0) {
      // Get the user's first league name for a personal touch
      const firstMembership = await prisma.leagueMember.findFirst({
        where: { userId },
        include: { league: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const leagueName = firstMembership?.league?.name || 'your league'
      const leagueLink = firstMembership?.league?.id ? `/leagues/${firstMembership.league.id}` : '/leagues'

      return res.json({
        briefing: {
          headline: `${leagueName} is waiting — build your draft board`,
          body: 'Every ranking, every tag, every note teaches your coach your style. Start prepping.',
          cta: { label: 'Go to League', to: leagueLink },
          type: 'activation',
        },
      })
    }

    // LIVE EVENT: check for active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'IN_PROGRESS' },
      select: { id: true, name: true },
    })

    if (activeTournament) {
      // Count rostered players in this tournament
      const rosteredInTournament = await prisma.rosterEntry.count({
        where: {
          team: { userId },
          player: {
            tournamentEntries: {
              some: { tournamentId: activeTournament.id },
            },
          },
        },
      }).catch(() => 0)

      if (rosteredInTournament > 0) {
        return res.json({
          briefing: {
            headline: `${activeTournament.name} is live — your players are on the course`,
            body: `I'm tracking ${rosteredInTournament} of your rostered players.`,
            cta: { label: 'Watch Live', to: `/tournaments/${activeTournament.id}` },
            type: 'live',
          },
        })
      }
    }

    // DRAFT UPCOMING (within 3 days)
    const threeDaysOut = new Date(Date.now() + 3 * 86400000)
    const upcomingDraft = await prisma.draft.findFirst({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: threeDaysOut, gte: new Date() },
        league: { members: { some: { userId } } },
      },
      include: { league: { select: { name: true, sport: true } } },
      orderBy: { scheduledFor: 'asc' },
    })

    if (upcomingDraft) {
      const diff = new Date(upcomingDraft.scheduledFor) - new Date()
      const days = Math.floor(diff / 86400000)
      const timeframe = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
      const sport = (upcomingDraft.league?.sport || 'golf').toLowerCase()
      const boardForSport = await prisma.draftBoard.findFirst({
        where: { userId, sport },
        include: { _count: { select: { entries: true } } },
      })
      const entryCount = boardForSport?._count?.entries || 0
      const boardStatus = entryCount > 0 ? `${entryCount} players ranked` : 'no board yet'

      return res.json({
        briefing: {
          headline: `Draft day is ${timeframe} — are you ready?`,
          body: `Your board has ${boardStatus}. ${upcomingDraft.league?.name || 'Your league'} is counting on you.`,
          cta: boardForSport
            ? { label: 'Review Board', to: `/lab/${boardForSport.id}` }
            : { label: 'Build Board', to: '/lab' },
          type: 'draft_prep',
        },
      })
    }

    // ACTIVE: has data — pull top insight
    try {
      const insights = await aiInsightPipeline.getActiveInsights(userId, { limit: 1 })
      if (insights && insights.length > 0) {
        const top = insights[0]
        return res.json({
          briefing: {
            headline: top.title,
            body: top.body,
            type: 'insight',
          },
        })
      }
    } catch (e) {
      // Fall through to default
    }

    // DEFAULT: active message with league context
    const firstLeague = await prisma.leagueMember.findFirst({
      where: { userId },
      include: { league: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({
      briefing: {
        headline: leagueCount === 1
          ? `${firstLeague?.league?.name || 'Your league'} is active — stay sharp`
          : `${leagueCount} leagues active — stay sharp`,
        body: boardCount > 0
          ? `You have ${boardCount} board${boardCount > 1 ? 's' : ''} and ${predictionCount} prediction${predictionCount !== 1 ? 's' : ''} on record.`
          : 'Build a draft board to start sharpening your edge.',
        cta: firstLeague?.league?.id
          ? { label: 'Go to League', to: `/leagues/${firstLeague.league.id}` }
          : null,
        type: 'active',
      },
    })
  } catch (err) {
    console.error('[AI] Coach briefing error:', err.message, err.stack)
    res.json({ briefing: null })
  }
})

// ═══════════════════════════════════════════════
//  INSIGHTS (Mode 1 — Ambient)
// ═══════════════════════════════════════════════

// GET /api/ai/insights — Get active insights for current user
router.get('/insights', authenticate, async (req, res) => {
  try {
    const insights = await aiInsightPipeline.getActiveInsights(req.user.id, {
      sport: req.query.sport || undefined,
      limit: parseInt(req.query.limit) || 20,
    })
    res.json({ insights })
  } catch (err) {
    console.error('[AI] Insights error:', err.message)
    res.status(500).json({ error: 'Failed to get insights' })
  }
})

// POST /api/ai/insights/:id/dismiss — Dismiss an insight
router.post('/insights/:id/dismiss', authenticate, async (req, res) => {
  try {
    await aiInsightPipeline.dismissInsight(req.params.id, req.user.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[AI] Dismiss error:', err.message)
    res.status(500).json({ error: 'Failed to dismiss insight' })
  }
})

// POST /api/ai/insights/:id/acted — Mark as acted upon
router.post('/insights/:id/acted', authenticate, async (req, res) => {
  try {
    await aiInsightPipeline.markActedOn(req.params.id, req.user.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[AI] ActedOn error:', err.message)
    res.status(500).json({ error: 'Failed to mark insight' })
  }
})

// ═══════════════════════════════════════════════
//  CONTEXTUAL COACHING (Mode 2)
// ═══════════════════════════════════════════════

// POST /api/ai/draft-nudge — Get draft room nudge
router.post('/draft-nudge', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.draftCoaching ?? true)) return res.json({ nudge: null })

    if (!rateLimit(req.user.id, 'draft-nudge', 20)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const nudge = await aiCoachService.generateDraftNudge(req.user.id, req.body)
    res.json({ nudge })
  } catch (err) {
    console.error('[AI] Draft nudge error:', err.message)
    res.json({ nudge: null }) // graceful degradation
  }
})

// POST /api/ai/board-coach — Get board editor coaching card
router.post('/board-coach', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.boardCoaching ?? true)) return res.json({ card: null })

    // Data confidence: board must have 30+ entries
    const { boardId, triggerAction, context } = req.body
    if (boardId) {
      const entryCount = await prisma.draftBoardEntry.count({ where: { boardId } })
      if (entryCount < 30) {
        return res.json({ card: null, gated: true, reason: `Board needs ${30 - entryCount} more entries to unlock AI coaching` })
      }
    }

    if (!rateLimit(req.user.id, 'board-coach', 8)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    // Build board snapshot for context-aware coaching
    const snapshot = boardId ? await buildBoardSnapshot(boardId) : null
    const card = await aiCoachService.generateBoardCoachingCard(req.user.id, boardId, triggerAction, context, snapshot)
    res.json({ card })
  } catch (err) {
    console.error('[AI] Board coach error:', err.message)
    res.json({ card: null }) // graceful degradation
  }
})

// POST /api/ai/prediction-context — Get prediction submission context
router.post('/prediction-context', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.predictionCoaching ?? true)) return res.json({ context: null })

    if (!rateLimit(req.user.id, 'prediction-context', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const context = await aiCoachService.generatePredictionContext(req.user.id, req.body)
    res.json({ context })
  } catch (err) {
    console.error('[AI] Prediction context error:', err.message)
    res.json({ context: null })
  }
})

// POST /api/ai/prediction-resolution — Get prediction resolution insight
router.post('/prediction-resolution', authenticate, async (req, res) => {
  try {
    // Check user preference
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { aiPreferences: true } })
    if (!(user?.aiPreferences?.predictionCoaching ?? true)) return res.json({ insight: null })

    if (!rateLimit(req.user.id, 'prediction-context', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    const insight = await aiCoachService.generateResolutionInsight(req.user.id, req.body)
    res.json({ insight })
  } catch (err) {
    console.error('[AI] Resolution insight error:', err.message)
    res.json({ insight: null })
  }
})

// ═══════════════════════════════════════════════
//  DEEP REPORTS (Mode 3)
// ═══════════════════════════════════════════════

// POST /api/ai/report/pre-draft — Generate pre-draft report
router.post('/report/pre-draft', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport } = req.body
    const report = await aiCoachService.generatePreDraftReport(req.user.id, sport || 'nfl')
    if (!report) return res.json({ report: null })

    // Store in DB
    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'pre_draft',
        contentJson: report,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Pre-draft report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// POST /api/ai/report/mid-season — Generate mid-season report
router.post('/report/mid-season', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport, season } = req.body
    const report = await aiCoachService.generateMidSeasonReport(req.user.id, sport || 'nfl', season || new Date().getFullYear())
    if (!report) return res.json({ report: null })

    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'mid_season',
        contentJson: report,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Mid-season report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// POST /api/ai/report/post-season — Generate post-season report
router.post('/report/post-season', authenticate, async (req, res) => {
  try {
    // Data confidence: deep reports require HIGH confidence
    const confidence = await aiInsightPipeline.assessUserConfidence(req.user.id)
    if (confidence.level !== 'HIGH') {
      return res.json({ report: null, gated: true, reason: 'Deep reports require more data. Complete a draft, make 20+ predictions, and add 10+ captures.' })
    }

    if (!rateLimit(req.user.id, 'reports', 3)) {
      return res.status(429).json({ error: 'Rate limit exceeded (3/day)' })
    }
    const { sport, season } = req.body
    const report = await aiCoachService.generatePostSeasonReport(req.user.id, sport || 'nfl', season || new Date().getFullYear())
    if (!report) return res.json({ report: null })

    const stored = await prisma.aiReport.create({
      data: {
        userId: req.user.id,
        sport: report.sport || sport || 'nfl',
        reportType: 'post_season',
        contentJson: report,
        expiresAt: new Date(Date.now() + 365 * 86400000), // 1 year
        tokenCount: report.tokenCount || null,
      },
    })
    res.json({ report: { ...report, id: stored.id } })
  } catch (err) {
    console.error('[AI] Post-season report error:', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// GET /api/ai/reports — Get all reports for current user
router.get('/reports', authenticate, async (req, res) => {
  try {
    const reports = await prisma.aiReport.findMany({
      where: { userId: req.user.id },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    })
    res.json({ reports })
  } catch (err) {
    console.error('[AI] Reports list error:', err.message)
    res.status(500).json({ error: 'Failed to get reports' })
  }
})

// GET /api/ai/reports/:id — Get specific report
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    const report = await prisma.aiReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json({ report })
  } catch (err) {
    console.error('[AI] Report get error:', err.message)
    res.status(500).json({ error: 'Failed to get report' })
  }
})

// ═══════════════════════════════════════════════
//  SCOUT + SIM (Phase 6F)
// ═══════════════════════════════════════════════

// POST /api/ai/scout-report — Generate/retrieve scout report
router.post('/scout-report', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'scout', 5)) {
      return res.status(429).json({ error: 'Rate limit exceeded (5/day)' })
    }
    const { sport, eventId } = req.body

    // Check for cached report
    const cached = await prisma.aiReport.findFirst({
      where: {
        sport,
        reportType: sport === 'golf' ? 'scout_golf' : 'scout_nfl',
        subjectId: eventId,
        expiresAt: { gt: new Date() },
      },
    })
    if (cached) {
      // Personalize for user
      const personalized = await aiCoachService.personalizeScoutReport(req.user.id, cached.contentJson, sport)
      return res.json({ report: personalized, cached: true })
    }

    // Generate new report
    let report
    if (sport === 'golf') {
      report = await aiCoachService.generateGolfScoutReport(eventId)
    } else {
      report = await aiCoachService.generateNflScoutReport(eventId)
    }
    if (!report) return res.json({ report: null })

    // Cache it
    await prisma.aiReport.create({
      data: {
        sport,
        reportType: report.reportType,
        subjectId: eventId,
        contentJson: report,
        expiresAt: new Date(Date.now() + 24 * 3600000), // 24h cache
        tokenCount: report.tokenCount || null,
      },
    })

    // Personalize for user
    const personalized = await aiCoachService.personalizeScoutReport(req.user.id, report, sport)
    res.json({ report: personalized, cached: false })
  } catch (err) {
    console.error('[AI] Scout report error:', err.message)
    res.status(500).json({ error: 'Failed to generate scout report' })
  }
})

// POST /api/ai/player-brief — Generate player AI brief
router.post('/player-brief', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'player-brief', 10)) {
      return res.status(429).json({ error: 'Rate limit exceeded (10/day)' })
    }
    const { playerId, sport } = req.body
    const brief = await aiCoachService.generatePlayerBrief(req.user.id, playerId, sport || 'nfl')
    res.json({ brief })
  } catch (err) {
    console.error('[AI] Player brief error:', err.message)
    res.json({ brief: null })
  }
})

// POST /api/ai/simulate — Matchup simulator
router.post('/simulate', authenticate, async (req, res) => {
  try {
    if (!rateLimit(req.user.id, 'sim', 5)) {
      return res.status(429).json({ error: 'Rate limit exceeded (5/day)' })
    }
    const { player1Id, player2Id, sport } = req.body
    if (!player1Id || !player2Id) return res.status(400).json({ error: 'Two players required' })

    const result = await aiCoachService.simulateMatchup(player1Id, player2Id, sport || 'nfl', req.user.id)
    res.json({ result })
  } catch (err) {
    console.error('[AI] Simulate error:', err.message)
    res.json({ result: null })
  }
})

// ═══════════════════════════════════════════════
//  USER AI PREFERENCES
// ═══════════════════════════════════════════════

// GET /api/ai/preferences — Get user's AI coaching preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { aiPreferences: true },
    })
    res.json({ preferences: user?.aiPreferences || { ambient: true, draftCoaching: true, boardCoaching: true, predictionCoaching: true } })
  } catch (err) {
    console.error('[AI] Preferences get error:', err.message)
    res.status(500).json({ error: 'Failed to get AI preferences' })
  }
})

// PATCH /api/ai/preferences — Update user's AI coaching preferences
router.patch('/preferences', authenticate, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { aiPreferences: true },
    })
    const currentPrefs = current?.aiPreferences || { ambient: true, draftCoaching: true, boardCoaching: true, predictionCoaching: true }
    const updated = { ...currentPrefs, ...req.body }

    // Only allow known keys
    const clean = {
      ambient: !!updated.ambient,
      draftCoaching: !!updated.draftCoaching,
      boardCoaching: !!updated.boardCoaching,
      predictionCoaching: !!updated.predictionCoaching,
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { aiPreferences: clean },
    })

    res.json({ preferences: clean })
  } catch (err) {
    console.error('[AI] Preferences update error:', err.message)
    res.status(500).json({ error: 'Failed to update AI preferences' })
  }
})

// ═══════════════════════════════════════════════
//  LEAGUE INTELLIGENCE (Addendum Part 3)
// ═══════════════════════════════════════════════

// Per-user per-league daily rate limiter for league queries
const leagueQueryLimits = new Map()
function checkLeagueQueryLimit(userId, leagueId, maxPerDay) {
  const key = `${userId}:${leagueId}`
  const now = Date.now()
  const dayMs = 86400000
  if (!leagueQueryLimits.has(key)) leagueQueryLimits.set(key, [])
  const log = leagueQueryLimits.get(key).filter(t => t > now - dayMs)
  leagueQueryLimits.set(key, log)
  if (log.length >= maxPerDay) return false
  log.push(now)
  return true
}

// POST /api/ai/league-query — Ask a question about a league
router.post('/league-query', authenticate, async (req, res) => {
  try {
    const { leagueId, question, sessionId } = req.body
    if (!leagueId || !question) {
      return res.status(400).json({ error: 'leagueId and question are required' })
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'Question too long (max 500 characters)' })
    }

    // Verify user is a member of this league
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId } },
    })
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this league' })
    }

    // Rate limit: 10 queries/day per league (free tier)
    if (!checkLeagueQueryLimit(req.user.id, leagueId, 10)) {
      return res.status(429).json({ error: 'Daily query limit reached (10/day per league)' })
    }

    const result = sessionId
      ? await leagueIntelligence.queryLeagueWithHistory(req.user.id, leagueId, question, sessionId)
      : await leagueIntelligence.queryLeague(req.user.id, leagueId, question)

    res.json(result)
  } catch (err) {
    console.error('[AI] League query error:', err.message)
    res.status(500).json({ error: 'Failed to query league data' })
  }
})

// GET /api/ai/league-query/sessions — Get user's recent query sessions for a league
router.get('/league-query/sessions', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.query
    if (!leagueId) return res.status(400).json({ error: 'leagueId is required' })

    const sessions = await leagueIntelligence.getUserSessions(req.user.id, leagueId)
    res.json({ sessions })
  } catch (err) {
    console.error('[AI] Sessions list error:', err.message)
    res.status(500).json({ error: 'Failed to get sessions' })
  }
})

// DELETE /api/ai/league-query/sessions/:id — Delete a query session
router.delete('/league-query/sessions/:id', authenticate, async (req, res) => {
  try {
    const deleted = await leagueIntelligence.deleteSession(req.params.id, req.user.id)
    if (!deleted) return res.status(404).json({ error: 'Session not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[AI] Session delete error:', err.message)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

module.exports = router
