/**
 * projectionSync.js — Clutch Rankings Data Pipeline
 *
 * Fetches projections from Sleeper API + ADP from Fantasy Football Calculator,
 * blends them into "Clutch Rankings" (60% projected pts rank + 40% ADP rank),
 * and stores in ClutchProjection table for pre-loading boards.
 *
 * Golf rankings use existing DataGolf + ClutchScore metrics.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SLEEPER_BASE = 'https://api.sleeper.app'
const FFC_BASE = 'https://fantasyfootballcalculator.com/api/v1'

// ── Sleeper API ─────────────────────────────────────────────────────────────

/**
 * Fetch all NFL players from Sleeper (5MB response — cache aggressively)
 * Returns { [sleeperId]: { full_name, team, position, ... } }
 */
async function fetchSleeperPlayers() {
  const res = await fetch(`${SLEEPER_BASE}/v1/players/nfl`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Sleeper players API failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch Sleeper season-long projections
 * week=0 for full season projections
 * Returns { [sleeperId]: { pts_ppr, pts_half_ppr, pts_std, ... stats } }
 */
async function fetchSleeperProjections(season, week = 0) {
  const url = `${SLEEPER_BASE}/projections/nfl/${season}/${week}?season_type=regular`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Sleeper projections API failed: ${res.status}`)
  return res.json()
}

// ── Fantasy Football Calculator ADP ────────────────────────────────────────

/**
 * Fetch ADP from FFC
 * format: 'ppr', 'half-ppr', 'standard'
 * Returns { players: [{ name, team, position, adp, ... }] }
 */
async function fetchFfcAdp(format = 'ppr', teams = 12, year = 2026) {
  // FFC uses 'half-ppr' not 'half_ppr'
  const ffcFormat = format === 'half_ppr' ? 'half-ppr' : format
  const url = `${FFC_BASE}/adp/${ffcFormat}?teams=${teams}&year=${year}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`FFC ADP API failed: ${res.status}`)
  return res.json()
}

// ── Player Matching ────────────────────────────────────────────────────────

/**
 * Normalize name for matching (lowercase, strip suffixes, periods, hyphens)
 */
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .replace(/['-]/g, '')
    .trim()
}

/**
 * Normalize team abbreviation (handle common discrepancies)
 */
function normalizeTeam(team) {
  if (!team) return ''
  const t = team.toUpperCase()
  const aliases = {
    'JAX': 'JAC', 'JAC': 'JAC',
    'WSH': 'WAS', 'WAS': 'WAS',
    'LVR': 'LV', 'LV': 'LV', 'OAK': 'LV',
    'LAR': 'LA', 'LA': 'LA',
  }
  return aliases[t] || t
}

/**
 * Match Sleeper players to Clutch player IDs and persist sleeperId
 * Returns Map<sleeperId, clutchPlayerId>
 */
async function matchSleeperToClutchPlayers(sleeperPlayers) {
  // Load all NFL players from our DB
  const clutchPlayers = await prisma.player.findMany({
    where: { nflPosition: { not: null } },
    select: { id: true, name: true, nflTeamAbbr: true, sleeperId: true },
  })

  // Build lookup by normalized name+team
  const nameTeamMap = new Map()
  const nameOnlyMap = new Map()
  for (const cp of clutchPlayers) {
    const key = `${normalizeName(cp.name)}|${normalizeTeam(cp.nflTeamAbbr)}`
    nameTeamMap.set(key, cp.id)
    const nameKey = normalizeName(cp.name)
    if (!nameOnlyMap.has(nameKey)) nameOnlyMap.set(nameKey, cp.id)
  }

  // Build already-linked map
  const alreadyLinked = new Map()
  for (const cp of clutchPlayers) {
    if (cp.sleeperId) alreadyLinked.set(cp.sleeperId, cp.id)
  }

  const result = new Map()
  const sleeperIdsToUpdate = []

  for (const [sleeperId, sp] of Object.entries(sleeperPlayers)) {
    if (!sp || !sp.active) continue
    const pos = sp.position
    if (!pos || !['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pos)) continue

    // Already linked?
    if (alreadyLinked.has(sleeperId)) {
      result.set(sleeperId, alreadyLinked.get(sleeperId))
      continue
    }

    const sleeperName = sp.full_name || `${sp.first_name || ''} ${sp.last_name || ''}`.trim()
    const sleeperTeam = sp.team

    // Try name+team match
    const key = `${normalizeName(sleeperName)}|${normalizeTeam(sleeperTeam)}`
    let clutchId = nameTeamMap.get(key)

    // Fallback: name-only match (less reliable, but catches traded players)
    if (!clutchId) {
      clutchId = nameOnlyMap.get(normalizeName(sleeperName))
    }

    if (clutchId) {
      result.set(sleeperId, clutchId)
      sleeperIdsToUpdate.push({ clutchId, sleeperId })
    }
  }

  // Batch-update sleeperId on matched players (persist for future fast matching)
  if (sleeperIdsToUpdate.length > 0) {
    const batchSize = 50
    for (let i = 0; i < sleeperIdsToUpdate.length; i += batchSize) {
      const batch = sleeperIdsToUpdate.slice(i, i + batchSize)
      await prisma.$transaction(
        batch.map(({ clutchId, sleeperId }) =>
          prisma.player.update({
            where: { id: clutchId },
            data: { sleeperId },
          })
        )
      )
    }
    console.log(`[projectionSync] Linked ${sleeperIdsToUpdate.length} new Sleeper IDs`)
  }

  return result
}

// ── Fantasy Point Calculation ──────────────────────────────────────────────

/**
 * Calculate projected fantasy points from Sleeper projection stats
 */
function calculateProjectedPts(stats, scoringFormat) {
  if (!stats) return 0
  let pts = 0

  // Passing
  pts += (stats.pass_yd || 0) * 0.04
  pts += (stats.pass_td || 0) * 4
  pts += (stats.pass_int || 0) * -1
  pts += (stats.pass_2pt || 0) * 2

  // Rushing
  pts += (stats.rush_yd || 0) * 0.1
  pts += (stats.rush_td || 0) * 6
  pts += (stats.rush_2pt || 0) * 2
  pts += (stats.fum_lost || 0) * -2

  // Receiving
  pts += (stats.rec_yd || 0) * 0.1
  pts += (stats.rec_td || 0) * 6
  pts += (stats.rec_2pt || 0) * 2

  // Reception bonus by format
  const rec = stats.rec || 0
  if (scoringFormat === 'ppr') pts += rec * 1.0
  else if (scoringFormat === 'half_ppr') pts += rec * 0.5

  // Kicking
  pts += (stats.fgm || 0) * 3
  pts += (stats.xpm || 0) * 1
  pts += (stats.fgmiss || 0) * -1

  return Math.round(pts * 10) / 10
}

// ── Clutch Rankings Computation ────────────────────────────────────────────

/**
 * Compute and store NFL Clutch Rankings for a given scoring format
 *
 * Strategy:
 * - During offseason (no Sleeper projections): use our 2024 NflPlayerGame data
 *   (fantasy PPG from actual stats) as the primary signal
 * - During preseason/season: Sleeper projections become the primary signal
 * - ADP from Sleeper's `adp_dd_ppr` field supplements when available
 * - Formula: 60% fantasy PPG rank + 40% ADP rank (when ADP exists)
 */
async function computeNflClutchRankings(scoringFormat = 'ppr', season = 2026) {
  console.log(`[projectionSync] Computing NFL Clutch Rankings (${scoringFormat}, ${season})...`)
  const { calculateFantasyPoints } = require('./nflScoringService')

  // 1. Fetch Sleeper players for metadata + ADP + Sleeper ID linking
  let sleeperPlayers
  try {
    sleeperPlayers = await fetchSleeperPlayers()
  } catch (err) {
    console.warn('[projectionSync] Sleeper players API failed:', err.message)
    sleeperPlayers = {}
  }

  // Link Sleeper IDs to our players (persists for future use)
  if (Object.keys(sleeperPlayers).length > 0) {
    await matchSleeperToClutchPlayers(sleeperPlayers)
  }

  // 2. Try Sleeper season projections (may have real data during preseason)
  let sleeperProjections
  try {
    sleeperProjections = await fetchSleeperProjections(season)
  } catch (err) {
    console.warn('[projectionSync] Sleeper projections failed:', err.message)
    sleeperProjections = {}
  }

  // Check if Sleeper has real stat projections (not just ADP)
  let hasSleeperStats = false
  for (const [, proj] of Object.entries(sleeperProjections)) {
    const s = proj?.stats
    if (s && (s.pass_yd > 0 || s.rush_yd > 0 || s.rec_yd > 0)) {
      hasSleeperStats = true
      break
    }
  }

  // 3. Build ADP map from Sleeper projections (adp_dd_ppr field)
  const adpMap = new Map() // clutchPlayerId → adpRank
  const clutchPlayers = await prisma.player.findMany({
    where: { nflPosition: { not: null } },
    select: { id: true, name: true, nflTeamAbbr: true, nflPosition: true, sleeperId: true },
  })
  const sleeperIdToClutch = new Map()
  for (const cp of clutchPlayers) {
    if (cp.sleeperId) sleeperIdToClutch.set(cp.sleeperId, cp.id)
  }

  // Extract ADP from Sleeper projections
  const adpFormatKey = scoringFormat === 'ppr' ? 'adp_dd_ppr'
    : scoringFormat === 'half_ppr' ? 'adp_dd_half_ppr'
    : 'adp_dd_std'
  const adpEntries = []
  for (const [sleeperId, proj] of Object.entries(sleeperProjections)) {
    const adpVal = proj?.stats?.[adpFormatKey] || proj?.stats?.adp_dd_ppr
    const clutchId = sleeperIdToClutch.get(sleeperId)
    if (clutchId && adpVal && adpVal < 500) { // filter out 1000 = unranked
      adpEntries.push({ clutchId, adp: adpVal })
    }
  }
  adpEntries.sort((a, b) => a.adp - b.adp)
  adpEntries.forEach((e, i) => adpMap.set(e.clutchId, i + 1))
  console.log(`[projectionSync] Found ${adpEntries.length} players with ADP data`)

  // 4. Primary signal: fantasy PPG from our own data
  // Use NflPlayerGame from the most recent season we have data for
  const allGames = await prisma.nflPlayerGame.findMany({
    where: {
      playerId: { in: clutchPlayers.map(p => p.id) },
    },
    include: { game: { select: { season: true } } },
  })

  // Group by player, use latest season
  const playerPPG = new Map()
  const byPlayer = new Map()
  for (const g of allGames) {
    if (!byPlayer.has(g.playerId)) byPlayer.set(g.playerId, [])
    byPlayer.get(g.playerId).push(g)
  }
  for (const [pid, games] of byPlayer) {
    const maxSeason = Math.max(...games.map(g => g.game.season))
    const seasonGames = games.filter(g => g.game.season === maxSeason)
    let totalPts = 0
    for (const g of seasonGames) {
      const { total } = calculateFantasyPoints(g, scoringFormat)
      totalPts += total
    }
    const gp = seasonGames.length
    if (gp >= 4) { // minimum 4 games to be ranked
      playerPPG.set(pid, {
        totalPts: Math.round(totalPts * 10) / 10,
        gamesPlayed: gp,
        ppg: Math.round((totalPts / gp) * 100) / 100,
      })
    }
  }
  console.log(`[projectionSync] ${playerPPG.size} players with fantasy PPG data`)

  // If Sleeper has real projections, use those instead for the primary signal
  if (hasSleeperStats) {
    console.log('[projectionSync] Using Sleeper stat projections as primary signal')
    for (const [sleeperId, proj] of Object.entries(sleeperProjections)) {
      const clutchId = sleeperIdToClutch.get(sleeperId)
      if (!clutchId) continue
      const pts = calculateProjectedPts(proj?.stats, scoringFormat)
      if (pts > 0) {
        playerPPG.set(clutchId, { totalPts: pts, gamesPlayed: 17, ppg: pts / 17 })
      }
    }
  }

  // 5. Build ranked list: sort by fantasy PPG (desc)
  const playerLookup = new Map(clutchPlayers.map(p => [p.id, p]))
  const rankedPlayers = []
  for (const [pid, data] of playerPPG) {
    const player = playerLookup.get(pid)
    if (!player) continue
    rankedPlayers.push({
      clutchPlayerId: pid,
      projectedPts: data.totalPts,
      ppg: data.ppg,
      position: player.nflPosition,
    })
  }
  rankedPlayers.sort((a, b) => b.ppg - a.ppg)

  // Assign PPG rank
  const ppgRankMap = new Map()
  rankedPlayers.forEach((p, i) => ppgRankMap.set(p.clutchPlayerId, i + 1))

  // 6. Blend: 60% PPG rank + 40% ADP rank
  const blendedRankings = rankedPlayers.map(p => {
    const ppgRank = ppgRankMap.get(p.clutchPlayerId) || 999
    const adpRank = adpMap.get(p.clutchPlayerId) || ppgRank // fallback to PPG rank if no ADP
    const hasAdp = adpMap.has(p.clutchPlayerId)
    const blendedScore = hasAdp
      ? (ppgRank * 0.6) + (adpRank * 0.4)
      : ppgRank // use PPG rank only if no ADP
    return {
      ...p,
      adpRank: hasAdp ? adpRank : null,
      blendedScore,
    }
  })

  blendedRankings.sort((a, b) => a.blendedScore - b.blendedScore)

  // 7. Store in ClutchProjection
  const now = new Date()
  const upsertData = blendedRankings.map((p, i) => ({
    sport: 'nfl',
    scoringFormat,
    season,
    week: null,
    playerId: p.clutchPlayerId,
    projectedPts: p.projectedPts,
    adpRank: p.adpRank,
    clutchRank: i + 1,
    position: p.position,
    metadata: { blendedScore: p.blendedScore, ppg: p.ppg },
    computedAt: now,
  }))

  await prisma.clutchProjection.deleteMany({
    where: { sport: 'nfl', scoringFormat, season, week: null },
  })

  const batchSize = 100
  for (let i = 0; i < upsertData.length; i += batchSize) {
    await prisma.clutchProjection.createMany({ data: upsertData.slice(i, i + batchSize) })
  }

  console.log(`[projectionSync] Stored ${upsertData.length} NFL Clutch Rankings (${scoringFormat})`)
  return { success: true, count: upsertData.length }
}

/**
 * Compute Golf Clutch Rankings from existing DataGolf + ClutchScore data
 */
async function computeGolfClutchRankings(season = 2026) {
  console.log(`[projectionSync] Computing Golf Clutch Rankings (${season})...`)

  // Get all golf players with rankings/metrics
  const players = await prisma.player.findMany({
    where: {
      sportId: { not: null },
      datagolfRank: { not: null },
    },
    select: {
      id: true,
      name: true,
      datagolfRank: true,
      datagolfSkill: true,
      owgrRank: true,
    },
    orderBy: { datagolfRank: 'asc' },
    take: 250,
  })

  if (players.length === 0) {
    console.log('[projectionSync] No golf players with rankings found')
    return { success: true, count: 0 }
  }

  // Get ClutchScore metrics (CPI + Form Score)
  const playerIds = players.map(p => p.id)
  const scores = await prisma.clutchScore.findMany({
    where: { playerId: { in: playerIds }, tournamentId: null },
    orderBy: { computedAt: 'desc' },
    distinct: ['playerId'],
    select: { playerId: true, cpi: true, formScore: true },
  })
  const scoreMap = new Map(scores.map(s => [s.playerId, s]))

  // Blend: DataGolf rank weighted by CPI and Form Score
  const ranked = players.map((p, i) => {
    const cs = scoreMap.get(p.id)
    const baseRank = i + 1 // already sorted by datagolfRank
    // CPI bonus: positive CPI moves player up, negative moves down
    const cpiAdjust = cs?.cpi ? -(cs.cpi * 3) : 0 // CPI of +1.0 = 3 spots up
    // Form bonus: form > 70 moves up, < 30 moves down
    const formAdjust = cs?.formScore ? -((cs.formScore - 50) / 50) * 2 : 0
    const adjustedRank = baseRank + cpiAdjust + formAdjust
    return {
      playerId: p.id,
      projectedPts: p.datagolfSkill || null,
      adjustedRank,
    }
  })

  ranked.sort((a, b) => a.adjustedRank - b.adjustedRank)

  const now = new Date()
  const data = ranked.map((r, i) => ({
    sport: 'golf',
    scoringFormat: 'overall',
    season,
    week: null,
    playerId: r.playerId,
    projectedPts: r.projectedPts,
    adpRank: null,
    clutchRank: i + 1,
    position: null,
    metadata: { adjustedRank: r.adjustedRank },
    computedAt: now,
  }))

  await prisma.clutchProjection.deleteMany({
    where: { sport: 'golf', scoringFormat: 'overall', season, week: null },
  })

  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    await prisma.clutchProjection.createMany({ data: data.slice(i, i + batchSize) })
  }

  console.log(`[projectionSync] Stored ${data.length} Golf Clutch Rankings`)
  return { success: true, count: data.length }
}

/**
 * Compute all Clutch Rankings (called by cron)
 */
async function syncAllProjections(season = 2026) {
  console.log(`[projectionSync] Starting full projection sync for ${season}...`)
  const results = {}

  // NFL: compute for all 3 scoring formats
  for (const format of ['ppr', 'half_ppr', 'standard']) {
    try {
      results[`nfl_${format}`] = await computeNflClutchRankings(format, season)
    } catch (err) {
      console.error(`[projectionSync] NFL ${format} failed:`, err.message)
      results[`nfl_${format}`] = { success: false, error: err.message }
    }
  }

  // Golf
  try {
    results.golf = await computeGolfClutchRankings(season)
  } catch (err) {
    console.error('[projectionSync] Golf failed:', err.message)
    results.golf = { success: false, error: err.message }
  }

  console.log('[projectionSync] Full sync complete:', JSON.stringify(results))
  return results
}

/**
 * Get cached Clutch Rankings for a sport + format
 */
async function getClutchRankings(sport, scoringFormat, season = 2026, limit = 300) {
  const rankings = await prisma.clutchProjection.findMany({
    where: { sport, scoringFormat, season, week: null },
    orderBy: { clutchRank: 'asc' },
    take: limit,
    include: {
      player: {
        select: {
          id: true,
          name: true,
          headshotUrl: true,
          nflPosition: true,
          nflTeamAbbr: true,
          owgrRank: true,
          datagolfRank: true,
        },
      },
    },
  })
  return rankings
}

/**
 * Get ADP-only rankings (FFC data stored as clutchRank = adpRank)
 * For "Start from ADP" boards
 */
async function getAdpRankings(scoringFormat, season = 2026, limit = 300) {
  // If we have ADP data, use it; otherwise fall back to Clutch Rankings
  const rankings = await prisma.clutchProjection.findMany({
    where: {
      sport: 'nfl',
      scoringFormat,
      season,
      week: null,
      adpRank: { not: null },
    },
    orderBy: { adpRank: 'asc' },
    take: limit,
    include: {
      player: {
        select: {
          id: true,
          name: true,
          headshotUrl: true,
          nflPosition: true,
          nflTeamAbbr: true,
        },
      },
    },
  })
  return rankings
}

module.exports = {
  syncAllProjections,
  computeNflClutchRankings,
  computeGolfClutchRankings,
  getClutchRankings,
  getAdpRankings,
  fetchSleeperPlayers,
  fetchSleeperProjections,
  fetchFfcAdp,
}
