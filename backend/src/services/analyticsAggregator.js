/**
 * Analytics Aggregator Service
 *
 * Computes and caches analytics data:
 * - Player season stats (counting stats, fantasy points, sport-specific stats)
 * - Average Draft Position (ADP)
 * - Player consistency (boom/bust, floor/ceiling)
 * - Ownership rates across leagues
 * - Draft value tracking (pick → actual outcome)
 */

const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

// ─── Helpers ────────────────────────────────────────────────────────────────

function percentile(sorted, pct) {
  if (sorted.length === 0) return 0
  const idx = Math.max(0, Math.ceil(sorted.length * pct) - 1)
  return sorted[idx]
}

function median(sorted) {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function stdDev(values, avg) {
  if (values.length < 2) return 0
  const sumSqDiff = values.reduce((s, v) => s + (v - avg) ** 2, 0)
  return Math.sqrt(sumSqDiff / (values.length - 1))
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// ─── 1. Player Season Stats ────────────────────────────────────────────────

/**
 * Compute PlayerSeasonStats for every player who has performances in a season.
 * Aggregates counting stats + fantasy points per scoring system.
 */
async function computePlayerSeasonStats(seasonId, prisma) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { sport: true },
  })
  if (!season) return { computed: 0 }

  // Get all fantasy weeks for this season that have scores
  const fantasyWeeks = await prisma.fantasyWeek.findMany({
    where: { seasonId, status: 'COMPLETED', tournamentId: { not: null } },
    select: { id: true, tournamentId: true },
  })
  const tournamentIds = fantasyWeeks.map(fw => fw.tournamentId).filter(Boolean)

  if (tournamentIds.length === 0) return { computed: 0 }

  // Get all performances for these tournaments
  const performances = await prisma.performance.findMany({
    where: { tournamentId: { in: tournamentIds } },
    include: { player: { select: { id: true, owgrRank: true, fedexRank: true } } },
  })

  // Group by player
  const playerPerfs = new Map()
  for (const perf of performances) {
    if (!playerPerfs.has(perf.playerId)) playerPerfs.set(perf.playerId, [])
    playerPerfs.get(perf.playerId).push(perf)
  }

  // Get all scoring systems for this sport
  const scoringSystems = await prisma.scoringSystem.findMany({
    where: { sportId: season.sportId, isSystem: true },
  })

  // Get fantasy scores for points per system
  const allScores = await prisma.fantasyScore.findMany({
    where: { seasonId },
    select: { playerId: true, scoringSystemId: true, totalPoints: true },
  })

  // Index: playerId -> scoringSystemId -> totalPoints[]
  const scoresByPlayer = new Map()
  for (const s of allScores) {
    if (!scoresByPlayer.has(s.playerId)) scoresByPlayer.set(s.playerId, new Map())
    const pMap = scoresByPlayer.get(s.playerId)
    if (!pMap.has(s.scoringSystemId)) pMap.set(s.scoringSystemId, [])
    pMap.get(s.scoringSystemId).push(s.totalPoints)
  }

  let computed = 0

  for (const [playerId, perfs] of playerPerfs) {
    const activePerfs = perfs.filter(p => p.status !== 'WD' && p.status !== 'DQ')

    const events = activePerfs.length
    const wins = activePerfs.filter(p => p.position === 1).length
    const top5s = activePerfs.filter(p => p.position && p.position <= 5).length
    const top10s = activePerfs.filter(p => p.position && p.position <= 10).length
    const cutsMade = activePerfs.filter(p => p.status === 'ACTIVE' || (p.position != null)).length
    const earnings = activePerfs.reduce((s, p) => s + (p.earnings || 0), 0)

    // Fantasy points per scoring system
    const fantasyPoints = {}
    const avgFantasyPoints = {}
    const pScores = scoresByPlayer.get(playerId)
    if (pScores) {
      for (const ss of scoringSystems) {
        const pts = pScores.get(ss.id) || []
        const total = pts.reduce((s, p) => s + p, 0)
        fantasyPoints[ss.slug] = round2(total)
        avgFantasyPoints[ss.slug] = pts.length > 0 ? round2(total / pts.length) : 0
      }
    }

    // Sport-specific stats (golf: SG averages)
    const sgPerfs = activePerfs.filter(p => p.sgTotal != null)
    const stats = {
      sgTotal: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + p.sgTotal, 0) / sgPerfs.length) : null,
      sgPutting: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + (p.sgPutting || 0), 0) / sgPerfs.length) : null,
      sgApproach: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + (p.sgApproach || 0), 0) / sgPerfs.length) : null,
      sgOffTee: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + (p.sgOffTee || 0), 0) / sgPerfs.length) : null,
      sgAroundGreen: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + (p.sgAroundGreen || 0), 0) / sgPerfs.length) : null,
      sgTeeToGreen: sgPerfs.length > 0 ? round2(sgPerfs.reduce((s, p) => s + (p.sgTeeToGreen || 0), 0) / sgPerfs.length) : null,
    }

    // Rankings
    const player = perfs[0].player
    const rankings = {
      owgr: player.owgrRank || null,
      fedex: player.fedexRank || null,
      fantasyRank: {}, // filled below
    }

    await prisma.playerSeasonStats.upsert({
      where: { playerId_seasonId: { playerId, seasonId } },
      update: { events, wins, top5s, top10s, cutsMade, earnings, fantasyPoints, avgFantasyPoints, stats, rankings },
      create: { playerId, seasonId, events, wins, top5s, top10s, cutsMade, earnings, fantasyPoints, avgFantasyPoints, stats, rankings },
    })
    computed++
  }

  // Second pass: compute fantasy rankings per scoring system
  for (const ss of scoringSystems) {
    const allStats = await prisma.playerSeasonStats.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'asc' },
    })

    // Sort by total fantasy points for this system
    const ranked = allStats
      .map(s => ({ id: s.id, playerId: s.playerId, pts: s.fantasyPoints?.[ss.slug] || 0, rankings: s.rankings || {} }))
      .sort((a, b) => b.pts - a.pts)

    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i]
      const updatedRankings = { ...r.rankings, fantasyRank: { ...(r.rankings.fantasyRank || {}), [ss.slug]: i + 1 } }
      await prisma.playerSeasonStats.update({
        where: { id: r.id },
        data: { rankings: updatedRankings },
      })
    }
  }

  return { computed }
}

