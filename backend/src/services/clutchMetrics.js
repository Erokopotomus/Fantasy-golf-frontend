/**
 * Clutch Metrics Engine — Proprietary Performance Metrics
 *
 * Layer 3 computed metrics:
 *   CPI (Clutch Performance Index): -3.0 to +3.0
 *   Form Score: 0-100
 *   Pressure Score: -2.0 to +2.0
 *   Course Fit Score: 0-100 (Build 3)
 */

const FORMULA_VERSION = 'v1.0'

// ─── Constants ────────────────────────────────────────────────────────────────

const CPI_LOOKBACK_EVENTS = 12
const CPI_DECAY_RATE = 0.92 // per week
const CPI_SG_WEIGHTS = { offTee: 0.30, approach: 0.30, aroundGreen: 0.15, putting: 0.20, sampleBonus: 0.05 }

const FORM_EVENT_WEIGHTS = [0.40, 0.25, 0.20, 0.15]

const PRESSURE_SCALING_FACTOR = 1.5
const PRESSURE_LOOKBACK_MONTHS = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function mean(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

function percentileRank(value, sortedArr) {
  if (sortedArr.length === 0) return 0.5
  let below = 0
  for (const v of sortedArr) {
    if (v < value) below++
  }
  return below / sortedArr.length
}

function weeksAgo(date) {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.max(0, diff / (7 * 24 * 60 * 60 * 1000))
}

// ─── Metric 1: CPI (Clutch Performance Index) ────────────────────────────────
// Scale: -3.0 to +3.0

async function computeCPI(playerId, prisma) {
  // Get last 12 events with SG data
  const performances = await prisma.performance.findMany({
    where: {
      playerId,
      sgTotal: { not: null },
      sgOffTee: { not: null },
      sgApproach: { not: null },
      sgAroundGreen: { not: null },
      sgPutting: { not: null },
    },
    include: {
      tournament: {
        select: {
          id: true, startDate: true, isMajor: true, isSignature: true, isPlayoff: true, fieldSize: true,
        },
      },
    },
    orderBy: { tournament: { startDate: 'desc' } },
    take: CPI_LOOKBACK_EVENTS,
  })

  if (performances.length < 4) return null

  // Compute field strength for each tournament (cached per tournament)
  const fieldStrengthCache = new Map()

  async function getFieldStrength(tournamentId) {
    if (fieldStrengthCache.has(tournamentId)) return fieldStrengthCache.get(tournamentId)
    // Get OWGR ranks of top 30 players in the field
    const fieldPlayers = await prisma.performance.findMany({
      where: { tournamentId },
      include: { player: { select: { owgrRank: true } } },
      take: 100,
    })
    const ranks = fieldPlayers
      .map((p) => p.player?.owgrRank)
      .filter((r) => typeof r === 'number' && r > 0)
      .sort((a, b) => a - b)
      .slice(0, 30)

    if (ranks.length < 10) {
      fieldStrengthCache.set(tournamentId, 0.5)
      return 0.5
    }
    const avgRank = mean(ranks)
    // Normalize: avgRank 10 = 1.0, avgRank 200 = 0.0
    const normalized = clamp(1.0 - (avgRank - 10) / 190, 0, 1)
    fieldStrengthCache.set(tournamentId, normalized)
    return normalized
  }

  // Compute raw CPI contributions
  const contributions = []
  const componentDetails = []

  for (const perf of performances) {
    const roundsPlayed = [perf.round1, perf.round2, perf.round3, perf.round4].filter((r) => r != null).length
    const blendedSG =
      CPI_SG_WEIGHTS.offTee * perf.sgOffTee +
      CPI_SG_WEIGHTS.approach * perf.sgApproach +
      CPI_SG_WEIGHTS.aroundGreen * perf.sgAroundGreen +
      CPI_SG_WEIGHTS.putting * perf.sgPutting +
      CPI_SG_WEIGHTS.sampleBonus * ((roundsPlayed / 4) * perf.sgTotal * 0.1)

    const weeks = weeksAgo(perf.tournament.startDate)
    const recencyWeight = Math.pow(CPI_DECAY_RATE, weeks)

    const fieldStrengthRank = await getFieldStrength(perf.tournament.id)
    const fieldStrengthMult = 1.0 + (fieldStrengthRank - 0.5) * 0.4 // range 0.8-1.2

    const contribution = recencyWeight * fieldStrengthMult * blendedSG
    contributions.push(contribution)

    componentDetails.push({
      tournamentId: perf.tournament.id,
      blendedSG: Math.round(blendedSG * 1000) / 1000,
      recencyWeight: Math.round(recencyWeight * 1000) / 1000,
      fieldStrengthMult: Math.round(fieldStrengthMult * 1000) / 1000,
      contribution: Math.round(contribution * 1000) / 1000,
    })
  }

  const rawCPI = contributions.reduce((s, v) => s + v, 0)

  // For z-score normalization, get all active players' raw CPI approximation
  // We do a simplified version using just sgTotal * events weight
  const allPlayers = await prisma.player.findMany({
    where: { isActive: true, sgTotal: { not: null } },
    select: { sgTotal: true },
  })
  const allValues = allPlayers.map((p) => p.sgTotal).filter((v) => v != null)

  const m = mean(allValues)
  const sd = stddev(allValues)
  const cpi = sd > 0 ? clamp((rawCPI - m * performances.length * 0.5) / (sd * Math.sqrt(performances.length)), -3.0, 3.0) : 0

  return {
    value: Math.round(cpi * 1000) / 1000,
    components: {
      rawCPI: Math.round(rawCPI * 1000) / 1000,
      eventsUsed: performances.length,
      details: componentDetails,
    },
  }
}

// ─── Metric 2: Form Score ─────────────────────────────────────────────────────
// Scale: 0-100

async function computeFormScore(playerId, prisma) {
  // Get last 4-6 completed events (skip WD/DQ)
  const performances = await prisma.performance.findMany({
    where: {
      playerId,
      sgTotal: { not: null },
      status: { notIn: ['WD', 'DQ'] },
    },
    include: {
      tournament: {
        select: { id: true, startDate: true, isMajor: true, isSignature: true, isPlayoff: true },
      },
    },
    orderBy: { tournament: { startDate: 'desc' } },
    take: 6,
  })

  if (performances.length < 2) return null

  // For each event, get all SG totals in the field for percentile computation
  const adjustedPerfs = []

  for (let i = 0; i < Math.min(performances.length, 4); i++) {
    const perf = performances[i]

    // Get field SG totals for percentile
    const fieldPerfs = await prisma.performance.findMany({
      where: { tournamentId: perf.tournament.id, sgTotal: { not: null } },
      select: { sgTotal: true },
    })
    const fieldSgTotals = fieldPerfs.map((p) => p.sgTotal).sort((a, b) => a - b)

    const basePerf = percentileRank(perf.sgTotal, fieldSgTotals)

    // Field strength multiplier (reuse logic from CPI)
    const fieldPlayers = await prisma.performance.findMany({
      where: { tournamentId: perf.tournament.id },
      include: { player: { select: { owgrRank: true } } },
      take: 100,
    })
    const ranks = fieldPlayers
      .map((p) => p.player?.owgrRank)
      .filter((r) => typeof r === 'number' && r > 0)
      .sort((a, b) => a - b)
      .slice(0, 30)
    const avgRank = ranks.length >= 10 ? mean(ranks) : 100
    const fieldStrengthRank = clamp(1.0 - (avgRank - 10) / 190, 0, 1)
    const fieldMult = 0.85 + 0.30 * fieldStrengthRank

    // Event type multiplier
    let eventMult = 1.0
    if (perf.tournament.isMajor) eventMult = 1.15
    else if (perf.tournament.isPlayoff) eventMult = 1.12
    else if (perf.tournament.isSignature) eventMult = 1.10

    const adjustedPerf = basePerf * fieldMult * eventMult

    adjustedPerfs.push({
      tournamentId: perf.tournament.id,
      basePerf: Math.round(basePerf * 1000) / 1000,
      fieldMult: Math.round(fieldMult * 1000) / 1000,
      eventMult,
      adjustedPerf: Math.round(adjustedPerf * 1000) / 1000,
    })
  }

  // Renormalize weights if < 4 events
  const weights = FORM_EVENT_WEIGHTS.slice(0, adjustedPerfs.length)
  const weightSum = weights.reduce((s, w) => s + w, 0)
  const normalizedWeights = weights.map((w) => w / weightSum)

  const weightedSum = adjustedPerfs.reduce((s, p, i) => s + normalizedWeights[i] * p.adjustedPerf, 0)
  const formScore = clamp(weightedSum * 100, 0, 100)

  return {
    value: Math.round(formScore * 10) / 10,
    components: {
      eventsUsed: adjustedPerfs.length,
      weightedSum: Math.round(weightedSum * 1000) / 1000,
      details: adjustedPerfs,
    },
  }
}

// ─── Metric 3: Pressure Score ─────────────────────────────────────────────────
// Scale: -2.0 to +2.0

async function computePressureScore(playerId, prisma) {
  const lookbackDate = new Date()
  lookbackDate.setMonth(lookbackDate.getMonth() - PRESSURE_LOOKBACK_MONTHS)

  // Get all round scores in the lookback period with SG data
  const roundScores = await prisma.roundScore.findMany({
    where: {
      playerId,
      sgTotal: { not: null },
      tournament: { startDate: { gte: lookbackDate } },
    },
    include: {
      tournament: {
        select: { id: true, isMajor: true, isPlayoff: true, isSignature: true, startDate: true },
      },
    },
    orderBy: { tournament: { startDate: 'desc' } },
  })

  if (roundScores.length < 20) return null

  // Classify rounds as pressure or baseline
  const pressureRounds = []
  const baselineRounds = []

  // Group rounds by tournament for in-contention detection
  const roundsByTournament = new Map()
  for (const rs of roundScores) {
    if (!roundsByTournament.has(rs.tournament.id)) {
      roundsByTournament.set(rs.tournament.id, [])
    }
    roundsByTournament.get(rs.tournament.id).push(rs)
  }

  // Determine which R4 rounds are "in contention" — need R3 position data
  const inContentionR4 = new Set()
  for (const [tournamentId, rounds] of roundsByTournament.entries()) {
    // Check if player was in top 10 after R3
    const r3 = rounds.find((r) => r.roundNumber === 3)
    if (r3) {
      const allR3Scores = await prisma.roundScore.findMany({
        where: { tournamentId, roundNumber: { lte: 3 } },
        select: { playerId: true, score: true },
      })
      // Compute cumulative scores through R3 per player
      const cumulativeByPlayer = new Map()
      for (const s of allR3Scores) {
        cumulativeByPlayer.set(s.playerId, (cumulativeByPlayer.get(s.playerId) || 0) + (s.score || 0))
      }
      const sortedScores = [...cumulativeByPlayer.entries()].sort((a, b) => a[1] - b[1])
      const playerIndex = sortedScores.findIndex(([pid]) => pid === playerId)
      if (playerIndex >= 0 && playerIndex < 10) {
        inContentionR4.add(tournamentId)
      }
    }
  }

  for (const rs of roundScores) {
    const isPressure =
      rs.tournament.isMajor ||
      rs.tournament.isPlayoff ||
      (rs.tournament.isSignature && (rs.roundNumber === 3 || rs.roundNumber === 4)) ||
      (rs.roundNumber === 4 && inContentionR4.has(rs.tournament.id))

    if (isPressure) {
      pressureRounds.push(rs.sgTotal)
    } else {
      baselineRounds.push(rs.sgTotal)
    }
  }

  if (pressureRounds.length < 5) return null

  const pressureAvg = mean(pressureRounds)
  const baselineAvg = mean(baselineRounds)
  const pressureDelta = pressureAvg - baselineAvg
  const pressureScore = clamp(pressureDelta * PRESSURE_SCALING_FACTOR, -2.0, 2.0)

  return {
    value: Math.round(pressureScore * 1000) / 1000,
    components: {
      pressureRoundsCount: pressureRounds.length,
      baselineRoundsCount: baselineRounds.length,
      pressureAvgSG: Math.round(pressureAvg * 1000) / 1000,
      baselineAvgSG: Math.round(baselineAvg * 1000) / 1000,
      rawDelta: Math.round(pressureDelta * 1000) / 1000,
    },
  }
}

// ─── Metric 4: Course Fit Score ───────────────────────────────────────────────
// Scale: 0-100 (implemented in Build 3)

async function computeCourseFit(playerId, tournamentId, prisma) {
  // Get tournament's course
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { course: true },
  })
  if (!tournament?.course) return null

  const course = tournament.course
  if (
    course.drivingImportance == null ||
    course.approachImportance == null ||
    course.aroundGreenImportance == null ||
    course.puttingImportance == null
  ) {
    return null
  }

  // Get player SG percentiles (need 8+ events for reliable data)
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { sgOffTee: true, sgApproach: true, sgAroundGreen: true, sgPutting: true, sgTotal: true, events: true },
  })
  if (!player || player.events < 8) return null
  if (player.sgOffTee == null || player.sgApproach == null || player.sgAroundGreen == null || player.sgPutting == null) return null

  // Compute percentiles across all active players with 8+ events
  const allPlayers = await prisma.player.findMany({
    where: {
      isActive: true,
      events: { gte: 8 },
      sgOffTee: { not: null },
      sgApproach: { not: null },
      sgAroundGreen: { not: null },
      sgPutting: { not: null },
      sgTotal: { not: null },
    },
    select: { sgOffTee: true, sgApproach: true, sgAroundGreen: true, sgPutting: true, sgTotal: true },
  })

  const sortedOTT = allPlayers.map((p) => p.sgOffTee).sort((a, b) => a - b)
  const sortedAPP = allPlayers.map((p) => p.sgApproach).sort((a, b) => a - b)
  const sortedARG = allPlayers.map((p) => p.sgAroundGreen).sort((a, b) => a - b)
  const sortedPUT = allPlayers.map((p) => p.sgPutting).sort((a, b) => a - b)
  const sortedTotal = allPlayers.map((p) => p.sgTotal).sort((a, b) => a - b)

  const playerProfile = [
    percentileRank(player.sgOffTee, sortedOTT),
    percentileRank(player.sgApproach, sortedAPP),
    percentileRank(player.sgAroundGreen, sortedARG),
    percentileRank(player.sgPutting, sortedPUT),
  ]

  const courseProfile = [
    course.drivingImportance,
    course.approachImportance,
    course.aroundGreenImportance,
    course.puttingImportance,
  ]

  // Dot product
  const dotProduct = playerProfile.reduce((s, v, i) => s + v * courseProfile[i], 0)
  const courseSelfDot = courseProfile.reduce((s, v) => s + v * v, 0)
  const rawFit = courseSelfDot > 0 ? dotProduct / courseSelfDot : 0

  // Quality multiplier (elite generalists get a floor)
  const overallPercentile = percentileRank(player.sgTotal, sortedTotal)
  const qualityMult = 0.7 + 0.3 * overallPercentile

  // History bonus
  let historyBonus = 0
  const courseHistory = await prisma.playerCourseHistory.findUnique({
    where: { playerId_courseId: { playerId, courseId: course.id } },
  })
  if (courseHistory && courseHistory.rounds >= 4 && courseHistory.sgTotal != null) {
    historyBonus = clamp(courseHistory.rounds * courseHistory.sgTotal * 2, -5, 10)
  }

  const courseFitScore = clamp(rawFit * 100 * qualityMult + historyBonus, 0, 100)

  return {
    value: Math.round(courseFitScore * 10) / 10,
    components: {
      playerProfile: playerProfile.map((v) => Math.round(v * 1000) / 1000),
      courseProfile,
      rawFit: Math.round(rawFit * 1000) / 1000,
      qualityMult: Math.round(qualityMult * 1000) / 1000,
      historyBonus: Math.round(historyBonus * 10) / 10,
      courseName: course.name,
    },
  }
}

