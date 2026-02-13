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
  2023: '423', 2024: '449', 2025: '461',
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
    if (res.status === 999) throw new Error('Yahoo\'s API is rate limiting requests. This is a Yahoo limitation — please wait 30-60 seconds and try again.')
    throw new Error(`Yahoo's API returned an error (${res.status}). This is on Yahoo's end — try again in a moment.`)
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

// Reverse lookup: game key → year
const GAME_KEY_TO_YEAR = {}
for (const [year, key] of Object.entries(NFL_GAME_KEYS)) {
  GAME_KEY_TO_YEAR[key] = parseInt(year)
}

// ─── Dynamic Game Key Discovery ──────────────────────────────────────────────

/**
 * Discover ALL NFL game keys the user has ever played, via Yahoo's user games endpoint.
 * Returns a merged { year: gameKey } map combining API results + hardcoded fallbacks.
 * This fixes the pre-2015 gap where hardcoded keys didn't cover older seasons.
 */
async function discoverGameKeys(accessToken, onTokenRefresh) {
  const merged = { ...NFL_GAME_KEYS }

  try {
    const data = await yahooFetch('/users;use_login=1/games;game_codes=nfl', accessToken, onTokenRefresh)

    const users = data?.fantasy_content?.users
    if (!users) return merged

    // Yahoo wraps users as { "0": { user: [...] } } or similar
    const userEntries = typeof users === 'object' ? Object.values(users) : []
    for (const entry of userEntries) {
      const userArr = entry?.user
      if (!Array.isArray(userArr)) continue

      for (const item of userArr) {
        const games = item?.games
        if (!games || typeof games !== 'object') continue

        for (const gameEntry of Object.values(games)) {
          const game = gameEntry?.game
          if (!game) continue

          // game can be an array of metadata objects or a single object
          const fields = Array.isArray(game) ? game.flat() : [game]
          let gameKey = null
          let season = null

          for (const f of fields) {
            if (f && typeof f === 'object') {
              if (f.game_key) gameKey = String(f.game_key)
              if (f.season) season = parseInt(f.season)
            }
          }

          if (gameKey && season && !merged[season]) {
            merged[season] = gameKey
            // Also update reverse lookup
            GAME_KEY_TO_YEAR[gameKey] = season
          }
        }
      }
    }

    console.log(`[YahooImport] Dynamic game key discovery: ${Object.keys(merged).length} total keys (hardcoded: ${Object.keys(NFL_GAME_KEYS).length})`)
  } catch (err) {
    console.error('[YahooImport] Dynamic game key discovery failed (using hardcoded fallback):', err.message)
  }

  return merged
}

// ─── Yahoo Player Name Resolution (via Sleeper's free API) ──────────────────

let _yahooPlayerNameCache = null
let _yahooPlayerNameCacheTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch Yahoo player ID → name mapping from Sleeper's public API.
 * Sleeper's player database includes yahoo_id for 6,700+ NFL players.
 * Cached for 24 hours to avoid repeated fetches during multi-season imports.
 */
async function getYahooPlayerNameMap() {
  if (_yahooPlayerNameCache && Date.now() - _yahooPlayerNameCacheTime < CACHE_TTL) {
    return _yahooPlayerNameCache
  }
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl')
    const players = await res.json()
    const map = {}
    for (const [, p] of Object.entries(players)) {
      if (p.yahoo_id && p.full_name) {
        map[String(p.yahoo_id)] = p.full_name
      }
    }
    _yahooPlayerNameCache = map
    _yahooPlayerNameCacheTime = Date.now()
    console.log(`[YahooImport] Built Yahoo player name map: ${Object.keys(map).length} entries`)
    return map
  } catch (err) {
    console.error('[YahooImport] Failed to fetch Sleeper player data:', err.message)
    return _yahooPlayerNameCache || {}
  }
}

/**
 * Extract the numeric Yahoo player ID from a player key like "406.p.30121" → "30121"
 */
function extractYahooPlayerId(playerKey) {
  if (!playerKey) return null
  const match = playerKey.match(/\.p\.(\d+)$/)
  return match ? match[1] : null
}

/**
 * Parse Yahoo's renew/renewed field into a full league key.
 * Yahoo uses format "gamekey_leagueid" (e.g. "390_643521") — convert to "390.l.643521".
 */
function parseRenewalKey(renewal) {
  if (!renewal) return null
  // Could be "390_643521" or already "390.l.643521"
  if (renewal.includes('.l.')) return renewal
  const parts = renewal.split('_')
  if (parts.length === 2) return `${parts[0]}.l.${parts[1]}`
  return null
}

