const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { calculateLeagueStandings, calculateTournamentScoring, calculateLiveTournamentScoring } = require('../services/scoringService')
const { notifyLeague } = require('../services/notificationService')
const { generatePlayoffBracket, getPlayoffBracket, createCustomPlayoffMatchups } = require('../services/playoffService')
const { STANDARD_RULES, getScoringSchema, resolveRules } = require('../services/nflScoringService')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/leagues - Get user's leagues
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Auto-repair: if user owns leagues but isn't a member, create membership
    const ownedWithoutMembership = await prisma.league.findMany({
      where: {
        ownerId: req.user.id,
        members: { none: { userId: req.user.id } },
      },
      select: { id: true },
    })
    if (ownedWithoutMembership.length > 0) {
      await prisma.leagueMember.createMany({
        data: ownedWithoutMembership.map(l => ({
          userId: req.user.id,
          leagueId: l.id,
          role: 'OWNER',
        })),
        skipDuplicates: true,
      })
    }

    const leagues = await prisma.league.findMany({
      where: {
        members: {
          some: { userId: req.user.id }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true, teams: true }
        },
        teams: {
          where: { userId: req.user.id },
          select: {
            id: true,
            name: true,
            totalPoints: true,
            wins: true,
            losses: true
          }
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, scheduledFor: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ leagues })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues - Create a new league
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, sport, format, draftType, maxTeams, maxMembers, isPublic, settings, formatSettings, rosterSize, scoringType, budget } = req.body

    // Map frontend format strings to enum values
    const formatMap = {
      'full-league': 'FULL_LEAGUE',
      'head-to-head': 'HEAD_TO_HEAD',
      'roto': 'ROTO',
      'survivor': 'SURVIVOR',
      'one-and-done': 'ONE_AND_DONE',
    }

    const draftTypeMap = {
      'snake': 'SNAKE',
      'auction': 'AUCTION',
      'none': 'NONE',
    }

    const resolvedFormat = formatMap[format] || format || 'FULL_LEAGUE'
    const resolvedDraftType = draftTypeMap[draftType] || draftType || 'SNAKE'
    const resolvedMaxTeams = maxTeams || maxMembers || 10

    // Resolve sport — look up Sport record by slug
    const sportSlug = (sport || 'GOLF').toLowerCase()
    const sportRecord = await prisma.sport.findUnique({ where: { slug: sportSlug } })

    // Look up scoring system for this sport
    const resolvedScoringType = scoringType || 'standard'
    let scoringSystemRecord = null
    if (sportRecord) {
      if (resolvedScoringType === 'custom' && sportSlug === 'nfl') {
        // For custom NFL scoring, create a per-league ScoringSystem cloned from half_ppr defaults
        const basePreset = req.body.basePreset || 'half_ppr'
        const baseSystem = await prisma.scoringSystem.findUnique({
          where: { sportId_slug: { sportId: sportRecord.id, slug: basePreset } },
        })
        const baseRules = baseSystem ? baseSystem.rules : { preset: 'custom', ...STANDARD_RULES }
        const customRules = { ...baseRules, preset: 'custom', ...(req.body.scoringRules || {}) }

        scoringSystemRecord = await prisma.scoringSystem.create({
          data: {
            sportId: sportRecord.id,
            name: `Custom - ${name}`,
            slug: `custom_${Date.now()}`,
            isDefault: false,
            isSystem: false,
            rules: customRules,
          },
        })
      } else {
        scoringSystemRecord = await prisma.scoringSystem.findUnique({
          where: { sportId_slug: { sportId: sportRecord.id, slug: resolvedScoringType } },
        })
      }
    }

    // Default roster size by sport
    const defaultRosterSize = sportSlug === 'nfl' ? 17 : 6

    // Combine settings
    const combinedSettings = {
      ...(settings || {}),
      ...(formatSettings || {}),
      rosterSize: rosterSize || defaultRosterSize,
      scoringType: resolvedScoringType,
      budget: budget || null,
    }

    const league = await prisma.league.create({
      data: {
        name,
        sport: (sport || 'GOLF').toUpperCase(),
        sportId: sportRecord?.id || null,
        scoringSystemId: scoringSystemRecord?.id || null,
        format: resolvedFormat,
        draftType: resolvedDraftType,
        maxTeams: resolvedMaxTeams,
        isPublic: isPublic || false,
        settings: combinedSettings,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'OWNER'
          }
        },
        // Also create a team for the owner
        teams: {
          create: {
            name: `${req.user.name}'s Team`,
            userId: req.user.id
          }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    // Return with joinCode alias for frontend compatibility
    res.status(201).json({
      ...league,
      joinCode: league.inviteCode,
      league: {
        ...league,
        joinCode: league.inviteCode
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id - Get league details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        teams: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            },
            roster: {
              where: { isActive: true },
              include: {
                player: true
              }
            }
          },
          orderBy: { totalPoints: 'desc' }
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Check if user is a member
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized to view this league' } })
    }

    // Add standings/rankings
    const standings = league.teams.map((team, index) => ({
      ...team,
      rank: index + 1
    }))

    res.json({
      league: {
        ...league,
        standings
      }
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/leagues/:id - Update league settings (commissioner only)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, format, settings, isPublic } = req.body

    const league = await prisma.league.findUnique({
      where: { id: req.params.id }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Only owner can update league
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can update league settings' } })
    }

    // Build update data
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (isPublic !== undefined) updateData.isPublic = isPublic

    // Handle format change
    if (format !== undefined) {
      const formatMap = {
        'full-league': 'FULL_LEAGUE',
        'head-to-head': 'HEAD_TO_HEAD',
        'roto': 'ROTO',
        'survivor': 'SURVIVOR',
        'one-and-done': 'ONE_AND_DONE',
      }
      updateData.format = formatMap[format] || format
    }

    // Merge settings if provided
    if (settings !== undefined) {
      updateData.settings = { ...league.settings, ...settings }
    }

    const updatedLeague = await prisma.league.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    res.json({ league: updatedLeague })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/leagues/:id/scoring - Update NFL league scoring rules (commissioner only)
router.patch('/:id/scoring', authenticate, async (req, res, next) => {
  try {
    const { rules, preset } = req.body

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { scoringSystem: true },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can update scoring rules' } })
    }

    // If switching to a system preset, just update the league's scoringSystemId
    if (preset && preset !== 'custom') {
      const sportRecord = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
      if (!sportRecord) {
        return res.status(400).json({ error: { message: 'NFL sport not found' } })
      }
      const presetSystem = await prisma.scoringSystem.findUnique({
        where: { sportId_slug: { sportId: sportRecord.id, slug: preset } },
      })
      if (!presetSystem) {
        return res.status(400).json({ error: { message: `Preset "${preset}" not found` } })
      }

      const updated = await prisma.league.update({
        where: { id: req.params.id },
        data: {
          scoringSystemId: presetSystem.id,
          settings: { ...league.settings, scoringType: preset },
        },
        include: { scoringSystem: true },
      })
      return res.json({ league: updated, scoringSystem: presetSystem })
    }

    // Custom rules update
    if (!rules || typeof rules !== 'object') {
      return res.status(400).json({ error: { message: 'Scoring rules object is required' } })
    }

    // If the league already has a non-system scoring system, update it in place
    if (league.scoringSystem && !league.scoringSystem.isSystem) {
      const updatedRules = { ...league.scoringSystem.rules, ...rules, preset: 'custom' }
      const updated = await prisma.scoringSystem.update({
        where: { id: league.scoringSystem.id },
        data: { rules: updatedRules },
      })
      const updatedLeague = await prisma.league.update({
        where: { id: req.params.id },
        data: { settings: { ...league.settings, scoringType: 'custom' } },
      })
      return res.json({ league: updatedLeague, scoringSystem: updated })
    }

    // Otherwise, create a new per-league scoring system
    const baseRules = league.scoringSystem ? league.scoringSystem.rules : STANDARD_RULES
    const customRules = { ...baseRules, ...rules, preset: 'custom' }

    const sportRecord = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    const newSystem = await prisma.scoringSystem.create({
      data: {
        sportId: sportRecord.id,
        name: `Custom - ${league.name}`,
        slug: `custom_${league.id}`,
        isDefault: false,
        isSystem: false,
        rules: customRules,
      },
    })

    const updatedLeague = await prisma.league.update({
      where: { id: req.params.id },
      data: {
        scoringSystemId: newSystem.id,
        settings: { ...league.settings, scoringType: 'custom' },
      },
    })

    res.json({ league: updatedLeague, scoringSystem: newSystem })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/scoring-schema - Get NFL scoring schema metadata
router.get('/:id/scoring-schema', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { scoringSystem: true },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const schema = getScoringSchema()
    const currentRules = league.scoringSystem ? resolveRules(league.scoringSystem) : STANDARD_RULES

    res.json({
      schema,
      currentRules,
      scoringType: league.settings?.scoringType || 'standard',
      isCustom: league.scoringSystem ? !league.scoringSystem.isSystem : false,
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/leagues/:id - Delete league (commissioner only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Only owner can delete league
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can delete the league' } })
    }

    // Delete league and all related data (cascading deletes handled by schema)
    await prisma.league.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'League deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/join - Join a league
router.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const { inviteCode } = req.body
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { members: true } }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    // Verify invite code if league is private
    if (!league.isPublic && league.inviteCode !== inviteCode) {
      return res.status(403).json({ error: { message: 'Invalid invite code' } })
    }

    // Check if league is full
    if (league._count.members >= league.maxTeams) {
      return res.status(400).json({ error: { message: 'League is full' } })
    }

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId: league.id
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ error: { message: 'Already a member of this league' } })
    }

    // Add member and create team
    await prisma.$transaction([
      prisma.leagueMember.create({
        data: {
          userId: req.user.id,
          leagueId: league.id,
          role: 'MEMBER'
        }
      }),
      prisma.team.create({
        data: {
          name: `${req.user.name}'s Team`,
          userId: req.user.id,
          leagueId: league.id
        }
      })
    ])

    // Notify league members about new member
    try {
      notifyLeague(league.id, {
        type: 'MEMBER_JOINED',
        title: 'New Member',
        message: `${req.user.name} joined ${league.name}`,
        actionUrl: `/leagues/${league.id}`,
        data: { leagueId: league.id, userId: req.user.id, userName: req.user.name },
      }, [req.user.id], prisma).catch(err => console.error('Member joined notification failed:', err.message))
    } catch (err) { console.error('Member joined notification failed:', err.message) }

    res.json({ message: 'Successfully joined league' })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/join-by-code - Join league by invite code
router.post('/join-by-code', authenticate, async (req, res, next) => {
  try {
    const { inviteCode } = req.body

    const league = await prisma.league.findUnique({
      where: { inviteCode },
      include: {
        _count: { select: { members: true } }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'Invalid invite code' } })
    }

    // Check if league is full
    if (league._count.members >= league.maxTeams) {
      return res.status(400).json({ error: { message: 'League is full' } })
    }

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId: league.id
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ error: { message: 'Already a member of this league' } })
    }

    // Add member and create team
    await prisma.$transaction([
      prisma.leagueMember.create({
        data: {
          userId: req.user.id,
          leagueId: league.id,
          role: 'MEMBER'
        }
      }),
      prisma.team.create({
        data: {
          name: `${req.user.name}'s Team`,
          userId: req.user.id,
          leagueId: league.id
        }
      })
    ])

    // Notify league members about new member
    try {
      notifyLeague(league.id, {
        type: 'MEMBER_JOINED',
        title: 'New Member',
        message: `${req.user.name} joined ${league.name}`,
        actionUrl: `/leagues/${league.id}`,
        data: { leagueId: league.id, userId: req.user.id, userName: req.user.name },
      }, [req.user.id], prisma).catch(err => console.error('Member joined notification failed:', err.message))
    } catch (err) { console.error('Member joined notification failed:', err.message) }

    res.json({ league, message: 'Successfully joined league' })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/draft - Create a draft for this league (commissioner only)
router.post('/:id/draft', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        drafts: {
          where: { status: { not: 'COMPLETED' } }
        }
      }
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can create a draft' } })
    }

    // Prevent duplicate active drafts
    if (league.drafts.length > 0) {
      return res.status(400).json({ error: { message: 'An active draft already exists for this league' } })
    }

    const { scheduledFor } = req.body || {}
    const timePerPick = league.settings?.timePerPick || 90
    const totalRounds = league.settings?.rosterSize || 6

    const draft = await prisma.draft.create({
      data: {
        leagueId: league.id,
        timePerPick,
        totalRounds,
        status: 'SCHEDULED',
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
      },
      include: {
        league: {
          include: {
            teams: {
              include: {
                user: { select: { id: true, name: true, avatar: true } }
              }
            },
            owner: { select: { id: true, name: true } }
          }
        },
        picks: true,
        draftOrder: true
      }
    })

    res.status(201).json({ draft })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/messages - Get league chat messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query

    const messages = await prisma.message.findMany({
      where: {
        leagueId: req.params.id,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })

    res.json({ messages: messages.reverse() })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/messages - Send a message
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body

    const message = await prisma.message.create({
      data: {
        content,
        userId: req.user.id,
        leagueId: req.params.id
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    // Emit via Socket.IO
    const io = req.app.get('io')
    io.to(`league-${req.params.id}`).emit('new-message', message)

    res.status(201).json({ message })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/standings - Get league standings
router.get('/:id/standings', authenticate, async (req, res, next) => {
  try {
    // Verify league membership
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { userId: true } },
      },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some((m) => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized to view this league' } })
    }

    // NFL leagues use TeamSeason/WeeklyTeamResult, not golf performances
    if ((league.sport || '').toUpperCase() === 'NFL') {
      const leagueSeason = await prisma.leagueSeason.findFirst({
        where: { leagueId: league.id },
        orderBy: { createdAt: 'desc' },
        include: {
          teamSeasons: {
            include: { team: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
          },
        },
      })
      if (!leagueSeason) return res.json({ standings: [], weeklyResults: [] })

      const teamSeasons = leagueSeason.teamSeasons || []
      const standings = [...teamSeasons]
        .sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.totalPoints || 0) - (a.totalPoints || 0))
        .map((ts, i) => ({
          teamId: ts.teamId,
          teamName: ts.teamName || ts.team?.name,
          userId: ts.team?.userId,
          userName: ts.team?.user?.name,
          userAvatar: ts.team?.user?.avatar,
          totalPoints: Math.round((ts.totalPoints || 0) * 100) / 100,
          wins: ts.wins || 0,
          losses: ts.losses || 0,
          rank: i + 1,
        }))

      // Weekly results from WeeklyTeamResult
      const weeklyTeamResults = await prisma.weeklyTeamResult.findMany({
        where: { leagueSeasonId: leagueSeason.id },
        orderBy: { weekNumber: 'asc' },
        include: { fantasyWeek: { select: { name: true } } },
      })

      const weekMap = new Map()
      for (const wr of weeklyTeamResults) {
        if (!weekMap.has(wr.weekNumber)) {
          weekMap.set(wr.weekNumber, {
            weekNumber: wr.weekNumber,
            weekName: wr.fantasyWeek?.name || `Week ${wr.weekNumber}`,
            fantasyWeekId: wr.fantasyWeekId,
            teams: [],
          })
        }
        weekMap.get(wr.weekNumber).teams.push({
          teamId: wr.teamId,
          teamName: standings.find(s => s.teamId === wr.teamId)?.teamName || '',
          points: Math.round((wr.totalPoints || 0) * 100) / 100,
        })
      }

      const weeklyResults = Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber)

      return res.json({ standings, weeklyResults })
    }

    const data = await calculateLeagueStandings(req.params.id, prisma)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/scoring/:tournamentId - Get per-team scoring for a tournament
router.get('/:id/scoring/:tournamentId', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { userId: true } },
      },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some((m) => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized to view this league' } })
    }

    const data = await calculateTournamentScoring(req.params.tournamentId, req.params.id, prisma)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/live-scoring - Live tournament scoring for a league
router.get('/:id/live-scoring', authenticate, async (req, res, next) => {
  try {
    const { tournamentId } = req.query

    // Verify league membership
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some((m) => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized to view this league' } })
    }

    // Resolve tournament: use provided ID, or find current IN_PROGRESS, or most recent COMPLETED
    let resolvedTournamentId = tournamentId
    if (!resolvedTournamentId) {
      const current = await prisma.tournament.findFirst({
        where: { status: 'IN_PROGRESS' },
        select: { id: true },
      })
      if (current) {
        resolvedTournamentId = current.id
      } else {
        const recent = await prisma.tournament.findFirst({
          where: { status: 'COMPLETED' },
          orderBy: { endDate: 'desc' },
          select: { id: true },
        })
        if (recent) resolvedTournamentId = recent.id
      }
    }

    if (!resolvedTournamentId) {
      return res.json({ tournament: null, isLive: false, teams: [] })
    }

    const data = await calculateLiveTournamentScoring(resolvedTournamentId, req.params.id, prisma)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/available-players - Free agents (players not rostered in this league)
router.get('/:id/available-players', authenticate, async (req, res, next) => {
  try {
    const { search, tour, limit = 50, offset = 0 } = req.query

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some((m) => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Get all player IDs currently rostered in this league
    const rosteredEntries = await prisma.rosterEntry.findMany({
      where: { team: { leagueId: req.params.id } },
      select: { playerId: true },
    })
    const rosteredIds = rosteredEntries.map((r) => r.playerId)

    // Build player filter
    const where = {
      id: { notIn: rosteredIds },
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (tour && tour !== 'All') {
      where.primaryTour = tour
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        select: {
          id: true,
          name: true,
          country: true,
          countryFlag: true,
          headshotUrl: true,
          owgrRank: true,
          primaryTour: true,
          sgTotal: true,
          sgPutting: true,
          sgApproach: true,
          sgOffTee: true,
          sgAroundGreen: true,
          wins: true,
          top5s: true,
          top10s: true,
          earnings: true,
        },
        orderBy: [{ owgrRank: 'asc' }],
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.player.count({ where }),
    ])

    res.json({ players, total, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/matchups - Get H2H matchup schedule with scores
router.get('/:id/matchups', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { userId: true } },
        teams: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember && !league.isPublic) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Fetch all matchups with tournament info
    const matchups = await prisma.matchup.findMany({
      where: { leagueId: req.params.id },
      include: {
        tournament: { select: { id: true, name: true, startDate: true } },
        homeTeam: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        awayTeam: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: [{ week: 'asc' }, { createdAt: 'asc' }],
    })

    // Build team lookup by userId
    const teamByUserId = {}
    league.teams.forEach(t => {
      teamByUserId[t.userId] = t
    })

    // Group matchups by week
    const weekMap = {}
    for (const m of matchups) {
      if (!weekMap[m.week]) {
        weekMap[m.week] = {
          week: m.week,
          tournament: m.tournament?.name || `Week ${m.week}`,
          tournamentId: m.tournamentId,
          matchups: [],
        }
      }
      weekMap[m.week].matchups.push({
        id: m.id,
        home: m.homeTeam.userId,
        away: m.awayTeam.userId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        completed: m.isComplete,
      })
    }

    const schedule = Object.values(weekMap).sort((a, b) => a.week - b.week)

    // Current week logic:
    // 1. If a week has scores but isn't fully complete → it's actively in progress
    // 2. Otherwise, show the last fully completed week (post-game results)
    // 3. If nothing is completed, show the first week
    let currentWeek = schedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const hasIncomplete = w.matchups.some(m => !m.completed)
      return hasScores && hasIncomplete
    })

    if (!currentWeek) {
      const completedWeeks = schedule.filter(w => w.matchups.every(m => m.completed))
      currentWeek = completedWeeks.length > 0
        ? completedWeeks[completedWeeks.length - 1]
        : schedule[0] || null
    }

    // Build standings from completed matchups
    const standings = {}
    league.teams.forEach(t => {
      standings[t.userId] = {
        userId: t.userId,
        teamId: t.id,
        name: t.user.name,
        teamName: t.name || t.user.name,
        avatar: t.user.avatar,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      }
    })

    for (const m of matchups) {
      if (!m.isComplete) continue
      const homeUid = m.homeTeam.userId
      const awayUid = m.awayTeam.userId

      if (standings[homeUid]) {
        standings[homeUid].pointsFor += m.homeScore
        standings[homeUid].pointsAgainst += m.awayScore
      }
      if (standings[awayUid]) {
        standings[awayUid].pointsFor += m.awayScore
        standings[awayUid].pointsAgainst += m.homeScore
      }

      if (m.homeScore > m.awayScore) {
        if (standings[homeUid]) standings[homeUid].wins++
        if (standings[awayUid]) standings[awayUid].losses++
      } else if (m.awayScore > m.homeScore) {
        if (standings[awayUid]) standings[awayUid].wins++
        if (standings[homeUid]) standings[homeUid].losses++
      } else {
        if (standings[homeUid]) standings[homeUid].ties++
        if (standings[awayUid]) standings[awayUid].ties++
      }
    }

    // Compute division records if divisions exist
    const divisions = league.settings?.formatSettings?.divisions
    const divisionAssignments = league.settings?.formatSettings?.divisionAssignments || {}
    let divisionStandings = null

    if (divisions && divisions.length > 0) {
      // Build teamId-to-division map (divisionAssignments uses teamId)
      const teamDivision = {}
      for (const team of league.teams) {
        teamDivision[team.id] = divisionAssignments[team.id] || null
      }

      // Compute division W-L for each team from completed matchups
      const divRecord = {} // userId -> { divWins, divLosses, divTies }
      league.teams.forEach(t => {
        divRecord[t.userId] = { divWins: 0, divLosses: 0, divTies: 0 }
      })

      for (const m of matchups) {
        if (!m.isComplete || m.isPlayoff) continue
        const homeDivision = teamDivision[m.homeTeamId]
        const awayDivision = teamDivision[m.awayTeamId]
        if (!homeDivision || !awayDivision || homeDivision !== awayDivision) continue

        const homeUid = m.homeTeam.userId
        const awayUid = m.awayTeam.userId
        if (m.homeScore > m.awayScore) {
          divRecord[homeUid].divWins++
          divRecord[awayUid].divLosses++
        } else if (m.awayScore > m.homeScore) {
          divRecord[awayUid].divWins++
          divRecord[homeUid].divLosses++
        } else {
          divRecord[homeUid].divTies++
          divRecord[awayUid].divTies++
        }
      }

      // Attach division info to each standings entry
      Object.values(standings).forEach(s => {
        const team = league.teams.find(t => t.userId === s.userId)
        s.division = team ? (divisionAssignments[team.id] || null) : null
        const dr = divRecord[s.userId] || { divWins: 0, divLosses: 0, divTies: 0 }
        s.divWins = dr.divWins
        s.divLosses = dr.divLosses
        s.divTies = dr.divTies
      })

      // Build grouped division standings
      divisionStandings = {}
      for (const div of divisions) {
        divisionStandings[div] = Object.values(standings)
          .filter(s => s.division === div)
          .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins
            if (b.ties !== a.ties) return b.ties - a.ties
            return b.pointsFor - a.pointsFor
          })
      }
    }

    // Sort standings by wins, then pointsFor
    const sortedStandings = Object.values(standings).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.ties !== a.ties) return b.ties - a.ties
      return b.pointsFor - a.pointsFor
    })

    // Fetch playoff bracket if any playoff matchups exist
    let playoffBracket = null
    try {
      playoffBracket = await getPlayoffBracket(req.params.id, prisma)
    } catch (err) {
      console.error('Playoff bracket fetch failed:', err.message)
    }

    res.json({
      schedule,
      currentWeek,
      standings: sortedStandings,
      divisionStandings,
      playoffs: playoffBracket,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/leagues/:id/playoffs/generate - Generate playoff bracket (commissioner only)
router.post('/:id/playoffs/generate', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can generate playoffs' } })
    }

    const result = await generatePlayoffBracket(req.params.id, prisma)
    res.json(result)
  } catch (error) {
    if (error.message.includes('already been generated') || error.message.includes('not found')) {
      return res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

// POST /api/leagues/:id/playoffs/custom - Commissioner submits custom playoff matchups
router.post('/:id/playoffs/custom', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can set playoff matchups' } })
    }

    const { matchups } = req.body
    if (!Array.isArray(matchups) || matchups.length === 0) {
      return res.status(400).json({ error: { message: 'matchups array is required' } })
    }

    const result = await createCustomPlayoffMatchups(req.params.id, matchups, prisma)
    res.json(result)
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('not in the qualified') || error.message.includes('multiple matchups') || error.message.includes('cannot play against itself')) {
      return res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

// POST /api/leagues/:id/matchups/generate - Generate round-robin matchup schedule (commissioner only)
router.post('/:id/matchups/generate', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { userId: true, role: true } },
        teams: { select: { id: true, userId: true } },
      },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isOwner = league.ownerId === req.user.id
    const isAdmin = league.members.some(m => m.userId === req.user.id && m.role === 'OWNER')
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: { message: 'Only the commissioner can generate matchups' } })
    }

    const teams = league.teams
    if (teams.length < 2) {
      return res.status(400).json({ error: { message: 'Need at least 2 teams to generate matchups' } })
    }

    // Get upcoming/completed tournaments for scheduling
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ['UPCOMING', 'COMPLETED', 'IN_PROGRESS'] } },
      orderBy: { startDate: 'asc' },
    })

    if (tournaments.length === 0) {
      return res.status(400).json({ error: { message: 'No tournaments available for scheduling' } })
    }

    // Build tournament→fantasyWeek lookup
    const fantasyWeeks = await prisma.fantasyWeek.findMany({
      where: { tournamentId: { in: tournaments.map(t => t.id) } },
    })
    const fwByTournament = Object.fromEntries(fantasyWeeks.map(fw => [fw.tournamentId, fw.id]))

    // Delete existing matchups
    await prisma.matchup.deleteMany({ where: { leagueId: req.params.id } })

    // Generate round-robin schedule
    const teamIds = teams.map(t => t.id)
    const n = teamIds.length
    const matchupsToCreate = []

    // Round-robin: each team plays every other team
    // For n teams, we need n-1 rounds (if n is even) or n rounds (if n is odd)
    const rounds = n % 2 === 0 ? n - 1 : n
    const teamList = [...teamIds]

    // Add a bye if odd number of teams
    if (n % 2 !== 0) teamList.push(null)
    const half = teamList.length / 2

    for (let round = 0; round < rounds; round++) {
      const tournament = tournaments[round % tournaments.length]

      for (let i = 0; i < half; i++) {
        const home = teamList[i]
        const away = teamList[teamList.length - 1 - i]

        if (home && away) {
          matchupsToCreate.push({
            week: round + 1,
            leagueId: req.params.id,
            tournamentId: tournament.id,
            fantasyWeekId: fwByTournament[tournament.id] || null,
            homeTeamId: home,
            awayTeamId: away,
            isComplete: false,
          })
        }
      }

      // Rotate teams (keep first team fixed)
      const last = teamList.pop()
      teamList.splice(1, 0, last)
    }

    // Bulk create
    await prisma.matchup.createMany({ data: matchupsToCreate })

    res.json({
      message: `Generated ${matchupsToCreate.length} matchups across ${rounds} weeks`,
      matchupCount: matchupsToCreate.length,
      weekCount: rounds,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/leagues/:id/matchups/:matchupId - Update a matchup (commissioner only)
router.patch('/:id/matchups/:matchupId', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true, role: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isOwner = league.ownerId === req.user.id
    const isAdmin = league.members.some(m => m.userId === req.user.id && m.role === 'OWNER')
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: { message: 'Only the commissioner can update matchups' } })
    }

    const { homeScore, awayScore, isComplete } = req.body

    const matchup = await prisma.matchup.update({
      where: { id: req.params.matchupId },
      data: {
        ...(homeScore !== undefined && { homeScore: parseFloat(homeScore) }),
        ...(awayScore !== undefined && { awayScore: parseFloat(awayScore) }),
        ...(isComplete !== undefined && { isComplete }),
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true } },
      },
    })

    res.json({ matchup })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/leagues/:id/matchups - Reset all matchups (commissioner only)
