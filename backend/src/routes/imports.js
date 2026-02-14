const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { authenticate, optionalAuth } = require('../middleware/auth')
const { notifyLeague, NOTIFICATION_TYPES } = require('../services/notificationService')
const { validateBody, sanitize } = require('../middleware/validate')
const sleeperImport = require('../services/sleeperImport')
const espnImport = require('../services/espnImport')
const yahooImport = require('../services/yahooImport')
const fantraxImport = require('../services/fantraxImport')
const mflImport = require('../services/mflImport')
const importHealthService = require('../services/importHealthService')

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
      // Return expired token — yahooFetch will get a 401 and retry via onTokenRefresh
      return stored.accessToken
    }
  }

  return stored.accessToken
}

/**
 * Build an onTokenRefresh callback for Yahoo API calls.
 * When yahooFetch gets a 401, it calls this to refresh and retry.
 */
function buildYahooRefreshCallback(userId) {
  return async () => {
    const { refreshYahooToken } = require('./yahooAuth')
    return await refreshYahooToken(userId)
  }
}

// POST /api/imports/yahoo/discover
router.post('/yahoo/discover', authenticate, validateLeagueId, async (req, res) => {
  try {
    const leagueId = sanitize(req.body.leagueId)
    const accessToken = await resolveYahooToken(req)
    if (!accessToken) return res.status(400).json({ error: { message: 'Yahoo not connected. Please authorize via Settings or provide an access token.' } })
    const onTokenRefresh = buildYahooRefreshCallback(req.user.id)
    const discovery = await yahooImport.discoverLeague(leagueId, accessToken, onTokenRefresh)
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
    const onTokenRefresh = buildYahooRefreshCallback(req.user.id)
    const result = await yahooImport.runFullImport(leagueId, req.user.id, prisma, accessToken, targetLeagueId, selectedSeasons, onTokenRefresh)
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
    // Exclude heavy JSONB fields (transactions, rosterData) to keep payload manageable
    const seasons = await prisma.historicalSeason.findMany({
      where: { leagueId: req.params.leagueId },
      orderBy: { seasonYear: 'desc' },
      select: {
        id: true,
        leagueId: true,
        importId: true,
        seasonYear: true,
        teamName: true,
        ownerName: true,
        ownerUserId: true,
        finalStanding: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        playoffResult: true,
        draftData: true,
        weeklyScores: true,
        awards: true,
      },
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

// ─── Owner Avatars (League Vault) ────────────────────────────────────────────
// GET /api/imports/owner-avatars/:leagueId
router.get('/owner-avatars/:leagueId', authenticate, async (req, res) => {
  try {
    const avatars = await prisma.ownerAvatar.findMany({
      where: { leagueId: req.params.leagueId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ avatars })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// PUT /api/imports/owner-avatar/:leagueId (commissioner only)
router.put('/owner-avatar/:leagueId', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const { ownerName, imageUrl } = req.body

    if (!ownerName || !imageUrl) {
      return res.status(400).json({ error: { message: 'ownerName and imageUrl are required' } })
    }

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can manage owner avatars' } })
    }

    const avatar = await prisma.ownerAvatar.upsert({
      where: { leagueId_ownerName: { leagueId, ownerName } },
      create: { leagueId, ownerName, imageUrl },
      update: { imageUrl },
    })

    res.json({ avatar })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// DELETE /api/imports/owner-avatar/:leagueId/:ownerName (commissioner only)
router.delete('/owner-avatar/:leagueId/:ownerName', authenticate, async (req, res) => {
  try {
    const { leagueId, ownerName } = req.params

    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can manage owner avatars' } })
    }

    await prisma.ownerAvatar.deleteMany({
      where: { leagueId, ownerName: decodeURIComponent(ownerName) },
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Import Health Check ────────────────────────────────────────────────────
// GET /api/imports/health/:leagueId
router.get('/health/:leagueId', authenticate, async (req, res) => {
  try {
    // Verify user is a member of the league
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId: req.params.leagueId } },
    })
    if (!member) {
      return res.status(403).json({ error: { message: 'Not a member of this league' } })
    }

    const report = await importHealthService.analyzeLeagueHealth(req.params.leagueId)
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Edit Historical Season Entry ───────────────────────────────────────────
// PUT /api/imports/historical-season/:id
router.put('/historical-season/:id', authenticate, async (req, res) => {
  try {
    const entry = await prisma.historicalSeason.findUnique({
      where: { id: req.params.id },
      select: { id: true, leagueId: true },
    })
    if (!entry) return res.status(404).json({ error: { message: 'Entry not found' } })

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: entry.leagueId }, select: { ownerId: true } })
    if (!league || league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can edit history entries' } })
    }

    // Whitelist editable fields
    const allowed = ['teamName', 'ownerName', 'wins', 'losses', 'ties', 'pointsFor', 'pointsAgainst', 'finalStanding', 'playoffResult']
    const data = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (['wins', 'losses', 'ties', 'finalStanding'].includes(key)) {
          data[key] = parseInt(req.body[key]) || 0
        } else if (['pointsFor', 'pointsAgainst'].includes(key)) {
          data[key] = parseFloat(req.body[key]) || 0
        } else {
          data[key] = req.body[key]
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: { message: 'No valid fields to update' } })
    }

    const updated = await prisma.historicalSeason.update({
      where: { id: req.params.id },
      data,
    })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Create Historical Season Entry (add a team to a season) ────────────────
// POST /api/imports/historical-season
router.post('/historical-season', authenticate, async (req, res) => {
  try {
    const { leagueId, seasonYear, ownerName, teamName, wins, losses, ties, pointsFor, pointsAgainst, finalStanding, playoffResult } = req.body
    if (!leagueId || !seasonYear || !ownerName) {
      return res.status(400).json({ error: { message: 'leagueId, seasonYear, and ownerName are required' } })
    }

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league || league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can add history entries' } })
    }

    const record = await prisma.historicalSeason.create({
      data: {
        leagueId,
        seasonYear: parseInt(seasonYear),
        ownerName,
        teamName: teamName || ownerName,
        wins: parseInt(wins) || 0,
        losses: parseInt(losses) || 0,
        ties: parseInt(ties) || 0,
        pointsFor: parseFloat(pointsFor) || 0,
        pointsAgainst: parseFloat(pointsAgainst) || 0,
        finalStanding: parseInt(finalStanding) || 0,
        playoffResult: playoffResult || null,
      },
    })

    res.json(record)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: { message: 'A team with that owner name already exists for this season' } })
    }
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Re-import a single season from Yahoo ───────────────────────────────────
// POST /api/imports/reimport-season
// Deletes existing bad data for a year and re-imports from Yahoo.
router.post('/reimport-season', authenticate, async (req, res) => {
  try {
    const { leagueId, seasonYear } = req.body
    if (!leagueId || !seasonYear) {
      return res.status(400).json({ error: { message: 'leagueId and seasonYear are required' } })
    }

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league || league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can re-import seasons' } })
    }

    // Find the import record to get the source platform and league key
    const importRecord = await prisma.leagueImport.findFirst({
      where: { clutchLeagueId: leagueId, sourcePlatform: 'yahoo', status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
    })
    if (!importRecord) {
      return res.status(400).json({ error: { message: 'No Yahoo import found for this league. Re-import is only available for Yahoo-imported leagues.' } })
    }

    // Find the league key for this specific year from stored raw data
    const rawRecord = await prisma.rawProviderData.findFirst({
      where: {
        provider: 'yahoo',
        dataType: 'standings',
        eventRef: { contains: `.l.` },
      },
      select: { eventRef: true, payload: true },
      orderBy: { ingestedAt: 'desc' },
    })

    // Search all standings raw data for the one matching this year
    const allStandings = await prisma.rawProviderData.findMany({
      where: { provider: 'yahoo', dataType: 'standings' },
      select: { eventRef: true, payload: true },
    })

    let leagueKey = null
    for (const raw of allStandings) {
      const payload = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
      const leagueMeta = payload?.fantasy_content?.league
      const meta = Array.isArray(leagueMeta) ? leagueMeta[0] : leagueMeta
      if (parseInt(meta?.season) === parseInt(seasonYear)) {
        leagueKey = raw.eventRef
        break
      }
    }

    if (!leagueKey) {
      return res.status(400).json({ error: { message: `No stored data found for the ${seasonYear} season. Try a full re-import from Yahoo.` } })
    }

    // Get Yahoo access token
    const accessToken = await resolveYahooToken(req)
    if (!accessToken) {
      return res.status(400).json({ error: { message: 'Yahoo not connected. Please re-authorize via Settings.' } })
    }
    const onTokenRefresh = buildYahooRefreshCallback(req.user.id)

    // Delete existing bad data for this year
    const deleted = await prisma.historicalSeason.deleteMany({
      where: { leagueId, seasonYear: parseInt(seasonYear) },
    })
    console.log(`[ReimportSeason] Deleted ${deleted.count} existing records for ${seasonYear}`)

    // Re-import the season from Yahoo
    const seasonData = await yahooImport.importSeason(leagueKey, parseInt(seasonYear), accessToken, onTokenRefresh)
    console.log(`[ReimportSeason] Got ${seasonData.rosters.length} teams from Yahoo for ${seasonYear}`)

    // Get importing user info for owner matching
    const importingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true },
    })
    const userDisplayName = (importingUser?.name || '').toLowerCase()

    let matchedTeamKey = null
    if (userDisplayName) {
      const matched = seasonData.rosters.find(r =>
        r.ownerName?.toLowerCase().includes(userDisplayName) ||
        userDisplayName.includes(r.ownerName?.toLowerCase() || '')
      )
      if (matched) matchedTeamKey = matched.teamKey
    }

    // Save all teams — with per-team error handling so one failure doesn't lose everything
    const saved = []
    const errors = []
    for (const roster of seasonData.rosters) {
      try {
        const standing = seasonData.rosters.indexOf(roster) + 1
        const playoffResult = seasonData.playoffResults[roster.teamId] || null
        const isUsersTeam = roster.teamKey === matchedTeamKey
        const ownerUserId = isUsersTeam ? req.user.id : null
        const ownerName = roster.ownerName || roster.teamName

        await prisma.historicalSeason.create({
          data: {
            leagueId,
            importId: importRecord.id,
            seasonYear: parseInt(seasonYear),
            teamName: roster.teamName,
            ownerName,
            ownerUserId,
            finalStanding: standing,
            wins: roster.wins,
            losses: roster.losses,
            ties: roster.ties,
            pointsFor: roster.pointsFor,
            pointsAgainst: roster.pointsAgainst,
            playoffResult,
            draftData: seasonData.draftData,
            rosterData: {},
            weeklyScores: seasonData.matchups
              ? buildWeeklyScoresForTeam(seasonData.matchups, roster.teamId)
              : [],
            transactions: seasonData.transactions,
            settings: {},
          },
        })
        saved.push(ownerName)
        console.log(`[ReimportSeason] Saved team: ${ownerName} (${roster.wins}-${roster.losses})`)
      } catch (teamErr) {
        errors.push({ ownerName: roster.ownerName, error: teamErr.message })
        console.error(`[ReimportSeason] Failed to save team ${roster.ownerName}:`, teamErr.message)
      }
    }

    res.json({
      success: true,
      seasonYear: parseInt(seasonYear),
      teamsImported: saved.length,
      teamNames: saved,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[ReimportSeason] Error:', err.message)
    res.status(500).json({ error: { message: err.message } })
  }
})

// POST /api/imports/repair-weekly-scores
// Re-fetches all matchup data from Yahoo and backfills weeklyScores for every season.
router.post('/repair-weekly-scores', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.body
    if (!leagueId) {
      return res.status(400).json({ error: { message: 'leagueId is required' } })
    }

    // Commissioner check
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } })
    if (!league || league.ownerId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Only the commissioner can repair data' } })
    }

    // Find all standings raw data to get league keys per year
    const allStandings = await prisma.rawProviderData.findMany({
      where: { provider: 'yahoo', dataType: 'standings' },
      select: { eventRef: true, payload: true },
    })

    // Map year -> leagueKey from raw standings
    const yearToKey = {}
    for (const raw of allStandings) {
      const payload = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
      const leagueMeta = payload?.fantasy_content?.league
      const meta = Array.isArray(leagueMeta) ? leagueMeta[0] : leagueMeta
      if (meta?.season) {
        yearToKey[parseInt(meta.season)] = raw.eventRef
      }
    }

    // Get all seasons for this league
    const seasons = await prisma.historicalSeason.findMany({
      where: { leagueId },
      select: { id: true, seasonYear: true, teamName: true, ownerName: true, weeklyScores: true },
    })

    // Group by year
    const byYear = {}
    for (const s of seasons) {
      if (!byYear[s.seasonYear]) byYear[s.seasonYear] = []
      byYear[s.seasonYear].push(s)
    }

    // Get Yahoo access token
    const accessToken = await resolveYahooToken(req)
    if (!accessToken) {
      return res.status(400).json({ error: { message: 'Yahoo not connected. Please re-authorize via Settings.' } })
    }
    const onTokenRefresh = buildYahooRefreshCallback(req.user.id)

    // For each year, fetch matchups and update weeklyScores
    const results = []
    const years = Object.keys(byYear).map(Number).sort()
    for (const year of years) {
      const leagueKey = yearToKey[year]
      if (!leagueKey) {
        results.push({ year, status: 'skipped', reason: 'No league key found' })
        continue
      }

      try {
        // Fetch all matchup weeks from Yahoo
        const matchups = await yahooImport.fetchAllMatchups(leagueKey, year, accessToken, onTokenRefresh)
        const weekCount = Object.keys(matchups).length

        if (weekCount === 0) {
          results.push({ year, status: 'skipped', reason: 'No matchup data from Yahoo' })
          continue
        }

        // Find team IDs — we need to match HistoricalSeason records to Yahoo teamIds
        // Use the raw standings data to map ownerName/teamName -> teamId
        const rawStandings = allStandings.find(r => r.eventRef === leagueKey)
        const standingsPayload = typeof rawStandings?.payload === 'string'
          ? JSON.parse(rawStandings.payload) : rawStandings?.payload
        const lgData = standingsPayload?.fantasy_content?.league
        const standingsArr = Array.isArray(lgData) ? lgData[1]?.standings : lgData?.standings
        const teamsObj = standingsArr?.[0]?.teams || standingsArr?.teams || {}

        // Build teamName -> teamId map
        const nameToTeamId = {}
        for (const entry of Object.values(teamsObj)) {
          const teamArr = entry?.team
          if (!teamArr || !Array.isArray(teamArr)) continue
          const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
          const meta = {}
          for (const f of metaFields) {
            if (f && typeof f === 'object') Object.assign(meta, f)
          }
          if (meta.team_id && meta.name) {
            nameToTeamId[meta.name] = meta.team_id
          }
        }

        // Update each team's weeklyScores
        let updatedCount = 0
        for (const season of byYear[year]) {
          const teamId = nameToTeamId[season.teamName] || nameToTeamId[season.ownerName]
          if (!teamId) continue

          const weeklyScores = buildWeeklyScoresForTeam(matchups, teamId)
          if (weeklyScores.length > 0) {
            await prisma.historicalSeason.update({
              where: { id: season.id },
              data: { weeklyScores },
            })
            updatedCount++
          }
        }

        results.push({ year, status: 'repaired', weeks: weekCount, teamsUpdated: updatedCount })
        console.log(`[RepairWeekly] ${year}: ${weekCount} weeks, ${updatedCount} teams updated`)
      } catch (err) {
        results.push({ year, status: 'error', reason: err.message })
        console.error(`[RepairWeekly] ${year} error:`, err.message)
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    console.error('[RepairWeekly] Error:', err.message)
    res.status(500).json({ error: { message: err.message } })
  }
})

// Helper: build weekly scores for a team from matchup data
function buildWeeklyScoresForTeam(matchups, teamId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const game = games.find(g =>
      String(g.homeTeamId) === String(teamId) || String(g.awayTeamId) === String(teamId)
    )
    if (game) {
      const isHome = String(game.homeTeamId) === String(teamId)
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
        isPlayoffs: game.isPlayoffs || false,
        isConsolation: game.isConsolation || false,
      })
    }
  }
  return scores
}

// ─── Public Vault Data (for invite landing page) ────────────────────────────
// GET /api/imports/vault-public/:inviteCode
// Public endpoint (optionalAuth) — returns lightweight vault data for the landing page
router.get('/vault-public/:inviteCode', optionalAuth, async (req, res) => {
  try {
    const { inviteCode } = req.params

    // Look up league by invite code
    const league = await prisma.league.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, inviteCode: true, ownerId: true },
    })
    if (!league) return res.status(404).json({ error: 'League not found' })

    // Fetch lightweight historical seasons (omit heavy JSONB fields)
    const seasons = await prisma.historicalSeason.findMany({
      where: { leagueId: league.id },
      select: {
        id: true,
        seasonYear: true,
        teamName: true,
        ownerName: true,
        ownerUserId: true,
        finalStanding: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        playoffResult: true,
      },
      orderBy: { seasonYear: 'asc' },
    })

    // Fetch owner aliases
    const aliases = await prisma.ownerAlias.findMany({
      where: { leagueId: league.id },
      select: {
        ownerName: true,
        canonicalName: true,
        ownerUserId: true,
        isActive: true,
      },
    })

    // If user is authenticated, check if they've already claimed an owner alias
    let currentUserClaim = null
    if (req.user) {
      const claimedAlias = aliases.find(a => a.ownerUserId === req.user.id)
      if (claimedAlias) {
        currentUserClaim = { canonicalName: claimedAlias.canonicalName }
      }
    }

    res.json({ league, seasons, aliases, currentUserClaim })
  } catch (err) {
    console.error('Vault public data error:', err)
    res.status(500).json({ error: 'Failed to load vault data' })
  }
})

