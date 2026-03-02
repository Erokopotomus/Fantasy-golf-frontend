import { useMemo } from 'react'

/**
 * Resolves an owner name through the alias map, case-insensitive.
 */
function resolveOwner(name, aliasMap) {
  if (!name) return name
  const lower = name.toLowerCase()
  for (const [raw, canonical] of Object.entries(aliasMap)) {
    if (raw.toLowerCase() === lower) return canonical
  }
  return name
}

/**
 * Reconstruct playoff brackets from weeklyScores + playoffResult data.
 *
 * Strategy:
 * - Filter weeklyScores for isPlayoffs === true across all teams in a season
 * - Group by week → within each week, match opponents by score pairing
 *   (team A's opponentPoints ≈ team B's points and vice versa)
 * - Determine round names from number of matchups (4 matchups = Quarterfinals, 2 = Semifinals, 1 = Championship)
 * - Also extract consolation bracket (isConsolation === true)
 */
function reconstructBracket(seasonTeams) {
  const playoffTeams = []
  const consolationTeams = []

  for (const team of seasonTeams) {
    const ws = team.weeklyScores || []
    const playoffWeeks = ws.filter(w => w.isPlayoffs && !w.isConsolation)
    const consolationWeeks = ws.filter(w => w.isConsolation)

    if (playoffWeeks.length > 0) {
      playoffTeams.push({ ...team, playoffWeeks })
    }
    if (consolationWeeks.length > 0) {
      consolationTeams.push({ ...team, consolationWeeks: consolationWeeks })
    }
  }

  const mainBracket = buildBracketFromWeeks(playoffTeams, 'playoffWeeks')
  const consolationBracket = buildBracketFromWeeks(consolationTeams, 'consolationWeeks')

  return { mainBracket, consolationBracket }
}

function buildBracketFromWeeks(teams, weekKey) {
  if (teams.length === 0) return null

  // Collect all weeks
  const weekNumbers = new Set()
  for (const t of teams) {
    for (const w of t[weekKey]) {
      weekNumbers.add(w.week)
    }
  }
  const sortedWeeks = [...weekNumbers].sort((a, b) => a - b)
  if (sortedWeeks.length === 0) return null

  const rounds = []
  for (const weekNum of sortedWeeks) {
    const matchups = []
    const matched = new Set()

    // Get all team scores for this week
    const weekEntries = teams.map(t => {
      const entry = t[weekKey].find(w => w.week === weekNum)
      return entry ? { owner: t.ownerName, points: entry.points, opponentPoints: entry.opponentPoints, matchupId: entry.matchupId } : null
    }).filter(Boolean)

    // Match by matchupId first, then by score pairing
    for (let i = 0; i < weekEntries.length; i++) {
      if (matched.has(i)) continue
      const a = weekEntries[i]

      for (let j = i + 1; j < weekEntries.length; j++) {
        if (matched.has(j)) continue
        const b = weekEntries[j]

        // Match by matchupId if both have one, or by score pairing
        const matchById = a.matchupId != null && b.matchupId != null && a.matchupId === b.matchupId
        const matchByScore = Math.abs(a.opponentPoints - b.points) < 0.1 && Math.abs(b.opponentPoints - a.points) < 0.1

        if (matchById || matchByScore) {
          const winner = a.points > b.points ? a.owner : b.points > a.points ? b.owner : null
          matchups.push({
            team1: a.owner,
            team2: b.owner,
            score1: a.points,
            score2: b.points,
            winner,
          })
          matched.add(i)
          matched.add(j)
          break
        }
      }

      // If no match found, add as standalone (BYE or data gap)
      if (!matched.has(i)) {
        matchups.push({
          team1: a.owner,
          team2: null,
          score1: a.points,
          score2: null,
          winner: a.owner,
        })
        matched.add(i)
      }
    }

    // Determine round name
    const numMatchups = matchups.length
    let roundName = `Week ${weekNum}`
    if (sortedWeeks.length === 3) {
      const idx = sortedWeeks.indexOf(weekNum)
      roundName = idx === 0 ? 'Quarterfinals' : idx === 1 ? 'Semifinals' : 'Championship'
    } else if (sortedWeeks.length === 2) {
      const idx = sortedWeeks.indexOf(weekNum)
      roundName = idx === 0 ? 'Semifinals' : 'Championship'
    } else if (sortedWeeks.length === 1) {
      roundName = numMatchups > 1 ? 'Playoffs' : 'Championship'
    }

    rounds.push({ week: weekNum, name: roundName, matchups })
  }

  return { rounds, teamCount: teams.length }
}

