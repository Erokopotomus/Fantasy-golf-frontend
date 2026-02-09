/**
 * NFL Fantasy Tracker Service
 *
 * Weekly scoring pipeline for NFL fantasy leagues:
 * - scoreNflWeek()              — Score all NFL players for a fantasy week
 * - computeNflWeeklyResults()   — Aggregate player scores into team totals, process H2H matchups
 * - processCompletedNflWeeks()  — Cron entry point: find unscored weeks, run full pipeline
 *
 * Mirrors the golf fantasyTracker.js pattern but uses NflPlayerGame stats
 * and nflScoringService for point calculations.
 */

const { calculateFantasyPoints, resolveRules } = require('./nflScoringService')
const { updateMatchupScores, snapshotLineups } = require('./fantasyTracker')

/**
 * Score ALL NFL players who played in a given fantasy week.
 * Creates FantasyScore records for every scoring system.
 *
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ scored: number, systems: number, players: number }}
 */
async function scoreNflWeek(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
    include: { season: true },
  })
  if (!fantasyWeek) return { scored: 0, systems: 0, players: 0 }

  const seasonYear = fantasyWeek.season.year
  const weekNumber = fantasyWeek.weekNumber

  // Fetch all NflPlayerGames for games in this week
  const playerGames = await prisma.nflPlayerGame.findMany({
    where: {
      game: {
        season: seasonYear,
        week: weekNumber,
        gameType: 'REG',
      },
    },
    include: {
      player: { select: { id: true, name: true } },
    },
  })

  if (playerGames.length === 0) {
    console.log(`[nflFantasyTracker] No player games found for week ${weekNumber}, season ${seasonYear}`)
    return { scored: 0, systems: 0, players: 0 }
  }

  // Fetch all NFL scoring systems
  const scoringSystems = await prisma.scoringSystem.findMany({
    where: { sportId: fantasyWeek.season.sportId, isSystem: true },
  })

  if (scoringSystems.length === 0) {
    console.warn('[nflFantasyTracker] No NFL scoring systems found')
    return { scored: 0, systems: 0, players: playerGames.length }
  }

  let scored = 0

  for (const ss of scoringSystems) {
    const rules = resolveRules(ss)

    // Calculate points for all players under this scoring system
    const playerScores = playerGames.map((pg) => {
      const { total, breakdown } = calculateFantasyPoints(pg, rules)
      return { pg, total, breakdown }
    })

    // Sort by total descending for ranking
    playerScores.sort((a, b) => b.total - a.total)

    for (let i = 0; i < playerScores.length; i++) {
      const { pg, total, breakdown } = playerScores[i]
      const rank = i + 1

      await prisma.fantasyScore.upsert({
        where: {
          fantasyWeekId_scoringSystemId_playerId: {
            fantasyWeekId,
            scoringSystemId: ss.id,
            playerId: pg.playerId,
          },
        },
        update: { totalPoints: total, breakdown, rank, performanceId: null },
        create: {
          fantasyWeekId,
          scoringSystemId: ss.id,
          seasonId: fantasyWeek.seasonId,
          playerId: pg.playerId,
          totalPoints: total,
          breakdown,
          rank,
          performanceId: null,
        },
      })
      scored++
    }
  }

  console.log(`[nflFantasyTracker] Scored week ${weekNumber}: ${playerGames.length} players × ${scoringSystems.length} systems = ${scored} records`)
  return { scored, systems: scoringSystems.length, players: playerGames.length }
}

/**
 * Aggregate player scores into team scores for every active NFL league.
 * Creates WeeklyTeamResult rows, processes H2H matchups, updates TeamSeason aggregates.
 *
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ computed: number }}
 */
