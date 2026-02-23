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

      // In-season — enrich with standings, roster history, and board cross-references
      if (draft?.status === 'COMPLETED' && league.teams?.length > 0) {
        const userTeam = league.teams.find(t => t.userId === userId)
        const totalTeams = league.teams.length
        const userRank = userTeam ? league.teams.indexOf(userTeam) + 1 : null
        const ordinal = n => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`

        // Check for live tournament (golf)
        const liveTournament = sport === 'golf'
          ? await prisma.tournament.findFirst({
              where: { status: 'IN_PROGRESS' },
              select: { id: true, name: true, currentRound: true },
            }).catch(() => null)
          : null

        // Board cross-reference: find tagged players available on waivers
        let boardInsight = null
        if (userTeam) {
          const board = await prisma.draftBoard.findFirst({
            where: { userId, sport },
            orderBy: { updatedAt: 'desc' },
            select: { entries: { select: { playerId: true, tags: true, player: { select: { name: true } } } } },
          })
          if (board?.entries?.length > 0) {
            const taggedTargets = board.entries.filter(e => {
              const tags = Array.isArray(e.tags) ? e.tags : Object.keys(e.tags || {})
              return tags.some(t => ['target', 'sleeper', 'must-have', 'TARGET', 'SLEEPER'].includes(t))
            })
            if (taggedTargets.length > 0) {
              const taggedIds = taggedTargets.map(e => e.playerId)
              const rostered = await prisma.rosterEntry.findMany({
                where: { team: { leagueId }, isActive: true, playerId: { in: taggedIds } },
                select: { playerId: true },
              })
              const rosteredIds = new Set(rostered.map(r => r.playerId))
              const available = taggedTargets.filter(e => !rosteredIds.has(e.playerId))
              if (available.length > 0) {
                const pick = available[0]
                boardInsight = `You tagged ${pick.player?.name || 'a player'} as a target on your board — they're available on waivers.`
              }
            }
          }
        }

        // Roster loyalty: find longest-tenured player
        let loyaltyInsight = null
        if (userTeam) {
          const oldest = await prisma.rosterEntry.findFirst({
            where: { teamId: userTeam.id, isActive: true },
            orderBy: { createdAt: 'asc' },
            select: { player: { select: { name: true } }, createdAt: true },
          })
          if (oldest) {
            const weeksOwned = Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / (7 * 86400000))
            if (weeksOwned >= 3) {
              loyaltyInsight = `${oldest.player?.name} has been on your roster for ${weeksOwned} weeks — your most loyal pick.`
            }
          }
        }

        // Upcoming tournament preview (golf, between events)
        let upcomingPreview = null
        if (sport === 'golf' && !liveTournament) {
          const nextTournament = await prisma.tournament.findFirst({
            where: { startDate: { gt: new Date() }, status: { not: 'COMPLETED' } },
            orderBy: { startDate: 'asc' },
            select: {
              id: true, name: true, startDate: true,
              course: { select: { name: true, drivingImportance: true, approachImportance: true, aroundGreenImportance: true, puttingImportance: true } },
            },
          }).catch(() => null)

          if (nextTournament?.course) {
            const c = nextTournament.course
            const importances = [
              { label: 'driving', val: c.drivingImportance || 0, sg: 'sgOffTee' },
              { label: 'approach', val: c.approachImportance || 0, sg: 'sgApproach' },
              { label: 'short game', val: c.aroundGreenImportance || 0, sg: 'sgAroundGreen' },
              { label: 'putting', val: c.puttingImportance || 0, sg: 'sgPutting' },
            ].sort((a, b) => b.val - a.val)

            const topSkill = importances[0]
            if (topSkill.val > 0) {
              // Check roster strength in that skill
              let rosterInsight = ''
              if (userTeam) {
                const rosterPlayers = await prisma.rosterEntry.findMany({
                  where: { teamId: userTeam.id, isActive: true },
                  select: { player: { select: { name: true, [topSkill.sg]: true } } },
                })
                const sgValues = rosterPlayers.map(r => r.player?.[topSkill.sg]).filter(v => v != null)
                if (sgValues.length > 0) {
                  const avgSg = sgValues.reduce((a, b) => a + b, 0) / sgValues.length
                  if (avgSg > 0.3) rosterInsight = `Your roster is strong in ${topSkill.label} — that's an edge.`
                  else if (avgSg < -0.1) rosterInsight = `Your roster is weak in ${topSkill.label} — check the wire for upgrades.`
                }
              }

              const daysUntil = Math.floor((new Date(nextTournament.startDate) - new Date()) / 86400000)
              const timeLabel = daysUntil <= 1 ? 'starts tomorrow' : `is ${daysUntil} days out`
              upcomingPreview = {
                headline: `${nextTournament.name} ${timeLabel} — ${topSkill.label} course`,
                body: `${c.name} rewards ${topSkill.label}. ${rosterInsight}`,
              }
            }
          }
        }

        let headline, body = null

        if (liveTournament) {
          const rosteredInEvent = userTeam ? await prisma.rosterEntry.count({
            where: {
              teamId: userTeam.id,
              isActive: true,
              player: { performances: { some: { tournamentId: liveTournament.id } } },
            },
          }).catch(() => 0) : 0

          headline = `${liveTournament.name} is live${liveTournament.currentRound ? ` — Round ${liveTournament.currentRound}` : ''}`
          body = rosteredInEvent > 0
            ? `You have ${rosteredInEvent} player${rosteredInEvent > 1 ? 's' : ''} in the field. ${userRank ? `You're ${ordinal(userRank)} in your league.` : ''}`
            : userRank ? `You're sitting ${ordinal(userRank)} of ${totalTeams} teams.` : null
          // Append board insight if available
          if (boardInsight) body = (body ? body + ' ' : '') + boardInsight
        } else if (upcomingPreview) {
          // Between tournaments — show course preview + waiver advice
          headline = upcomingPreview.headline
          body = upcomingPreview.body
          if (boardInsight) body = (body ? body + ' ' : '') + boardInsight
        } else if (userRank) {
          const leader = league.teams[0]
          const pointsBack = userRank > 1 ? (leader.totalPoints - (userTeam?.totalPoints || 0)).toFixed(1) : null

          if (userRank === 1) {
            headline = "You're on top — don't get comfortable"
            body = `Leading by ${((userTeam?.totalPoints || 0) - (league.teams[1]?.totalPoints || 0)).toFixed(1)} points over ${league.teams[1]?.name || '2nd place'}.`
          } else if (userRank <= 3) {
            headline = `You're ${ordinal(userRank)} — the gap is closable`
            body = pointsBack ? `${pointsBack} points behind ${leader.name || 'the leader'}.` : null
          } else {
            headline = `${ordinal(userRank)} of ${totalTeams} — time to make moves`
            body = pointsBack ? `${pointsBack} points off the lead.` : null
          }
          // Append history insights
          if (boardInsight) body = (body ? body + ' ' : '') + boardInsight
          else if (loyaltyInsight) body = (body ? body + ' ' : '') + loyaltyInsight
        } else {
          headline = `Season is live — ${totalTeams} teams competing`
          body = boardInsight || loyaltyInsight || null
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

    // DEFAULT: active message with league context + recent activity
    const firstLeague = await prisma.leagueMember.findFirst({
      where: { userId },
      include: { league: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Check for recent roster moves to reference
    let recentActivity = null
    const recentEvent = await prisma.playerOpinionEvent.findFirst({
      where: { userId, eventType: { in: ['WAIVER_ADD', 'LINEUP_START'] } },
      orderBy: { createdAt: 'desc' },
      select: { eventType: true, eventData: true, createdAt: true },
    }).catch(() => null)

    if (recentEvent) {
      const daysAgo = Math.floor((Date.now() - new Date(recentEvent.createdAt).getTime()) / 86400000)
      const playerName = recentEvent.eventData?.playerName
      if (playerName && daysAgo <= 7) {
        if (recentEvent.eventType === 'WAIVER_ADD') {
          recentActivity = `You picked up ${playerName} recently — let's see if it pays off.`
        } else {
          recentActivity = `You started ${playerName} last week — your instincts are on record.`
        }
      }
    }

    return res.json({
      briefing: {
        headline: leagueCount === 1
          ? `${firstLeague?.league?.name || 'Your league'} is active — stay sharp`
          : `${leagueCount} leagues active — stay sharp`,
        body: recentActivity
          || (boardCount > 0
            ? `You have ${boardCount} board${boardCount > 1 ? 's' : ''} and ${predictionCount} prediction${predictionCount !== 1 ? 's' : ''} on record.`
            : 'Build a draft board to start sharpening your edge.'),
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
//  LAB WEEKLY INTELLIGENCE
// ═══════════════════════════════════════════════

// GET /api/ai/lab-weekly — Weekly prep intelligence for the Lab hub
router.get('/lab-weekly', authenticate, async (req, res) => {
  try {
    const userId = req.user.id

    // Get user's active golf leagues
    const golfLeagues = await prisma.league.findMany({
      where: {
        members: { some: { userId } },
        sport: { in: ['GOLF', 'golf', null] },
        status: 'active',
      },
      select: {
        id: true, name: true,
        teams: { where: { userId }, select: { id: true } },
      },
    })

    // No active golf leagues → return minimal
    if (golfLeagues.length === 0) {
      return res.json({ week: null })
    }

    const primaryLeague = golfLeagues[0]
    const userTeamId = primaryLeague.teams[0]?.id

    // Upcoming or live tournament
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { status: 'IN_PROGRESS' },
          { startDate: { gte: new Date() }, status: { not: 'COMPLETED' } },
        ],
      },
      orderBy: [
        { status: 'desc' }, // IN_PROGRESS first
        { startDate: 'asc' },
      ],
      select: {
        id: true, name: true, startDate: true, status: true,
        course: {
          select: {
            name: true, par: true, yardage: true, grassType: true, architect: true,
            drivingImportance: true, approachImportance: true,
            aroundGreenImportance: true, puttingImportance: true,
          },
        },
      },
    })

    if (!tournament) {
      return res.json({ week: null })
    }

    const isLive = tournament.status === 'IN_PROGRESS'
    const daysUntil = isLive ? 0 : Math.floor((new Date(tournament.startDate) - new Date()) / 86400000)

    // Course profile — identify top skill
    const course = tournament.course
    let courseProfile = null
    if (course) {
      const skills = [
        { key: 'driving', importance: course.drivingImportance || 0, sg: 'sgOffTee', label: 'off the tee' },
        { key: 'approach', importance: course.approachImportance || 0, sg: 'sgApproach', label: 'on approach' },
        { key: 'shortGame', importance: course.aroundGreenImportance || 0, sg: 'sgAroundGreen', label: 'around the green' },
        { key: 'putting', importance: course.puttingImportance || 0, sg: 'sgPutting', label: 'on the greens' },
      ].sort((a, b) => b.importance - a.importance)

      const topSkill = skills[0]
      const secondSkill = skills[1]
      courseProfile = {
        courseName: course.name,
        par: course.par,
        yardage: course.yardage,
        grassType: course.grassType,
        architect: course.architect,
        topSkill: topSkill.key,
        topSkillLabel: topSkill.label,
        topSkillSg: topSkill.sg,
        secondSkill: secondSkill.key,
        secondSkillLabel: secondSkill.label,
        description: topSkill.importance > 0
          ? `This course rewards players who excel ${topSkill.label}${secondSkill.importance > 0.2 ? ` and ${secondSkill.label}` : ''}.`
          : null,
      }
    }

    // Roster SG analysis for top skill
    let rosterFit = null
    if (userTeamId && courseProfile?.topSkillSg) {
      const rosterEntries = await prisma.rosterEntry.findMany({
        where: { teamId: userTeamId, isActive: true },
        select: {
          player: {
            select: {
              id: true, name: true, headshotUrl: true, owgrRank: true,
              sgTotal: true, sgOffTee: true, sgApproach: true, sgAroundGreen: true, sgPutting: true,
            },
          },
        },
      })

      const sgField = courseProfile.topSkillSg
      const withSg = rosterEntries
        .filter(r => r.player?.[sgField] != null)
        .map(r => ({ name: r.player.name, sg: r.player[sgField] }))
        .sort((a, b) => b.sg - a.sg)

      if (withSg.length > 0) {
        const avgSg = withSg.reduce((s, p) => s + p.sg, 0) / withSg.length
        rosterFit = {
          skill: courseProfile.topSkillLabel,
          avgSg: Math.round(avgSg * 100) / 100,
          strength: avgSg > 0.3 ? 'strong' : avgSg > 0 ? 'average' : 'weak',
          bestPlayer: withSg[0]?.name,
          bestSg: Math.round(withSg[0]?.sg * 100) / 100,
          worstPlayer: withSg[withSg.length - 1]?.name,
          worstSg: Math.round(withSg[withSg.length - 1]?.sg * 100) / 100,
        }
      }
    }

    // Waiver targets who fit the course (top 5 available players by top skill SG)
    let waiverTargets = []
    if (userTeamId && courseProfile?.topSkillSg) {
      const rosteredIds = await prisma.rosterEntry.findMany({
        where: { team: { leagueId: primaryLeague.id }, isActive: true },
        select: { playerId: true },
      })
      const rosteredSet = new Set(rosteredIds.map(r => r.playerId))
      const sgField = courseProfile.topSkillSg

      const candidates = await prisma.player.findMany({
        where: {
          id: { notIn: [...rosteredSet] },
          [sgField]: { gt: 0.3 },
          primaryTour: { in: ['PGA', 'LIV'] },
        },
        select: {
          id: true, name: true, headshotUrl: true, owgrRank: true, countryFlag: true,
          sgTotal: true, [sgField]: true,
        },
        orderBy: { [sgField]: 'desc' },
        take: 5,
      })

      waiverTargets = candidates.map(p => ({
        id: p.id,
        name: p.name,
        headshotUrl: p.headshotUrl,
        owgrRank: p.owgrRank,
        countryFlag: p.countryFlag,
        skillSg: Math.round((p[sgField] || 0) * 100) / 100,
        sgTotal: p.sgTotal ? Math.round(p.sgTotal * 100) / 100 : null,
      }))
    }

    // Board tag cross-references (targets/sleepers available on waivers)
    let boardInsights = []
    const board = await prisma.draftBoard.findFirst({
      where: { userId, sport: 'golf' },
      orderBy: { updatedAt: 'desc' },
      select: {
        entries: {
          select: { playerId: true, tags: true, player: { select: { id: true, name: true, headshotUrl: true } } },
        },
      },
    })
    if (board?.entries?.length > 0) {
      const rosteredInLeague = await prisma.rosterEntry.findMany({
        where: { team: { leagueId: primaryLeague.id }, isActive: true },
        select: { playerId: true },
      })
      const rosteredSet = new Set(rosteredInLeague.map(r => r.playerId))

      boardInsights = board.entries
        .filter(e => {
          const tags = Array.isArray(e.tags) ? e.tags : Object.keys(e.tags || {})
          return tags.some(t => ['target', 'sleeper', 'must-have', 'TARGET', 'SLEEPER'].includes(t)) && !rosteredSet.has(e.playerId)
        })
        .slice(0, 3)
        .map(e => ({
          playerId: e.playerId,
          name: e.player?.name,
          headshotUrl: e.player?.headshotUrl,
          tags: Array.isArray(e.tags) ? e.tags : Object.keys(e.tags || {}),
        }))
    }

    res.json({
      week: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.startDate,
          isLive,
          daysUntil,
        },
        courseProfile,
        rosterFit,
        waiverTargets,
        boardInsights,
        leagueName: primaryLeague.name,
        leagueId: primaryLeague.id,
      },
    })
  } catch (err) {
    console.error('[AI] Lab weekly error:', err.message, err.stack)
    res.json({ week: null })
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

// ═══════════════════════════════════════════════
//  LAB PHASE CONTEXT (Season Cycle)
// ═══════════════════════════════════════════════

// GET /api/ai/lab-phase-context — Thin aggregation endpoint for Lab hub phase data. No AI calls.
router.get('/lab-phase-context', authenticate, async (req, res) => {
  try {
    const userId = req.user.id

    const [leagueCount, boardCount, predictionCount, captureCount, activeInsights] = await Promise.all([
      prisma.leagueMember.count({ where: { userId } }),
      prisma.draftBoard.count({ where: { userId } }),
      prisma.prediction.count({ where: { userId } }),
      prisma.labCapture.count({ where: { userId } }),
      aiInsightPipeline.getActiveInsights(userId, { limit: 5 }).catch(() => []),
    ])

    // Determine phase from user's leagues
    const leagues = await prisma.league.findMany({
      where: { members: { some: { userId } }, status: { not: 'archived' } },
      select: {
        id: true, name: true, sport: true, status: true,
        drafts: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, scheduledFor: true } },
        teams: { where: { userId }, select: { id: true, totalPoints: true, wins: true, losses: true } },
      },
    })

    // Compute phase per league
    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ status: 'IN_PROGRESS' }, { startDate: { gte: new Date() }, status: { not: 'COMPLETED' } }] },
      orderBy: [{ status: 'desc' }, { startDate: 'asc' }],
      select: { id: true, name: true, status: true, startDate: true },
    })

    const leaguePhases = leagues.map(league => {
      const draft = league.drafts?.[0]
      const draftStatus = draft?.status
      const scheduledFor = draft?.scheduledFor

      if (league.status === 'completed') return { leagueId: league.id, phase: 'SEASON_COMPLETE' }
      if (draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED') return { leagueId: league.id, phase: 'DRAFTING' }
      if (draftStatus === 'COMPLETED') {
        const live = tournament?.status === 'IN_PROGRESS'
        return { leagueId: league.id, phase: live ? 'IN_SEASON_LIVE' : 'IN_SEASON_IDLE' }
      }
      if (draftStatus === 'SCHEDULED' && scheduledFor) {
        const hoursUntil = (new Date(scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60)
        return { leagueId: league.id, phase: hoursUntil <= 24 ? 'DRAFT_IMMINENT' : 'DRAFT_PREP', hoursUntil }
      }
      return { leagueId: league.id, phase: 'PRE_DRAFT' }
    })

    // Pick highest priority phase
    const PRIORITY = { PRE_DRAFT: 0, SEASON_COMPLETE: 1, IN_SEASON_IDLE: 2, DRAFT_PREP: 3, IN_SEASON_LIVE: 4, DRAFT_IMMINENT: 5, DRAFTING: 6 }
    let primaryPhase = 'PRE_DRAFT'
    for (const lp of leaguePhases) {
      if ((PRIORITY[lp.phase] || 0) > (PRIORITY[primaryPhase] || 0)) primaryPhase = lp.phase
    }

    // Build phase-specific data
    let phaseData = {}

    if (primaryPhase === 'PRE_DRAFT') {
      phaseData = { suggestedActions: boardCount === 0 ? ['Create your first board', 'Browse player stats'] : ['Refine your boards', 'Tag your targets'] }
    } else if (primaryPhase === 'DRAFT_PREP' || primaryPhase === 'DRAFT_IMMINENT') {
      const boards = await prisma.draftBoard.findMany({
        where: { userId },
        select: { id: true, _count: { select: { entries: true } } },
      })
      const avgScore = boards.length > 0 ? Math.round(boards.reduce((s, b) => s + Math.min(b._count.entries, 100), 0) / boards.length) : 0
      phaseData = {
        boardReadiness: { complete: boards.filter(b => b._count.entries >= 50).length, total: boards.length, avgScore },
        divergenceCount: 0, boldTakeCount: 0, positionGaps: 0,
      }
    } else if (primaryPhase === 'IN_SEASON_LIVE' || primaryPhase === 'IN_SEASON_IDLE') {
      // Standings history for sparkline
      const userTeam = leagues[0]?.teams?.[0]
      let standingsHistory = []
      if (userTeam) {
        const weeklyResults = await prisma.weeklyTeamResult.findMany({
          where: { teamId: userTeam.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true, rank: true },
          take: 12,
        }).catch(() => [])
        standingsHistory = weeklyResults.map((r, i) => ({ week: i + 1, rank: r.rank || 0 })).filter(r => r.rank > 0)
      }
      phaseData = { standingsHistory }
    }

    // Load patterns if user has enough data
    let patterns = null
    if (boardCount > 0 || predictionCount > 5) {
      try {
        const patternEngine = require('../services/patternEngine')
        const sport = leagues[0]?.sport?.toLowerCase() || 'golf'
        patterns = await patternEngine.getUserProfile(userId, sport)
      } catch { /* graceful degradation */ }
    }

    res.json({
      phase: primaryPhase,
      sport: leagues[0]?.sport?.toLowerCase() || 'golf',
      summary: {
        leagueCount,
        boardCount,
        predictionCount,
        captureCount,
        activeInsightCount: activeInsights?.length || 0,
      },
      phaseData,
      patterns,
    })
  } catch (err) {
    console.error('[AI] Lab phase context error:', err.message, err.stack)
    res.json({ phase: 'PRE_DRAFT', summary: {}, phaseData: {}, patterns: null })
  }
})