export function usePlayoffIntelligence(history, aliasMap = {}) {
  // Build championship history — year → champion/runner-up data
  const championshipHistory = useMemo(() => {
    if (!history?.seasons) return []

    const results = []
    for (const [yearStr, teams] of Object.entries(history.seasons)) {
      const year = parseInt(yearStr)
      const champion = teams.find(t => t.playoffResult === 'champion')
      const runnerUp = teams.find(t => t.playoffResult === 'runner_up')
      const thirdPlace = teams.find(t => t.playoffResult === 'third_place')

      if (!champion) continue

      // Find championship matchup from weeklyScores
      let championshipScore = null
      let runnerUpScore = null
      const champWeeks = (champion.weeklyScores || []).filter(w => w.isPlayoffs && !w.isConsolation)
      if (champWeeks.length > 0) {
        const finalWeek = champWeeks[champWeeks.length - 1]
        championshipScore = finalWeek.points
        runnerUpScore = finalWeek.opponentPoints
      }

      results.push({
        year,
        champion: resolveOwner(champion.ownerName, aliasMap),
        championTeam: champion.teamName,
        runnerUp: runnerUp ? resolveOwner(runnerUp.ownerName, aliasMap) : null,
        runnerUpTeam: runnerUp?.teamName,
        thirdPlace: thirdPlace ? resolveOwner(thirdPlace.ownerName, aliasMap) : null,
        championshipScore,
        runnerUpScore,
        margin: championshipScore != null && runnerUpScore != null ? +(championshipScore - runnerUpScore).toFixed(2) : null,
        totalTeams: teams.length,
      })
    }

    return results.sort((a, b) => b.year - a.year)
  }, [history, aliasMap])

  // Build brackets per year
  const brackets = useMemo(() => {
    if (!history?.seasons) return {}

    const result = {}
    for (const [yearStr, teams] of Object.entries(history.seasons)) {
      const resolvedTeams = teams.map(t => ({
        ...t,
        ownerName: resolveOwner(t.ownerName, aliasMap),
      }))
      const { mainBracket, consolationBracket } = reconstructBracket(resolvedTeams)
      if (mainBracket || resolvedTeams.some(t => t.playoffResult && t.playoffResult !== 'missed')) {
        result[yearStr] = { mainBracket, consolationBracket }
      }
    }
    return result
  }, [history, aliasMap])

  // Playoff records — aggregate stats across all seasons
  const playoffRecords = useMemo(() => {
    if (!history?.seasons) return null

    const ownerStats = {}

    const getStats = (owner) => {
      if (!ownerStats[owner]) {
        ownerStats[owner] = {
          owner,
          championships: 0,
          runnerUps: 0,
          playoffAppearances: 0,
          totalSeasons: 0,
          playoffWins: 0,
          playoffLosses: 0,
          playoffPointsFor: 0,
          playoffPointsAgainst: 0,
          regularSeasonPF: 0,
          regularSeasonGames: 0,
          championshipYears: [],
          runnerUpYears: [],
          playoffYears: [],
          lastPlaceFinishes: 0,
          finishPositions: [],
        }
      }
      return ownerStats[owner]
    }

    const years = Object.keys(history.seasons).sort((a, b) => a - b)
    for (const yearStr of years) {
      const teams = history.seasons[yearStr]
      for (const team of teams) {
        const owner = resolveOwner(team.ownerName, aliasMap)
        const stats = getStats(owner)
        stats.totalSeasons++

        if (team.finalStanding) {
          stats.finishPositions.push({ year: parseInt(yearStr), position: team.finalStanding })
        }

        const madePlayoffs = team.playoffResult && team.playoffResult !== 'missed' && team.playoffResult !== 'eliminated'
        if (madePlayoffs) {
          stats.playoffAppearances++
          stats.playoffYears.push(parseInt(yearStr))
        }

        if (team.playoffResult === 'champion') {
          stats.championships++
          stats.championshipYears.push(parseInt(yearStr))
        }
        if (team.playoffResult === 'runner_up') {
          stats.runnerUps++
          stats.runnerUpYears.push(parseInt(yearStr))
        }

        // Last place (highest finalStanding = worst)
        if (team.finalStanding === teams.length || team.finalStanding >= 10) {
          stats.lastPlaceFinishes++
        }

        // Playoff scoring from weeklyScores
        const ws = team.weeklyScores || []
        const playoffWeeks = ws.filter(w => w.isPlayoffs && !w.isConsolation)
        const regWeeks = ws.filter(w => !w.isPlayoffs && !w.isConsolation)

        for (const pw of playoffWeeks) {
          stats.playoffPointsFor += pw.points || 0
          stats.playoffPointsAgainst += pw.opponentPoints || 0
          if (pw.opponentPoints != null) {
            if (pw.points > pw.opponentPoints) stats.playoffWins++
            else if (pw.points < pw.opponentPoints) stats.playoffLosses++
          }
        }

        for (const rw of regWeeks) {
          stats.regularSeasonPF += rw.points || 0
          stats.regularSeasonGames++
        }
      }
    }

    // Compute derived stats
    const ownerList = Object.values(ownerStats).map(s => {
      const totalPlayoffGames = s.playoffWins + s.playoffLosses
      const playoffWinPct = totalPlayoffGames > 0 ? s.playoffWins / totalPlayoffGames : 0
      const playoffAvgScore = totalPlayoffGames > 0 ? s.playoffPointsFor / totalPlayoffGames : 0
      const regAvgScore = s.regularSeasonGames > 0 ? s.regularSeasonPF / s.regularSeasonGames : 0
      const playoffElevation = regAvgScore > 0 ? ((playoffAvgScore - regAvgScore) / regAvgScore * 100) : 0

      // Consecutive playoff appearances
      let maxConsecPlayoffs = 0
      let currentStreak = 0
      const allYears = Object.keys(history.seasons).map(Number).sort()
      for (const y of allYears) {
        if (s.playoffYears.includes(y)) {
          currentStreak++
          maxConsecPlayoffs = Math.max(maxConsecPlayoffs, currentStreak)
        } else {
          // Only break streak if they played that year
          const played = history.seasons[String(y)]?.some(t => resolveOwner(t.ownerName, aliasMap) === s.owner)
          if (played) currentStreak = 0
        }
      }

      // Consecutive championships
      let maxConsecChamps = 0
      currentStreak = 0
      for (const y of allYears) {
        if (s.championshipYears.includes(y)) {
          currentStreak++
          maxConsecChamps = Math.max(maxConsecChamps, currentStreak)
        } else {
          currentStreak = 0
        }
      }

      // Championship drought (years since last championship)
      const lastChampYear = s.championshipYears.length > 0 ? Math.max(...s.championshipYears) : null
      const currentYear = allYears[allYears.length - 1] || new Date().getFullYear()
      const drought = lastChampYear ? currentYear - lastChampYear : null

      return {
        ...s,
        totalPlayoffGames,
        playoffWinPct,
        playoffAvgScore: +playoffAvgScore.toFixed(1),
        regAvgScore: +regAvgScore.toFixed(1),
        playoffElevation: +playoffElevation.toFixed(1),
        maxConsecPlayoffs,
        maxConsecChamps,
        drought,
        firstRoundExits: s.playoffAppearances - s.championships - s.runnerUps - (s.finishPositions.filter(f => f.position === 3).length),
      }
    })

    return ownerList.filter(o => o.totalSeasons > 0).sort((a, b) => b.championships - a.championships || b.playoffWinPct - a.playoffWinPct)
  }, [history, aliasMap])

  // Dynasty tracker — back-to-back champs, repeat winners
  const dynastyData = useMemo(() => {
    if (!championshipHistory.length) return null

    const sorted = [...championshipHistory].sort((a, b) => a.year - b.year)
    const streaks = []
    let currentStreak = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].champion === sorted[i - 1].champion && sorted[i].year === sorted[i - 1].year + 1) {
        currentStreak.push(sorted[i])
      } else {
        if (currentStreak.length >= 2) {
          streaks.push({ owner: currentStreak[0].champion, years: currentStreak.map(s => s.year), count: currentStreak.length })
        }
        currentStreak = [sorted[i]]
      }
    }
    if (currentStreak.length >= 2) {
      streaks.push({ owner: currentStreak[0].champion, years: currentStreak.map(s => s.year), count: currentStreak.length })
    }

    // Biggest blowout and closest championship
    const withMargin = championshipHistory.filter(c => c.margin != null)
    const biggestBlowout = withMargin.length > 0 ? withMargin.reduce((a, b) => (a.margin || 0) > (b.margin || 0) ? a : b) : null
    const closestGame = withMargin.length > 0 ? withMargin.reduce((a, b) => Math.abs(a.margin || 999) < Math.abs(b.margin || 999) ? a : b) : null

    return { streaks, biggestBlowout, closestGame }
  }, [championshipHistory])

  const years = useMemo(() => {
    return championshipHistory.map(c => c.year)
  }, [championshipHistory])

  return {
    championshipHistory,
    brackets,
    playoffRecords,
    dynastyData,
    years,
    hasPlayoffData: championshipHistory.length > 0,
  }
}

export default usePlayoffIntelligence
