const express = require('express')
const { authenticate } = require('../middleware/auth')
const { recordTransaction } = require('../services/fantasyTracker')
const { createNotification } = require('../services/notificationService')
const { validatePositionLimits } = require('../services/positionLimitValidator')
const { recordEvent: recordOpinionEvent } = require('../services/opinionTimelineService')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// GET /api/trades - Get user's trades
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { leagueId, status } = req.query

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ],
        ...(leagueId && { leagueId }),
        ...(status && { status })
      },
      include: {
        initiator: {
          select: { id: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, avatar: true }
        },
        senderTeam: {
          select: { id: true, name: true }
        },
        receiverTeam: {
          select: { id: true, name: true }
        },
        league: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Resolve player IDs to player objects
    const allPlayerIds = new Set()
    for (const trade of trades) {
      const sIds = Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []
      const rIds = Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []
      sIds.forEach(id => allPlayerIds.add(id))
      rIds.forEach(id => allPlayerIds.add(id))
    }

    const players = allPlayerIds.size > 0
      ? await prisma.player.findMany({
          where: { id: { in: Array.from(allPlayerIds) } },
          select: { id: true, name: true, country: true, owgr: true, headshotUrl: true }
        })
      : []

    const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

    const enrichedTrades = trades.map(trade => ({
      ...trade,
      senderPlayerDetails: (Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []).map(id => playerMap[id] || { id, name: 'Unknown' }),
      receiverPlayerDetails: (Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []).map(id => playerMap[id] || { id, name: 'Unknown' }),
    }))

    res.json({ trades: enrichedTrades })
  } catch (error) {
    next(error)
  }
})

