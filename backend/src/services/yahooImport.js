/**
 * Yahoo Fantasy Import Service (Enhanced)
 *
 * Imports league history from Yahoo Fantasy Sports API with maximum data capture.
 *
 * Enhancements:
 * - Raw API response storage in RawProviderData before normalization
 * - Transaction import (trades, waivers, adds/drops, FAAB bids)
 * - Full league settings capture
 * - Enhanced draft (auction cost, is_keeper)
 * - Enhanced matchups (playoff flags, matchup IDs, consolation)
 * - Opinion timeline bridge (PlayerOpinionEvent for every decision-point)
 *
 * Yahoo Fantasy API base: https://fantasysports.yahooapis.com/fantasy/v2
 * Yahoo uses game keys per sport per year — they change every year.
 */

const { PrismaClient } = require('@prisma/client')
const opinionTimeline = require('./opinionTimelineService')

const prisma = new PrismaClient()
const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

// Known Yahoo NFL game keys (updated annually)
const NFL_GAME_KEYS = {
  2015: '348', 2016: '359', 2017: '371', 2018: '380',
  2019: '390', 2020: '399', 2021: '406', 2022: '414',
  2023: '423', 2024: '431', 2025: '440',
}

// ─── Yahoo API Fetch ───────────────────────────────────────────────────────

/**
 * Fetch JSON from Yahoo Fantasy API.
 * Yahoo returns XML by default — we request JSON format.
 */
