/**
 * Playoff Service
 *
 * Handles playoff bracket generation, winner advancement, and bracket queries.
 */

/**
 * Generate a playoff bracket for a league's current season.
 * Seeds top N teams and creates playoff Matchup records.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function generatePlayoffBracket(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league) throw new Error('League not found')

  const playoffTeams = league.settings?.playoffTeams || 4
  const playoffWeeks = league.settings?.playoffWeeks || 3

  // Find the current league season
  const currentSeason = await prisma.season.findFirst({
    where: { isCurrent: true },
  })
  if (!currentSeason) throw new Error('No current season found')

  const leagueSeason = await prisma.leagueSeason.findFirst({
    where: { leagueId, seasonId: currentSeason.id },
    include: {
      teamSeasons: {
        include: { team: { include: { user: { select: { id: true, name: true } } } } },
      },
    },
  })
  if (!leagueSeason) throw new Error('No league season found')

  // Check if playoffs already exist
  const existingPlayoffs = await prisma.matchup.findFirst({
    where: { leagueId, isPlayoff: true },
  })
  if (existingPlayoffs) {
    throw new Error('Playoffs have already been generated. Delete existing playoff matchups first.')
  }

  // Sort by wins desc, then totalPoints (pointsFor) desc for tiebreaker
  const sorted = [...leagueSeason.teamSeasons].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.totalPoints - a.totalPoints
  })

  const qualifiedCount = Math.min(playoffTeams, sorted.length)
  const qualified = sorted.slice(0, qualifiedCount)

  // Mark playoff qualifiers
  for (let i = 0; i < qualified.length; i++) {
    await prisma.teamSeason.update({
      where: { id: qualified[i].id },
      data: { madePlayoffs: true, playoffSeed: i + 1 },
    })
  }

  // Determine number of rounds needed
  const numRounds = Math.ceil(Math.log2(qualifiedCount))

  // Get upcoming fantasy weeks for playoff scheduling
  const upcomingWeeks = await prisma.fantasyWeek.findMany({
    where: {
      seasonId: currentSeason.id,
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
    },
    orderBy: { weekNumber: 'asc' },
    take: numRounds,
  })

  // Find the next available week number for matchups
  const lastMatchup = await prisma.matchup.findFirst({
    where: { leagueId, isPlayoff: false },
    orderBy: { week: 'desc' },
  })
  const startWeek = (lastMatchup?.week || 0) + 1

  // Generate first round matchups (standard seeding: 1 vs N, 2 vs N-1, etc.)
  const roundMatchTypes = getRoundNames(numRounds)
  const matchupsToCreate = []

  for (let i = 0; i < Math.floor(qualifiedCount / 2); i++) {
    const highSeed = qualified[i]
    const lowSeed = qualified[qualifiedCount - 1 - i]

    matchupsToCreate.push({
      leagueId,
      week: startWeek,
      homeTeamId: highSeed.teamId,
      awayTeamId: lowSeed.teamId,
      isPlayoff: true,
      playoffRound: 1,
      playoffMatchType: roundMatchTypes[0],
      isComplete: false,
      fantasyWeekId: upcomingWeeks[0]?.id || null,
      tournamentId: upcomingWeeks[0]?.tournamentId || null,
    })
  }

  await prisma.matchup.createMany({ data: matchupsToCreate })

  return {
    message: `Playoff bracket generated: ${qualifiedCount} teams, ${numRounds} rounds`,
    qualifiedTeams: qualified.map((ts, i) => ({
      seed: i + 1,
      teamId: ts.teamId,
      teamName: ts.team?.name,
      ownerName: ts.team?.user?.name,
      wins: ts.wins,
      losses: ts.losses,
      totalPoints: ts.totalPoints,
    })),
    rounds: numRounds,
    firstRoundMatchups: matchupsToCreate.length,
  }
}

/**
 * Advance the winner of a completed playoff matchup to the next round.
 * If the matchup is the final, marks the winner as champion.
 *
 * @param {string} matchupId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function advancePlayoffWinner(matchupId, prisma) {
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
    },
  })
  if (!matchup || !matchup.isPlayoff || !matchup.isComplete) return null

  // Determine winner
  const winnerId = matchup.homeScore > matchup.awayScore
    ? matchup.homeTeamId
    : matchup.awayScore > matchup.homeScore
    ? matchup.awayTeamId
    : null // tie — shouldn't happen in playoffs but handle gracefully

  if (!winnerId) return null

  const loserId = winnerId === matchup.homeTeamId ? matchup.awayTeamId : matchup.homeTeamId

  // Find the current league season + team seasons
  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  if (!currentSeason) return null

  const leagueSeason = await prisma.leagueSeason.findFirst({
    where: { leagueId: matchup.leagueId, seasonId: currentSeason.id },
  })
  if (!leagueSeason) return null

  // Update playoff records
  await prisma.teamSeason.updateMany({
    where: { leagueSeasonId: leagueSeason.id, teamId: winnerId },
    data: { playoffWins: { increment: 1 } },
  })
  await prisma.teamSeason.updateMany({
    where: { leagueSeasonId: leagueSeason.id, teamId: loserId },
    data: { playoffLosses: { increment: 1 } },
  })

  // Check if this is the final round
  const allPlayoffMatchups = await prisma.matchup.findMany({
    where: { leagueId: matchup.leagueId, isPlayoff: true },
    orderBy: { playoffRound: 'desc' },
  })

  const maxRound = Math.max(...allPlayoffMatchups.map(m => m.playoffRound || 0))
  const currentRoundMatchups = allPlayoffMatchups.filter(m => m.playoffRound === matchup.playoffRound)
  const nextRound = matchup.playoffRound + 1

  // Check if all matchups in the current round are complete
  const allCurrentComplete = currentRoundMatchups.every(m => m.isComplete)
  if (!allCurrentComplete) return { advanced: false, waitingForOtherMatchups: true }

  // Get winners of all current round matchups
  const winners = currentRoundMatchups.map(m => {
    return m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId
  })

  // If only one winner left, they're champion
  if (winners.length === 1) {
    await prisma.teamSeason.updateMany({
      where: { leagueSeasonId: leagueSeason.id, teamId: winnerId },
      data: { isChampion: true },
    })
    console.log(`[playoffService] Champion determined: team ${winnerId}`)
    return { advanced: false, champion: winnerId }
  }

  // Check if next round matchups already exist
  const existingNext = await prisma.matchup.findFirst({
    where: { leagueId: matchup.leagueId, isPlayoff: true, playoffRound: nextRound },
  })
  if (existingNext) return { advanced: false, nextRoundAlreadyExists: true }

  // Determine round name
  const totalRoundsNeeded = Math.ceil(Math.log2(currentRoundMatchups.length * 2))
  const roundNames = getRoundNames(totalRoundsNeeded)
  const nextRoundName = roundNames[nextRound - 1] || `ROUND_${nextRound}`

  // Get the next fantasy week
  const upcomingWeek = await prisma.fantasyWeek.findFirst({
    where: {
      seasonId: currentSeason.id,
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
      id: { notIn: allPlayoffMatchups.map(m => m.fantasyWeekId).filter(Boolean) },
    },
    orderBy: { weekNumber: 'asc' },
  })

  // Create next round matchups (pair winners: 0 vs last, 1 vs second-last, etc.)
  const nextWeek = matchup.week + 1
  const nextMatchups = []
  for (let i = 0; i < Math.floor(winners.length / 2); i++) {
    nextMatchups.push({
      leagueId: matchup.leagueId,
      week: nextWeek,
      homeTeamId: winners[i],
      awayTeamId: winners[winners.length - 1 - i],
      isPlayoff: true,
      playoffRound: nextRound,
      playoffMatchType: nextRoundName,
      isComplete: false,
      fantasyWeekId: upcomingWeek?.id || null,
      tournamentId: upcomingWeek?.tournamentId || null,
    })
  }

  if (nextMatchups.length > 0) {
    await prisma.matchup.createMany({ data: nextMatchups })
    console.log(`[playoffService] Created ${nextMatchups.length} round ${nextRound} matchups`)
  }

  // If only 1 matchup created, the winner of that will be champion
  if (nextMatchups.length === 1) {
    // Update the match type to FINAL
    const created = await prisma.matchup.findFirst({
      where: { leagueId: matchup.leagueId, isPlayoff: true, playoffRound: nextRound },
      orderBy: { createdAt: 'desc' },
    })
    if (created) {
      await prisma.matchup.update({
        where: { id: created.id },
        data: { playoffMatchType: 'FINAL' },
      })
    }
  }

  return { advanced: true, nextRound, matchupsCreated: nextMatchups.length }
}

/**
 * Get the playoff bracket for display, formatted for PlayoffBracket.jsx.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function getPlayoffBracket(leagueId, prisma) {
  const playoffMatchups = await prisma.matchup.findMany({
    where: { leagueId, isPlayoff: true },
    include: {
      homeTeam: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      awayTeam: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: [{ playoffRound: 'asc' }, { createdAt: 'asc' }],
  })

  if (playoffMatchups.length === 0) return null

  // Get seeds from TeamSeason
  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  let seedMap = {}
  if (currentSeason) {
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId, seasonId: currentSeason.id },
      include: {
        teamSeasons: { where: { madePlayoffs: true } },
      },
    })
    if (leagueSeason) {
      seedMap = Object.fromEntries(
        leagueSeason.teamSeasons.map(ts => [ts.teamId, ts.playoffSeed])
      )
    }
  }

  // Group by round
  const roundMap = {}
  for (const m of playoffMatchups) {
    const round = m.playoffRound || 1
    if (!roundMap[round]) roundMap[round] = []

    const winner = m.isComplete
      ? (m.homeScore > m.awayScore ? m.homeTeam.userId : m.awayScore > m.homeScore ? m.awayTeam.userId : null)
      : null

    roundMap[round].push({
      id: m.id,
      seed1: seedMap[m.homeTeamId] || null,
      seed2: seedMap[m.awayTeamId] || null,
      team1: { userId: m.homeTeam.userId, name: m.homeTeam.name },
      team2: { userId: m.awayTeam.userId, name: m.awayTeam.name },
      score1: m.homeScore,
      score2: m.awayScore,
      winner,
      completed: m.isComplete,
    })
  }

  // Build rounds array
  const rounds = Object.entries(roundMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([roundNum, matchups]) => ({
      name: matchups[0]?.playoffMatchType || getRoundLabel(parseInt(roundNum), Object.keys(roundMap).length),
      matchups,
    }))

  // Count total teams
  const allTeamIds = new Set()
  playoffMatchups.forEach(m => {
    allTeamIds.add(m.homeTeamId)
    allTeamIds.add(m.awayTeamId)
  })

  return {
    rounds,
    numTeams: allTeamIds.size,
  }
}

/**
 * Get round names based on total number of rounds.
 */
function getRoundNames(numRounds) {
  const names = {
    1: ['FINAL'],
    2: ['SEMIFINAL', 'FINAL'],
    3: ['QUARTERFINAL', 'SEMIFINAL', 'FINAL'],
    4: ['ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL'],
  }
  return names[numRounds] || Array.from({ length: numRounds }, (_, i) => `ROUND_${i + 1}`)
}

/**
 * Get human-readable round label.
 */
function getRoundLabel(roundNum, totalRounds) {
  const diff = totalRounds - roundNum
  if (diff === 0) return 'Finals'
  if (diff === 1) return 'Semifinals'
  if (diff === 2) return 'Quarterfinals'
  return `Round ${roundNum}`
}

module.exports = {
  generatePlayoffBracket,
  advancePlayoffWinner,
  getPlayoffBracket,
}