router.delete('/:id/matchups', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true, role: true } } },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const isOwner = league.ownerId === req.user.id
    const isAdmin = league.members.some(m => m.userId === req.user.id && m.role === 'OWNER')
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: { message: 'Only the commissioner can reset matchups' } })
    }

    const result = await prisma.matchup.deleteMany({ where: { leagueId: req.params.id } })

    res.json({ message: `Deleted ${result.count} matchups` })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/activity - Get league activity feed
router.get('/:id/activity', authenticate, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { userId: true, joinedAt: true, user: { select: { id: true, name: true, avatar: true } } } },
        teams: { select: { id: true, name: true, userId: true, user: { select: { name: true } } } },
      },
    })

    if (!league) {
      return res.status(404).json({ error: { message: 'League not found' } })
    }

    const memberIds = league.members.map(m => m.userId)

    // Fetch recent trades for this league
    const trades = await prisma.trade.findMany({
      where: { leagueId: req.params.id },
      include: {
        initiator: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    })

    // Resolve player names for trades
    const allPlayerIds = new Set()
    for (const trade of trades) {
      const sIds = Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []
      const rIds = Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []
      sIds.forEach(id => allPlayerIds.add(id))
      rIds.forEach(id => allPlayerIds.add(id))
    }
    const players = allPlayerIds.size > 0
      ? await prisma.player.findMany({ where: { id: { in: Array.from(allPlayerIds) } }, select: { id: true, name: true } })
      : []
    const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]))

    // Build activity items
    const activity = []

    // Trade activity
    for (const trade of trades) {
      const senderNames = (Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []).map(id => playerMap[id] || 'Unknown')
      const receiverNames = (Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []).map(id => playerMap[id] || 'Unknown')

      if (trade.status === 'ACCEPTED') {
        activity.push({
          id: `trade-${trade.id}`,
          type: 'trade',
          user: { name: trade.initiator.name },
          description: `traded ${senderNames.join(', ')} for ${receiverNames.join(', ')} with ${trade.receiver.name}`,
          timestamp: trade.updatedAt || trade.createdAt,
          league: league.name,
          players: [...senderNames, ...receiverNames],
        })
      } else if (trade.status === 'PENDING') {
        activity.push({
          id: `trade-prop-${trade.id}`,
          type: 'trade',
          user: { name: trade.initiator.name },
          description: `proposed a trade to ${trade.receiver.name}`,
          timestamp: trade.createdAt,
          league: league.name,
          players: [...senderNames, ...receiverNames],
        })
      } else if (trade.status === 'REJECTED') {
        activity.push({
          id: `trade-rej-${trade.id}`,
          type: 'trade',
          user: { name: trade.receiver.name },
          description: `rejected a trade from ${trade.initiator.name}`,
          timestamp: trade.updatedAt || trade.createdAt,
          league: league.name,
          players: [],
        })
      }
    }

    // Member joins
    for (const member of league.members) {
      activity.push({
        id: `join-${member.userId}`,
        type: 'join',
        user: { name: member.user.name },
        description: `joined the league`,
        timestamp: member.joinedAt,
        league: league.name,
        players: [],
      })
    }

    // Sort by timestamp descending and limit
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json({ activity: activity.slice(0, parseInt(limit)) })
  } catch (error) {
    next(error)
  }
})

