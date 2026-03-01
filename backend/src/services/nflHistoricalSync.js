/**
 * nflHistoricalSync.js — NFL historical data backfill (2019-2025)
 *
 * Follows the datagolfHistoricalSync.js pattern: bulk raw SQL, cached lookups,
 * connection recovery, resumability. Rewires nflSync.js field mappings to
 * INSERT...ON CONFLICT for ~10x speed improvement over Prisma upserts.
 *
 * Functions:
 *   syncHistoricalPlayers(prisma, seasons) — Import ALL players from nflverse stat CSVs
 *   backfillSeason(prisma, season, opts)   — Schedule → stats → kicking → DST for one season
 *   verifySeason(prisma, season)           — Count games, player-games, kicker, DST, weather
 *   backfillAll(prisma, opts)              — Loop seasons with progress + connection recovery
 */

const crypto = require('crypto')
const nfl = require('./nflClient')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const genId = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24)

// ─── Helpers (mirrored from nflSync.js) ──────────────────────────────────────

function num(val) {
  if (val === null || val === undefined || val === '' || val === 'NA') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function mapPosition(pos) {
  if (!pos) return null
  const p = pos.toUpperCase().trim()
  const MAP = {
    QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE',
    K: 'K', P: 'P', OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL',
    DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL',
    LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB',
    DB: 'DB', CB: 'DB', SS: 'DB', FS: 'DB', S: 'DB',
    LS: 'LS',
  }
  return MAP[p] || p
}

function normalizeTeamAbbr(abbr) {
  const MAP = { LA: 'LAR', OAK: 'LV', SD: 'LAC', STL: 'LAR', WSH: 'WAS' }
  return MAP[abbr] || abbr
}

/** Escape a value for raw SQL — null-safe, handles strings/numbers/dates */
function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val)
  if (val instanceof Date) return `'${val.toISOString()}'`
  // Escape single quotes in strings
  return `'${String(val).replace(/'/g, "''")}'`
}

// ─── Cached Lookups ──────────────────────────────────────────────────────────

let _playerMap = null   // Map<gsisId, playerId>
let _dstMap = null      // Map<teamAbbr, playerId>

async function loadPlayerMap(prisma) {
  if (_playerMap) return _playerMap
  const rows = await prisma.player.findMany({
    where: { gsisId: { not: null } },
    select: { id: true, gsisId: true },
  })
  _playerMap = new Map(rows.map(p => [p.gsisId, p.id]))
  console.log(`[nflHist] Player lookup loaded: ${_playerMap.size} entries`)
  return _playerMap
}

async function loadDstMap(prisma) {
  if (_dstMap) return _dstMap
  const rows = await prisma.player.findMany({
    where: { gsisId: { startsWith: 'DST-' } },
    select: { id: true, nflTeamAbbr: true },
  })
  _dstMap = new Map(rows.map(p => [p.nflTeamAbbr, p.id]))
  console.log(`[nflHist] DST lookup loaded: ${_dstMap.size} entries`)
  return _dstMap
}

function invalidatePlayerCaches() {
  _playerMap = null
  _dstMap = null
}

