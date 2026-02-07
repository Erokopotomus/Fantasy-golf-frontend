// Scoring Service - Core fantasy points calculation engine

const STANDARD_CONFIG = {
  preset: 'standard',
  positionPoints: {
    1: 30, 2: 20, 3: 18, 4: 16, 5: 14,
    6: 12, 7: 10, 8: 9, 9: 8, 10: 7,
    11: 6, 12: 5, 13: 5, 14: 4, 15: 4,
    16: 3, 17: 3, 18: 3, 19: 2, 20: 2,
    top25: 1.5, top30: 1, madeCut: 0.5, missedCut: -2,
  },
  holeScoring: {
    holeInOne: 5,
    eagle: 5,
    birdie: 3,
    par: 0,
    bogey: -1,
    doubleBogey: -2,
    worseThanDouble: -3,
  },
  bonuses: {
    bogeyFreeRound: 3,
    birdieStreak3: 3,
    under70Round: 0.5, // per stroke under 70
  },
  strokesGained: {
    enabled: false,
    multiplier: 5,
  },
}

const DRAFTKINGS_CONFIG = {
  preset: 'draftkings',
  positionPoints: {
    1: 10, 2: 8, 3: 7, 4: 6, 5: 5,
    6: 4, 7: 3, 8: 2.5, 9: 2, 10: 1.5,
    11: 1, 12: 1, 13: 1, 14: 0.5, 15: 0.5,
    16: 0.5, 17: 0, 18: 0, 19: 0, 20: 0,
    top25: 0, top30: 0, madeCut: 0, missedCut: -1,
  },
  holeScoring: {
    holeInOne: 10,
    eagle: 8,
    birdie: 3,
    par: 0.5,
    bogey: -0.5,
    doubleBogey: -1,
    worseThanDouble: -1.5,
  },
  bonuses: {
    bogeyFreeRound: 3,
    birdieStreak3: 3,
    under70Round: 0,
  },
  strokesGained: {
    enabled: false,
    multiplier: 5,
  },
}

function getDefaultScoringConfig(preset = 'standard') {
  switch (preset) {
    case 'draftkings':
      return JSON.parse(JSON.stringify(DRAFTKINGS_CONFIG))
    case 'custom':
      return JSON.parse(JSON.stringify(STANDARD_CONFIG))
    case 'standard':
    default:
      return JSON.parse(JSON.stringify(STANDARD_CONFIG))
  }
}

/**
 * Calculate fantasy points for a single player performance
 * @param {Object} performance - Performance record with round scores
 * @param {Object} scoringConfig - Scoring configuration
 * @returns {Object} { total, breakdown }
 */
