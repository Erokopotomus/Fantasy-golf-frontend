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

// Make io accessible in routes
app.set('io', io)

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

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
})

module.exports = { app, io }
