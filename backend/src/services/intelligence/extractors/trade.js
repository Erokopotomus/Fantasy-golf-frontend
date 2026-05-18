const { registerExtractor } = require('../extractor')
const {
  getTransactionsForUser,
  getSeasonsForUser,
  getFinalRosterPlayerIds,
  detectPlatform,
  extractUserRosterId,
} = require('../lib/transactionParser')
const { mean, stdDev } = require('../lib/stats')

/**
 * trade_frequency
 *
 * League-relative measure of how actively the user participates in the trade
 * market. The same raw count (e.g. "2 trades per season") means very different
 * things in a sleepy league (avg 0.5) vs. a churn-heavy league (avg 3), so we
 * score each season as a z-score against that season's per-team distribution.
 *
 * Per season:
 *   userTrades       = count of trade-type txns with status='complete' and
 *                      isUserInvolved=true
 *   leagueTrades     = count of all trade-type txns with status='complete'
 *   leagueTeamCount  = distinct rosterIds seen anywhere in the txn stream
 *                      (with a draftData.picks fallback when txns lack roster
 *                      coverage — Yahoo trades drop player arrays, so we
 *                      cross-check with picks)
 *   perTeam[]        = per-roster trade counts → cohort series for stddev
 *   userZ            = (userTrades - mean(perTeam)) / stdDev(perTeam)
 *
 * Aggregated across seasons:
 *   avgTradeZScore   = mean of per-season userZ values
 *   consistencyPct   = 1 / (1 + stdDev(per-season userZ values))  — stable
 *                      relative aggression → high consistency
 *   effectSize       = |avgTradeZScore| / 1.0  — 1σ from league mean is HIGH
 *
 * Returns null if no season had attributable per-user trade data (e.g. a
 * Yahoo-only user with our current importer that loses trade attribution).
 */
