/**
 * Yahoo Fantasy Import Service
 *
 * Imports league history from Yahoo Fantasy Sports API.
 * Yahoo requires OAuth 2.0 for API access. For the import flow,
 * the user provides their Yahoo league ID and auth credentials
 * (access token obtained via OAuth flow on the frontend).
 *
 * Yahoo Fantasy API base: https://fantasysports.yahooapis.com/fantasy/v2
 * Docs: https://developer.yahoo.com/fantasysports/guide/
 *
 * Yahoo uses game keys per sport per year:
 *   NFL: 390 (2021), 399 (2022), 406 (2023), 414 (2024), 423 (2025)
 *   They change every year — we auto-detect via the leagues endpoint.
 */

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

// Known Yahoo NFL game keys (updated annually)
const NFL_GAME_KEYS = {
  2015: '348', 2016: '359', 2017: '371', 2018: '380',
  2019: '390', 2020: '399', 2021: '406', 2022: '414',
  2023: '423', 2024: '431', 2025: '440',
}

/**
 * Fetch JSON from Yahoo Fantasy API.
 * Yahoo returns XML by default — we request JSON format.
 */
async function yahooFetch(path, accessToken) {
  if (!accessToken) throw new Error('Yahoo access token is required')

  const url = `${BASE}${path}?format=json`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Yahoo authentication expired. Please re-authorize.')
    if (res.status === 999) throw new Error('Yahoo rate limit exceeded. Please wait a moment.')
    throw new Error(`Yahoo API error ${res.status}`)
  }
  return res.json()
}

/**
 * Discovery scan — find all seasons for a Yahoo league.
 * Yahoo leagues get new game keys each year but the league number stays the same.
 */
async function discoverLeague(yahooLeagueId, accessToken) {
  // First, get the user's leagues to find the right one
  const seasons = []

  // Try each known game key to find historical seasons
  const gameKeyEntries = Object.entries(NFL_GAME_KEYS).sort(([a], [b]) => Number(b) - Number(a))

  for (const [year, gameKey] of gameKeyEntries) {
    try {
      const leagueKey = `${gameKey}.l.${yahooLeagueId}`
      const data = await yahooFetch(`/league/${leagueKey}/settings`, accessToken)
      const league = data?.fantasy_content?.league

      if (!league) continue

      const settings = Array.isArray(league) ? league[1]?.settings : league.settings
      const meta = Array.isArray(league) ? league[0] : league

      seasons.push({
        year: parseInt(year),
        gameKey,
        leagueKey,
        name: meta.name,
        teamCount: parseInt(meta.num_teams || 0),
        status: meta.is_finished === '1' ? 'complete' : 'in_progress',
        scoringType: meta.scoring_type,
        draftType: settings?.[0]?.draft_type || 'live',
      })
    } catch {
      // League didn't exist that year — skip
      continue
    }
  }

  if (seasons.length === 0) {
    throw new Error('No Yahoo league data found. Check your league ID and ensure your OAuth token is valid.')
  }

  seasons.sort((a, b) => a.year - b.year)

  return {
    name: seasons[seasons.length - 1].name,
    sport: 'nfl',
    seasons,
    totalSeasons: seasons.length,
  }
}

/**
 * Import a single Yahoo season.
 */
async function importSeason(leagueKey, year, accessToken) {
  // Fetch standings and roster info in parallel
  const [standingsData, matchupsData, draftData] = await Promise.all([
    yahooFetch(`/league/${leagueKey}/standings`, accessToken).catch(() => null),
    fetchAllMatchups(leagueKey, accessToken),
    yahooFetch(`/league/${leagueKey}/draftresults`, accessToken).catch(() => null),
  ])

  // Parse standings/teams
  const league = standingsData?.fantasy_content?.league
  const standingsArr = Array.isArray(league) ? league[1]?.standings : league?.standings
  const teams = standingsArr?.[0]?.teams || standingsArr?.teams || {}

  const rosterData = []
  const teamEntries = typeof teams === 'object' ? Object.values(teams) : []

  for (const entry of teamEntries) {
    const team = Array.isArray(entry) ? entry[0] : entry
    if (!team?.team_key) continue

    const teamMeta = Array.isArray(team) ? team[0] : team
    const managers = teamMeta?.managers || []
    const manager = Array.isArray(managers) ? managers[0]?.manager : managers.manager
    const standings = Array.isArray(entry) ? entry[1]?.team_standings : entry.team_standings
    const outcomes = standings?.outcome_totals

    rosterData.push({
      teamId: teamMeta.team_id,
      teamKey: teamMeta.team_key,
      teamName: teamMeta.name,
      ownerName: manager?.nickname || manager?.guid || `Team ${teamMeta.team_id}`,
      ownerId: manager?.guid,
      wins: parseInt(outcomes?.wins || 0),
      losses: parseInt(outcomes?.losses || 0),
      ties: parseInt(outcomes?.ties || 0),
      pointsFor: parseFloat(standings?.points_for || 0),
      pointsAgainst: parseFloat(standings?.points_against || 0),
      rank: parseInt(standings?.rank || 99),
      playoffSeed: standings?.playoff_seed || null,
    })
  }

  rosterData.sort((a, b) => a.rank - b.rank)

  // Parse draft results
  let parsedDraft = null
  const draftResults = draftData?.fantasy_content?.league
  const drafts = Array.isArray(draftResults) ? draftResults[1]?.draft_results : draftResults?.draft_results
  if (drafts) {
    const picks = Object.values(drafts).filter(d => d?.draft_result)
    parsedDraft = {
      type: 'snake',
      picks: picks.map(p => ({
        round: parseInt(p.draft_result.round || 0),
        pick: parseInt(p.draft_result.pick || 0),
        teamKey: p.draft_result.team_key,
        playerId: p.draft_result.player_key,
        playerName: null, // Yahoo doesn't include name in draft results
      })),
    }
  }

  // Determine playoff results
  const playoffResults = {}
  // Yahoo marks the winner in team data — check for clinched_playoffs / etc
  for (const r of rosterData) {
    if (r.rank === 1) playoffResults[r.teamId] = 'champion'
    else if (r.playoffSeed) playoffResults[r.teamId] = 'eliminated'
    else playoffResults[r.teamId] = 'missed'
  }

  return {
    seasonYear: year,
    rosters: rosterData,
    matchups: matchupsData,
    draftData: parsedDraft,
    playoffResults,
  }
}

