const express = require('express')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// GET /api/news — All news (query: sport, limit, offset, category)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { sport, limit = 20, offset = 0, category } = req.query

    const where = {}
    if (sport && sport !== 'all') where.sport = sport
    if (category && category !== 'all') where.category = category

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { published: 'desc' }],
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      prisma.newsArticle.count({ where }),
    ])

    res.json({
      articles,
      total,
      hasMore: parseInt(offset) + articles.length < total,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/news/team/:abbr — Team-specific news
router.get('/team/:abbr', optionalAuth, async (req, res, next) => {
  try {
    const { abbr } = req.params
    const { limit = 15, offset = 0 } = req.query

    const where = { teamAbbrs: { has: abbr.toUpperCase() } }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { published: 'desc' }],
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      prisma.newsArticle.count({ where }),
    ])

    res.json({
      articles,
      total,
      hasMore: parseInt(offset) + articles.length < total,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/news/player/:id — Player-specific news
router.get('/player/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit = 10, offset = 0 } = req.query

    const where = { playerIds: { has: id } }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { published: 'desc' }],
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      prisma.newsArticle.count({ where }),
    ])

    res.json({
      articles,
      total,
      hasMore: parseInt(offset) + articles.length < total,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