async function tradeFrequency(userId, db) {
  const seasons = await getTransactionsForUser(userId, db)
  if (seasons.length === 0) return null

  const perSeason = []
  const sourceImportIds = new Set()
  const coverageNotes = new Set()

  for (const season of seasons) {
    const complete = season.transactions.filter((t) => t.status === 'complete')
    const trades = complete.filter((t) => t.type === 'trade')
    const leagueTrades = trades.length
    if (leagueTrades === 0) continue // skip dead-trade seasons

    // Per-team trade counts from the trade subset. For each trade, every
    // rosterId in teamsInvolved gets +1 count.
    const perTeamMap = new Map()
    for (const t of trades) {
      for (const team of t.teamsInvolved) {
        if (team.rosterId == null) continue
        perTeamMap.set(team.rosterId, (perTeamMap.get(team.rosterId) || 0) + 1)
      }
    }

    // Yahoo fallback: trade rows have empty teamsInvolved → derive team count
    // from draftData picks (every team is represented in the draft).
    let leagueTeamCount = perTeamMap.size
    if (leagueTeamCount === 0) {
      // Use the union of rosterIds across ALL txns this season as a more
      // generous estimate of team count.
      const allRosters = new Set()
      for (const t of complete) {
        for (const team of t.teamsInvolved) {
          if (team.rosterId != null) allRosters.add(team.rosterId)
        }
      }
      leagueTeamCount = allRosters.size
    }

    // User trades from the parser flag.
    const userTrades = trades.filter((t) => t.isUserInvolved).length

    // Skip seasons where we have no per-team distribution to z-score against.
    // This is the Yahoo-trades fallback: trades existed but teamsInvolved was
    // empty for every row → perTeamMap is empty → no cohort → can't z-score.
    if (perTeamMap.size < 2) {
      coverageNotes.add(
        `${season.platform}::${season.seasonYear}: trade rows lack team attribution; season skipped from z-score`
      )
      continue
    }

    // Ensure user's count is in the cohort series (zero if user had no trades
    // but other teams did — a real signal, not absence).
    const perTeamCounts = [...perTeamMap.values()]
    // If the user's rosterId never appeared in perTeamMap and userTrades === 0,
    // they had genuinely 0 trades that season → include a 0 in the cohort to
    // represent them.
    if (
      season.userRosterId != null &&
      !perTeamMap.has(season.userRosterId)
    ) {
      perTeamCounts.push(0)
    }

    const seasonMean = mean(perTeamCounts)
    const seasonStd = stdDev(perTeamCounts)
    if (seasonStd === 0 || !Number.isFinite(seasonStd)) {
      // Everyone tied (no variance) → no per-team z-score is meaningful.
      coverageNotes.add(
        `${season.platform}::${season.seasonYear}: per-team trade variance is zero; season skipped`
      )
      continue
    }

    const userZ = (userTrades - seasonMean) / seasonStd
    if (!Number.isFinite(userZ)) continue

    perSeason.push({
      leagueId: season.leagueId,
      seasonYear: season.seasonYear,
      userTrades,
      leagueTrades,
      leagueTeamCount,
      leagueAvgTrades: Math.round((leagueTrades / leagueTeamCount) * 100) / 100,
      userZ: Math.round(userZ * 100) / 100,
      platform: season.platform,
    })
    if (season.importId) sourceImportIds.add(season.importId)
    if (season.coverageNote) coverageNotes.add(season.coverageNote)
  }

  if (perSeason.length === 0) return null

  const userZs = perSeason.map((s) => s.userZ)
  const userTradesArr = perSeason.map((s) => s.userTrades)
  const leagueAvgsArr = perSeason.map((s) => s.leagueAvgTrades)
  const avgTradeZScore = mean(userZs)
  const userAvgTrades = mean(userTradesArr)
  const leagueAvgTrades = mean(leagueAvgsArr)
  // Stability of relative trade aggression across seasons. Single-season
  // samples produce stdDev([x]) = 0 → 1/(1+0) = 1.0, falsely signalling
  // "perfectly consistent." Use a 0.5 neutral sentinel when N < 2 so the
  // confidence helper doesn't over-credit single-season data. Schema's
  // consistencyPct is Float NOT NULL — null sentinel isn't an option.
  const consistencyPct =
    perSeason.length < 2 ? 0.5 : 1 / (1 + stdDev(userZs))
  // 1σ from league mean is HIGH signal — normalize by 1.0 so |z|=1 → 1.0.
  const effectSize = Math.abs(avgTradeZScore) / 1.0

  return {
    value: {
      avgTradeZScore: Math.round(avgTradeZScore * 1000) / 1000,
      userAvgTrades: Math.round(userAvgTrades * 100) / 100,
      leagueAvgTrades: Math.round(leagueAvgTrades * 100) / 100,
      seasonsContributing: perSeason.length,
    },
    sampleSize: perSeason.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      coverageNotes: [...coverageNotes],
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * roster_endowment_ratio
 *
 * Of the players on the user's end-of-season roster, what fraction were ones
 * they originally drafted? High ratio = sticky / endowment bias (slow to cut
 * loose what they picked). Low ratio = active churn (frequent waiver/trade
 * acquisitions replacing drafted players).
 *
 * Per season:
 *   draftedIds      = playerIds from draftData.picks where ownerName matches
 *   finalRosterIds  = playerIds from rosterData.players  (Sleeper-only today)
 *   retained        = |draftedIds ∩ finalRosterIds|
 *   ratio           = retained / |finalRosterIds|
 *
 * Aggregated:
 *   avgEndowmentRatio = mean of per-season ratios
 *   consistencyPct    = 1 / (1 + stdDev(per-season ratios))
 *   effectSize        = |avgEndowmentRatio - 0.5| / 0.25
 *     Baseline of 0.5 = balanced manager who keeps half their picks. The
 *     0.25 normalizing band means a ratio of 0.75 (sticky) or 0.25 (churn-
 *     heavy) yields effectSize ≈ 1.0 (HIGH).
 *
 * Falls back gracefully: when finalRoster isn't captured by the importer
 * (Yahoo, ESPN, Fantrax, MFL all leave rosterData = {}), we return null.
 * Reconstruct-from-transactions replay is theoretically possible but the
 * Yahoo trade attribution gap (see transactionParser header) would corrupt
 * any replay, so we explicitly opt out for now.
 */
async function rosterEndowmentRatio(userId, db) {
  const seasons = await getSeasonsForUser(userId, db)
  if (seasons.length === 0) return null

  const perSeason = []
  const sourceImportIds = new Set()
  const platformsSeen = new Set()
  const skipReasons = new Set()

  for (const season of seasons) {
    const platform = detectPlatform(season)
    platformsSeen.add(platform)

    const finalRoster = getFinalRosterPlayerIds(season)
    if (!finalRoster) {
      skipReasons.add(
        `${platform}: rosterData lacks end-of-season player list`
      )
      continue
    }

    const picks = season?.draftData?.picks
    if (!Array.isArray(picks) || picks.length === 0) {
      skipReasons.add(`${platform}::${season.seasonYear}: no draftData picks`)
      continue
    }

    // User's drafted player IDs (string-comparable).
    const drafted = []
    for (const p of picks) {
      if (p.ownerName !== season.ownerName) continue
      if (!p.playerId) continue
      drafted.push(String(p.playerId))
    }
    if (drafted.length === 0) {
      skipReasons.add(
        `${season.seasonYear}: zero drafted picks owned by user — owner name mismatch?`
      )
      continue
    }

    const draftedSet = new Set(drafted)
    const finalSet = new Set(finalRoster.map((p) => String(p)))
    let retained = 0
    for (const pid of finalSet) {
      if (draftedSet.has(pid)) retained += 1
    }
    if (finalSet.size === 0) continue

    const ratio = retained / finalSet.size
    if (!Number.isFinite(ratio)) continue

    perSeason.push({
      leagueId: season.leagueId,
      seasonYear: season.seasonYear,
      platform,
      draftedCount: drafted.length,
      retainedCount: retained,
      finalRosterSize: finalSet.size,
      ratio: Math.round(ratio * 1000) / 1000,
    })
    if (season.importId) sourceImportIds.add(season.importId)
  }

  if (perSeason.length === 0) {
    // No-op path — return null so the orchestrator records "skipped".
    return null
  }

  const ratios = perSeason.map((s) => s.ratio)
  const avgEndowmentRatio = mean(ratios)
  // Single-season samples produce stdDev([x]) = 0 → false 1.0 consistency.
  // Neutral 0.5 sentinel for N < 2 (schema can't store null). See trade
  // frequency comment above for full rationale.
  const consistencyPct =
    perSeason.length < 2 ? 0.5 : 1 / (1 + stdDev(ratios))
  // Baseline = 0.5; 0.25 normalizing band → ratio of 0.75 or 0.25 = effect 1.0.
  const effectSize = Math.abs(avgEndowmentRatio - 0.5) / 0.25

  return {
    value: {
      avgEndowmentRatio: Math.round(avgEndowmentRatio * 1000) / 1000,
      seasonsContributing: perSeason.length,
    },
    sampleSize: perSeason.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      reconstructionMethod: 'finalRoster',
      platformsSeen: [...platformsSeen],
      skipReasons: [...skipReasons],
    },
    sourceImportIds: [...sourceImportIds],
  }
}

registerExtractor('trade_frequency', tradeFrequency)
registerExtractor('roster_endowment_ratio', rosterEndowmentRatio)

module.exports = {}
