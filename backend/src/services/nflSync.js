/**
 * nflSync.js — NFL data synchronization service
 *
 * Mirrors the datagolfSync.js pattern: fetch from nflverse → stage raw → transform → upsert
 * Data via nflverse (MIT license, https://github.com/nflverse)
 *
 * Functions:
 *   syncPlayers(prisma)         — Import/update NFL players + cross-platform IDs
 *   syncSchedule(prisma, season) — Import NFL schedule (games)
 *   syncWeeklyStats(prisma, season) — Import weekly player game stats
 *   syncRosters(prisma, season) — Import weekly rosters (depth chart, snap %)
 */

const nfl = require('./nflClient')
const etl = require('./etlPipeline')

// ─── Raw Staging ──────────────────────────────────────────────────────────────

async function stageRaw(prisma, dataType, eventRef, payload) {
  try {
    const recordCount = Array.isArray(payload) ? payload.length : null
    await prisma.rawProviderData.create({
      data: {
        provider: 'nflverse',
        dataType,
        eventRef: eventRef ? String(eventRef) : null,
        payload,
        recordCount,
      },
    })
  } catch (e) {
    console.warn(`[nflSync:StageRaw] Failed to stage nflverse/${dataType}: ${e.message}`)
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Remove undefined/null keys from an object for Prisma */
function clean(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'NA') out[k] = v
  }
  return out
}

/** Safe number parsing (nflverse uses empty strings and 'NA' for missing data) */
function num(val) {
  if (val === null || val === undefined || val === '' || val === 'NA') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

/** Map nflverse position strings to our standard positions */
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

/** Normalize nflverse team abbreviations to our DB format */
function normalizeTeamAbbr(abbr) {
  const MAP = { LA: 'LAR', OAK: 'LV', SD: 'LAC', STL: 'LAR', WSH: 'WAS' }
  return MAP[abbr] || abbr
}

/** Get or create the NFL Sport record */
async function getOrCreateNflSport(prisma) {
  let sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!sport) {
    sport = await prisma.sport.create({
      data: {
        slug: 'nfl',
        name: 'NFL',
        isActive: true,
        config: {
          seasonType: 'weekly',
          weekDefinition: 'nfl_week',
          statCategories: ['passing', 'rushing', 'receiving', 'defense', 'kicking'],
          rosterPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FLEX', 'BN'],
          defaultScoringPresets: ['standard', 'ppr', 'half_ppr'],
        },
      },
    })
    console.log('[nflSync] Created NFL sport record')
  }
  return sport
}

// ─── Sync Functions ─────────────────────────────────────────────────────────

/**
 * Sync NFL players from nflverse player database
 * Creates Player records with NFL-specific fields + cross-platform IDs
 */