async function computeNflWeeklyResults(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
    include: { season: true },
  })
  if (!fantasyWeek) return { computed: 0 }

  // Find all active NFL league seasons for this season
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: {
      seasonId: fantasyWeek.seasonId,
      status: 'ACTIVE',
      league: {
        sport: { in: ['NFL', 'nfl'] },
      },
    },
    include: {
      league: {
        include: {
          scoringSystem: true,
          teams: {
            include: {
              roster: {
                where: { isActive: true },
                include: { player: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
      teamSeasons: true,
    },
  })

  let computed = 0

  for (const ls of leagueSeasons) {
    // Resolve scoring rules for this league
    const rules = ls.league.scoringSystem ? resolveRules(ls.league.scoringSystem) : null
    const scoringSystemId = ls.league.scoringSystemId

    // Find the scoring system to use for score lookups
    let lookupScoringSystemId = scoringSystemId
    if (!lookupScoringSystemId) {
      const defaultSs = await prisma.scoringSystem.findFirst({
        where: { sportId: ls.league.sportId, isDefault: true },
      })
      if (defaultSs) lookupScoringSystemId = defaultSs.id
    }
    if (!lookupScoringSystemId) continue

    // Get fantasy scores for this week + scoring system
    const weekScores = await prisma.fantasyScore.findMany({
      where: { fantasyWeekId, scoringSystemId: lookupScoringSystemId },
    })
    const scoreMap = new Map(weekScores.map((s) => [s.playerId, s]))

    const teamResults = []

    for (const team of ls.league.teams) {
      const teamSeason = ls.teamSeasons.find((ts) => ts.teamId === team.id)
      if (!teamSeason) continue

      const playerScores = []
      let totalPoints = 0
      let benchPoints = 0

      for (const entry of team.roster) {
        const fs = scoreMap.get(entry.playerId)
        const pts = fs ? fs.totalPoints : 0
        const entryStatus = entry.rosterStatus || entry.position

        playerScores.push({
          playerId: entry.playerId,
          playerName: entry.player.name,
          points: pts,
          position: entryStatus,
        })

        if (entryStatus === 'ACTIVE') {
          totalPoints += pts
        } else {
          benchPoints += pts
        }
      }

      // Compute optimal lineup (best possible from all rostered players)
      const allPlayerPoints = playerScores.map((ps) => ps.points).sort((a, b) => b - a)
      const maxActive = ls.league.settings?.maxActiveLineup || 9
      const optimalPoints = allPlayerPoints.slice(0, maxActive).reduce((s, p) => s + p, 0)

      totalPoints = Math.round(totalPoints * 100) / 100

      const result = await prisma.weeklyTeamResult.upsert({
        where: {
          leagueSeasonId_teamId_fantasyWeekId: {
            leagueSeasonId: ls.id,
            teamId: team.id,
            fantasyWeekId,
          },
        },
        update: {
          totalPoints,
          playerScores,
          optimalPoints,
          pointsLeftOnBench: Math.round((optimalPoints - totalPoints) * 100) / 100,
        },
        create: {
          leagueSeasonId: ls.id,
          teamSeasonId: teamSeason.id,
          fantasyWeekId,
          teamId: team.id,
          weekNumber: fantasyWeek.weekNumber,
          totalPoints,
          playerScores,
          optimalPoints,
          pointsLeftOnBench: Math.round((optimalPoints - totalPoints) * 100) / 100,
        },
      })

      teamResults.push({ teamId: team.id, teamSeasonId: teamSeason.id, totalPoints, result })
      computed++
    }

    // Assign week ranks
    teamResults.sort((a, b) => b.totalPoints - a.totalPoints)
    for (let i = 0; i < teamResults.length; i++) {
      await prisma.weeklyTeamResult.update({
        where: { id: teamResults[i].result.id },
        data: { weekRank: i + 1 },
      })
    }

    // Auto-score H2H matchups (reuses golf fantasyTracker logic)
    if (ls.league.format === 'HEAD_TO_HEAD') {
      await updateMatchupScores(ls, fantasyWeekId, fantasyWeek.weekNumber, teamResults, prisma)
    }

    // Update TeamSeason aggregates
    for (const tr of teamResults) {
      const allWeekResults = await prisma.weeklyTeamResult.findMany({
        where: { leagueSeasonId: ls.id, teamId: tr.teamId },
      })

      const totalSeasonPoints = allWeekResults.reduce((s, r) => s + r.totalPoints, 0)
      const weekPoints = allWeekResults.map((r) => r.totalPoints)
      const bestWeek = weekPoints.length > 0 ? Math.max(...weekPoints) : null
      const worstWeek = weekPoints.length > 0 ? Math.min(...weekPoints) : null

      await prisma.teamSeason.update({
        where: { id: tr.teamSeasonId },
        data: {
          totalPoints: Math.round(totalSeasonPoints * 100) / 100,
          bestWeekPoints: bestWeek,
          worstWeekPoints: worstWeek,
          stats: {
            avgPointsPerWeek: weekPoints.length > 0
              ? Math.round((totalSeasonPoints / weekPoints.length) * 100) / 100
              : 0,
            weeksPlayed: weekPoints.length,
          },
        },
      })
    }

    // Sync Team model (totalPoints, wins, losses) so getLeague returns correct data
    for (const tr of teamResults) {
      const ts = await prisma.teamSeason.findUnique({ where: { id: tr.teamSeasonId } })
      if (ts) {
        await prisma.team.update({
          where: { id: tr.teamId },
          data: {
            totalPoints: Math.round(ts.totalPoints * 100) / 100,
            wins: ts.wins || 0,
            losses: ts.losses || 0,
          },
        })
      }
    }

    console.log(`[nflFantasyTracker] Computed ${teamResults.length} team results for league "${ls.league.name}", week ${fantasyWeek.weekNumber}`)
  }

  return { computed }
}

/**
 * Cron entry point — finds unscored completed NFL weeks and runs the full pipeline.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Array} Results per week processed
 */
async function processCompletedNflWeeks(prisma) {
  // Find the current NFL season
  const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!nflSport) {
    console.warn('[nflFantasyTracker] NFL sport not found')
    return []
  }

  const nflSeason = await prisma.season.findFirst({
    where: { sportId: nflSport.id, isCurrent: true },
  })
  if (!nflSeason) {
    console.warn('[nflFantasyTracker] No current NFL season found')
    return []
  }

  // Find COMPLETED fantasy weeks with no FantasyScore records
  const unscoredWeeks = await prisma.fantasyWeek.findMany({
    where: {
      seasonId: nflSeason.id,
      status: 'COMPLETED',
      fantasyScores: { none: {} },
    },
    orderBy: { weekNumber: 'asc' },
  })

  if (unscoredWeeks.length === 0) {
    console.log('[nflFantasyTracker] No unscored NFL weeks to process')
    return []
  }

  const results = []

  for (const week of unscoredWeeks) {
    console.log(`[nflFantasyTracker] Processing week ${week.weekNumber}...`)

    const scoreResult = await scoreNflWeek(week.id, prisma)
    const snapResult = await snapshotLineups(week.id, prisma)
    const weekResult = await computeNflWeeklyResults(week.id, prisma)

    results.push({
      weekId: week.id,
      weekName: week.name,
      weekNumber: week.weekNumber,
      ...scoreResult,
      ...snapResult,
      ...weekResult,
    })
  }

  return results
}

module.exports = {
  scoreNflWeek,
  computeNflWeeklyResults,
  processCompletedNflWeeks,
}
