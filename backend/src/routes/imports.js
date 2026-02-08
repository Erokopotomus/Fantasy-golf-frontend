const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { validateBody, sanitize } = require('../middleware/validate')
const sleeperImport = require('../services/sleeperImport')

const prisma = new PrismaClient()

const validateLeagueId = validateBody({
  leagueId: { required: true, type: 'string', minLength: 1, maxLength: 100 },
})

// ─── Discover a Sleeper league ──────────────────────────────────────────────
// POST /api/imports/sleeper/discover
router.post('/sleeper/discover', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const discovery = await sleeperImport.discoverLeague(leagueId)
    res.json(discovery)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Start a full Sleeper import ────────────────────────────────────────────
// POST /api/imports/sleeper/import
router.post('/sleeper/import', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const result = await sleeperImport.runFullImport(leagueId, req.user.id, prisma)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get import status ──────────────────────────────────────────────────────
// GET /api/imports/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const importRecord = await prisma.leagueImport.findUnique({
      where: { id: req.params.id },
    })
    if (!importRecord) {
      return res.status(404).json({ error: { message: 'Import not found' } })
    }
    if (importRecord.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not your import' } })
    }
    res.json(importRecord)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get all user imports ───────────────────────────────────────────────────
// GET /api/imports
router.get('/', authenticate, async (req, res) => {
  try {
    const imports = await prisma.leagueImport.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        clutchLeague: { select: { id: true, name: true } },
      },
    })
    res.json({ imports })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get league history (historical seasons) ────────────────────────────────
// GET /api/imports/history/:leagueId
router.get('/history/:leagueId', authenticate, async (req, res) => {
  try {
    const seasons = await prisma.historicalSeason.findMany({
      where: { leagueId: req.params.leagueId },
      orderBy: { seasonYear: 'desc' },
    })

    // Group by season year
    const byYear = {}
    for (const s of seasons) {
      if (!byYear[s.seasonYear]) byYear[s.seasonYear] = []
      byYear[s.seasonYear].push(s)
    }

    // Sort each year by standing
    for (const year of Object.keys(byYear)) {
      byYear[year].sort((a, b) => (a.finalStanding || 99) - (b.finalStanding || 99))
    }

    res.json({
      leagueId: req.params.leagueId,
      seasons: byYear,
      totalSeasons: Object.keys(byYear).length,
    })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Delete an import ───────────────────────────────────────────────────────
// DELETE /api/imports/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const importRecord = await prisma.leagueImport.findUnique({
      where: { id: req.params.id },
    })
    if (!importRecord) {
      return res.status(404).json({ error: { message: 'Import not found' } })
    }
    if (importRecord.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Not your import' } })
    }

    // Delete associated historical seasons first
    await prisma.historicalSeason.deleteMany({
      where: { importId: req.params.id },
    })
    await prisma.leagueImport.delete({
      where: { id: req.params.id },
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

module.exports = router
