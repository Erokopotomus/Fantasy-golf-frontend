const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cron = require('node-cron')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const leagueRoutes = require('./routes/leagues')
const playerRoutes = require('./routes/players')
const draftRoutes = require('./routes/drafts')
const teamRoutes = require('./routes/teams')
const tradeRoutes = require('./routes/trades')
const tournamentRoutes = require('./routes/tournaments')
const notificationRoutes = require('./routes/notifications')
const searchRoutes = require('./routes/search')
const syncRoutes = require('./routes/sync')
const analyticsRoutes = require('./routes/analytics')
const positionRoutes = require('./routes/positions')
const playerTagRoutes = require('./routes/playerTags')
const rosterSlotRoutes = require('./routes/rosterSlots')
const managerAnalyticsRoutes = require('./routes/managerAnalytics')
const waiverRoutes = require('./routes/waivers')
const draftHistoryRoutes = require('./routes/draftHistory')
const adminRoutes = require('./routes/admin')
const predictionRoutes = require('./routes/predictions')
const importRoutes = require('./routes/imports')
const courseRoutes = require('./routes/courses')
const waitlistRoutes = require('./routes/waitlist')
const nflRoutes = require('./routes/nfl')
const feedRoutes = require('./routes/feed')
const newsRoutes = require('./routes/news')
const yahooAuthRoutes = require('./routes/yahooAuth')
const draftDollarsRouter = require('./routes/draftDollars')

const { authLimiter, apiLimiter, heavyLimiter } = require('./middleware/rateLimiter')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)
      if (origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    methods: ['GET', 'POST']
  }
})

// CORS - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://clutch-pied.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean)

// Middleware
app.use(helmet())
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    // Allow any localhost port for development
    if (origin.includes('localhost')) {
      return callback(null, true)
    }
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }
    // Allow custom domain
    if (origin.includes('clutchfantasysports.com')) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'), false)
  },
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Make io accessible in routes and globally for notificationService
app.set('io', io)
global.io = io

