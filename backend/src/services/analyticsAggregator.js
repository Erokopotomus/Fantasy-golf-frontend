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
const { gradeAllCompletedDrafts } = require('./draftGrader')

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

// ─── 6. Manager Profiles ────────────────────────────────────────────────────

/**
 * Compute/update ManagerProfile + ManagerSeasonSummary for all users.
 * Aggregates from TeamSeason data.
 */
async function computeManagerProfiles(seasonId, prisma) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } })
  if (!season) return { profiles: 0, summaries: 0 }

  // Get all team seasons for this season with user + league info
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { leagueSeason: { seasonId } },
    include: {
      team: { select: { userId: true } },
      leagueSeason: {
        include: {
          league: { select: { sportId: true, format: true, draftType: true } },
        },
      },
    },
  })

  // Group by userId
  const byUser = new Map()
  for (const ts of teamSeasons) {
    const uid = ts.team.userId
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid).push(ts)
  }

  // Get draft value data for draft efficiency
  const draftValues = await prisma.draftValueTracker.findMany({
    where: { leagueSeason: { seasonId } },
    include: { draftPick: { include: { team: { select: { userId: true } } } } },
  })

  const draftByUser = new Map()
  for (const dv of draftValues) {
    const uid = dv.draftPick.team.userId
    if (!draftByUser.has(uid)) draftByUser.set(uid, [])
    draftByUser.get(uid).push(dv)
  }

  let profiles = 0
  let summaries = 0

  for (const [userId, userTS] of byUser) {
    const sportId = season.sportId

    // ── ManagerSeasonSummary ──
    const wins = userTS.reduce((s, ts) => s + ts.wins, 0)
    const losses = userTS.reduce((s, ts) => s + ts.losses, 0)
    const ties = userTS.reduce((s, ts) => s + ts.ties, 0)
    const totalPoints = round2(userTS.reduce((s, ts) => s + ts.totalPoints, 0))
    const championships = userTS.filter(ts => ts.isChampion).length
    const rankedTS = userTS.filter(ts => ts.finalRank != null)
    const avgFinish = rankedTS.length > 0
      ? round2(rankedTS.reduce((s, ts) => s + ts.finalRank, 0) / rankedTS.length)
      : 0
    const bestFinish = rankedTS.length > 0
      ? Math.min(...rankedTS.map(ts => ts.finalRank))
      : null

    // Per-format breakdown
    const byFormat = {}
    const formatGroups = new Map()
    for (const ts of userTS) {
      const fmt = ts.leagueSeason.league.format
      if (!formatGroups.has(fmt)) formatGroups.set(fmt, [])
      formatGroups.get(fmt).push(ts)
    }
    for (const [fmt, fts] of formatGroups) {
      const fRanked = fts.filter(ts => ts.finalRank != null)
      byFormat[fmt] = {
        leagues: fts.length,
        wins: fts.reduce((s, ts) => s + ts.wins, 0),
        losses: fts.reduce((s, ts) => s + ts.losses, 0),
        ties: fts.reduce((s, ts) => s + ts.ties, 0),
        avgFinish: fRanked.length > 0
          ? round2(fRanked.reduce((s, ts) => s + ts.finalRank, 0) / fRanked.length)
          : 0,
        championships: fts.filter(ts => ts.isChampion).length,
      }
    }

    // Draft stats
    const userDrafts = draftByUser.get(userId) || []
    const draftStats = {}
    if (userDrafts.length > 0) {
      const withValue = userDrafts.filter(d => d.valueVsAdp != null)
      draftStats.snakeAvgValue = withValue.length > 0
        ? round2(withValue.reduce((s, d) => s + d.valueVsAdp, 0) / withValue.length)
        : null

      const auctionDrafts = userDrafts.filter(d => d.auctionAmount != null && d.auctionAmount > 0)
      draftStats.auctionROI = auctionDrafts.length > 0
        ? round2(auctionDrafts.reduce((s, d) => s + ((d.totalFantasyPoints || 0) / d.auctionAmount), 0) / auctionDrafts.length)
        : null

      const sorted = [...userDrafts].filter(d => d.totalFantasyPoints != null).sort((a, b) => b.totalFantasyPoints - a.totalFantasyPoints)
      if (sorted.length > 0) {
        draftStats.bestPick = { playerId: sorted[0].playerId, points: sorted[0].totalFantasyPoints, pick: sorted[0].pickNumber }
        draftStats.worstPick = { playerId: sorted[sorted.length - 1].playerId, points: sorted[sorted.length - 1].totalFantasyPoints, pick: sorted[sorted.length - 1].pickNumber }
      }
    }

    await prisma.managerSeasonSummary.upsert({
      where: { userId_sportId_seasonId: { userId, sportId, seasonId } },
      update: { leaguesPlayed: userTS.length, championships, totalPoints, wins, losses, ties, avgFinish, bestFinish, byFormat, draftStats },
      create: { userId, sportId, seasonId, leaguesPlayed: userTS.length, championships, totalPoints, wins, losses, ties, avgFinish, bestFinish, byFormat, draftStats },
    })
    summaries++

    // ── ManagerProfile (per-sport) ──
    // Aggregate across ALL seasons for this user+sport
    const allSeasonSummaries = await prisma.managerSeasonSummary.findMany({
      where: { userId, sportId },
    })

    const totalW = allSeasonSummaries.reduce((s, ss) => s + ss.wins, 0)
    const totalL = allSeasonSummaries.reduce((s, ss) => s + ss.losses, 0)
    const totalT = allSeasonSummaries.reduce((s, ss) => s + ss.ties, 0)
    const totalGames = totalW + totalL + totalT
    const totalChamps = allSeasonSummaries.reduce((s, ss) => s + ss.championships, 0)
    const totalPts = round2(allSeasonSummaries.reduce((s, ss) => s + ss.totalPoints, 0))
    const totalLeagues = allSeasonSummaries.reduce((s, ss) => s + ss.leaguesPlayed, 0)

    const allRanked = allSeasonSummaries.filter(ss => ss.bestFinish != null)
    const profileAvgFinish = allSeasonSummaries.filter(ss => ss.avgFinish > 0).length > 0
      ? round2(allSeasonSummaries.filter(ss => ss.avgFinish > 0).reduce((s, ss) => s + ss.avgFinish, 0) / allSeasonSummaries.filter(ss => ss.avgFinish > 0).length)
      : 0
    const profileBestFinish = allRanked.length > 0
      ? Math.min(...allRanked.map(ss => ss.bestFinish))
      : null

    // Draft efficiency from all drafts
    const allUserDrafts = await prisma.draftValueTracker.findMany({
      where: { draftPick: { team: { userId } } },
      select: { valueVsAdp: true, auctionAmount: true, totalFantasyPoints: true },
    })
    const dvWithValue = allUserDrafts.filter(d => d.valueVsAdp != null)
    const draftEfficiency = dvWithValue.length > 0
      ? round2(dvWithValue.reduce((s, d) => s + d.valueVsAdp, 0) / dvWithValue.length)
      : null

    const auctionPicks = allUserDrafts.filter(d => d.auctionAmount != null && d.auctionAmount > 0)
    const auctionROI = auctionPicks.length > 0
      ? round2(auctionPicks.reduce((s, d) => s + ((d.totalFantasyPoints || 0) / d.auctionAmount), 0) / auctionPicks.length)
      : null

    await prisma.managerProfile.upsert({
      where: { userId_sportId: { userId, sportId } },
      update: {
        totalLeagues, totalSeasons: allSeasonSummaries.length, championships: totalChamps,
        wins: totalW, losses: totalL, ties: totalT,
        winPct: totalGames > 0 ? round2(totalW / totalGames) : 0,
        avgFinish: profileAvgFinish, bestFinish: profileBestFinish,
        totalPoints: totalPts, auctionROI, draftEfficiency,
      },
      create: {
        userId, sportId,
        totalLeagues, totalSeasons: allSeasonSummaries.length, championships: totalChamps,
        wins: totalW, losses: totalL, ties: totalT,
        winPct: totalGames > 0 ? round2(totalW / totalGames) : 0,
        avgFinish: profileAvgFinish, bestFinish: profileBestFinish,
        totalPoints: totalPts, auctionROI, draftEfficiency,
      },
    })
    profiles++
  }

  return { profiles, summaries }
}