// ─── 2. ADP ─────────────────────────────────────────────────────────────────

/**
 * Compute Average Draft Position from all completed drafts in a season.
 */
async function computeADP(seasonId, prisma) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } })
  if (!season) return { computed: 0 }

  // Get all completed drafts in leagues for this season
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { seasonId },
    select: { leagueId: true },
  })
  const leagueIds = leagueSeasons.map(ls => ls.leagueId)

  if (leagueIds.length === 0) return { computed: 0 }

  const drafts = await prisma.draft.findMany({
    where: { leagueId: { in: leagueIds }, status: 'COMPLETED' },
    include: { picks: true },
  })

  if (drafts.length === 0) return { computed: 0 }

  // Aggregate picks per player
  const playerPicks = new Map() // playerId -> pickNumber[]
  for (const draft of drafts) {
    for (const pick of draft.picks) {
      if (!playerPicks.has(pick.playerId)) playerPicks.set(pick.playerId, [])
      playerPicks.get(pick.playerId).push(pick.pickNumber)
    }
  }

  // Get fantasy rankings for value comparison
  const seasonStats = await prisma.playerSeasonStats.findMany({
    where: { seasonId },
    select: { playerId: true, rankings: true },
  })
  const rankMap = new Map(seasonStats.map(s => [s.playerId, s.rankings]))

  let computed = 0
  for (const [playerId, picks] of playerPicks) {
    const adp = round2(picks.reduce((s, p) => s + p, 0) / picks.length)
    const minPick = Math.min(...picks)
    const maxPick = Math.max(...picks)

    const rankings = rankMap.get(playerId)
    const actualRank = rankings?.fantasyRank?.standard || null
    const valueOverAdp = actualRank != null ? round2(adp - actualRank) : null

    await prisma.aDPEntry.upsert({
      where: { playerId_seasonId: { playerId, seasonId } },
      update: { adp, minPick, maxPick, timesDrafted: picks.length, actualFantasyRank: actualRank, valueOverAdp },
      create: { playerId, seasonId, adp, minPick, maxPick, timesDrafted: picks.length, actualFantasyRank: actualRank, valueOverAdp },
    })
    computed++
  }

  return { computed }
}

// ─── 3. Consistency ─────────────────────────────────────────────────────────

/**
 * Compute consistency metrics for all players with fantasy scores.
 */