// ─── Batch Computation ────────────────────────────────────────────────────────

async function computeAllMetrics(playerId, tournamentId, prisma) {
  const [cpiResult, formResult, pressureResult, fitResult] = await Promise.all([
    computeCPI(playerId, prisma),
    computeFormScore(playerId, prisma),
    computePressureScore(playerId, prisma),
    tournamentId ? computeCourseFit(playerId, tournamentId, prisma) : Promise.resolve(null),
  ])

  const data = {
    playerId,
    tournamentId: tournamentId || null,
    formulaVersion: FORMULA_VERSION,
    cpi: cpiResult?.value ?? null,
    cpiComponents: cpiResult?.components ?? null,
    formScore: formResult?.value ?? null,
    formComponents: formResult?.components ?? null,
    pressureScore: pressureResult?.value ?? null,
    pressureComponents: pressureResult?.components ?? null,
    courseFitScore: fitResult?.value ?? null,
    fitComponents: fitResult?.components ?? null,
    inputs: {
      cpiLookback: CPI_LOOKBACK_EVENTS,
      cpiDecay: CPI_DECAY_RATE,
      formWeights: FORM_EVENT_WEIGHTS,
      pressureLookbackMonths: PRESSURE_LOOKBACK_MONTHS,
    },
    computedAt: new Date(),
  }

  // Upsert into ClutchScore
  await prisma.clutchScore.upsert({
    where: {
      playerId_tournamentId_formulaVersion: {
        playerId,
        tournamentId: tournamentId || null,
        formulaVersion: FORMULA_VERSION,
      },
    },
    update: data,
    create: data,
  })

  return data
}

