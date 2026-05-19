const nfl = require('../nflClient')
const { genId, sqlVal, normalizeTeamAbbr } = require('./sqlHelpers')

// nflverse CSVs surface missing numeric fields as '' (empty string) for some
// seasons (e.g. target_share before 2006). Plain ?? doesn't catch empties, so
// they leak straight into SQL as `..., , ...` syntax errors. Normalize here.
function numOrNull(v) {
  if (v == null || v === '') return null
  return v
}

async function syncFilteredWeeklyStats(prisma, season, playerMap, gameMap, pool) {
  const rows = await nfl.getWeeklyStats(season)
  const candidates = rows.filter(r => r.player_id && pool.has(r.player_id))
  console.log(`[filteredBackfill] ${season}: ${candidates.length} of ${rows.length} rows in pool`)

  const statRows = []
  let droppedNoPlayer = 0
  let droppedNoGame = 0
  for (const r of candidates) {
    const playerId = playerMap.get(r.player_id)
    if (!playerId) { droppedNoPlayer++; continue }
    const teamAbbrForLookup = normalizeTeamAbbr(r.team || r.recent_team || '')
    const weekForLookup = Number(r.week)
    if (!teamAbbrForLookup || !weekForLookup) { droppedNoGame++; continue }
    const lookupKey = `${season}_${weekForLookup}_${teamAbbrForLookup}`
    const gameId = gameMap.get(lookupKey)
    if (!gameId) { droppedNoGame++; continue }

    statRows.push({
      playerId,
      gameId,
      teamAbbr: normalizeTeamAbbr(r.recent_team || r.team || ''),
      passAttempts:    numOrNull(r.passing_attempts ?? r.attempts),
      passCompletions: numOrNull(r.passing_completions ?? r.completions),
      passYards:       numOrNull(r.passing_yards ?? r.pass_yards),
      passTds:         numOrNull(r.passing_tds ?? r.pass_tds),
      interceptions:   numOrNull(r.passing_interceptions ?? r.interceptions),
      sacked:          numOrNull(r.sacks_suffered ?? r.sacks),
      sackYards:       numOrNull(r.sack_yards_lost),
      passerRating:    numOrNull(r.passer_rating),
      rushAttempts:    numOrNull(r.carries ?? r.rush_attempts),
      rushYards:       numOrNull(r.rushing_yards ?? r.rush_yards),
      rushTds:         numOrNull(r.rushing_tds ?? r.rush_tds),
      fumbles:         numOrNull(r.rushing_fumbles ?? r.fumbles),
      fumblesLost:     numOrNull(r.rushing_fumbles_lost ?? r.fumbles_lost),
      targets:         numOrNull(r.targets),
      receptions:      numOrNull(r.receptions),
      recYards:        numOrNull(r.receiving_yards ?? r.rec_yards),
      recTds:          numOrNull(r.receiving_tds ?? r.rec_tds),
      targetShare:     numOrNull(r.target_share),
      fantasyPtsStd:   numOrNull(r.fantasy_points),
      fantasyPtsPpr:   numOrNull(r.fantasy_points_ppr),
      fantasyPtsHalf:  numOrNull(r.fantasy_points_half_ppr),
    })
  }

  if (droppedNoPlayer > 0 || droppedNoGame > 0) {
    console.log(`[filteredBackfill] ${season}: dropped ${droppedNoPlayer} (no player), ${droppedNoGame} (no game) before insert`)
  }

  if (statRows.length === 0) {
    console.log(`[filteredBackfill] ${season}: no rows to insert after filtering`)
    return { inserted: 0 }
  }

  const CHUNK = 500
  let inserted = 0
  let insertErrors = 0
  const now = new Date().toISOString()

  for (let i = 0; i < statRows.length; i += CHUNK) {
    const chunk = statRows.slice(i, i + CHUNK)
    const values = chunk.map(s => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(s.playerId)}, ${sqlVal(s.gameId)}, ${sqlVal(s.teamAbbr)}, ${s.passAttempts ?? 'NULL'}, ${s.passCompletions ?? 'NULL'}, ${s.passYards ?? 'NULL'}, ${s.passTds ?? 'NULL'}, ${s.interceptions ?? 'NULL'}, ${s.sacked ?? 'NULL'}, ${s.sackYards ?? 'NULL'}, ${s.passerRating ?? 'NULL'}, ${s.rushAttempts ?? 'NULL'}, ${s.rushYards ?? 'NULL'}, ${s.rushTds ?? 'NULL'}, ${s.fumbles ?? 'NULL'}, ${s.fumblesLost ?? 'NULL'}, ${s.targets ?? 'NULL'}, ${s.receptions ?? 'NULL'}, ${s.recYards ?? 'NULL'}, ${s.recTds ?? 'NULL'}, ${s.targetShare ?? 'NULL'}, ${s.fantasyPtsStd ?? 'NULL'}, ${s.fantasyPtsPpr ?? 'NULL'}, ${s.fantasyPtsHalf ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      const n = await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_player_games (id, "playerId", "gameId", "teamAbbr", "passAttempts", "passCompletions", "passYards", "passTds", "interceptions", "sacked", "sackYards", "passerRating", "rushAttempts", "rushYards", "rushTds", "fumbles", "fumblesLost", "targets", "receptions", "recYards", "recTds", "targetShare", "fantasyPtsStd", "fantasyPtsPpr", "fantasyPtsHalf", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("playerId", "gameId") DO NOTHING
      `)
      inserted += Number(n) || 0
    } catch (e) {
      console.warn(`[filteredBackfill] insert failed at offset ${i}: ${e.message}`)
      insertErrors++
    }
  }

  return { inserted, insertErrors }
}

module.exports = { syncFilteredWeeklyStats }

/**
 * Create Player records for any pool gsisIds that don't exist yet.
 * Scans nflverse weekly stats for player metadata (name, position, current team).
 *
 * Reuses existing logic from nflHistoricalSync but constrained to the pool.
 */
async function syncFilteredPlayers(prisma, seasons, pool) {
  const { mapPosition, normalizeTeamAbbr, genId, sqlVal } = require('./sqlHelpers')

  const existing = await prisma.player.findMany({
    where: { gsisId: { not: null } },
    select: { id: true, gsisId: true },
  })
  const existingByGsis = new Map(existing.map(p => [p.gsisId, p.id]))

  const toCreate = new Map()
  for (const season of seasons) {
    let rows
    try {
      rows = await nfl.getWeeklyStats(season)
    } catch (e) {
      console.warn(`[filteredBackfill] syncFilteredPlayers: ${season} fetch failed: ${e.message} — skipping`)
      continue
    }
    for (const r of rows) {
      const gid = r.player_id
      if (!gid || !pool.has(gid) || existingByGsis.has(gid) || toCreate.has(gid)) continue
      const pos = mapPosition(r.position || r.position_group)
      if (!pos) continue
      toCreate.set(gid, {
        name: r.player_display_name || r.player_name || 'Unknown',
        position: pos,
        team: normalizeTeamAbbr(r.recent_team || r.team || ''),
      })
    }
  }

  console.log(`[filteredBackfill] Creating ${toCreate.size} new Player records for pool`)
  if (toCreate.size === 0) {
    return { created: 0, gsisIdToPlayerId: existingByGsis }
  }

  const sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!sport) throw new Error('NFL sport row missing — run nflSync first')

  const now = new Date().toISOString()
  const CHUNK = 100
  const entries = [...toCreate.entries()]
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    // First pass: build the (gsisId, generated-id) pairs without mutating the return map yet
    const idsForChunk = chunk.map(([gsisId, p]) => ({
      gsisId,
      id: genId(),
      meta: p,
    }))
    const values = idsForChunk.map(({ id, gsisId, meta }) => (
      `(${sqlVal(id)}, ${sqlVal(gsisId)}, ${sqlVal(meta.name)}, ${sqlVal(meta.position)}, ${sqlVal(meta.team)}, ${sqlVal(sport.id)}, true, 'nflverse', '${now}', '${now}', '${now}')`
    )).join(',\n')
    await prisma.$executeRawUnsafe(`
      INSERT INTO players (id, "gsisId", name, "nflPosition", "nflTeamAbbr", "sportId", "isActive", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
      VALUES ${values}
      ON CONFLICT ("gsisId") DO NOTHING
    `)
    // Populate return map only after successful INSERT
    for (const { gsisId, id } of idsForChunk) existingByGsis.set(gsisId, id)
  }

  return { created: toCreate.size, gsisIdToPlayerId: existingByGsis }
}

module.exports.syncFilteredPlayers = syncFilteredPlayers

const nflHistoricalSync = require('../nflHistoricalSync')

async function runFilteredSeason(prisma, season, gsisIdToPlayerId, pool) {
  console.log(`[filteredBackfill] === Season ${season} ===`)

  await nflHistoricalSync.syncScheduleRaw(prisma, season)

  // Build a season+week+team keyed map (each game contributes TWO entries —
  // one for the home team, one for the away team). This shape lets us look
  // up the gameId from a player row using season + week + the player's team,
  // which works across both legacy (2016-2023) and current (2024+) nflverse
  // weekly-stats schemas (the 2024+ schema dropped the `game_id` column).
  const games = await prisma.nflGame.findMany({
    where: { season },
    select: {
      id: true,
      week: true,
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  })
  const gameMap = new Map()
  for (const g of games) {
    const homeAbbr = g.homeTeam?.abbreviation
    const awayAbbr = g.awayTeam?.abbreviation
    if (homeAbbr) gameMap.set(`${season}_${g.week}_${homeAbbr}`, g.id)
    if (awayAbbr) gameMap.set(`${season}_${g.week}_${awayAbbr}`, g.id)
  }

  const result = await syncFilteredWeeklyStats(prisma, season, gsisIdToPlayerId, gameMap, pool)
  console.log(`[filteredBackfill] ${season}: inserted ${result.inserted} player-game rows`)
  return result
}

module.exports.runFilteredSeason = runFilteredSeason