// POST /api/trades - Propose a trade
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { leagueId, receiverId, senderPlayers, receiverPlayers, message, senderDollars, receiverDollars, reasoning } = req.body

    // Check trade deadline
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } })
    if (league?.settings?.tradeDeadline && league.settings.tradeDeadlineDate) {
      if (new Date() > new Date(league.settings.tradeDeadlineDate)) {
        return res.status(403).json({ error: { message: 'The trade deadline has passed for this league' } })
      }
    }

    // Get teams
    const senderTeam = await prisma.team.findUnique({
      where: {
        userId_leagueId: {
          userId: req.user.id,
          leagueId
        }
      }
    })

    const receiverTeam = await prisma.team.findUnique({
      where: {
        userId_leagueId: {
          userId: receiverId,
          leagueId
        }
      }
    })

    if (!senderTeam || !receiverTeam) {
      return res.status(400).json({ error: { message: 'Invalid teams' } })
    }

    const trade = await prisma.trade.create({
      data: {
        leagueId,
        initiatorId: req.user.id,
        receiverId,
        senderTeamId: senderTeam.id,
        receiverTeamId: receiverTeam.id,
        senderPlayers: senderPlayers || [],
        receiverPlayers: receiverPlayers || [],
        senderDollars: senderDollars || {},
        receiverDollars: receiverDollars || {},
        message,
        proposerReasoning: reasoning ? String(reasoning).substring(0, 280) : null,
        status: 'PENDING'
      },
      include: {
        initiator: {
          select: { id: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    // Notify receiver (socket push handled by notificationService)
    try {
      await createNotification({
        userId: receiverId,
        type: 'TRADE_PROPOSED',
        title: 'New Trade Proposal',
        message: `${req.user.name} has proposed a trade`,
        actionUrl: `/leagues/${leagueId}/trades`,
        data: { tradeId: trade.id, leagueId },
      }, prisma)
    } catch (err) {
      console.error('Trade notification failed:', err.message)
    }

    // Emit socket event for trade board
    const io = req.app.get('io')
    io.to(`league-${leagueId}`).emit('trade-proposed', trade)

    res.status(201).json({ trade })
  } catch (error) {
    next(error)
  }
})

// POST /api/trades/:id/accept - Accept a trade
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: {
        senderTeam: true,
        receiverTeam: true,
        league: { select: { settings: true } }
      }
    })

    if (!trade) {
      return res.status(404).json({ error: { message: 'Trade not found' } })
    }

    if (trade.receiverId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    if (trade.status !== 'PENDING') {
      return res.status(400).json({ error: { message: 'Trade is not pending' } })
    }

    // Check trade deadline
    if (trade.league?.settings?.tradeDeadline && trade.league.settings.tradeDeadlineDate) {
      if (new Date() > new Date(trade.league.settings.tradeDeadlineDate)) {
        return res.status(403).json({ error: { message: 'The trade deadline has passed for this league' } })
      }
    }

    // Check if league uses league-vote trade review
    const tradeReview = trade.league?.settings?.tradeReview
    if (tradeReview === 'league-vote') {
      const reviewHours = trade.league.settings.tradeReviewHours || 48
      const reviewUntil = new Date(Date.now() + reviewHours * 60 * 60 * 1000)

      await prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'IN_REVIEW', reviewUntil, vetoVotes: [] },
      })

      // Notify league about trade under review
      const io = req.app.get('io')
      io.to(`league-${trade.leagueId}`).emit('trade-in-review', { tradeId: trade.id, reviewUntil })

      return res.json({ message: 'Trade accepted and now under league review', reviewUntil })
    }

    // Execute the trade - swap players
    const senderPlayerIds = trade.senderPlayers
    const receiverPlayerIds = trade.receiverPlayers

    // Check position limits for both sides (net of outgoing players)
    for (const playerId of receiverPlayerIds) {
      const check = await validatePositionLimits(trade.senderTeamId, playerId, trade.leagueId, prisma, {
        dropPlayerIds: senderPlayerIds,
      })
      if (!check.valid) {
        return res.status(400).json({
          error: { message: `Trade blocked: ${trade.senderTeam.name} would exceed ${check.position} limit (${check.limit} max)` },
        })
      }
    }
    for (const playerId of senderPlayerIds) {
      const check = await validatePositionLimits(trade.receiverTeamId, playerId, trade.leagueId, prisma, {
        dropPlayerIds: receiverPlayerIds,
      })
      if (!check.valid) {
        return res.status(400).json({
          error: { message: `Trade blocked: ${trade.receiverTeam.name} would exceed ${check.position} limit (${check.limit} max)` },
        })
      }
    }

    await prisma.$transaction([
      // Move sender's players to receiver's team
      ...senderPlayerIds.map(playerId =>
        prisma.rosterEntry.update({
          where: {
            teamId_playerId: {
              teamId: trade.senderTeamId,
              playerId
            }
          },
          data: { teamId: trade.receiverTeamId }
        })
      ),
      // Move receiver's players to sender's team
      ...receiverPlayerIds.map(playerId =>
        prisma.rosterEntry.update({
          where: {
            teamId_playerId: {
              teamId: trade.receiverTeamId,
              playerId
            }
          },
          data: { teamId: trade.senderTeamId }
        })
      ),
      // Update trade status
      prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: 'ACCEPTED',
          responderReasoning: req.body.reasoning ? String(req.body.reasoning).substring(0, 280) : null,
        }
      })
    ])

    // Execute draft dollar transfers if trade includes dollars
    const hasDollars = (d) => d && (d.current > 0 || d.next > 0)
    if (hasDollars(trade.senderDollars) || hasDollars(trade.receiverDollars)) {
      try {
        const draftDollarService = require('../services/draftDollarService')
        const draftDollarSettings = trade.league?.settings?.draftDollarSettings || {}

        if (draftDollarSettings.enabled) {
          const leagueSeason = await prisma.leagueSeason.findFirst({
            where: { leagueId: trade.leagueId, status: { in: ['ACTIVE', 'PLAYOFFS'] } },
            orderBy: { createdAt: 'desc' },
          })

          if (leagueSeason) {
            // Sender dollars go FROM sender team TO receiver team
            const sd = trade.senderDollars || {}
            if (sd.current > 0) {
              await draftDollarService.transferDollars({
                fromTeamId: trade.senderTeamId,
                toTeamId: trade.receiverTeamId,
                amount: sd.current,
                yearType: 'current',
                leagueId: trade.leagueId,
                leagueSeasonId: leagueSeason.id,
                category: 'trade',
                description: `Trade #${trade.id.slice(-6)}`,
                tradeId: trade.id,
                initiatedById: trade.initiatorId,
                settings: draftDollarSettings,
              }, prisma)
            }
            if (sd.next > 0) {
              await draftDollarService.transferDollars({
                fromTeamId: trade.senderTeamId,
                toTeamId: trade.receiverTeamId,
                amount: sd.next,
                yearType: 'next',
                leagueId: trade.leagueId,
                leagueSeasonId: leagueSeason.id,
                category: 'trade',
                description: `Trade #${trade.id.slice(-6)}`,
                tradeId: trade.id,
                initiatedById: trade.initiatorId,
                settings: draftDollarSettings,
              }, prisma)
            }

            // Receiver dollars go FROM receiver team TO sender team
            const rd = trade.receiverDollars || {}
            if (rd.current > 0) {
              await draftDollarService.transferDollars({
                fromTeamId: trade.receiverTeamId,
                toTeamId: trade.senderTeamId,
                amount: rd.current,
                yearType: 'current',
                leagueId: trade.leagueId,
                leagueSeasonId: leagueSeason.id,
                category: 'trade',
                description: `Trade #${trade.id.slice(-6)}`,
                tradeId: trade.id,
                initiatedById: trade.initiatorId,
                settings: draftDollarSettings,
              }, prisma)
            }
            if (rd.next > 0) {
              await draftDollarService.transferDollars({
                fromTeamId: trade.receiverTeamId,
                toTeamId: trade.senderTeamId,
                amount: rd.next,
                yearType: 'next',
                leagueId: trade.leagueId,
                leagueSeasonId: leagueSeason.id,
                category: 'trade',
                description: `Trade #${trade.id.slice(-6)}`,
                tradeId: trade.id,
                initiatedById: trade.initiatorId,
                settings: draftDollarSettings,
              }, prisma)
            }
          }
        }
      } catch (dollarErr) {
        console.error('Draft dollar transfer failed:', dollarErr.message)
        // Don't block the trade — log the error but continue
      }
    }

    // Log roster transactions for both sides
    const logTransactions = async () => {
      // Resolve player names for logging
      const allIds = [...senderPlayerIds, ...receiverPlayerIds]
      const players = allIds.length > 0
        ? await prisma.player.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true } })
        : []
      const nameMap = Object.fromEntries(players.map(p => [p.id, p.name]))

      for (const playerId of senderPlayerIds) {
        await recordTransaction({
          type: 'TRADE_SENT',
          teamId: trade.senderTeamId,
          playerId,
          playerName: nameMap[playerId] || 'Unknown',
          leagueId: trade.leagueId,
          otherTeamId: trade.receiverTeamId,
          tradeId: trade.id,
        }, prisma)
        await recordTransaction({
          type: 'TRADE_ACQUIRED',
          teamId: trade.receiverTeamId,
          playerId,
          playerName: nameMap[playerId] || 'Unknown',
          leagueId: trade.leagueId,
          otherTeamId: trade.senderTeamId,
          tradeId: trade.id,
        }, prisma)
      }
      for (const playerId of receiverPlayerIds) {
        await recordTransaction({
          type: 'TRADE_SENT',
          teamId: trade.receiverTeamId,
          playerId,
          playerName: nameMap[playerId] || 'Unknown',
          leagueId: trade.leagueId,
          otherTeamId: trade.senderTeamId,
          tradeId: trade.id,
        }, prisma)
        await recordTransaction({
          type: 'TRADE_ACQUIRED',
          teamId: trade.senderTeamId,
          playerId,
          playerName: nameMap[playerId] || 'Unknown',
          leagueId: trade.leagueId,
          otherTeamId: trade.receiverTeamId,
          tradeId: trade.id,
        }, prisma)
      }
    }
    logTransactions().catch(err => console.error('Trade transaction log failed:', err.message))

    // Fire-and-forget: opinion timeline for both sides of trade
    const tradeOpinionLog = async () => {
      const league = await prisma.league.findUnique({ where: { id: trade.leagueId }, include: { sportRef: { select: { slug: true } } } })
      const sport = league?.sportRef?.slug || 'unknown'
      const allIds = [...senderPlayerIds, ...receiverPlayerIds]
      const players = allIds.length > 0 ? await prisma.player.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true } }) : []
      const nameMap = Object.fromEntries(players.map(p => [p.id, p.name]))
      // Sender acquires receiverPlayerIds, loses senderPlayerIds
      for (const pid of receiverPlayerIds) {
        recordOpinionEvent(trade.senderId, pid, sport, 'TRADE_ACQUIRE', { tradedAway: senderPlayerIds.map(id => nameMap[id] || 'Unknown') }, trade.id, 'Trade').catch(() => {})
      }
      for (const pid of senderPlayerIds) {
        recordOpinionEvent(trade.senderId, pid, sport, 'TRADE_AWAY', { tradedFor: receiverPlayerIds.map(id => nameMap[id] || 'Unknown') }, trade.id, 'Trade').catch(() => {})
      }
      // Receiver acquires senderPlayerIds, loses receiverPlayerIds
      for (const pid of senderPlayerIds) {
        recordOpinionEvent(trade.receiverId, pid, sport, 'TRADE_ACQUIRE', { tradedAway: receiverPlayerIds.map(id => nameMap[id] || 'Unknown') }, trade.id, 'Trade').catch(() => {})
      }
      for (const pid of receiverPlayerIds) {
        recordOpinionEvent(trade.receiverId, pid, sport, 'TRADE_AWAY', { tradedFor: senderPlayerIds.map(id => nameMap[id] || 'Unknown') }, trade.id, 'Trade').catch(() => {})
      }
    }
    tradeOpinionLog().catch(() => {})

    // Notify initiator
    try {
      await createNotification({
        userId: trade.initiatorId,
        type: 'TRADE_ACCEPTED',
        title: 'Trade Accepted',
        message: 'Your trade has been accepted!',
        actionUrl: `/leagues/${trade.leagueId}/trades`,
        data: { tradeId: trade.id, leagueId: trade.leagueId },
      }, prisma)
    } catch (err) {
      console.error('Trade accepted notification failed:', err.message)
    }

    // Emit socket event
    const io = req.app.get('io')
    io.to(`league-${trade.leagueId}`).emit('trade-accepted', { tradeId: trade.id })

    res.json({ message: 'Trade accepted' })
  } catch (error) {
    next(error)
  }
})