/** Build game lookup for a season: Map<"week-TEAM", gameId> */
async function buildGameMap(prisma, season) {
  const games = await prisma.nflGame.findMany({
    where: { season },
    select: { id: true, week: true, homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
  })
  const gameMap = new Map()
  for (const g of games) {
    gameMap.set(`${g.week}-${g.homeTeam.abbreviation}`, g.id)
    gameMap.set(`${g.week}-${g.awayTeam.abbreviation}`, g.id)
  }
  return gameMap
}

/** Build game score lookup for DST: Map<"week-TEAM", pointsAllowed> */
async function buildGameScoreMap(prisma, season) {
  const games = await prisma.nflGame.findMany({
    where: { season },
    select: { id: true, week: true, homeScore: true, awayScore: true,
      homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
  })
  const scoreMap = new Map()
  for (const g of games) {
    if (g.homeScore !== null && g.awayScore !== null) {
      scoreMap.set(`${g.week}-${g.homeTeam.abbreviation}`, g.awayScore)
      scoreMap.set(`${g.week}-${g.awayTeam.abbreviation}`, g.homeScore)
    }
  }
  return scoreMap
}

// ─── 1. Sync Historical Players ──────────────────────────────────────────────

/**
 * Import ALL players who appear in nflverse weekly stats for target seasons.
 * Unlike nflSync.syncPlayers(), this does NOT filter by status/team/recency —
 * it creates Player records for retired/cut/historical players found in stat CSVs.
 */
async function syncHistoricalPlayers(prisma, seasons = [2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
  console.log(`[nflHist] Syncing historical players for seasons: ${seasons.join(', ')}`)

  // Step 1: Load existing players
  const playerMap = await loadPlayerMap(prisma)
  const existingGsisIds = new Set(playerMap.keys())

  // Step 2: Get NFL sport record
  let sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!sport) {
    console.error('[nflHist] NFL sport not found! Run nflSync.backfillSeason first.')
    return { created: 0 }
  }

  // Step 3: Collect all unique player_ids from weekly stats across all seasons
  const missingPlayers = new Map() // gsisId → { name, position, team }
  for (const season of seasons) {
    console.log(`[nflHist] Scanning ${season} weekly stats for missing players...`)
    let rows
    try {
      rows = await nfl.getWeeklyStats(season)
    } catch (e) {
      console.warn(`[nflHist] Could not fetch stats for ${season}: ${e.message}`)
      continue
    }

    for (const row of rows) {
      const gsisId = row.player_id
      if (!gsisId || existingGsisIds.has(gsisId) || missingPlayers.has(gsisId)) continue
      const pos = mapPosition(row.position || row.position_group)
      if (!pos) continue
      missingPlayers.set(gsisId, {
        name: row.player_display_name || row.player_name || 'Unknown',
        position: pos,
        team: normalizeTeamAbbr(row.recent_team || row.team || ''),
      })
    }
  }

  // Also scan kicking stats for kickers that might not appear in weekly stats
  for (const season of seasons) {
    let rows
    try {
      rows = await nfl.getKickingStats(season)
    } catch (e) { continue }
    for (const row of rows) {
      const gsisId = row.player_id
      if (!gsisId || existingGsisIds.has(gsisId) || missingPlayers.has(gsisId)) continue
      missingPlayers.set(gsisId, {
        name: row.player_name || row.player_display_name || 'Unknown',
        position: 'K',
        team: normalizeTeamAbbr(row.team || ''),
      })
    }
  }

  console.log(`[nflHist] Found ${missingPlayers.size} players not in DB`)

  if (missingPlayers.size === 0) return { created: 0 }

  // Step 4: Bulk insert via raw SQL
  const CHUNK = 100
  const entries = [...missingPlayers.entries()]
  let created = 0
  const now = new Date().toISOString()

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    const values = chunk.map(([gsisId, p]) => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(gsisId)}, ${sqlVal(p.name)}, ${sqlVal(p.position)}, ${sqlVal(p.team)}, ${sqlVal(sport.id)}, true, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO players (id, "gsisId", name, "nflPosition", "nflTeamAbbr", "sportId", "isActive", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("gsisId") DO UPDATE SET
          name = COALESCE(EXCLUDED.name, players.name),
          "nflPosition" = COALESCE(EXCLUDED."nflPosition", players."nflPosition"),
          "sourceIngestedAt" = EXCLUDED."sourceIngestedAt"
      `)
      created += chunk.length
    } catch (e) {
      console.warn(`[nflHist] Batch insert failed at offset ${i}: ${e.message}`)
      // Fallback: individual inserts
      for (const [gsisId, p] of chunk) {
        try {
          await prisma.$executeRawUnsafe(`
            INSERT INTO players (id, "gsisId", name, "nflPosition", "nflTeamAbbr", "sportId", "isActive", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
            VALUES (${sqlVal(genId())}, ${sqlVal(gsisId)}, ${sqlVal(p.name)}, ${sqlVal(p.position)}, ${sqlVal(p.team)}, ${sqlVal(sport.id)}, true, 'nflverse', '${now}', '${now}', '${now}')
            ON CONFLICT ("gsisId") DO NOTHING
          `)
          created++
        } catch (e2) {
          console.warn(`[nflHist] Player insert failed for ${p.name} (${gsisId}): ${e2.message}`)
        }
      }
    }

    if ((i + CHUNK) % 500 === 0 || i + CHUNK >= entries.length) {
      console.log(`[nflHist] Player progress: ${Math.min(i + CHUNK, entries.length)}/${entries.length}`)
    }
  }

  // Invalidate cache so next lookups include new players
  invalidatePlayerCaches()

  console.log(`[nflHist] Created ${created} historical player records`)
  return { created }
}

// ─── 2. Backfill One Season ──────────────────────────────────────────────────

/**
 * Backfill a single NFL season: schedule → weekly stats → kicking → DST.
 * Uses bulk INSERT...ON CONFLICT for speed. COALESCE in ON CONFLICT so
 * kicking/DST layers don't null out existing weekly stat data.
 */
async function backfillSeason(prisma, season, opts = {}) {
  const { force = false } = opts
  console.log(`\n[nflHist] ═══ Backfilling ${season} season ═══\n`)

  // Check if season already has data
  if (!force) {
    const existing = await prisma.nflPlayerGame.count({
      where: { game: { season } },
    })
    if (existing > 100) {
      console.log(`[nflHist] Season ${season} already has ${existing} player-game records. Use --force to reprocess.`)
      return { season, skipped: true, existing }
    }
  }

  // Step 1: Sync schedule/games
  const scheduleResult = await syncScheduleRaw(prisma, season)

  // Step 2: Sync weekly player stats
  const statsResult = await syncWeeklyStatsRaw(prisma, season)

  // Step 3: Overlay kicking stats
  const kickingResult = await syncKickingStatsRaw(prisma, season)

  // Step 4: Sync DST stats
  const dstResult = await syncDstStatsRaw(prisma, season)

  console.log(`\n[nflHist] ═══ ${season} complete ═══`)
  console.log(`  Games: ${scheduleResult.upserted}`)
  console.log(`  Player stats: ${statsResult.upserted} (${statsResult.skipped} skipped)`)
  console.log(`  Kicking: ${kickingResult.upserted} (${kickingResult.skipped} skipped)`)
  console.log(`  DST: ${dstResult.upserted} (${dstResult.skipped} skipped)`)

  return { season, scheduleResult, statsResult, kickingResult, dstResult }
}

// ─── Schedule (raw SQL) ──────────────────────────────────────────────────────

async function syncScheduleRaw(prisma, season) {
  console.log(`[nflHist] Fetching schedule for ${season}...`)
  const allGames = await nfl.getSchedule()
  const games = allGames.filter(r => Number(r.season) === season)

  const allTeams = await prisma.nflTeam.findMany()
  const teamMap = Object.fromEntries(allTeams.map(t => [t.abbreviation, t]))

  let upserted = 0, skipped = 0
  const CHUNK = 50
  const now = new Date().toISOString()

  const eligible = []
  for (const row of games) {
    const externalId = row.game_id
    if (!externalId) { skipped++; continue }
    const homeTeam = teamMap[normalizeTeamAbbr(row.home_team)]
    const awayTeam = teamMap[normalizeTeamAbbr(row.away_team)]
    if (!homeTeam || !awayTeam) { skipped++; continue }

    let status = 'UPCOMING'
    if (row.result !== undefined && row.result !== null && row.result !== '' && row.result !== 'NA') {
      status = 'FINAL'
    }

    let kickoff
    if (row.gameday && row.gametime) {
      kickoff = new Date(`${row.gameday}T${row.gametime}:00-05:00`)
    } else {
      kickoff = new Date(`${row.gameday || `${season}-09-01`}T13:00:00-05:00`)
    }

    const weather = (row.temp || row.wind) ? JSON.stringify({
      temp: num(row.temp),
      wind: num(row.wind),
      humidity: null,
      condition: row.weather_detail || null,
    }) : null

    eligible.push({
      externalId, season, week: Number(row.week),
      gameType: row.game_type || 'REG', kickoff,
      homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
      homeScore: num(row.home_score), awayScore: num(row.away_score),
      status,
      venue: row.stadium || null, surface: row.surface || null, roof: row.roof || null,
      weather,
      spreadLine: num(row.spread_line), totalLine: num(row.total_line),
      homeMoneyline: num(row.home_moneyline), awayMoneyline: num(row.away_moneyline),
    })
  }

  console.log(`[nflHist] ${eligible.length} games for ${season} (${skipped} skipped)`)

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK)
    const values = chunk.map(g => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(g.externalId)}, ${g.season}, ${g.week}, ${sqlVal(g.gameType)}, ${sqlVal(g.kickoff)}, ${sqlVal(g.homeTeamId)}, ${sqlVal(g.awayTeamId)}, ${g.homeScore ?? 'NULL'}, ${g.awayScore ?? 'NULL'}, ${sqlVal(g.status)}, ${sqlVal(g.venue)}, ${sqlVal(g.surface)}, ${sqlVal(g.roof)}, ${g.weather ? `'${g.weather.replace(/'/g, "''")}'::jsonb` : 'NULL'}, ${g.spreadLine ?? 'NULL'}, ${g.totalLine ?? 'NULL'}, ${g.homeMoneyline ?? 'NULL'}, ${g.awayMoneyline ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_games (id, "externalId", season, week, "gameType", kickoff, "homeTeamId", "awayTeamId", "homeScore", "awayScore", status, venue, surface, roof, weather, "spreadLine", "totalLine", "homeMoneyline", "awayMoneyline", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("externalId") DO UPDATE SET
          "homeScore" = EXCLUDED."homeScore",
          "awayScore" = EXCLUDED."awayScore",
          status = EXCLUDED.status,
          venue = COALESCE(EXCLUDED.venue, nfl_games.venue),
          surface = COALESCE(EXCLUDED.surface, nfl_games.surface),
          roof = COALESCE(EXCLUDED.roof, nfl_games.roof),
          weather = COALESCE(EXCLUDED.weather, nfl_games.weather),
          "spreadLine" = COALESCE(EXCLUDED."spreadLine", nfl_games."spreadLine"),
          "totalLine" = COALESCE(EXCLUDED."totalLine", nfl_games."totalLine"),
          "sourceIngestedAt" = EXCLUDED."sourceIngestedAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `)
      upserted += chunk.length
    } catch (e) {
      console.error(`[nflHist] Schedule batch failed at offset ${i}: ${e.message}`)
      skipped += chunk.length
    }
  }

  console.log(`[nflHist] Schedule: ${upserted} games upserted`)
  return { upserted, skipped }
}