async function yahooFetch(path, accessToken, onTokenRefresh) {
  if (!accessToken) throw new Error('Yahoo access token is required')

  const url = `${BASE}${path}?format=json`
  let res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  // Auto-refresh on 401 if callback provided
  if (res.status === 401 && onTokenRefresh) {
    try {
      const newToken = await onTokenRefresh()
      res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${newToken}` },
      })
    } catch {
      throw new Error('Yahoo authentication expired and refresh failed. Please re-authorize.')
    }
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('Yahoo authentication expired. Please re-authorize.')
    if (res.status === 999) throw new Error('Yahoo rate limit exceeded. Please wait a moment.')
    throw new Error(`Yahoo API error ${res.status}`)
  }
  return res.json()
}

// ─── Raw Data Preservation ─────────────────────────────────────────────────

/**
 * Store raw API response in RawProviderData before normalization.
 * Fire-and-forget — never blocks the import pipeline.
 */
async function storeRawResponse(dataType, leagueKey, seasonYear, payload) {
  try {
    await prisma.rawProviderData.create({
      data: {
        provider: 'yahoo',
        dataType,
        eventRef: leagueKey,
        payload,
        recordCount: null,
        processedAt: null,
      },
    })
  } catch (err) {
    console.error(`[YahooImport] Failed to store raw ${dataType}:`, err.message)
  }
}

// ─── Discovery ─────────────────────────────────────────────────────────────

/**
 * Discovery scan — find all seasons for a Yahoo league.
 * Yahoo leagues get new game keys each year but the league number stays the same.
 * Now captures full league settings per season.
 */
async function discoverLeague(yahooLeagueId, accessToken) {
  const seasons = []
  const gameKeyEntries = Object.entries(NFL_GAME_KEYS).sort(([a], [b]) => Number(b) - Number(a))

  for (const [year, gameKey] of gameKeyEntries) {
    try {
      const leagueKey = `${gameKey}.l.${yahooLeagueId}`
      const data = await yahooFetch(`/league/${leagueKey}/settings`, accessToken)

      // Store raw settings response
      storeRawResponse('league_settings', leagueKey, parseInt(year), data).catch(() => {})

      const league = data?.fantasy_content?.league
      if (!league) continue

      const settings = Array.isArray(league) ? league[1]?.settings : league.settings
      const meta = Array.isArray(league) ? league[0] : league

      // Extract full settings — Yahoo nests settings in arrays
      const fullSettings = {}
      const settingsArr = Array.isArray(settings) ? settings : [settings]
      for (const s of settingsArr) {
        if (s && typeof s === 'object') Object.assign(fullSettings, s)
      }

      // Extract roster positions from settings
      let rosterPositions = null
      if (fullSettings.roster_positions) {
        const rp = fullSettings.roster_positions
        rosterPositions = Array.isArray(rp) ? rp : typeof rp === 'object' ? Object.values(rp) : null
      }

      seasons.push({
        year: parseInt(year),
        gameKey,
        leagueKey,
        name: meta.name,
        teamCount: parseInt(meta.num_teams || 0),
        status: meta.is_finished === '1' ? 'complete' : 'in_progress',
        scoringType: meta.scoring_type,
        draftType: fullSettings.draft_type || 'live',
        // Full settings snapshot for HistoricalSeason.settings
        settings: {
          scoringType: meta.scoring_type,
          draftType: fullSettings.draft_type,
          rosterPositions,
          numTeams: parseInt(meta.num_teams || 0),
          playoffStartWeek: parseInt(meta.playoff_start_week || 0),
          usesPlayoffs: fullSettings.uses_playoff === '1' || !!meta.playoff_start_week,
          usesFAAB: fullSettings.uses_faab === '1',
          faabBalance: fullSettings.budget ? parseInt(fullSettings.budget) : null,
          waiverType: fullSettings.waiver_type || null,
          waiverRule: fullSettings.waiver_rule || null,
          tradeEndDate: fullSettings.trade_end_date || null,
          tradeRejectTime: fullSettings.trade_reject_time || null,
          maxTeams: fullSettings.max_teams || null,
          seasonYear: parseInt(year),
          gameKey,
          leagueKey,
        },
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

// ─── Fetch Transactions ────────────────────────────────────────────────────

/**
 * Fetch all transactions for a league season from Yahoo.
 * Captures: trades, add/drops, waivers, FAAB bids, commish moves.
 */
async function fetchTransactions(leagueKey, year, accessToken) {
  try {
    const data = await yahooFetch(`/league/${leagueKey}/transactions`, accessToken)
    storeRawResponse('transactions', leagueKey, year, data).catch(() => {})

    const league = data?.fantasy_content?.league
    const txnData = Array.isArray(league) ? league[1]?.transactions : league?.transactions
    if (!txnData) return []

    const transactions = []
    const txnEntries = typeof txnData === 'object' ? Object.values(txnData) : []

    for (const entry of txnEntries) {
      const txn = entry?.transaction
      if (!txn) continue

      const meta = Array.isArray(txn) ? txn[0] : txn
      const players = Array.isArray(txn) ? txn[1]?.players : txn?.players

      // Skip count entries (Yahoo sometimes includes a "count" key)
      if (typeof meta !== 'object' || !meta.transaction_key) continue

      const parsedTxn = {
        transactionKey: meta.transaction_key,
        type: meta.type, // add, drop, add/drop, trade, commish
        timestamp: meta.timestamp ? new Date(parseInt(meta.timestamp) * 1000) : null,
        status: meta.status,
        faabBid: meta.faab_bid != null ? parseInt(meta.faab_bid) : null,
        tradeNote: meta.trade_note || null,
        playersAdded: [],
        playersDropped: [],
      }

      // Parse player movements
      if (players) {
        const playerEntries = typeof players === 'object' ? Object.values(players) : []
        for (const pEntry of playerEntries) {
          const player = pEntry?.player
          if (!player) continue

          const pArr = Array.isArray(player) ? player : [player]
          // Yahoo nests player info in arrays of objects
          let playerKey = null
          let playerName = null
          let position = null
          let transactionData = []

          for (const item of pArr) {
            if (Array.isArray(item)) {
              // Nested array of player meta fields
              for (const field of item) {
                if (field?.player_key) playerKey = field.player_key
                if (field?.name?.full) playerName = field.name.full
                if (field?.display_position) position = field.display_position
              }
            } else if (item?.player_key) {
              playerKey = item.player_key
            } else if (item?.name?.full) {
              playerName = item.name.full
            } else if (item?.display_position) {
              position = item.display_position
            } else if (item?.transaction_data) {
              const td = item.transaction_data
              transactionData = Array.isArray(td) ? td : [td]
            }
          }

          for (const td of transactionData) {
            if (!td || typeof td !== 'object') continue
            const info = {
              playerKey,
              playerName,
              position,
              sourceTeamKey: td.source_team_key || null,
              destTeamKey: td.destination_team_key || null,
              moveType: td.type, // 'add' or 'drop'
            }

            if (td.type === 'add') {
              parsedTxn.playersAdded.push(info)
            } else if (td.type === 'drop') {
              parsedTxn.playersDropped.push(info)
            }
          }
        }
      }

      transactions.push(parsedTxn)
    }

    return transactions
  } catch (err) {
    console.error(`[YahooImport] Failed to fetch transactions for ${leagueKey}:`, err.message)
    return []
  }
}

// ─── Fetch All Matchups ────────────────────────────────────────────────────

/**
 * Fetch all matchups for a Yahoo season (weeks 1-18).
 * Enhanced: captures playoff flags, matchup IDs, consolation, tied status.
 */
async function fetchAllMatchups(leagueKey, year, accessToken) {
  const allMatchups = {}

  for (let week = 1; week <= 18; week++) {
    try {
      const data = await yahooFetch(`/league/${leagueKey}/scoreboard;week=${week}`, accessToken)

      // Store raw scoreboard for first and last week (bookends)
      if (week === 1) {
        storeRawResponse('scoreboard_sample', leagueKey, year, data).catch(() => {})
      }

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
            isPlayoffs: matchup.is_playoffs === '1',
            isConsolation: matchup.is_consolation === '1',
            isTied: matchup.is_tied === '1',
            winnerTeamKey: matchup.winner_team_key || null,
            matchupRecapUrl: matchup.matchup_recap_url || null,
          })
        }
      }

      if (weekGames.length > 0) {
        allMatchups[week] = weekGames
      } else {
        break // No more matchups found — season is over
      }
    } catch {
      break
    }
  }
  return allMatchups
}

// ─── Import a Single Season ────────────────────────────────────────────────

/**
 * Import a single Yahoo season — fetches standings, matchups, draft, and transactions.
 * All raw API responses are stored in RawProviderData before normalization.
 */
async function importSeason(leagueKey, year, accessToken) {
  // Fetch all data in parallel
  const [standingsData, matchupsData, draftData, transactionsData] = await Promise.all([
    yahooFetch(`/league/${leagueKey}/standings`, accessToken).catch(() => null),
    fetchAllMatchups(leagueKey, year, accessToken),
    yahooFetch(`/league/${leagueKey}/draftresults`, accessToken).catch(() => null),
    fetchTransactions(leagueKey, year, accessToken),
  ])

  // Store raw responses (standings + draft — transactions + matchups stored in their fetch functions)
  if (standingsData) storeRawResponse('standings', leagueKey, year, standingsData).catch(() => {})
  if (draftData) storeRawResponse('draft_results', leagueKey, year, draftData).catch(() => {})

  // ── Parse Standings / Teams ──

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
      streak: outcomes?.streak
        ? { type: outcomes.streak.type, value: parseInt(outcomes.streak.value || 0) }
        : null,
    })
  }

  rosterData.sort((a, b) => a.rank - b.rank)

  // ── Parse Draft Results (Enhanced) ──

  let parsedDraft = null
  const draftResults = draftData?.fantasy_content?.league
  const drafts = Array.isArray(draftResults) ? draftResults[1]?.draft_results : draftResults?.draft_results
  if (drafts) {
    const picks = Object.values(drafts).filter(d => d?.draft_result)
    parsedDraft = {
      type: 'snake',
      picks: picks.map(p => {
        const dr = p.draft_result
        const cost = dr.cost != null ? parseInt(dr.cost) : null
        return {
          round: parseInt(dr.round || 0),
          pick: parseInt(dr.pick || 0),
          teamKey: dr.team_key,
          playerId: dr.player_key,
          playerName: null, // Yahoo doesn't include name in draft results
          cost,             // Auction amount (null for snake drafts)
          isKeeper: dr.is_keeper === '1',
        }
      }),
    }
    // Detect auction draft
    if (parsedDraft.picks.some(p => p.cost != null && p.cost > 0)) {
      parsedDraft.type = 'auction'
    }
  }

  // ── Determine Playoff Results ──

  const playoffResults = {}
  for (const r of rosterData) {
    if (r.rank === 1) playoffResults[r.teamId] = 'champion'
    else if (r.rank === 2) playoffResults[r.teamId] = 'runner_up'
    else if (r.playoffSeed) playoffResults[r.teamId] = 'eliminated'
    else playoffResults[r.teamId] = 'missed'
  }

  return {
    seasonYear: year,
    rosters: rosterData,
    matchups: matchupsData,
    draftData: parsedDraft,
    transactions: transactionsData,
    playoffResults,
  }
}

// ─── Build Weekly Scores ───────────────────────────────────────────────────

/**
 * Build per-team weekly scores from matchup data.
 * Enhanced: includes playoff/consolation flags.
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
        isPlayoffs: game.isPlayoffs || false,
        isConsolation: game.isConsolation || false,
      })
    }
  }
  return scores
}

// ─── Opinion Timeline Bridge (Part 4) ──────────────────────────────────────

/**
 * Generate PlayerOpinionEvent records for a team's draft picks and transactions.
 * Fire-and-forget — must never block import processing.
 *
 * @param {string} userId - Clutch user ID to attribute events to
 * @param {object} seasonData - Full season import data
 * @param {string} teamKey - Yahoo team key for this user's team
 * @param {string} leagueName - League name for context
 */
async function generateOpinionEventsForSeason(userId, seasonData, teamKey, leagueName) {
  if (!userId || !teamKey) return

  const year = seasonData.seasonYear

  // ── Draft Pick Events ──
  if (seasonData.draftData?.picks) {
    const teamPicks = seasonData.draftData.picks.filter(p => p.teamKey === teamKey)
    // Approximate draft date: first Saturday of September
    const draftDate = new Date(`${year}-09-01T12:00:00Z`)

    for (const pick of teamPicks) {
      if (!pick.playerId) continue
      opinionTimeline.recordEvent(
        userId, pick.playerId, 'NFL', 'DRAFT_PICK',
        {
          round: pick.round,
          pick: pick.pick,
          cost: pick.cost,
          isKeeper: pick.isKeeper || false,
          dataSource: 'yahoo_import',
          season: year,
          leagueName,
        },
        null, 'HistoricalDraft', draftDate
      ).catch(() => {})
    }
  }

  // ── Transaction Events ──
  if (seasonData.transactions) {
    for (const txn of seasonData.transactions) {
      const txnDate = txn.timestamp || new Date(`${year}-10-15T12:00:00Z`)

      // Players added to this user's team
      for (const player of txn.playersAdded) {
        if (!player.playerKey || player.destTeamKey !== teamKey) continue

        const eventType = txn.type === 'trade' ? 'TRADE_ACQUIRE' : 'WAIVER_ADD'
        opinionTimeline.recordEvent(
          userId, player.playerKey, 'NFL', eventType,
          {
            transactionType: txn.type,
            faabBid: txn.faabBid,
            playerName: player.playerName,
            position: player.position,
            dataSource: 'yahoo_import',
            season: year,
          },
          null, 'HistoricalTransaction', txnDate
        ).catch(() => {})
      }

      // Players dropped from this user's team
      for (const player of txn.playersDropped) {
        if (!player.playerKey || player.sourceTeamKey !== teamKey) continue

        const eventType = txn.type === 'trade' ? 'TRADE_AWAY' : 'WAIVER_DROP'
        opinionTimeline.recordEvent(
          userId, player.playerKey, 'NFL', eventType,
          {
            transactionType: txn.type,
            playerName: player.playerName,
            position: player.position,
            dataSource: 'yahoo_import',
            season: year,
          },
          null, 'HistoricalTransaction', txnDate
        ).catch(() => {})
      }
    }
  }
}

// ─── Full Import Pipeline ──────────────────────────────────────────────────

/**
 * Full import pipeline — discovers seasons, imports data, stores in HistoricalSeason.
 * Now includes raw data preservation, transactions, and opinion timeline bridge.
 */
async function runFullImport(yahooLeagueId, userId, db, accessToken, targetLeagueId, selectedSeasons) {
  const importRecord = await db.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'yahoo',
      sourceLeagueId: String(yahooLeagueId),
      status: 'SCANNING',
    },
  })

  try {
    const discovery = await discoverLeague(yahooLeagueId, accessToken)

    await db.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 10,
      },
    })

    // Find or create Clutch league
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

    // Filter seasons if user deselected some
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
        const seasonData = await importSeason(season.leagueKey, season.year, accessToken)

        // Try to identify which team belongs to the importing user
        let matchedTeamKey = null
        if (userDisplayName) {
          const matched = seasonData.rosters.find(r =>
            r.ownerName?.toLowerCase().includes(userDisplayName) ||
            userDisplayName.includes(r.ownerName?.toLowerCase() || '')
          )
          if (matched) matchedTeamKey = matched.teamKey
        }

        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.teamId] || null

          // Set ownerUserId if this is the importing user's team
          const isUsersTeam = roster.teamKey === matchedTeamKey
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
              rosterData: {},
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
              transactions: seasonData.transactions,
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
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.teamId),
              transactions: seasonData.transactions,
              settings: season.settings || {},
            },
          })

          // Opinion Timeline Bridge — only for importing user's team
          if (isUsersTeam) {
            generateOpinionEventsForSeason(
              userId, seasonData, roster.teamKey, clutchLeague.name
            ).catch(() => {})
          }
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`[YahooImport] Failed to import season ${season.year}:`, err.message)
        // Log error to import record
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