// POST /api/trades/:id/reject - Reject a trade
router.post('/:id/reject', authenticate, async (req, res, next) => {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id }
    })

    if (!trade) {
      return res.status(404).json({ error: { message: 'Trade not found' } })
    }

    if (trade.receiverId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    await prisma.trade.update({
      where: { id: trade.id },
      data: { status: 'REJECTED' }
    })

    // Notify initiator
    try {
      await createNotification({
        userId: trade.initiatorId,
        type: 'TRADE_REJECTED',
        title: 'Trade Rejected',
        message: 'Your trade has been rejected',
        actionUrl: `/leagues/${trade.leagueId}/trades`,
        data: { tradeId: trade.id, leagueId: trade.leagueId },
      }, prisma)
    } catch (err) {
      console.error('Trade rejected notification failed:', err.message)
    }

    res.json({ message: 'Trade rejected' })
  } catch (error) {
    next(error)
  }
})

// POST /api/trades/:id/vote - Cast a veto/approve vote on a trade under review
router.post('/:id/vote', authenticate, async (req, res, next) => {
  try {
    const { vote } = req.body // 'veto' or 'approve'
    if (!['veto', 'approve'].includes(vote)) {
      return res.status(400).json({ error: { message: 'Vote must be "veto" or "approve"' } })
    }

    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: {
        league: { include: { members: { select: { userId: true } } } },
      },
    })

    if (!trade) return res.status(404).json({ error: { message: 'Trade not found' } })
    if (trade.status !== 'IN_REVIEW') {
      return res.status(400).json({ error: { message: 'Trade is not under review' } })
    }

    // Trade parties cannot vote
    if (req.user.id === trade.initiatorId || req.user.id === trade.receiverId) {
      return res.status(403).json({ error: { message: 'Trade parties cannot vote' } })
    }

    // Must be a league member
    const isMember = trade.league.members.some(m => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: { message: 'Not a league member' } })
    }

    // Check if already voted
    const existingVotes = Array.isArray(trade.vetoVotes) ? trade.vetoVotes : []
    if (existingVotes.some(v => v.userId === req.user.id)) {
      return res.status(400).json({ error: { message: 'You have already voted' } })
    }

    const updatedVotes = [...existingVotes, { userId: req.user.id, vote, votedAt: new Date().toISOString() }]

    await prisma.trade.update({
      where: { id: trade.id },
      data: { vetoVotes: updatedVotes },
    })

    // Check if veto threshold already met for early veto
    const vetoThreshold = trade.league.settings?.tradeVetoThreshold || 50
    const eligibleVoters = trade.league.members.filter(
      m => m.userId !== trade.initiatorId && m.userId !== trade.receiverId
    ).length
    const vetoVoteCount = updatedVotes.filter(v => v.vote === 'veto').length
    const vetoPercent = eligibleVoters > 0 ? (vetoVoteCount / eligibleVoters) * 100 : 0

    if (vetoPercent >= vetoThreshold) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'VETOED' },
      })

      try {
        await createNotification({
          userId: trade.initiatorId,
          type: 'TRADE_VETOED',
          title: 'Trade Vetoed',
          message: 'Your trade was vetoed by league vote',
          actionUrl: `/leagues/${trade.leagueId}/trades`,
          data: { tradeId: trade.id, leagueId: trade.leagueId },
        }, prisma)
      } catch (err) { console.error('Trade veto notification failed:', err.message) }

      const io = req.app.get('io')
      io.to(`league-${trade.leagueId}`).emit('trade-vetoed', { tradeId: trade.id })

      return res.json({ message: 'Trade vetoed by league vote', status: 'VETOED' })
    }

    res.json({ message: 'Vote recorded', voteCount: updatedVotes.length, eligibleVoters })
  } catch (error) {
    next(error)
  }
})