// ─── Claim Owner Identity ────────────────────────────────────────────────────
// POST /api/imports/vault-claim
// Authenticated — links a user to an owner identity in the vault
router.post('/vault-claim', authenticate, async (req, res) => {
  try {
    const { inviteCode, canonicalName } = req.body
    if (!inviteCode || !canonicalName) {
      return res.status(400).json({ error: 'inviteCode and canonicalName are required' })
    }

    // Look up league by invite code
    const league = await prisma.league.findUnique({
      where: { inviteCode },
      select: { id: true, name: true },
    })
    if (!league) return res.status(404).json({ error: 'League not found' })

    // Verify canonical name exists in aliases
    const matchingAliases = await prisma.ownerAlias.findMany({
      where: { leagueId: league.id, canonicalName },
    })
    if (matchingAliases.length === 0) {
      return res.status(404).json({ error: 'Owner not found in this league' })
    }

    // Check if already claimed by someone else
    const claimedByOther = matchingAliases.find(a => a.ownerUserId && a.ownerUserId !== req.user.id)
    if (claimedByOther) {
      return res.status(409).json({ error: 'This owner has already been claimed by another user' })
    }

    // Already claimed by this user — idempotent success
    const alreadyClaimed = matchingAliases.find(a => a.ownerUserId === req.user.id)
    if (alreadyClaimed) {
      return res.json({ success: true, leagueId: league.id, canonicalName })
    }

    // Get all raw names that map to this canonical name
    const rawNames = matchingAliases.map(a => a.ownerName)

    // Transaction: claim aliases + historical seasons + auto-join league
    await prisma.$transaction(async (tx) => {
      // Update all alias rows for this canonical name
      await tx.ownerAlias.updateMany({
        where: { leagueId: league.id, canonicalName },
        data: { ownerUserId: req.user.id },
      })

      // Update historical seasons for matching raw owner names
      await tx.historicalSeason.updateMany({
        where: {
          leagueId: league.id,
          ownerName: { in: rawNames },
        },
        data: { ownerUserId: req.user.id },
      })

      // Auto-join league if not already a member
      const existingMember = await tx.leagueMember.findFirst({
        where: { leagueId: league.id, userId: req.user.id },
      })
      if (!existingMember) {
        await tx.leagueMember.create({
          data: {
            leagueId: league.id,
            userId: req.user.id,
            role: 'MEMBER',
          },
        })
      }
    })

    res.json({ success: true, leagueId: league.id, canonicalName })
  } catch (err) {
    console.error('Vault claim error:', err)
    res.status(500).json({ error: 'Failed to claim owner identity' })
  }
})

// ─── Notify League Members About Vault ───────────────────────────────────────
// POST /api/imports/vault-notify
// Commissioner-only — sends in-app notification to all league members
router.post('/vault-notify', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.body
    if (!leagueId) return res.status(400).json({ error: 'leagueId is required' })

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, ownerId: true },
    })
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the commissioner can send vault notifications' })
    }

    // Get league members (exclude commissioner)
    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      select: { userId: true },
    })
    const memberCount = members.filter(m => m.userId !== req.user.id).length

    if (memberCount === 0) {
      return res.json({ sent: 0, message: 'No other league members to notify' })
    }

    // Send notification to all members
    await notifyLeague(leagueId, {
      type: NOTIFICATION_TYPES.LEAGUE_INVITE,
      title: 'League Vault is ready!',
      message: `${req.user.name} unlocked the ${league.name} League Vault. See your all-time stats and rankings.`,
      actionUrl: `/leagues/${leagueId}/vault`,
      data: { leagueId, type: 'vault_share' },
    }, [req.user.id], prisma)

    res.json({ sent: memberCount })
  } catch (err) {
    console.error('Vault notify error:', err)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

module.exports = router