// ─── Weekly Stats (raw SQL) ──────────────────────────────────────────────────

async function syncWeeklyStatsRaw(prisma, season) {
  console.log(`[nflHist] Fetching weekly stats for ${season}...`)
  let rows
  try {
    rows = await nfl.getWeeklyStats(season)
  } catch (e) {
    console.warn(`[nflHist] Weekly stats not available for ${season}: ${e.message}`)
    return { upserted: 0, skipped: 0, note: 'not available' }
  }

  const playerMap = await loadPlayerMap(prisma)
  const gameMap = await buildGameMap(prisma, season)

  let upserted = 0, skipped = 0
  const CHUNK = 100
  const now = new Date().toISOString()

  const eligible = []
  for (const row of rows) {
    const gsisId = row.player_id
    if (!gsisId) { skipped++; continue }
    const playerId = playerMap.get(gsisId)
    if (!playerId) { skipped++; continue }
    const week = Number(row.week)
    const teamAbbr = normalizeTeamAbbr(row.recent_team || row.team || '')
    const gameId = gameMap.get(`${week}-${teamAbbr}`)
    if (!gameId) { skipped++; continue }

    // Compute derived fields
    const rushFum = num(row.rushing_fumbles)
    const recFum = num(row.receiving_fumbles)
    const fumbles = (rushFum !== null || recFum !== null) ? (rushFum || 0) + (recFum || 0) : null
    const rushFumLost = num(row.rushing_fumbles_lost)
    const recFumLost = num(row.receiving_fumbles_lost)
    const fumblesLost = (rushFumLost !== null || recFumLost !== null) ? (rushFumLost || 0) + (recFumLost || 0) : null
    const fpStd = num(row.fantasy_points)
    const fpPpr = num(row.fantasy_points_ppr)
    const fpHalf = (fpStd !== null && fpPpr !== null) ? (fpStd + fpPpr) / 2 : null

    eligible.push({
      playerId, gameId, teamAbbr,
      passAttempts: num(row.attempts), passCompletions: num(row.completions),
      passYards: num(row.passing_yards), passTds: num(row.passing_tds),
      interceptions: num(row.interceptions), sacked: num(row.sacks),
      sackYards: num(row.sack_yards), passerRating: num(row.passer_rating),
      rushAttempts: num(row.carries), rushYards: num(row.rushing_yards),
      rushTds: num(row.rushing_tds), fumbles, fumblesLost,
      targets: num(row.targets), receptions: num(row.receptions),
      recYards: num(row.receiving_yards), recTds: num(row.receiving_tds),
      targetShare: num(row.target_share),
      fantasyPtsStd: fpStd, fantasyPtsPpr: fpPpr, fantasyPtsHalf: fpHalf,
    })
  }

  console.log(`[nflHist] ${eligible.length} stat rows for ${season} (${skipped} skipped)`)

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK)
    const values = chunk.map(s => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(s.playerId)}, ${sqlVal(s.gameId)}, ${sqlVal(s.teamAbbr)}, ${s.passAttempts ?? 'NULL'}, ${s.passCompletions ?? 'NULL'}, ${s.passYards ?? 'NULL'}, ${s.passTds ?? 'NULL'}, ${s.interceptions ?? 'NULL'}, ${s.sacked ?? 'NULL'}, ${s.sackYards ?? 'NULL'}, ${s.passerRating ?? 'NULL'}, ${s.rushAttempts ?? 'NULL'}, ${s.rushYards ?? 'NULL'}, ${s.rushTds ?? 'NULL'}, ${s.fumbles ?? 'NULL'}, ${s.fumblesLost ?? 'NULL'}, ${s.targets ?? 'NULL'}, ${s.receptions ?? 'NULL'}, ${s.recYards ?? 'NULL'}, ${s.recTds ?? 'NULL'}, ${s.targetShare ?? 'NULL'}, ${s.fantasyPtsStd ?? 'NULL'}, ${s.fantasyPtsPpr ?? 'NULL'}, ${s.fantasyPtsHalf ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_player_games (id, "playerId", "gameId", "teamAbbr", "passAttempts", "passCompletions", "passYards", "passTds", interceptions, sacked, "sackYards", "passerRating", "rushAttempts", "rushYards", "rushTds", fumbles, "fumblesLost", targets, receptions, "recYards", "recTds", "targetShare", "fantasyPtsStd", "fantasyPtsPpr", "fantasyPtsHalf", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("playerId", "gameId") DO UPDATE SET
          "teamAbbr" = EXCLUDED."teamAbbr",
          "passAttempts" = EXCLUDED."passAttempts",
          "passCompletions" = EXCLUDED."passCompletions",
          "passYards" = EXCLUDED."passYards",
          "passTds" = EXCLUDED."passTds",
          interceptions = EXCLUDED.interceptions,
          sacked = EXCLUDED.sacked,
          "sackYards" = EXCLUDED."sackYards",
          "passerRating" = EXCLUDED."passerRating",
          "rushAttempts" = EXCLUDED."rushAttempts",
          "rushYards" = EXCLUDED."rushYards",
          "rushTds" = EXCLUDED."rushTds",
          fumbles = EXCLUDED.fumbles,
          "fumblesLost" = EXCLUDED."fumblesLost",
          targets = EXCLUDED.targets,
          receptions = EXCLUDED.receptions,
          "recYards" = EXCLUDED."recYards",
          "recTds" = EXCLUDED."recTds",
          "targetShare" = EXCLUDED."targetShare",
          "fantasyPtsStd" = EXCLUDED."fantasyPtsStd",
          "fantasyPtsPpr" = EXCLUDED."fantasyPtsPpr",
          "fantasyPtsHalf" = EXCLUDED."fantasyPtsHalf",
          "sourceIngestedAt" = EXCLUDED."sourceIngestedAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `)
      upserted += chunk.length
    } catch (e) {
      console.error(`[nflHist] Stats batch failed at offset ${i}: ${e.message}`)
      skipped += chunk.length
    }

    if ((i + CHUNK) % 1000 === 0 || i + CHUNK >= eligible.length) {
      console.log(`[nflHist] Stats progress: ${Math.min(i + CHUNK, eligible.length)}/${eligible.length}`)
    }
  }

  return { upserted, skipped }
}

