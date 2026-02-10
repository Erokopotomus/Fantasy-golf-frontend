const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/watch-list — list all watched players
router.get('/', authenticate, async (req, res) => {
  try {
    const { sport } = req.query
    const where = { userId: req.user.id }
    if (sport) where.sport = sport

    const entries = await prisma.watchListEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        player: {
          select: {
            id: true, name: true, headshotUrl: true,
            nflPosition: true, nflTeamAbbr: true,
            owgrRank: true, sgTotal: true,
          },
        },
      },
    })

    res.json({
      entries: entries.map(e => ({
        id: e.id,
        playerId: e.playerId,
        sport: e.sport,
        note: e.note,
        createdAt: e.createdAt,
        player: {
          id: e.player.id,
          name: e.player.name,
          headshotUrl: e.player.headshotUrl,
          position: e.player.nflPosition,
          team: e.player.nflTeamAbbr,
          owgrRank: e.player.owgrRank,
          sgTotal: e.player.sgTotal,
        },
      })),
    })
  } catch (err) {
    console.error('[watchList] GET failed:', err)
    res.status(500).json({ error: 'Failed to load watch list' })
  }
})

// GET /api/watch-list/ids — lightweight: just player IDs (for star icons)
router.get('/ids', authenticate, async (req, res) => {
  try {
    const entries = await prisma.watchListEntry.findMany({
      where: { userId: req.user.id },
      select: { playerId: true },
    })
    res.json({ playerIds: entries.map(e => e.playerId) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load watch list IDs' })
  }
})

// POST /api/watch-list — add player to watch list
router.post('/', authenticate, async (req, res) => {
  try {
    const { playerId, sport, note } = req.body
    if (!playerId || !sport) {
      return res.status(400).json({ error: 'playerId and sport are required' })
    }

    const entry = await prisma.watchListEntry.create({
      data: {
        userId: req.user.id,
        playerId,
        sport,
        note: note || null,
      },
    })
    res.status(201).json({ entry })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Player already on watch list' })
    }
    console.error('[watchList] POST failed:', err)
    res.status(500).json({ error: 'Failed to add to watch list' })
  }
})

// DELETE /api/watch-list/:playerId — remove from watch list
router.delete('/:playerId', authenticate, async (req, res) => {
  try {
    await prisma.watchListEntry.delete({
      where: {
        userId_playerId: {
          userId: req.user.id,
          playerId: req.params.playerId,
        },
      },
    })
    res.json({ success: true })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not on watch list' })
    }
    console.error('[watchList] DELETE failed:', err)
    res.status(500).json({ error: 'Failed to remove from watch list' })
  }
})

// PATCH /api/watch-list/:playerId/note — update note
router.patch('/:playerId/note', authenticate, async (req, res) => {
  try {
    const entry = await prisma.watchListEntry.update({
      where: {
        userId_playerId: {
          userId: req.user.id,
          playerId: req.params.playerId,
        },
      },
      data: { note: req.body.note || null },
    })
    res.json({ entry })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note' })
  }
})

module.exports = router
