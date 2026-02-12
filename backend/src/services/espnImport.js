/**
 * ESPN Import Service (Enhanced)
 *
 * Imports league history from ESPN Fantasy API.
 * Requires espn_s2 + SWID cookies for private leagues.
 * Public leagues work without auth.
 * Data available from 2018+ (ESPN deleted pre-2018 data).
 *
 * Enhancements:
 * - Raw API response storage in RawProviderData before normalization
 * - Enhanced team data (draftDayProjectedRank, acquisitionType, streakLength)
 * - Enhanced matchup data (isPlayoffs flag, consolation status)
 * - League settings snapshot stored in HistoricalSeason.settings
 * - Opinion timeline bridge (PlayerOpinionEvent for draft picks)
 * - Owner matching by display name comparison
 * - Error accumulation to import record's errorLog array
 *
 * ESPN Fantasy API base: https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{leagueId}
 */

const { PrismaClient } = require('@prisma/client')
const opinionTimeline = require('./opinionTimelineService')

const prisma = new PrismaClient()
const BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons'

// ─── Raw Data Preservation ─────────────────────────────────────────────────

/**
 * Store raw API response in RawProviderData before normalization.
 * Fire-and-forget — never blocks the import pipeline.
 */
async function storeRawResponse(dataType, leagueId, seasonYear, payload) {
  try {
    await prisma.rawProviderData.create({
      data: {
        provider: 'espn',
        dataType,
        eventRef: String(leagueId),
        payload,
        recordCount: Array.isArray(payload) ? payload.length : null,
        processedAt: null,
      },
    })
  } catch (err) {
    console.error(`[EspnImport] Failed to store raw ${dataType}:`, err.message)
  }
}

// ─── ESPN API Fetch ────────────────────────────────────────────────────────

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

// ─── Discovery ─────────────────────────────────────────────────────────────

/**
 * Discovery scan — find all available seasons for an ESPN league.
 * ESPN reuses the same league ID across years.
 * Now captures full league settings per season and stores raw responses.
 */
