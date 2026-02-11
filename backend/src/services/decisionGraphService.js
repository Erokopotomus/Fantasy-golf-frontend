/**
 * Decision Graph Service (Phase 6B)
 *
 * Assembles the complete decision history for a user — per-player or per-season.
 * The Decision Graph is NOT a separate database. It's a query pattern that stitches
 * together existing tables into a unified narrative.
 *
 * Used by the Pattern Engine to detect biases, tendencies, and strengths.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Get the full decision graph for a user + specific player.
 * Returns the complete opinion timeline, current board position, and outcome data.
 */
async function getPlayerGraph(userId, playerId) {
  const [events, boardEntries, watchEntry, captures, predictions] = await Promise.all([
    // All opinion events for this user+player
    prisma.playerOpinionEvent.findMany({
      where: { userId, playerId },
      orderBy: { createdAt: 'asc' },
    }),

    // Current board positions for this player across all user's boards
    prisma.draftBoardEntry.findMany({
      where: { board: { userId }, playerId },
      include: {
        board: { select: { id: true, name: true, sport: true, scoringFormat: true } },
      },
    }),

    // Watch list status
    prisma.watchListEntry.findFirst({
      where: { userId, playerId },
    }),

    // Captures mentioning this player
    prisma.labCapture.findMany({
      where: {
        userId,
        players: { some: { playerId } },
      },
      include: { players: { select: { playerId: true } } },
      orderBy: { createdAt: 'asc' },
    }),

    // Predictions about this player
    prisma.prediction.findMany({
      where: { userId, subjectPlayerId: playerId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Build current board position summary
  const currentBoardPositions = boardEntries.map(e => ({
    boardId: e.boardId,
    boardName: e.board.name,
    sport: e.board.sport,
    rank: e.rank,
    tier: e.tier,
    tags: e.tags,
    notes: e.notes,
    baselineRank: e.baselineRank,
  }))

  // Extract outcome data from captures
  const outcomeData = captures
    .filter(c => c.outcomeLinked && c.outcomeData)
    .map(c => c.outcomeData)

  return {
    playerId,
    events,
    currentBoardPositions,
    isWatched: !!watchEntry,
    watchNote: watchEntry?.note || null,
    captures: captures.map(c => ({
      id: c.id,
      content: c.content,
      sentiment: c.sentiment,
      sourceType: c.sourceType,
      outcomeLinked: c.outcomeLinked,
      outcomeData: c.outcomeData,
      createdAt: c.createdAt,
    })),
    predictions: predictions.map(p => ({
      id: p.id,
      predictionType: p.predictionType,
      thesis: p.thesis,
      confidenceLevel: p.confidenceLevel,
      keyFactors: p.keyFactors,
      outcome: p.outcome,
      accuracyScore: p.accuracyScore,
      createdAt: p.createdAt,
    })),
    outcomeData,
  }
}

/**
 * Get the full season decision graph for a user across all players.
 * Groups data by player for pattern analysis.
 */
async function getSeasonGraph(userId, sport, season) {
  const startDate = new Date(`${season}-01-01`)
  const endDate = new Date(`${season}-12-31T23:59:59`)

  const [events, boards, predictions, draftPicks, captures, waiverClaims, trades] = await Promise.all([
    // All opinion events in this season
    prisma.playerOpinionEvent.findMany({
      where: {
        userId,
        sport,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    }),

    // All boards for this sport/season
    prisma.draftBoard.findMany({
      where: { userId, sport, season },
      include: {
        entries: {
          include: { player: { select: { id: true, name: true } } },
          orderBy: { rank: 'asc' },
        },
      },
    }),

    // All predictions in this season
    prisma.prediction.findMany({
      where: {
        userId,
        sport,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    }),

    // Draft picks via teams the user owns
    prisma.draftPick.findMany({
      where: {
        team: { userId },
        draft: { league: { sportRef: { slug: sport } } },
        pickedAt: { gte: startDate, lte: endDate },
      },
      include: {
        player: { select: { id: true, name: true } },
        draft: { select: { id: true, totalRounds: true } },
      },
      orderBy: { pickedAt: 'asc' },
    }),

    // Captures in this season
    prisma.labCapture.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { players: { select: { playerId: true } } },
      orderBy: { createdAt: 'asc' },
    }),

    // Successful waiver claims
    prisma.waiverClaim.findMany({
      where: {
        userId,
        status: 'WON',
        league: { sportRef: { slug: sport } },
        processedAt: { gte: startDate, lte: endDate },
      },
      include: { player: { select: { id: true, name: true } } },
    }),

    // Completed trades
    prisma.trade.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
        league: { sportRef: { slug: sport } },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ])

  // Group events by player
  const playerMap = new Map()
  const ensurePlayer = (playerId, playerName) => {
    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        playerId,
        playerName: playerName || 'Unknown',
        events: [],
        boardEntries: [],
        predictions: [],
        draftPicks: [],
        captures: [],
        waiverClaims: [],
        trades: [],
      })
    }
    return playerMap.get(playerId)
  }

  // Distribute events
  for (const event of events) {
    const p = ensurePlayer(event.playerId, null)
    p.events.push(event)
  }

  for (const board of boards) {
    for (const entry of board.entries) {
      const p = ensurePlayer(entry.playerId, entry.player?.name)
      p.boardEntries.push({ ...entry, boardName: board.name, boardId: board.id })
    }
  }

  for (const pred of predictions) {
    if (pred.subjectPlayerId) {
      const p = ensurePlayer(pred.subjectPlayerId, null)
      p.predictions.push(pred)
    }
  }

  for (const pick of draftPicks) {
    const p = ensurePlayer(pick.playerId, pick.player?.name)
    p.draftPicks.push(pick)
  }

  for (const capture of captures) {
    for (const cp of capture.players) {
      const p = ensurePlayer(cp.playerId, null)
      p.captures.push(capture)
    }
  }

  for (const claim of waiverClaims) {
    const p = ensurePlayer(claim.playerId, claim.player?.name)
    p.waiverClaims.push(claim)
  }

  // Distribute trades — parse JSON player arrays
  for (const trade of trades) {
    const isSender = trade.initiatorId === userId
    const sentPlayerIds = Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []
    const receivedPlayerIds = Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []

    const away = isSender ? sentPlayerIds : receivedPlayerIds
    const acquired = isSender ? receivedPlayerIds : sentPlayerIds

    for (const pid of away) {
      if (typeof pid === 'string') {
        const p = ensurePlayer(pid, null)
        p.trades.push({ ...trade, direction: 'away' })
      }
    }
    for (const pid of acquired) {
      if (typeof pid === 'string') {
        const p = ensurePlayer(pid, null)
        p.trades.push({ ...trade, direction: 'acquired' })
      }
    }
  }

  return {
    userId,
    sport,
    season,
    players: Object.fromEntries(playerMap),
    summary: {
      totalEvents: events.length,
      totalPredictions: predictions.length,
      totalDraftPicks: draftPicks.length,
      totalCaptures: captures.length,
      totalWaiverClaims: waiverClaims.length,
      totalTrades: trades.length,
      uniquePlayers: playerMap.size,
    },
  }
}

/**
 * Get draft-specific decision graph.
 * Board state pre-draft, each pick with comparison, deviations.
 */
async function getDraftGraph(userId, draftId) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      league: { select: { sportRef: { select: { slug: true } } } },
      picks: {
        include: {
          player: { select: { id: true, name: true } },
          team: { select: { userId: true, name: true } },
        },
        orderBy: { pickNumber: 'asc' },
      },
    },
  })
  if (!draft) return null

  const sport = draft.league?.sportRef?.slug || 'golf'
  const userPicks = draft.picks.filter(p => p.team.userId === userId)

  // Get the board that was active for this draft
  const board = await prisma.draftBoard.findFirst({
    where: { userId, sport },
    orderBy: { updatedAt: 'desc' },
    include: {
      entries: {
        include: { player: { select: { id: true, name: true } } },
        orderBy: { rank: 'asc' },
      },
    },
  })

  // Get the board comparison if it exists
  const comparison = await prisma.draftBoardComparison.findFirst({
    where: { userId, draftId },
  })

  const boardMap = new Map()
  if (board) {
    for (const entry of board.entries) {
      boardMap.set(entry.playerId, entry)
    }
  }

  const picks = userPicks.map(p => {
    const boardEntry = boardMap.get(p.playerId)
    return {
      pickNumber: p.pickNumber,
      round: p.round,
      playerId: p.playerId,
      playerName: p.player?.name,
      pickTag: p.pickTag,
      boardRankAtPick: p.boardRankAtPick,
      amount: p.amount,
      boardEntry: boardEntry ? {
        rank: boardEntry.rank,
        tier: boardEntry.tier,
        tags: boardEntry.tags,
        notes: boardEntry.notes,
      } : null,
      deviation: boardEntry ? p.pickNumber - boardEntry.rank : null,
    }
  })

  return {
    draftId,
    sport,
    totalRounds: draft.totalRounds,
    board: board ? { id: board.id, name: board.name, entryCount: board.entries.length } : null,
    picks,
    comparison: comparison?.comparisonData || null,
    deviationSummary: {
      totalPicks: picks.length,
      picksOnBoard: picks.filter(p => p.boardEntry).length,
      picksOffBoard: picks.filter(p => !p.boardEntry).length,
      avgDeviation: calcAvgDeviation(picks),
      tagBreakdown: countTags(picks),
    },
  }
}