async function computeConsistency(seasonId, scoringSystemId, prisma) {
  // Get all fantasy scores for this season + scoring system
  const scores = await prisma.fantasyScore.findMany({
    where: { seasonId, scoringSystemId },
    select: { playerId: true, fantasyWeekId: true, totalPoints: true },
    orderBy: { fantasyWeekId: 'asc' },
  })

  // Group by player
  const playerScores = new Map()
  for (const s of scores) {
    if (!playerScores.has(s.playerId)) playerScores.set(s.playerId, [])
    playerScores.get(s.playerId).push(s)
  }

  // Get week numbers for the weeklyScores array
  const weeks = await prisma.fantasyWeek.findMany({
    where: { seasonId },
    select: { id: true, weekNumber: true },
  })
  const weekNumMap = new Map(weeks.map(w => [w.id, w.weekNumber]))

  let computed = 0

  for (const [playerId, pScores] of playerScores) {
    if (pScores.length < 2) continue // need at least 2 data points

    const points = pScores.map(s => s.totalPoints)
    const sorted = [...points].sort((a, b) => a - b)
    const avg = round2(points.reduce((s, p) => s + p, 0) / points.length)
    const med = round2(median(sorted))
    const sd = round2(stdDev(points, avg))
    const coeff = avg !== 0 ? round2(sd / Math.abs(avg)) : 0

    const floor = round2(percentile(sorted, 0.1))
    const ceiling = round2(percentile(sorted, 0.9))

    const boomThreshold = avg * 1.5
    const bustThreshold = avg * 0.5
    const boomRate = round2(points.filter(p => p > boomThreshold).length / points.length)
    const bustRate = round2(points.filter(p => p < bustThreshold).length / points.length)

    const weeklyScores = pScores.map(s => ({
      weekId: s.fantasyWeekId,
      weekNumber: weekNumMap.get(s.fantasyWeekId) || 0,
      points: s.totalPoints,
    }))

    await prisma.playerConsistency.upsert({
      where: { playerId_seasonId_scoringSystemId: { playerId, seasonId, scoringSystemId } },
      update: { avgPoints: avg, medianPoints: med, stdDev: sd, coeffOfVariation: coeff, floorPoints: floor, ceilingPoints: ceiling, boomRate, bustRate, weeklyScores },
      create: { playerId, seasonId, scoringSystemId, avgPoints: avg, medianPoints: med, stdDev: sd, coeffOfVariation: coeff, floorPoints: floor, ceilingPoints: ceiling, boomRate, bustRate, weeklyScores },
    })
    computed++
  }

  return { computed }
}

// ─── 4. Ownership ───────────────────────────────────────────────────────────

/**
 * Compute ownership rates — what % of leagues roster each player.
 * If fantasyWeekId is null, computes season-level aggregate.
 */
async function computeOwnership(seasonId, prisma, fantasyWeekId = null) {
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { seasonId, status: { in: ['ACTIVE', 'PLAYOFFS'] } },
    select: { leagueId: true },
  })
  const leagueIds = leagueSeasons.map(ls => ls.leagueId)
  if (leagueIds.length === 0) return { computed: 0 }

  const totalLeagues = leagueIds.length

  // Get all active roster entries across these leagues
  const entries = await prisma.rosterEntry.findMany({
    where: {
      isActive: true,
      team: { leagueId: { in: leagueIds } },
    },
    select: { playerId: true, position: true, team: { select: { leagueId: true } } },
  })

  // Count per player: how many leagues roster them, how many start them
  const playerOwnership = new Map()
  for (const entry of entries) {
    if (!playerOwnership.has(entry.playerId)) {
      playerOwnership.set(entry.playerId, { leagues: new Set(), starts: 0 })
    }
    const po = playerOwnership.get(entry.playerId)
    po.leagues.add(entry.team.leagueId)
    if (entry.position === 'ACTIVE') po.starts++
  }

  // Get previous week's ownership for trending (if this is a weekly calc)
  let prevOwnership = new Map()
  if (fantasyWeekId) {
    const prevWeek = await prisma.fantasyWeek.findFirst({
      where: { seasonId, id: { not: fantasyWeekId }, status: 'COMPLETED' },
      orderBy: { weekNumber: 'desc' },
    })
    if (prevWeek) {
      const prevRates = await prisma.ownershipRate.findMany({
        where: { seasonId, fantasyWeekId: prevWeek.id },
        select: { playerId: true, ownershipPct: true },
      })
      prevOwnership = new Map(prevRates.map(r => [r.playerId, r.ownershipPct]))
    }
  }

  let computed = 0
  for (const [playerId, data] of playerOwnership) {
    const ownershipPct = round2((data.leagues.size / totalLeagues) * 100)
    const totalRostered = entries.filter(e => e.playerId === playerId).length
    const startPct = totalRostered > 0 ? round2((data.starts / totalRostered) * 100) : 0
    const previousWeekPct = prevOwnership.get(playerId) ?? null

    await prisma.ownershipRate.upsert({
      where: { playerId_seasonId_fantasyWeekId: { playerId, seasonId, fantasyWeekId: fantasyWeekId || 'season' } },
      update: { ownershipPct, startPct, previousWeekPct },
      create: { playerId, seasonId, fantasyWeekId, ownershipPct, startPct, previousWeekPct },
    })
    computed++
  }

  return { computed }
}

