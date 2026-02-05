const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/drafts/:id - Get draft details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: {
        league: {
          include: {
            teams: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            }
          }
        },
        picks: {
          include: {
            player: true,
            team: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            }
          },
          orderBy: { pickNumber: 'asc' }
        },
        draftOrder: {
          orderBy: { position: 'asc' }
        }
      }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    res.json({ draft })
  } catch (error) {
    next(error)
  }
})

// POST /api/drafts/:id/start - Start the draft
router.post('/:id/start', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: {
        league: {
          include: {
            teams: true
          }
        }
      }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    // Check if user is league owner
    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only league owner can start draft' } })
    }

    if (draft.status !== 'SCHEDULED') {
      return res.status(400).json({ error: { message: 'Draft already started or completed' } })
    }

    // Generate random draft order
    const teams = draft.league.teams
    const shuffled = teams.sort(() => Math.random() - 0.5)

    await prisma.$transaction([
      // Create draft order
      ...shuffled.map((team, index) =>
        prisma.draftOrder.create({
          data: {
            draftId: draft.id,
            teamId: team.id,
            position: index + 1
          }
        })
      ),
      // Update draft status
      prisma.draft.update({
        where: { id: draft.id },
        data: {
          status: 'IN_PROGRESS',
          startTime: new Date()
        }
      }),
      // Update league status
      prisma.league.update({
        where: { id: draft.leagueId },
        data: { status: 'DRAFTING' }
      })
    ])

    // Emit draft started event
    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-started', { draftId: draft.id })

    res.json({ message: 'Draft started' })
  } catch (error) {
    next(error)
  }
})

// POST /api/drafts/:id/pick - Make a draft pick
router.post('/:id/pick', authenticate, async (req, res, next) => {
  try {
    const { playerId, amount } = req.body // amount is for auction drafts

    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: {
        league: true,
        draftOrder: {
          orderBy: { position: 'asc' }
        },
        picks: true
      }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    if (draft.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: { message: 'Draft is not in progress' } })
    }

    // Determine whose pick it is (snake draft logic)
    const totalTeams = draft.draftOrder.length
    const currentPickInRound = ((draft.currentPick - 1) % totalTeams)
    const isEvenRound = draft.currentRound % 2 === 0

    let currentPosition
    if (isEvenRound) {
      // Reverse order for even rounds (snake)
      currentPosition = totalTeams - currentPickInRound
    } else {
      currentPosition = currentPickInRound + 1
    }

    const currentDrafter = draft.draftOrder.find(o => o.position === currentPosition)

    // Get the team for the current user
    const userTeam = await prisma.team.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId: draft.leagueId
        }
      }
    })

    if (!userTeam || currentDrafter.teamId !== userTeam.id) {
      return res.status(403).json({ error: { message: 'Not your turn to pick' } })
    }

    // Check if player already drafted
    const alreadyDrafted = draft.picks.some(p => p.playerId === playerId)
    if (alreadyDrafted) {
      return res.status(400).json({ error: { message: 'Player already drafted' } })
    }

    // Create the pick
    const pick = await prisma.draftPick.create({
      data: {
        draftId: draft.id,
        teamId: userTeam.id,
        playerId,
        pickNumber: draft.currentPick,
        round: draft.currentRound,
        amount: amount || null
      },
      include: {
        player: true,
        team: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    })

    // Add player to team roster
    await prisma.rosterEntry.create({
      data: {
        teamId: userTeam.id,
        playerId,
        position: 'ACTIVE'
      }
    })

    // Update draft state
    const newPickNumber = draft.currentPick + 1
    const newRound = Math.ceil(newPickNumber / totalTeams)
    const rosterSize = draft.league.settings?.rosterSize || 6
    const isComplete = newRound > rosterSize

    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        currentPick: newPickNumber,
        currentRound: newRound,
        ...(isComplete && {
          status: 'COMPLETED',
          endTime: new Date()
        })
      }
    })

    if (isComplete) {
      await prisma.league.update({
        where: { id: draft.leagueId },
        data: { status: 'ACTIVE' }
      })
    }

    // Emit pick event
    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-pick', {
      pick,
      nextPick: newPickNumber,
      nextRound: newRound,
      isComplete
    })

    res.json({ pick, isComplete })
  } catch (error) {
    next(error)
  }
})

module.exports = router