// ─── Kicking Stats (raw SQL overlay) ─────────────────────────────────────────

async function syncKickingStatsRaw(prisma, season) {
  console.log(`[nflHist] Fetching kicking stats for ${season}...`)
  let rows
  try {
    rows = await nfl.getKickingStats(season)
  } catch (e) {
    console.warn(`[nflHist] Kicking stats not available for ${season}: ${e.message}`)
    return { upserted: 0, skipped: 0, note: 'not available' }
  }

  const playerMap = await loadPlayerMap(prisma)
  const gameMap = await buildGameMap(prisma, season)

  let upserted = 0, skipped = 0
  const CHUNK = 100
  const now = new Date().toISOString()

  const eligible = []
  for (const row of rows) {
    const gsisId = row.player_id
    if (!gsisId) { skipped++; continue }
    const playerId = playerMap.get(gsisId)
    if (!playerId) { skipped++; continue }
    const week = Number(row.week)
    const teamAbbr = normalizeTeamAbbr(row.team || '')
    const gameId = gameMap.get(`${week}-${teamAbbr}`)
    if (!gameId) { skipped++; continue }

    const fgMade = num(row.fg_made)
    const patMade = num(row.pat_made)
    const fgMade50Plus = (num(row.fg_made_50_59) || 0) + (num(row.fg_made_60_) || 0)
    const fantasyPts = (fgMade || 0) * 3 + (patMade || 0) * 1

    eligible.push({
      playerId, gameId, teamAbbr,
      fgMade, fgAttempts: num(row.fg_att), fgPct: num(row.fg_pct),
      fgMade0_19: num(row.fg_made_0_19), fgMade20_29: num(row.fg_made_20_29),
      fgMade30_39: num(row.fg_made_30_39), fgMade40_49: num(row.fg_made_40_49),
      fgMade50Plus, xpMade: patMade, xpAttempts: num(row.pat_att),
      fantasyPtsStd: fantasyPts, fantasyPtsPpr: fantasyPts, fantasyPtsHalf: fantasyPts,
    })
  }

  console.log(`[nflHist] ${eligible.length} kicking rows for ${season} (${skipped} skipped)`)

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK)
    const values = chunk.map(k => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(k.playerId)}, ${sqlVal(k.gameId)}, ${sqlVal(k.teamAbbr)}, ${k.fgMade ?? 'NULL'}, ${k.fgAttempts ?? 'NULL'}, ${k.fgPct ?? 'NULL'}, ${k.fgMade0_19 ?? 'NULL'}, ${k.fgMade20_29 ?? 'NULL'}, ${k.fgMade30_39 ?? 'NULL'}, ${k.fgMade40_49 ?? 'NULL'}, ${k.fgMade50Plus ?? 'NULL'}, ${k.xpMade ?? 'NULL'}, ${k.xpAttempts ?? 'NULL'}, ${k.fantasyPtsStd ?? 'NULL'}, ${k.fantasyPtsPpr ?? 'NULL'}, ${k.fantasyPtsHalf ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      // COALESCE: don't overwrite existing weekly stat fields with NULL
      await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_player_games (id, "playerId", "gameId", "teamAbbr", "fgMade", "fgAttempts", "fgPct", "fgMade0_19", "fgMade20_29", "fgMade30_39", "fgMade40_49", "fgMade50Plus", "xpMade", "xpAttempts", "fantasyPtsStd", "fantasyPtsPpr", "fantasyPtsHalf", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("playerId", "gameId") DO UPDATE SET
          "fgMade" = EXCLUDED."fgMade",
          "fgAttempts" = EXCLUDED."fgAttempts",
          "fgPct" = EXCLUDED."fgPct",
          "fgMade0_19" = EXCLUDED."fgMade0_19",
          "fgMade20_29" = EXCLUDED."fgMade20_29",
          "fgMade30_39" = EXCLUDED."fgMade30_39",
          "fgMade40_49" = EXCLUDED."fgMade40_49",
          "fgMade50Plus" = EXCLUDED."fgMade50Plus",
          "xpMade" = EXCLUDED."xpMade",
          "xpAttempts" = EXCLUDED."xpAttempts",
          "fantasyPtsStd" = COALESCE(nfl_player_games."fantasyPtsStd", EXCLUDED."fantasyPtsStd"),
          "fantasyPtsPpr" = COALESCE(nfl_player_games."fantasyPtsPpr", EXCLUDED."fantasyPtsPpr"),
          "fantasyPtsHalf" = COALESCE(nfl_player_games."fantasyPtsHalf", EXCLUDED."fantasyPtsHalf"),
          "sourceIngestedAt" = EXCLUDED."sourceIngestedAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `)
      upserted += chunk.length
    } catch (e) {
      console.error(`[nflHist] Kicking batch failed at offset ${i}: ${e.message}`)
      skipped += chunk.length
    }
  }

  return { upserted, skipped }
}

