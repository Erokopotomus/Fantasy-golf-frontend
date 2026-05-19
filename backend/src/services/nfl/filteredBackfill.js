const nfl = require('../nflClient')
const { genId, sqlVal, normalizeTeamAbbr } = require('./sqlHelpers')

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
    const externalGameId = r.game_id
    const gameId = gameMap.get(externalGameId)
    if (!gameId) { droppedNoGame++; continue }

    statRows.push({
      playerId,
      gameId,
      teamAbbr: normalizeTeamAbbr(r.recent_team || r.team || ''),
      passAttempts:    r.passing_attempts ?? r.attempts,
      passCompletions: r.passing_completions ?? r.completions,
      passYards:       r.passing_yards ?? r.pass_yards,
      passTds:         r.passing_tds ?? r.pass_tds,
      interceptions:   r.passing_interceptions ?? r.interceptions,
      sacked:          r.sacks_suffered ?? r.sacks,
      sackYards:       r.sack_yards_lost,
      passerRating:    r.passer_rating,
      rushAttempts:    r.carries ?? r.rush_attempts,
      rushYards:       r.rushing_yards ?? r.rush_yards,
      rushTds:         r.rushing_tds ?? r.rush_tds,
      fumbles:         r.rushing_fumbles ?? r.fumbles,
      fumblesLost:     r.rushing_fumbles_lost ?? r.fumbles_lost,
      targets:         r.targets,
      receptions:      r.receptions,
      recYards:        r.receiving_yards ?? r.rec_yards,
      recTds:          r.receiving_tds ?? r.rec_tds,
      targetShare:     r.target_share,
      fantasyPtsStd:   r.fantasy_points,
      fantasyPtsPpr:   r.fantasy_points_ppr,
      fantasyPtsHalf:  r.fantasy_points_half_ppr,
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
    }
  }

  return { inserted }
}

module.exports = { syncFilteredWeeklyStats }