// GET /api/leagues/:id/current-week - Get current fantasy week and lock status
router.get('/:id/current-week', authenticate, async (req, res, next) => {
  try {
    const { getCurrentFantasyWeek } = require('../services/fantasyWeekHelper')
    const weekInfo = await getCurrentFantasyWeek(req.params.id, prisma)

    if (!weekInfo) {
      return res.json({ currentWeek: null, isLocked: false, lockTime: null })
    }

    res.json({
      currentWeek: weekInfo.fantasyWeek,
      tournament: weekInfo.tournament,
      isLocked: weekInfo.isLocked,
      lockTime: weekInfo.lockTime,
    })
  } catch (error) {
    next(error)
  }
})

// ─── Season Recap with Auto-Generated Awards ────────────────────────────────
// GET /api/leagues/:id/recap
router.get('/:id/recap', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        teams: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        leagueSeasons: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            teamSeasons: { include: { team: { include: { user: { select: { id: true, name: true } } } } } },
          },
        },
      },
    })

    if (!league) return res.status(404).json({ error: { message: 'League not found' } })

    const leagueSeason = league.leagueSeasons[0]
    if (!leagueSeason) return res.json({ awards: [], standings: [], leagueName: league.name })

    const teamSeasons = leagueSeason.teamSeasons || []

    // Get all weekly results for this season
    const weeklyResults = await prisma.weeklyTeamResult.findMany({
      where: { leagueSeasonId: leagueSeason.id },
      orderBy: { weekNumber: 'asc' },
      include: { team: { include: { user: { select: { id: true, name: true } } } } },
    })

    // Get matchups for this league
    const matchups = await prisma.matchup.findMany({
      where: { leagueId: league.id, isComplete: true },
      orderBy: { week: 'asc' },
    })

    const awards = []
    const teamMap = {}
    for (const ts of teamSeasons) {
      teamMap[ts.teamId] = {
        name: ts.teamName || ts.team?.user?.name || 'Unknown',
        userId: ts.team?.userId,
      }
    }

    // 1. MVP — Most total points
    const mvp = [...teamSeasons].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))[0]
    if (mvp) {
      awards.push({ id: 'mvp', title: 'MVP', subtitle: 'Most Points Scored', icon: '🏆',
        winner: teamMap[mvp.teamId]?.name, value: `${mvp.totalPoints?.toFixed(1)} pts` })
    }

    // 2. Best Week — Highest single-week score
    const bestWeekTeam = [...teamSeasons].sort((a, b) => (b.bestWeekPoints || 0) - (a.bestWeekPoints || 0))[0]
    if (bestWeekTeam?.bestWeekPoints) {
      awards.push({ id: 'best_week', title: 'Best Week', subtitle: 'Highest Single-Week Score', icon: '🔥',
        winner: teamMap[bestWeekTeam.teamId]?.name, value: `${bestWeekTeam.bestWeekPoints.toFixed(1)} pts` })
    }

    // 3. Longest Win Streak
    const streakTeam = [...teamSeasons].sort((a, b) => (b.maxWinStreak || 0) - (a.maxWinStreak || 0))[0]
    if (streakTeam?.maxWinStreak > 1) {
      awards.push({ id: 'win_streak', title: 'On a Roll', subtitle: 'Longest Win Streak', icon: '🎯',
        winner: teamMap[streakTeam.teamId]?.name, value: `${streakTeam.maxWinStreak} wins` })
    }

    // 4. Worst Luck — Most points left on bench (highest cumulative pointsLeftOnBench)
    const benchByTeam = {}
    for (const wr of weeklyResults) {
      if (!benchByTeam[wr.teamId]) benchByTeam[wr.teamId] = 0
      benchByTeam[wr.teamId] += wr.pointsLeftOnBench || 0
    }
    const worstLuck = Object.entries(benchByTeam).sort((a, b) => b[1] - a[1])[0]
    if (worstLuck && worstLuck[1] > 0) {
      awards.push({ id: 'worst_luck', title: 'Worst Luck', subtitle: 'Most Points Left on Bench', icon: '😤',
        winner: teamMap[worstLuck[0]]?.name, value: `${worstLuck[1].toFixed(1)} pts wasted` })
    }

    // 5. Biggest Blowout — Largest margin of victory in a single matchup
    let biggestBlowout = { margin: 0 }
    for (const m of matchups) {
      if (m.homeScore != null && m.awayScore != null) {
        const margin = Math.abs(m.homeScore - m.awayScore)
        if (margin > biggestBlowout.margin) {
          const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId
          biggestBlowout = { margin, winnerId, week: m.week, score: `${Math.max(m.homeScore, m.awayScore).toFixed(1)}-${Math.min(m.homeScore, m.awayScore).toFixed(1)}` }
        }
      }
    }
    if (biggestBlowout.margin > 0) {
      awards.push({ id: 'blowout', title: 'Biggest Blowout', subtitle: 'Largest Margin of Victory', icon: '💪',
        winner: teamMap[biggestBlowout.winnerId]?.name, value: `${biggestBlowout.score} (Week ${biggestBlowout.week})` })
    }

    // 6. Closest Matchup — Smallest margin
    let closestMatchup = { margin: Infinity }
    for (const m of matchups) {
      if (m.homeScore != null && m.awayScore != null && m.homeScore !== m.awayScore) {
        const margin = Math.abs(m.homeScore - m.awayScore)
        if (margin < closestMatchup.margin) {
          closestMatchup = { margin, week: m.week, score: `${Math.max(m.homeScore, m.awayScore).toFixed(1)}-${Math.min(m.homeScore, m.awayScore).toFixed(1)}` }
        }
      }
    }
    if (closestMatchup.margin < Infinity) {
      awards.push({ id: 'closest', title: 'Photo Finish', subtitle: 'Closest Matchup', icon: '📸',
        winner: `Week ${closestMatchup.week}`, value: closestMatchup.score })
    }

    // 7. Most Consistent — Lowest standard deviation in weekly scores
    const weeklyByTeam = {}
    for (const wr of weeklyResults) {
      if (!weeklyByTeam[wr.teamId]) weeklyByTeam[wr.teamId] = []
      weeklyByTeam[wr.teamId].push(wr.totalPoints || 0)
    }
    let mostConsistent = null
    let lowestStdDev = Infinity
    for (const [teamId, scores] of Object.entries(weeklyByTeam)) {
      if (scores.length < 3) continue
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
      const stdDev = Math.sqrt(variance)
      if (stdDev < lowestStdDev) {
        lowestStdDev = stdDev
        mostConsistent = teamId
      }
    }
    if (mostConsistent) {
      awards.push({ id: 'consistent', title: 'Mr. Consistent', subtitle: 'Most Predictable Scorer', icon: '📊',
        winner: teamMap[mostConsistent]?.name, value: `±${lowestStdDev.toFixed(1)} pts/week` })
    }

    // 8. Champion
    const champion = teamSeasons.find(ts => ts.isChampion)
    if (champion) {
      awards.unshift({ id: 'champion', title: 'Champion', subtitle: 'Season Champion', icon: '👑',
        winner: teamMap[champion.teamId]?.name, value: `${champion.wins}-${champion.losses}${champion.ties ? `-${champion.ties}` : ''}` })
    }

    // Build final standings
    const standings = [...teamSeasons]
      .sort((a, b) => (a.finalRank || 99) - (b.finalRank || 99) || (b.totalPoints || 0) - (a.totalPoints || 0))
      .map((ts, idx) => ({
        rank: ts.finalRank || idx + 1,
        name: teamMap[ts.teamId]?.name,
        userId: teamMap[ts.teamId]?.userId,
        wins: ts.wins,
        losses: ts.losses,
        ties: ts.ties,
        totalPoints: ts.totalPoints,
        isChampion: ts.isChampion,
        madePlayoffs: ts.madePlayoffs,
      }))

    res.json({
      leagueName: league.name,
      seasonYear: leagueSeason.season?.year,
      awards,
      standings,
    })
  } catch (error) {
    next(error)
  }
})