// Rate limiting
app.use('/api/auth', authLimiter)
app.use('/api/', apiLimiter)
app.use('/api/imports', heavyLimiter)
app.use('/api/sync', heavyLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/leagues', leagueRoutes)
app.use('/api/players', playerRoutes)
app.use('/api/drafts', draftRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/trades', tradeRoutes)
app.use('/api/tournaments', tournamentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api', positionRoutes)
app.use('/api', playerTagRoutes)
app.use('/api', rosterSlotRoutes)
app.use('/api/managers', managerAnalyticsRoutes)
app.use('/api/leagues', waiverRoutes)
app.use('/api/draft-history', draftHistoryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/imports', importRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/waitlist', waitlistRoutes)
app.use('/api/nfl', nflRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/auth', yahooAuthRoutes)
app.use('/api/leagues', draftDollarsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// One-time seed endpoint (remove after seeding)
app.post('/api/seed', async (req, res) => {
  const { secret } = req.body
  if (secret !== process.env.SEED_SECRET && secret !== 'clutch-seed-2025') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { execSync } = require('child_process')
    execSync('npm run db:seed', { stdio: 'inherit', cwd: process.cwd() })
    res.json({ success: true, message: 'Database seeded successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Socket.IO connection handling — parse JWT for user room
const jwt = require('jsonwebtoken')

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Auto-join user-specific room if authenticated
  const token = socket.handshake.auth?.token
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId || decoded.id
      if (socket.userId) {
        socket.join(`user-${socket.userId}`)
        console.log(`Socket ${socket.id} joined user-${socket.userId}`)
      }
    } catch (err) {
      console.log(`Socket ${socket.id} invalid token — no user room`)
    }
  }

  // Join league room
  socket.on('join-league', (leagueId) => {
    socket.join(`league-${leagueId}`)
    console.log(`Socket ${socket.id} joined league-${leagueId}`)
  })

  // Join draft room
  socket.on('join-draft', (draftId) => {
    socket.join(`draft-${draftId}`)
    console.log(`Socket ${socket.id} joined draft-${draftId}`)
  })

  // Leave rooms
  socket.on('leave-league', (leagueId) => {
    socket.leave(`league-${leagueId}`)
    console.log(`Socket ${socket.id} left league-${leagueId}`)
  })

  socket.on('leave-draft', (draftId) => {
    socket.leave(`draft-${draftId}`)
    console.log(`Socket ${socket.id} left draft-${draftId}`)
  })

  // Chat message
  socket.on('chat-message', async (data) => {
    io.to(`league-${data.leagueId}`).emit('new-message', data)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)

  // ─── Cron Jobs for DataGolf Sync ────────────────────────────────────────
  if (process.env.DATAGOLF_API_KEY && process.env.DATAGOLF_API_KEY !== 'your_key_here') {
    const { PrismaClient } = require('@prisma/client')
    const cronPrisma = new PrismaClient()
    const sync = require('./services/datagolfSync')

    /** Find the active or next upcoming tournament datagolfId */
    async function getActiveTournamentDgId() {
      const t = await cronPrisma.tournament.findFirst({
        where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] }, datagolfId: { not: null } },
        orderBy: { startDate: 'asc' },
        select: { datagolfId: true, status: true, startDate: true },
      })
      return t
    }

    function cronLog(job, msg) {
      console.log(`[Cron:${job}] ${new Date().toISOString()} — ${msg}`)
    }

    // Daily 6:00 AM ET — Sync player rankings
    cron.schedule('0 6 * * *', async () => {
      cronLog('players', 'Starting player sync')
      try {
        const result = await sync.syncPlayers(cronPrisma)
        cronLog('players', `Done: ${result.total} players`)
      } catch (e) { cronLog('players', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Weekly Monday 5:00 AM ET — Sync tournament schedule
    cron.schedule('0 5 * * 1', async () => {
      cronLog('schedule', 'Starting schedule sync')
      try {
        const result = await sync.syncSchedule(cronPrisma)
        cronLog('schedule', `Done: ${result.total} events`)
      } catch (e) { cronLog('schedule', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Daily 7:00 AM ET — Sync field updates (Thu-Sun = event days)
    cron.schedule('0 7 * * 4,5,6,0', async () => {
      const t = await getActiveTournamentDgId()
      if (!t?.datagolfId) return cronLog('field', 'No active tournament')
      cronLog('field', `Syncing field for ${t.datagolfId}`)
      try {
        const result = await sync.syncFieldAndTeeTimesForTournament(t.datagolfId, cronPrisma)
        cronLog('field', `Done: ${result.playersInField} players`)
      } catch (e) { cronLog('field', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Tuesday 8:00 PM ET — Early field sync (PGA fields usually published Tue evening)
    cron.schedule('0 20 * * 2', async () => {
      const t = await cronPrisma.tournament.findFirst({
        where: { status: 'UPCOMING', datagolfId: { not: null } },
        orderBy: { startDate: 'asc' },
        select: { datagolfId: true },
      })
      if (!t?.datagolfId) return cronLog('earlyField', 'No upcoming tournament')
      cronLog('earlyField', `Tue 8PM — Syncing field for ${t.datagolfId}`)
      try {
        const result = await sync.syncFieldAndTeeTimesForTournament(t.datagolfId, cronPrisma)
        cronLog('earlyField', `Done: ${result.playersInField} players`)
      } catch (e) { cronLog('earlyField', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Wednesday 8:00 AM ET — Catch late field updates
    cron.schedule('0 8 * * 3', async () => {
      const t = await cronPrisma.tournament.findFirst({
        where: { status: 'UPCOMING', datagolfId: { not: null } },
        orderBy: { startDate: 'asc' },
        select: { datagolfId: true },
      })
      if (!t?.datagolfId) return cronLog('earlyField', 'No upcoming tournament')
      cronLog('earlyField', `Wed 8AM — Syncing field for ${t.datagolfId}`)
      try {
        const result = await sync.syncFieldAndTeeTimesForTournament(t.datagolfId, cronPrisma)
        cronLog('earlyField', `Done: ${result.playersInField} players`)
      } catch (e) { cronLog('earlyField', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Wed + Thu 6:00 AM ET — Pre-tournament predictions
    cron.schedule('0 6 * * 3,4', async () => {
      const t = await getActiveTournamentDgId()
      if (!t?.datagolfId) return cronLog('predictions', 'No active tournament')
      cronLog('predictions', `Syncing predictions for ${t.datagolfId}`)
      try {
        const result = await sync.syncPreTournamentPredictions(t.datagolfId, cronPrisma)
        cronLog('predictions', `Done: ${result.predictions} players`)
      } catch (e) { cronLog('predictions', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Every 5 min Thu-Sun — Live scoring (only when tournament in progress)
    cron.schedule('*/5 * * * 4,5,6,0', async () => {
      const t = await getActiveTournamentDgId()
      if (!t || t.status !== 'IN_PROGRESS') return
      cronLog('live', `Syncing live scoring for ${t.datagolfId}`)
      try {
        const result = await sync.syncLiveScoring(t.datagolfId, cronPrisma)
        cronLog('live', `Done: ${result.updated} players`)
      } catch (e) { cronLog('live', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Every 5 min Thu-Sun — ESPN hole-by-hole scores (only when tournament in progress)
    const espnSync = require('./services/espnSync')
    cron.schedule('*/5 * * * 4,5,6,0', async () => {
      const t = await cronPrisma.tournament.findFirst({
        where: { status: 'IN_PROGRESS' },
        orderBy: { startDate: 'asc' },
        select: { id: true },
      })
      if (!t) return
      cronLog('espn', `Syncing ESPN hole scores for ${t.id}`)
      try {
        const result = await espnSync.syncHoleScores(t.id, cronPrisma)
        cronLog('espn', `Done: ${result.matched} players, ${result.holes} holes`)
      } catch (e) { cronLog('espn', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Tuesday 4:00 AM ET — ESPN ID sync (after Sunday finalize + Monday DataGolf sync)
    cron.schedule('0 4 * * 2', async () => {
      cronLog('espn-ids', 'Starting ESPN ID sync')
      try {
        const result = await espnSync.syncEspnIds(cronPrisma)
        cronLog('espn-ids', `Done: ${result.matched} matched, ${result.updated} updated`)
      } catch (e) { cronLog('espn-ids', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Tuesday 4:30 AM ET — ESPN player bios (after ESPN IDs are populated)
    cron.schedule('30 4 * * 2', async () => {
      cronLog('espn-bios', 'Starting ESPN player bio sync')
      try {
        const result = await espnSync.syncPlayerBios(cronPrisma)
        cronLog('espn-bios', `Done: ${result.fetched} fetched, ${result.updated} updated`)
      } catch (e) { cronLog('espn-bios', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Wed 6:00 AM ET — Fantasy projections
    cron.schedule('0 6 * * 3', async () => {
      const t = await getActiveTournamentDgId()
      if (!t?.datagolfId) return cronLog('projections', 'No active tournament')
      cronLog('projections', `Syncing projections for ${t.datagolfId}`)
      try {
        const result = await sync.syncFantasyProjections(t.datagolfId, cronPrisma)
        cronLog('projections', `Done: DK=${result.draftkings}, FD=${result.fanduel}`)
      } catch (e) { cronLog('projections', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Sunday 10:00 PM ET — Finalize tournament
    cron.schedule('0 22 * * 0', async () => {
      const t = await getActiveTournamentDgId()
      if (!t || t.status !== 'IN_PROGRESS') return cronLog('finalize', 'No in-progress tournament')
      cronLog('finalize', `Finalizing ${t.datagolfId}`)
      try {
        const result = await sync.syncTournamentResults(t.datagolfId, cronPrisma)
        cronLog('finalize', `Done: ${result.finalized} players finalized`)
      } catch (e) { cronLog('finalize', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Sunday 10:15 PM ET — Auto-resolve predictions (after finalize, before fantasy scoring)
    const predictionService = require('./services/predictionService')
    cron.schedule('15 22 * * 0', async () => {
      cronLog('predictions-resolve', 'Auto-resolving tournament predictions')
      try {
        // Find the tournament that just finalized
        const t = await cronPrisma.tournament.findFirst({
          where: { status: 'COMPLETED' },
          orderBy: { endDate: 'desc' },
          select: { id: true, name: true },
        })
        if (!t) return cronLog('predictions-resolve', 'No recently completed tournament')

        const performances = await cronPrisma.performance.findMany({
          where: { tournamentId: t.id },
        })
        const perfMap = {}
        for (const p of performances) { perfMap[p.playerId] = p }

        const results = await predictionService.resolveEventPredictions(
          t.id,
          (prediction) => {
            const perf = perfMap[prediction.subjectPlayerId]
            if (!perf) return { outcome: 'VOIDED', accuracyScore: null }
            if (prediction.predictionType === 'player_benchmark') {
              return predictionService.resolveGolfBenchmark(prediction, perf)
            }
            return { outcome: 'VOIDED', accuracyScore: null }
          },
          cronPrisma
        )
        cronLog('predictions-resolve', `Done: ${results.resolved} resolved for ${t.name}`)
      } catch (e) { cronLog('predictions-resolve', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Sunday 10:30 PM ET — Fantasy scoring + weekly results (after finalize)
    const fantasyTracker = require('./services/fantasyTracker')
    cron.schedule('30 22 * * 0', async () => {
      cronLog('fantasy', 'Processing completed fantasy weeks')
      try {
        const results = await fantasyTracker.processCompletedWeeks(cronPrisma)
        if (results.length === 0) {
          cronLog('fantasy', 'No unscored weeks to process')
        } else {
          for (const r of results) {
            cronLog('fantasy', `${r.weekName}: ${r.scored} scores, ${r.snapped} snapshots, ${r.computed} results`)
          }
        }
      } catch (e) { cronLog('fantasy', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Wednesday 12:00 PM ET — Process waiver claims
    const { processAllWaivers } = require('./services/waiverProcessor')
    cron.schedule('0 12 * * 3', async () => {
      cronLog('waivers', 'Processing waiver claims')
      try {
        const results = await processAllWaivers(cronPrisma)
        if (results.length === 0) {
          cronLog('waivers', 'No pending claims')
        } else {
          for (const r of results) {
            cronLog('waivers', `League ${r.leagueId}: ${r.won} won, ${r.lost} lost, ${r.invalid} invalid`)
          }
        }
      } catch (e) { cronLog('waivers', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Every 5 min — Fantasy week status transitions (UPCOMING→LOCKED, LOCKED→IN_PROGRESS)
    cron.schedule('*/5 * * * *', async () => {
      try {
        const now = new Date()

        // Transition UPCOMING → LOCKED when tournament starts
        const upcomingWeeks = await cronPrisma.fantasyWeek.findMany({
          where: { status: 'UPCOMING' },
          include: { tournament: { select: { id: true, startDate: true, status: true } } },
        })
        for (const week of upcomingWeeks) {
          const lockTime = week.tournament?.startDate || week.startDate
          if (lockTime && now >= new Date(lockTime)) {
            await cronPrisma.fantasyWeek.update({
              where: { id: week.id },
              data: { status: 'LOCKED' },
            })
            cronLog('weekTransition', `${week.name}: UPCOMING → LOCKED`)

            // Snapshot lineups at lock time
            try {
              await fantasyTracker.snapshotLineups(week.id, cronPrisma)
              cronLog('weekTransition', `Lineups snapshotted for ${week.name}`)
            } catch (snapErr) {
              cronLog('weekTransition', `Lineup snapshot failed: ${snapErr.message}`)
            }
          }
        }

        // Transition LOCKED → IN_PROGRESS when tournament is IN_PROGRESS
        const lockedWeeks = await cronPrisma.fantasyWeek.findMany({
          where: { status: 'LOCKED' },
          include: { tournament: { select: { id: true, status: true } } },
        })
        for (const week of lockedWeeks) {
          if (week.tournament?.status === 'IN_PROGRESS') {
            await cronPrisma.fantasyWeek.update({
              where: { id: week.id },
              data: { status: 'IN_PROGRESS' },
            })
            cronLog('weekTransition', `${week.name}: LOCKED → IN_PROGRESS`)
          }
        }
      } catch (e) { cronLog('weekTransition', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Monday 3:00 AM ET — Clutch Manager Rating recompute (after metrics)
    const clutchRatingEngine = require('./services/clutchRatingEngine')
    cron.schedule('0 3 * * 1', async () => {
      cronLog('clutchRating', 'Starting weekly Clutch Rating recompute')
      try {
        const result = await clutchRatingEngine.recomputeAll(cronPrisma)
        cronLog('clutchRating', `Done: ${result.computed} computed, ${result.skipped} skipped`)
      } catch (e) { cronLog('clutchRating', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Monday 2:30 AM ET — Clutch Metrics weekly recompute (after analytics refresh)
    const clutchMetrics = require('./services/clutchMetrics')
    cron.schedule('30 2 * * 1', async () => {
      cronLog('clutchMetrics', 'Starting weekly recompute')
      try {
        const result = await clutchMetrics.recomputeAll(cronPrisma)
        cronLog('clutchMetrics', `Done: ${result.computed} computed, ${result.skipped} skipped`)
      } catch (e) { cronLog('clutchMetrics', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Wednesday 7:30 AM ET — Clutch Metrics for upcoming tournament field (after field sync at 7AM)
    cron.schedule('30 7 * * 3', async () => {
      const t = await getActiveTournamentDgId()
      if (!t?.datagolfId) return cronLog('clutchMetrics-event', 'No active tournament')
      const tournament = await cronPrisma.tournament.findFirst({
        where: { datagolfId: String(t.datagolfId) },
        select: { id: true },
      })
      if (!tournament) return cronLog('clutchMetrics-event', 'Tournament not found in DB')
      cronLog('clutchMetrics-event', `Computing metrics for ${t.datagolfId}`)
      try {
        const result = await clutchMetrics.computeForEvent(tournament.id, cronPrisma)
        cronLog('clutchMetrics-event', `Done: ${result.computed} players`)
      } catch (e) { cronLog('clutchMetrics-event', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Sunday 4:00 AM ET — Raw provider data cleanup (> 90 days)
    cron.schedule('0 4 * * 0', async () => {
      cronLog('rawCleanup', 'Cleaning up old raw provider data')
      try {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 90)
        const result = await cronPrisma.rawProviderData.deleteMany({
          where: { ingestedAt: { lt: cutoff } },
        })
        cronLog('rawCleanup', `Done: ${result.count} rows deleted`)
      } catch (e) { cronLog('rawCleanup', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Monday 2:00 AM ET — Weekly analytics refresh + view refresh
    const analytics = require('./services/analyticsAggregator')
    const { refreshAllViews } = require('./services/viewRefresher')
    cron.schedule('0 2 * * 1', async () => {
      cronLog('analytics', 'Starting weekly analytics refresh')
      try {
        const currentSeason = await cronPrisma.season.findFirst({ where: { isCurrent: true } })
        if (!currentSeason) return cronLog('analytics', 'No current season found')
        const results = await analytics.refreshAll(currentSeason.id, cronPrisma)
        cronLog('analytics', `Done: stats=${results.playerStats?.computed}, adp=${results.adp?.computed}, ownership=${results.ownership?.computed}, draftValue=${results.draftValue?.total}, profiles=${results.managerProfiles?.profiles}, h2h=${results.headToHead?.computed}, achievements=${results.achievements?.unlocked}`)

        // Refresh materialized views
        const viewResults = await refreshAllViews(cronPrisma)
        cronLog('analytics', `Views refreshed: ${viewResults.map(r => r.view + '=' + r.status).join(', ')}`)
      } catch (e) { cronLog('analytics', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    console.log('[Cron] DataGolf sync jobs scheduled')
  } else {
    console.log('[Cron] DATAGOLF_API_KEY not set — sync jobs disabled')
  }

  // ─── NFL Sync Cron Jobs ──────────────────────────────────────────────────
  if (process.env.NFL_SYNC_ENABLED === 'true') {
    const nflSync = require('./services/nflSync')

    // Weekly Tuesday 5:00 AM — Sync NFL players (rosters change weekly)
    cron.schedule('0 5 * * 2', async () => {
      cronLog('nfl-players', 'Starting NFL player sync')
      try {
        const result = await nflSync.syncPlayers(cronPrisma)
        cronLog('nfl-players', `Done: ${result.created} created, ${result.updated} updated`)
      } catch (e) { cronLog('nfl-players', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Weekly Tuesday 5:30 AM — Sync NFL schedule + results
    cron.schedule('30 5 * * 2', async () => {
      cronLog('nfl-schedule', 'Starting NFL schedule sync')
      try {
        const result = await nflSync.syncSchedule(cronPrisma)
        cronLog('nfl-schedule', `Done: ${result.created} created, ${result.updated} updated`)
      } catch (e) { cronLog('nfl-schedule', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Weekly Tuesday 6:00 AM — Sync weekly player stats from completed games
    cron.schedule('0 6 * * 2', async () => {
      cronLog('nfl-stats', 'Starting NFL weekly stats sync')
      try {
        const result = await nflSync.syncWeeklyStats(cronPrisma)
        cronLog('nfl-stats', `Done: ${result.created} created, ${result.updated} updated`)
      } catch (e) { cronLog('nfl-stats', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Weekly Tuesday 6:30 AM — Sync roster updates
    cron.schedule('30 6 * * 2', async () => {
      cronLog('nfl-rosters', 'Starting NFL roster sync')
      try {
        const result = await nflSync.syncRosters(cronPrisma)
        cronLog('nfl-rosters', `Done: ${result.updated} updated`)
      } catch (e) { cronLog('nfl-rosters', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // ─── NFL Fantasy Scoring Pipeline ────────────────────────────────────
    const nflFantasyTracker = require('./services/nflFantasyTracker')

    // Every 30 min Sep-Feb — NFL fantasy week status transitions
    cron.schedule('*/30 * * * *', async () => {
      const month = new Date().getMonth() // 0-indexed
      // Skip Mar-Aug (months 2-7)
      if (month >= 2 && month <= 7) return

      try {
        const nflSport = await cronPrisma.sport.findUnique({ where: { slug: 'nfl' } })
        if (!nflSport) return

        const nflSeason = await cronPrisma.season.findFirst({
          where: { sportId: nflSport.id, isCurrent: true },
        })
        if (!nflSeason) return

        const openWeeks = await cronPrisma.fantasyWeek.findMany({
          where: { seasonId: nflSeason.id, status: { not: 'COMPLETED' } },
          orderBy: { weekNumber: 'asc' },
        })

        for (const week of openWeeks) {
          const games = await cronPrisma.nflGame.findMany({
            where: { season: nflSeason.year, week: week.weekNumber, gameType: 'REG' },
          })
          if (games.length === 0) continue

          const allFinal = games.every(g => g.status === 'FINAL')
          const anyInProgress = games.some(g => g.status === 'IN_PROGRESS')
          const anyFinal = games.some(g => g.status === 'FINAL')
          const now = new Date()

          let newStatus = null
          if (allFinal) {
            newStatus = 'COMPLETED'
          } else if (anyInProgress || anyFinal) {
            newStatus = 'IN_PROGRESS'
          } else if (now >= week.startDate) {
            newStatus = 'LOCKED'
          }

          if (newStatus && newStatus !== week.status) {
            await cronPrisma.fantasyWeek.update({
              where: { id: week.id },
              data: { status: newStatus },
            })
            cronLog('nflWeekStatus', `${week.name}: ${week.status} → ${newStatus}`)

            // Snapshot lineups when transitioning to LOCKED
            if (newStatus === 'LOCKED') {
              try {
                const ft = require('./services/fantasyTracker')
                await ft.snapshotLineups(week.id, cronPrisma)
                cronLog('nflWeekStatus', `Lineups snapshotted for ${week.name}`)
              } catch (snapErr) {
                cronLog('nflWeekStatus', `Lineup snapshot failed: ${snapErr.message}`)
              }
            }
          }
        }
      } catch (e) { cronLog('nflWeekStatus', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    // Tuesday 6:30 AM ET — Score completed NFL weeks (after stats sync at 6AM)
    cron.schedule('30 6 * * 2', async () => {
      const month = new Date().getMonth()
      // Skip Mar-Aug (months 2-7)
      if (month >= 2 && month <= 7) return

      cronLog('nflScoring', 'Processing completed NFL fantasy weeks')
      try {
        const results = await nflFantasyTracker.processCompletedNflWeeks(cronPrisma)
        if (results.length === 0) {
          cronLog('nflScoring', 'No unscored NFL weeks to process')
        } else {
          for (const r of results) {
            cronLog('nflScoring', `${r.weekName}: ${r.scored} scores, ${r.snapped} snapshots, ${r.computed} results`)
          }
        }
      } catch (e) { cronLog('nflScoring', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    console.log('[Cron] NFL sync + scoring jobs scheduled (NFL_SYNC_ENABLED=true)')
  } else {
    console.log('[Cron] NFL sync jobs disabled (set NFL_SYNC_ENABLED=true to enable)')
  }

  // ─── News Sync Cron Jobs ─────────────────────────────────────────────────
  {
    const { PrismaClient: NewsPrismaClient } = require('@prisma/client')
    const newsCronPrisma = new NewsPrismaClient()
    const newsSync = require('./services/newsSync')

    function cronLog(job, msg) {
      console.log(`[Cron:${job}] ${new Date().toISOString()} — ${msg}`)
    }

    // Every 2 hours — Sync NFL + Golf news from ESPN
    cron.schedule('0 */2 * * *', async () => {
      cronLog('news', 'Starting news sync')
      try {
        const result = await newsSync.syncNflNews(newsCronPrisma)
        cronLog('news', `NFL: ${result.new} new, ${result.updated} updated`)
      } catch (e) { cronLog('news', `NFL error: ${e.message}`) }
      try {
        const golfResult = await newsSync.syncGolfNews(newsCronPrisma)
        cronLog('news', `Golf: ${golfResult.new} new, ${golfResult.updated} updated`)
      } catch (e) { cronLog('news', `Golf error: ${e.message}`) }
    }, { timezone: 'America/New_York' })

    console.log('[Cron] News sync jobs scheduled (every 2 hours)')
  }

  // Trade review processor — runs every 15 minutes
  const { PrismaClient: TradePrismaClient } = require('@prisma/client')
  const tradePrisma = new TradePrismaClient()
  const { processExpiredReviews } = require('./services/tradeReviewProcessor')

  setInterval(async () => {
    try {
      await processExpiredReviews(tradePrisma)
    } catch (err) {
      console.error('[tradeReviewProcessor] Error:', err.message)
    }
  }, 15 * 60 * 1000) // 15 minutes
  console.log('[Trade Review] Processor scheduled (every 15 minutes)')
})

module.exports = { app, io }