// GET /api/trades/:id/votes - Get vote counts for a trade under review
router.get('/:id/votes', authenticate, async (req, res, next) => {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: {
        league: {
          select: { settings: true, members: { select: { userId: true } } },
        },
      },
    })

    if (!trade) return res.status(404).json({ error: { message: 'Trade not found' } })

    const votes = Array.isArray(trade.vetoVotes) ? trade.vetoVotes : []
    const eligibleVoters = trade.league.members.filter(
      m => m.userId !== trade.initiatorId && m.userId !== trade.receiverId
    ).length

    const vetoCount = votes.filter(v => v.vote === 'veto').length
    const approveCount = votes.filter(v => v.vote === 'approve').length
    const threshold = trade.league.settings?.tradeVetoThreshold || 50
    const visibility = trade.league.settings?.tradeVetoVisibility || 'anonymous'

    const response = {
      totalVotes: votes.length,
      vetoCount,
      approveCount,
      eligibleVoters,
      threshold,
      reviewUntil: trade.reviewUntil,
      userVote: votes.find(v => v.userId === req.user.id)?.vote || null,
    }

    // Only include voter details if visibility allows
    if (visibility === 'visible') {
      response.voters = votes.map(v => ({ userId: v.userId, vote: v.vote }))
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// POST /api/trades/:id/cancel - Cancel a trade
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id }
    })

    if (!trade) {
      return res.status(404).json({ error: { message: 'Trade not found' } })
    }

    if (trade.initiatorId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not authorized' } })
    }

    if (trade.status !== 'PENDING') {
      return res.status(400).json({ error: { message: 'Trade is not pending' } })
    }

    await prisma.trade.update({
      where: { id: trade.id },
      data: { status: 'CANCELLED' }
    })

    res.json({ message: 'Trade cancelled' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