/**
 * Get prediction history graph.
 * Groups by type, player, correct/incorrect. Includes accuracy stats.
 */
async function getPredictionGraph(userId, sport, season) {
  const where = { userId, sport }
  if (season) {
    const startDate = new Date(`${season}-01-01`)
    const endDate = new Date(`${season}-12-31T23:59:59`)
    where.createdAt = { gte: startDate, lte: endDate }
  }

  const predictions = await prisma.prediction.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })

  // Group by type
  const byType = {}
  const byFactor = {}
  const byConfidence = {}

  let correct = 0
  let incorrect = 0
  let pending = 0

  for (const p of predictions) {
    const type = p.predictionType || 'unknown'
    if (!byType[type]) byType[type] = { total: 0, correct: 0, incorrect: 0, pending: 0 }
    byType[type].total++

    if (p.outcome === 'CORRECT' || p.outcome === 'PARTIAL_CREDIT') {
      byType[type].correct++
      correct++
    } else if (p.outcome === 'INCORRECT') {
      byType[type].incorrect++
      incorrect++
    } else {
      byType[type].pending++
      pending++
    }

    // Track accuracy by key factor
    const factors = Array.isArray(p.keyFactors) ? p.keyFactors : []
    for (const factor of factors) {
      if (!byFactor[factor]) byFactor[factor] = { total: 0, correct: 0 }
      byFactor[factor].total++
      if (p.outcome === 'CORRECT' || p.outcome === 'PARTIAL_CREDIT') byFactor[factor].correct++
    }

    // Track accuracy by confidence level
    if (p.confidenceLevel != null) {
      const conf = p.confidenceLevel
      if (!byConfidence[conf]) byConfidence[conf] = { total: 0, correct: 0 }
      byConfidence[conf].total++
      if (p.outcome === 'CORRECT' || p.outcome === 'PARTIAL_CREDIT') byConfidence[conf].correct++
    }
  }

  const resolved = correct + incorrect
  const overallAccuracy = resolved > 0 ? correct / resolved : null

  // Compute factor accuracy rates
  const factorAccuracy = {}
  for (const [factor, data] of Object.entries(byFactor)) {
    factorAccuracy[factor] = data.total >= 3 ? Math.round((data.correct / data.total) * 100) / 100 : null
  }

  // Compute confidence calibration
  const confidenceCalibration = {}
  for (const [conf, data] of Object.entries(byConfidence)) {
    confidenceCalibration[conf] = data.total >= 3 ? Math.round((data.correct / data.total) * 100) / 100 : null
  }

  // Compute streaks
  const resolvedPredictions = predictions.filter(p => p.outcome === 'CORRECT' || p.outcome === 'INCORRECT')
  const { currentStreak, longestStreak } = computeStreaks(resolvedPredictions)

  return {
    userId,
    sport,
    season: season || 'all',
    totalPredictions: predictions.length,
    resolved,
    pending,
    overallAccuracy,
    accuracyByType: Object.fromEntries(
      Object.entries(byType).map(([type, data]) => [
        type,
        { ...data, accuracy: data.correct + data.incorrect > 0 ? Math.round((data.correct / (data.correct + data.incorrect)) * 100) / 100 : null },
      ])
    ),
    accuracyByFactor: factorAccuracy,
    accuracyByConfidence: confidenceCalibration,
    streaks: { currentStreak, longestStreak },
    predictions: predictions.map(p => ({
      id: p.id,
      predictionType: p.predictionType,
      subjectPlayerId: p.subjectPlayerId,
      thesis: p.thesis,
      confidenceLevel: p.confidenceLevel,
      keyFactors: p.keyFactors,
      outcome: p.outcome,
      accuracyScore: p.accuracyScore,
      createdAt: p.createdAt,
    })),
  }
}

