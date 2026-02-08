/**
 * ESPN Import Service
 *
 * Imports league history from ESPN Fantasy API.
 * Requires espn_s2 + SWID cookies for private leagues.
 * Public leagues work without auth.
 * Data available from 2018+ (ESPN deleted pre-2018 data).
 *
 * ESPN Fantasy API base: https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{leagueId}
 */

const BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons'

/**
 * Fetch JSON from ESPN Fantasy API with optional cookies.
 */
async function espnFetch(year, leagueId, params = {}, cookies = {}) {
  const url = new URL(`${BASE}/${year}/segments/0/leagues/${leagueId}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const headers = {}
  if (cookies.espn_s2 && cookies.swid) {
    headers['Cookie'] = `espn_s2=${cookies.espn_s2}; SWID=${cookies.swid}`
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    if (res.status === 401) throw new Error('ESPN authentication failed. Check your espn_s2 and SWID cookies.')
    if (res.status === 404) throw new Error(`League not found for ${year}. ESPN only stores data from 2018+.`)
    throw new Error(`ESPN API error ${res.status}`)
  }
  return res.json()
}

/**
 * Discovery scan — find all available seasons for an ESPN league.
 * ESPN reuses the same league ID across years.
 */
async function discoverLeague(espnLeagueId, cookies = {}) {
  const currentYear = new Date().getFullYear()
  const seasons = []

  // ESPN deleted pre-2018 data — scan from 2018 to current year
  for (let year = currentYear; year >= 2018; year--) {
    try {
      const data = await espnFetch(year, espnLeagueId, { view: 'mSettings' }, cookies)
      if (!data || !data.settings) continue

      seasons.push({
        year,
        name: data.settings.name,
        teamCount: data.settings.size,
        status: data.status?.currentMatchupPeriod ? 'complete' : 'in_progress',
        scoringType: data.settings.scoringSettings?.scoringType,
        draftType: data.settings.draftSettings?.type,
      })
    } catch (err) {
      // 404 = league didn't exist that year, skip
      if (err.message.includes('not found')) continue
      // Auth errors bubble up
      if (err.message.includes('authentication')) throw err
      break
    }
  }

  if (seasons.length === 0) {
    throw new Error('No ESPN league data found. Check your league ID and cookies.')
  }

  // Sort oldest first
  seasons.sort((a, b) => a.year - b.year)

  return {
    name: seasons[seasons.length - 1].name,
    sport: 'nfl',
    seasons,
    totalSeasons: seasons.length,
  }
}

/**
 * Import a single ESPN season.
 */
async function importSeason(espnLeagueId, year, cookies = {}) {
  // Fetch roster/standings and matchup data in parallel
  const [leagueData, matchupData] = await Promise.all([
    espnFetch(year, espnLeagueId, { view: 'mTeam' }, cookies),
    espnFetch(year, espnLeagueId, { view: 'mMatchup' }, cookies).catch(() => null),
  ])

  // Also fetch draft data
  const draftData = await espnFetch(year, espnLeagueId, { view: 'mDraftDetail' }, cookies).catch(() => null)

  const teams = leagueData.teams || []
  const members = leagueData.members || []

  // Build member map (id → name)
  const memberMap = {}
  for (const m of members) {
    memberMap[m.id] = {
      displayName: m.displayName || m.firstName || 'Unknown',
      firstName: m.firstName,
      lastName: m.lastName,
    }
  }

  // Build roster data with standings
  const rosterData = teams.map(t => {
    const primaryOwner = t.primaryOwner || t.owners?.[0]
    const member = memberMap[primaryOwner] || { displayName: `Team ${t.id}` }
    const record = t.record?.overall || {}

    return {
      teamId: t.id,
      teamName: t.name || t.abbrev || `Team ${t.id}`,
      ownerName: member.displayName,
      ownerId: primaryOwner,
      wins: record.wins || 0,
      losses: record.losses || 0,
      ties: record.ties || 0,
      pointsFor: record.pointsFor || t.points || 0,
      pointsAgainst: record.pointsAgainst || 0,
      playoffSeed: t.playoffSeed || null,
      rankCalculatedFinal: t.rankCalculatedFinal || null,
      roster: (t.roster?.entries || []).map(e => ({
        playerId: e.playerId,
        playerName: e.playerPoolEntry?.player?.fullName || `Player ${e.playerId}`,
        position: e.playerPoolEntry?.player?.defaultPositionId,
      })),
    }
  })

  // Sort by wins desc, PF desc
  rosterData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

  // Extract matchups by week
  const matchups = {}
  if (matchupData?.schedule) {
    for (const game of matchupData.schedule) {
      const week = game.matchupPeriodId
      if (!matchups[week]) matchups[week] = []
      matchups[week].push({
        matchupId: game.id,
        homeTeamId: game.home?.teamId,
        homePoints: game.home?.totalPoints || 0,
        awayTeamId: game.away?.teamId,
        awayPoints: game.away?.totalPoints || 0,
        winner: game.winner,
        playoffTierType: game.playoffTierType,
      })
    }
  }

  // Determine playoff results
  const playoffResults = determinePlayoffResults(teams, matchupData?.schedule)

  // Parse draft picks
  let parsedDraft = null
  if (draftData?.draftDetail?.picks) {
    parsedDraft = {
      type: draftData.draftDetail.drafted ? 'snake' : 'unknown',
      picks: draftData.draftDetail.picks.map(p => ({
        round: p.roundId,
        pick: p.overallPickNumber,
        teamId: p.teamId,
        playerId: p.playerId,
        playerName: p.playerName || null,
        keeper: p.keeper || false,
      })),
    }
  }

  return {
    seasonYear: year,
    rosters: rosterData,
    matchups,
    draftData: parsedDraft,
    playoffResults,
  }
}

/**
 * Determine playoff results from ESPN schedule data.
 */
function determinePlayoffResults(teams, schedule) {
  const results = {}
  if (!schedule) return results

  // Find playoff matchups (playoffTierType !== 'NONE')
  const playoffGames = schedule.filter(g =>
    g.playoffTierType && g.playoffTierType !== 'NONE'
  )

  if (playoffGames.length === 0) return results

  // Find championship game
  const champGames = playoffGames.filter(g =>
    g.playoffTierType === 'WINNERS_BRACKET' || g.playoffTierType === 'WINNERS_CONSOLATION_LADDER'
  )

  // Last playoff game winner is champion
  const finalGame = champGames[champGames.length - 1]
  if (finalGame) {
    const winnerId = finalGame.winner === 'HOME'
      ? finalGame.home?.teamId
      : finalGame.away?.teamId

    for (const t of teams) {
      const inPlayoffs = playoffGames.some(g =>
        g.home?.teamId === t.id || g.away?.teamId === t.id
      )
      if (t.id === winnerId) {
        results[t.id] = 'champion'
      } else if (inPlayoffs) {
        results[t.id] = 'eliminated'
      } else {
        results[t.id] = 'missed'
      }
    }
  }

  return results
}

/**
 * Build weekly scores from ESPN matchup data for a specific team.
 */
function buildWeeklyScores(matchups, teamId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const game = games.find(g =>
      g.homeTeamId === teamId || g.awayTeamId === teamId
    )
    if (game) {
      const isHome = game.homeTeamId === teamId
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
        matchupId: game.matchupId,
      })
    }
  }
  return scores
}

/**
 * Full import pipeline — discovers, imports, and persists to DB.
 */
async function runFullImport(espnLeagueId, userId, prisma, cookies = {}) {
  const importRecord = await prisma.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'espn',
      sourceLeagueId: String(espnLeagueId),
      status: 'SCANNING',
    },
  })

  try {
    // Step 1: Discovery
    const discovery = await discoverLeague(espnLeagueId, cookies)

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 10,
      },
    })

    // Step 2: Create or find the Clutch league
    let clutchLeague = await prisma.league.findFirst({
      where: {
        ownerId: userId,
        name: { contains: discovery.name, mode: 'insensitive' },
      },
    })

    if (!clutchLeague) {
      clutchLeague = await prisma.league.create({
        data: {
          name: discovery.name || 'Imported from ESPN',
          sport: 'NFL',
          ownerId: userId,
          status: 'ACTIVE',
          settings: {
            importedFrom: 'espn',
            espnLeagueId: String(espnLeagueId),
          },
        },
      })
    }

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: { clutchLeagueId: clutchLeague.id },
    })

    // Step 3: Import each season
    const importedSeasons = []
    for (let i = 0; i < discovery.seasons.length; i++) {
      const season = discovery.seasons[i]
      const progress = 10 + Math.round(((i + 1) / discovery.seasons.length) * 80)

      try {
        const seasonData = await importSeason(espnLeagueId, season.year, cookies)

        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.teamId] || null

          await prisma.historicalSeason.upsert({
            where: {
              leagueId_seasonYear_ownerName: {
                leagueId: clutchLeague.id,
                seasonYear: seasonData.seasonYear,
                ownerName: roster.ownerName || roster.teamName,
              },
            },
            create: {
              leagueId: clutchLeague.id,
              importId: importRecord.id,
              seasonYear: seasonData.seasonYear,
              teamName: roster.teamName,
              ownerName: roster.ownerName || roster.teamName,
              finalStanding: standing,
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: { players: roster.roster },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
            },
            update: {
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: { players: roster.roster },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
            },
          })
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`Failed to import ESPN season ${season.year}:`, err.message)
      }

      await prisma.leagueImport.update({
        where: { id: importRecord.id },
        data: {
          progressPct: progress,
          seasonsImported: importedSeasons,
        },
      })
    }

    // Step 4: Mark complete
    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'COMPLETE',
        progressPct: 100,
        completedAt: new Date(),
      },
    })

    return {
      importId: importRecord.id,
      leagueId: clutchLeague.id,
      leagueName: discovery.name,
      seasonsImported: importedSeasons,
      totalSeasons: discovery.totalSeasons,
    }
  } catch (err) {
    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'FAILED',
        errorLog: [{ message: err.message, timestamp: new Date().toISOString() }],
      },
    })
    throw err
  }
}

module.exports = {
  discoverLeague,
  importSeason,
  runFullImport,
}
