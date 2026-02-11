const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { recordTransaction } = require('../services/fantasyTracker')
const { notifyLeague } = require('../services/notificationService')
const { getCurrentFantasyWeek } = require('../services/fantasyWeekHelper')
const { validatePositionLimits } = require('../services/positionLimitValidator')
const { recordEvent: recordOpinionEvent } = require('../services/opinionTimelineService')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/teams/:id - Get team details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        league: {
          select: { id: true, name: true, format: true, status: true }
        },
        roster: {
          where: { isActive: true },
          include: {
            player: true
          }
        }
      }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    res.json({ team })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/teams/:id - Update team (name, avatar, etc.)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, avatar, avatarUrl } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Build update data - only include fields that were provided
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (avatar !== undefined) updateData.avatar = avatar
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

    const updatedTeam = await prisma.team.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        league: {
          select: { id: true, name: true }
        }
      }
    })

    res.json({ team: updatedTeam })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/roster/add - Add player to roster
router.post('/:id/roster/add', authenticate, async (req, res, next) => {
  try {
    const { playerId } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        league: true,
        roster: true
      }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Block pickups until draft is complete
    const latestDraft = await prisma.draft.findFirst({
      where: { leagueId: team.leagueId },
      orderBy: { createdAt: 'desc' },
      select: { status: true }
    })
    if (latestDraft && latestDraft.status !== 'COMPLETED') {
      return res.status(403).json({ error: { message: 'Free agent pickups are locked until the draft is complete' } })
    }
    if (!latestDraft && team.league.status === 'DRAFT_PENDING') {
      return res.status(403).json({ error: { message: 'Free agent pickups are locked until the draft is complete' } })
    }

    // Block instant adds when waivers are active
    const waiverType = team.league.settings?.waiverType
    if (waiverType && waiverType !== 'none') {
      return res.status(400).json({
        error: { message: 'This league uses waivers. Submit a waiver claim instead.' },
        waiverType,
      })
    }

    // Check if player is already on active roster
    const activeRoster = team.roster.filter(r => r.isActive)
    const existingEntry = activeRoster.find(r => r.playerId === playerId)
    if (existingEntry) {
      return res.status(400).json({ error: { message: 'Player already on roster' } })
    }

    // Check roster size limit (only count active entries)
    const maxRosterSize = team.league.settings?.rosterSize || 6
    if (activeRoster.length >= maxRosterSize) {
      return res.status(400).json({ error: { message: 'Roster is full' } })
    }

    // Check if player is available (not on another active roster in this league)
    const playerOnOtherTeam = await prisma.rosterEntry.findFirst({
      where: {
        playerId,
        isActive: true,
        team: { leagueId: team.leagueId }
      }
    })

    if (playerOnOtherTeam) {
      return res.status(400).json({ error: { message: 'Player is on another team' } })
    }

    // Check position limits (NFL leagues)
    const posCheck = await validatePositionLimits(req.params.id, playerId, team.leagueId, prisma)
    if (!posCheck.valid) {
      return res.status(400).json({
        error: { message: `${posCheck.position} limit reached (${posCheck.current}/${posCheck.limit})` },
      })
    }

    const rosterEntry = await prisma.rosterEntry.create({
      data: {
        teamId: req.params.id,
        playerId,
        position: 'BENCH',
        rosterStatus: 'BENCH',
        acquiredVia: 'FREE_AGENT'
      },
      include: {
        player: true
      }
    })

    // Log transaction
    await recordTransaction({
      type: 'FREE_AGENT_ADD',
      teamId: req.params.id,
      playerId,
      playerName: rosterEntry.player.name,
      leagueId: team.leagueId,
    }, prisma).catch(err => console.error('Transaction log failed:', err.message))

    // Notify league about the pickup (excluding the actor)
    try {
      notifyLeague(team.leagueId, {
        type: 'PLAYER_ADDED',
        title: 'Player Added',
        message: `${team.name} added ${rosterEntry.player.name}`,
        actionUrl: `/leagues/${team.leagueId}/waivers`,
        data: { playerId, playerName: rosterEntry.player.name, teamId: team.id, leagueId: team.leagueId },
      }, [req.user.id], prisma).catch(err => console.error('Player added notification failed:', err.message))
    } catch (err) { console.error('Player added notification failed:', err.message) }

    res.status(201).json({ rosterEntry })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/roster/drop - Drop player from roster (soft-delete)
router.post('/:id/roster/drop', authenticate, async (req, res, next) => {
  try {
    const { playerId } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Soft-delete: mark as inactive with timestamp
    const entry = await prisma.rosterEntry.update({
      where: {
        teamId_playerId: {
          teamId: req.params.id,
          playerId
        }
      },
      data: {
        isActive: false,
        droppedAt: new Date(),
      },
      include: { player: { select: { name: true } } }
    })

    // Log transaction
    await recordTransaction({
      type: 'FREE_AGENT_DROP',
      teamId: req.params.id,
      playerId,
      playerName: entry.player.name,
      leagueId: team.leagueId,
    }, prisma).catch(err => console.error('Transaction log failed:', err.message))

    // Notify league about the drop (excluding the actor)
    try {
      notifyLeague(team.leagueId, {
        type: 'PLAYER_DROPPED',
        title: 'Player Dropped',
        message: `${team.name} dropped ${entry.player.name}`,
        actionUrl: `/leagues/${team.leagueId}/waivers`,
        data: { playerId, playerName: entry.player.name, teamId: team.id, leagueId: team.leagueId },
      }, [req.user.id], prisma).catch(err => console.error('Player dropped notification failed:', err.message))
    } catch (err) { console.error('Player dropped notification failed:', err.message) }

    res.json({ message: 'Player dropped' })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/teams/:id/roster/:playerId - Update player position (active/bench)
router.patch('/:id/roster/:playerId', authenticate, async (req, res, next) => {
  try {
    const { position } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    const rosterEntry = await prisma.rosterEntry.update({
      where: {
        teamId_playerId: {
          teamId: req.params.id,
          playerId: req.params.playerId
        }
      },
      data: { position, rosterStatus: position },
      include: {
        player: true
      }
    })

    res.json({ rosterEntry })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/lineup - Batch set active/bench/IR positions
router.post('/:id/lineup', authenticate, async (req, res, next) => {
  try {
    const { activePlayerIds, irPlayerIds = [] } = req.body

    if (!Array.isArray(activePlayerIds)) {
      return res.status(400).json({ error: { message: 'activePlayerIds must be an array' } })
    }

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { roster: { where: { isActive: true } }, league: { include: { sportRef: { select: { slug: true } } } } }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Check lineup lock
    try {
      const weekInfo = await getCurrentFantasyWeek(team.leagueId, prisma)
      if (weekInfo?.isLocked) {
        const tournamentName = weekInfo.tournament?.name || weekInfo.fantasyWeek?.name || 'the tournament'
        return res.status(403).json({
          error: { message: `Lineups are locked — ${tournamentName} has started` },
          lockInfo: weekInfo,
        })
      }
    } catch (lockErr) {
      // Don't block lineup changes if the lock check fails (e.g. no seasons set up yet)
      console.error('Lineup lock check failed:', lockErr.message)
    }

    // Check max active from league settings
    const maxActive = team.league.settings?.maxActiveLineup || 4
    if (activePlayerIds.length > maxActive) {
      return res.status(400).json({ error: { message: `Maximum ${maxActive} active players allowed` } })
    }

    // Check IR slots
    const maxIrSlots = team.league.settings?.irSlots || 0
    if (irPlayerIds.length > maxIrSlots) {
      return res.status(400).json({ error: { message: `Maximum ${maxIrSlots} IR slots allowed` } })
    }

    // Verify no overlap between active and IR
    const overlap = activePlayerIds.filter(id => irPlayerIds.includes(id))
    if (overlap.length > 0) {
      return res.status(400).json({ error: { message: 'A player cannot be both active and on IR' } })
    }

    // Verify all player IDs are on this team's active roster
    const rosterPlayerIds = team.roster.map(r => r.playerId)
    const allIds = [...activePlayerIds, ...irPlayerIds]
    const invalidIds = allIds.filter(id => !rosterPlayerIds.includes(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: { message: 'Some players are not on your roster' } })
    }

    // Batch update in transaction (write both position + rosterStatus)
    const previousStatuses = new Map(team.roster.map(e => [e.playerId, e.position]))
    await prisma.$transaction(
      team.roster.map(entry => {
        let status = 'BENCH'
        if (activePlayerIds.includes(entry.playerId)) status = 'ACTIVE'
        else if (irPlayerIds.includes(entry.playerId)) status = 'IR'
        return prisma.rosterEntry.update({
          where: { id: entry.id },
          data: { position: status, rosterStatus: status }
        })
      })
    )

    // Fire-and-forget: opinion timeline for lineup changes
    const lineupOpinionLog = async () => {
      const sport = team.league?.sportRef?.slug || team.league?.sport?.slug || 'unknown'
      for (const pid of activePlayerIds) {
        if (previousStatuses.get(pid) !== 'ACTIVE') {
          recordOpinionEvent(req.user.id, pid, sport, 'LINEUP_START', {}, null, 'RosterEntry').catch(() => {})
        }
      }
      for (const [pid, prevStatus] of previousStatuses) {
        if (prevStatus === 'ACTIVE' && !activePlayerIds.includes(pid)) {
          recordOpinionEvent(req.user.id, pid, sport, 'LINEUP_BENCH', {}, null, 'RosterEntry').catch(() => {})
        }
      }
    }
    lineupOpinionLog().catch(() => {})

    // Return updated roster
    const updatedTeam = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { roster: { where: { isActive: true }, include: { player: true } } }
    })

    res.json({ roster: updatedTeam.roster })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/keeper/designate - Designate a player as keeper
router.post('/:id/keeper/designate', authenticate, async (req, res, next) => {
  try {
    const { playerId } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { league: true, roster: { where: { isActive: true } } },
    })

    if (!team) return res.status(404).json({ error: { message: 'Team not found' } })
    if (team.userId !== req.user.id) return res.status(403).json({ error: { message: 'Not authorized' } })

    const keeperSettings = team.league.settings?.keeperSettings
    if (!keeperSettings?.enabled) {
      return res.status(400).json({ error: { message: 'Keeper league is not enabled' } })
    }

    // Check max keepers
    const currentKeepers = team.roster.filter(r => r.isKeeper)
    const maxKeepers = keeperSettings.maxKeepers || 3
    if (currentKeepers.length >= maxKeepers) {
      return res.status(400).json({ error: { message: `Maximum ${maxKeepers} keepers allowed (${currentKeepers.length} already designated)` } })
    }

    // Find the roster entry
    const entry = team.roster.find(r => r.playerId === playerId)
    if (!entry) {
      return res.status(400).json({ error: { message: 'Player not on active roster' } })
    }
    if (entry.isKeeper) {
      return res.status(400).json({ error: { message: 'Player is already a keeper' } })
    }

    // Compute keeper cost based on cost model
    let keeperCost = null
    let keeperYearsKept = 1
    if (keeperSettings.costModel === 'round-penalty') {
      // Find original draft pick
      const draftPick = await prisma.draftPick.findFirst({
        where: { playerId, teamId: req.params.id },
        orderBy: { createdAt: 'desc' },
      })
      keeperCost = draftPick ? Math.max(1, (draftPick.round || 1) - 1) : 1
    } else if (keeperSettings.costModel === 'auction-cost') {
      const draftPick = await prisma.draftPick.findFirst({
        where: { playerId, teamId: req.params.id },
        orderBy: { createdAt: 'desc' },
      })
      keeperCost = draftPick?.amount || 0
    } else if (keeperSettings.costModel === 'auction-escalator') {
      const multiplier = keeperSettings.escalatorMultiplier || 1.5
      const floor = keeperSettings.escalatorFloor || 10
      // If already kept (re-designating after a season rollover), use previous keeperCost as base
      let baseCost
      if (entry.keeperCost != null && entry.keeperYearsKept > 0) {
        baseCost = entry.keeperCost
        keeperYearsKept = entry.keeperYearsKept + 1
      } else {
        // First-time keeper: use original draft pick amount
        const draftPick = await prisma.draftPick.findFirst({
          where: { playerId, teamId: req.params.id },
          orderBy: { createdAt: 'desc' },
        })
        baseCost = draftPick?.amount || 1
      }
      keeperCost = Math.ceil(Math.max(baseCost * multiplier, baseCost + floor))
    }

    const updated = await prisma.rosterEntry.update({
      where: { id: entry.id },
      data: {
        isKeeper: true,
        keeperCost,
        keeperYear: new Date().getFullYear(),
        keptAt: new Date(),
        keeperYearsKept,
      },
      include: { player: { select: { id: true, name: true } } },
    })

    res.json({ rosterEntry: updated })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/keeper/undesignate - Remove keeper designation
router.post('/:id/keeper/undesignate', authenticate, async (req, res, next) => {
  try {
    const { playerId } = req.body

    const team = await prisma.team.findUnique({ where: { id: req.params.id } })
    if (!team) return res.status(404).json({ error: { message: 'Team not found' } })
    if (team.userId !== req.user.id) return res.status(403).json({ error: { message: 'Not authorized' } })

    const entry = await prisma.rosterEntry.findFirst({
      where: { teamId: req.params.id, playerId, isActive: true },
    })
    if (!entry) return res.status(400).json({ error: { message: 'Player not on active roster' } })
    if (!entry.isKeeper) return res.status(400).json({ error: { message: 'Player is not a keeper' } })

    const updated = await prisma.rosterEntry.update({
      where: { id: entry.id },
      data: { isKeeper: false, keeperCost: null, keeperYear: null, keptAt: null, keeperYearsKept: 0 },
      include: { player: { select: { id: true, name: true } } },
    })

    res.json({ rosterEntry: updated })
  } catch (error) {
    next(error)
  }
})

// GET /api/teams/:id/keepers - Get designated keepers
router.get('/:id/keepers', authenticate, async (req, res, next) => {
  try {
    const keepers = await prisma.rosterEntry.findMany({
      where: { teamId: req.params.id, isActive: true, isKeeper: true },
      include: { player: true },
    })

    res.json({ keepers })
  } catch (error) {
    next(error)
  }
})

module.exports = router
