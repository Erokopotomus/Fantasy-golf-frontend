const { registerExtractor } = require('../extractor')
const { getTransactionsForUser } = require('../lib/transactionParser')
const { resolvePlayer } = require('../lib/draftPickParser')
const { mean, stdDev } = require('../lib/stats')

/**
 * naked_drop_frequency
 *
 * League-relative measure of how often the user drops players WITHOUT pairing
 * the drop with an add — i.e., a "naked drop". An add+drop pair is normal
 * roster maintenance; a naked drop signals roster cleanup, capitulation on a
 * player, or making space without a target. Same z-score-per-season,
 * average-across-seasons pattern as `trade_frequency`.
 *
 * Naked-drop definition (atomic per parsed transaction):
 *   adds.length === 0 && drops.length > 0
 *
 * Caveat — paired-but-separate transactions: some platforms model an add+drop
 * pair as a SINGLE transaction with both arrays populated (Sleeper); others
 * may fire a drop transaction and a separate add transaction milliseconds
 * apart. We treat each transactionParser-normalized row as atomic, so a
 * platform that splits the pair into two rows will inflate naked-drop counts.
 * Flagged in `coverageNotes` rather than papered over with a fuzzy de-pair
 * window — MI-16 can revisit if/when other platforms get transaction import.
 *
 * Per season (league-cohort, Option-B-style):
 *   leagueWaivers   = all complete transactions where drops>0 && adds==0
 *                     across EVERY team (not just user) — this is the cohort
 *                     pool we z-score the user against.
 *   perTeam[]       = per-roster naked-drop counts; each drop row contributes
 *                     +1 to every rosterId that owns one of the dropped
 *                     players (Sleeper rows expose drops as { playerId →
 *                     rosterId }; Yahoo similar via sourceTeamKey).
 *   leagueTeamCount = distinct rosters with naked-drop activity (size of
 *                     perTeamMap)
 *   userZ           = (userNakedDrops - mean(perTeam)) / stdDev(perTeam)
 *
 * A season is z-score viable when perTeamMap has ≥2 distinct teams AND
 * stdDev > 0. Tied-cohort seasons (everyone made the same number of naked
 * drops) get noted and skipped — z-score is undefined there.
 *
 * Aggregated:
 *   avgNakedDropZScore = mean of per-season userZ
 *   consistencyPct     = 1 / (1 + stdDev(per-season userZ)) gated to N≥2
 *                        (0.5 sentinel otherwise — same pattern as MI-7/8)
 *   effectSize         = |avgNakedDropZScore| / 1.0 — 1σ = HIGH (matches
 *                        trade_frequency pattern)
 *
 * Returns null when no season was viable (zero seasons had any naked drops
 * with ≥2 teams contributing) — honest null, not faked math.
 */