// ============ COMMISSIONER POSTS ============

// GET /api/leagues/:id/posts — List posts (pinned first, then by date desc)
router.get('/:id/posts', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember && !league.isPublic) return res.status(403).json({ error: { message: 'Not authorized' } })

    const posts = await prisma.leaguePost.findMany({
      where: { leagueId: req.params.id, isPublished: true },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reactions: { select: { id: true, userId: true, emoji: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: parseInt(limit),
      skip: parseInt(offset),
    })

    // Shape reaction data: grouped counts + user's own
    const shaped = posts.map(p => {
      const reactionMap = {}
      p.reactions.forEach(r => {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, userReacted: false }
        reactionMap[r.emoji].count++
        if (r.userId === req.user.id) reactionMap[r.emoji].userReacted = true
      })
      const { reactions, _count, ...rest } = p
      return { ...rest, reactions: reactionMap, commentCount: _count.comments }
    })

    res.json({ posts: shaped })
  } catch (error) { next(error) }
})

// POST /api/leagues/:id/posts — Create post (commissioner only)
router.post('/:id/posts', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) return res.status(403).json({ error: { message: 'Only the commissioner can create posts' } })

    const { title, content, category, isPinned, aiGenerated, coverImage, images, excerpt } = req.body
    if (!title || !content) return res.status(400).json({ error: { message: 'Title and content are required' } })

    // Auto-generate excerpt from HTML content if not provided
    const autoExcerpt = excerpt || content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)

    const post = await prisma.leaguePost.create({
      data: {
        leagueId: req.params.id,
        authorId: req.user.id,
        title,
        content,
        category: category || 'general',
        isPinned: !!isPinned,
        aiGenerated: !!aiGenerated,
        coverImage: coverImage || null,
        images: images || [],
        excerpt: autoExcerpt || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    })

    res.json({ post: { ...post, reactions: {}, commentCount: 0 } })
  } catch (error) { next(error) }
})