/**
 * Get cross-season patterns (requires 2+ seasons).
 * Returns year-over-year trends.
 */
async function getMultiSeasonGraph(userId, sport) {
  // Find all seasons where user has activity
  const events = await prisma.playerOpinionEvent.findMany({
    where: { userId, sport },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  if (events.length === 0) return { userId, sport, seasons: [], crossSeasonPatterns: null }

  // Determine active seasons
  const seasonSet = new Set()
  for (const event of events) {
    seasonSet.add(event.createdAt.getFullYear())
  }
  const seasons = Array.from(seasonSet).sort()

  if (seasons.length < 2) {
    return {
      userId,
      sport,
      seasons,
      crossSeasonPatterns: null,
      note: 'Need 2+ seasons of data for cross-season analysis',
    }
  }

  // Get prediction accuracy per season
  const seasonGraphs = []
  for (const season of seasons) {
    const predGraph = await getPredictionGraph(userId, sport, season)
    seasonGraphs.push({
      season,
      predictionAccuracy: predGraph.overallAccuracy,
      totalPredictions: predGraph.totalPredictions,
      resolved: predGraph.resolved,
    })
  }

  return {
    userId,
    sport,
    seasons,
    seasonGraphs,
    crossSeasonPatterns: {
      accuracyTrend: seasonGraphs.map(s => ({ season: s.season, accuracy: s.predictionAccuracy })),
      volumeTrend: seasonGraphs.map(s => ({ season: s.season, predictions: s.totalPredictions })),
    },
  }
}

// ── Helpers ──

function calcAvgDeviation(picks) {
  const deviations = picks.filter(p => p.deviation != null).map(p => Math.abs(p.deviation))
  if (deviations.length === 0) return null
  return Math.round((deviations.reduce((a, b) => a + b, 0) / deviations.length) * 10) / 10
}

function countTags(picks) {
  const counts = {}
  for (const p of picks) {
    if (p.pickTag) {
      counts[p.pickTag] = (counts[p.pickTag] || 0) + 1
    }
  }
  return counts
}

function computeStreaks(resolvedPredictions) {
  let currentStreak = 0
  let currentStreakType = null
  let longestStreak = 0
  let longestStreakType = null

  for (const p of resolvedPredictions) {
    const isCorrect = p.outcome === 'CORRECT'
    if (currentStreakType === isCorrect) {
      currentStreak++
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
        longestStreakType = currentStreakType ? 'correct' : 'incorrect'
      }
      currentStreak = 1
      currentStreakType = isCorrect
    }
  }
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
    longestStreakType = currentStreakType ? 'correct' : 'incorrect'
  }

  return {
    currentStreak: {
      count: currentStreak,
      type: currentStreakType ? 'correct' : 'incorrect',
    },
    longestStreak: {
      count: longestStreak,
      type: longestStreakType,
    },
  }
}

module.exports = {
  getPlayerGraph,
  getSeasonGraph,
  getDraftGraph,
  getPredictionGraph,
  getMultiSeasonGraph,
}
