const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

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

    res.json({ trades })
  } catch (error) {
    next(error)
  }
})

// POST /api/trades - Propose a trade
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { leagueId, receiverId, senderPlayers, receiverPlayers, message } = req.body

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
        message,
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

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'TRADE_PROPOSED',
        title: 'New Trade Proposal',
        message: `${req.user.name} has proposed a trade`,
        data: { tradeId: trade.id, leagueId }
      }
    })

    // Emit socket event
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
        receiverTeam: true
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

    // Execute the trade - swap players
    const senderPlayerIds = trade.senderPlayers
    const receiverPlayerIds = trade.receiverPlayers

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
        data: { status: 'ACCEPTED' }
      })
    ])

    // Notify initiator
    await prisma.notification.create({
      data: {
        userId: trade.initiatorId,
        type: 'TRADE_ACCEPTED',
        title: 'Trade Accepted',
        message: `Your trade has been accepted!`,
        data: { tradeId: trade.id, leagueId: trade.leagueId }
      }
    })

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
    await prisma.notification.create({
      data: {
        userId: trade.initiatorId,
        type: 'TRADE_REJECTED',
        title: 'Trade Rejected',
        message: `Your trade has been rejected`,
        data: { tradeId: trade.id, leagueId: trade.leagueId }
      }
    })

    res.json({ message: 'Trade rejected' })
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