// ─── 5. Draft Value ─────────────────────────────────────────────────────────

/**
 * Compute draft value for every pick in a league season.
 * Links each draft pick to the actual fantasy output of that player.
 */
async function computeDraftValue(leagueSeasonId, prisma) {
  const ls = await prisma.leagueSeason.findUnique({
    where: { id: leagueSeasonId },
    include: { league: { include: { drafts: { where: { status: 'COMPLETED' }, include: { picks: true } } } } },
  })
  if (!ls || ls.league.drafts.length === 0) return { computed: 0 }

  const draft = ls.league.drafts[0]
  const scoringSystem = ls.league.scoringSystemId
    ? await prisma.scoringSystem.findUnique({ where: { id: ls.league.scoringSystemId } })
    : await prisma.scoringSystem.findFirst({ where: { sportId: ls.league.sportId, isDefault: true } })

  if (!scoringSystem) return { computed: 0 }

  // Get fantasy scores for each drafted player
  const playerIds = draft.picks.map(p => p.playerId)
  const scores = await prisma.fantasyScore.findMany({
    where: { seasonId: ls.seasonId, scoringSystemId: scoringSystem.id, playerId: { in: playerIds } },
    select: { playerId: true, totalPoints: true },
  })

  // Sum total points per player
  const playerTotals = new Map()
  for (const s of scores) {
    playerTotals.set(s.playerId, (playerTotals.get(s.playerId) || 0) + s.totalPoints)
  }

  // Sort by total points for ranking
  const ranked = [...playerTotals.entries()].sort((a, b) => b[1] - a[1])
  const rankMap = new Map(ranked.map(([pid], i) => [pid, i + 1]))

  // Last round average = replacement level
  const lastRoundPicks = draft.picks.filter(p => p.round === draft.picks.reduce((max, pk) => Math.max(max, pk.round), 0))
  const replacementLevel = lastRoundPicks.length > 0
    ? lastRoundPicks.reduce((s, p) => s + (playerTotals.get(p.playerId) || 0), 0) / lastRoundPicks.length
    : 0

  // Get ADP for value comparison
  const adpEntries = await prisma.aDPEntry.findMany({
    where: { seasonId: ls.seasonId, playerId: { in: playerIds } },
    select: { playerId: true, adp: true },
  })
  const adpMap = new Map(adpEntries.map(a => [a.playerId, a.adp]))

  let computed = 0
  for (const pick of draft.picks) {
    const totalPts = playerTotals.get(pick.playerId) || 0
    const rank = rankMap.get(pick.playerId) || null
    const vor = round2(totalPts - replacementLevel)
    const adp = adpMap.get(pick.playerId)
    const valueVsAdp = adp != null && rank != null ? round2(adp - rank) : null

    await prisma.draftValueTracker.upsert({
      where: { draftPickId: pick.id },
      update: { totalFantasyPoints: round2(totalPts), fantasyRank: rank, valueOverReplacement: vor, valueVsAdp },
      create: {
        draftPickId: pick.id,
        playerId: pick.playerId,
        leagueSeasonId,
        pickNumber: pick.pickNumber,
        round: pick.round,
        auctionAmount: pick.amount,
        totalFantasyPoints: round2(totalPts),
        fantasyRank: rank,
        valueOverReplacement: vor,
        valueVsAdp,
      },
    })
    computed++
  }

  return { computed }
}

// ─── 6. Refresh All ─────────────────────────────────────────────────────────

/**
 * Master function to refresh all analytics for a season.
 * Called from cron every Monday at 2 AM ET.
 */
async function refreshAll(seasonId, prisma) {
  const results = {}

  // 1. Player season stats
  results.playerStats = await computePlayerSeasonStats(seasonId, prisma)

  // 2. ADP
  results.adp = await computeADP(seasonId, prisma)

  // 3. Consistency per scoring system
  const scoringSystems = await prisma.scoringSystem.findMany({
    where: { isSystem: true },
  })
  results.consistency = {}
  for (const ss of scoringSystems) {
    results.consistency[ss.slug] = await computeConsistency(seasonId, ss.id, prisma)
  }

  // 4. Ownership (season-level)
  results.ownership = await computeOwnership(seasonId, prisma)

  // 5. Draft value for all league seasons
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { seasonId },
    select: { id: true },
  })
  results.draftValue = { total: 0 }
  for (const ls of leagueSeasons) {
    const dv = await computeDraftValue(ls.id, prisma)
    results.draftValue.total += dv.computed
  }

  return results
}

module.exports = {
  computePlayerSeasonStats,
  computeADP,
  computeConsistency,
  computeOwnership,
  computeDraftValue,
  refreshAll,
}
