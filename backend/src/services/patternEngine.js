/**
 * Pattern Engine Service (Phase 6B)
 *
 * Analyzes decision graphs and produces structured pattern objects.
 * Deterministic computations — no AI, no randomness.
 * The patterns become input for AI narration in Phase 6C+.
 */

const prisma = require('../lib/prisma.js')
const decisionGraph = require('./decisionGraphService')

// ════════════════════════════════════════════════
//  DRAFT PATTERNS
// ════════════════════════════════════════════════

async function detectDraftPatterns(userId, sport) {
  // Get all drafts the user participated in for this sport
  const draftPicks = await prisma.draftPick.findMany({
    where: {
      team: { userId },
      draft: { league: { sportRef: { slug: sport } } },
    },
    include: {
      player: { select: { id: true, name: true, nflPosition: true } },
      draft: { select: { id: true, totalRounds: true, startTime: true, endTime: true } },
    },
    orderBy: { pickedAt: 'asc' },
  })

  if (draftPicks.length === 0) {
    return {
      hasDraftData: false,
      draftCount: 0,
      positionAllocation: {},
      reachFrequency: null,
      boardAdherence: null,
      tagAccuracy: null,
      roundByRoundTendency: null,
      auctionPatterns: null,
    }
  }

  // Group picks by draft
  const draftMap = new Map()
  for (const pick of draftPicks) {
    if (!draftMap.has(pick.draftId)) draftMap.set(pick.draftId, [])
    draftMap.get(pick.draftId).push(pick)
  }
  const draftCount = draftMap.size

  // ── Position Allocation ──
  const positionCounts = {}
  let totalPicks = 0
  for (const pick of draftPicks) {
    const pos = pick.player?.nflPosition || 'UNKNOWN'
    positionCounts[pos] = (positionCounts[pos] || 0) + 1
    totalPicks++
  }
  const positionAllocation = {}
  const flags = []
  for (const [pos, count] of Object.entries(positionCounts)) {
    const pct = Math.round((count / totalPicks) * 100) / 100
    positionAllocation[pos] = { count, pct }
    if (sport === 'nfl') {
      if (pos === 'RB' && pct > 0.35) flags.push('RB_HEAVY')
      if (pos === 'WR' && pct < 0.20) flags.push('WR_LIGHT')
      if (pos === 'QB' && pct > 0.20) flags.push('QB_HEAVY')
      if (pos === 'TE' && count === 0) flags.push('NO_TE')
    }
  }

  // ── Reach Frequency ──
  const picksWithBoardRank = draftPicks.filter(p => p.boardRankAtPick != null)
  let reachFrequency = null
  if (picksWithBoardRank.length >= 3) {
    const reaches = picksWithBoardRank.filter(p => p.pickNumber < p.boardRankAtPick) // picked earlier than board rank
    const reachRate = Math.round((reaches.length / picksWithBoardRank.length) * 100) / 100
    const reachAmounts = reaches.map(p => p.boardRankAtPick - p.pickNumber)
    const avgReachAmount = reachAmounts.length > 0
      ? Math.round((reachAmounts.reduce((a, b) => a + b, 0) / reachAmounts.length) * 10) / 10
      : 0
    reachFrequency = { reachRate, avgReachAmount, reachCount: reaches.length, totalWithBoardData: picksWithBoardRank.length }
  }

  // ── Board Adherence ──
  const comparisons = await prisma.draftBoardComparison.findMany({
    where: { userId, sport },
    orderBy: { createdAt: 'desc' },
  })
  let boardAdherence = null
  if (comparisons.length > 0) {
    const allComps = comparisons.map(c => c.comparisonData).filter(Boolean)
    const totalCompPicks = allComps.reduce((s, c) => s + (c.totalPicks || 0), 0)
    const totalMatching = allComps.reduce((s, c) => s + (c.picksMatchingBoard || 0), 0)
    const avgDeviation = allComps
      .filter(c => c.averageBoardRankDeviation != null)
      .map(c => c.averageBoardRankDeviation)
    boardAdherence = {
      followRate: totalCompPicks > 0 ? Math.round((totalMatching / totalCompPicks) * 100) / 100 : null,
      deviationAvg: avgDeviation.length > 0
        ? Math.round((avgDeviation.reduce((a, b) => a + b, 0) / avgDeviation.length) * 10) / 10
        : null,
      comparisonsAnalyzed: comparisons.length,
    }
  }

  // ── Tag Accuracy ──
  // This requires outcome data — check if any draft picks have value trackers
  const taggedPicks = draftPicks.filter(p => p.pickTag)
  let tagAccuracy = null
  if (taggedPicks.length >= 3) {
    const tagCounts = {}
    for (const p of taggedPicks) {
      tagCounts[p.pickTag] = (tagCounts[p.pickTag] || 0) + 1
    }
    tagAccuracy = { tagCounts, totalTagged: taggedPicks.length, totalPicks }
  }

  // ── Board Tag Accuracy ──
  // Check how Target/Sleeper/Avoid tags correlate with outcomes
  const boardEntries = await prisma.draftBoardEntry.findMany({
    where: { board: { userId, sport }, tags: { not: null } },
    select: { playerId: true, tags: true, rank: true },
  })
  const taggedEntries = boardEntries.filter(e => {
    const tags = Array.isArray(e.tags) ? e.tags : []
    return tags.length > 0
  })
  let boardTagAccuracy = null
  if (taggedEntries.length >= 5) {
    const targetCount = taggedEntries.filter(e => (e.tags || []).includes('TARGET')).length
    const sleeperCount = taggedEntries.filter(e => (e.tags || []).includes('SLEEPER')).length
    const avoidCount = taggedEntries.filter(e => (e.tags || []).includes('AVOID')).length
    boardTagAccuracy = { targetCount, sleeperCount, avoidCount, total: taggedEntries.length }
  }

  // ── Round-by-Round ──
  const roundBuckets = {}
  for (const pick of draftPicks) {
    const bucket = pick.round <= 3 ? 'early' : pick.round <= 6 ? 'mid' : 'late'
    if (!roundBuckets[bucket]) roundBuckets[bucket] = { picks: 0 }
    roundBuckets[bucket].picks++
  }

  // ── Auction Patterns ──
  const auctionPicks = draftPicks.filter(p => p.amount != null && p.amount > 0)
  let auctionPatterns = null
  if (auctionPicks.length >= 5) {
    const totalSpend = auctionPicks.reduce((s, p) => s + p.amount, 0)
    const firstHalf = auctionPicks.slice(0, Math.ceil(auctionPicks.length / 2))
    const firstHalfSpend = firstHalf.reduce((s, p) => s + p.amount, 0)
    auctionPatterns = {
      totalSpend,
      avgPerPick: Math.round((totalSpend / auctionPicks.length) * 10) / 10,
      earlySpendRate: totalSpend > 0 ? Math.round((firstHalfSpend / totalSpend) * 100) / 100 : null,
      maxSinglePick: Math.max(...auctionPicks.map(p => p.amount)),
      auctionPickCount: auctionPicks.length,
    }
  }

  return {
    hasDraftData: true,
    draftCount,
    totalPicks,
    positionAllocation: { breakdown: positionAllocation, flags },
    reachFrequency,
    boardAdherence,
    tagAccuracy,
    boardTagAccuracy,
    roundByRoundTendency: roundBuckets,
    auctionPatterns,
  }
}