async function nakedDropFrequency(userId, db) {
  const seasons = await getTransactionsForUser(userId, db)
  if (seasons.length === 0) return null

  const perSeason = []
  const sourceImportIds = new Set()
  const coverageNotes = new Set()

  for (const season of seasons) {
    const complete = season.transactions.filter((t) => t.status === 'complete')
    // Atomic naked-drop classification: drops but no adds on the same parsed
    // row. See module header for paired-but-separate caveat.
    const nakedDrops = complete.filter(
      (t) => t.drops.length > 0 && t.adds.length === 0
    )
    if (nakedDrops.length === 0) continue

    // Per-team tally — each dropped player contributes +1 to the rosterId
    // that owned them. A single transaction dropping N players counts N
    // times against that team's naked-drop count, which is what we want
    // (each drop is a separate decision).
    const perTeamMap = new Map()
    for (const t of nakedDrops) {
      for (const d of t.drops) {
        if (d.rosterId == null) continue
        perTeamMap.set(d.rosterId, (perTeamMap.get(d.rosterId) || 0) + 1)
      }
    }

    // User's naked-drop count: rows where any dropped player's rosterId
    // matches the user's. Falls back to the parser's isUserInvolved flag
    // when rosterId isn't on the drop record (rare).
    let userNakedDrops = 0
    for (const t of nakedDrops) {
      const userOnDrop =
        season.userRosterId != null &&
        t.drops.some((d) => d.rosterId === season.userRosterId)
      if (userOnDrop) {
        userNakedDrops += t.drops.filter(
          (d) => d.rosterId === season.userRosterId
        ).length
      } else if (t.isUserInvolved && t.drops.length > 0) {
        // Defensive fallback for future parsers (ESPN/Fantrax/MFL when wired
        // up) that might set isUserInvolved=true without per-drop rosterId
        // attribution. With current Sleeper/Yahoo parsers, this path is
        // unreachable — every userOnDrop case is caught by the rosterId
        // check above. If a future parser bundles multiple teams' drops in
        // one row with isUserInvolved=true, this would overcount — guard
        // then.
        userNakedDrops += t.drops.length
      }
    }

    // Z-score viability gate: need ≥2 teams with attribution. Skip otherwise.
    if (perTeamMap.size < 2) {
      coverageNotes.add(
        `${season.platform}::${season.seasonYear}: <2 teams with attributed naked drops; season skipped from z-score`
      )
      continue
    }

    // Cohort series. Include a 0 for the user if their rosterId isn't in the
    // map AND we counted no user drops — they had a genuine zero, not absence.
    const perTeamCounts = [...perTeamMap.values()]
    if (
      season.userRosterId != null &&
      !perTeamMap.has(season.userRosterId) &&
      userNakedDrops === 0
    ) {
      perTeamCounts.push(0)
    }

    const seasonMean = mean(perTeamCounts)
    const seasonStd = stdDev(perTeamCounts)
    if (seasonStd === 0 || !Number.isFinite(seasonStd)) {
      coverageNotes.add(
        `${season.platform}::${season.seasonYear}: per-team naked-drop variance is zero; season skipped`
      )
      continue
    }

    const userZ = (userNakedDrops - seasonMean) / seasonStd
    if (!Number.isFinite(userZ)) continue

    const leagueTeamCount = perTeamMap.size
    const leagueNakedDrops = nakedDrops.reduce(
      (acc, t) => acc + t.drops.length,
      0
    )

    perSeason.push({
      leagueId: season.leagueId,
      seasonYear: season.seasonYear,
      platform: season.platform,
      userNakedDrops,
      leagueNakedDrops,
      leagueTeamCount,
      leagueAvgNakedDrops:
        Math.round((leagueNakedDrops / leagueTeamCount) * 100) / 100,
      userZ: Math.round(userZ * 100) / 100,
    })
    if (season.importId) sourceImportIds.add(season.importId)
    if (season.coverageNote) coverageNotes.add(season.coverageNote)
  }

  if (perSeason.length === 0) return null

  const userZs = perSeason.map((s) => s.userZ)
  const userDropsArr = perSeason.map((s) => s.userNakedDrops)
  const leagueAvgsArr = perSeason.map((s) => s.leagueAvgNakedDrops)
  const avgNakedDropZScore = mean(userZs)
  const userAvgNakedDropsPerSeason = mean(userDropsArr)
  const leagueAvgNakedDropsPerSeason = mean(leagueAvgsArr)
  // N<2 stdDev=0 → false 1.0 consistency; 0.5 sentinel for single-season
  // samples. Same pattern as MI-7/8.
  const consistencyPct =
    perSeason.length < 2 ? 0.5 : 1 / (1 + stdDev(userZs))
  // 1σ from league mean = HIGH (matches trade_frequency normalization).
  const effectSize = Math.abs(avgNakedDropZScore) / 1.0

  if (!Number.isFinite(avgNakedDropZScore) || !Number.isFinite(effectSize))
    return null

  return {
    value: {
      avgNakedDropZScore: Math.round(avgNakedDropZScore * 1000) / 1000,
      userAvgNakedDropsPerSeason:
        Math.round(userAvgNakedDropsPerSeason * 100) / 100,
      leagueAvgNakedDropsPerSeason:
        Math.round(leagueAvgNakedDropsPerSeason * 100) / 100,
      seasonsContributing: perSeason.length,
    },
    sampleSize: perSeason.length,
    consistencyPct,
    effectSize,
    rawEvidence: {
      perSeason,
      coverageNotes: [...coverageNotes],
      definitionNote:
        'naked drop = parsed transaction row with adds.length===0 && drops.length>0. Caveat: platforms that split add+drop pairs into two separate rows (rather than one row with both arrays) will inflate naked-drop counts. Persisted Sleeper/Yahoo data appears to use single-row pairs so impact is expected to be small.',
    },
    sourceImportIds: [...sourceImportIds],
  }
}