async function syncPlayers(prisma) {
  console.log('[nflSync] Starting NFL player sync...')

  const rows = await nfl.getPlayers()
  await stageRaw(prisma, 'nfl_players', null, rows.slice(0, 20)) // Stage sample for audit

  const sport = await getOrCreateNflSport(prisma)

  let upserted = 0, skipped = 0

  // Pre-filter to active, fantasy-relevant players on current NFL rosters
  // nflverse uses: latest_team (not team_abbr), status (ACT/RES/DEV/CUT/etc.)
  // RES = reserved/offseason (current players), ACT = active during season
  const currentYear = new Date().getFullYear()
  const eligible = []
  for (const row of rows) {
    const gsisId = row.gsis_id
    if (!gsisId || !row.display_name) { skipped++; continue }
    const status = (row.status || '').toUpperCase()
    // Skip retired, cut, suspended, inactive
    if (['RET', 'CUT', 'SUS', 'INA', 'EXE'].includes(status)) { skipped++; continue }
    // Must have a current team
    const team = row.latest_team || row.team_abbr || ''
    if (!team || team === 'NA' || team === '') { skipped++; continue }
    // Must have played recently (within last 2 seasons)
    const lastSeason = Number(row.last_season)
    if (lastSeason && lastSeason < currentYear - 1) { skipped++; continue }
    const position = mapPosition(row.position)
    if (!['QB', 'RB', 'WR', 'TE', 'K'].includes(position)) { skipped++; continue }
    eligible.push({ row, gsisId, position, status, team: normalizeTeamAbbr(team) })
  }

  console.log(`[nflSync] ${eligible.length} eligible players (${skipped} skipped)`)

  // Batch upsert in chunks of 50 via $transaction
  const BATCH_SIZE = 50
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const ops = batch.map(({ row, gsisId, position, status, team }) => {
      const data = clean({
        name: row.display_name,
        firstName: row.first_name || null,
        lastName: row.last_name || null,
        gsisId,
        pfrId: row.pfr_id || null,
        espnId: row.espn_id ? String(row.espn_id) : null,
        yahooId: row.yahoo_id ? String(row.yahoo_id) : null,
        sleeperId: row.sleeper_id ? String(row.sleeper_id) : null,
        nflPosition: position,
        nflTeamAbbr: team,
        nflNumber: num(row.jersey_number),
        birthDate: row.birth_date ? new Date(row.birth_date) : null,
        height: row.height ? `${Math.floor(Number(row.height) / 12)}'${Number(row.height) % 12}"` : null,
        weight: num(row.weight),
        college: row.college_name || row.college || null,
        headshotUrl: row.headshot || row.headshot_url || null,
        isActive: true,
        sportId: sport.id,
        sourceProvider: 'nflverse',
        sourceIngestedAt: new Date(),
      })
      return prisma.player.upsert({
        where: { gsisId },
        create: data,
        update: data,
      })
    })
    try {
      await prisma.$transaction(ops)
      upserted += batch.length
    } catch (e) {
      // Fallback: try individually on batch failure
      for (const op of batch) {
        try {
          const data = clean({
            name: op.row.display_name, gsisId: op.gsisId, nflPosition: op.position,
            nflTeamAbbr: op.row.team_abbr || null, sportId: sport.id,
            sourceProvider: 'nflverse', sourceIngestedAt: new Date(),
          })
          await prisma.player.upsert({ where: { gsisId: op.gsisId }, create: data, update: data })
          upserted++
        } catch (e2) {
          console.warn(`[nflSync] Player upsert failed for ${op.row.display_name}: ${e2.message}`)
          skipped++
        }
      }
    }
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= eligible.length) {
      console.log(`[nflSync] Progress: ${Math.min(i + BATCH_SIZE, eligible.length)}/${eligible.length}`)
    }
  }

  // Create/update DST (team defense) "player" records — one per NFL team
  const allTeams = await prisma.nflTeam.findMany()
  let dstCount = 0
  const dstOps = allTeams.map(team => {
    const dstGsisId = `DST-${team.abbreviation}`
    const data = {
      name: `${team.city} ${team.name}`,
      gsisId: dstGsisId,
      nflPosition: 'DST',
      nflTeamAbbr: team.abbreviation,
      isActive: true,
      sportId: sport.id,
      sourceProvider: 'clutch',
      sourceIngestedAt: new Date(),
    }
    return prisma.player.upsert({ where: { gsisId: dstGsisId }, create: data, update: data })
  })
  try {
    await prisma.$transaction(dstOps)
    dstCount = allTeams.length
  } catch (e) {
    console.warn(`[nflSync] DST batch failed, trying individually...`)
    for (const team of allTeams) {
      try {
        const dstGsisId = `DST-${team.abbreviation}`
        const data = { name: `${team.city} ${team.name}`, gsisId: dstGsisId, nflPosition: 'DST',
          nflTeamAbbr: team.abbreviation, isActive: true, sportId: sport.id, sourceProvider: 'clutch', sourceIngestedAt: new Date() }
        await prisma.player.upsert({ where: { gsisId: dstGsisId }, create: data, update: data })
        dstCount++
      } catch (e2) { console.warn(`[nflSync] DST failed for ${team.abbreviation}: ${e2.message}`) }
    }
  }
  console.log(`[nflSync] ${dstCount} DST records upserted`)

  const result = { total: rows.length, upserted, dstCount, skipped }
  console.log(`[nflSync] Player sync complete:`, result)
  return result
}

/**
 * Sync NFL schedule from nflverse
 * Creates NflGame records linked to NflTeam records
 */
