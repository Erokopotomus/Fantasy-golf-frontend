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