function calculateFantasyPoints(performance, scoringConfig) {
  const config = scoringConfig || STANDARD_CONFIG
  let total = 0
  const breakdown = { position: 0, holes: 0, bonuses: 0, strokesGained: 0 }

  // 1. Position points
  const pos = performance.position
  const status = performance.status

  if (status === 'CUT' || status === 'WD' || status === 'DQ') {
    breakdown.position = config.positionPoints.missedCut || 0
  } else if (pos) {
    if (config.positionPoints[pos] !== undefined) {
      breakdown.position = config.positionPoints[pos]
    } else if (pos <= 25 && config.positionPoints.top25) {
      breakdown.position = config.positionPoints.top25
    } else if (pos <= 30 && config.positionPoints.top30) {
      breakdown.position = config.positionPoints.top30
    } else if (pos > 30) {
      breakdown.position = config.positionPoints.madeCut || 0
    }
  }
  total += breakdown.position

  // 2. Hole scoring (aggregated from performance stats)
  const hs = config.holeScoring
  const holesInOne = performance.holesInOne || 0
  const eagles = performance.eagles || 0
  const birdies = performance.birdies || 0
  const pars = performance.pars || 0
  const bogeys = performance.bogeys || 0
  const doubleBogeys = performance.doubleBogeys || 0
  const worseThanDouble = performance.worseThanDouble || 0

  breakdown.holes += holesInOne * (hs.holeInOne || 0)
  breakdown.holes += eagles * (hs.eagle || 0)
  breakdown.holes += birdies * (hs.birdie || 0)
  breakdown.holes += pars * (hs.par || 0)
  breakdown.holes += bogeys * (hs.bogey || 0)
  breakdown.holes += doubleBogeys * (hs.doubleBogey || 0)
  breakdown.holes += worseThanDouble * (hs.worseThanDouble || 0)
  total += breakdown.holes

  // 3. Bonuses (from round scores)
  const roundScores = performance.roundScores || []
  const bonuses = config.bonuses || {}

  for (const round of roundScores) {
    if (round.bogeyFree && bonuses.bogeyFreeRound) {
      breakdown.bonuses += bonuses.bogeyFreeRound
    }
    if (round.consecutiveBirdies >= 3 && bonuses.birdieStreak3) {
      breakdown.bonuses += bonuses.birdieStreak3
    }
    if (round.score && round.score < 70 && bonuses.under70Round) {
      breakdown.bonuses += bonuses.under70Round * (70 - round.score)
    }
  }
  total += breakdown.bonuses

  // 4. Strokes Gained
  if (config.strokesGained?.enabled && performance.sgTotal != null) {
    breakdown.strokesGained = performance.sgTotal * (config.strokesGained.multiplier || 5)
    total += breakdown.strokesGained
  }

  total = Math.round(total * 100) / 100
  return { total, breakdown }
}

/**
 * Calculate league standings across all completed tournaments
 */