async function syncSchedule(prisma, season) {
  const targetSeason = season || new Date().getFullYear()
  console.log(`[nflSync] Starting schedule sync for ${targetSeason}...`)

  const allGames = await nfl.getSchedule()
  const games = allGames.filter(r => Number(r.season) === targetSeason)
  await stageRaw(prisma, 'nfl_schedule', String(targetSeason), games.slice(0, 10))

  // Pre-load all team records into a lookup map
  const allTeams = await prisma.nflTeam.findMany()
  const teamMap = Object.fromEntries(allTeams.map(t => [t.abbreviation, t]))

  let upserted = 0, skipped = 0

  // Pre-filter valid games
  const eligible = []
  for (const row of games) {
    const externalId = row.game_id
    if (!externalId) { skipped++; continue }
    const homeTeam = teamMap[normalizeTeamAbbr(row.home_team)]
    const awayTeam = teamMap[normalizeTeamAbbr(row.away_team)]
    if (!homeTeam || !awayTeam) {
      console.warn(`[nflSync] Team not found: ${row.home_team} or ${row.away_team}`)
      skipped++; continue
    }
    eligible.push({ row, externalId, homeTeam, awayTeam })
  }

  console.log(`[nflSync] ${eligible.length} games to upsert (${skipped} skipped)`)

  // Batch upsert in chunks of 25
  const BATCH_SIZE = 25
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const ops = batch.map(({ row, externalId, homeTeam, awayTeam }) => {
      let status = 'UPCOMING'
      if (row.result !== undefined && row.result !== null && row.result !== '' && row.result !== 'NA') {
        status = 'FINAL'
      }
      const data = clean({
        externalId,
        season: Number(row.season),
        week: Number(row.week),
        gameType: row.game_type || 'REG',
        kickoff: row.gameday && row.gametime
          ? new Date(`${row.gameday}T${row.gametime}:00-05:00`)
          : new Date(`${row.gameday || '2026-09-01'}T13:00:00-05:00`),
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: num(row.home_score),
        awayScore: num(row.away_score),
        status,
        venue: row.stadium || null,
        surface: row.surface || null,
        roof: row.roof || null,
        weather: row.temp || row.wind ? {
          temp: num(row.temp),
          wind: num(row.wind),
          humidity: null,
          condition: row.weather_detail || null,
        } : null,
        spreadLine: num(row.spread_line),
        totalLine: num(row.total_line),
        homeMoneyline: num(row.home_moneyline),
        awayMoneyline: num(row.away_moneyline),
        sourceProvider: 'nflverse',
        sourceIngestedAt: new Date(),
      })
      return prisma.nflGame.upsert({
        where: { externalId },
        create: data,
        update: data,
      })
    })
    try {
      await prisma.$transaction(ops)
      upserted += batch.length
    } catch (e) {
      // Fallback: individual upserts
      for (const { row, externalId, homeTeam, awayTeam } of batch) {
        try {
          let status = 'UPCOMING'
          if (row.result !== undefined && row.result !== null && row.result !== '' && row.result !== 'NA') status = 'FINAL'
          const data = clean({ externalId, season: Number(row.season), week: Number(row.week), gameType: row.game_type || 'REG',
            kickoff: row.gameday && row.gametime ? new Date(`${row.gameday}T${row.gametime}:00-05:00`) : new Date(`${row.gameday || '2026-09-01'}T13:00:00-05:00`),
            homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, homeScore: num(row.home_score), awayScore: num(row.away_score), status,
            sourceProvider: 'nflverse', sourceIngestedAt: new Date() })
          await prisma.nflGame.upsert({ where: { externalId }, create: data, update: data })
          upserted++
        } catch (e2) {
          console.warn(`[nflSync] Game upsert failed for ${externalId}: ${e2.message}`)
          skipped++
        }
      }
    }
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= eligible.length) {
      console.log(`[nflSync] Schedule progress: ${Math.min(i + BATCH_SIZE, eligible.length)}/${eligible.length}`)
    }
  }

  const result = { season: targetSeason, total: games.length, upserted, skipped }
  console.log(`[nflSync] Schedule sync complete:`, result)
  return result
}

/**
 * Sync weekly player stats from nflverse
 * Populates NflPlayerGame with per-game stats for each player
 */
