const express = require('express')
const router = express.Router()
const { authenticate, optionalAuth } = require('../middleware/auth')
const { validateBody } = require('../middleware/validate')
const predictionService = require('../services/predictionService')

const prisma = require('../lib/prisma.js')

const validatePrediction = validateBody({
  sport: { required: true, type: 'string', enum: ['golf', 'nfl', 'nba', 'mlb'] },
  predictionType: { required: true, type: 'string', enum: ['performance_call', 'player_benchmark', 'weekly_winner', 'bold_call'] },
  predictionData: { required: true },
})

// ─── Submit a prediction ────────────────────────────────────────────────────
// POST /api/predictions
router.post('/', authenticate, validatePrediction, async (req, res) => {
  try {
    const prediction = await predictionService.submitPrediction(req.user.id, req.body, prisma)
    res.status(201).json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Update a pending prediction ────────────────────────────────────────────
// PATCH /api/predictions/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const prediction = await predictionService.updatePrediction(req.params.id, req.user.id, req.body, prisma)
    res.json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Delete a pending prediction ────────────────────────────────────────────
// DELETE /api/predictions/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await predictionService.deletePrediction(req.params.id, req.user.id, prisma)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Get my predictions ─────────────────────────────────────────────────────
// GET /api/predictions/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { sport, predictionType, outcome, limit, offset } = req.query
    const result = await predictionService.getUserPredictions(
      req.user.id,
      {
        sport,
        predictionType,
        outcome,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
      prisma
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get my reputation ──────────────────────────────────────────────────────
// GET /api/predictions/reputation
router.get('/reputation', authenticate, async (req, res) => {
  try {
    const reputation = await predictionService.getUserReputation(req.user.id, prisma)
    res.json(reputation)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get any user's reputation ──────────────────────────────────────────────
// GET /api/predictions/reputation/:userId
router.get('/reputation/:userId', async (req, res) => {
  try {
    const reputation = await predictionService.getUserReputation(req.params.userId, prisma)
    res.json(reputation)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get leaderboard ────────────────────────────────────────────────────────
// GET /api/predictions/leaderboard?sport=golf&timeframe=weekly&leagueId=...&sortBy=clutchRating&minCalls=10&period=30d
router.get('/leaderboard', async (req, res) => {
  try {
    const {
      sport = 'all',
      timeframe = 'all',
      leagueId,
      limit,
      offset,
      sortBy = 'accuracy',
      minCalls,
      period,
      include,
    } = req.query

    // Map period to timeframe for backwards compatibility
    const effectiveTimeframe = period === '7d' ? 'weekly'
      : period === '30d' ? '30d'
      : period === 'season' ? 'season'
      : timeframe

    // If sorting by clutchRating, use direct query with JOIN
    if (sortBy === 'clutchRating') {
      const minCallsNum = parseInt(minCalls) || 5
      const limitNum = parseInt(limit) || 50
      const offsetNum = parseInt(offset) || 0

      const conditions = [`cmr.total_graded_calls >= $1`]
      const params = [minCallsNum]

      if (sport !== 'all') {
        // Filter by sport requires joining predictions table
        // For simplicity, we'll just return all rated users sorted by clutchRating
      }

      const sql = `
        SELECT
          cmr.user_id AS "userId",
          u.name,
          u.avatar,
          cmr.overall_rating AS "overallRating",
          cmr.accuracy_component AS "accuracyComponent",
          cmr.consistency_component AS "consistencyComponent",
          cmr.volume_component AS "volumeComponent",
          cmr.breadth_component AS "breadthComponent",
          cmr.tier,
          cmr.trend,
          cmr.total_graded_calls AS "totalGradedCalls",
          COALESCE(ur.accuracy_rate, 0) AS "accuracyRate",
          COALESCE(ur.total_predictions, 0) AS "totalPredictions",
          COALESCE(ur.streak_current, 0) AS "streakCurrent"
        FROM clutch_manager_ratings cmr
        JOIN users u ON u.id = cmr.user_id
        LEFT JOIN user_reputation ur ON ur.user_id = cmr.user_id AND ur.sport = ${sport !== 'all' ? `$${params.length + 1}` : "'all'"}
        WHERE cmr.overall_rating IS NOT NULL
          AND cmr.total_graded_calls >= $1
        ORDER BY cmr.overall_rating DESC
        LIMIT $${params.length + (sport !== 'all' ? 2 : 1)} OFFSET $${params.length + (sport !== 'all' ? 3 : 2)}
      `
      if (sport !== 'all') {
        params.push(sport, limitNum, offsetNum)
      } else {
        params.push(limitNum, offsetNum)
      }

      const results = await prisma.$queryRawUnsafe(sql, ...params)

      const leaderboard = results.map((r, i) => ({
        rank: offsetNum + i + 1,
        userId: r.userId,
        name: r.name,
        avatar: r.avatar,
        clutchRating: r.overallRating != null ? Number(r.overallRating) : null,
        clutchRatingComponents: {
          accuracy: r.accuracyComponent != null ? Number(r.accuracyComponent) : null,
          consistency: r.consistencyComponent != null ? Number(r.consistencyComponent) : null,
          volume: r.volumeComponent != null ? Number(r.volumeComponent) : null,
          breadth: r.breadthComponent != null ? Number(r.breadthComponent) : null,
        },
        tier: r.tier,
        trend: r.trend,
        totalGradedCalls: Number(r.totalGradedCalls),
        accuracy: Number(r.accuracyRate),
        total: Number(r.totalPredictions),
        streak: Number(r.streakCurrent),
      }))

      // Enrich with user profile data when requested
      if (include === 'profile') {
        const profileUserIds = leaderboard.map(e => e.userId).filter(Boolean)
        if (profileUserIds.length > 0) {
          const profiles = await prisma.user.findMany({
            where: { id: { in: profileUserIds } },
            select: { id: true, username: true, bio: true, tagline: true, socialLinks: true, pinnedBadges: true },
          })
          const profileMap = new Map(profiles.map(p => [p.id, p]))
          for (const entry of leaderboard) {
            const p = profileMap.get(entry.userId)
            if (p) {
              entry.username = p.username
              entry.bio = p.bio
              entry.tagline = p.tagline
              entry.socialLinks = p.socialLinks
            }
          }
        }
      }

      return res.json({ leaderboard })
    }

    // Default: use existing leaderboard service with optional clutch rating JOIN
    const leaderboard = await predictionService.getLeaderboard(
      sport,
      {
        timeframe: effectiveTimeframe,
        leagueId,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
      prisma
    )

    // Enrich with Clutch Rating data + pinnedBadges
    const userIds = leaderboard.map(e => e.userId).filter(Boolean)
    if (userIds.length > 0) {
      const [ratings, users] = await Promise.all([
        prisma.clutchManagerRating.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, overallRating: true, tier: true, trend: true },
        }),
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, pinnedBadges: true },
        }),
      ])
      const ratingMap = new Map(ratings.map(r => [r.userId, r]))
      const userMap = new Map(users.map(u => [u.id, u]))

      for (const entry of leaderboard) {
        const r = ratingMap.get(entry.userId)
        entry.clutchRating = r?.overallRating ?? null
        entry.clutchTier = r?.tier ?? null
        entry.clutchTrend = r?.trend ?? null
        const u = userMap.get(entry.userId)
        entry.pinnedBadges = u?.pinnedBadges ?? []
      }
    }

    // Enrich with user profile data when requested (for Analysts tab)
    if (include === 'profile' && userIds.length > 0) {
      const profiles = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, bio: true, tagline: true, socialLinks: true, pinnedBadges: true },
      })
      const profileMap = new Map(profiles.map(p => [p.id, p]))
      for (const entry of leaderboard) {
        const p = profileMap.get(entry.userId)
        if (p) {
          entry.username = p.username
          entry.bio = p.bio
          entry.tagline = p.tagline
          entry.socialLinks = p.socialLinks
          entry.pinnedBadges = p.pinnedBadges
        }
      }
    }

    res.json({ leaderboard })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Weighted consensus by Clutch Rating ─────────────────────────────────
// GET /api/predictions/consensus-weighted?eventId=...&playerId=...&type=player_benchmark
router.get('/consensus-weighted', async (req, res) => {
  try {
    const { eventId, playerId, type = 'player_benchmark' } = req.query
    if (!eventId || !playerId) {
      return res.status(400).json({ error: { message: 'eventId and playerId required' } })
    }

    // Single SQL query: get predictions + clutch ratings
    const sql = `
      SELECT
        p."predictionData",
        p."userId",
        COALESCE(cmr.overall_rating, 0) AS rating
      FROM predictions p
      LEFT JOIN clutch_manager_ratings cmr ON cmr.user_id = p."userId"
      WHERE p."eventId" = $1
        AND p."subjectPlayerId" = $2
        AND p."predictionType" = $3
        AND p."isPublic" = true
    `
    const results = await prisma.$queryRawUnsafe(sql, eventId, playerId, type)

    if (results.length === 0) {
      return res.json({
        total: 0,
        rawConsensus: {},
        weightedConsensus: {},
        topManagerCount: 0,
        topManagerAgreement: null,
      })
    }

    // Raw consensus (unweighted)
    const rawCounts = {}
    // Weighted by Clutch Rating
    let weightedCounts = {}
    let topManagerCounts = {}
    const TOP_THRESHOLD = 70 // Clutch Rating 70+ = "top manager"

    for (const r of results) {
      const direction = r.predictionData?.direction || r.predictionData?.action || 'unknown'
      rawCounts[direction] = (rawCounts[direction] || 0) + 1

      // Weight = max(1, rating/10) so even unrated users have some weight
      const weight = Math.max(1, Number(r.rating) / 10)
      weightedCounts[direction] = (weightedCounts[direction] || 0) + weight

      if (Number(r.rating) >= TOP_THRESHOLD) {
        topManagerCounts[direction] = (topManagerCounts[direction] || 0) + 1
      }
    }

    // Normalize to percentages
    const rawConsensus = {}
    for (const [key, count] of Object.entries(rawCounts)) {
      rawConsensus[key] = Math.round((count / results.length) * 100)
    }

    const totalWeight = Object.values(weightedCounts).reduce((a, b) => a + b, 0)
    const weightedConsensus = {}
    for (const [key, wt] of Object.entries(weightedCounts)) {
      weightedConsensus[key] = Math.round((wt / totalWeight) * 100)
    }

    // Top manager stats
    const topManagerTotal = Object.values(topManagerCounts).reduce((a, b) => a + b, 0)
    let topManagerAgreement = null
    if (topManagerTotal > 0) {
      const topDirection = Object.entries(topManagerCounts).sort((a, b) => b[1] - a[1])[0]
      topManagerAgreement = {
        direction: topDirection[0],
        count: topDirection[1],
        total: topManagerTotal,
        label: `${topDirection[1]} of ${topManagerTotal} top managers agree: ${topDirection[0].toUpperCase()}`,
      }
    }

    res.json({
      total: results.length,
      rawConsensus,
      weightedConsensus,
      topManagerCount: topManagerTotal,
      topManagerAgreement,
    })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get community consensus ────────────────────────────────────────────────
// GET /api/predictions/consensus?eventId=...&playerId=...&type=player_benchmark
router.get('/consensus', async (req, res) => {
  try {
    const { eventId, playerId, type = 'player_benchmark' } = req.query
    if (!eventId || !playerId) {
      return res.status(400).json({ error: { message: 'eventId and playerId required' } })
    }
    const consensus = await predictionService.getCommunityConsensus(eventId, playerId, type, prisma)
    res.json(consensus)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get event slate (open predictions for an event) ────────────────────────
// GET /api/predictions/slate/:eventId
router.get('/slate/:eventId', async (req, res) => {
  try {
    const { sport, predictionType, limit } = req.query
    const slate = await predictionService.getEventSlate(
      req.params.eventId,
      { sport, predictionType, limit: parseInt(limit) || 50 },
      prisma
    )
    res.json({ slate })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Get predictions for a specific event ───────────────────────────────────
// GET /api/predictions/event/:eventId
router.get('/event/:eventId', optionalAuth, async (req, res) => {
  try {
    const { predictionType, limit, offset } = req.query
    const where = {
      eventId: req.params.eventId,
      isPublic: true,
    }
    if (predictionType) where.predictionType = predictionType

    // If authenticated, also include user's private predictions
    if (req.user) {
      where.OR = [
        { isPublic: true },
        { userId: req.user.id },
      ]
      delete where.isPublic
    }

    const predictions = await prisma.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      take: parseInt(limit) || 50,
      skip: parseInt(offset) || 0,
    })

    res.json({ predictions })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Resolve a prediction (admin only) ──────────────────────────────────────
// POST /api/predictions/:id/resolve
router.post('/:id/resolve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin access required' } })
    }

    const { outcome, accuracyScore } = req.body
    const prediction = await predictionService.resolvePrediction(
      req.params.id,
      outcome,
      accuracyScore,
      prisma
    )
    res.json({ prediction })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Resolve all predictions for an event (admin / cron) ────────────────────
// POST /api/predictions/resolve-event/:eventId
router.post('/resolve-event/:eventId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin access required' } })
    }

    // For golf tournaments, fetch performances and resolve
    const performances = await prisma.performance.findMany({
      where: { tournamentId: req.params.eventId },
    })

    const perfMap = {}
    for (const p of performances) {
      perfMap[p.playerId] = p
    }

    const results = await predictionService.resolveEventPredictions(
      req.params.eventId,
      (prediction) => {
        const perf = perfMap[prediction.subjectPlayerId]
        if (!perf) return { outcome: 'VOIDED', accuracyScore: null }

        if (prediction.predictionType === 'player_benchmark') {
          return predictionService.resolveGolfBenchmark(prediction, perf)
        }

        // Default: void unhandled types for now
        return { outcome: 'VOIDED', accuracyScore: null }
      },
      prisma
    )

    res.json({ results })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Compare: User vs User or User vs Consensus ─────────────────────────
// GET /api/predictions/compare/:targetUserId?sport=nfl
router.get('/compare/:targetUserId', authenticate, async (req, res) => {
  try {
    const myUserId = req.user.id
    const { targetUserId } = req.params
    const { sport } = req.query
    const isConsensus = targetUserId === 'consensus'

    // Fetch the authed user info
    const myUser = await prisma.user.findUnique({
      where: { id: myUserId },
      select: { id: true, name: true, avatar: true, username: true },
    })

    // Fetch my resolved predictions
    const myWhere = {
      userId: myUserId,
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    }
    if (sport && sport !== 'all') myWhere.sport = sport

    const myPredictions = await prisma.prediction.findMany({
      where: myWhere,
      select: {
        id: true,
        eventId: true,
        subjectPlayerId: true,
        predictionType: true,
        predictionData: true,
        outcome: true,
        sport: true,
      },
    })

    if (isConsensus) {
      // Compare against consensus direction for each prediction
      let overlapTotal = 0
      let myCorrect = 0
      let consensusCorrect = 0
      const bySport = {}

      for (const pred of myPredictions) {
        if (!pred.eventId || !pred.subjectPlayerId) continue

        // Get all public predictions for the same event+player+type
        const allPreds = await prisma.prediction.findMany({
          where: {
            eventId: pred.eventId,
            subjectPlayerId: pred.subjectPlayerId,
            predictionType: pred.predictionType,
            isPublic: true,
            outcome: { in: ['CORRECT', 'INCORRECT'] },
            userId: { not: myUserId },
          },
          select: { predictionData: true, outcome: true },
        })

        if (allPreds.length === 0) continue

        // Determine consensus direction
        const directions = {}
        for (const p of allPreds) {
          const dir = p.predictionData?.direction || 'unknown'
          directions[dir] = (directions[dir] || 0) + 1
        }
        const consensusDir = Object.entries(directions).sort((a, b) => b[1] - a[1])[0]?.[0]
        const myDir = pred.predictionData?.direction

        // Did consensus match the correct outcome?
        const consensusPredCorrect = allPreds.filter(p => p.predictionData?.direction === consensusDir && p.outcome === 'CORRECT').length
        const consensusPredTotal = allPreds.filter(p => p.predictionData?.direction === consensusDir).length
        const consensusWasRight = consensusPredTotal > 0 && consensusPredCorrect > consensusPredTotal / 2

        overlapTotal++
        if (pred.outcome === 'CORRECT') myCorrect++
        if (consensusWasRight) consensusCorrect++

        // Track by sport
        const s = pred.sport || 'other'
        if (!bySport[s]) bySport[s] = { overlapTotal: 0, myCorrect: 0, theirCorrect: 0 }
        bySport[s].overlapTotal++
        if (pred.outcome === 'CORRECT') bySport[s].myCorrect++
        if (consensusWasRight) bySport[s].theirCorrect++
      }

      // Get Clutch Ratings
      const myRating = await prisma.clutchManagerRating.findUnique({ where: { userId: myUserId } }).catch(() => null)

      return res.json({
        myUser,
        targetUser: { id: 'consensus', name: 'Community Consensus', avatar: null },
        isConsensus: true,
        summary: {
          overlapTotal,
          myCorrect,
          theirCorrect: consensusCorrect,
          myAccuracy: overlapTotal > 0 ? myCorrect / overlapTotal : 0,
          theirAccuracy: overlapTotal > 0 ? consensusCorrect / overlapTotal : 0,
        },
        bySport,
        myClutchRating: myRating?.overallRating ?? null,
        theirClutchRating: null,
      })
    }

    // User vs User
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatar: true, username: true },
    })
    if (!targetUser) {
      return res.status(404).json({ error: { message: 'User not found' } })
    }

    // Fetch target's resolved predictions
    const theirWhere = {
      userId: targetUserId,
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    }
    if (sport && sport !== 'all') theirWhere.sport = sport

    const theirPredictions = await prisma.prediction.findMany({
      where: theirWhere,
      select: {
        id: true,
        eventId: true,
        subjectPlayerId: true,
        predictionType: true,
        outcome: true,
        sport: true,
      },
    })

    // Build a key map for overlap
    const theirMap = new Map()
    for (const p of theirPredictions) {
      const key = `${p.eventId}|${p.subjectPlayerId}|${p.predictionType}`
      theirMap.set(key, p)
    }

    let overlapTotal = 0
    let myCorrect = 0
    let theirCorrect = 0
    const bySport = {}

    for (const pred of myPredictions) {
      const key = `${pred.eventId}|${pred.subjectPlayerId}|${pred.predictionType}`
      const theirPred = theirMap.get(key)
      if (!theirPred) continue

      overlapTotal++
      if (pred.outcome === 'CORRECT') myCorrect++
      if (theirPred.outcome === 'CORRECT') theirCorrect++

      const s = pred.sport || 'other'
      if (!bySport[s]) bySport[s] = { overlapTotal: 0, myCorrect: 0, theirCorrect: 0 }
      bySport[s].overlapTotal++
      if (pred.outcome === 'CORRECT') bySport[s].myCorrect++
      if (theirPred.outcome === 'CORRECT') bySport[s].theirCorrect++
    }

    // Get Clutch Ratings
    const [myRating, theirRating] = await Promise.all([
      prisma.clutchManagerRating.findUnique({ where: { userId: myUserId } }).catch(() => null),
      prisma.clutchManagerRating.findUnique({ where: { userId: targetUserId } }).catch(() => null),
    ])

    res.json({
      myUser,
      targetUser,
      isConsensus: false,
      summary: {
        overlapTotal,
        myCorrect,
        theirCorrect,
        myAccuracy: overlapTotal > 0 ? myCorrect / overlapTotal : 0,
        theirAccuracy: overlapTotal > 0 ? theirCorrect / overlapTotal : 0,
      },
      bySport,
      myClutchRating: myRating?.overallRating ?? null,
      theirClutchRating: theirRating?.overallRating ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

module.exports = router
