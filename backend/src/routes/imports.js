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
    const targetLeagueId = req.body.targetLeagueId || undefined
    const selectedSeasons = req.body.selectedSeasons || undefined
    const result = await sleeperImport.runFullImport(leagueId, req.user.id, prisma, targetLeagueId, selectedSeasons)
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
    const targetLeagueId = req.body.targetLeagueId || undefined
    const selectedSeasons = req.body.selectedSeasons || undefined
    const result = await espnImport.runFullImport(leagueId, req.user.id, prisma, cookies, targetLeagueId, selectedSeasons)
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
    const targetLeagueId = req.body.targetLeagueId || undefined
    const selectedSeasons = req.body.selectedSeasons || undefined
    const result = await yahooImport.runFullImport(leagueId, req.user.id, prisma, accessToken, targetLeagueId, selectedSeasons)
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
    const targetLeagueId = req.body.targetLeagueId || undefined
    const result = await fantraxImport.runFullImport(csvData, req.user.id, prisma, targetLeagueId)
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
    const targetLeagueId = req.body.targetLeagueId || undefined
    const selectedSeasons = req.body.selectedSeasons || undefined
    const result = await mflImport.runFullImport(leagueId, req.user.id, prisma, apiKey, targetLeagueId, selectedSeasons)
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

// ─── Add manual season ─────────────────────────────────────────────────────
// POST /api/imports/manual-season
// Allows users to add a season with basic info (year, teams, champion) without a platform import
router.post('/manual-season', authenticate, async (req, res) => {
  try {
    const { leagueId, seasonYear, teams } = req.body
    if (!leagueId || !seasonYear || !teams || !Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: { message: 'leagueId, seasonYear, and teams array are required' } })
    }

    // Verify the user owns or is a member of this league
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId } },
    })
    if (!member) {
      return res.status(403).json({ error: { message: 'Not a member of this league' } })
    }

    const created = []
    for (const team of teams) {
      const record = await prisma.historicalSeason.upsert({
        where: {
          leagueId_seasonYear_ownerName: {
            leagueId,
            seasonYear: parseInt(seasonYear),
            ownerName: team.ownerName || team.teamName || `Team ${teams.indexOf(team) + 1}`,
          },
        },
        create: {
          leagueId,
          seasonYear: parseInt(seasonYear),
          teamName: team.teamName || team.ownerName || `Team ${teams.indexOf(team) + 1}`,
          ownerName: team.ownerName || team.teamName || `Team ${teams.indexOf(team) + 1}`,
          finalStanding: team.finalStanding || teams.indexOf(team) + 1,
          wins: team.wins || 0,
          losses: team.losses || 0,
          ties: team.ties || 0,
          pointsFor: team.pointsFor || 0,
          pointsAgainst: team.pointsAgainst || 0,
          playoffResult: team.playoffResult || null,
        },
        update: {
          teamName: team.teamName || undefined,
          finalStanding: team.finalStanding || undefined,
          wins: team.wins || undefined,
          losses: team.losses || undefined,
          ties: team.ties || undefined,
          pointsFor: team.pointsFor || undefined,
          pointsAgainst: team.pointsAgainst || undefined,
          playoffResult: team.playoffResult || undefined,
        },
      })
      created.push(record)
    }

    res.json({ success: true, count: created.length, seasonYear: parseInt(seasonYear) })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Delete a manual season ────────────────────────────────────────────────
// DELETE /api/imports/manual-season/:leagueId/:seasonYear
router.delete('/manual-season/:leagueId/:seasonYear', authenticate, async (req, res) => {
  try {
    const { leagueId, seasonYear } = req.params
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId } },
    })
    if (!member) {
      return res.status(403).json({ error: { message: 'Not a member of this league' } })
    }

    const deleted = await prisma.historicalSeason.deleteMany({
      where: { leagueId, seasonYear: parseInt(seasonYear), importId: null },
    })

    res.json({ success: true, deleted: deleted.count })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Delete historical season entries (bulk) ─────────────────────────────────
// POST /api/imports/historical-season/bulk-delete (commissioner only)
router.post('/historical-season/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: { message: 'ids array is required' } })
    }

    // Verify all entries belong to the same league and user is commissioner
    const entries = await prisma.historicalSeason.findMany({
      where: { id: { in: ids } },
      select: { id: true, leagueId: true },
    })
    if (entries.length === 0) return res.status(404).json({ error: { message: 'No entries found' } })

    const leagueIds = new Set(entries.map(e => e.leagueId))
    if (leagueIds.size > 1) return res.status(400).json({ error: { message: 'All entries must belong to the same league' } })

    const leagueId = entries[0].leagueId
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league || league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can delete history entries' } })
    }

    await prisma.historicalSeason.deleteMany({ where: { id: { in: ids } } })
    res.json({ success: true, deleted: ids.length })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Owner Aliases (commissioner name grouping) ─────────────────────────────
// GET /api/imports/owner-aliases/:leagueId
router.get('/owner-aliases/:leagueId', authenticate, async (req, res) => {
  try {
    const aliases = await prisma.ownerAlias.findMany({
      where: { leagueId: req.params.leagueId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ aliases })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// PUT /api/imports/owner-aliases/:leagueId (commissioner only)
router.put('/owner-aliases/:leagueId', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const { aliases } = req.body

    if (!Array.isArray(aliases)) {
      return res.status(400).json({ error: { message: 'aliases must be an array' } })
    }

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can manage owner aliases' } })
    }

    // Transaction: delete existing + create new
    await prisma.$transaction(async (tx) => {
      await tx.ownerAlias.deleteMany({ where: { leagueId } })

      const toCreate = aliases
        .filter(a => a.ownerName && a.canonicalName && (a.ownerName !== a.canonicalName || a.isActive === false))
        .map(a => ({
          leagueId,
          ownerName: a.ownerName,
          canonicalName: a.canonicalName,
          ownerUserId: a.ownerUserId || null,
          isActive: a.isActive !== false,
        }))

      if (toCreate.length > 0) {
        await tx.ownerAlias.createMany({ data: toCreate })
      }

      // Invalidate league stats cache so AI chatbot picks up new aliases
      await tx.leagueStatsCache.deleteMany({ where: { leagueId } })
    })

    const updated = await prisma.ownerAlias.findMany({
      where: { leagueId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ aliases: updated })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

module.exports = router