async function syncWeeklyStats(prisma, season) {
  const targetSeason = season || new Date().getFullYear()
  console.log(`[nflSync] Starting weekly stats sync for ${targetSeason}...`)

  const rows = await nfl.getWeeklyStats(targetSeason)
  await stageRaw(prisma, 'nfl_weekly_stats', String(targetSeason), rows.slice(0, 20))

  // Pre-load lookups: players by gsisId, games by season+week+team
  const allPlayers = await prisma.player.findMany({
    where: { gsisId: { not: null } },
    select: { id: true, gsisId: true },
  })
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.gsisId, p.id]))

  const allGames = await prisma.nflGame.findMany({
    where: { season: targetSeason },
    select: { id: true, week: true, homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
  })
  // Build game lookup: "week-TEAM" → gameId
  const gameMap = {}
  for (const g of allGames) {
    gameMap[`${g.week}-${g.homeTeam.abbreviation}`] = g.id
    gameMap[`${g.week}-${g.awayTeam.abbreviation}`] = g.id
  }

  let upserted = 0, skipped = 0

  // Pre-filter eligible rows
  const eligible = []
  for (const row of rows) {
    const gsisId = row.player_id
    if (!gsisId) { skipped++; continue }
    const playerId = playerMap[gsisId]
    if (!playerId) { skipped++; continue }
    const week = Number(row.week)
    const teamAbbr = normalizeTeamAbbr(row.recent_team || row.team || '')
    const gameId = gameMap[`${week}-${teamAbbr}`]
    if (!gameId) { skipped++; continue }
    eligible.push({ row, playerId, gameId, teamAbbr, week })
  }

  console.log(`[nflSync] ${eligible.length} stat rows to upsert (${skipped} skipped)`)

  // Batch upsert in chunks of 30
  const BATCH_SIZE = 30
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const ops = batch.map(({ row, playerId, gameId, teamAbbr }) => {
      const data = clean({
        playerId,
        gameId,
        teamAbbr,
        passAttempts: num(row.attempts),
        passCompletions: num(row.completions),
        passYards: num(row.passing_yards),
        passTds: num(row.passing_tds),
        interceptions: num(row.interceptions),
        sacked: num(row.sacks),
        sackYards: num(row.sack_yards),
        passerRating: num(row.passer_rating),
        rushAttempts: num(row.carries),
        rushYards: num(row.rushing_yards),
        rushTds: num(row.rushing_tds),
        fumbles: num(row.rushing_fumbles) !== null || num(row.receiving_fumbles) !== null
          ? (num(row.rushing_fumbles) || 0) + (num(row.receiving_fumbles) || 0) : null,
        fumblesLost: num(row.rushing_fumbles_lost) !== null || num(row.receiving_fumbles_lost) !== null
          ? (num(row.rushing_fumbles_lost) || 0) + (num(row.receiving_fumbles_lost) || 0) : null,
        targets: num(row.targets),
        receptions: num(row.receptions),
        recYards: num(row.receiving_yards),
        recTds: num(row.receiving_tds),
        targetShare: num(row.target_share),
        fantasyPtsStd: num(row.fantasy_points),
        fantasyPtsPpr: num(row.fantasy_points_ppr),
        fantasyPtsHalf: num(row.fantasy_points) !== null && num(row.fantasy_points_ppr) !== null
          ? (num(row.fantasy_points) + num(row.fantasy_points_ppr)) / 2 : null,
        sourceProvider: 'nflverse',
        sourceIngestedAt: new Date(),
      })
      return prisma.nflPlayerGame.upsert({
        where: { playerId_gameId: { playerId, gameId } },
        create: data,
        update: data,
      })
    })
    try {
      await prisma.$transaction(ops)
      upserted += batch.length
    } catch (e) {
      // Fallback: individual upserts
      for (const { row, playerId, gameId, teamAbbr, week } of batch) {
        try {
          const data = clean({ playerId, gameId, teamAbbr, passYards: num(row.passing_yards), passTds: num(row.passing_tds),
            rushYards: num(row.rushing_yards), rushTds: num(row.rushing_tds), recYards: num(row.receiving_yards), recTds: num(row.receiving_tds),
            receptions: num(row.receptions), fantasyPtsStd: num(row.fantasy_points), fantasyPtsPpr: num(row.fantasy_points_ppr),
            sourceProvider: 'nflverse', sourceIngestedAt: new Date() })
          await prisma.nflPlayerGame.upsert({ where: { playerId_gameId: { playerId, gameId } }, create: data, update: data })
          upserted++
        } catch (e2) {
          console.warn(`[nflSync] Stat upsert failed for ${row.player_name} week ${week}: ${e2.message}`)
          skipped++
        }
      }
    }
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= eligible.length) {
      console.log(`[nflSync] Stats progress: ${Math.min(i + BATCH_SIZE, eligible.length)}/${eligible.length}`)
    }
  }

  const result = { season: targetSeason, total: rows.length, upserted, skipped }
  console.log(`[nflSync] Weekly stats sync complete:`, result)
  return result
}

