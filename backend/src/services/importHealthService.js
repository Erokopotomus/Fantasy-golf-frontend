/**
 * Import Health Service
 *
 * Analyzes imported league history data for completeness, accuracy, and anomalies.
 * Runs checks against HistoricalSeason records and returns a structured health report
 * with per-season scores, issues, and suggested repair actions.
 *
 * No schema changes required — all checks run against existing data.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CURRENT_YEAR = new Date().getFullYear()

// Expected game counts by NFL era (regular season games)
const NFL_GAMES_BY_ERA = {
  // 2021+ : 17-game season → expect 13–17 total W+L+T
  2021: { min: 13, max: 17, typical: 14 },
  // 2001-2020: 16-game season → expect 12–16 total
  2001: { min: 12, max: 16, typical: 13 },
  // pre-2001: varies, be lenient
  1990: { min: 10, max: 16, typical: 13 },
}

function getExpectedGameRange(year) {
  if (year >= 2021) return NFL_GAMES_BY_ERA[2021]
  if (year >= 2001) return NFL_GAMES_BY_ERA[2001]
  return NFL_GAMES_BY_ERA[1990]
}

/**
 * Analyze league health — queries all HistoricalSeason records, runs checks, returns report.
 */
async function analyzeLeagueHealth(leagueId) {
  const seasons = await prisma.historicalSeason.findMany({
    where: { leagueId },
    orderBy: { seasonYear: 'asc' },
    select: {
      id: true,
      seasonYear: true,
      teamName: true,
      ownerName: true,
      wins: true,
      losses: true,
      ties: true,
      pointsFor: true,
      pointsAgainst: true,
      finalStanding: true,
      playoffResult: true,
      weeklyScores: true,
    },
  })

  if (seasons.length === 0) {
    return {
      overallScore: 100,
      overallStatus: 'green',
      seasonCount: 0,
      yearRange: [],
      missingYears: [],
      issues: [],
      perSeason: {},
    }
  }

  // Group by year
  const byYear = {}
  for (const s of seasons) {
    if (!byYear[s.seasonYear]) byYear[s.seasonYear] = []
    byYear[s.seasonYear].push(s)
  }

  const yearNums = Object.keys(byYear).map(Number).sort((a, b) => a - b)
  const minYear = yearNums[0]
  const maxYear = yearNums[yearNums.length - 1]

  // Mode team count (most common team count across seasons)
  const teamCounts = yearNums.map(y => byYear[y].length)
  const countFreq = {}
  for (const c of teamCounts) countFreq[c] = (countFreq[c] || 0) + 1
  const modeTeamCount = Object.entries(countFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
    ? parseInt(Object.entries(countFreq).sort((a, b) => b[1] - a[1])[0][0])
    : 12

  // Collect all issues
  const allIssues = []
  const perSeason = {}

  // --- Check 1: MISSING_SEASON (gap years) ---
  const missingYears = []
  for (let y = minYear; y <= maxYear; y++) {
    if (!byYear[y]) missingYears.push(y)
  }
  for (const y of missingYears) {
    allIssues.push({
      type: 'MISSING_SEASON',
      severity: 'high',
      seasonYear: y,
      message: `No data found for the ${y} season.`,
      repairAction: 'ADD_SEASON',
      repairLabel: `Add ${y} Season`,
    })
  }

  // Per-year checks
  for (const year of yearNums) {
    const teams = byYear[year]
    const yearIssues = []

    // --- Check 2: GAME_COUNT_ANOMALY ---
    const expectedRange = getExpectedGameRange(year)
    for (const t of teams) {
      const totalGames = (t.wins || 0) + (t.losses || 0) + (t.ties || 0)
      if (totalGames > 0 && (totalGames < expectedRange.min || totalGames > expectedRange.max)) {
        yearIssues.push({
          type: 'GAME_COUNT_ANOMALY',
          severity: 'medium',
          seasonYear: year,
          message: `${year}: ${t.ownerName || t.teamName} shows ${totalGames} games played (expected ${expectedRange.min}-${expectedRange.max}).`,
          repairAction: 'EDIT_SEASON',
          repairLabel: `Edit ${year} Season`,
        })
        break // Only flag once per season
      }
    }

    // --- Check 3: ZERO_POINTS (all teams or some teams) ---
    const teamsWithPoints = teams.filter(t => Number(t.pointsFor) > 0)
    if (teamsWithPoints.length === 0 && year < CURRENT_YEAR) {
      // ALL teams have 0 points — entire season missing point data
      yearIssues.push({
        type: 'ZERO_POINTS',
        severity: 'high',
        seasonYear: year,
        message: `${year}: No teams have points scored — season point data is missing.`,
        repairAction: 'EDIT_SEASON',
        repairLabel: `Edit ${year} Season`,
      })
    } else if (teamsWithPoints.length > 0 && teamsWithPoints.length < teams.length) {
      // SOME teams have 0 points
      const zeroTeams = teams.filter(t => Number(t.pointsFor) === 0)
      yearIssues.push({
        type: 'ZERO_POINTS',
        severity: 'medium',
        seasonYear: year,
        message: `${year}: ${zeroTeams.length} team${zeroTeams.length !== 1 ? 's have' : ' has'} 0 points scored while others have data.`,
        repairAction: 'EDIT_SEASON',
        repairLabel: `Edit ${year} Season`,
      })
    }

    // --- Check 4: POINTS_OUTLIER ---
    if (teamsWithPoints.length >= 4) {
      const pfValues = teamsWithPoints.map(t => Number(t.pointsFor))
      const mean = pfValues.reduce((a, b) => a + b, 0) / pfValues.length
      const variance = pfValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / pfValues.length
      const stdDev = Math.sqrt(variance)

      if (stdDev > 0) {
        for (const t of teams) {
          const pf = Number(t.pointsFor)
          if (pf > 0 && Math.abs(pf - mean) > 3 * stdDev) {
            yearIssues.push({
              type: 'POINTS_OUTLIER',
              severity: 'low',
              seasonYear: year,
              message: `${year}: ${t.ownerName || t.teamName} has ${pf.toFixed(1)} PF which is unusually ${pf > mean ? 'high' : 'low'} for the season.`,
              repairAction: 'EDIT_SEASON',
              repairLabel: `Review ${year} Season`,
            })
            break
          }
        }
      }
    }

    // --- Check 5: TEAM_COUNT_ANOMALY ---
    if (teams.length !== modeTeamCount && Math.abs(teams.length - modeTeamCount) > 2) {
      yearIssues.push({
        type: 'TEAM_COUNT_ANOMALY',
        severity: 'medium',
        seasonYear: year,
        message: `${year}: Has ${teams.length} teams (most seasons have ${modeTeamCount}).`,
        repairAction: 'EDIT_SEASON',
        repairLabel: `Review ${year} Season`,
      })
    }

    // --- Check 6: MULTIPLE_CHAMPIONS ---
    const champions = teams.filter(t => t.playoffResult === 'champion')
    if (champions.length > 1) {
      yearIssues.push({
        type: 'MULTIPLE_CHAMPIONS',
        severity: 'low',
        seasonYear: year,
        message: `${year}: Multiple teams marked as champion (${champions.map(c => c.ownerName || c.teamName).join(', ')}).`,
        repairAction: 'EDIT_SEASON',
        repairLabel: `Edit ${year} Season`,
      })
    }

    // --- Check 7: NO_CHAMPION ---
    if (champions.length === 0 && year < CURRENT_YEAR) {
      yearIssues.push({
        type: 'NO_CHAMPION',
        severity: 'low',
        seasonYear: year,
        message: `${year}: No champion designated for this season.`,
        repairAction: 'EDIT_SEASON',
        repairLabel: `Edit ${year} Season`,
      })
    }

    // --- Check 8: FUTURE_SEASON ---
    if (year > CURRENT_YEAR) {
      yearIssues.push({
        type: 'FUTURE_SEASON',
        severity: 'medium',
        seasonYear: year,
        message: `${year}: This season is in the future — may have been imported incorrectly.`,
        repairAction: 'DELETE_SEASON',
        repairLabel: `Remove ${year} Season`,
      })
    }

    // --- Check 9: CURRENT_YEAR_PARTIAL ---
    if (year === CURRENT_YEAR) {
      yearIssues.push({
        type: 'CURRENT_YEAR_PARTIAL',
        severity: 'info',
        seasonYear: year,
        message: `${year}: Current season — data may be incomplete.`,
        repairAction: null,
        repairLabel: null,
      })
    }

    // --- Check 11: MISSING_WEEKLY_SCORES ---
    // If teams have W/L records but no weekly score data, that's a gap
    const teamsWithGames = teams.filter(t => (t.wins || 0) + (t.losses || 0) > 0)
    if (teamsWithGames.length > 0 && year < CURRENT_YEAR) {
      const teamsWithWeekly = teams.filter(t => {
        const ws = Array.isArray(t.weeklyScores) ? t.weeklyScores : []
        return ws.length > 0
      })
      if (teamsWithWeekly.length === 0) {
        yearIssues.push({
          type: 'MISSING_WEEKLY_SCORES',
          severity: 'medium',
          seasonYear: year,
          message: `${year}: No weekly score data — "Best Week" and matchup records can't be computed.`,
          repairAction: null,
          repairLabel: null,
        })
      }
    }

    // --- Check 12: ZERO_WINS_AND_LOSSES ---
    // If a completed season has all teams with 0-0 records, something is wrong
    if (year < CURRENT_YEAR) {
      const allZeroRecord = teams.every(t => (t.wins || 0) === 0 && (t.losses || 0) === 0)
      if (allZeroRecord) {
        yearIssues.push({
          type: 'ZERO_RECORDS',
          severity: 'high',
          seasonYear: year,
          message: `${year}: All teams show 0-0 records — W/L data is missing.`,
          repairAction: 'EDIT_SEASON',
          repairLabel: `Edit ${year} Season`,
        })
      }
    }

    // Compute per-season score
    let seasonScore = 100
    for (const issue of yearIssues) {
      if (issue.severity === 'high') seasonScore -= 30
      else if (issue.severity === 'medium') seasonScore -= 15
      else if (issue.severity === 'low') seasonScore -= 5
      // info = 0
    }
    seasonScore = Math.max(0, seasonScore)

    perSeason[year] = {
      score: seasonScore,
      status: seasonScore >= 80 ? 'green' : seasonScore >= 50 ? 'yellow' : 'red',
      issues: yearIssues,
    }

    allIssues.push(...yearIssues)
  }

  // --- Check 10: ORPHAN_OWNER (appears in only 1 season) ---
  const ownerSeasonCount = {}
  for (const year of yearNums) {
    for (const t of byYear[year]) {
      const name = t.ownerName || t.teamName
      if (!ownerSeasonCount[name]) ownerSeasonCount[name] = 0
      ownerSeasonCount[name]++
    }
  }
  if (yearNums.length > 2) {
    for (const [name, count] of Object.entries(ownerSeasonCount)) {
      if (count === 1) {
        allIssues.push({
          type: 'ORPHAN_OWNER',
          severity: 'info',
          seasonYear: null,
          message: `"${name}" appears in only 1 season — may be an alias or a one-year member.`,
          repairAction: 'MANAGE_OWNERS',
          repairLabel: 'Manage Owners',
        })
      }
    }
  }

  // --- Check 13: LOW_CAREER_GAMES (cross-season consistency) ---
  // For owners appearing in many seasons, check if their total W+L is reasonable
  if (yearNums.length >= 5) {
    const ownerGames = {}
    for (const year of yearNums) {
      for (const t of byYear[year]) {
        const name = t.ownerName || t.teamName
        if (!ownerGames[name]) ownerGames[name] = { games: 0, seasons: 0 }
        ownerGames[name].games += (t.wins || 0) + (t.losses || 0) + (t.ties || 0)
        ownerGames[name].seasons++
      }
    }
    for (const [name, data] of Object.entries(ownerGames)) {
      if (data.seasons >= 5) {
        // Expect at least ~10 games per season on average
        const expectedMin = data.seasons * 10
        if (data.games < expectedMin) {
          allIssues.push({
            type: 'LOW_CAREER_GAMES',
            severity: 'medium',
            seasonYear: null,
            message: `"${name}" has ${data.games} total games across ${data.seasons} seasons (expected ~${data.seasons * 13}+). Some seasons may have missing W/L data.`,
            repairAction: null,
            repairLabel: null,
          })
        }
      }
    }
  }

  // Add missing years to perSeason as well
  for (const y of missingYears) {
    perSeason[y] = {
      score: 0,
      status: 'red',
      issues: allIssues.filter(i => i.seasonYear === y),
    }
  }

  // Overall score = average of per-season scores + penalties for systemic/cross-season issues
  const allYearScores = [...yearNums, ...missingYears].map(y => perSeason[y]?.score ?? 100)
  let overallScore = allYearScores.length > 0
    ? Math.round(allYearScores.reduce((a, b) => a + b, 0) / allYearScores.length)
    : 100

  // Systemic penalty: if the same issue type appears in 50%+ of seasons, apply extra penalty
  if (yearNums.length >= 3) {
    const issueTypeCounts = {}
    for (const issue of allIssues) {
      if (issue.seasonYear && issue.severity !== 'info') {
        issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1
      }
    }
    for (const [, count] of Object.entries(issueTypeCounts)) {
      const pct = count / yearNums.length
      if (pct >= 0.8) overallScore -= 15        // 80%+ of seasons have this issue
      else if (pct >= 0.5) overallScore -= 10   // 50%+ of seasons
    }
  }

  // Cross-season issues (no seasonYear) also penalize
  const crossSeasonIssues = allIssues.filter(i => !i.seasonYear && i.severity !== 'info')
  overallScore -= crossSeasonIssues.length * 3

  overallScore = Math.max(0, Math.min(100, overallScore))

  return {
    overallScore,
    overallStatus: overallScore >= 80 ? 'green' : overallScore >= 50 ? 'yellow' : 'red',
    seasonCount: yearNums.length,
    yearRange: [minYear, maxYear],
    missingYears,
    issues: allIssues,
    perSeason,
  }
}

module.exports = { analyzeLeagueHealth }