async function calculateLeagueStandings(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          roster: {
            where: { isActive: true },
            include: {
              player: {
                include: {
                  performances: {
                    where: {
                      tournament: { status: 'COMPLETED' },
                    },
                    include: {
                      tournament: { select: { id: true, name: true, startDate: true } },
                    },
                    orderBy: { tournament: { startDate: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!league) return { standings: [], weeklyResults: [] }

  // Collect all player IDs and tournament IDs to batch-fetch round scores
  const playerIds = new Set()
  const tournamentIds = new Set()
  for (const team of league.teams) {
    for (const entry of team.roster) {
      playerIds.add(entry.player.id)
      for (const perf of entry.player.performances) {
        tournamentIds.add(perf.tournamentId)
      }
    }
  }

  // Batch fetch all relevant round scores
  const allRoundScores = await prisma.roundScore.findMany({
    where: {
      playerId: { in: Array.from(playerIds) },
      tournamentId: { in: Array.from(tournamentIds) },
    },
  })

  // Index by tournamentId+playerId
  const rsIndex = {}
  for (const rs of allRoundScores) {
    const key = rs.tournamentId + ':' + rs.playerId
    if (!rsIndex[key]) rsIndex[key] = []
    rsIndex[key].push(rs)
  }

  const scoringConfig = league.settings?.scoringConfig || getDefaultScoringConfig(league.settings?.scoringPreset || 'standard')

  // Build per-tournament results
  const tournamentMap = new Map()
  const teamStandings = []

  for (const team of league.teams) {
    let totalPoints = 0
    const teamTournamentResults = []

    for (const entry of team.roster) {
      for (const perf of entry.player.performances) {
        const tournId = perf.tournamentId
        if (!tournamentMap.has(tournId)) {
          tournamentMap.set(tournId, {
            id: tournId,
            name: perf.tournament.name,
            startDate: perf.tournament.startDate,
          })
        }

        const perfWithRounds = { ...perf, roundScores: rsIndex[tournId + ':' + entry.player.id] || [] }
        const { total } = calculateFantasyPoints(perfWithRounds, scoringConfig)
        totalPoints += total

        let existing = teamTournamentResults.find((r) => r.tournamentId === tournId)
        if (!existing) {
          existing = { tournamentId: tournId, tournamentName: perf.tournament.name, points: 0, players: [] }
          teamTournamentResults.push(existing)
        }
        existing.points += total
        existing.points = Math.round(existing.points * 100) / 100
        existing.players.push({
          playerId: entry.player.id,
          playerName: entry.player.name,
          position: perf.position,
          points: total,
        })
      }
    }

    teamStandings.push({
      teamId: team.id,
      teamName: team.name,
      userId: team.userId,
      userName: team.user?.name,
      userAvatar: team.user?.avatar,
      totalPoints: Math.round(totalPoints * 100) / 100,
      tournamentResults: teamTournamentResults,
      rosterCount: team.roster.length,
    })
  }

  // Sort by total points descending
  teamStandings.sort((a, b) => b.totalPoints - a.totalPoints)

  // Assign rank
  teamStandings.forEach((s, i) => {
    s.rank = i + 1
  })

  // Build weekly results (array of tournament result summaries)
  const weeklyResults = Array.from(tournamentMap.values())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map((t) => ({
      tournamentId: t.id,
      tournamentName: t.name,
      teams: teamStandings.map((ts) => {
        const result = ts.tournamentResults.find((r) => r.tournamentId === t.id)
        return {
          teamId: ts.teamId,
          teamName: ts.teamName,
          points: result?.points || 0,
        }
      }),
    }))

  return { standings: teamStandings, weeklyResults }
}

/**
 * Calculate scoring for a specific tournament within a league
 */
async function calculateTournamentScoring(tournamentId, leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          roster: {
            where: { isActive: true },
            include: {
              player: {
                include: {
                  performances: {
                    where: { tournamentId },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!league) return { teams: [] }

  // Batch fetch round scores for this tournament
  const playerIds = []
  for (const team of league.teams) {
    for (const entry of team.roster) {
      playerIds.push(entry.player.id)
    }
  }

  const allRoundScores = await prisma.roundScore.findMany({
    where: { tournamentId, playerId: { in: playerIds } },
  })

  const rsIndex = {}
  for (const rs of allRoundScores) {
    if (!rsIndex[rs.playerId]) rsIndex[rs.playerId] = []
    rsIndex[rs.playerId].push(rs)
  }

  const scoringConfig = league.settings?.scoringConfig || getDefaultScoringConfig(league.settings?.scoringPreset || 'standard')

  const teamResults = league.teams.map((team) => {
    let teamTotal = 0
    const playerResults = []

    for (const entry of team.roster) {
      const perf = entry.player.performances[0]
      if (perf) {
        const perfWithRounds = { ...perf, roundScores: rsIndex[entry.player.id] || [] }
        const { total, breakdown } = calculateFantasyPoints(perfWithRounds, scoringConfig)
        teamTotal += total
        playerResults.push({
          playerId: entry.player.id,
          playerName: entry.player.name,
          position: perf.position,
          totalToPar: perf.totalToPar,
          status: perf.status,
          fantasyPoints: total,
          breakdown,
          rounds: [perf.round1, perf.round2, perf.round3, perf.round4],
        })
      } else {
        playerResults.push({
          playerId: entry.player.id,
          playerName: entry.player.name,
          position: null,
          totalToPar: null,
          status: 'DNS',
          fantasyPoints: 0,
          breakdown: { position: 0, holes: 0, bonuses: 0, strokesGained: 0 },
          rounds: [],
        })
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      userId: team.userId,
      userName: team.user?.name,
      totalPoints: Math.round(teamTotal * 100) / 100,
      players: playerResults.sort((a, b) => b.fantasyPoints - a.fantasyPoints),
    }
  })

  teamResults.sort((a, b) => b.totalPoints - a.totalPoints)

  return { teams: teamResults, scoringConfig }
}

module.exports = {
  getDefaultScoringConfig,
  calculateFantasyPoints,
  calculateLeagueStandings,
  calculateTournamentScoring,
  STANDARD_CONFIG,
  DRAFTKINGS_CONFIG,
}
