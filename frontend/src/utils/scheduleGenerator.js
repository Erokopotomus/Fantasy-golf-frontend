/**
 * Generate a round-robin schedule for head-to-head matchups
 * Uses the circle method for even team counts, with a bye for odd counts
 */
export const generateSchedule = (teams, numWeeks) => {
  const schedule = []
  const teamIds = teams.map(t => t.userId || t.id)

  // Add a bye if odd number of teams
  const allTeams = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, 'BYE']
  const numTeams = allTeams.length

  // Generate round-robin matchups using circle method
  const rotatingTeams = allTeams.slice(1)
  const fixedTeam = allTeams[0]

  let roundNum = 0
  while (schedule.length < numWeeks) {
    const weekMatchups = []
    const round = [...rotatingTeams]

    // First matchup includes the fixed team
    const firstOpponent = round[0]
    if (fixedTeam !== 'BYE' && firstOpponent !== 'BYE') {
      weekMatchups.push({
        home: roundNum % 2 === 0 ? fixedTeam : firstOpponent,
        away: roundNum % 2 === 0 ? firstOpponent : fixedTeam,
        homeScore: null,
        awayScore: null,
        completed: false,
      })
    }

    // Remaining matchups pair up from ends
    for (let i = 1; i < numTeams / 2; i++) {
      const team1 = round[i]
      const team2 = round[numTeams - 1 - i]

      if (team1 !== 'BYE' && team2 !== 'BYE') {
        weekMatchups.push({
          home: i % 2 === 0 ? team1 : team2,
          away: i % 2 === 0 ? team2 : team1,
          homeScore: null,
          awayScore: null,
          completed: false,
        })
      }
    }

    schedule.push({
      week: schedule.length + 1,
      tournament: null, // Will be filled in with actual tournament
      matchups: weekMatchups,
    })

    // Rotate teams (keep first team fixed, rotate the rest)
    const last = rotatingTeams.pop()
    rotatingTeams.unshift(last)
    roundNum++

    // After one full round-robin, start fresh rotation
    if (roundNum >= numTeams - 1) {
      roundNum = 0
    }
  }

  return schedule
}

/**
 * Generate playoff bracket
 */
export const generatePlayoffBracket = (standings, numTeams, format = 'single-elimination') => {
  // Sort standings by wins, then by points for tiebreaker
  const sortedTeams = [...standings]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
    .slice(0, numTeams)

  // Create matchups with seeding (1 vs last, 2 vs second-to-last, etc.)
  const rounds = []
  let currentRound = []

  for (let i = 0; i < numTeams / 2; i++) {
    currentRound.push({
      seed1: i + 1,
      team1: sortedTeams[i],
      seed2: numTeams - i,
      team2: sortedTeams[numTeams - 1 - i],
      winner: null,
      score1: null,
      score2: null,
    })
  }

  rounds.push({ round: 1, name: getRoundName(numTeams, 1), matchups: currentRound })

  // Generate subsequent rounds (empty until completed)
  let teamsRemaining = numTeams / 2
  let roundNum = 2

  while (teamsRemaining >= 2) {
    const nextRound = []
    for (let i = 0; i < teamsRemaining / 2; i++) {
      nextRound.push({
        seed1: null,
        team1: null,
        seed2: null,
        team2: null,
        winner: null,
        score1: null,
        score2: null,
      })
    }
    rounds.push({ round: roundNum, name: getRoundName(numTeams, roundNum), matchups: nextRound })
    teamsRemaining = teamsRemaining / 2
    roundNum++
  }

  return {
    format,
    numTeams,
    rounds,
  }
}

const getRoundName = (totalTeams, roundNum) => {
  const teamsInRound = totalTeams / Math.pow(2, roundNum - 1)

  if (teamsInRound === 2) return 'Championship'
  if (teamsInRound === 4) return 'Semifinals'
  if (teamsInRound === 8) return 'Quarterfinals'
  return `Round ${roundNum}`
}

/**
 * Calculate winning percentage
 */
export const calculateWinPct = (wins, losses, ties) => {
  const totalGames = wins + losses + ties
  if (totalGames === 0) return 0
  return ((wins + ties * 0.5) / totalGames).toFixed(3)
}

/**
 * Calculate streak from match history
 */
export const calculateStreak = (matchHistory, userId) => {
  let streak = 0
  let streakType = null

  for (let i = matchHistory.length - 1; i >= 0; i--) {
    const match = matchHistory[i]
    if (!match.completed) continue

    const isHome = match.home === userId
    const won = isHome
      ? match.homeScore > match.awayScore
      : match.awayScore > match.homeScore
    const tied = match.homeScore === match.awayScore

    if (tied) {
      if (streakType === null || streakType === 'T') {
        streakType = 'T'
        streak++
      } else {
        break
      }
    } else if (won) {
      if (streakType === null || streakType === 'W') {
        streakType = 'W'
        streak++
      } else {
        break
      }
    } else {
      if (streakType === null || streakType === 'L') {
        streakType = 'L'
        streak++
      } else {
        break
      }
    }
  }

  return streakType ? `${streakType}${streak}` : '-'
}

export default {
  generateSchedule,
  generatePlayoffBracket,
  calculateWinPct,
  calculateStreak,
}