async function computeForEvent(tournamentId, prisma) {
  console.log(`[ClutchMetrics] Computing metrics for event ${tournamentId}`)

  // Get all players in the field
  const fieldPerfs = await prisma.performance.findMany({
    where: { tournamentId },
    select: { playerId: true },
  })

  let computed = 0
  let skipped = 0

  for (const { playerId } of fieldPerfs) {
    try {
      await computeAllMetrics(playerId, tournamentId, prisma)
      computed++
    } catch (e) {
      console.warn(`[ClutchMetrics] Skipped player ${playerId}: ${e.message}`)
      skipped++
    }
  }

  console.log(`[ClutchMetrics] Event done: ${computed} computed, ${skipped} skipped`)
  return { computed, skipped }
}

async function recomputeAll(prisma) {
  console.log('[ClutchMetrics] Starting weekly recompute for all active players')

  const activePlayers = await prisma.player.findMany({
    where: { isActive: true, sgTotal: { not: null } },
    select: { id: true },
  })

  let computed = 0
  let skipped = 0

  for (const { id: playerId } of activePlayers) {
    try {
      // Weekly snapshot (no tournament)
      await computeAllMetrics(playerId, null, prisma)
      computed++
    } catch (e) {
      skipped++
    }
  }

  console.log(`[ClutchMetrics] Recompute done: ${computed} computed, ${skipped} skipped out of ${activePlayers.length}`)
  return { computed, skipped, total: activePlayers.length }
}

module.exports = {
  computeCPI,
  computeCourseFit,
  computeFormScore,
  computePressureScore,
  computeAllMetrics,
  computeForEvent,
  recomputeAll,
  FORMULA_VERSION,
}
