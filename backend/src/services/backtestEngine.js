/**
 * Backtest Engine — Strategy Simulation
 *
 * Simulates draft strategies across historical seasons.
 * Uses the materialized views and FantasyScore data to compute
 * what a given pick strategy would have produced.
 *
 * Strategy DSL example:
 * {
 *   "name": "SG:Approach First",
 *   "teamCount": 10,
 *   "rosterSize": 6,
 *   "picks": [
 *     { "round": 1, "criteria": { "stat": "sgApproach", "order": "desc" } },
 *     { "round": 2, "criteria": { "stat": "sgTotal", "order": "desc" } },
 *     { "round": 3, "criteria": { "stat": "top10s", "order": "desc", "normalize": "events" } }
 *   ],
 *   "fallback": { "stat": "owgrRank", "order": "asc" }
 * }
 */

/**
 * Run a backtest simulation.
 *
 * @param {Object}   strategy   — The strategy DSL object
 * @param {string[]} seasonIds  — Season IDs to simulate across (null = all)
 * @param {Object}   prisma     — PrismaClient instance
 * @returns {Object} Simulation results
 */
async function runBacktest(strategy, seasonIds, prisma) {
  const { picks, teamCount = 10, rosterSize = 6, fallback } = strategy

  // Resolve seasons
  let seasons
  if (seasonIds && seasonIds.length > 0) {
    seasons = await prisma.season.findMany({ where: { id: { in: seasonIds } }, orderBy: { year: 'asc' } })
  } else {
    seasons = await prisma.season.findMany({ orderBy: { year: 'asc' } })
  }

  if (seasons.length === 0) {
    return { error: 'No seasons found', results: [] }
  }

  const results = []

  for (const season of seasons) {
    const seasonResult = await simulateSeason(season, strategy, prisma)
    results.push(seasonResult)
  }

  // Aggregate across seasons
  const summary = aggregateResults(results)

  return {
    strategy: { name: strategy.name, teamCount, rosterSize, rounds: picks.length },
    seasons: results,
    summary,
  }
}

/**
 * Simulate a single season with the given strategy.
 */
async function simulateSeason(season, strategy, prisma) {
  const { picks, teamCount = 10, rosterSize = 6, fallback } = strategy

  // Get all players with their stats for this season's timeframe
  const players = await prisma.player.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      owgrRank: true,
      sgTotal: true,
      sgOffTee: true,
      sgApproach: true,
      sgAroundGreen: true,
      sgPutting: true,
      events: true,
      top10s: true,
      cutsMade: true,
      wins: true,
    },
    orderBy: { owgrRank: 'asc' },
  })

  if (players.length === 0) {
    return { seasonId: season.id, seasonName: season.name, year: season.year, error: 'No players', roster: [] }
  }

  // Get fantasy scores for this season to compute actual outcomes
  const fantasyScores = await prisma.fantasyScore.groupBy({
    by: ['playerId'],
    where: { seasonId: season.id },
    _sum: { totalPoints: true },
    _count: { id: true },
    _avg: { totalPoints: true },
  })

  const scoreMap = new Map()
  for (const fs of fantasyScores) {
    scoreMap.set(fs.playerId, {
      totalPoints: fs._sum.totalPoints || 0,
      weeksPlayed: fs._count.id,
      avgPoints: fs._avg.totalPoints || 0,
    })
  }

  // Simulate a snake draft where our team picks at position 1
  // Other teams pick by OWGR (best available)
  const drafted = new Set()
  const userRoster = []
  const userPosition = 0 // First pick

  const totalRounds = Math.max(rosterSize, picks.length)

  for (let round = 1; round <= totalRounds; round++) {
    // Snake draft order
    const pickOrder = round % 2 === 1
      ? Array.from({ length: teamCount }, (_, i) => i)
      : Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i)

    for (const teamIdx of pickOrder) {
      const available = players.filter(p => !drafted.has(p.id))
      if (available.length === 0) break

      if (teamIdx === userPosition) {
        // Our pick — use strategy
        const pick = selectByStrategy(available, round, picks, fallback)
        if (pick) {
          drafted.add(pick.id)
          const outcome = scoreMap.get(pick.id) || { totalPoints: 0, weeksPlayed: 0, avgPoints: 0 }
          userRoster.push({
            round,
            playerId: pick.id,
            playerName: pick.name,
            owgrRank: pick.owgrRank,
            stat: getPickStat(pick, round, picks, fallback),
            ...outcome,
          })
        }
      } else {
        // Other teams pick best available by OWGR
        const bestAvail = available[0] // Already sorted by owgrRank asc
        if (bestAvail) drafted.add(bestAvail.id)
      }
    }
  }

  // Compute roster totals
  const totalPoints = userRoster.reduce((sum, p) => sum + p.totalPoints, 0)
  const avgPerWeek = userRoster.length > 0
    ? userRoster.reduce((sum, p) => sum + p.avgPoints, 0) / userRoster.length
    : 0

  // Rank our roster vs other possible rosters
  // Compare against what a "best OWGR" strategy would have drafted
  const baselinePoints = computeBaselinePoints(players, teamCount, rosterSize, scoreMap)

  return {
    seasonId: season.id,
    seasonName: season.name,
    year: season.year,
    roster: userRoster,
    totalPoints: Math.round(totalPoints * 100) / 100,
    avgPerWeek: Math.round(avgPerWeek * 100) / 100,
    baselinePoints: Math.round(baselinePoints * 100) / 100,
    valueOverBaseline: Math.round((totalPoints - baselinePoints) * 100) / 100,
    rosterSize: userRoster.length,
  }
}