// PATCH /api/leagues/:id/posts/:postId — Edit post (commissioner only)
router.patch('/:id/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) return res.status(403).json({ error: { message: 'Only the commissioner can edit posts' } })

    const { title, content, category, isPinned, isPublished, coverImage, images, excerpt } = req.body
    const data = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) {
      data.content = content
      // Re-generate excerpt if content changed and no explicit excerpt provided
      if (excerpt === undefined) {
        data.excerpt = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)
      }
    }
    if (category !== undefined) data.category = category
    if (isPinned !== undefined) data.isPinned = isPinned
    if (isPublished !== undefined) data.isPublished = isPublished
    if (coverImage !== undefined) data.coverImage = coverImage || null
    if (images !== undefined) data.images = images
    if (excerpt !== undefined) data.excerpt = excerpt

    const post = await prisma.leaguePost.update({
      where: { id: req.params.postId },
      data,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reactions: { select: { id: true, userId: true, emoji: true } },
        _count: { select: { comments: true } },
      },
    })

    const reactionMap = {}
    post.reactions.forEach(r => {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, userReacted: false }
      reactionMap[r.emoji].count++
      if (r.userId === req.user.id) reactionMap[r.emoji].userReacted = true
    })
    const { reactions, _count, ...rest } = post
    res.json({ post: { ...rest, reactions: reactionMap, commentCount: _count.comments } })
  } catch (error) { next(error) }
})

