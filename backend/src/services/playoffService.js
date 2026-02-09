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
  const playoffSeeding = league.settings?.formatSettings?.playoffSeeding || 'default'

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

  // Calculate byes: if qualifiedCount is not a power of two, top seeds get byes
  const bracketSize = nextPowerOfTwo(qualifiedCount)
  const byeCount = bracketSize - qualifiedCount

  // Mark playoff qualifiers and byes
  for (let i = 0; i < qualified.length; i++) {
    await prisma.teamSeason.update({
      where: { id: qualified[i].id },
      data: {
        madePlayoffs: true,
        playoffSeed: i + 1,
        playoffByes: i < byeCount ? 1 : 0,
      },
    })
  }

  const qualifiedTeamsList = qualified.map((ts, i) => ({
    seed: i + 1,
    teamId: ts.teamId,
    teamName: ts.team?.name,
    ownerName: ts.team?.user?.name,
    wins: ts.wins,
    losses: ts.losses,
    totalPoints: ts.totalPoints,
    hasBye: i < byeCount,
  }))

  // Commissioner mode: qualify teams but don't create matchups — commissioner submits pairings
  if (playoffSeeding === 'commissioner') {
    return {
      mode: 'commissioner',
      message: `${qualifiedCount} teams qualified for playoffs. Commissioner must set matchups.`,
      qualifiedTeams: qualifiedTeamsList,
      rounds: Math.ceil(Math.log2(bracketSize)),
      byeTeams: qualifiedTeamsList.filter(t => t.hasBye),
    }
  }

  // Determine number of rounds needed (based on bracket size, not qualified count)
  const numRounds = Math.ceil(Math.log2(bracketSize))

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

  // Generate first round matchups — only non-bye teams play round 1
  const roundMatchTypes = getRoundNames(numRounds)
  const matchupsToCreate = []

  // Non-bye teams: seeds (byeCount+1) through qualifiedCount play round 1
  // Standard seeding within the non-bye pool: highest seed vs lowest seed
  const nonByeTeams = qualified.slice(byeCount)
  for (let i = 0; i < Math.floor(nonByeTeams.length / 2); i++) {
    const highSeed = nonByeTeams[i]
    const lowSeed = nonByeTeams[nonByeTeams.length - 1 - i]

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
    mode: playoffSeeding,
    message: `Playoff bracket generated: ${qualifiedCount} teams, ${numRounds} rounds${byeCount > 0 ? `, ${byeCount} bye${byeCount > 1 ? 's' : ''}` : ''}`,
    qualifiedTeams: qualifiedTeamsList,
    rounds: numRounds,
    firstRoundMatchups: matchupsToCreate.length,
    byeTeams: qualifiedTeamsList.filter(t => t.hasBye),
  }
}