/**
 * Select a player based on the strategy criteria for the given round.
 */
function selectByStrategy(available, round, picks, fallback) {
  // Find the rule for this round
  const rule = picks.find(p => p.round === round) || (fallback ? { criteria: fallback } : null)

  if (!rule || !rule.criteria) {
    // Default: best available by OWGR
    return available[0]
  }

  const { stat, order = 'desc', normalize, minEvents } = rule.criteria

  // Filter by minimum events if specified
  let pool = available
  if (minEvents) {
    const filtered = pool.filter(p => (p.events || 0) >= minEvents)
    if (filtered.length > 0) pool = filtered
  }

  // Sort by the criteria stat
  const sorted = [...pool].sort((a, b) => {
    let aVal = getStatValue(a, stat, normalize)
    let bVal = getStatValue(b, stat, normalize)

    // Handle nulls — push to end
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    return order === 'asc' ? aVal - bVal : bVal - aVal
  })

  return sorted[0] || available[0]
}

/**
 * Get a stat value from a player, optionally normalized.
 */
function getStatValue(player, stat, normalize) {
  let val = player[stat]
  if (val == null) return null

  if (normalize && player[normalize]) {
    val = val / player[normalize]
  }

  return val
}

/**
 * Get the stat label for a pick (for display purposes).
 */
function getPickStat(player, round, picks, fallback) {
  const rule = picks.find(p => p.round === round) || (fallback ? { criteria: fallback } : null)
  if (!rule || !rule.criteria) return { stat: 'owgrRank', value: player.owgrRank }

  const { stat, normalize } = rule.criteria
  return {
    stat: normalize ? `${stat}/${normalize}` : stat,
    value: getStatValue(player, stat, normalize),
  }
}

/**
 * Compute what a pure "best OWGR" strategy would score.
 * This is our baseline to measure strategy value against.
 */
function computeBaselinePoints(players, teamCount, rosterSize, scoreMap) {
  const drafted = new Set()
  const baselineRoster = []

  for (let round = 1; round <= rosterSize; round++) {
    const pickOrder = round % 2 === 1
      ? Array.from({ length: teamCount }, (_, i) => i)
      : Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i)

    for (const teamIdx of pickOrder) {
      const available = players.filter(p => !drafted.has(p.id))
      if (available.length === 0) break

      const pick = available[0] // Best OWGR
      drafted.add(pick.id)

      if (teamIdx === 0) {
        const outcome = scoreMap.get(pick.id) || { totalPoints: 0 }
        baselineRoster.push(outcome.totalPoints)
      }
    }
  }

  return baselineRoster.reduce((sum, pts) => sum + pts, 0)
}

/**
 * Aggregate results across multiple seasons.
 */
function aggregateResults(seasonResults) {
  const valid = seasonResults.filter(r => !r.error)
  if (valid.length === 0) return { seasonsSimulated: 0 }

  const totalPoints = valid.map(r => r.totalPoints)
  const valueOverBaseline = valid.map(r => r.valueOverBaseline)

  return {
    seasonsSimulated: valid.length,
    avgTotalPoints: Math.round(avg(totalPoints) * 100) / 100,
    avgValueOverBaseline: Math.round(avg(valueOverBaseline) * 100) / 100,
    bestSeason: valid.reduce((best, r) => r.totalPoints > (best?.totalPoints || -Infinity) ? r : best, null)?.seasonName,
    worstSeason: valid.reduce((worst, r) => r.totalPoints < (worst?.totalPoints || Infinity) ? r : worst, null)?.seasonName,
    totalPointsRange: {
      min: Math.round(Math.min(...totalPoints) * 100) / 100,
      max: Math.round(Math.max(...totalPoints) * 100) / 100,
    },
    positiveValueSeasons: valueOverBaseline.filter(v => v > 0).length,
    negativeValueSeasons: valueOverBaseline.filter(v => v < 0).length,
  }
}

function avg(arr) {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

module.exports = { runBacktest }
