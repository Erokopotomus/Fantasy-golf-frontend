const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const {
  scheduleAutoPick,
  clearAutoPick,
  initAuctionState,
  getAuctionState,
  clearAuctionState,
  startNomination,
  placeBid: placeAuctionBid
} = require('../services/draftTimer')
const { recordTransaction } = require('../services/fantasyTracker')
const { initializeLeagueSeason } = require('../services/seasonSetup')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/drafts/league/:leagueId - Get the latest draft for a league
router.get('/league/:leagueId', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findFirst({
      where: { leagueId: req.params.leagueId },
      orderBy: { createdAt: 'desc' },
      include: {
        league: {
          include: {
            teams: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            },
            owner: {
              select: { id: true, name: true }
            }
          }
        },
        picks: {
          include: {
            player: {
              select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
            },
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
      return res.status(404).json({ error: { message: 'No draft found for this league' } })
    }

    // Calculate pickDeadline
    const pickDeadline = getPickDeadline(draft)

    // Find the user's team in this league
    const userTeam = draft.league.teams.find(t => t.userId === req.user.id)

    res.json({
      draft: {
        ...draft,
        pickDeadline,
        userTeamId: userTeam?.id || null
      }
    })
  } catch (error) {
    next(error)
  }
})

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
            },
            owner: {
              select: { id: true, name: true }
            }
          }
        },
        picks: {
          include: {
            player: {
              select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
            },
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

    const pickDeadline = getPickDeadline(draft)
    const userTeam = draft.league.teams.find(t => t.userId === req.user.id)

    res.json({
      draft: {
        ...draft,
        pickDeadline,
        userTeamId: userTeam?.id || null
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/drafts/:id/players - Get available players for drafting
router.get('/:id/players', authenticate, async (req, res, next) => {
  try {
    const { search, limit = 100, offset = 0, sortBy = 'owgrRank', sortOrder = 'asc' } = req.query

    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        picks: { select: { playerId: true } }
      }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    const draftedPlayerIds = draft.picks.map(p => p.playerId)

    const where = {
      isActive: true,
      ...(draftedPlayerIds.length > 0 && { id: { notIn: draftedPlayerIds } }),
      ...(search && { name: { contains: search, mode: 'insensitive' } })
    }

    // Handle null-safe sorting for owgrRank
    const orderBy = sortBy === 'owgrRank'
      ? [{ owgrRank: { sort: sortOrder, nulls: 'last' } }]
      : [{ [sortBy]: sortOrder }]

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          country: true,
          owgrRank: true,
          fedexRank: true,
          headshotUrl: true,
          primaryTour: true,
          wins: true,
          top10s: true,
          earnings: true,
          sgTotal: true,
          events: true,
        }
      }),
      prisma.player.count({ where })
    ])

    res.json({
      players,
      draftedPlayerIds,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + players.length < total
      }
    })
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

    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only league owner can start draft' } })
    }

    if (draft.status !== 'SCHEDULED') {
      return res.status(400).json({ error: { message: 'Draft already started or completed' } })
    }

    // Generate random draft order
    const teams = [...draft.league.teams]
    const shuffled = teams.sort(() => Math.random() - 0.5)

    const now = new Date()

    await prisma.$transaction([
      ...shuffled.map((team, index) =>
        prisma.draftOrder.create({
          data: {
            draftId: draft.id,
            teamId: team.id,
            position: index + 1
          }
        })
      ),
      prisma.draft.update({
        where: { id: draft.id },
        data: {
          status: 'IN_PROGRESS',
          startTime: now
        }
      }),
      prisma.league.update({
        where: { id: draft.leagueId },
        data: { status: 'DRAFTING' }
      })
    ])

    // Fetch updated draft to return
    const updatedDraft = await prisma.draft.findUnique({
      where: { id: draft.id },
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
        picks: { orderBy: { pickNumber: 'asc' } },
        draftOrder: { orderBy: { position: 'asc' } }
      }
    })

    const pickDeadline = getPickDeadline(updatedDraft)
    const userTeam = updatedDraft.league.teams.find(t => t.userId === req.user.id)

    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-started', {
      draftId: draft.id,
      draft: { ...updatedDraft, pickDeadline, userTeamId: null }
    })

    // Schedule server-side auto-pick timer (snake draft)
    if (updatedDraft.league.draftType !== 'AUCTION' && pickDeadline) {
      scheduleAutoPick(draft.id, pickDeadline, io)
    }

    // Initialize auction state if auction draft
    if (updatedDraft.league.draftType === 'AUCTION') {
      const budget = updatedDraft.league.settings?.budget || 200
      initAuctionState(draft.id, updatedDraft.draftOrder, budget)
      // Emit first nominator
      const aState = getAuctionState(draft.id)
      if (aState) {
        io.to(`draft-${draft.id}`).emit('auction-next-nominator', {
          nominatorTeamId: aState.nominationOrder[0],
          budgets: aState.budgets
        })
      }
    }

    res.json({
      draft: {
        ...updatedDraft,
        pickDeadline,
        userTeamId: userTeam?.id || null
      }
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/drafts/:id/pick - Make a draft pick
router.post('/:id/pick', authenticate, async (req, res, next) => {
  try {
    const { playerId, amount } = req.body

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

    if (draft.status === 'PAUSED') {
      return res.status(400).json({ error: { message: 'Draft is paused' } })
    }

    // Determine whose pick it is (snake draft logic)
    const totalTeams = draft.draftOrder.length
    const currentPickInRound = ((draft.currentPick - 1) % totalTeams)
    const isEvenRound = draft.currentRound % 2 === 0

    let currentPosition
    if (isEvenRound) {
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
        player: {
          select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
        },
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
        position: 'ACTIVE',
        rosterStatus: 'ACTIVE'
      }
    })

    // Update TeamBudget for auction drafts
    if (amount && draft.league.draftType === 'AUCTION') {
      try {
        const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
        if (currentSeason) {
          const leagueSeason = await prisma.leagueSeason.findFirst({
            where: { leagueId: draft.leagueId, seasonId: currentSeason.id },
          })
          if (leagueSeason) {
            const playerPos = await prisma.playerPosition.findFirst({
              where: { playerId, isPrimary: true },
              include: { position: { select: { abbr: true } } },
            })
            const posAbbr = playerPos?.position?.abbr || 'G'
            const totalBudget = draft.league.settings?.budget || 200

            // Read-modify-write for spentByPosition
            const existing = await prisma.teamBudget.findUnique({
              where: { teamId_leagueSeasonId: { teamId: userTeam.id, leagueSeasonId: leagueSeason.id } },
            })

            if (existing) {
              const sbp = existing.spentByPosition || {}
              sbp[posAbbr] = (sbp[posAbbr] || 0) + amount
              await prisma.teamBudget.update({
                where: { id: existing.id },
                data: {
                  spent: existing.spent + amount,
                  remaining: existing.remaining - amount,
                  spentByPosition: sbp,
                },
              })
            } else {
              await prisma.teamBudget.create({
                data: {
                  teamId: userTeam.id,
                  leagueSeasonId: leagueSeason.id,
                  totalBudget,
                  spent: amount,
                  remaining: totalBudget - amount,
                  spentByPosition: { [posAbbr]: amount },
                },
              })
            }
          }
        }
      } catch (budgetErr) {
        console.error('TeamBudget update failed:', budgetErr.message)
      }
    }

    // Log draft pick transaction
    recordTransaction({
      type: 'DRAFT_PICK',
      teamId: userTeam.id,
      playerId,
      playerName: pick.player.name,
      leagueId: draft.leagueId,
      draftRound: draft.currentRound,
      draftPickNumber: draft.currentPick,
      auctionAmount: amount || null,
    }, prisma).catch(err => console.error('Draft transaction log failed:', err.message))

    // Update draft state
    const newPickNumber = draft.currentPick + 1
    const newRound = Math.ceil(newPickNumber / totalTeams)
    const rosterSize = draft.totalRounds || draft.league.settings?.rosterSize || 6
    const isComplete = newRound > rosterSize

    const updatedDraft = await prisma.draft.update({
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

      // Fire-and-forget: initialize season records (LeagueSeason, TeamSeason, Matchups, Budgets)
      initializeLeagueSeason(draft.leagueId, prisma)
        .catch(err => console.error('[drafts] Season setup failed:', err.message))
    }

    // Calculate new pick deadline
    const pickDeadline = isComplete ? null : new Date(Date.now() + (draft.timePerPick * 1000)).toISOString()

    // Determine the next drafter for the event
    let nextDrafterTeamId = null
    if (!isComplete) {
      const nextPickInRound = ((newPickNumber - 1) % totalTeams)
      const nextIsEvenRound = newRound % 2 === 0
      let nextPosition
      if (nextIsEvenRound) {
        nextPosition = totalTeams - nextPickInRound
      } else {
        nextPosition = nextPickInRound + 1
      }
      const nextDrafter = draft.draftOrder.find(o => o.position === nextPosition)
      nextDrafterTeamId = nextDrafter?.teamId || null
    }

    // Emit pick event with rich data
    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-pick', {
      pick,
      currentPick: newPickNumber,
      currentRound: newRound,
      isComplete,
      pickDeadline,
      nextDrafterTeamId,
    })

    if (isComplete) {
      io.to(`draft-${draft.id}`).emit('draft-completed', { draftId: draft.id })
      clearAutoPick(draft.id)
    } else if (pickDeadline) {
      // Schedule server-side auto-pick for next turn
      scheduleAutoPick(draft.id, pickDeadline, io)
    }

    res.json({
      pick,
      currentPick: newPickNumber,
      currentRound: newRound,
      isComplete,
      pickDeadline,
      nextDrafterTeamId,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/drafts/:id/pause - Pause the draft (commissioner only)
router.post('/:id/pause', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: { league: true }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can pause the draft' } })
    }

    if (draft.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: { message: 'Draft is not in progress' } })
    }

    await prisma.draft.update({
      where: { id: draft.id },
      data: { status: 'PAUSED' }
    })

    // Clear auto-pick timer while paused
    clearAutoPick(draft.id)

    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-paused', { draftId: draft.id })

    res.json({ message: 'Draft paused' })
  } catch (error) {
    next(error)
  }
})

