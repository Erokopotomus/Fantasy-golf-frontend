const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { validateBody, sanitize } = require('../middleware/validate')
const sleeperImport = require('../services/sleeperImport')
const espnImport = require('../services/espnImport')
const yahooImport = require('../services/yahooImport')
const fantraxImport = require('../services/fantraxImport')
const mflImport = require('../services/mflImport')

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

// ─── ESPN Import ────────────────────────────────────────────────────────────
// POST /api/imports/espn/discover
router.post('/espn/discover', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const cookies = {
      espn_s2: req.body.espn_s2 || '',
      swid: req.body.swid || '',
    }
    const discovery = await espnImport.discoverLeague(leagueId, cookies)
    res.json(discovery)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// POST /api/imports/espn/import
router.post('/espn/import', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const cookies = {
      espn_s2: req.body.espn_s2 || '',
      swid: req.body.swid || '',
    }
    const result = await espnImport.runFullImport(leagueId, req.user.id, prisma, cookies)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Yahoo Import ───────────────────────────────────────────────────────────

/**
 * Resolve Yahoo access token: use body param if provided, otherwise look up stored token.
 */
async function resolveYahooToken(req) {
  // Body param takes priority (backward compat)
  if (req.body.accessToken) return req.body.accessToken

  // Look up stored OAuth token
  const stored = await prisma.userOAuthToken.findUnique({
    where: { userId_provider: { userId: req.user.id, provider: 'yahoo' } },
  })
  if (!stored) return null

  // Check if expired and refresh is possible
  if (stored.expiresAt && new Date() > new Date(stored.expiresAt) && stored.refreshToken) {
    try {
      const { refreshYahooToken } = require('./yahooAuth')
      return await refreshYahooToken(req.user.id)
    } catch {
      return stored.accessToken // Try with existing token anyway
    }
  }

  return stored.accessToken
}

// POST /api/imports/yahoo/discover
router.post('/yahoo/discover', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const accessToken = await resolveYahooToken(req)
    if (!accessToken) return res.status(400).json({ error: { message: 'Yahoo not connected. Please authorize via Settings or provide an access token.' } })
    const discovery = await yahooImport.discoverLeague(leagueId, accessToken)
    res.json(discovery)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// POST /api/imports/yahoo/import
router.post('/yahoo/import', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const accessToken = await resolveYahooToken(req)
    if (!accessToken) return res.status(400).json({ error: { message: 'Yahoo not connected. Please authorize via Settings or provide an access token.' } })
    const result = await yahooImport.runFullImport(leagueId, req.user.id, prisma, accessToken)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Fantrax Import (CSV Upload) ────────────────────────────────────────────
// POST /api/imports/fantrax/discover
router.post('/fantrax/discover', authenticate, async (req, res) => {
  try {
    const csvData = {
      standingsCSV: req.body.standingsCSV,
      draftCSV: req.body.draftCSV || null,
      seasonYear: req.body.seasonYear ? parseInt(req.body.seasonYear) : undefined,
      leagueName: req.body.leagueName ? sanitize(req.body.leagueName) : undefined,
    }
    if (!csvData.standingsCSV) {
      return res.status(400).json({ error: { message: 'Standings CSV data is required' } })
    }
    const discovery = await fantraxImport.discoverLeague(csvData)
    res.json(discovery)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// POST /api/imports/fantrax/import
router.post('/fantrax/import', authenticate, async (req, res) => {
  try {
    const csvData = {
      standingsCSV: req.body.standingsCSV,
      draftCSV: req.body.draftCSV || null,
      seasonYear: req.body.seasonYear ? parseInt(req.body.seasonYear) : undefined,
      leagueName: req.body.leagueName ? sanitize(req.body.leagueName) : undefined,
    }
    if (!csvData.standingsCSV) {
      return res.status(400).json({ error: { message: 'Standings CSV data is required' } })
    }
    const result = await fantraxImport.runFullImport(csvData, req.user.id, prisma)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── MFL Import ─────────────────────────────────────────────────────────────
// POST /api/imports/mfl/discover
router.post('/mfl/discover', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const apiKey = req.body.apiKey
    if (!apiKey) return res.status(400).json({ error: { message: 'MFL API key is required' } })
    const discovery = await mflImport.discoverLeague(leagueId, apiKey)
    res.json(discovery)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// POST /api/imports/mfl/import
router.post('/mfl/import', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const apiKey = req.body.apiKey
    if (!apiKey) return res.status(400).json({ error: { message: 'MFL API key is required' } })
    const result = await mflImport.runFullImport(leagueId, req.user.id, prisma, apiKey)
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
