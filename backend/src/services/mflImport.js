/**
 * MFL (MyFantasyLeague) Import Service
 *
 * Imports league history from MFL's XML API.
 * MFL has the deepest historical data of any platform (15-20+ years).
 *
 * MFL API base: https://{host}.myfantasyleague.com/{year}/export
 * API requires: league ID + API key (commissioner credentials)
 *
 * Key endpoints:
 *   - league: League settings and metadata
 *   - leagueStandings: Current standings
 *   - rosters: All team rosters
 *   - draftResults: Draft picks
 *   - weeklyResults: Week-by-week scoring
 *   - players: Player database
 *
 * MFL hosts rotate: www01-www80.myfantasyleague.com
 * Default host for API: api.myfantasyleague.com
 */

const BASE_HOST = 'api.myfantasyleague.com'

/**
 * Fetch JSON from MFL API.
 * MFL returns XML by default — we request JSON format.
 */
async function mflFetch(year, leagueId, endpoint, apiKey, params = {}) {
  const url = new URL(`https://${BASE_HOST}/${year}/export`)
  url.searchParams.set('TYPE', endpoint)
  url.searchParams.set('L', leagueId)
  url.searchParams.set('APIKEY', apiKey)
  url.searchParams.set('JSON', '1')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('MFL authentication failed. Check your API key.')
    }
    throw new Error(`MFL API error ${res.status}: ${endpoint}`)
  }

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    // MFL sometimes returns XML even when JSON requested
    throw new Error('MFL returned invalid response. The API key may be incorrect.')
  }
}

/**
 * Discovery scan — find all available seasons.
 * MFL keeps each year as a separate league endpoint using the same ID.
 */
