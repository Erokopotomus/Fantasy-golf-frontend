const express = require('express')
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
const { createNotification, notifyLeague } = require('../services/notificationService')
const { recordEvent: recordOpinionEvent } = require('../services/opinionTimelineService')

const router = express.Router()
const prisma = require('../lib/prisma.js')

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

    // Pre-assign keepers if keeper league is enabled
    const keeperSettings = draft.league.settings?.keeperSettings
    const keeperPicks = []
    if (keeperSettings?.enabled) {
      for (const team of teams) {
        const keepers = await prisma.rosterEntry.findMany({
          where: { teamId: team.id, isActive: true, isKeeper: true },
          include: { player: { select: { id: true, name: true } } },
        })
        for (const keeper of keepers) {
          keeperPicks.push({
            draftId: draft.id,
            teamId: team.id,
            playerId: keeper.playerId,
            isKeeper: true,
            amount: keeper.keeperCost || 0,
          })
        }
      }
    }

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
      // Create keeper picks (pre-assigned before draft starts)
      ...keeperPicks.map((kp, idx) =>
        prisma.draftPick.create({
          data: {
            draftId: kp.draftId,
            teamId: kp.teamId,
            playerId: kp.playerId,
            pickNumber: -(idx + 1), // Negative pick numbers indicate keeper selections
            round: 0,
            amount: kp.amount,
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

    // Notify all league members that draft started
    try {
      await notifyLeague(draft.leagueId, {
        type: 'DRAFT_STARTED',
        title: 'Draft Started!',
        message: `The draft for ${updatedDraft.league.name} has begun!`,
        actionUrl: `/leagues/${draft.leagueId}/draft`,
        data: { draftId: draft.id, leagueId: draft.leagueId },
      }, [req.user.id], prisma)
    } catch (err) { console.error('Draft started notification failed:', err.message) }

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
    const { playerId, amount, pickTag } = req.body

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

    // Auto-lookup board rank if user has an active draft board
    let boardRankAtPick = null
    let activeBoardId = null
    try {
      const sport = draft.league?.sport?.slug || 'golf'
      const activeBoard = await prisma.draftBoard.findFirst({
        where: { userId: req.user.id, sport },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
      if (activeBoard) {
        activeBoardId = activeBoard.id
        const entry = await prisma.draftBoardEntry.findFirst({
          where: { boardId: activeBoard.id, playerId },
          select: { rank: true },
        })
        if (entry) boardRankAtPick = entry.rank
      }
    } catch {}

    // Validate pickTag
    const validTags = ['STEAL', 'REACH', 'PLAN', 'FALLBACK', 'VALUE', 'PANIC']
    const safePickTag = pickTag && validTags.includes(pickTag) ? pickTag : null

    // Create the pick
    const pick = await prisma.draftPick.create({
      data: {
        draftId: draft.id,
        teamId: userTeam.id,
        playerId,
        pickNumber: draft.currentPick,
        round: draft.currentRound,
        amount: amount || null,
        pickTag: safePickTag,
        boardRankAtPick,
        boardId: activeBoardId,
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

    // Fire-and-forget: opinion timeline
    const sport = draft.league?.sport?.slug || 'golf'
    recordOpinionEvent(req.user.id, playerId, sport, 'DRAFT_PICK', {
      round: draft.currentRound, pick: draft.currentPick,
      auctionAmount: amount || null, pickTag: safePickTag, boardRank: boardRankAtPick,
    }, pick.id, 'DraftPick').catch(() => {})

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

    // Notify next drafter it's their turn
    if (!isComplete && nextDrafterTeamId) {
      try {
        const nextTeam = await prisma.team.findUnique({
          where: { id: nextDrafterTeamId },
          select: { userId: true },
        })
        if (nextTeam && nextTeam.userId !== req.user.id) {
          createNotification({
            userId: nextTeam.userId,
            type: 'DRAFT_YOUR_TURN',
            title: "It's Your Turn!",
            message: `It's your turn to pick in the draft (Round ${newRound}, Pick ${newPickNumber})`,
            actionUrl: `/leagues/${draft.leagueId}/draft`,
            data: { draftId: draft.id, leagueId: draft.leagueId },
          }, prisma).catch(err => console.error('Your turn notification failed:', err.message))
        }
      } catch (err) { console.error('Your turn notification failed:', err.message) }
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

      // Notify league that draft is complete
      try {
        notifyLeague(draft.leagueId, {
          type: 'DRAFT_COMPLETED',
          title: 'Draft Complete!',
          message: `The draft for your league is complete. Good luck this season!`,
          actionUrl: `/leagues/${draft.leagueId}`,
          data: { draftId: draft.id, leagueId: draft.leagueId },
        }, [], prisma).catch(err => console.error('Draft completed notification failed:', err.message))
      } catch (err) { console.error('Draft completed notification failed:', err.message) }
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

// PATCH /api/drafts/picks/:pickId/tag - Tag a draft pick after it's made
router.patch('/picks/:pickId/tag', authenticate, async (req, res) => {
  try {
    const { pickTag } = req.body
    const validTags = ['STEAL', 'REACH', 'PLAN', 'FALLBACK', 'VALUE', 'PANIC']
    if (pickTag && !validTags.includes(pickTag)) {
      return res.status(400).json({ error: { message: 'Invalid pick tag' } })
    }
    const pick = await prisma.draftPick.findUnique({
      where: { id: req.params.pickId },
      include: { team: { select: { userId: true } } },
    })
    if (!pick) return res.status(404).json({ error: { message: 'Pick not found' } })
    if (pick.team.userId !== req.user.id) return res.status(403).json({ error: { message: 'Not your pick' } })

    const updated = await prisma.draftPick.update({
      where: { id: req.params.pickId },
      data: { pickTag: pickTag || null },
    })
    res.json({ pick: updated })
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to tag pick' } })
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

// POST /api/drafts/:id/undo-pick - Undo last draft pick (commissioner only)
router.post('/:id/undo-pick', authenticate, async (req, res, next) => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: req.params.id },
      include: {
        league: true,
        draftOrder: { orderBy: { position: 'asc' } },
        picks: { orderBy: { pickNumber: 'desc' }, take: 1 },
      }
    })

    if (!draft) {
      return res.status(404).json({ error: { message: 'Draft not found' } })
    }

    if (draft.league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can undo picks' } })
    }

    if (draft.picks.length === 0) {
      return res.status(400).json({ error: { message: 'No picks to undo' } })
    }

    const lastPick = draft.picks[0]

    // Transaction: remove pick, roster entry, transaction log, and roll back draft state
    await prisma.$transaction(async (tx) => {
      // Delete the draft pick
      await tx.draftPick.delete({ where: { id: lastPick.id } })

      // Delete the roster entry (match by team, player, and acquiredVia=DRAFT)
      const rosterEntry = await tx.rosterEntry.findFirst({
        where: { teamId: lastPick.teamId, playerId: lastPick.playerId }
      })
      if (rosterEntry) {
        await tx.rosterEntry.delete({ where: { id: rosterEntry.id } })
      }

      // Delete the roster transaction log
      const txLog = await tx.rosterTransaction.findFirst({
        where: { teamId: lastPick.teamId, playerId: lastPick.playerId, type: 'DRAFT_PICK' },
        orderBy: { createdAt: 'desc' },
      })
      if (txLog) {
        await tx.rosterTransaction.delete({ where: { id: txLog.id } })
      }

      // Reverse TeamBudget if auction
      if (lastPick.amount && draft.league.draftType === 'AUCTION') {
        const currentSeason = await tx.season.findFirst({ where: { isCurrent: true } })
        if (currentSeason) {
          const leagueSeason = await tx.leagueSeason.findFirst({
            where: { leagueId: draft.leagueId, seasonId: currentSeason.id },
          })
          if (leagueSeason) {
            const budget = await tx.teamBudget.findUnique({
              where: { teamId_leagueSeasonId: { teamId: lastPick.teamId, leagueSeasonId: leagueSeason.id } },
            })
            if (budget) {
              await tx.teamBudget.update({
                where: { id: budget.id },
                data: {
                  spent: Math.max(0, budget.spent - lastPick.amount),
                  remaining: budget.remaining + lastPick.amount,
                },
              })
            }
          }
        }
      }

      // Roll back draft state
      const wasCompleted = draft.status === 'COMPLETED'
      const prevPickNumber = lastPick.pickNumber
      const totalTeams = draft.draftOrder.length
      const prevRound = Math.ceil(prevPickNumber / totalTeams)

      await tx.draft.update({
        where: { id: draft.id },
        data: {
          currentPick: prevPickNumber,
          currentRound: prevRound,
          ...(wasCompleted && { status: 'IN_PROGRESS', endTime: null }),
        },
      })

      // If draft was completed, reopen the league to DRAFTING
      if (wasCompleted) {
        await tx.league.update({
          where: { id: draft.leagueId },
          data: { status: 'DRAFTING' },
        })
      }
    })

    // Reschedule auto-pick timer
    const pickDeadline = new Date(Date.now() + (draft.timePerPick * 1000)).toISOString()
    if (draft.league.draftType !== 'AUCTION') {
      scheduleAutoPick(draft.id, pickDeadline, req.app.get('io'))
    }

    // Emit socket event
    const io = req.app.get('io')
    io.to(`draft-${draft.id}`).emit('draft-pick-undone', {
      draftId: draft.id,
      undonePickNumber: lastPick.pickNumber,
      undonePlayerId: lastPick.playerId,
      pickDeadline,
    })

    res.json({
      message: 'Pick undone',
      undonePickNumber: lastPick.pickNumber,
      pickDeadline,
    })
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
