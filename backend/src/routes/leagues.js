const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { calculateLeagueStandings, calculateTournamentScoring, calculateLiveTournamentScoring } = require('../services/scoringService')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/leagues - Get user's leagues
router.get('/', authenticate, async (req, res, next) => {
  try {
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
          select: { id: true, status: true, scheduledFor: true, draftType: true }
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

    // Combine settings
    const combinedSettings = {
      ...(settings || {}),
      ...(formatSettings || {}),
      rosterSize: rosterSize || 6,
      scoringType: scoringType || 'standard',
      budget: budget || null,
    }

    const league = await prisma.league.create({
      data: {
        name,
        sport: sport || 'GOLF',
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

    // Current week = latest incomplete, or most recent completed
    let currentWeek = schedule.find(w => w.matchups.some(m => !m.completed))
    if (!currentWeek && schedule.length > 0) {
      currentWeek = schedule[schedule.length - 1]
    }

    // Build standings from completed matchups
    const standings = {}
    league.teams.forEach(t => {
      standings[t.userId] = {
        userId: t.userId,
        teamId: t.id,
        name: t.user.name,
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

    // Sort standings by wins, then pointsFor
    const sortedStandings = Object.values(standings).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.ties !== a.ties) return b.ties - a.ties
      return b.pointsFor - a.pointsFor
    })

    res.json({
      schedule,
      currentWeek,
      standings: sortedStandings,
      playoffs: null, // TODO: implement playoff bracket
    })
  } catch (error) {
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

module.exports = router