/**
 * Create custom playoff matchups submitted by the commissioner.
 * Validates all teams are qualified and no team appears twice.
 *
 * @param {string} leagueId
 * @param {{ homeTeamId: string, awayTeamId: string }[]} matchups
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function createCustomPlayoffMatchups(leagueId, matchups, prisma) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) throw new Error('League not found')

  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  if (!currentSeason) throw new Error('No current season found')

  const leagueSeason = await prisma.leagueSeason.findFirst({
    where: { leagueId, seasonId: currentSeason.id },
    include: { teamSeasons: { where: { madePlayoffs: true } } },
  })
  if (!leagueSeason) throw new Error('No league season found')

  const qualifiedTeamIds = new Set(leagueSeason.teamSeasons.map(ts => ts.teamId))

  // Validate submitted matchups
  const usedTeams = new Set()
  for (const m of matchups) {
    if (!m.homeTeamId || !m.awayTeamId) throw new Error('Each matchup must have homeTeamId and awayTeamId')
    if (!qualifiedTeamIds.has(m.homeTeamId)) throw new Error(`Team ${m.homeTeamId} is not in the qualified pool`)
    if (!qualifiedTeamIds.has(m.awayTeamId)) throw new Error(`Team ${m.awayTeamId} is not in the qualified pool`)
    if (m.homeTeamId === m.awayTeamId) throw new Error('A team cannot play against itself')
    if (usedTeams.has(m.homeTeamId)) throw new Error(`Team ${m.homeTeamId} appears in multiple matchups`)
    if (usedTeams.has(m.awayTeamId)) throw new Error(`Team ${m.awayTeamId} appears in multiple matchups`)
    usedTeams.add(m.homeTeamId)
    usedTeams.add(m.awayTeamId)
  }

  // Determine current playoff round (check existing matchups)
  const existingPlayoffs = await prisma.matchup.findMany({
    where: { leagueId, isPlayoff: true },
    orderBy: { playoffRound: 'desc' },
  })
  const currentMaxRound = existingPlayoffs.length > 0
    ? Math.max(...existingPlayoffs.map(m => m.playoffRound || 0))
    : 0
  const playoffRound = currentMaxRound + 1

  // Determine total rounds for naming
  const totalTeams = qualifiedTeamIds.size
  const totalRounds = Math.ceil(Math.log2(totalTeams))
  const roundNames = getRoundNames(totalRounds)
  const roundName = roundNames[playoffRound - 1] || `ROUND_${playoffRound}`

  // Get next week number and fantasy week
  const lastMatchup = await prisma.matchup.findFirst({
    where: { leagueId },
    orderBy: { week: 'desc' },
  })
  const nextWeek = (lastMatchup?.week || 0) + 1

  const upcomingWeek = await prisma.fantasyWeek.findFirst({
    where: {
      seasonId: currentSeason.id,
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
      id: { notIn: existingPlayoffs.map(m => m.fantasyWeekId).filter(Boolean) },
    },
    orderBy: { weekNumber: 'asc' },
  })

  const matchupsToCreate = matchups.map(m => ({
    leagueId,
    week: nextWeek,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    isPlayoff: true,
    playoffRound,
    playoffMatchType: matchups.length === 1 ? 'FINAL' : roundName,
    isComplete: false,
    fantasyWeekId: upcomingWeek?.id || null,
    tournamentId: upcomingWeek?.tournamentId || null,
  }))

  await prisma.matchup.createMany({ data: matchupsToCreate })

  return {
    message: `Round ${playoffRound} matchups created: ${matchups.length} matchups`,
    round: playoffRound,
    matchupsCreated: matchups.length,
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

  const playoffSeeding = matchup.league?.settings?.formatSettings?.playoffSeeding || 'default'

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
    include: { teamSeasons: { where: { madePlayoffs: true } } },
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

  const currentRoundMatchups = allPlayoffMatchups.filter(m => m.playoffRound === matchup.playoffRound)
  const nextRound = matchup.playoffRound + 1

  // Check if all matchups in the current round are complete
  const allCurrentComplete = currentRoundMatchups.every(m => m.isComplete)
  if (!allCurrentComplete) return { advanced: false, waitingForOtherMatchups: true }

  // Get winners of all current round matchups
  const winners = currentRoundMatchups.map(m => {
    return m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId
  })

  // If round 1 just completed, merge bye teams into the pool for round 2
  let advancingTeams = [...winners]
  if (matchup.playoffRound === 1) {
    const byeTeamSeasons = leagueSeason.teamSeasons.filter(ts => ts.playoffByes > 0)
    const byeTeamIds = byeTeamSeasons.map(ts => ts.teamId)
    advancingTeams = [...byeTeamIds, ...winners]
  }

  // If only one team left (or one winner and no byes), they're champion
  if (advancingTeams.length === 1) {
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

  // Commissioner mode: don't auto-create next round — wait for commissioner to submit pairings
  if (playoffSeeding === 'commissioner') {
    console.log(`[playoffService] Commissioner mode: awaiting manual matchup assignment for round ${nextRound}`)
    return {
      advanced: false,
      awaitingCommissioner: true,
      nextRound,
      winners: advancingTeams.map(teamId => {
        const ts = leagueSeason.teamSeasons.find(t => t.teamId === teamId)
        return { teamId, seed: ts?.playoffSeed || null }
      }),
    }
  }

  // Determine round name using total playoff teams (including byes)
  const totalPlayoffTeams = leagueSeason.teamSeasons.filter(ts => ts.madePlayoffs).length
  const totalRoundsNeeded = Math.ceil(Math.log2(nextPowerOfTwo(totalPlayoffTeams)))
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

  const nextWeek = matchup.week + 1
  const nextMatchups = []

  if (playoffSeeding === 'reseed') {
    // Re-seed: sort advancing teams by their original playoff seed and pair highest vs lowest
    const teamsWithSeeds = advancingTeams.map(teamId => {
      const ts = leagueSeason.teamSeasons.find(t => t.teamId === teamId)
      return { teamId, seed: ts?.playoffSeed || 999 }
    }).sort((a, b) => a.seed - b.seed)

    for (let i = 0; i < Math.floor(teamsWithSeeds.length / 2); i++) {
      nextMatchups.push({
        leagueId: matchup.leagueId,
        week: nextWeek,
        homeTeamId: teamsWithSeeds[i].teamId,
        awayTeamId: teamsWithSeeds[teamsWithSeeds.length - 1 - i].teamId,
        isPlayoff: true,
        playoffRound: nextRound,
        playoffMatchType: nextRoundName,
        isComplete: false,
        fantasyWeekId: upcomingWeek?.id || null,
        tournamentId: upcomingWeek?.tournamentId || null,
      })
    }
  } else {
    // Default (fixed bracket): pair advancing teams by seed (highest vs lowest)
    const teamsWithSeeds = advancingTeams.map(teamId => {
      const ts = leagueSeason.teamSeasons.find(t => t.teamId === teamId)
      return { teamId, seed: ts?.playoffSeed || 999 }
    }).sort((a, b) => a.seed - b.seed)

    for (let i = 0; i < Math.floor(teamsWithSeeds.length / 2); i++) {
      nextMatchups.push({
        leagueId: matchup.leagueId,
        week: nextWeek,
        homeTeamId: teamsWithSeeds[i].teamId,
        awayTeamId: teamsWithSeeds[teamsWithSeeds.length - 1 - i].teamId,
        isPlayoff: true,
        playoffRound: nextRound,
        playoffMatchType: nextRoundName,
        isComplete: false,
        fantasyWeekId: upcomingWeek?.id || null,
        tournamentId: upcomingWeek?.tournamentId || null,
      })
    }
  }

  if (nextMatchups.length > 0) {
    await prisma.matchup.createMany({ data: nextMatchups })
    console.log(`[playoffService] Created ${nextMatchups.length} round ${nextRound} matchups (${playoffSeeding} seeding)`)
  }

  // If only 1 matchup created, the winner of that will be champion
  if (nextMatchups.length === 1) {
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

  // Get seeds and bye info from TeamSeason
  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  let seedMap = {}
  let byeTeams = []
  if (currentSeason) {
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId, seasonId: currentSeason.id },
      include: {
        teamSeasons: {
          where: { madePlayoffs: true },
          include: { team: { include: { user: { select: { id: true, name: true } } } } },
        },
      },
    })
    if (leagueSeason) {
      seedMap = Object.fromEntries(
        leagueSeason.teamSeasons.map(ts => [ts.teamId, ts.playoffSeed])
      )
      byeTeams = leagueSeason.teamSeasons
        .filter(ts => ts.playoffByes > 0)
        .map(ts => ({
          seed: ts.playoffSeed,
          teamId: ts.teamId,
          teamName: ts.team?.name,
          ownerName: ts.team?.user?.name,
        }))
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
    byeTeams,
  }
}

/**
 * Return the smallest power of two >= n.
 */
function nextPowerOfTwo(n) {
  let p = 1
  while (p < n) p *= 2
  return p
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
  createCustomPlayoffMatchups,
  getPlayoffBracket,
}