// ─── 7. Head-to-Head Records ────────────────────────────────────────────────

/**
 * Compute/update HeadToHeadRecord from WeeklyTeamResult matchup data.
 */
async function computeHeadToHead(seasonId, prisma) {
  // Get all H2H results for this season
  const results = await prisma.weeklyTeamResult.findMany({
    where: {
      leagueSeason: { seasonId },
      opponentTeamId: { not: null },
      result: { not: null },
    },
    include: {
      team: { select: { userId: true } },
      leagueSeason: {
        include: { league: { select: { sportId: true, format: true } } },
      },
    },
  })

  if (results.length === 0) return { computed: 0 }

  // Need opponent userId
  const opponentTeamIds = [...new Set(results.map(r => r.opponentTeamId).filter(Boolean))]
  const opponentTeams = await prisma.team.findMany({
    where: { id: { in: opponentTeamIds } },
    select: { id: true, userId: true },
  })
  const teamUserMap = new Map(opponentTeams.map(t => [t.id, t.userId]))

  // Group: (userId, opponentUserId, sportId, format) → results[]
  const groups = new Map()
  for (const r of results) {
    const uid = r.team.userId
    const oppUid = teamUserMap.get(r.opponentTeamId)
    if (!oppUid || uid === oppUid) continue

    const sportId = r.leagueSeason.league.sportId
    const format = r.leagueSeason.league.format

    // Normalize: always store with lower cuid first
    const [u1, u2] = uid < oppUid ? [uid, oppUid] : [oppUid, uid]
    const isForward = uid === u1 // true if "userId" in the record is the current result's user

    // Per-format key
    const fmtKey = `${u1}|${u2}|${sportId}|${format}`
    if (!groups.has(fmtKey)) groups.set(fmtKey, { u1, u2, sportId, format, results: [] })
    groups.get(fmtKey).results.push({ ...r, isForward })

    // All-format key (format = null)
    const allKey = `${u1}|${u2}|${sportId}|null`
    if (!groups.has(allKey)) groups.set(allKey, { u1, u2, sportId, format: null, results: [] })
    groups.get(allKey).results.push({ ...r, isForward })
  }

  let computed = 0

  for (const [, group] of groups) {
    let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0
    let lastAt = null

    for (const r of group.results) {
      const isWin = r.result === 'WIN'
      const isLoss = r.result === 'LOSS'
      const isTie = r.result === 'TIE'

      if (r.isForward) {
        if (isWin) wins++
        else if (isLoss) losses++
        else if (isTie) ties++
        pointsFor += r.totalPoints || 0
        pointsAgainst += r.opponentPoints || 0
      } else {
        // Flip perspective: their win is our loss
        if (isWin) losses++
        else if (isLoss) wins++
        else if (isTie) ties++
        pointsFor += r.opponentPoints || 0
        pointsAgainst += r.totalPoints || 0
      }

      const ts = r.createdAt
      if (!lastAt || ts > lastAt) lastAt = ts
    }

    const matchupsPlayed = wins + losses + ties
    const avgMargin = matchupsPlayed > 0 ? round2((pointsFor - pointsAgainst) / matchupsPlayed) : 0

    // Compute streaks from forward perspective
    let currentStreak = 0, longestStreak = 0, currentType = null
    const sorted = [...group.results].sort((a, b) => a.createdAt - b.createdAt)
    for (const r of sorted) {
      const rType = r.isForward ? r.result : (r.result === 'WIN' ? 'LOSS' : r.result === 'LOSS' ? 'WIN' : 'TIE')
      if (rType === currentType) {
        currentStreak++
      } else {
        currentType = rType
        currentStreak = 1
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak
    }

    const stats = { currentStreak, longestStreak, avgMargin: round2(avgMargin) }

    await prisma.headToHeadRecord.upsert({
      where: {
        userId_opponentUserId_sportId_leagueFormat: {
          userId: group.u1,
          opponentUserId: group.u2,
          sportId: group.sportId,
          leagueFormat: group.format,
        },
      },
      update: { wins, losses, ties, pointsFor: round2(pointsFor), pointsAgainst: round2(pointsAgainst), matchupsPlayed, lastMatchupAt: lastAt, stats },
      create: {
        userId: group.u1, opponentUserId: group.u2,
        sportId: group.sportId, leagueFormat: group.format,
        wins, losses, ties, pointsFor: round2(pointsFor), pointsAgainst: round2(pointsAgainst),
        matchupsPlayed, lastMatchupAt: lastAt, stats,
      },
    })
    computed++
  }

  return { computed }
}

// ─── 8. Achievements ────────────────────────────────────────────────────────

/**
 * Check and unlock achievements for a user (or all users).
 * Compares current stats against achievement criteria.
 */
async function checkAchievements(userId, prisma) {
  const achievements = await prisma.achievement.findMany()
  if (achievements.length === 0) return { checked: 0, unlocked: 0 }

  // If userId provided, check just that user; else check all
  const users = userId
    ? [{ id: userId }]
    : await prisma.user.findMany({ select: { id: true } })

  let totalUnlocked = 0

  for (const user of users) {
    const uid = user.id

    // Get existing unlocks to skip
    const existingUnlocks = await prisma.achievementUnlock.findMany({
      where: { userId: uid },
      select: { achievementId: true },
    })
    const unlockedSet = new Set(existingUnlocks.map(u => u.achievementId))

    // Load user stats
    const profile = await prisma.managerProfile.findFirst({ where: { userId: uid } })
    const seasonSummaries = await prisma.managerSeasonSummary.findMany({ where: { userId: uid } })
    const ownedLeagues = await prisma.league.count({ where: { ownerId: uid } })

    for (const ach of achievements) {
      if (unlockedSet.has(ach.id)) continue

      const c = ach.criteria || {}
      let earned = false
      let context = {}

      switch (c.type) {
        case 'championships':
          if (profile && profile.championships >= (c.threshold || 1)) {
            earned = true
          }
          break

        case 'career_wins':
          if (profile && profile.wins >= (c.threshold || 1)) {
            earned = true
          }
          break

        case 'total_leagues':
          if (profile && profile.totalLeagues >= (c.threshold || 1)) {
            earned = true
          }
          break

        case 'total_seasons':
          if (profile && profile.totalSeasons >= (c.threshold || 1)) {
            earned = true
          }
          break

        case 'best_finish':
          if (profile && profile.bestFinish != null && profile.bestFinish <= (c.threshold || 3)) {
            earned = true
          }
          break

        case 'season_points':
          for (const ss of seasonSummaries) {
            if (ss.totalPoints >= (c.threshold || 1000)) {
              earned = true
              context = { seasonId: ss.seasonId }
              break
            }
          }
          break

        case 'win_streak':
          if (profile) {
            const stats = profile.stats || {}
            if ((stats.longestWinStreak || 0) >= (c.threshold || 5)) {
              earned = true
            }
          }
          break

        case 'leagues_as_commissioner':
          if (ownedLeagues >= (c.threshold || 3)) {
            earned = true
          }
          break

        case 'sports_played': {
          const sportCount = await prisma.managerProfile.count({
            where: { userId: uid, sportId: { not: null } },
          })
          if (sportCount >= (c.threshold || 2)) {
            earned = true
          }
          break
        }

        case 'draft_value_vs_adp': {
          const steals = await prisma.draftValueTracker.findMany({
            where: { draftPick: { team: { userId: uid } }, valueVsAdp: { gte: c.threshold || 50 } },
            take: 1,
          })
          if (steals.length > 0) {
            earned = true
            context = { draftPickId: steals[0].draftPickId }
          }
          break
        }

        // More complex criteria can be checked here as data accumulates
        default:
          break
      }

      if (earned) {
        await prisma.achievementUnlock.create({
          data: {
            userId: uid,
            achievementId: ach.id,
            context: Object.keys(context).length > 0 ? context : undefined,
          },
        })
        totalUnlocked++
      }
    }
  }

  return { checked: users.length, unlocked: totalUnlocked }
}

// ─── 9. Refresh All ─────────────────────────────────────────────────────────

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

  // 6. Manager profiles + season summaries
  results.managerProfiles = await computeManagerProfiles(seasonId, prisma)

  // 7. Head-to-head records
  results.headToHead = await computeHeadToHead(seasonId, prisma)

  // 8. Achievement checks (all users)
  results.achievements = await checkAchievements(null, prisma)

  // 9. Draft grading (grade any completed but ungraded drafts)
  results.draftGrades = await gradeAllCompletedDrafts(prisma)

  return results
}

module.exports = {
  computePlayerSeasonStats,
  computeADP,
  computeConsistency,
  computeOwnership,
  computeDraftValue,
  computeManagerProfiles,
  computeHeadToHead,
  checkAchievements,
  refreshAll,
}
