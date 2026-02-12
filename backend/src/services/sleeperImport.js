/**
 * Sleeper Import Service (Enhanced)
 *
 * Imports league history from Sleeper's public API.
 * No auth needed — just a league ID.
 *
 * Enhancements:
 * - Raw API response storage in RawProviderData
 * - Full transaction import (all weeks, not just week 1)
 * - ppts (potential points) capture from rosters
 * - traded_picks capture
 * - Opinion timeline bridge (PlayerOpinionEvent for draft picks + transactions)
 *
 * Sleeper API docs: https://docs.sleeper.com/
 * Base URL: https://api.sleeper.app/v1
 */

const { PrismaClient } = require('@prisma/client')
const opinionTimeline = require('./opinionTimelineService')

const prisma = new PrismaClient()
const BASE = 'https://api.sleeper.app/v1'

// ─── Sleeper API Fetch ─────────────────────────────────────────────────────

async function sleeperFetch(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status}: ${path}`)
  }
  return res.json()
}

// ─── Raw Data Preservation ─────────────────────────────────────────────────

async function storeRawResponse(dataType, leagueId, seasonYear, payload) {
  try {
    await prisma.rawProviderData.create({
      data: {
        provider: 'sleeper',
        dataType,
        eventRef: leagueId,
        payload,
        recordCount: Array.isArray(payload) ? payload.length : null,
        processedAt: null,
      },
    })
  } catch (err) {
    console.error(`[SleeperImport] Failed to store raw ${dataType}:`, err.message)
  }
}

// ─── Discovery ─────────────────────────────────────────────────────────────

async function discoverLeague(sleeperLeagueId) {
  const league = await sleeperFetch(`/league/${sleeperLeagueId}`)
  if (!league) throw new Error('League not found on Sleeper')

  // Store raw league data
  storeRawResponse('league_settings', sleeperLeagueId, league.season, league).catch(() => {})

  // Walk backwards through previous_league_id to find all seasons
  const seasons = []
  let currentId = sleeperLeagueId
  let maxIterations = 20

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

  seasons.sort((a, b) => parseInt(a.season) - parseInt(b.season))

  return {
    currentLeague: league,
    sport: league.sport,
    name: league.name,
    seasons,
    totalSeasons: seasons.length,
  }
}

// ─── Fetch All Transactions ────────────────────────────────────────────────

/**
 * Fetch transactions for all weeks of a season.
 * Sleeper transactions API uses week (round) parameter.
 */
async function fetchAllTransactions(sleeperLeagueId, seasonYear) {
  const allTransactions = []

  for (let week = 1; week <= 18; week++) {
    try {
      const weekTxns = await sleeperFetch(`/league/${sleeperLeagueId}/transactions/${week}`)
      if (!weekTxns || weekTxns.length === 0) continue

      // Store raw transactions for first week only (sample)
      if (week === 1) {
        storeRawResponse('transactions_sample', sleeperLeagueId, seasonYear, weekTxns).catch(() => {})
      }

      for (const txn of weekTxns) {
        if (txn.status !== 'complete') continue

        allTransactions.push({
          transactionId: txn.transaction_id,
          type: txn.type, // trade, waiver, free_agent, commissioner
          status: txn.status,
          week,
          timestamp: txn.status_updated ? new Date(txn.status_updated) : null,
          rosterIds: txn.roster_ids || [],
          adds: txn.adds || {}, // { player_id: roster_id }
          drops: txn.drops || {}, // { player_id: roster_id }
          settings: txn.settings || {}, // { waiver_bid }
          draftPicks: txn.draft_picks || [], // for trades involving picks
          creatorRosterId: txn.creator,
        })
      }
    } catch {
      continue
    }
  }

  return allTransactions
}

// ─── Fetch Traded Picks ────────────────────────────────────────────────────

async function fetchTradedPicks(sleeperLeagueId, seasonYear) {
  try {
    const picks = await sleeperFetch(`/league/${sleeperLeagueId}/traded_picks`)
    if (picks && picks.length > 0) {
      storeRawResponse('traded_picks', sleeperLeagueId, seasonYear, picks).catch(() => {})
    }
    return picks || []
  } catch {
    return []
  }
}

// ─── Fetch All Matchups ────────────────────────────────────────────────────

async function fetchWinnersBracket(sleeperLeagueId, seasonYear) {
  try {
    const bracket = await sleeperFetch(`/league/${sleeperLeagueId}/winners_bracket`)
    if (bracket && bracket.length > 0) {
      storeRawResponse('winners_bracket', sleeperLeagueId, parseInt(seasonYear), bracket).catch(() => {})
    }
    return bracket || []
  } catch {
    return []
  }
}

async function fetchAllMatchups(sleeperLeagueId, seasonYear) {
  const allMatchups = {}
  for (let week = 1; week <= 18; week++) {
    try {
      const weekMatchups = await sleeperFetch(`/league/${sleeperLeagueId}/matchups/${week}`)
      if (!weekMatchups || weekMatchups.length === 0) break

      // Store raw matchup data for first week (sample)
      if (week === 1) {
        storeRawResponse('matchups_sample', sleeperLeagueId, seasonYear, weekMatchups).catch(() => {})
      }

      allMatchups[week] = weekMatchups
    } catch {
      break
    }
  }
  return allMatchups
}

// ─── Import a Single Season ────────────────────────────────────────────────

async function importSeason(sleeperLeagueId, seasonYear) {
  // Fetch all data in parallel
  const [rosters, users, matchups, drafts, transactions, tradedPicks, winnersBracket] = await Promise.all([
    sleeperFetch(`/league/${sleeperLeagueId}/rosters`).catch(() => []),
    sleeperFetch(`/league/${sleeperLeagueId}/users`).catch(() => []),
    fetchAllMatchups(sleeperLeagueId, seasonYear),
    sleeperFetch(`/league/${sleeperLeagueId}/drafts`).catch(() => []),
    fetchAllTransactions(sleeperLeagueId, seasonYear),
    fetchTradedPicks(sleeperLeagueId, seasonYear),
    fetchWinnersBracket(sleeperLeagueId, seasonYear),
  ])

  // Store raw rosters + users + drafts
  if (rosters.length > 0) storeRawResponse('rosters', sleeperLeagueId, parseInt(seasonYear), rosters).catch(() => {})
  if (users.length > 0) storeRawResponse('users', sleeperLeagueId, parseInt(seasonYear), users).catch(() => {})
  if (drafts.length > 0) storeRawResponse('drafts', sleeperLeagueId, parseInt(seasonYear), drafts).catch(() => {})

  // Build user map (roster_id -> user info)
  const userMap = {}
  for (const u of users) {
    userMap[u.user_id] = {
      userId: u.user_id,
      displayName: u.display_name,
      avatar: u.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null,
    }
  }

  // Build roster-to-owner map
  const rosterOwnerMap = {}
  for (const r of rosters) {
    rosterOwnerMap[r.roster_id] = r.owner_id
  }

  // Build roster data with standings — now includes ppts (potential points)
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
      // Potential points — Sleeper pre-computes optimal lineup points
      potentialPoints: r.settings?.ppts ? r.settings.ppts + (r.settings.ppts_decimal || 0) / 100 : null,
    }
  })

  rosterData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

  // Determine playoff results from the actual bracket
  const playoffResults = determinePlayoffResults(winnersBracket, rosterData)

  // Import draft data
  let draftData = null
  if (drafts.length > 0) {
    const draftId = drafts[0].draft_id
    const picks = await sleeperFetch(`/draft/${draftId}/picks`).catch(() => [])
    if (picks.length > 0) {
      storeRawResponse('draft_picks', sleeperLeagueId, parseInt(seasonYear), picks).catch(() => {})
    }
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
        amount: p.metadata?.amount ? parseInt(p.metadata.amount) : null,
        isKeeper: p.is_keeper || false,
        metadata: p.metadata || null,
      })),
    }
  }

  return {
    seasonYear: parseInt(seasonYear),
    rosters: rosterData,
    matchups,
    draftData,
    transactions,
    tradedPicks,
    playoffResults,
    userMap,
    rosterOwnerMap,
  }
}

// ─── Determine Playoff Results ─────────────────────────────────────────────

/**
 * Determine playoff results from Sleeper's winners_bracket endpoint.
 *
 * The bracket is an array of matchup objects:
 *   { r: round, m: matchup#, t1: rosterId, t2: rosterId, w: winnerId, l: loserId, p?: placement }
 *
 * The `p` field indicates which placement a matchup decides:
 *   p=1 → Championship game (winner = champion, loser = runner-up)
 *   p=3 → 3rd place game
 *   p=5 → 5th place game
 */
function determinePlayoffResults(bracket, rosters) {
  const results = {}

  if (!bracket || bracket.length === 0) {
    return results
  }

  // Championship game: the matchup with p=1 (decides 1st place)
  // Fallback: if no `p` field exists, use highest round + lowest matchup number
  const maxRound = Math.max(...bracket.map(m => m.r))
  const championshipMatch = bracket.find(m => m.p === 1)
    || bracket.filter(m => m.r === maxRound).sort((a, b) => a.m - b.m)[0]
  if (championshipMatch) {
    if (championshipMatch.w) results[championshipMatch.w] = 'champion'
    if (championshipMatch.l) results[championshipMatch.l] = 'runner_up'
  }

  // 3rd place game (if exists): the matchup with p=3
  const thirdPlaceMatch = bracket.find(m => m.p === 3)
  if (thirdPlaceMatch) {
    if (thirdPlaceMatch.w && !results[thirdPlaceMatch.w]) {
      results[thirdPlaceMatch.w] = 'third_place'
    }
  }

  // Collect all roster IDs that appear anywhere in the winners bracket
  const bracketRosterIds = new Set()
  for (const match of bracket) {
    if (typeof match.t1 === 'number') bracketRosterIds.add(match.t1)
    if (typeof match.t2 === 'number') bracketRosterIds.add(match.t2)
    if (typeof match.w === 'number') bracketRosterIds.add(match.w)
    if (typeof match.l === 'number') bracketRosterIds.add(match.l)
  }

  // Anyone in the bracket not yet assigned = made playoffs but didn't win/place
  for (const rosterId of bracketRosterIds) {
    if (!results[rosterId]) {
      results[rosterId] = 'playoffs'
    }
  }

  // Everyone else missed playoffs
  for (const r of rosters) {
    if (!results[r.rosterId]) {
      results[r.rosterId] = 'missed'
    }
  }

  return results
}

// ─── Build Weekly Scores ───────────────────────────────────────────────────

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

// ─── Opinion Timeline Bridge ───────────────────────────────────────────────

/**
 * Generate PlayerOpinionEvent records for draft picks and transactions.
 * Fire-and-forget — must never block import processing.
 */
async function generateOpinionEventsForSeason(userId, seasonData, rosterId, leagueName) {
  if (!userId || !rosterId) return

  const year = seasonData.seasonYear

  // ── Draft Pick Events ──
  if (seasonData.draftData?.picks) {
    const teamPicks = seasonData.draftData.picks.filter(p => p.rosterId === rosterId)
    const draftDate = new Date(`${year}-09-01T12:00:00Z`)

    for (const pick of teamPicks) {
      if (!pick.playerId) continue
      opinionTimeline.recordEvent(
        userId, pick.playerId, 'NFL', 'DRAFT_PICK',
        {
          round: pick.round,
          pick: pick.pick,
          cost: pick.amount,
          isKeeper: pick.isKeeper || false,
          playerName: pick.playerName,
          position: pick.position,
          dataSource: 'sleeper_import',
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

      // Players added to this roster
      for (const [playerId, destRosterId] of Object.entries(txn.adds)) {
        if (String(destRosterId) !== String(rosterId)) continue

        const eventType = txn.type === 'trade' ? 'TRADE_ACQUIRE' : 'WAIVER_ADD'
        opinionTimeline.recordEvent(
          userId, playerId, 'NFL', eventType,
          {
            transactionType: txn.type,
            waiverBid: txn.settings?.waiver_bid || null,
            week: txn.week,
            dataSource: 'sleeper_import',
            season: year,
          },
          null, 'HistoricalTransaction', txnDate
        ).catch(() => {})
      }

      // Players dropped from this roster
      for (const [playerId, sourceRosterId] of Object.entries(txn.drops)) {
        if (String(sourceRosterId) !== String(rosterId)) continue

        const eventType = txn.type === 'trade' ? 'TRADE_AWAY' : 'WAIVER_DROP'
        opinionTimeline.recordEvent(
          userId, playerId, 'NFL', eventType,
          {
            transactionType: txn.type,
            week: txn.week,
            dataSource: 'sleeper_import',
            season: year,
          },
          null, 'HistoricalTransaction', txnDate
        ).catch(() => {})
      }
    }
  }
}

// ─── Full Import Pipeline ──────────────────────────────────────────────────

async function runFullImport(sleeperLeagueId, userId, db, targetLeagueId, selectedSeasons) {
  const importRecord = await db.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'sleeper',
      sourceLeagueId: sleeperLeagueId,
      status: 'SCANNING',
    },
  })

  try {
    const discovery = await discoverLeague(sleeperLeagueId)

    await db.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 10,
      },
    })

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
        const seasonData = await importSeason(season.sleeperLeagueId, season.season)

        // Try to identify which roster belongs to the importing user
        let matchedRosterId = null
        if (userDisplayName) {
          const matched = seasonData.rosters.find(r =>
            r.ownerName?.toLowerCase().includes(userDisplayName) ||
            userDisplayName.includes(r.ownerName?.toLowerCase() || '')
          )
          if (matched) matchedRosterId = matched.rosterId
        }

        for (const roster of seasonData.rosters) {
          const standing = seasonData.rosters.indexOf(roster) + 1
          const playoffResult = seasonData.playoffResults[roster.rosterId] || null
          const isUsersTeam = roster.rosterId === matchedRosterId
          const ownerUserId = isUsersTeam ? userId : null

          await db.historicalSeason.upsert({
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
                players: roster.players,
                starters: roster.starters,
                potentialPoints: roster.potentialPoints,
              },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.rosterId),
              transactions: seasonData.transactions,
              settings: season.scoringSettings
                ? { scoring: season.scoringSettings, positions: season.rosterPositions, tradedPicks: seasonData.tradedPicks }
                : null,
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
                players: roster.players,
                starters: roster.starters,
                potentialPoints: roster.potentialPoints,
              },
              weeklyScores: buildWeeklyScores(seasonData.matchups, roster.rosterId),
              transactions: seasonData.transactions,
              settings: season.scoringSettings
                ? { scoring: season.scoringSettings, positions: season.rosterPositions, tradedPicks: seasonData.tradedPicks }
                : null,
            },
          })

          // Opinion Timeline Bridge — only for importing user's team
          if (isUsersTeam) {
            generateOpinionEventsForSeason(
              userId, seasonData, roster.rosterId, clutchLeague.name
            ).catch(() => {})
          }
        }

        importedSeasons.push(seasonData.seasonYear)
      } catch (err) {
        console.error(`[SleeperImport] Failed to import season ${season.season}:`, err.message)
        const current = await db.leagueImport.findUnique({
          where: { id: importRecord.id },
          select: { errorLog: true },
        })
        const errors = Array.isArray(current?.errorLog) ? current.errorLog : []
        errors.push({ message: `Season ${season.season}: ${err.message}`, timestamp: new Date().toISOString() })
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
  sleeperFetch,
}
