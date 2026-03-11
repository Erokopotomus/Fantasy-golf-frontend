const express = require('express')
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
const { syncHoleScores, syncEspnIds, syncPlayerBios, aggregateHoleScoresToPerformance } = require('../services/espnSync')
const nflSync = require('../services/nflSync')

const router = express.Router()
const prisma = require('../lib/prisma.js')

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

// POST /api/sync/aggregate-hole-scores — Aggregate ESPN hole data into Performance + RoundScore
router.post('/aggregate-hole-scores', async (req, res) => {
  // Find current in-progress tournament
  const tournament = await prisma.tournament.findFirst({
    where: { status: 'IN_PROGRESS' },
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true },
  })
  if (!tournament) {
    return res.status(404).json({ error: 'No in-progress tournament found' })
  }
  await runSync('aggregate-hole-scores', () => aggregateHoleScoresToPerformance(tournament.id, prisma), res)
})

// POST /api/sync/espn-ids — Match ESPN athlete IDs to our players
router.post('/espn-ids', async (req, res) => {
  await runSync('espn-ids', () => syncEspnIds(prisma), res)
})

// POST /api/sync/espn-bios — Fetch headshots + bio data from ESPN
router.post('/espn-bios', async (req, res) => {
  await runSync('espn-bios', () => syncPlayerBios(prisma), res)
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

// POST /api/sync/clutch-metrics — Compute Clutch metrics for upcoming tournament
const clutchMetrics = require('../services/clutchMetrics')
router.post('/clutch-metrics', async (req, res) => {
  const { tournamentId } = req.body
  if (!tournamentId) {
    // Auto-detect next upcoming tournament with a field
    const next = await prisma.tournament.findFirst({
      where: { status: 'UPCOMING', performances: { some: {} } },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true },
    })
    if (!next) return res.status(404).json({ error: 'No upcoming tournament with field found' })
    return await runSync('clutch-metrics', () => clutchMetrics.computeForEvent(next.id, prisma), res)
  }
  await runSync('clutch-metrics', () => clutchMetrics.computeForEvent(tournamentId, prisma), res)
})

// POST /api/sync/course-history — Rebuild PlayerCourseHistory
const courseHistoryAggregator = require('../services/courseHistoryAggregator')
router.post('/course-history', async (req, res) => {
  await runSync('course-history', () => courseHistoryAggregator.aggregateAllCourseHistory(prisma), res)
})

// POST /api/sync/weather — Sync weather for upcoming tournaments
const { syncTournamentWeather } = require('../services/weatherSync')
router.post('/weather', async (req, res) => {
  await runSync('weather', () => syncTournamentWeather(prisma), res)
})

// ─── Tier 1 Public Data Source Endpoints (Phase 4E) ─────────────────────────

// POST /api/sync/espn-calendar — Match ESPN events to tournaments + backfill results
const espnCalendarSync = require('../services/espnCalendarSync')
router.post('/espn-calendar', async (req, res) => {
  await runSync('espn-calendar', () => espnCalendarSync.syncCalendar(prisma), res)
})

// POST /api/sync/owgr — Sync OWGR rankings (top 500)
const owgrSync = require('../services/owgrSync')
router.post('/owgr', async (req, res) => {
  await runSync('owgr', () => owgrSync.syncOwgrRankings(prisma), res)
})

// POST /api/sync/pga-tour-stats — Sync traditional stats from pgatour.com
const pgaTourSync = require('../services/pgaTourSync')
router.post('/pga-tour-stats', async (req, res) => {
  await runSync('pga-tour-stats', () => pgaTourSync.syncPgaTourStats(prisma), res)
})

// ─── Historical Backfill Endpoints ──────────────────────────────────────────

const historicalBackfill = require('../services/historicalBackfill')

// POST /api/sync/backfill-historical — Backfill historical results from DataGolf
// Body: { year: 2024 } or { years: [2023, 2024] }
router.post('/backfill-historical', async (req, res) => {
  const { year, years } = req.body
  if (years && Array.isArray(years)) {
    await runSync('backfill-historical', () => historicalBackfill.backfillMultipleYears(years, prisma), res)
  } else if (year) {
    await runSync(`backfill-${year}`, () => historicalBackfill.backfillYear(year, prisma), res)
  } else {
    res.status(400).json({ error: 'year or years[] is required' })
  }
})

// POST /api/sync/recalculate-stats — Recalculate all player career stats from Performance table
router.post('/recalculate-stats', async (req, res) => {
  await runSync('recalculate-stats', () => historicalBackfill.recalculatePlayerCareerStats(prisma), res)
})

// ─── DataGolf Historical SG Backfill ─────────────────────────────────────────

const dgHistorical = require('../services/datagolfHistoricalSync')

// POST /api/sync/datagolf-map-events — Map DataGolf event IDs to our tournaments
router.post('/datagolf-map-events', async (req, res) => {
  await runSync('datagolf-map-events', () => dgHistorical.mapDataGolfEvents(prisma), res)
})

// POST /api/sync/backfill-datagolf-sg — Backfill SG data from DataGolf historical rounds
// Body: { year?: number, years?: number[], force?: boolean }
router.post('/backfill-datagolf-sg', async (req, res) => {
  const { year, years, force } = req.body
  const options = { forceReprocess: !!force }
  if (years && Array.isArray(years)) options.years = years
  else if (year) options.year = year
  await runSync('backfill-datagolf-sg', () => dgHistorical.backfillAllSG(prisma, options), res)
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

// POST /api/sync/process-completed-weeks — Manually trigger fantasy scoring pipeline
router.post('/process-completed-weeks', async (req, res) => {
  const fantasyTracker = require('../services/fantasyTracker')
  try {
    const results = await fantasyTracker.processCompletedWeeks(prisma)
    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
