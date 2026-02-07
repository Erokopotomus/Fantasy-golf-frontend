const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/sports/:slug/positions - List positions for a sport
router.get('/sports/:slug/positions', authenticate, async (req, res, next) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { slug: req.params.slug },
    })
    if (!sport) {
      return res.status(404).json({ error: { message: 'Sport not found' } })
    }

    const positions = await prisma.position.findMany({
      where: { sportId: sport.id },
      orderBy: { sortOrder: 'asc' },
    })

    res.json({ positions })
  } catch (error) {
    next(error)
  }
})

// GET /api/players/:id/positions - Player's position eligibility
router.get('/players/:id/positions', authenticate, async (req, res, next) => {
  try {
    const playerPositions = await prisma.playerPosition.findMany({
      where: { playerId: req.params.id },
      include: {
        position: {
          include: { sport: { select: { slug: true, name: true } } },
        },
      },
    })

    res.json({ positions: playerPositions })
  } catch (error) {
    next(error)
  }
})

module.exports = router