async function discoverLeague(mflLeagueId, apiKey) {
  const currentYear = new Date().getFullYear()
  const seasons = []

  // MFL can have data going back to early 2000s
  for (let year = currentYear; year >= 2000; year--) {
    try {
      const data = await mflFetch(year, mflLeagueId, 'league', apiKey)
      const league = data?.league

      if (!league) continue

      const franchises = league.franchises?.franchise || []
      const franchiseCount = Array.isArray(franchises) ? franchises.length : 1

      seasons.push({
        year,
        name: league.name,
        teamCount: franchiseCount,
        status: league.standingsLocked === '1' ? 'complete' : 'in_progress',
        rosterSize: parseInt(league.rosterSize || 0),
        startWeek: parseInt(league.startWeek || 1),
        endWeek: parseInt(league.endWeek || 16),
        playoffWeeks: league.playoffWeeks || null,
      })
    } catch (err) {
      // 404 or error = league didn't exist that year
      if (err.message.includes('authentication')) throw err
      // Stop scanning once we hit 3 consecutive failures
      if (seasons.length > 0) {
        // Already found some seasons — a miss means we've reached the beginning
        break
      }
      continue
    }
  }

  if (seasons.length === 0) {
    throw new Error('No MFL league data found. Check your league ID and API key.')
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
 * Import a single MFL season.
 */
async function importSeason(mflLeagueId, year, apiKey) {
  // Fetch all data in parallel
  const [standingsData, rostersData, draftData, scheduleData] = await Promise.all([
    mflFetch(year, mflLeagueId, 'leagueStandings', apiKey).catch(() => null),
    mflFetch(year, mflLeagueId, 'rosters', apiKey).catch(() => null),
    mflFetch(year, mflLeagueId, 'draftResults', apiKey).catch(() => null),
    fetchAllWeeklyResults(year, mflLeagueId, apiKey),
  ])

  // Also get franchise names
  const leagueData = await mflFetch(year, mflLeagueId, 'league', apiKey).catch(() => null)
  const franchises = leagueData?.league?.franchises?.franchise || []
  const franchiseArr = Array.isArray(franchises) ? franchises : [franchises]

  // Build franchise map (id → info)
  const franchiseMap = {}
  for (const f of franchiseArr) {
    franchiseMap[f.id] = {
      name: f.name || `Franchise ${f.id}`,
      owner: f.owner_name || f.name || `Owner ${f.id}`,
      icon: f.icon || null,
    }
  }

  // Parse standings
  const standings = standingsData?.leagueStandings?.franchise || []
  const standingsArr = Array.isArray(standings) ? standings : [standings]

  const rosterData = standingsArr.map((s, idx) => {
    const franchise = franchiseMap[s.id] || { name: `Team ${s.id}`, owner: `Team ${s.id}` }

    return {
      franchiseId: s.id,
      teamName: franchise.name,
      ownerName: franchise.owner,
      wins: parseInt(s.h2hw || s.w || 0),
      losses: parseInt(s.h2hl || s.l || 0),
      ties: parseInt(s.h2ht || s.t || 0),
      pointsFor: parseFloat(s.pf || s.pp || 0),
      pointsAgainst: parseFloat(s.pa || s.op || 0),
      allPlayWins: parseInt(s.all_play_w || 0),
      allPlayLosses: parseInt(s.all_play_l || 0),
      power: parseFloat(s.power_rank || 0),
      rank: idx + 1,
    }
  })

  rosterData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

  // Parse roster details
  const rosters = rostersData?.rosters?.franchise || []
  const rostersArr = Array.isArray(rosters) ? rosters : [rosters]
  const rosterDetails = {}
  for (const r of rostersArr) {
    const players = r.player || []
    rosterDetails[r.id] = (Array.isArray(players) ? players : [players]).map(p => ({
      playerId: p.id,
      status: p.status,
      contractYear: p.contractYear,
      salary: p.salary,
    }))
  }

  // Parse draft results
  let parsedDraft = null
  const draftPicks = draftData?.draftResults?.draftUnit?.draftPick || []
  const draftPicksArr = Array.isArray(draftPicks) ? draftPicks : [draftPicks]
  if (draftPicksArr.length > 0 && draftPicksArr[0]) {
    parsedDraft = {
      type: 'snake',
      picks: draftPicksArr.map(p => ({
        round: parseInt(p.round || 0),
        pick: parseInt(p.pick || 0),
        franchiseId: p.franchise,
        playerId: p.player,
        playerName: null, // MFL uses IDs, not names
        salary: p.salary || null,
        comments: p.comments || null,
      })),
    }
  }

  // Determine playoff results from standings
  const playoffResults = {}
  for (const r of rosterData) {
    if (r.rank === 1) {
      playoffResults[r.franchiseId] = 'champion'
    }
  }

  return {
    seasonYear: year,
    rosters: rosterData,
    matchups: scheduleData,
    draftData: parsedDraft,
    playoffResults,
    rosterDetails,
  }
}

/**
 * Fetch weekly results for all weeks in a season.
 */
async function fetchAllWeeklyResults(year, mflLeagueId, apiKey) {
  const allResults = {}

  for (let week = 1; week <= 17; week++) {
    try {
      const data = await mflFetch(year, mflLeagueId, 'weeklyResults', apiKey, { W: String(week) })
      const matchups = data?.weeklyResults?.matchup || []
      const matchupArr = Array.isArray(matchups) ? matchups : [matchups]

      if (!matchupArr[0]) break

      const weekGames = matchupArr.map(m => {
        const teams = m.franchise || []
        const teamsArr = Array.isArray(teams) ? teams : [teams]
        return {
          homeTeamId: teamsArr[0]?.id,
          homePoints: parseFloat(teamsArr[0]?.score || 0),
          awayTeamId: teamsArr[1]?.id,
          awayPoints: parseFloat(teamsArr[1]?.score || 0),
          result: teamsArr[0]?.result,
        }
      }).filter(g => g.homeTeamId)

      if (weekGames.length > 0) {
        allResults[week] = weekGames
      }
    } catch {
      break
    }
  }

  return allResults
}

/**
 * Build weekly scores from MFL matchup data.
 */
function buildWeeklyScores(matchups, franchiseId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const game = games.find(g =>
      g.homeTeamId === franchiseId || g.awayTeamId === franchiseId
    )
    if (game) {
      const isHome = game.homeTeamId === franchiseId
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
async function runFullImport(mflLeagueId, userId, prisma, apiKey) {
  const importRecord = await prisma.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'mfl',
      sourceLeagueId: String(mflLeagueId),
      status: 'SCANNING',
    },
  })

  try {
    const discovery = await discoverLeague(mflLeagueId, apiKey)

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
          name: discovery.name || 'Imported from MFL',
          sport: 'NFL',
          ownerId: userId,
          status: 'ACTIVE',
          settings: {
            importedFrom: 'mfl',
            mflLeagueId: String(mflLeagueId),
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
        const seasonData = await importSeason(mflLeagueId, season.year, apiKey)

        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.franchiseId] || null

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
              rosterData: seasonData.rosterDetails?.[roster.franchiseId]
                ? { players: seasonData.rosterDetails[roster.franchiseId] }
                : {},
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.franchiseId),
            },
            update: {
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: seasonData.rosterDetails?.[roster.franchiseId]
                ? { players: seasonData.rosterDetails[roster.franchiseId] }
                : {},
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.franchiseId),
            },
          })
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`Failed to import MFL season ${season.year}:`, err.message)
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
