/**
 * Fantasy Tracker Service
 *
 * Centralized service for recording fantasy performance data:
 * - Weekly scores per player per scoring system
 * - Lineup snapshots at lock time
 * - Weekly team results with analytics
 * - Roster transaction audit trail
 * - League season finalization
 */

const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

/**
 * Record FantasyScore rows for every player who played in a given fantasy week.
 * Computes points under each active ScoringSystem.
 *
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function recordWeeklyScores(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
    include: { season: true },
  })
  if (!fantasyWeek || !fantasyWeek.tournamentId) return { scored: 0 }

  // Get all scoring systems for this sport
  const scoringSystems = await prisma.scoringSystem.findMany({
    where: { sportId: fantasyWeek.season.sportId, isSystem: true },
  })

  // Get all performances for this tournament
  const performances = await prisma.performance.findMany({
    where: { tournamentId: fantasyWeek.tournamentId },
    include: {
      roundScores: true,
    },
  })

  let scored = 0

  for (const ss of scoringSystems) {
    const scoringConfig = ss.rules

    // Compute scores + ranks for all players
    const playerScores = performances.map((perf) => {
      const { total, breakdown } = calculateFantasyPoints(
        { ...perf, roundScores: perf.roundScores },
        scoringConfig
      )
      return { perf, total, breakdown }
    })

    // Sort by total descending for ranking
    playerScores.sort((a, b) => b.total - a.total)

    for (let i = 0; i < playerScores.length; i++) {
      const { perf, total, breakdown } = playerScores[i]
      const rank = i + 1

      await prisma.fantasyScore.upsert({
        where: {
          fantasyWeekId_scoringSystemId_playerId: {
            fantasyWeekId,
            scoringSystemId: ss.id,
            playerId: perf.playerId,
          },
        },
        update: { totalPoints: total, breakdown, rank, performanceId: perf.id },
        create: {
          fantasyWeekId,
          scoringSystemId: ss.id,
          seasonId: fantasyWeek.seasonId,
          playerId: perf.playerId,
          totalPoints: total,
          breakdown,
          rank,
          performanceId: perf.id,
        },
      })
      scored++
    }
  }

  return { scored, systems: scoringSystems.length, players: performances.length }
}

/**
 * Capture lineup snapshots for all teams in all active leagues for a fantasy week.
 *
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function snapshotLineups(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
  })
  if (!fantasyWeek) return { snapped: 0 }

  // Find all active league seasons
  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { status: 'ACTIVE', seasonId: fantasyWeek.seasonId },
    include: {
      league: {
        include: {
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
    },
  })

  let snapped = 0

  for (const ls of leagueSeasons) {
    for (const team of ls.league.teams) {
      const lineup = team.roster.map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.player.name,
        position: entry.rosterStatus || entry.position,
      }))

      await prisma.lineupSnapshot.upsert({
        where: {
          leagueSeasonId_fantasyWeekId_teamId: {
            leagueSeasonId: ls.id,
            fantasyWeekId,
            teamId: team.id,
          },
        },
        update: { lineup },
        create: {
          leagueSeasonId: ls.id,
          fantasyWeekId,
          teamId: team.id,
          lineup,
        },
      })
      snapped++
    }
  }

  return { snapped }
}

/**
 * Compute weekly team results for all active league seasons.
 * Creates WeeklyTeamResult rows and updates TeamSeason aggregates.
 *
 * @param {string} fantasyWeekId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function computeWeeklyResults(fantasyWeekId, prisma) {
  const fantasyWeek = await prisma.fantasyWeek.findUnique({
    where: { id: fantasyWeekId },
  })
  if (!fantasyWeek) return { computed: 0 }

  const leagueSeasons = await prisma.leagueSeason.findMany({
    where: { status: 'ACTIVE', seasonId: fantasyWeek.seasonId },
    include: {
      league: {
        include: {
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
    // Get the scoring system for this league (or default)
    const scoringSystemId = ls.league.scoringSystemId
    let scoringSystem
    if (scoringSystemId) {
      scoringSystem = await prisma.scoringSystem.findUnique({ where: { id: scoringSystemId } })
    }
    if (!scoringSystem) {
      scoringSystem = await prisma.scoringSystem.findFirst({
        where: { sportId: fantasyWeek.season?.sportId || ls.league.sportId, isDefault: true },
      })
    }
    if (!scoringSystem) continue

    // Get fantasy scores for this week + scoring system
    const weekScores = await prisma.fantasyScore.findMany({
      where: { fantasyWeekId, scoringSystemId: scoringSystem.id },
    })
    const scoreMap = new Map(weekScores.map((s) => [s.playerId, s]))

    const teamResults = []

    for (const team of ls.league.teams) {
      const teamSeason = ls.teamSeasons.find((ts) => ts.teamId === team.id)
      if (!teamSeason) continue

      // Calculate points from active roster
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

      // Compute optimal (best possible lineup)
      const allPlayerPoints = playerScores.map((ps) => ps.points).sort((a, b) => b - a)
      const maxActive = ls.league.settings?.maxActiveLineup || 4
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

    // Auto-score H2H matchups for this week
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
  }

  return { computed }
}

/**
 * Record a roster transaction (called from routes on add/drop/trade/draft).
 *
 * @param {Object} data
 * @param {string} data.type - TransactionType enum value
 * @param {string} data.teamId
 * @param {string} data.playerId
 * @param {string} data.playerName
 * @param {string} [data.leagueId] - Used to find LeagueSeason
 * @param {string} [data.otherTeamId]
 * @param {string} [data.otherPlayerId]
 * @param {string} [data.otherPlayerName]
 * @param {number} [data.draftRound]
 * @param {number} [data.draftPickNumber]
 * @param {number} [data.auctionAmount]
 * @param {number} [data.waiverBid]
 * @param {string} [data.tradeId]
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function recordTransaction(data, prisma) {
  // Find the current LeagueSeason for this team's league
  let leagueSeasonId = null
  let fantasyWeekId = null

  if (data.leagueId) {
    const currentSeason = await prisma.season.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    })

    if (currentSeason) {
      const ls = await prisma.leagueSeason.findFirst({
        where: { leagueId: data.leagueId, seasonId: currentSeason.id },
      })
      if (ls) leagueSeasonId = ls.id

      // Find current or most recent fantasy week
      const fw = await prisma.fantasyWeek.findFirst({
        where: {
          seasonId: currentSeason.id,
          status: { in: ['IN_PROGRESS', 'UPCOMING'] },
        },
        orderBy: { weekNumber: 'asc' },
      })
      if (fw) fantasyWeekId = fw.id
    }
  }

  const transaction = await prisma.rosterTransaction.create({
    data: {
      leagueSeasonId,
      fantasyWeekId,
      teamId: data.teamId,
      type: data.type,
      playerId: data.playerId,
      playerName: data.playerName,
      otherTeamId: data.otherTeamId || null,
      otherPlayerId: data.otherPlayerId || null,
      otherPlayerName: data.otherPlayerName || null,
      draftRound: data.draftRound || null,
      draftPickNumber: data.draftPickNumber || null,
      auctionAmount: data.auctionAmount || null,
      waiverBid: data.waiverBid || null,
      tradeId: data.tradeId || null,
    },
  })

  return transaction
}

/**
 * Finalize a league season — set champion, final standings, final ranks.
 *
 * @param {string} leagueSeasonId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function finalizeLeagueSeason(leagueSeasonId, prisma) {
  const leagueSeason = await prisma.leagueSeason.findUnique({
    where: { id: leagueSeasonId },
    include: { teamSeasons: { include: { team: true } } },
  })
  if (!leagueSeason) return null

  // Sort by totalPoints descending
  const ranked = [...leagueSeason.teamSeasons].sort((a, b) => b.totalPoints - a.totalPoints)

  const finalStandings = []

  for (let i = 0; i < ranked.length; i++) {
    const ts = ranked[i]
    const isChamp = i === 0

    await prisma.teamSeason.update({
      where: { id: ts.id },
      data: {
        finalRank: i + 1,
        isChampion: isChamp,
      },
    })

    finalStandings.push({
      teamId: ts.teamId,
      teamName: ts.team.name,
      rank: i + 1,
      totalPoints: ts.totalPoints,
      wins: ts.wins,
      losses: ts.losses,
    })
  }

  // Update league season
  await prisma.leagueSeason.update({
    where: { id: leagueSeasonId },
    data: {
      status: 'COMPLETED',
      championTeamId: ranked[0]?.teamId || null,
      finalStandings,
    },
  })

  return { champion: ranked[0]?.team?.name, standings: finalStandings }
}

/**
 * Process all completed fantasy weeks that haven't been scored yet.
 * Called from cron after tournament finalization.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function processCompletedWeeks(prisma) {
  // Find fantasy weeks that are COMPLETED but have no FantasyScore records
  const completedWeeks = await prisma.fantasyWeek.findMany({
    where: {
      status: 'COMPLETED',
      fantasyScores: { none: {} },
    },
    orderBy: { weekNumber: 'asc' },
  })

  const results = []
  for (const week of completedWeeks) {
    const scoreResult = await recordWeeklyScores(week.id, prisma)
    const snapResult = await snapshotLineups(week.id, prisma)
    const weekResult = await computeWeeklyResults(week.id, prisma)
    results.push({
      weekId: week.id,
      weekName: week.name,
      ...scoreResult,
      ...snapResult,
      ...weekResult,
    })
  }

  return results
}

/**
 * Update H2H matchup scores from weekly team results.
 * Sets homeScore/awayScore, determines W/L/T, updates TeamSeason records.
 *
 * @param {Object} leagueSeason - LeagueSeason with teamSeasons
 * @param {string} fantasyWeekId
 * @param {number} weekNumber
 * @param {Array} teamResults - [{ teamId, teamSeasonId, totalPoints }]
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function updateMatchupScores(leagueSeason, fantasyWeekId, weekNumber, teamResults, prisma) {
  const pointsByTeam = new Map(teamResults.map(tr => [tr.teamId, tr.totalPoints]))

  // Find matchups for this league + week (try fantasyWeekId first, fall back to week number)
  let matchups = await prisma.matchup.findMany({
    where: { leagueId: leagueSeason.leagueId, fantasyWeekId },
  })

  if (matchups.length === 0) {
    matchups = await prisma.matchup.findMany({
      where: { leagueId: leagueSeason.leagueId, week: weekNumber },
    })
  }

  if (matchups.length === 0) return

  for (const matchup of matchups) {
    const homePoints = pointsByTeam.get(matchup.homeTeamId) ?? 0
    const awayPoints = pointsByTeam.get(matchup.awayTeamId) ?? 0

    let homeResult, awayResult
    if (homePoints > awayPoints) {
      homeResult = 'WIN'
      awayResult = 'LOSS'
    } else if (awayPoints > homePoints) {
      homeResult = 'LOSS'
      awayResult = 'WIN'
    } else {
      homeResult = 'TIE'
      awayResult = 'TIE'
    }

    // Update matchup scores
    await prisma.matchup.update({
      where: { id: matchup.id },
      data: {
        homeScore: Math.round(homePoints * 100) / 100,
        awayScore: Math.round(awayPoints * 100) / 100,
        isComplete: true,
      },
    })

    // Update WeeklyTeamResult with H2H outcome
    const homeWtr = teamResults.find(tr => tr.teamId === matchup.homeTeamId)
    const awayWtr = teamResults.find(tr => tr.teamId === matchup.awayTeamId)

    if (homeWtr) {
      await prisma.weeklyTeamResult.update({
        where: { id: homeWtr.result.id },
        data: {
          opponentTeamId: matchup.awayTeamId,
          opponentPoints: Math.round(awayPoints * 100) / 100,
          result: homeResult,
        },
      })
    }
    if (awayWtr) {
      await prisma.weeklyTeamResult.update({
        where: { id: awayWtr.result.id },
        data: {
          opponentTeamId: matchup.homeTeamId,
          opponentPoints: Math.round(homePoints * 100) / 100,
          result: awayResult,
        },
      })
    }

    // Increment TeamSeason W/L/T
    if (homeWtr) {
      const field = homeResult === 'WIN' ? 'wins' : homeResult === 'LOSS' ? 'losses' : 'ties'
      await prisma.teamSeason.update({
        where: { id: homeWtr.teamSeasonId },
        data: { [field]: { increment: 1 } },
      })
    }
    if (awayWtr) {
      const field = awayResult === 'WIN' ? 'wins' : awayResult === 'LOSS' ? 'losses' : 'ties'
      await prisma.teamSeason.update({
        where: { id: awayWtr.teamSeasonId },
        data: { [field]: { increment: 1 } },
      })
    }
  }

  console.log(`[fantasyTracker] Updated ${matchups.length} matchup scores for league ${leagueSeason.leagueId}, week ${weekNumber}`)
}

module.exports = {
  recordWeeklyScores,
  snapshotLineups,
  computeWeeklyResults,
  updateMatchupScores,
  recordTransaction,
  finalizeLeagueSeason,
  processCompletedWeeks,
}