// DELETE /api/leagues/:id/posts/:postId — Delete post (commissioner only)
router.delete('/:id/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) return res.status(403).json({ error: { message: 'Only the commissioner can delete posts' } })

    await prisma.leaguePost.delete({ where: { id: req.params.postId } })
    res.json({ success: true })
  } catch (error) { next(error) }
})

// POST /api/leagues/:id/posts/:postId/view — Record unique view
router.post('/:id/posts/:postId/view', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) return res.status(403).json({ error: { message: 'Not authorized' } })

    // Upsert — only increment viewCount if this is a new unique view
    const existing = await prisma.leaguePostView.findUnique({
      where: { postId_userId: { postId: req.params.postId, userId: req.user.id } },
    })
    if (!existing) {
      await prisma.$transaction([
        prisma.leaguePostView.create({
          data: { postId: req.params.postId, userId: req.user.id },
        }),
        prisma.leaguePost.update({
          where: { id: req.params.postId },
          data: { viewCount: { increment: 1 } },
        }),
      ])
    }
    const post = await prisma.leaguePost.findUnique({
      where: { id: req.params.postId },
      select: { viewCount: true },
    })
    res.json({ viewCount: post?.viewCount || 0 })
  } catch (error) { next(error) }
})

// POST /api/leagues/:id/posts/:postId/reactions — Toggle reaction
router.post('/:id/posts/:postId/reactions', authenticate, async (req, res, next) => {
  try {
    const { emoji } = req.body
    if (!emoji) return res.status(400).json({ error: { message: 'Emoji is required' } })

    // Check membership
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) return res.status(403).json({ error: { message: 'Not authorized' } })

    // Toggle: if exists, remove; if not, create
    const existing = await prisma.leaguePostReaction.findUnique({
      where: { postId_userId_emoji: { postId: req.params.postId, userId: req.user.id, emoji } },
    })

    if (existing) {
      await prisma.leaguePostReaction.delete({ where: { id: existing.id } })
      res.json({ toggled: 'removed', emoji })
    } else {
      await prisma.leaguePostReaction.create({
        data: { postId: req.params.postId, userId: req.user.id, emoji },
      })
      res.json({ toggled: 'added', emoji })
    }
  } catch (error) { next(error) }
})

