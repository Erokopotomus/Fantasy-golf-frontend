// Golf Prediction Auto-Resolver
// Runs after tournament completion. Checks all PENDING golf predictions
// for the event and resolves them based on final results.

const prisma = require('../lib/prisma')

async function resolveGolfEvent(eventId) {
  // 1. Get tournament with final leaderboard
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { performances: { include: { player: true } } },
  })
  if (!event) throw new Error(`Event ${eventId} not found`)

  // 2. Build leaderboard lookup
  const leaderboard = event.performances
    .filter(p => p.position != null)
    .sort((a, b) => a.position - b.position)

  const playerMap = new Map()
  for (const p of event.performances) {
    playerMap.set(p.playerId, {
      position: p.position,
      sgTotal: p.sgTotal,
      status: p.status,
      score: p.totalScore,
    })
  }

  // Winner = position 1
  const winner = leaderboard.find(p => p.position === 1)

  // 3. Get all PENDING predictions for this event
  const pending = await prisma.prediction.findMany({
    where: { eventId, outcome: 'PENDING', sport: 'golf' },
  })

  let resolved = 0
  for (const pred of pending) {
    let outcome = null
    let accuracyScore = null

    const playerData = pred.subjectPlayerId ? playerMap.get(pred.subjectPlayerId) : null

    switch (pred.predictionType) {
      case 'tournament_winner': {
        if (!winner) break
        outcome = (pred.subjectPlayerId === winner.playerId) ? 'CORRECT' : 'INCORRECT'
        if (playerData?.position) {
          accuracyScore = outcome === 'CORRECT' ? 1.0 : Math.max(0, 1 - (playerData.position / 50))
        }
        break
      }

      case 'top_5': {
        if (!playerData?.position) break
        const inTop5 = playerData.position <= 5
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop5 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'top_10': {
        if (!playerData?.position) break
        const inTop10 = playerData.position <= 10
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop10 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'top_20': {
        if (!playerData?.position) break
        const inTop20 = playerData.position <= 20
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop20 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'make_cut': {
        if (!playerData) break
        const madeCut = playerData.status !== 'missed_cut' && playerData.status !== 'CUT'
        const predictedMake = pred.predictionData?.direction === 'make'
        outcome = (madeCut === predictedMake) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'round_leader': {
        const round = pred.predictionData?.round || 1
        const roundScores = await prisma.roundScore.findMany({
          where: { performance: { eventId }, roundNumber: round },
          include: { performance: true },
          orderBy: { score: 'asc' },
        })
        if (roundScores.length === 0) break
        const roundLeader = roundScores[0]?.performance?.playerId
        outcome = (pred.subjectPlayerId === roundLeader) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'head_to_head': {
        const opponentId = pred.predictionData?.opponentPlayerId
        if (!opponentId) break
        const opponentData = playerMap.get(opponentId)
        if (!playerData?.position || !opponentData?.position) break
        const pickedPlayer = pred.predictionData?.pick === 'playerA' ? pred.subjectPlayerId : opponentId
        const pickedData = pred.predictionData?.pick === 'playerA' ? playerData : opponentData
        const otherData = pred.predictionData?.pick === 'playerA' ? opponentData : playerData
        if (pickedData.position === otherData.position) {
          outcome = 'PUSH'
        } else {
          outcome = pickedData.position < otherData.position ? 'CORRECT' : 'INCORRECT'
        }
        accuracyScore = outcome === 'CORRECT' ? 1.0 : outcome === 'PUSH' ? 0.5 : 0.0
        break
      }

      case 'player_benchmark': {
        if (!playerData?.sgTotal && playerData?.sgTotal !== 0) break
        const benchmark = pred.predictionData?.benchmarkValue
        if (benchmark == null) break
        const direction = pred.predictionData?.direction
        const actual = playerData.sgTotal
        if (actual === benchmark) {
          outcome = 'PUSH'
        } else if (direction === 'over') {
          outcome = actual > benchmark ? 'CORRECT' : 'INCORRECT'
        } else {
          outcome = actual < benchmark ? 'CORRECT' : 'INCORRECT'
        }
        accuracyScore = outcome === 'CORRECT' ? 1.0 : outcome === 'PUSH' ? 0.5 : 0.0
        break
      }
    }

    if (outcome) {
      await prisma.prediction.update({
        where: { id: pred.id },
        data: {
          outcome,
          accuracyScore,
          resolvedAt: new Date(),
        },
      })
      resolved++

      // Update reputation
      try {
        const { updateReputation } = require('./predictionService')
        await updateReputation(pred.userId, pred.sport, prisma)
      } catch (e) { /* reputation update optional */ }
    }
  }

  // Trigger achievement evaluation for affected users
  try {
    const { evaluateUser } = require('./achievementEngine')
    const affectedUsers = [...new Set(pending.map(p => p.userId))]
    for (const uid of affectedUsers) {
      evaluateUser(uid).catch(() => {})
    }
  } catch (e) { /* optional */ }

  console.log(`[Golf Resolver] Event ${event.name}: resolved ${resolved}/${pending.length} predictions`)
  return { resolved, total: pending.length }
}

/**
 * Check for recently completed tournaments and resolve their predictions.
 */
async function resolveCompletedTournaments() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const events = await prisma.event.findMany({
    where: {
      sport: { slug: 'golf' },
      endDate: { gte: cutoff, lte: new Date() },
      predictions: { some: { outcome: 'PENDING' } },
    },
    select: { id: true, name: true },
  })

  let totalResolved = 0
  for (const event of events) {
    try {
      const result = await resolveGolfEvent(event.id)
      totalResolved += result.resolved
    } catch (err) {
      console.error(`[Golf Resolver] Failed for event ${event.name}:`, err.message)
    }
  }
  return totalResolved
}

module.exports = { resolveGolfEvent, resolveCompletedTournaments }