// ════════════════════════════════════════════════
//  PREDICTION PATTERNS
// ════════════════════════════════════════════════

async function detectPredictionPatterns(userId, sport) {
  const predGraph = await decisionGraph.getPredictionGraph(userId, sport)

  if (predGraph.totalPredictions === 0) {
    return {
      hasPredictionData: false,
      overallAccuracy: null,
      accuracyByType: {},
      accuracyByConfidence: {},
      accuracyByFactor: {},
      biases: [],
      streaks: null,
    }
  }

  // Identify biases from factor accuracy
  const biases = []
  for (const [factor, accuracy] of Object.entries(predGraph.accuracyByFactor)) {
    if (accuracy != null && accuracy < 0.40) {
      biases.push({ type: 'weak_factor', factor, accuracy, note: `Low accuracy when citing ${factor}` })
    }
    if (accuracy != null && accuracy > 0.70) {
      biases.push({ type: 'strong_factor', factor, accuracy, note: `Strong accuracy when citing ${factor}` })
    }
  }

  // Confidence calibration check
  const confEntries = Object.entries(predGraph.accuracyByConfidence).filter(([, v]) => v != null)
  if (confEntries.length >= 2) {
    const sorted = confEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    const lowConf = sorted[0]
    const highConf = sorted[sorted.length - 1]
    if (lowConf[1] != null && highConf[1] != null) {
      if (highConf[1] < lowConf[1]) {
        biases.push({
          type: 'overconfidence',
          note: 'High-confidence predictions hit less often than low-confidence ones',
          highConfAccuracy: highConf[1],
          lowConfAccuracy: lowConf[1],
        })
      } else if (highConf[1] - lowConf[1] > 0.20) {
        biases.push({
          type: 'well_calibrated',
          note: 'Confidence levels are well-calibrated — higher confidence = better results',
          highConfAccuracy: highConf[1],
          lowConfAccuracy: lowConf[1],
        })
      }
    }
  }

  return {
    hasPredictionData: true,
    overallAccuracy: predGraph.overallAccuracy,
    totalPredictions: predGraph.totalPredictions,
    resolved: predGraph.resolved,
    accuracyByType: predGraph.accuracyByType,
    accuracyByConfidence: predGraph.accuracyByConfidence,
    accuracyByFactor: predGraph.accuracyByFactor,
    biases,
    streaks: predGraph.streaks,
  }
}