async function discoverLeague(espnLeagueId, cookies = {}) {
  const currentYear = new Date().getFullYear()
  const seasons = []

  // ESPN deleted pre-2018 data — scan from 2018 to current year
  for (let year = currentYear; year >= 2018; year--) {
    try {
      const data = await espnFetch(year, espnLeagueId, { view: 'mSettings' }, cookies)
      if (!data || !data.settings) continue

      // Store raw settings response
      storeRawResponse('league_settings', espnLeagueId, year, data).catch(() => {})

      const s = data.settings

      // Build full settings snapshot for HistoricalSeason.settings
      const settingsSnapshot = {
        scoringType: s.scoringSettings?.scoringType || null,
        scoringItems: s.scoringSettings?.scoringItems || null,
        draftType: s.draftSettings?.type || null,
        auctionBudget: s.draftSettings?.auctionBudget || null,
        keeperCount: s.draftSettings?.keeperCount || 0,
        numTeams: s.size || null,
        rosterSlots: s.rosterSettings?.lineupSlotCounts || null,
        playoffTeamCount: s.scheduleSettings?.playoffTeamCount || null,
        playoffMatchupPeriodLength: s.scheduleSettings?.playoffMatchupPeriodLength || null,
        regularSeasonMatchupPeriods: s.scheduleSettings?.matchupPeriodCount || null,
        tradeDeadline: s.tradeSettings?.deadlineDate || null,
        acquisitionSettings: s.acquisitionSettings || null,
        seasonYear: year,
        leagueId: String(espnLeagueId),
      }

      seasons.push({
        year,
        name: s.name,
        teamCount: s.size,
        status: data.status?.currentMatchupPeriod ? 'complete' : 'in_progress',
        scoringType: s.scoringSettings?.scoringType,
        draftType: s.draftSettings?.type,
        settings: settingsSnapshot,
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

// ─── Import a Single Season ────────────────────────────────────────────────

/**
 * Import a single ESPN season.
 * Enhanced: captures draftDayProjectedRank, acquisitionType, streakLength,
 * isPlayoffs flag, consolation status, and stores raw responses.
 */
async function importSeason(espnLeagueId, year, cookies = {}) {
  // Fetch roster/standings and matchup data in parallel
  const [leagueData, matchupData] = await Promise.all([
    espnFetch(year, espnLeagueId, { view: 'mTeam' }, cookies),
    espnFetch(year, espnLeagueId, { view: 'mMatchup' }, cookies).catch(() => null),
  ])

  // Also fetch draft data
  const draftData = await espnFetch(year, espnLeagueId, { view: 'mDraftDetail' }, cookies).catch(() => null)

  // Store raw responses (fire-and-forget)
  storeRawResponse('team_data', espnLeagueId, year, leagueData).catch(() => {})
  if (matchupData) storeRawResponse('matchup_data', espnLeagueId, year, matchupData).catch(() => {})
  if (draftData) storeRawResponse('draft_data', espnLeagueId, year, draftData).catch(() => {})

  const teams = leagueData.teams || []
  const members = leagueData.members || []

  // Build member map (id -> name)
  const memberMap = {}
  for (const m of members) {
    memberMap[m.id] = {
      displayName: m.displayName || m.firstName || 'Unknown',
      firstName: m.firstName,
      lastName: m.lastName,
    }
  }

  // Build roster data with standings — enhanced with draftDayProjectedRank, acquisitionType, streakLength
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
      draftDayProjectedRank: t.draftDayProjectedRank || null,
      streakLength: record.streakLength || null,
      streakType: record.streakType || null,
      roster: (t.roster?.entries || []).map(e => ({
        playerId: e.playerId,
        playerName: e.playerPoolEntry?.player?.fullName || `Player ${e.playerId}`,
        position: e.playerPoolEntry?.player?.defaultPositionId,
        acquisitionType: e.acquisitionType || null,
      })),
    }
  })

  // Sort by wins desc, PF desc
  rosterData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

  // Extract matchups by week — enhanced with isPlayoffs and consolation status
  const matchups = {}
  if (matchupData?.schedule) {
    for (const game of matchupData.schedule) {
      const week = game.matchupPeriodId
      if (!matchups[week]) matchups[week] = []

      const isPlayoffs = !!(game.playoffTierType && game.playoffTierType !== 'NONE')
      const isConsolation = !!(
        game.playoffTierType &&
        game.playoffTierType !== 'NONE' &&
        game.playoffTierType !== 'WINNERS_BRACKET'
      )

      matchups[week].push({
        matchupId: game.id,
        homeTeamId: game.home?.teamId,
        homePoints: game.home?.totalPoints || 0,
        awayTeamId: game.away?.teamId,
        awayPoints: game.away?.totalPoints || 0,
        winner: game.winner,
        playoffTierType: game.playoffTierType,
        isPlayoffs,
        isConsolation,
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

// ─── Determine Playoff Results ─────────────────────────────────────────────

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

// ─── Build Weekly Scores ───────────────────────────────────────────────────

/**
 * Build weekly scores from ESPN matchup data for a specific team.
 * Enhanced: includes isPlayoffs and isConsolation flags.
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
        isPlayoffs: game.isPlayoffs || false,
        isConsolation: game.isConsolation || false,
      })
    }
  }
  return scores
}

// ─── Opinion Timeline Bridge ───────────────────────────────────────────────

/**
 * Generate PlayerOpinionEvent records for a team's draft picks.
 * Fire-and-forget — must never block import processing.
 *
 * @param {string} userId - Clutch user ID to attribute events to
 * @param {object} seasonData - Full season import data
 * @param {number} teamId - ESPN team ID for this user's team
 * @param {string} leagueName - League name for context
 */
async function generateOpinionEventsForSeason(userId, seasonData, teamId, leagueName) {
  if (!userId || !teamId) return

  const year = seasonData.seasonYear

  // ── Draft Pick Events ──
  if (seasonData.draftData?.picks) {
    const teamPicks = seasonData.draftData.picks.filter(p => p.teamId === teamId)
    // Approximate draft date: first Saturday of September
    const draftDate = new Date(`${year}-09-01T12:00:00Z`)

    for (const pick of teamPicks) {
      if (!pick.playerId) continue
      opinionTimeline.recordEvent(
        userId, String(pick.playerId), 'NFL', 'DRAFT_PICK',
        {
          round: pick.round,
          pick: pick.pick,
          isKeeper: pick.keeper || false,
          playerName: pick.playerName,
          dataSource: 'espn_import',
          season: year,
          leagueName,
        },
        null, 'HistoricalDraft', draftDate
      ).catch(() => {})
    }
  }
}

// ─── Full Import Pipeline ──────────────────────────────────────────────────

/**
 * Full import pipeline — discovers, imports, and persists to DB.
 * Enhanced with raw data preservation, owner matching, opinion timeline bridge,
 * settings snapshot, and error accumulation.
 */
async function runFullImport(espnLeagueId, userId, db, cookies = {}, targetLeagueId, selectedSeasons) {
  const importRecord = await db.leagueImport.create({
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

    await db.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 10,
      },
    })

    // Step 2: Create or find the Clutch league
    let clutchLeague
    if (targetLeagueId) {
      clutchLeague = await db.league.findUnique({ where: { id: targetLeagueId } })
      if (!clutchLeague) throw new Error('Target league not found')
    } else {
      clutchLeague = await db.league.findFirst({
        where: {
          ownerId: userId,
          name: { contains: discovery.name, mode: 'insensitive' },
        },
      })

      if (!clutchLeague) {
        clutchLeague = await db.league.create({
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
    }

    // Ensure importing user is a member of the league
    await db.leagueMember.upsert({
      where: { userId_leagueId: { userId, leagueId: clutchLeague.id } },
      create: { userId, leagueId: clutchLeague.id, role: 'OWNER' },
      update: {},
    })

    await db.leagueImport.update({
      where: { id: importRecord.id },
      data: { clutchLeagueId: clutchLeague.id },
    })

    // Fetch importing user's display name for owner matching
    const importingUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    const userDisplayName = (importingUser?.name || '').toLowerCase()

    // Step 3: Import each season (filter if user deselected some)
    let seasonsToImport = discovery.seasons
    if (selectedSeasons?.length) {
      seasonsToImport = discovery.seasons.filter(s =>
        selectedSeasons.includes(parseInt(s.season || s.year))
      )
    }

    const importedSeasons = []
    for (let i = 0; i < seasonsToImport.length; i++) {
      const season = seasonsToImport[i]
      const progress = 10 + Math.round(((i + 1) / seasonsToImport.length) * 80)

      try {
        const seasonData = await importSeason(espnLeagueId, season.year, cookies)

        // Try to identify which team belongs to the importing user by display name
        let matchedTeamId = null
        if (userDisplayName) {
          const matched = seasonData.rosters.find(r =>
            r.ownerName?.toLowerCase().includes(userDisplayName) ||
            userDisplayName.includes(r.ownerName?.toLowerCase() || '')
          )
          if (matched) matchedTeamId = matched.teamId
        }

        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.teamId] || null

          // Set ownerUserId if this is the importing user's team
          const isUsersTeam = roster.teamId === matchedTeamId
          const ownerUserId = isUsersTeam ? userId : null

          await db.historicalSeason.upsert({
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
              ownerUserId,
              finalStanding: standing,
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: {
                players: roster.roster,
                draftDayProjectedRank: roster.draftDayProjectedRank,
                streakLength: roster.streakLength,
                streakType: roster.streakType,
              },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
              settings: season.settings || {},
            },
            update: {
              ownerUserId: ownerUserId || undefined,
              wins: roster.wins,
              losses: roster.losses,
              ties: roster.ties,
              pointsFor: roster.pointsFor,
              pointsAgainst: roster.pointsAgainst,
              playoffResult,
              draftData: seasonData.draftData,
              rosterData: {
                players: roster.roster,
                draftDayProjectedRank: roster.draftDayProjectedRank,
                streakLength: roster.streakLength,
                streakType: roster.streakType,
              },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
              settings: season.settings || {},
            },
          })

          // Opinion Timeline Bridge — only for importing user's team
          if (isUsersTeam) {
            generateOpinionEventsForSeason(
              userId, seasonData, roster.teamId, clutchLeague.name
            ).catch(() => {})
          }
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`[EspnImport] Failed to import season ${season.year}:`, err.message)
        // Log error to import record's errorLog array
        const current = await db.leagueImport.findUnique({
          where: { id: importRecord.id },
          select: { errorLog: true },
        })
        const errors = Array.isArray(current?.errorLog) ? current.errorLog : []
        errors.push({ message: `Season ${season.year}: ${err.message}`, timestamp: new Date().toISOString() })
        await db.leagueImport.update({
          where: { id: importRecord.id },
          data: { errorLog: errors },
        }).catch(() => {})
      }

      await db.leagueImport.update({
        where: { id: importRecord.id },
        data: {
          progressPct: progress,
          seasonsImported: importedSeasons,
        },
      })
    }

    // Step 4: Mark complete
    await db.leagueImport.update({
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
    await db.leagueImport.update({
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