// ─── DST Stats (raw SQL) ─────────────────────────────────────────────────────

async function syncDstStatsRaw(prisma, season) {
  console.log(`[nflHist] Fetching DST stats for ${season}...`)
  let rows
  try {
    rows = await nfl.getTeamWeeklyStats(season)
  } catch (e) {
    console.warn(`[nflHist] DST stats not available for ${season}: ${e.message}`)
    return { upserted: 0, skipped: 0, note: 'not available' }
  }

  const dstMap = await loadDstMap(prisma)
  const gameMap = await buildGameMap(prisma, season)
  const scoreMap = await buildGameScoreMap(prisma, season)

  let upserted = 0, skipped = 0
  const CHUNK = 100
  const now = new Date().toISOString()

  const eligible = []
  for (const row of rows) {
    const teamAbbr = normalizeTeamAbbr(row.team || '')
    const week = Number(row.week)
    if (!teamAbbr || !week) { skipped++; continue }
    const playerId = dstMap.get(teamAbbr)
    if (!playerId) { skipped++; continue }
    const gameId = gameMap.get(`${week}-${teamAbbr}`)
    if (!gameId) { skipped++; continue }

    // Compute DST fantasy scoring (same as nflSync.js)
    const sacks = num(row.def_sacks) || 0
    const ints = num(row.def_interceptions) || 0
    const fumRec = num(row.fumble_recovery_opp) || 0
    const defTds = num(row.def_tds) || 0
    const safeties = num(row.def_safeties) || 0
    const stTds = num(row.special_teams_tds) || 0
    const fgBlocked = num(row.fg_blocked) || 0
    const pointsAllowed = scoreMap.get(`${week}-${teamAbbr}`) ?? null

    let dstPts = 0
    dstPts += sacks * 1
    dstPts += ints * 2
    dstPts += fumRec * 2
    dstPts += defTds * 6
    dstPts += stTds * 6
    dstPts += safeties * 2
    dstPts += fgBlocked * 2
    if (pointsAllowed !== null) {
      if (pointsAllowed === 0) dstPts += 10
      else if (pointsAllowed <= 6) dstPts += 7
      else if (pointsAllowed <= 13) dstPts += 4
      else if (pointsAllowed <= 20) dstPts += 1
      else if (pointsAllowed <= 27) dstPts += 0
      else if (pointsAllowed <= 34) dstPts -= 1
      else dstPts -= 4
    }
    const fantasyPts = Math.round(dstPts * 10) / 10

    eligible.push({
      playerId, gameId, teamAbbr,
      sacks: num(row.def_sacks),
      tacklesSolo: num(row.def_tackles_solo),
      tacklesAssist: num(row.def_tackle_assists),
      passesDefended: num(row.def_pass_defended),
      fumblesForced: num(row.def_fumbles_forced),
      fumblesRecovered: num(row.fumble_recovery_opp),
      defInterceptions: num(row.def_interceptions),
      defTds: (num(row.def_tds) || 0) + (num(row.special_teams_tds) || 0),
      safeties: num(row.def_safeties),
      blockedKicks: num(row.fg_blocked),
      pointsAllowed,
      fantasyPtsStd: fantasyPts, fantasyPtsPpr: fantasyPts, fantasyPtsHalf: fantasyPts,
    })
  }

  console.log(`[nflHist] ${eligible.length} DST rows for ${season} (${skipped} skipped)`)

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK)
    const values = chunk.map(d => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(d.playerId)}, ${sqlVal(d.gameId)}, ${sqlVal(d.teamAbbr)}, ${d.sacks ?? 'NULL'}, ${d.tacklesSolo ?? 'NULL'}, ${d.tacklesAssist ?? 'NULL'}, ${d.passesDefended ?? 'NULL'}, ${d.fumblesForced ?? 'NULL'}, ${d.fumblesRecovered ?? 'NULL'}, ${d.defInterceptions ?? 'NULL'}, ${d.defTds ?? 'NULL'}, ${d.safeties ?? 'NULL'}, ${d.blockedKicks ?? 'NULL'}, ${d.pointsAllowed ?? 'NULL'}, ${d.fantasyPtsStd ?? 'NULL'}, ${d.fantasyPtsPpr ?? 'NULL'}, ${d.fantasyPtsHalf ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_player_games (id, "playerId", "gameId", "teamAbbr", sacks, "tacklesSolo", "tacklesAssist", "passesDefended", "fumblesForced", "fumblesRecovered", "defInterceptions", "defTds", safeties, "blockedKicks", "pointsAllowed", "fantasyPtsStd", "fantasyPtsPpr", "fantasyPtsHalf", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("playerId", "gameId") DO UPDATE SET
          sacks = EXCLUDED.sacks,
          "tacklesSolo" = EXCLUDED."tacklesSolo",
          "tacklesAssist" = EXCLUDED."tacklesAssist",
          "passesDefended" = EXCLUDED."passesDefended",
          "fumblesForced" = EXCLUDED."fumblesForced",
          "fumblesRecovered" = EXCLUDED."fumblesRecovered",
          "defInterceptions" = EXCLUDED."defInterceptions",
          "defTds" = EXCLUDED."defTds",
          safeties = EXCLUDED.safeties,
          "blockedKicks" = EXCLUDED."blockedKicks",
          "pointsAllowed" = EXCLUDED."pointsAllowed",
          "fantasyPtsStd" = COALESCE(nfl_player_games."fantasyPtsStd", EXCLUDED."fantasyPtsStd"),
          "fantasyPtsPpr" = COALESCE(nfl_player_games."fantasyPtsPpr", EXCLUDED."fantasyPtsPpr"),
          "fantasyPtsHalf" = COALESCE(nfl_player_games."fantasyPtsHalf", EXCLUDED."fantasyPtsHalf"),
          "sourceIngestedAt" = EXCLUDED."sourceIngestedAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `)
      upserted += chunk.length
    } catch (e) {
      console.error(`[nflHist] DST batch failed at offset ${i}: ${e.message}`)
      skipped += chunk.length
    }
  }

  return { upserted, skipped }
}

