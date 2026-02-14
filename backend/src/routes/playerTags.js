const express = require('express')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// GET /api/players/:id/tags - Player's tags
router.get('/players/:id/tags', authenticate, async (req, res, next) => {
  try {
    const assignments = await prisma.playerTagAssignment.findMany({
      where: { playerId: req.params.id },
      include: {
        tag: true,
        season: { select: { name: true, year: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ tags: assignments })
  } catch (error) {
    next(error)
  }
})

// GET /api/sports/:slug/tags - All tags for a sport
router.get('/sports/:slug/tags', authenticate, async (req, res, next) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { slug: req.params.slug },
    })
    if (!sport) {
      return res.status(404).json({ error: { message: 'Sport not found' } })
    }

    const { category } = req.query
    const where = { sportId: sport.id }
    if (category) where.category = category

    const tags = await prisma.playerTag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    res.json({ tags })
  } catch (error) {
    next(error)
  }
})

module.exports = router