// POST /api/drafts/:id/nominate - Nominate a player (auction draft)
router.post('/:id/nominate', authenticate, async (req, res, next) => {
  try {
    const { playerId, startingBid } = req.body

    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: { league: true }
    })

    if (!draft) return res.status(404).json({ error: { message: 'Draft not found' } })
    if (draft.status !== 'IN_PROGRESS') return res.status(400).json({ error: { message: 'Draft is not in progress' } })
    if (draft.league.draftType !== 'AUCTION') return res.status(400).json({ error: { message: 'Not an auction draft' } })

    const userTeam = await prisma.team.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId: draft.leagueId } }
    })
    if (!userTeam) return res.status(403).json({ error: { message: 'Not a member of this league' } })

    const io = req.app.get('io')
    const nomination = await startNomination(draft.id, playerId, startingBid, userTeam.id, io)

    res.json({ nomination })
  } catch (error) {
    if (error.message.includes('Not your turn') || error.message.includes('Minimum bid') ||
        error.message.includes('Insufficient') || error.message.includes('already drafted') ||
        error.message.includes('No auction') || error.message.includes('Not in nomination')) {
      return res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

// POST /api/drafts/:id/bid - Place a bid (auction draft)
router.post('/:id/bid', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body

    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: { league: true }
    })

    if (!draft) return res.status(404).json({ error: { message: 'Draft not found' } })
    if (draft.status !== 'IN_PROGRESS') return res.status(400).json({ error: { message: 'Draft is not in progress' } })
    if (draft.league.draftType !== 'AUCTION') return res.status(400).json({ error: { message: 'Not an auction draft' } })

    const userTeam = await prisma.team.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId: draft.leagueId } }
    })
    if (!userTeam) return res.status(403).json({ error: { message: 'Not a member of this league' } })

    const io = req.app.get('io')
    const result = placeAuctionBid(draft.id, amount, userTeam.id, io)

    res.json(result)
  } catch (error) {
    if (error.message.includes('Bid must be') || error.message.includes('Insufficient') ||
        error.message.includes('already have') || error.message.includes('No auction') ||
        error.message.includes('No active') || error.message.includes('No current')) {
      return res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

// POST /api/drafts/:id/resume - Resume the draft (commissioner only)
router.post('/:id/resume', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: { league: true }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can resume the draft' } })
    }

    if (draft.status !== 'PAUSED') {
      return res.status(400).json({ error: { message: 'Draft is not paused' } })
    }

    await prisma.draft.update({
      where: { id: draft.id },
      data: { status: 'IN_PROGRESS' }
    })

    const pickDeadline = new Date(Date.now() + (draft.timePerPick * 1000)).toISOString()

    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-resumed', { draftId: draft.id, pickDeadline })

    // Restart auto-pick timer for the current pick
    if (draft.league?.draftType !== 'AUCTION') {
      scheduleAutoPick(draft.id, pickDeadline, io)
    }

    res.json({ message: 'Draft resumed', pickDeadline })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/drafts/:id/schedule - Set or update draft scheduled date (commissioner only)
router.patch('/:id/schedule', authenticate, async (req, res, next) => {
  try {
    const { scheduledFor } = req.body

    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: { league: true }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can schedule the draft' } })
    }

    if (draft.status === 'IN_PROGRESS' || draft.status === 'COMPLETED') {
      return res.status(400).json({ error: { message: 'Cannot schedule a draft that is in progress or completed' } })
    }

    const updatedDraft = await prisma.draft.update({
      where: { id: draft.id },
      data: { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }
    })

    const io = req.app.get('io')
    io.to(`league-${draft.leagueId}`).emit('draft-scheduled', {
      draftId: draft.id,
      scheduledFor: updatedDraft.scheduledFor
    })

    res.json({ draft: updatedDraft })
  } catch (error) {
    next(error)
  }
})

// Helper: Calculate pick deadline based on draft state
function getPickDeadline(draft) {
  if (draft.status !== 'IN_PROGRESS') return null

  // If there are picks, deadline is based on the last pick time
  if (draft.picks && draft.picks.length > 0) {
    const lastPick = draft.picks[draft.picks.length - 1]
    return new Date(lastPick.pickedAt.getTime() + (draft.timePerPick * 1000)).toISOString()
  }

  // If no picks yet, deadline is based on start time
  if (draft.startTime) {
    return new Date(draft.startTime.getTime() + (draft.timePerPick * 1000)).toISOString()
  }

  return null
}

module.exports = router