/**
 * Extract a season object from a Yahoo league settings API response.
 */
function extractSeasonFromResponse(data, leagueKey) {
  const league = data?.fantasy_content?.league
  if (!league) return null

  const settings = Array.isArray(league) ? league[1]?.settings : league.settings
  const meta = Array.isArray(league) ? league[0] : league

  // Determine year from meta.season or from league key's game key
  const gameKeyFromKey = leagueKey.split('.l.')[0]
  const year = parseInt(meta.season) || GAME_KEY_TO_YEAR[gameKeyFromKey]
  if (!year) return null

  const gameKey = gameKeyFromKey

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

  return {
    year,
    gameKey,
    leagueKey,
    name: meta.name,
    teamCount: parseInt(meta.num_teams || 0),
    status: meta.is_finished === '1' ? 'complete' : 'in_progress',
    scoringType: meta.scoring_type,
    draftType: fullSettings.draft_type || 'live',
    renew: meta.renew || null,
    renewed: meta.renewed || null,
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
      seasonYear: year,
      gameKey,
      leagueKey,
    },
  }
}

// ─── Discovery ─────────────────────────────────────────────────────────────

/**
 * Discovery scan — find all seasons for a Yahoo league.
 *
 * IMPORTANT: Yahoo league numeric IDs are NOT unique across years. The same
 * numeric ID with different game keys can be completely different leagues.
 * We find the league in ONE year, then follow Yahoo's renew/renewed chain
 * to discover the actual connected seasons.
 */