// ─── 3. Verify Season ────────────────────────────────────────────────────────

async function verifySeason(prisma, season) {
  const games = await prisma.nflGame.count({ where: { season } })
  const playerGames = await prisma.nflPlayerGame.count({ where: { game: { season } } })

  // Count kicker records (have fgMade or xpMade)
  const kicking = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM nfl_player_games pg
    JOIN nfl_games g ON pg."gameId" = g.id
    WHERE g.season = ${season} AND (pg."fgMade" IS NOT NULL OR pg."xpMade" IS NOT NULL)
  `)

  // Count DST records
  const dst = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM nfl_player_games pg
    JOIN nfl_games g ON pg."gameId" = g.id
    JOIN players p ON pg."playerId" = p.id
    WHERE g.season = ${season} AND p."gsisId" LIKE 'DST-%'
  `)

  // Count games with weather
  const weather = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM nfl_games
    WHERE season = ${season} AND weather IS NOT NULL
  `)

  const result = {
    season,
    games,
    playerGames,
    kickingRecords: Number(kicking[0]?.count || 0),
    dstRecords: Number(dst[0]?.count || 0),
    gamesWithWeather: Number(weather[0]?.count || 0),
  }

  console.log(`[nflHist] Verification for ${season}:`)
  console.log(`  Games: ${result.games}`)
  console.log(`  Player-Games: ${result.playerGames}`)
  console.log(`  Kicking records: ${result.kickingRecords}`)
  console.log(`  DST records: ${result.dstRecords}`)
  console.log(`  Games with weather: ${result.gamesWithWeather}`)

  return result
}

// ─── 4. Backfill All Seasons ─────────────────────────────────────────────────

async function backfillAll(prisma, opts = {}) {
  const {
    seasons = [2019, 2020, 2021, 2022, 2023, 2024, 2025],
    force = false,
    skipWeather = false,
  } = opts

  console.log(`\n[nflHist] ╔══════════════════════════════════════════════╗`)
  console.log(`[nflHist] ║  NFL Historical Backfill: ${seasons.join(', ')}  ║`)
  console.log(`[nflHist] ╚══════════════════════════════════════════════╝\n`)

  const startTime = Date.now()

  // Step 1: Sync all historical players first
  console.log('\n[nflHist] ═══ Step 1: Historical Player Sync ═══\n')
  await syncHistoricalPlayers(prisma, seasons)

  // Step 2: Backfill each season
  const results = []
  let dbRetries = 0

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i]
    const progress = `[${i + 1}/${seasons.length}]`

    try {
      const result = await backfillSeason(prisma, season, { force })
      results.push(result)
      dbRetries = 0
      console.log(`${progress} ${season} done\n`)
    } catch (err) {
      // DB connection errors — reconnect and retry
      const isDbError = err.message?.includes('Server has closed the connection') ||
        err.message?.includes('Connection pool timeout') ||
        err.message?.includes('Can\'t reach database') ||
        err.message?.includes('ECONNRESET') ||
        err.message?.includes('ETIMEDOUT') ||
        err.code === 'P2024' || err.code === 'P1001' || err.code === 'P1017'

      if (isDbError && dbRetries < 3) {
        dbRetries++
        console.warn(`${progress} DB connection lost, reconnecting (attempt ${dbRetries}/3)...`)
        try { await prisma.$disconnect() } catch {}
        await sleep(5000)
        try { await prisma.$connect() } catch {}
        await sleep(2000)
        invalidatePlayerCaches()
        i-- // retry this season
        continue
      }

      console.error(`${progress} Failed ${season}: ${err.message}`)
      results.push({ season, error: err.message })
      dbRetries = 0
    }

    // Reconnect every 3 seasons to prevent stale connections
    if (i > 0 && i % 3 === 0) {
      console.log('[nflHist] Refreshing DB connection...')
      try { await prisma.$disconnect() } catch {}
      await sleep(1000)
      try { await prisma.$connect() } catch {}
      invalidatePlayerCaches()
    }
  }

  // Step 3: Verification
  console.log('\n[nflHist] ═══ Verification ═══\n')
  for (const season of seasons) {
    await verifySeason(prisma, season)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n[nflHist] ═══ Backfill Complete in ${elapsed}s ═══`)
  console.log(`  Seasons processed: ${results.filter(r => !r.error).length}`)
  console.log(`  Seasons failed: ${results.filter(r => r.error).length}`)
  if (!skipWeather) {
    console.log('  Weather: run with --weather-only separately (uses nflWeatherBackfill)')
  }

  return { results, elapsed }
}

module.exports = {
  syncHistoricalPlayers,
  backfillSeason,
  verifySeason,
  backfillAll,
}
