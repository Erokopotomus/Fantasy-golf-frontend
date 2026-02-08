/**
 * Sleeper Import Service
 *
 * Imports league history from Sleeper's public API.
 * No auth needed — just a league ID.
 *
 * Sleeper API docs: https://docs.sleeper.com/
 * Base URL: https://api.sleeper.app/v1
 */

const BASE = 'https://api.sleeper.app/v1'

/**
 * Fetch JSON from Sleeper API.
 */
async function sleeperFetch(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status}: ${path}`)
  }
  return res.json()
}

/**
 * Discovery scan — find all available data for a Sleeper league.
 * Returns league metadata + list of seasons found.
 */
async function discoverLeague(sleeperLeagueId) {
  // Get current league info
  const league = await sleeperFetch(`/league/${sleeperLeagueId}`)
  if (!league) throw new Error('League not found on Sleeper')

  // Walk backwards through previous_league_id to find all seasons
  const seasons = []
  let currentId = sleeperLeagueId
  let maxIterations = 20 // Safety valve

  while (currentId && maxIterations > 0) {
    const leagueData = await sleeperFetch(`/league/${currentId}`)
    if (!leagueData) break

    seasons.push({
      sleeperLeagueId: currentId,
      season: leagueData.season,
      name: leagueData.name,
      totalRosters: leagueData.total_rosters,
      status: leagueData.status,
      sport: leagueData.sport,
      scoringSettings: leagueData.scoring_settings,
      rosterPositions: leagueData.roster_positions,
      settings: leagueData.settings,
    })

    currentId = leagueData.previous_league_id
    maxIterations--
  }

  // Sort oldest first
  seasons.sort((a, b) => parseInt(a.season) - parseInt(b.season))

  return {
    currentLeague: league,
    sport: league.sport,
    name: league.name,
    seasons,
    totalSeasons: seasons.length,
  }
}

/**
 * Import a single season of Sleeper league data.
 */
async function importSeason(sleeperLeagueId, seasonYear) {
  // Fetch all data for this season in parallel
  const [rosters, users, matchups, drafts, transactions] = await Promise.all([
    sleeperFetch(`/league/${sleeperLeagueId}/rosters`).catch(() => []),
    sleeperFetch(`/league/${sleeperLeagueId}/users`).catch(() => []),
    fetchAllMatchups(sleeperLeagueId),
    sleeperFetch(`/league/${sleeperLeagueId}/drafts`).catch(() => []),
    sleeperFetch(`/league/${sleeperLeagueId}/transactions/1`).catch(() => []),
  ])

  // Build user map (roster_id -> user info)
  const userMap = {}
  for (const u of users) {
    userMap[u.user_id] = {
      userId: u.user_id,
      displayName: u.display_name,
      avatar: u.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null,
    }
  }

  // Build roster data with standings
  const rosterData = rosters.map(r => {
    const user = userMap[r.owner_id] || { displayName: `Team ${r.roster_id}`, avatar: null }
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      ownerName: user.displayName,
      ownerAvatar: user.avatar,
      players: r.players || [],
      starters: r.starters || [],
      wins: r.settings?.wins || 0,
      losses: r.settings?.losses || 0,
      ties: r.settings?.ties || 0,
      pointsFor: r.settings?.fpts ? r.settings.fpts + (r.settings.fpts_decimal || 0) / 100 : 0,
      pointsAgainst: r.settings?.fpts_against ? r.settings.fpts_against + (r.settings.fpts_against_decimal || 0) / 100 : 0,
    }
  })

  // Sort by wins desc, points for desc for standings
  rosterData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

  // Determine playoff results from matchups
  const playoffResults = determinePlayoffResults(matchups, rosterData)

  // Import draft data
  let draftData = null
  if (drafts.length > 0) {
    const draftId = drafts[0].draft_id
    const picks = await sleeperFetch(`/draft/${draftId}/picks`).catch(() => [])
    draftData = {
      type: drafts[0].type,
      rounds: drafts[0].settings?.rounds,
      picks: picks.map(p => ({
        round: p.round,
        pick: p.pick_no,
        rosterId: p.roster_id,
        playerId: p.player_id,
        playerName: p.metadata?.first_name && p.metadata?.last_name
          ? `${p.metadata.first_name} ${p.metadata.last_name}`
          : null,
        position: p.metadata?.position,
        amount: p.metadata?.amount,
      })),
    }
  }

  return {
    seasonYear: parseInt(seasonYear),
    rosters: rosterData,
    matchups,
    draftData,
    playoffResults,
    userMap,
  }
}

/**
 * Fetch all matchups for all weeks.
 */
async function fetchAllMatchups(sleeperLeagueId) {
  const allMatchups = {}
  for (let week = 1; week <= 18; week++) {
    try {
      const weekMatchups = await sleeperFetch(`/league/${sleeperLeagueId}/matchups/${week}`)
      if (!weekMatchups || weekMatchups.length === 0) break
      allMatchups[week] = weekMatchups
    } catch {
      break
    }
  }
  return allMatchups
}

/**
 * Determine playoff results from matchup data.
 * Returns map of rosterId -> playoffResult
 */
function determinePlayoffResults(matchups, rosters) {
  // Try to find playoff weeks (typically weeks 15-17 for NFL)
  const results = {}
  const weekNumbers = Object.keys(matchups).map(Number).sort((a, b) => a - b)

  // Simple heuristic: last 3 weeks are likely playoffs
  // Can be enhanced with league settings data
  if (weekNumbers.length >= 14) {
    const lastWeek = weekNumbers[weekNumbers.length - 1]
    const lastWeekMatchups = matchups[lastWeek] || []

    // Find highest scorer in final week — likely champion
    let maxPoints = 0
    let champRosterId = null
    for (const m of lastWeekMatchups) {
      if (m.points > maxPoints) {
        maxPoints = m.points
        champRosterId = m.roster_id
      }
    }

    // Top N rosters made playoffs (usually top 6)
    const playoffTeams = rosters.slice(0, Math.min(6, rosters.length))
    for (const r of playoffTeams) {
      if (r.rosterId === champRosterId) {
        results[r.rosterId] = 'champion'
      } else {
        results[r.rosterId] = 'eliminated'
      }
    }
    for (const r of rosters.slice(6)) {
      results[r.rosterId] = 'missed'
    }
  }

  return results
}

/**
 * Full import pipeline — discovers, imports, and persists to DB.
 *
 * @param {string} sleeperLeagueId - Sleeper league ID
 * @param {string} userId - Clutch user running the import
 * @param {PrismaClient} prisma
 * @returns {Object} - Import result with league and season data
 */
async function runFullImport(sleeperLeagueId, userId, prisma) {
  // Create import record
  const importRecord = await prisma.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'sleeper',
      sourceLeagueId: sleeperLeagueId,
      status: 'SCANNING',
    },
  })

  try {
    // Step 1: Discovery
    const discovery = await discoverLeague(sleeperLeagueId)

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
          name: discovery.name || `Imported from Sleeper`,
          sport: discovery.sport === 'nfl' ? 'NFL' : 'GOLF',
          ownerId: userId,
          status: 'ACTIVE',
          settings: {
            importedFrom: 'sleeper',
            sleeperLeagueId,
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
        const seasonData = await importSeason(season.sleeperLeagueId, season.season)

        // Persist historical season records
        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.rosterId] || null

          await prisma.historicalSeason.upsert({
            where: {
              leagueId_seasonYear_ownerName: {
                leagueId: clutchLeague.id,
                seasonYear: seasonData.seasonYear,
                ownerName: roster.ownerName || `Team ${roster.rosterId}`,
              },
            },
            create: {
              leagueId: clutchLeague.id,
              importId: importRecord.id,
              seasonYear: seasonData.seasonYear,
              teamName: roster.ownerName || `Team ${roster.rosterId}`,
              ownerName: roster.ownerName || `Team ${roster.rosterId}`,
              finalStanding: standing,
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: { players: roster.players, starters: roster.starters },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.rosterId),
              settings: season.scoringSettings ? { scoring: season.scoringSettings, positions: season.rosterPositions } : null,
            },
            update: {
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: { players: roster.players, starters: roster.starters },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.rosterId),
            },
          })
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`Failed to import season ${season.season}:`, err.message)
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

/**
 * Build weekly scores array from matchup data for a specific roster.
 */
function buildWeeklyScores(matchups, rosterId) {
  const scores = []
  for (const [week, weekMatchups] of Object.entries(matchups)) {
    const entry = weekMatchups.find(m => m.roster_id === rosterId)
    if (entry) {
      const opponent = weekMatchups.find(
        m => m.matchup_id === entry.matchup_id && m.roster_id !== rosterId
      )
      scores.push({
        week: parseInt(week),
        points: entry.points || 0,
        opponentPoints: opponent?.points || 0,
        matchupId: entry.matchup_id,
        starters: entry.starters,
        starterPoints: entry.starters_points,
      })
    }
  }
  return scores
}

module.exports = {
  discoverLeague,
  importSeason,
  runFullImport,
  sleeperFetch,
}