/**
 * drop_lag_games
 *
 * Intrinsic sunk-cost lag signal: for each player the user drops, how many
 * games elapsed since that player's last "good week" before they got cut?
 * High lag = the user holds onto fading players too long (endowment / sunk
 * cost). Low lag = decisive, cuts quickly when production stops.
 *
 * "Good week" definition (NFL):
 *   fantasyPtsStd >= max(seasonAvg, 5.0)
 *
 * Where seasonAvg = mean(fantasyPtsStd across the player's NflPlayerGame
 * records that season). The 5.0 fallback floor is a low-bar "decent week"
 * guard for players whose own season average is near zero — without it a
 * 1.0-FP scrub looks like he had constant "good weeks" because his own
 * baseline is 0.5. MI-16 may refine these thresholds.
 *
 * Timestamp → fantasy-week heuristic (v1, deliberately rough):
 *   1. Look up Season.startDate where year===seasonYear AND sport.slug==='nfl'
 *      (or fall back to the Tuesday after Labor Day for that year).
 *   2. dropWeek = floor((dropTimestampMs - seasonStartMs) / (7 days)) + 1
 *
 * The estimate is off by a day or two on edge cases (Thursday-night cuts,
 * Tuesday-morning waiver settlements, etc.) but the LAG measurement only
 * needs to be precise enough to distinguish "cut him the week he tanked"
 * from "held him 4-5 weeks past his last good game" — well within tolerance.
 *
 * DATA PLUMBING REALITY: this extractor requires three signals to align:
 *   (a) the dropped player resolves to a canonical Player record
 *   (b) we have NflPlayerGame records for that player + season
 *   (c) the drop happened during the NFL season window
 *
 * For Eric's data: most NFL drops are pre-2025 Yahoo legacy where canonical
 * player ID resolution is sparse (the 13K Yahoo misses from the PIR audit),
 * and Performance/NflPlayerGame coverage is thin for retired players. Most
 * drops will fall through to "uncomputable" and the extractor will return
 * null. This is the honest behavior — it activates automatically once
 * (i) Yahoo importer fix + (ii) #207 historical player backfill flow more
 * NFL data into the DB.
 *
 * Math:
 *   lagGames        = dropWeek - lastGoodWeek  (skipped if <0 or no good week)
 *   avgLagGames     = mean(perDropLag)
 *   sampleSize      = dropsClassified (count where all three signals aligned)
 *   consistencyPct  = 1 / (1 + stdDev(perDropLag) / 5)  — divide by 5 to
 *                     soften: lag stddev is naturally noisy (week-to-week
 *                     game scoring is bursty), so a stddev of 5 games maps
 *                     to ~0.5 consistency rather than near-zero. Gated to
 *                     dropsClassified >= 2 (0.5 sentinel else).
 *   effectSize      = max(0, (avgLagGames - 2) / 3)
 *     Baseline 2 = normal "let me see if he bounces back next week" patience.
 *     5+ games = meaningful sunk cost. Lag <= 2 produces effectSize 0
 *     (clamped — we don't credit "extra decisive" as a strong signal in v1).
 */
