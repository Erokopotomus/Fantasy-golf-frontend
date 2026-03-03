/**
 * Coaching Memory Writer Service (Personal AI Coach Vault — Task 3)
 *
 * Runs weekly (Wed 4:30 AM) to distill Pattern Engine output into
 * vault documents stored in CoachingMemory.
 *
 * Pure computation — NO AI calls.
 *
 * Document types written:
 *   - draft_patterns   — draft tendencies from Pattern Engine + DraftGrade records
 *   - roster_patterns  — waiver/trade/lineup patterns from Pattern Engine
 *   - predictions      — prediction accuracy + biases from Pattern Engine
 *   - coaching_log     — rolled-up stats from CoachingInteraction records
 *   - season_narrative — basic team stats (wins, losses, totalPoints)
 */

const prisma = require('../lib/prisma.js')
const patternEngine = require('./patternEngine')

// ════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════

/**
 * Main entry — gets active users (activity in last 30 days),
 * runs writeVaultForUser for each.
 */
async function runMemoryWriter() {
  const startTime = Date.now()
  console.log('[MemoryWriter] Starting weekly vault distillation...')

  const activeUserIds = await getActiveUsers()
  console.log(`[MemoryWriter] Found ${activeUserIds.length} active users`)

  let successCount = 0
  let errorCount = 0

  for (const userId of activeUserIds) {
    try {
      await writeVaultForUser(userId)
      successCount++
    } catch (err) {
      errorCount++
      console.error(`[MemoryWriter] Error writing vault for user ${userId}:`, err.message)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[MemoryWriter] Complete — ${successCount} users updated, ${errorCount} errors, ${elapsed}s elapsed`)

  return { usersProcessed: successCount, errors: errorCount, elapsed: `${elapsed}s` }
}

// ════════════════════════════════════════════════
//  ACTIVE USER DETECTION
// ════════════════════════════════════════════════

/**
 * Returns distinct user IDs who had any activity in the last 30 days:
 *   - Made a prediction
 *   - Made a draft pick
 *   - Had a team updated (roster move)
 *   - Had a coaching interaction
 */
async function getActiveUsers() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [predictionUsers, draftPickUsers, teamUpdateUsers, coachingUsers] = await Promise.all([
    // Users who made predictions recently
    prisma.prediction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),

    // Users who made draft picks recently
    prisma.draftPick.findMany({
      where: { pickedAt: { gte: thirtyDaysAgo } },
      select: { team: { select: { userId: true } } },
    }),

    // Users whose teams were updated recently
    prisma.team.findMany({
      where: { updatedAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),

    // Users who had coaching interactions recently
    prisma.coachingInteraction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  const userIdSet = new Set()
  for (const r of predictionUsers) userIdSet.add(r.userId)
  for (const r of draftPickUsers) if (r.team?.userId) userIdSet.add(r.team.userId)
  for (const r of teamUpdateUsers) userIdSet.add(r.userId)
  for (const r of coachingUsers) userIdSet.add(r.userId)

  return Array.from(userIdSet)
}

// ════════════════════════════════════════════════
//  PER-USER VAULT WRITER
// ════════════════════════════════════════════════

/**
 * Gets user's sports from league memberships, runs Pattern Engine
 * for each sport, writes all vault documents.
 */
async function writeVaultForUser(userId) {
  // Get distinct sports from the user's league memberships
  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    select: {
      league: {
        select: {
          sportRef: { select: { slug: true } },
          sport: true,
        },
      },
    },
  })

  // Collect unique sports — prefer sportRef.slug, fall back to league.sport
  const sportSet = new Set()
  for (const m of memberships) {
    const sport = m.league.sportRef?.slug || m.league.sport?.toLowerCase()
    if (sport) sportSet.add(sport)
  }
  const sports = Array.from(sportSet)

  if (sports.length === 0) {
    console.log(`[MemoryWriter] User ${userId} has no sports — skipping`)
    return
  }

  console.log(`[MemoryWriter] Writing vault for user ${userId} — sports: ${sports.join(', ')}`)

  for (const sport of sports) {
    try {
      // Get the full profile from Pattern Engine (cached if fresh)
      const profile = await patternEngine.getUserProfile(userId, sport)

      // Write all document types in parallel
      await Promise.all([
        writeDraftPatterns(userId, sport, profile),
        writeRosterPatterns(userId, sport, profile),
        writePredictions(userId, sport, profile),
        writeCoachingLog(userId, sport),
        writeSeasonNarrative(userId, sport),
      ])
    } catch (err) {
      console.error(`[MemoryWriter] Error for user ${userId} sport ${sport}:`, err.message)
    }
  }
}

// ════════════════════════════════════════════════
//  DOCUMENT WRITERS
// ════════════════════════════════════════════════

/**
 * Draft patterns: Pattern Engine draftPatterns + DraftGrade summaries
 */
async function writeDraftPatterns(userId, sport, profile) {
  const draftPatterns = profile.draftPatterns || {}

  // Pull DraftGrade records for this user's teams in this sport
  const grades = await prisma.draftGrade.findMany({
    where: {
      team: { userId },
      draft: { league: { sportRef: { slug: sport } } },
    },
    select: {
      overallGrade: true,
      overallScore: true,
      totalValue: true,
      bestPick: true,
      worstPick: true,
      sleepers: true,
      reaches: true,
      algorithm: true,
      gradedAt: true,
    },
    orderBy: { gradedAt: 'desc' },
  })

  // Summarize grade history
  const validGrades = grades.filter(g => g.overallScore != null)
  const gradeSummary = grades.length > 0
    ? {
        totalDraftsGraded: grades.length,
        avgScore: validGrades.length > 0
          ? Math.round((validGrades.reduce((s, g) => s + g.overallScore, 0) / validGrades.length) * 10) / 10
          : null,
        gradeDistribution: buildGradeDistribution(grades),
        bestOverall: validGrades.reduce((best, g) => g.overallScore > (best?.overallScore || 0) ? g : best, null),
        worstOverall: validGrades.reduce((worst, g) => g.overallScore < (worst?.overallScore || 100) ? g : worst, null),
        totalSleepers: grades.reduce((s, g) => s + (Array.isArray(g.sleepers) ? g.sleepers.length : 0), 0),
        totalReaches: grades.reduce((s, g) => s + (Array.isArray(g.reaches) ? g.reaches.length : 0), 0),
      }
    : null

  const content = {
    generatedAt: new Date().toISOString(),
    sport,
    hasDraftData: draftPatterns.hasDraftData || false,
    draftCount: draftPatterns.draftCount || 0,
    totalPicks: draftPatterns.totalPicks || 0,
    positionAllocation: draftPatterns.positionAllocation || {},
    reachFrequency: draftPatterns.reachFrequency || null,
    boardAdherence: draftPatterns.boardAdherence || null,
    tagAccuracy: draftPatterns.tagAccuracy || null,
    boardTagAccuracy: draftPatterns.boardTagAccuracy || null,
    roundByRoundTendency: draftPatterns.roundByRoundTendency || null,
    auctionPatterns: draftPatterns.auctionPatterns || null,
    gradeSummary,
  }

  await upsertVaultDoc(userId, sport, 'draft_patterns', content)
}

/**
 * Roster patterns: waivers, trades, lineup optimality
 */
async function writeRosterPatterns(userId, sport, profile) {
  const rosterPatterns = profile.rosterPatterns || {}

  const content = {
    generatedAt: new Date().toISOString(),
    sport,
    hasRosterData: rosterPatterns.hasRosterData || false,
    waiverTendencies: rosterPatterns.waiverTendencies || null,
    tradingStyle: rosterPatterns.tradingStyle || null,
    lineupOptimality: rosterPatterns.lineupOptimality || null,
  }

  await upsertVaultDoc(userId, sport, 'roster_patterns', content)
}

/**
 * Predictions: accuracy, biases, calibration
 */
async function writePredictions(userId, sport, profile) {
  const predPatterns = profile.predictionPatterns || {}

  const content = {
    generatedAt: new Date().toISOString(),
    sport,
    hasPredictionData: predPatterns.hasPredictionData || false,
    overallAccuracy: predPatterns.overallAccuracy || null,
    totalPredictions: predPatterns.totalPredictions || 0,
    resolved: predPatterns.resolved || 0,
    accuracyByType: predPatterns.accuracyByType || {},
    accuracyByConfidence: predPatterns.accuracyByConfidence || {},
    accuracyByFactor: predPatterns.accuracyByFactor || {},
    biases: predPatterns.biases || [],
    streaks: predPatterns.streaks || null,
  }

  await upsertVaultDoc(userId, sport, 'predictions', content)
}

/**
 * Coaching log: roll up CoachingInteraction records into summary stats.
 * Grouped by insightType, tracks reaction rates and behavior change.
 */
async function writeCoachingLog(userId, sport) {
  const interactions = await prisma.coachingInteraction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (interactions.length === 0) {
    await upsertVaultDoc(userId, sport, 'coaching_log', {
      generatedAt: new Date().toISOString(),
      sport,
      hasInteractions: false,
      totalInteractions: 0,
      byInsightType: {},
      reactionSummary: {},
      behaviorChangedCount: 0,
    })
    return
  }

  // Group by insightType
  const byType = {}
  let behaviorChangedCount = 0
  const reactionCounts = {}

  for (const interaction of interactions) {
    const type = interaction.insightType || 'unknown'
    if (!byType[type]) byType[type] = { count: 0, reacted: 0, behaviorChanged: 0 }
    byType[type].count++

    if (interaction.userReaction) {
      byType[type].reacted++
      const reaction = interaction.userReaction
      reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1
    }

    if (interaction.behaviorChanged) {
      byType[type].behaviorChanged++
      behaviorChangedCount++
    }
  }

  // Compute engagement rate per type
  for (const type of Object.keys(byType)) {
    const t = byType[type]
    t.reactionRate = t.count > 0 ? Math.round((t.reacted / t.count) * 100) / 100 : 0
    t.behaviorChangeRate = t.count > 0 ? Math.round((t.behaviorChanged / t.count) * 100) / 100 : 0
  }

  const totalReacted = interactions.filter(i => i.userReaction).length

  const content = {
    generatedAt: new Date().toISOString(),
    sport,
    hasInteractions: true,
    totalInteractions: interactions.length,
    byInsightType: byType,
    reactionSummary: {
      totalReacted,
      reactionRate: Math.round((totalReacted / interactions.length) * 100) / 100,
      reactionCounts,
    },
    behaviorChangedCount,
    behaviorChangeRate: Math.round((behaviorChangedCount / interactions.length) * 100) / 100,
    lastInteraction: interactions[0].createdAt.toISOString(),
  }

  await upsertVaultDoc(userId, sport, 'coaching_log', content)
}

/**
 * Season narrative: basic stats from Team model (wins, losses, ties, totalPoints)
 * per league in this sport.
 */
async function writeSeasonNarrative(userId, sport) {
  const teams = await prisma.team.findMany({
    where: {
      userId,
      league: { sportRef: { slug: sport } },
    },
    select: {
      id: true,
      name: true,
      wins: true,
      losses: true,
      ties: true,
      totalPoints: true,
      league: {
        select: {
          id: true,
          name: true,
          sport: true,
          status: true,
          maxTeams: true,
        },
      },
    },
  })

  if (teams.length === 0) {
    await upsertVaultDoc(userId, sport, 'season_narrative', {
      generatedAt: new Date().toISOString(),
      sport,
      hasSeasonData: false,
      leagues: [],
    })
    return
  }

  const leagueSummaries = teams.map(team => {
    const totalGames = team.wins + team.losses + team.ties
    const winPct = totalGames > 0
      ? Math.round((team.wins / totalGames) * 1000) / 1000
      : null

    return {
      leagueId: team.league.id,
      leagueName: team.league.name,
      leagueStatus: team.league.status,
      maxTeams: team.league.maxTeams,
      teamId: team.id,
      teamName: team.name,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      totalGames,
      winPct,
      totalPoints: Math.round(team.totalPoints * 100) / 100,
      avgPointsPerGame: totalGames > 0
        ? Math.round((team.totalPoints / totalGames) * 100) / 100
        : null,
    }
  })

  // Aggregate across all leagues
  const totals = leagueSummaries.reduce((acc, l) => ({
    totalWins: acc.totalWins + l.wins,
    totalLosses: acc.totalLosses + l.losses,
    totalTies: acc.totalTies + l.ties,
    totalPoints: acc.totalPoints + l.totalPoints,
    totalGames: acc.totalGames + l.totalGames,
  }), { totalWins: 0, totalLosses: 0, totalTies: 0, totalPoints: 0, totalGames: 0 })

  totals.overallWinPct = totals.totalGames > 0
    ? Math.round((totals.totalWins / totals.totalGames) * 1000) / 1000
    : null

  const content = {
    generatedAt: new Date().toISOString(),
    sport,
    hasSeasonData: true,
    leagueCount: leagueSummaries.length,
    leagues: leagueSummaries,
    aggregated: totals,
  }

  await upsertVaultDoc(userId, sport, 'season_narrative', content)
}

// ════════════════════════════════════════════════
//  UPSERT — only writes if content changed
// ════════════════════════════════════════════════

/**
 * Upsert a vault document. Only writes if content actually changed
 * (deep JSON comparison). Increments version on real updates.
 */
async function upsertVaultDoc(userId, sport, documentType, newContent) {
  const existing = await prisma.coachingMemory.findUnique({
    where: {
      userId_sport_documentType: { userId, sport, documentType },
    },
  })

  // Strip generatedAt for comparison so timestamp alone doesn't trigger an update
  const compareNew = { ...newContent }
  delete compareNew.generatedAt
  const compareExisting = existing ? { ...existing.content } : null
  if (compareExisting) delete compareExisting.generatedAt

  const contentChanged = !existing || JSON.stringify(compareNew) !== JSON.stringify(compareExisting)

  if (!contentChanged) {
    return // No change — skip write
  }

  const nextVersion = existing ? existing.version + 1 : 1

  await prisma.coachingMemory.upsert({
    where: {
      userId_sport_documentType: { userId, sport, documentType },
    },
    create: {
      userId,
      sport,
      documentType,
      content: newContent,
      version: 1,
      lastUpdatedBy: 'memory_writer',
    },
    update: {
      content: newContent,
      version: nextVersion,
      lastUpdatedBy: 'memory_writer',
    },
  })
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════

/**
 * Builds a distribution count of letter grades from DraftGrade records.
 */
function buildGradeDistribution(grades) {
  const dist = {}
  for (const g of grades) {
    const letter = g.overallGrade || 'N/A'
    dist[letter] = (dist[letter] || 0) + 1
  }
  return dist
}

// ════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════

module.exports = {
  runMemoryWriter,
  writeVaultForUser,
}
