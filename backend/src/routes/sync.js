const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const {
  syncPlayers,
  syncSchedule,
  syncFieldAndTeeTimesForTournament,
  syncLiveScoring,
  syncPreTournamentPredictions,
  syncFantasyProjections,
  syncTournamentResults,
} = require('../services/datagolfSync')
const { syncHoleScores } = require('../services/espnSync')
const nflSync = require('../services/nflSync')

const router = express.Router()
const prisma = new PrismaClient()

// In-memory sync status tracker
const syncStatus = {
  lastSyncs: {},
  errors: {},
}

// ─── Auth middleware: require JWT + admin secret ─────────────────────────────

function requireSyncAdmin(req, res, next) {
  const adminSecret = req.headers['x-sync-secret'] || req.headers['x-admin-secret']
  if (adminSecret && adminSecret === process.env.SYNC_ADMIN_SECRET) {
    return next()
  }
  return res.status(403).json({ error: 'Forbidden: invalid admin secret' })
}

// All sync routes require JWT auth + admin secret
router.use(authenticate)
router.use(requireSyncAdmin)

// ─── Helper to run a sync and track status ──────────────────────────────────

async function runSync(name, syncFn, res) {
  const start = Date.now()
  try {
    const result = await syncFn()
    const duration = Date.now() - start
    syncStatus.lastSyncs[name] = { time: new Date().toISOString(), duration, result }
    delete syncStatus.errors[name]
    res.json({ success: true, duration: `${duration}ms`, ...result })
  } catch (err) {
    const duration = Date.now() - start
    syncStatus.errors[name] = { time: new Date().toISOString(), message: err.message }
    console.error(`[Sync] ${name} failed:`, err.message)
    res.status(500).json({ error: err.message, duration: `${duration}ms` })
  }
}

// ─── Sync Endpoints ─────────────────────────────────────────────────────────

// POST /api/sync/players
router.post('/players', async (req, res) => {
  await runSync('players', () => syncPlayers(prisma), res)
})

// POST /api/sync/schedule
router.post('/schedule', async (req, res) => {
  await runSync('schedule', () => syncSchedule(prisma), res)
})

// POST /api/sync/tournament/:dgId/field
router.post('/tournament/:dgId/field', async (req, res) => {
  const { dgId } = req.params
  await runSync(`field-${dgId}`, () => syncFieldAndTeeTimesForTournament(dgId, prisma), res)
})

// POST /api/sync/tournament/:dgId/live
router.post('/tournament/:dgId/live', async (req, res) => {
  const { dgId } = req.params
  await runSync(`live-${dgId}`, () => syncLiveScoring(dgId, prisma), res)
})

// POST /api/sync/tournament/:dgId/predictions
router.post('/tournament/:dgId/predictions', async (req, res) => {
  const { dgId } = req.params
  await runSync(`predictions-${dgId}`, () => syncPreTournamentPredictions(dgId, prisma), res)
})

// POST /api/sync/tournament/:dgId/projections
router.post('/tournament/:dgId/projections', async (req, res) => {
  const { dgId } = req.params
  await runSync(`projections-${dgId}`, () => syncFantasyProjections(dgId, prisma), res)
})

// POST /api/sync/tournament/:dgId/finalize
router.post('/tournament/:dgId/finalize', async (req, res) => {
  const { dgId } = req.params
  await runSync(`finalize-${dgId}`, () => syncTournamentResults(dgId, prisma), res)
})

// POST /api/sync/tournament/:tournamentId/espn — Sync ESPN hole-by-hole scores
router.post('/tournament/:tournamentId/espn', async (req, res) => {
  const { tournamentId } = req.params
  await runSync(`espn-${tournamentId}`, () => syncHoleScores(tournamentId, prisma), res)
})

// ─── NFL Sync Endpoints ─────────────────────────────────────────────────────

// POST /api/sync/nfl/players
router.post('/nfl/players', async (req, res) => {
  await runSync('nfl-players', () => nflSync.syncPlayers(prisma), res)
})

// POST /api/sync/nfl/schedule
router.post('/nfl/schedule', async (req, res) => {
  const { season } = req.body
  await runSync('nfl-schedule', () => nflSync.syncSchedule(prisma, season), res)
})

// POST /api/sync/nfl/stats
router.post('/nfl/stats', async (req, res) => {
  const { season } = req.body
  await runSync('nfl-stats', () => nflSync.syncWeeklyStats(prisma, season), res)
})

// POST /api/sync/nfl/rosters
router.post('/nfl/rosters', async (req, res) => {
  const { season } = req.body
  await runSync('nfl-rosters', () => nflSync.syncRosters(prisma, season), res)
})

// POST /api/sync/nfl/backfill — Full season backfill (teams must be seeded first)
router.post('/nfl/backfill', async (req, res) => {
  const { season } = req.body
  if (!season) return res.status(400).json({ error: 'season is required' })
  await runSync(`nfl-backfill-${season}`, () => nflSync.backfillSeason(prisma, season), res)
})

// GET /api/sync/status
router.get('/status', async (req, res) => {
  // Find active tournament
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] } },
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true, datagolfId: true, status: true, startDate: true, currentRound: true },
  })

  res.json({
    lastSyncs: syncStatus.lastSyncs,
    errors: syncStatus.errors,
    activeTournament,
    healthy: Object.keys(syncStatus.errors).length === 0,
  })
})

module.exports = router