/**
 * Sync weekly rosters — updates player team assignment + depth chart info
 */
async function syncRosters(prisma, season) {
  const targetSeason = season || new Date().getFullYear()
  console.log(`[nflSync] Starting roster sync for ${targetSeason}...`)

  const rows = await nfl.getWeeklyRosters(targetSeason)
  await stageRaw(prisma, 'nfl_rosters', String(targetSeason), rows.slice(0, 20))

  // Get the latest week's roster data
  const maxWeek = Math.max(...rows.map(r => Number(r.week)).filter(n => !isNaN(n)))
  const latestRoster = rows.filter(r => Number(r.week) === maxWeek)

  let upserted = 0, skipped = 0

  // Pre-filter to players we have
  const eligible = []
  for (const row of latestRoster) {
    const gsisId = row.gsis_id || row.player_id
    if (!gsisId) { skipped++; continue }
    eligible.push({ row, gsisId })
  }

  // Batch update in chunks of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const ops = batch.map(({ row, gsisId }) =>
      prisma.player.updateMany({
        where: { gsisId },
        data: clean({
          nflTeamAbbr: row.team || null,
          nflPosition: mapPosition(row.position),
          nflNumber: num(row.jersey_number),
          isActive: row.status !== 'INA',
        }),
      })
    )
    try {
      const results = await prisma.$transaction(ops)
      upserted += results.reduce((sum, r) => sum + r.count, 0)
      skipped += results.reduce((sum, r) => sum + (r.count === 0 ? 1 : 0), 0)
    } catch (e) {
      // Fallback: individual updates
      for (const { row, gsisId } of batch) {
        try {
          await prisma.player.updateMany({ where: { gsisId }, data: clean({ nflTeamAbbr: row.team || null, isActive: row.status !== 'INA' }) })
          upserted++
        } catch (e2) { skipped++ }
      }
    }
  }

  const result = { season: targetSeason, week: maxWeek, updated: upserted, skipped }
  console.log(`[nflSync] Roster sync complete:`, result)
  return result
}

/**
 * Full backfill: sync a complete season's data (teams must be seeded first)
 */
async function backfillSeason(prisma, season) {
  console.log(`\n[nflSync] ═══ Starting full backfill for ${season} season ═══\n`)

  // 1. Ensure NFL sport exists
  await getOrCreateNflSport(prisma)

  // 2. Players first (needed for stat matching)
  const playerResult = await syncPlayers(prisma)

  // 3. Schedule (creates NflGame records)
  const scheduleResult = await syncSchedule(prisma, season)

  // 4. Weekly stats (links players to games)
  const statsResult = await syncWeeklyStats(prisma, season)

  // 5. Rosters (updates current team info)
  const rosterResult = await syncRosters(prisma, season)

  console.log(`\n[nflSync] ═══ Backfill complete for ${season} ═══`)
  console.log(`  Players: ${playerResult.created} created, ${playerResult.updated} updated`)
  console.log(`  Games: ${scheduleResult.created} created, ${scheduleResult.updated} updated`)
  console.log(`  Stats: ${statsResult.created} created, ${statsResult.updated} updated`)
  console.log(`  Rosters: ${rosterResult.updated} updated`)

  return { playerResult, scheduleResult, statsResult, rosterResult }
}

module.exports = {
  syncPlayers,
  syncSchedule,
  syncWeeklyStats,
  syncRosters,
  backfillSeason,
}
