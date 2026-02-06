const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

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

    // Check if player is already on roster
    const existingEntry = team.roster.find(r => r.playerId === playerId)
    if (existingEntry) {
      return res.status(400).json({ error: { message: 'Player already on roster' } })
    }

    // Check roster size limit
    const maxRosterSize = team.league.settings?.rosterSize || 6
    if (team.roster.length >= maxRosterSize) {
      return res.status(400).json({ error: { message: 'Roster is full' } })
    }

    // Check if player is available (not on another team in this league)
    const playerOnOtherTeam = await prisma.rosterEntry.findFirst({
      where: {
        playerId,
        team: { leagueId: team.leagueId }
      }
    })

    if (playerOnOtherTeam) {
      return res.status(400).json({ error: { message: 'Player is on another team' } })
    }

    const rosterEntry = await prisma.rosterEntry.create({
      data: {
        teamId: req.params.id,
        playerId,
        position: 'BENCH'
      },
      include: {
        player: true
      }
    })

    res.status(201).json({ rosterEntry })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/roster/drop - Drop player from roster
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

    await prisma.rosterEntry.delete({
      where: {
        teamId_playerId: {
          teamId: req.params.id,
          playerId
        }
      }
    })

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
      data: { position },
      include: {
        player: true
      }
    })

    res.json({ rosterEntry })
  } catch (error) {
    next(error)
  }
})

// POST /api/teams/:id/lineup - Batch set active/bench positions
router.post('/:id/lineup', authenticate, async (req, res, next) => {
  try {
    const { activePlayerIds } = req.body

    if (!Array.isArray(activePlayerIds)) {
      return res.status(400).json({ error: { message: 'activePlayerIds must be an array' } })
    }

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { roster: true, league: true }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    // Check max active from league settings
    const maxActive = team.league.settings?.maxActiveLineup || 4
    if (activePlayerIds.length > maxActive) {
      return res.status(400).json({ error: { message: `Maximum ${maxActive} active players allowed` } })
    }

    // Verify all player IDs are on this team's roster
    const rosterPlayerIds = team.roster.map(r => r.playerId)
    const invalidIds = activePlayerIds.filter(id => !rosterPlayerIds.includes(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: { message: 'Some players are not on your roster' } })
    }

    // Batch update in transaction
    await prisma.$transaction(
      team.roster.map(entry =>
        prisma.rosterEntry.update({
          where: { id: entry.id },
          data: { position: activePlayerIds.includes(entry.playerId) ? 'ACTIVE' : 'BENCH' }
        })
      )
    )

    // Return updated roster
    const updatedTeam = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { roster: { include: { player: true } } }
    })

    res.json({ roster: updatedTeam.roster })
  } catch (error) {
    next(error)
  }
})

module.exports = router