// GET /api/leagues/:id/posts/:postId/comments — List comments
router.get('/:id/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember && !league.isPublic) return res.status(403).json({ error: { message: 'Not authorized' } })

    const comments = await prisma.leaguePostComment.findMany({
      where: { postId: req.params.postId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ comments })
  } catch (error) { next(error) }
})

// POST /api/leagues/:id/posts/:postId/comments — Add comment
router.post('/:id/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content || !content.trim()) return res.status(400).json({ error: { message: 'Content is required' } })

    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) return res.status(403).json({ error: { message: 'Not authorized' } })

    const comment = await prisma.leaguePostComment.create({
      data: { postId: req.params.postId, userId: req.user.id, content: content.trim() },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })

    res.json({ comment })
  } catch (error) { next(error) }
})

// DELETE /api/leagues/:id/posts/:postId/comments/:commentId — Delete comment (own or commissioner)
router.delete('/:id/posts/:postId/comments/:commentId', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })

    const comment = await prisma.leaguePostComment.findUnique({ where: { id: req.params.commentId } })
    if (!comment) return res.status(404).json({ error: { message: 'Comment not found' } })

    // Allow own comment deletion or commissioner deletion
    if (comment.userId !== req.user.id && league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized to delete this comment' } })
    }

    await prisma.leaguePostComment.delete({ where: { id: req.params.commentId } })
    res.json({ success: true })
  } catch (error) { next(error) }
})