// ════════════════════════════════════════════════
//  ROSTER MANAGEMENT PATTERNS
// ════════════════════════════════════════════════

async function detectRosterPatterns(userId, sport, season) {
  const startDate = new Date(`${season}-01-01`)
  const endDate = new Date(`${season}-12-31T23:59:59`)

  const [waiverClaims, trades, lineupSnapshots] = await Promise.all([
    prisma.waiverClaim.findMany({
      where: {
        userId,
        league: { sportRef: { slug: sport } },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { player: { select: { id: true, name: true, nflPosition: true } } },
    }),

    prisma.trade.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        league: { sportRef: { slug: sport } },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),

    prisma.lineupSnapshot.findMany({
      where: {
        team: { userId },
        leagueSeason: { league: { sportRef: { slug: sport } } },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // ── Waiver Tendencies ──
  const wonClaims = waiverClaims.filter(c => c.status === 'WON')
  const waiverPositionBreakdown = {}
  let totalFaab = 0

  for (const claim of wonClaims) {
    const pos = claim.player?.nflPosition || 'UNKNOWN'
    if (!waiverPositionBreakdown[pos]) waiverPositionBreakdown[pos] = { claims: 0, totalFaab: 0 }
    waiverPositionBreakdown[pos].claims++
    if (claim.bidAmount) {
      waiverPositionBreakdown[pos].totalFaab += claim.bidAmount
      totalFaab += claim.bidAmount
    }
  }

  const waiverTendencies = {
    totalClaims: waiverClaims.length,
    wonClaims: wonClaims.length,
    positionBreakdown: waiverPositionBreakdown,
    totalFaabSpent: totalFaab,
    avgBid: wonClaims.length > 0 ? Math.round((totalFaab / wonClaims.length) * 10) / 10 : 0,
    hasReasoning: wonClaims.filter(c => c.reasoning).length,
  }

  // ── Trading Style ──
  const acceptedTrades = trades.filter(t => t.status === 'ACCEPTED')
  const initiatedTrades = trades.filter(t => t.initiatorId === userId)
  const receivedTrades = trades.filter(t => t.receiverId === userId)

  const tradingStyle = {
    totalProposed: initiatedTrades.length,
    totalReceived: receivedTrades.length,
    totalAccepted: acceptedTrades.length,
    acceptRate: trades.length > 0 ? Math.round((acceptedTrades.length / trades.length) * 100) / 100 : null,
    hasReasoning: trades.filter(t => t.proposerReasoning || t.responderReasoning).length,
  }

  // ── Lineup Optimality ──
  let totalPointsLeftOnBench = 0
  let weeksWithData = 0
  let suboptimalWeeks = 0

  for (const snap of lineupSnapshots) {
    if (snap.activePoints != null && snap.benchPoints != null && snap.optimalPoints != null) {
      const leftOnBench = snap.optimalPoints - snap.activePoints
      if (leftOnBench > 0) {
        totalPointsLeftOnBench += leftOnBench
        suboptimalWeeks++
      }
      weeksWithData++
    }
  }

  const lineupOptimality = {
    weeksTracked: lineupSnapshots.length,
    weeksWithScoring: weeksWithData,
    suboptimalWeeks,
    avgPointsLeftOnBench: weeksWithData > 0 ? Math.round((totalPointsLeftOnBench / weeksWithData) * 10) / 10 : null,
    totalPointsLeftOnBench: Math.round(totalPointsLeftOnBench * 10) / 10,
  }

  return {
    hasRosterData: waiverClaims.length > 0 || trades.length > 0 || lineupSnapshots.length > 0,
    waiverTendencies,
    tradingStyle,
    lineupOptimality,
  }
}

// ════════════════════════════════════════════════
//  CAPTURE PATTERNS
// ════════════════════════════════════════════════

async function detectCapturePatterns(userId, sport) {
  const captures = await prisma.labCapture.findMany({
    where: { userId },
    include: { players: { select: { playerId: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (captures.length === 0) {
    return {
      hasCaptureData: false,
      captureVolume: null,
      sentimentAccuracy: null,
      captureToActionRate: null,
    }
  }

  // ── Volume over time ──
  const monthlyVolume = {}
  for (const c of captures) {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`
    monthlyVolume[key] = (monthlyVolume[key] || 0) + 1
  }

  // ── Sentiment accuracy (from outcome-linked captures) ──
  const linkedCaptures = captures.filter(c => c.outcomeLinked && c.outcomeData)
  let sentimentAccuracy = null
  if (linkedCaptures.length >= 3) {
    let correct = 0
    let incorrect = 0
    for (const c of linkedCaptures) {
      const data = c.outcomeData
      const players = Array.isArray(data?.players) ? data.players : []
      for (const p of players) {
        if (p.verdict === 'CORRECT' || p.verdict === 'TRENDING_CORRECT') correct++
        else if (p.verdict === 'INCORRECT' || p.verdict === 'TRENDING_INCORRECT') incorrect++
      }
    }
    const total = correct + incorrect
    sentimentAccuracy = {
      correct,
      incorrect,
      total,
      rate: total > 0 ? Math.round((correct / total) * 100) / 100 : null,
    }
  }

  // ── Sentiment breakdown ──
  const sentimentCounts = {}
  for (const c of captures) {
    const s = c.sentiment || 'none'
    sentimentCounts[s] = (sentimentCounts[s] || 0) + 1
  }

  // ── Capture-to-action rate ──
  // How often does capturing a note about a player lead to a board add, draft pick, or prediction?
  const capturedPlayerIds = new Set()
  for (const c of captures) {
    for (const p of c.players) {
      capturedPlayerIds.add(p.playerId)
    }
  }

  let captureToActionRate = null
  if (capturedPlayerIds.size >= 3) {
    // Check how many of these players ended up on boards or in drafts
    const [boardCount, draftCount, predictionCount] = await Promise.all([
      prisma.draftBoardEntry.count({
        where: { board: { userId, sport }, playerId: { in: Array.from(capturedPlayerIds) } },
      }),
      prisma.draftPick.count({
        where: { team: { userId }, playerId: { in: Array.from(capturedPlayerIds) } },
      }),
      prisma.prediction.count({
        where: { userId, subjectPlayerId: { in: Array.from(capturedPlayerIds) } },
      }),
    ])

    const totalCapturedPlayers = capturedPlayerIds.size
    const actedOnPlayers = new Set()
    // We need to know which specific players had actions, so count unique
    const actionedPlayerIds = await prisma.draftBoardEntry.findMany({
      where: { board: { userId, sport }, playerId: { in: Array.from(capturedPlayerIds) } },
      select: { playerId: true },
      distinct: ['playerId'],
    })
    for (const p of actionedPlayerIds) actedOnPlayers.add(p.playerId)

    captureToActionRate = {
      capturedPlayers: totalCapturedPlayers,
      playersActedOn: actedOnPlayers.size,
      rate: Math.round((actedOnPlayers.size / totalCapturedPlayers) * 100) / 100,
      boardAdds: boardCount,
      draftPicks: draftCount,
      predictions: predictionCount,
    }
  }

  return {
    hasCaptureData: true,
    totalCaptures: captures.length,
    captureVolume: {
      total: captures.length,
      monthly: monthlyVolume,
      withPlayers: captures.filter(c => c.players.length > 0).length,
    },
    sentimentBreakdown: sentimentCounts,
    sentimentAccuracy,
    captureToActionRate,
  }
}

// ════════════════════════════════════════════════
//  USER INTELLIGENCE PROFILE
// ════════════════════════════════════════════════

async function generateUserProfile(userId, sport) {
  const currentSeason = new Date().getFullYear()

  const [draftPatterns, predictionPatterns, rosterPatterns, capturePatterns] = await Promise.all([
    detectDraftPatterns(userId, sport),
    detectPredictionPatterns(userId, sport),
    detectRosterPatterns(userId, sport, currentSeason),
    detectCapturePatterns(userId, sport),
  ])

  const strengths = identifyStrengths(draftPatterns, predictionPatterns, rosterPatterns, capturePatterns)
  const weaknesses = identifyWeaknesses(draftPatterns, predictionPatterns, rosterPatterns, capturePatterns)
  const biases = identifyBiases(draftPatterns, predictionPatterns)
  const tendencies = identifyTendencies(draftPatterns, rosterPatterns, capturePatterns)
  const dataConfidence = assessDataConfidence(draftPatterns, predictionPatterns, capturePatterns)
  const oneThingToFix = identifyTopPriority(weaknesses)

  const profile = {
    userId,
    sport,
    generatedAt: new Date(),
    dataConfidence,
    strengths,
    weaknesses,
    biases,
    tendencies,
    oneThingToFix,
    draftPatterns,
    predictionPatterns,
    rosterPatterns,
    capturePatterns,
  }

  // Cache in DB
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 1 week expiry

  await prisma.userIntelligenceProfile.upsert({
    where: { userId_sport: { userId, sport } },
    create: {
      userId,
      sport,
      profileData: profile,
      dataConfidence,
      expiresAt,
    },
    update: {
      profileData: profile,
      dataConfidence,
      generatedAt: new Date(),
      expiresAt,
    },
  })

  return profile
}

/**
 * Get cached profile if valid, otherwise regenerate.
 */
async function getUserProfile(userId, sport) {
  const cached = await prisma.userIntelligenceProfile.findUnique({
    where: { userId_sport: { userId, sport } },
  })

  if (cached && cached.expiresAt > new Date()) {
    return cached.profileData
  }

  return generateUserProfile(userId, sport)
}

// ── Pattern Analysis Helpers ──

function identifyStrengths(draftP, predP, rosterP, captureP) {
  const strengths = []

  if (predP.overallAccuracy != null && predP.overallAccuracy >= 0.60) {
    strengths.push({ area: 'predictions', label: 'Strong prediction accuracy', value: `${Math.round(predP.overallAccuracy * 100)}%` })
  }

  if (predP.biases) {
    for (const b of predP.biases) {
      if (b.type === 'strong_factor') {
        strengths.push({ area: 'predictions', label: `Strong ${b.factor} reads`, value: `${Math.round(b.accuracy * 100)}%` })
      }
      if (b.type === 'well_calibrated') {
        strengths.push({ area: 'predictions', label: 'Well-calibrated confidence', value: null })
      }
    }
  }

  if (draftP.boardAdherence?.followRate != null && draftP.boardAdherence.followRate >= 0.65) {
    strengths.push({ area: 'drafts', label: 'Disciplined drafter — follows the board', value: `${Math.round(draftP.boardAdherence.followRate * 100)}% follow rate` })
  }

  if (rosterP.lineupOptimality?.avgPointsLeftOnBench != null && rosterP.lineupOptimality.avgPointsLeftOnBench < 5) {
    strengths.push({ area: 'lineups', label: 'Efficient lineup setter', value: `Only ${rosterP.lineupOptimality.avgPointsLeftOnBench} pts/week left on bench` })
  }

  if (captureP.captureToActionRate?.rate != null && captureP.captureToActionRate.rate >= 0.50) {
    strengths.push({ area: 'research', label: 'Research translates to action', value: `${Math.round(captureP.captureToActionRate.rate * 100)}% action rate` })
  }

  if (captureP.sentimentAccuracy?.rate != null && captureP.sentimentAccuracy.rate >= 0.60) {
    strengths.push({ area: 'research', label: 'Accurate player reads', value: `${Math.round(captureP.sentimentAccuracy.rate * 100)}% capture accuracy` })
  }

  return strengths
}

function identifyWeaknesses(draftP, predP, rosterP, captureP) {
  const weaknesses = []

  if (predP.overallAccuracy != null && predP.overallAccuracy < 0.45) {
    weaknesses.push({ area: 'predictions', label: 'Prediction accuracy needs work', value: `${Math.round(predP.overallAccuracy * 100)}%`, severity: 'high' })
  }

  if (predP.biases) {
    for (const b of predP.biases) {
      if (b.type === 'weak_factor') {
        weaknesses.push({ area: 'predictions', label: `Weak ${b.factor} reads`, value: `${Math.round(b.accuracy * 100)}%`, severity: 'medium' })
      }
      if (b.type === 'overconfidence') {
        weaknesses.push({ area: 'predictions', label: 'Overconfidence bias', value: 'High confidence picks hit less often', severity: 'high' })
      }
    }
  }

  if (draftP.reachFrequency?.reachRate != null && draftP.reachFrequency.reachRate > 0.40) {
    weaknesses.push({ area: 'drafts', label: 'Frequent reacher', value: `${Math.round(draftP.reachFrequency.reachRate * 100)}% reach rate`, severity: 'medium' })
  }

  if (draftP.positionAllocation?.flags?.length > 0) {
    for (const flag of draftP.positionAllocation.flags) {
      weaknesses.push({ area: 'drafts', label: `Draft allocation: ${flag}`, value: null, severity: 'low' })
    }
  }

  if (rosterP.lineupOptimality?.avgPointsLeftOnBench != null && rosterP.lineupOptimality.avgPointsLeftOnBench > 15) {
    weaknesses.push({ area: 'lineups', label: 'Too many points left on bench', value: `${rosterP.lineupOptimality.avgPointsLeftOnBench} pts/week avg`, severity: 'high' })
  }

  if (captureP.captureToActionRate?.rate != null && captureP.captureToActionRate.rate < 0.20) {
    weaknesses.push({ area: 'research', label: 'Research not translating to action', value: `Only ${Math.round(captureP.captureToActionRate.rate * 100)}% act-on rate`, severity: 'low' })
  }

  return weaknesses
}

function identifyBiases(draftP, predP) {
  const biases = []

  // Position allocation bias
  if (draftP.positionAllocation?.flags) {
    for (const flag of draftP.positionAllocation.flags) {
      biases.push({ type: 'position_allocation', flag, source: 'drafts' })
    }
  }

  // Prediction biases (from predictionPatterns)
  if (predP.biases) {
    for (const b of predP.biases) {
      biases.push({ ...b, source: 'predictions' })
    }
  }

  return biases
}

function identifyTendencies(draftP, rosterP, captureP) {
  const tendencies = []

  if (draftP.auctionPatterns?.earlySpendRate != null) {
    if (draftP.auctionPatterns.earlySpendRate > 0.65) {
      tendencies.push({ type: 'auction_front_loaded', label: 'Front-loads auction budget', value: `${Math.round(draftP.auctionPatterns.earlySpendRate * 100)}% spent in first half` })
    } else if (draftP.auctionPatterns.earlySpendRate < 0.35) {
      tendencies.push({ type: 'auction_patient', label: 'Patient auction strategy', value: `Only ${Math.round(draftP.auctionPatterns.earlySpendRate * 100)}% spent in first half` })
    }
  }

  if (rosterP.tradingStyle?.totalProposed > 5) {
    tendencies.push({ type: 'active_trader', label: 'Active trader', value: `${rosterP.tradingStyle.totalProposed} proposals` })
  } else if (rosterP.tradingStyle?.totalProposed === 0 && rosterP.waiverTendencies?.wonClaims > 3) {
    tendencies.push({ type: 'waiver_warrior', label: 'Prefers waivers over trades', value: `${rosterP.waiverTendencies.wonClaims} claims, 0 trades` })
  }

  if (captureP.captureVolume?.total > 20) {
    tendencies.push({ type: 'prolific_researcher', label: 'Prolific researcher', value: `${captureP.captureVolume.total} captures` })
  }

  if (draftP.boardAdherence?.followRate != null) {
    if (draftP.boardAdherence.followRate >= 0.70) {
      tendencies.push({ type: 'board_disciplined', label: 'Sticks to the plan', value: `${Math.round(draftP.boardAdherence.followRate * 100)}% follow rate` })
    } else if (draftP.boardAdherence.followRate < 0.40) {
      tendencies.push({ type: 'board_reactive', label: 'Reactive drafter — abandons board easily', value: `${Math.round(draftP.boardAdherence.followRate * 100)}% follow rate` })
    }
  }

  return tendencies
}

function assessDataConfidence(draftP, predP, captureP) {
  let score = 0

  // Drafts
  if (draftP.draftCount >= 3) score += 3
  else if (draftP.draftCount >= 1) score += 1

  // Predictions
  if (predP.resolved >= 50) score += 3
  else if (predP.resolved >= 10) score += 1

  // Captures
  if (captureP.totalCaptures >= 20) score += 2
  else if (captureP.totalCaptures >= 5) score += 1

  // Board data
  if (draftP.boardAdherence) score += 1

  if (score >= 7) return 'HIGH'
  if (score >= 3) return 'MEDIUM'
  return 'LOW'
}

function identifyTopPriority(weaknesses) {
  if (weaknesses.length === 0) return null

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  const sorted = [...weaknesses].sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2))
  return sorted[0]
}

module.exports = {
  detectDraftPatterns,
  detectPredictionPatterns,
  detectRosterPatterns,
  detectCapturePatterns,
  generateUserProfile,
  getUserProfile,
}