// GET /api/ai/decision-timeline — Recent opinion events for the Decision Timeline component
router.get('/decision-timeline', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const sport = req.query.sport || 'golf'
    const limit = Math.min(parseInt(req.query.limit) || 15, 30)

    const events = await prisma.playerOpinionEvent.findMany({
      where: { userId, sport },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        playerId: true,
        eventType: true,
        sentiment: true,
        createdAt: true,
        eventData: true,
      },
    })

    // Enrich with player names
    const playerIds = [...new Set(events.map(e => e.playerId).filter(Boolean))]
    const players = playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, name: true },
        })
      : []
    const playerMap = new Map(players.map(p => [p.id, p.name]))

    const enriched = events.map(e => ({
      date: e.createdAt,
      playerName: e.eventData?.playerName || playerMap.get(e.playerId) || 'Unknown',
      playerId: e.playerId,
      eventType: e.eventType,
      sentiment: e.sentiment,
    }))

    res.json({ events: enriched })
  } catch (err) {
    console.error('[AI] Decision timeline error:', err.message)
    res.json({ events: [] })
  }
})

// GET /api/ai/season-review — Aggregated season review data for Season Complete hero
router.get('/season-review', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const sport = req.query.sport || 'golf'
    const season = parseInt(req.query.season) || new Date().getFullYear()

    const startDate = new Date(`${season}-01-01`)
    const endDate = new Date(`${season}-12-31T23:59:59`)

    // Prediction accuracy
    const predictions = await prisma.prediction.findMany({
      where: { userId, sport, createdAt: { gte: startDate, lte: endDate } },
      select: { outcome: true, thesis: true, confidenceLevel: true, subjectPlayerId: true },
    })

    const resolved = predictions.filter(p => p.outcome === 'CORRECT' || p.outcome === 'INCORRECT')
    const correct = resolved.filter(p => p.outcome === 'CORRECT')
    const predictionAccuracy = resolved.length > 0 ? correct.length / resolved.length : null

    // Best call — highest confidence correct prediction
    const bestCall = correct
      .sort((a, b) => (b.confidenceLevel || 0) - (a.confidenceLevel || 0))
      .map(p => p.thesis)[0] || null

    // Worst call — highest confidence incorrect prediction
    const incorrect = resolved.filter(p => p.outcome === 'INCORRECT')
    const worstCall = incorrect
      .sort((a, b) => (b.confidenceLevel || 0) - (a.confidenceLevel || 0))
      .map(p => p.thesis)[0] || null

    // Board accuracy (targets drafted)
    const boards = await prisma.draftBoard.findMany({
      where: { userId, sport },
      select: { entries: { select: { playerId: true, tags: true } } },
    })
    const taggedTargets = boards.flatMap(b => b.entries)
      .filter(e => {
        const tags = Array.isArray(e.tags) ? e.tags : Object.keys(e.tags || {})
        return tags.some(t => ['target', 'TARGET', 'must-have'].includes(t))
      })
    const draftedPlayerIds = new Set(
      (await prisma.draftPick.findMany({
        where: { team: { userId }, pickedAt: { gte: startDate, lte: endDate } },
        select: { playerId: true },
      })).map(p => p.playerId)
    )
    const boardAccuracy = taggedTargets.length > 0
      ? taggedTargets.filter(e => draftedPlayerIds.has(e.playerId)).length / taggedTargets.length
      : null

    // Captures
    const captureCount = await prisma.labCapture.count({
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
    })

    // Final standings
    const userTeam = await prisma.team.findFirst({
      where: { userId, league: { status: 'completed', sportRef: { slug: sport } } },
      select: {
        totalPoints: true,
        league: { select: { teams: { select: { totalPoints: true }, orderBy: { totalPoints: 'desc' } } } },
      },
    })
    let finalRank = null
    let totalTeams = null
    if (userTeam) {
      totalTeams = userTeam.league.teams.length
      finalRank = userTeam.league.teams.findIndex(t => t.totalPoints === userTeam.totalPoints) + 1
    }

    res.json({
      review: {
        season,
        sport,
        finalRank,
        totalTeams,
        predictionAccuracy,
        totalPredictions: predictions.length,
        bestCall,
        worstCall,
        boardAccuracy,
        captureCount,
        captureToAction: null, // Would need pattern engine — defer
      },
    })
  } catch (err) {
    console.error('[AI] Season review error:', err.message, err.stack)
    res.json({ review: null })
  }
})

module.exports = router