async function dropLagGames(userId, db) {
  const seasons = await getTransactionsForUser(userId, db)
  if (seasons.length === 0) return null

  // Cache Season.startDate per year to avoid N+1 DB hits inside the loop.
  // Yahoo + Sleeper drops span 2010-2024 in Eric's data; a single small map.
  const seasonStartCache = new Map()
  async function getSeasonStartMs(year) {
    if (seasonStartCache.has(year)) return seasonStartCache.get(year)
    let ms = null
    try {
      const s = await db.season.findFirst({
        where: { year, sport: { slug: 'nfl' } },
        select: { startDate: true },
      })
      // Defensive: Prisma normally hydrates DateTime fields to Date instances,
      // but raw SQL paths or future config changes could leave startDate as a
      // string. Handle both shapes; ignore other types.
      if (s?.startDate instanceof Date) ms = s.startDate.getTime()
      else if (s?.startDate) ms = new Date(s.startDate).getTime()
    } catch (_e) {
      // Schema may not have a Season row for this year; fall through.
    }
    if (ms == null) {
      // Fallback: Tuesday after the first Monday of September (≈ NFL season
      // start). Approximate by Sep 5 of the given year — within ~5 days of
      // actual kickoff most years, more than precise enough for week math.
      ms = Date.UTC(year, 8, 5) // month index 8 = September
    }
    seasonStartCache.set(year, ms)
    return ms
  }

  const sample = []
  const perDropLag = []
  let dropsTotal = 0
  let dropsClassified = 0
  let dropsUncomputable = 0
  const sourceImportIds = new Set()
  const uncomputableReasons = new Map() // reason → count, for coverage

  function noteSkip(reason) {
    uncomputableReasons.set(reason, (uncomputableReasons.get(reason) || 0) + 1)
    dropsUncomputable += 1
  }

  for (const season of seasons) {
    const complete = season.transactions.filter((t) => t.status === 'complete')
    // Naked drops only — pairing with an add muddies the "sunk cost" signal
    // (you replaced the player; cutting bait was paired with a target).
    const userNakedDrops = complete.filter(
      (t) =>
        t.drops.length > 0 &&
        t.adds.length === 0 &&
        (t.isUserInvolved ||
          (season.userRosterId != null &&
            t.drops.some((d) => d.rosterId === season.userRosterId)))
    )
    if (userNakedDrops.length === 0) continue
    if (season.importId) sourceImportIds.add(season.importId)

    const seasonStartMs = await getSeasonStartMs(season.seasonYear)

    for (const t of userNakedDrops) {
      // Only count the drops attributable to the user (one row may drop
      // multiple players; for Sleeper the rosterId tag pins them).
      // Defensive fallback for future parsers (ESPN/Fantrax/MFL when wired
      // up) that might set isUserInvolved=true without per-drop rosterId
      // attribution. With current Sleeper/Yahoo parsers, season.userRosterId
      // is always set when the user is involved, so this falls through to
      // the filtered path.
      const userDrops =
        season.userRosterId != null
          ? t.drops.filter((d) => d.rosterId === season.userRosterId)
          : t.drops // fall back: trust isUserInvolved

      for (const d of userDrops) {
        dropsTotal += 1
        const dropTs =
          t.timestamp instanceof Date ? t.timestamp.getTime() : null
        if (!Number.isFinite(dropTs)) {
          noteSkip('drop has no timestamp')
          continue
        }

        // Resolve canonical Player record (sleeperId / yahooId / etc.).
        // Pull `name` alongside `id` so the evidence sample below can be
        // populated without an extra query.
        let canonicalPlayerId = null
        let canonicalPlayerName = null
        try {
          const resolved = await resolvePlayer(d.playerId, db, {
            id: true,
            name: true,
          })
          if (resolved?.id) {
            canonicalPlayerId = resolved.id
            canonicalPlayerName = resolved.name ?? null
          }
        } catch (_e) {
          // resolvePlayer threw — count as uncomputable, keep going.
        }
        if (!canonicalPlayerId) {
          noteSkip('player not resolvable to canonical id')
          continue
        }

        // Pull weekly NFL stats for that player + season.
        let games
        try {
          games = await db.nflPlayerGame.findMany({
            where: {
              playerId: canonicalPlayerId,
              game: { season: season.seasonYear },
            },
            select: {
              fantasyPtsStd: true,
              game: { select: { week: true } },
            },
          })
        } catch (_e) {
          noteSkip('nflPlayerGame query failed')
          continue
        }
        if (!games || games.length === 0) {
          noteSkip('no NflPlayerGame records for player+season')
          continue
        }

        // Per-game fantasy points (default to 0 if null — same as DB default).
        const ptsByWeek = new Map() // week → fantasyPtsStd
        const finitePts = []
        for (const g of games) {
          const w = g?.game?.week
          if (!Number.isFinite(w)) continue
          const pts = Number(g.fantasyPtsStd ?? 0)
          if (!Number.isFinite(pts)) continue
          ptsByWeek.set(w, pts)
          finitePts.push(pts)
        }
        if (finitePts.length === 0) {
          noteSkip('no finite weekly points for player')
          continue
        }

        // Estimate drop week from timestamp anchored to season start. Cap
        // to non-negative — pre-season drops shouldn't produce negative lag.
        const dropWeekRaw =
          Math.floor((dropTs - seasonStartMs) / (7 * 24 * 3600 * 1000)) + 1
        const dropWeek = dropWeekRaw < 1 ? 1 : dropWeekRaw

        // Upper-bound clamp: if the drop happened after the player's final
        // game of the season, it's roster cleanup (e.g., January cleanup for
        // the prior season; October trade-deadline drop after the player's
        // last game). NOT a sunk-cost signal — record as uncomputable so it
        // doesn't fabricate inflated lag scanning weeks 1..N for a "last
        // good week" that's irrelevant to the drop decision.
        const maxGameWeek = Math.max(...ptsByWeek.keys())
        if (dropWeek > maxGameWeek + 1) {
          noteSkip("drop occurred after player's final game (post-season cleanup)")
          continue
        }

        const seasonAvg = mean(finitePts)
        // With <4 games of sample, seasonAvg is too noisy to anchor a
        // "good week" threshold — a single 30-pt game produces threshold 30
        // and nothing qualifies; a single 4-pt game produces threshold 5 but
        // that lone game might be just under. Fall back to the bare 5-pt
        // floor when sample is thin so we don't drop these to uncomputable
        // on small-sample noise.
        const threshold = finitePts.length >= 4 ? Math.max(seasonAvg, 5) : 5

        // Find latest "good week" strictly before drop week.
        let lastGoodWeek = null
        for (const [w, pts] of ptsByWeek) {
          if (w >= dropWeek) continue
          if (pts >= threshold && (lastGoodWeek == null || w > lastGoodWeek)) {
            lastGoodWeek = w
          }
        }
        if (lastGoodWeek == null) {
          noteSkip('no good-week record before drop')
          continue
        }

        const lagGames = dropWeek - lastGoodWeek
        if (!Number.isFinite(lagGames) || lagGames < 0) {
          noteSkip('non-finite or negative lag')
          continue
        }

        dropsClassified += 1
        perDropLag.push(lagGames)
        // Keep top-20 longest lags as evidence sample.
        sample.push({
          playerName: canonicalPlayerName,
          rawPlayerId: d.playerId,
          dropWeek,
          lastGoodWeek,
          lagGames,
          seasonYear: season.seasonYear,
          leagueId: season.leagueId,
          platform: season.platform,
        })
      }
    }
  }

  if (dropsClassified === 0) {
    // No drops produced computable lag — return null with breadcrumb in logs.
    // The orchestrator records "skipped". This is the expected v1 outcome
    // for users with sparse NFL canonical-player coverage.
    return null
  }

  // Sort sample by lagGames descending and keep top 20.
  sample.sort((a, b) => b.lagGames - a.lagGames)
  const topSample = sample.slice(0, 20)

  const avgLagGames = mean(perDropLag)
  // N<2 stdDev=0 → falsely 1.0 consistency; 0.5 sentinel for single-drop
  // samples. Same pattern as MI-7/8 but stddev divided by 5 to soften
  // (week-to-week scoring is bursty — see header).
  const consistencyPct =
    dropsClassified < 2 ? 0.5 : 1 / (1 + stdDev(perDropLag) / 5)
  // Baseline 2 games of patience; 3-game band → 5 games = effect 1.0
  // (meaningful sunk cost). Clamp to 0 — we don't credit "extra decisive".
  const effectSize = Math.max(0, (avgLagGames - 2) / 3)

  if (!Number.isFinite(avgLagGames) || !Number.isFinite(effectSize))
    return null

  return {
    value: {
      avgLagGames: Math.round(avgLagGames * 100) / 100,
      dropsClassified,
      dropsTotal,
      dropsUncomputable,
    },
    sampleSize: dropsClassified,
    consistencyPct,
    effectSize,
    rawEvidence: {
      sample: topSample,
      coverageNote:
        'drop_lag_games requires (1) canonical Player ID resolution from the raw drop, (2) NflPlayerGame coverage for that player+season, and (3) Season.startDate (falls back to Sep 5 of the year). v1 expects most users to return null; activates as Yahoo importer fixes and NFL historical-player backfill (#207) bring more canonical data online.',
      thresholdDefinition:
        'good week = fantasyPtsStd >= max(seasonAvg, 5.0). dropWeek estimated as floor((dropMs - seasonStartMs)/7days)+1.',
      uncomputableReasons: Object.fromEntries(uncomputableReasons),
    },
    sourceImportIds: [...sourceImportIds],
  }
}

registerExtractor('naked_drop_frequency', nakedDropFrequency)
registerExtractor('drop_lag_games', dropLagGames)

module.exports = {}
