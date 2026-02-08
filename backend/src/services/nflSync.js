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

  let created = 0, updated = 0, skipped = 0

  for (const row of rows) {
    const gsisId = row.gsis_id
    if (!gsisId || !row.display_name) {
      skipped++
      continue
    }

    // Only sync active skill players + kickers (skip retired, practice squad inactive)
    const status = (row.status || '').toUpperCase()
    if (status === 'RET' || status === 'RES') {
      skipped++
      continue
    }

    const position = mapPosition(row.position)
    // Focus on fantasy-relevant positions
    if (!['QB', 'RB', 'WR', 'TE', 'K'].includes(position)) {
      skipped++
      continue
    }

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
      nflTeamAbbr: row.team_abbr || null,
      nflNumber: num(row.jersey_number),
      birthDate: row.birth_date ? new Date(row.birth_date) : null,
      height: row.height ? `${Math.floor(row.height / 12)}'${row.height % 12}"` : null,
      weight: num(row.weight),
      college: row.college || null,
      headshotUrl: row.headshot_url || row.headshot || null,
      isActive: status !== 'INA',
      sportId: sport.id,
      sourceProvider: 'nflverse',
      sourceIngestedAt: new Date(),
    })

    try {
      const existing = await prisma.player.findUnique({ where: { gsisId } })
      if (existing) {
        await prisma.player.update({ where: { gsisId }, data })
        updated++
      } else {
        await prisma.player.create({ data })
        created++
      }
    } catch (e) {
      // Unique constraint collision on name — try update by gsisId
      console.warn(`[nflSync] Player upsert failed for ${row.display_name}: ${e.message}`)
      skipped++
    }
  }

  const result = { total: rows.length, created, updated, skipped }
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

  let created = 0, updated = 0, skipped = 0

  for (const row of games) {
    const externalId = row.game_id
    if (!externalId) { skipped++; continue }

    // Look up team records
    const homeTeam = await prisma.nflTeam.findUnique({ where: { abbreviation: row.home_team } })
    const awayTeam = await prisma.nflTeam.findUnique({ where: { abbreviation: row.away_team } })
    if (!homeTeam || !awayTeam) {
      console.warn(`[nflSync] Team not found: ${row.home_team} or ${row.away_team}`)
      skipped++
      continue
    }

    // Determine game status
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

    try {
      const existing = await prisma.nflGame.findUnique({ where: { externalId } })
      if (existing) {
        await prisma.nflGame.update({ where: { externalId }, data })
        updated++
      } else {
        await prisma.nflGame.create({ data })
        created++
      }
    } catch (e) {
      console.warn(`[nflSync] Game upsert failed for ${externalId}: ${e.message}`)
      skipped++
    }
  }

  const result = { season: targetSeason, total: games.length, created, updated, skipped }
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

  let created = 0, updated = 0, skipped = 0

  for (const row of rows) {
    // Match player by gsis_id → our gsisId field
    const gsisId = row.player_id
    if (!gsisId) { skipped++; continue }

    const player = await prisma.player.findUnique({ where: { gsisId } })
    if (!player) {
      skipped++ // Player not yet synced
      continue
    }

    // Find the corresponding game
    const week = Number(row.week)
    const teamAbbr = row.recent_team || row.team || ''
    const game = await prisma.nflGame.findFirst({
      where: {
        season: targetSeason,
        week,
        OR: [
          { homeTeam: { abbreviation: teamAbbr } },
          { awayTeam: { abbreviation: teamAbbr } },
        ],
      },
    })

    if (!game) {
      skipped++ // Game not yet synced for this week
      continue
    }

    const data = clean({
      playerId: player.id,
      gameId: game.id,
      teamAbbr,

      // Passing
      passAttempts: num(row.attempts),
      passCompletions: num(row.completions),
      passYards: num(row.passing_yards),
      passTds: num(row.passing_tds),
      interceptions: num(row.interceptions),
      sacked: num(row.sacks),
      sackYards: num(row.sack_yards),
      passerRating: num(row.passer_rating),

      // Rushing
      rushAttempts: num(row.carries),
      rushYards: num(row.rushing_yards),
      rushTds: num(row.rushing_tds),
      fumbles: num(row.rushing_fumbles) !== null || num(row.receiving_fumbles) !== null
        ? (num(row.rushing_fumbles) || 0) + (num(row.receiving_fumbles) || 0)
        : null,
      fumblesLost: num(row.rushing_fumbles_lost) !== null || num(row.receiving_fumbles_lost) !== null
        ? (num(row.rushing_fumbles_lost) || 0) + (num(row.receiving_fumbles_lost) || 0)
        : null,

      // Receiving
      targets: num(row.targets),
      receptions: num(row.receptions),
      recYards: num(row.receiving_yards),
      recTds: num(row.receiving_tds),

      // Advanced
      targetShare: num(row.target_share),

      // Fantasy (nflverse pre-computes these)
      fantasyPtsStd: num(row.fantasy_points),
      fantasyPtsPpr: num(row.fantasy_points_ppr),
      fantasyPtsHalf: num(row.fantasy_points) !== null && num(row.fantasy_points_ppr) !== null
        ? (num(row.fantasy_points) + num(row.fantasy_points_ppr)) / 2
        : null,

      sourceProvider: 'nflverse',
      sourceIngestedAt: new Date(),
    })

    try {
      const existing = await prisma.nflPlayerGame.findUnique({
        where: { playerId_gameId: { playerId: player.id, gameId: game.id } },
      })
      if (existing) {
        await prisma.nflPlayerGame.update({
          where: { playerId_gameId: { playerId: player.id, gameId: game.id } },
          data,
        })
        updated++
      } else {
        await prisma.nflPlayerGame.create({ data })
        created++
      }
    } catch (e) {
      console.warn(`[nflSync] Stat upsert failed for ${row.player_name} week ${week}: ${e.message}`)
      skipped++
    }
  }

  const result = { season: targetSeason, total: rows.length, created, updated, skipped }
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

  let updated = 0, skipped = 0

  for (const row of latestRoster) {
    const gsisId = row.gsis_id || row.player_id
    if (!gsisId) { skipped++; continue }

    const player = await prisma.player.findUnique({ where: { gsisId } })
    if (!player) { skipped++; continue }

    try {
      await prisma.player.update({
        where: { gsisId },
        data: clean({
          nflTeamAbbr: row.team || null,
          nflPosition: mapPosition(row.position) || player.nflPosition,
          nflNumber: num(row.jersey_number) || player.nflNumber,
          isActive: row.status !== 'INA',
        }),
      })
      updated++
    } catch (e) {
      skipped++
    }
  }

  const result = { season: targetSeason, week: maxWeek, updated, skipped }
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
