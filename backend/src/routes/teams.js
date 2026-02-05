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

// PATCH /api/teams/:id - Update team (name, etc.)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body

    const team = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    if (team.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    const updatedTeam = await prisma.team.update({
      where: { id: req.params.id },
      data: { name }
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

module.exports = router
