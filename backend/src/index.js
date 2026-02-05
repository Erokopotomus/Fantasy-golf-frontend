const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
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
})

module.exports = { app, io }