async function discoverLeague(yahooLeagueId, accessToken, onTokenRefresh) {
  // Track refreshed token so subsequent calls use it
  let currentToken = accessToken
  const wrappedRefresh = onTokenRefresh ? async () => {
    const newToken = await onTokenRefresh()
    currentToken = newToken
    return newToken
  } : undefined

  // Discover all available game keys (dynamic from user's history + hardcoded fallback)
  const allGameKeys = await discoverGameKeys(currentToken, wrappedRefresh)
  const gameKeyEntries = Object.entries(allGameKeys).sort(([a], [b]) => Number(b) - Number(a))

  // Step 1: Find the league — try most recent year first, work backward
  let anchorSeason = null
  for (const [year, gameKey] of gameKeyEntries) {
    try {
      const leagueKey = `${gameKey}.l.${yahooLeagueId}`
      const data = await yahooFetch(`/league/${leagueKey}/settings`, currentToken, wrappedRefresh)
      storeRawResponse('league_settings', leagueKey, parseInt(year), data).catch(() => {})

      const season = extractSeasonFromResponse(data, leagueKey)
      if (season) {
        anchorSeason = season
        break
      }
    } catch {
      continue
    }
  }

  if (!anchorSeason) {
    throw new Error('No Yahoo league data found. Check your league ID and ensure your OAuth token is valid.')
  }

  // Step 2: Follow the renew chain BACKWARD to find older seasons
  const seasonMap = new Map()
  seasonMap.set(anchorSeason.leagueKey, anchorSeason)

  let current = anchorSeason
  while (current.renew) {
    const renewKey = parseRenewalKey(current.renew)
    if (!renewKey || seasonMap.has(renewKey)) break

    try {
      const data = await yahooFetch(`/league/${renewKey}/settings`, currentToken, wrappedRefresh)
      storeRawResponse('league_settings', renewKey, null, data).catch(() => {})

      const season = extractSeasonFromResponse(data, renewKey)
      if (season) {
        seasonMap.set(renewKey, season)
        current = season
      } else break
    } catch {
      break
    }
  }

  // Step 3: Follow the renewed chain FORWARD from anchor to find newer seasons
  current = anchorSeason
  while (current.renewed) {
    const renewedKey = parseRenewalKey(current.renewed)
    if (!renewedKey || seasonMap.has(renewedKey)) break

    try {
      const data = await yahooFetch(`/league/${renewedKey}/settings`, currentToken, wrappedRefresh)
      storeRawResponse('league_settings', renewedKey, null, data).catch(() => {})

      const season = extractSeasonFromResponse(data, renewedKey)
      if (season) {
        seasonMap.set(renewedKey, season)
        current = season
      } else break
    } catch {
      break
    }
  }

  const seasons = [...seasonMap.values()].sort((a, b) => a.year - b.year)

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
async function fetchTransactions(leagueKey, year, accessToken, onTokenRefresh) {
  try {
    const data = await yahooFetch(`/league/${leagueKey}/transactions`, accessToken, onTokenRefresh)
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
async function fetchAllMatchups(leagueKey, year, accessToken, onTokenRefresh) {
  const allMatchups = {}

  for (let week = 1; week <= 18; week++) {
    try {
      const data = await yahooFetch(`/league/${leagueKey}/scoreboard;week=${week}`, accessToken, onTokenRefresh)

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
          // Yahoo wraps each team as {"team": [[...meta field objects...], {team_points}, ...]}
          // Extract team_id and team_points from inside the .team array
          const extractMatchupTeam = (wrapper) => {
            const arr = wrapper?.team
            if (!Array.isArray(arr)) return { teamId: null, points: 0 }
            // Merge meta fields from arr[0] (array of objects)
            const meta = {}
            const fields = Array.isArray(arr[0]) ? arr[0] : [arr[0]]
            for (const f of fields) {
              if (f && typeof f === 'object') Object.assign(meta, f)
            }
            // Find team_points in remaining elements
            let points = 0
            for (let j = 1; j < arr.length; j++) {
              if (arr[j]?.team_points?.total) {
                points = parseFloat(arr[j].team_points.total)
                break
              }
            }
            return { teamId: meta.team_id, points }
          }

          const t0 = extractMatchupTeam(teamArr[0])
          const t1 = extractMatchupTeam(teamArr[1])
          weekGames.push({
            homeTeamId: t0.teamId,
            homePoints: t0.points,
            awayTeamId: t1.teamId,
            awayPoints: t1.points,
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
async function importSeason(leagueKey, year, accessToken, onTokenRefresh) {
  // Fetch all data in parallel
  const [standingsData, matchupsData, draftData, transactionsData] = await Promise.all([
    yahooFetch(`/league/${leagueKey}/standings`, accessToken, onTokenRefresh).catch(() => null),
    fetchAllMatchups(leagueKey, year, accessToken, onTokenRefresh),
    yahooFetch(`/league/${leagueKey}/draftresults`, accessToken, onTokenRefresh).catch(() => null),
    fetchTransactions(leagueKey, year, accessToken, onTokenRefresh),
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
    // Yahoo wraps each team as {"team": [[...meta field objects...], {team_points}, {team_standings}]}
    // We need to unwrap entry.team, then merge the meta field objects from team[0]
    const teamArr = entry?.team
    if (!teamArr || !Array.isArray(teamArr)) continue

    // First element is array of metadata field objects — merge into one object
    const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
    const teamMeta = {}
    for (const f of metaFields) {
      if (f && typeof f === 'object') Object.assign(teamMeta, f)
    }

    if (!teamMeta.team_key) continue

    // Find team_standings in remaining elements (usually teamArr[2])
    let standings = null
    for (let j = 1; j < teamArr.length; j++) {
      if (teamArr[j]?.team_standings) {
        standings = teamArr[j].team_standings
        break
      }
    }

    const outcomes = standings?.outcome_totals
    const managers = teamMeta.managers || []
    const manager = Array.isArray(managers) ? managers[0]?.manager : managers.manager

    rosterData.push({
      teamId: teamMeta.team_id,
      teamKey: teamMeta.team_key,
      teamName: teamMeta.name,
      ownerName: (manager?.nickname && manager.nickname !== '--hidden--') ? manager.nickname : (teamMeta.name || manager?.guid || `Team ${teamMeta.team_id}`),
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
    // Enrich picks with ownerName from roster data
    const teamKeyToOwner = {}
    for (const r of rosterData) {
      if (r.teamKey) teamKeyToOwner[r.teamKey] = r.ownerName || r.teamName
    }
    for (const pick of parsedDraft.picks) {
      if (pick.teamKey && teamKeyToOwner[pick.teamKey]) {
        pick.ownerName = teamKeyToOwner[pick.teamKey]
      }
    }
    // Resolve player names via Sleeper's public API (Yahoo only returns player keys)
    try {
      const nameMap = await getYahooPlayerNameMap()
      for (const pick of parsedDraft.picks) {
        if (!pick.playerName && pick.playerId) {
          const yahooId = extractYahooPlayerId(pick.playerId)
          if (yahooId && nameMap[yahooId]) {
            pick.playerName = nameMap[yahooId]
          }
        }
      }
    } catch (err) {
      console.error('[YahooImport] Player name resolution failed (non-fatal):', err.message)
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
    const gameIdx = games.findIndex(g =>
      String(g.homeTeamId) === String(teamId) || String(g.awayTeamId) === String(teamId)
    )
    if (gameIdx >= 0) {
      const game = games[gameIdx]
      const isHome = String(game.homeTeamId) === String(teamId)
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
        matchupId: gameIdx,
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
async function runFullImport(yahooLeagueId, userId, db, accessToken, targetLeagueId, selectedSeasons, onTokenRefresh) {
  const importRecord = await db.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'yahoo',
      sourceLeagueId: String(yahooLeagueId),
      status: 'SCANNING',
    },
  })

  try {
    // Track refreshed token so subsequent calls use it
    let currentToken = accessToken
    const wrappedImportRefresh = onTokenRefresh ? async () => {
      const newToken = await onTokenRefresh()
      currentToken = newToken
      return newToken
    } : undefined

    const discovery = await discoverLeague(yahooLeagueId, currentToken, wrappedImportRefresh)

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
        const seasonData = await importSeason(season.leagueKey, season.year, currentToken, wrappedImportRefresh)
        console.log(`[YahooImport] Season ${season.year}: ${seasonData.rosters.length} teams parsed`)

        // Try to identify which team belongs to the importing user
        let matchedTeamKey = null
        if (userDisplayName) {
          const matched = seasonData.rosters.find(r =>
            r.ownerName?.toLowerCase().includes(userDisplayName) ||
            userDisplayName.includes(r.ownerName?.toLowerCase() || '')
          )
          if (matched) matchedTeamKey = matched.teamKey
        }

        let teamsSaved = 0
        for (const roster of seasonData.rosters) {
          try {
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
            teamsSaved++

            // Opinion Timeline Bridge — only for importing user's team
            if (isUsersTeam) {
              generateOpinionEventsForSeason(
                userId, seasonData, roster.teamKey, clutchLeague.name
              ).catch(() => {})
            }
          } catch (teamErr) {
            console.error(`[YahooImport] Failed to save team ${roster.ownerName} in ${season.year}:`, teamErr.message)
          }
        }
        console.log(`[YahooImport] Season ${season.year}: saved ${teamsSaved}/${seasonData.rosters.length} teams`)

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

    // ── Self-Healing Verification ──
    // Check each season's team count vs expected. If a season has far fewer
    // teams than expected, re-import it. This catches partial saves from
    // timeouts or transient errors.
    const repaired = []
    for (const season of seasonsToImport) {
      if (!importedSeasons.includes(season.year)) continue
      const expectedTeams = season.teamCount || 0
      if (expectedTeams < 4) continue // Can't verify tiny leagues

      const actualCount = await db.historicalSeason.count({
        where: { leagueId: clutchLeague.id, seasonYear: season.year },
      })

      if (actualCount > 0 && actualCount < expectedTeams * 0.5) {
        // Less than half the expected teams — something went wrong, re-import
        console.log(`[YahooImport] REPAIR: ${season.year} has ${actualCount}/${expectedTeams} teams — re-importing`)
        try {
          // Delete the partial data
          await db.historicalSeason.deleteMany({
            where: { leagueId: clutchLeague.id, seasonYear: season.year },
          })

          // Re-import the season
          const seasonData = await importSeason(season.leagueKey, season.year, currentToken, wrappedImportRefresh)
          console.log(`[YahooImport] REPAIR: ${season.year} re-fetched ${seasonData.rosters.length} teams`)

          let repairedCount = 0
          for (const roster of seasonData.rosters) {
            try {
              const standing = seasonData.rosters.indexOf(roster) + 1
              const playoffResult = seasonData.playoffResults[roster.teamId] || null
              await db.historicalSeason.create({
                data: {
                  leagueId: clutchLeague.id,
                  importId: importRecord.id,
                  seasonYear: season.year,
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
                  transactions: seasonData.transactions,
                  settings: season.settings || {},
                },
              })
              repairedCount++
            } catch (e) {
              console.error(`[YahooImport] REPAIR: Failed team ${roster.ownerName}:`, e.message)
            }
          }
          console.log(`[YahooImport] REPAIR: ${season.year} saved ${repairedCount} teams`)
          if (repairedCount > actualCount) repaired.push(season.year)
        } catch (repairErr) {
          console.error(`[YahooImport] REPAIR failed for ${season.year}:`, repairErr.message)
        }
      }
    }
    if (repaired.length > 0) {
      console.log(`[YahooImport] Self-healed ${repaired.length} season(s): ${repaired.join(', ')}`)
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
      repairedSeasons: repaired.length > 0 ? repaired : undefined,
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