/**
 * Fetch all matchups for a Yahoo season.
 */
async function fetchAllMatchups(leagueKey, accessToken) {
  const allMatchups = {}
  for (let week = 1; week <= 17; week++) {
    try {
      const data = await yahooFetch(`/league/${leagueKey}/scoreboard;week=${week}`, accessToken)
      const league = data?.fantasy_content?.league
      const scoreboard = Array.isArray(league) ? league[1]?.scoreboard : league?.scoreboard
      const matchups = scoreboard?.[0]?.matchups || scoreboard?.matchups || {}

      const weekGames = []
      for (const entry of Object.values(matchups)) {
        const matchup = entry?.matchup
        if (!matchup) continue
        const teams = matchup.teams || {}
        const teamArr = Object.values(teams).filter(t => t?.team)

        if (teamArr.length >= 2) {
          const team0 = Array.isArray(teamArr[0].team) ? teamArr[0].team[0] : teamArr[0].team
          const team1 = Array.isArray(teamArr[1].team) ? teamArr[1].team[0] : teamArr[1].team
          weekGames.push({
            homeTeamId: team0.team_id,
            homePoints: parseFloat(teamArr[0].team_points?.total || 0),
            awayTeamId: team1.team_id,
            awayPoints: parseFloat(teamArr[1].team_points?.total || 0),
          })
        }
      }

      if (weekGames.length > 0) {
        allMatchups[week] = weekGames
      } else {
        break
      }
    } catch {
      break
    }
  }
  return allMatchups
}

/**
 * Build weekly scores from Yahoo matchup data.
 */
function buildWeeklyScores(matchups, teamId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const game = games.find(g =>
      String(g.homeTeamId) === String(teamId) || String(g.awayTeamId) === String(teamId)
    )
    if (game) {
      const isHome = String(game.homeTeamId) === String(teamId)
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
      })
    }
  }
  return scores
}

/**
 * Full import pipeline.
 */
async function runFullImport(yahooLeagueId, userId, prisma, accessToken) {
  const importRecord = await prisma.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'yahoo',
      sourceLeagueId: String(yahooLeagueId),
      status: 'SCANNING',
    },
  })

  try {
    const discovery = await discoverLeague(yahooLeagueId, accessToken)

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 10,
      },
    })

    let clutchLeague = await prisma.league.findFirst({
      where: {
        ownerId: userId,
        name: { contains: discovery.name, mode: 'insensitive' },
      },
    })

    if (!clutchLeague) {
      clutchLeague = await prisma.league.create({
        data: {
          name: discovery.name || 'Imported from Yahoo',
          sport: 'NFL',
          ownerId: userId,
          status: 'ACTIVE',
          settings: {
            importedFrom: 'yahoo',
            yahooLeagueId: String(yahooLeagueId),
          },
        },
      })
    }

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: { clutchLeagueId: clutchLeague.id },
    })

    const importedSeasons = []
    for (let i = 0; i < discovery.seasons.length; i++) {
      const season = discovery.seasons[i]
      const progress = 10 + Math.round(((i + 1) / discovery.seasons.length) * 80)

      try {
        const seasonData = await importSeason(season.leagueKey, season.year, accessToken)

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
              rosterData: {},
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
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
            },
          })
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`Failed to import Yahoo season ${season.year}:`, err.message)
      }

      await prisma.leagueImport.update({
        where: { id: importRecord.id },
        data: {
          progressPct: progress,
          seasonsImported: importedSeasons,
        },
      })
    }

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