// POST /api/leagues/:id/posts/ai-generate — AI-assisted draft generation (commissioner only)
router.post('/:id/posts/ai-generate', authenticate, async (req, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { members: true } } },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) return res.status(403).json({ error: { message: 'Only the commissioner can generate posts' } })

    const { category, topic, tone } = req.body
    if (!topic) return res.status(400).json({ error: { message: 'Topic is required' } })

    let claudeService
    try { claudeService = require('../services/claudeService') } catch (e) {
      return res.status(501).json({ error: { message: 'AI service not available' } })
    }

    const systemPrompt = `You are a league commissioner's writing assistant for a fantasy sports league called "${league.name}".
The league plays ${league.sport || 'fantasy sports'} and has ${league._count.members} members.
Generate a compelling league post. Write in the commissioner's voice — authoritative but fun.
Match the requested tone. Keep it concise (2-4 paragraphs max).
Return JSON: { "title": "post title", "content": "HTML content with <p>, <strong>, <em>, <ul>/<li> tags" }`

    const userPrompt = `Category: ${category || 'general'}
Topic: ${topic}
Tone: ${tone || 'professional'}
Write a league post about this topic.`

    const result = await claudeService.generateJsonCompletion(systemPrompt, userPrompt, {
      feature: 'commissionerNotes',
      maxTokens: 1024,
    })

    if (!result || !result.data) {
      return res.json({ draft: { title: '', content: '' }, aiDisabled: true })
    }

    res.json({ draft: { title: result.data.title || '', content: result.data.content || '' } })
  } catch (error) { next(error) }
})

module.exports = router
