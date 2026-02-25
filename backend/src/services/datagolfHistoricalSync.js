/**
 * DataGolf Historical Strokes Gained Backfill
 *
 * Fills empty SG columns on Performance and RoundScore records using
 * DataGolf's historical-raw-data/rounds endpoint (per-round SG breakdowns).
 *
 * Key insight: DG event_id is per-tournament-name (same ID across all years).
 * We build a name→eventId lookup from DG's event list, then match our
 * per-year tournament records by name to find the right eventId+year combo.
 *
 * Three functions:
 *   1. mapDataGolfEvents(prisma) — Build lookup and report match stats
 *   2. backfillTournamentSG(prisma, tournament, dgEventId) — Backfill SG for one tournament
 *   3. backfillAllSG(prisma, options) — Orchestrate full backfill with rate limiting
 */

const crypto = require('crypto')
const dg = require('./datagolfClient')
const { stageRaw } = require('./datagolfSync')

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const genId = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24)

/** Normalize tournament name for fuzzy matching */
function normalizeTournamentName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/the\s+/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/presented\s+by\s+.*/i, '')
    .replace(/sponsored\s+by\s+.*/i, '')
    .replace(/invitational/g, 'inv')
    .replace(/championship/g, 'champ')
    .replace(/tournament/g, '')
    .replace(/[''`\-]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize player name for matching (handles accents, suffixes) */
function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
    .replace(/å/g, 'a').replace(/Å/g, 'A')
    .replace(/ð/g, 'd').replace(/Ð/g, 'D')
    .replace(/þ/g, 'th').replace(/Þ/g, 'Th')
    .toLowerCase()
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Run an array of Prisma operations in batched transactions (chunks of 50) */
async function batchTransaction(prisma, operations, chunkSize = 50) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize)
    await prisma.$transaction(chunk)
  }
}

/** Compute token overlap ratio between two normalized strings */
function tokenOverlap(a, b) {
  const tokensA = new Set(a.split(' ').filter(Boolean))
  const tokensB = new Set(b.split(' ').filter(Boolean))
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  return overlap / Math.min(tokensA.size, tokensB.size)
}

// ─── 1. Build DG Event Lookup ────────────────────────────────────────────────

/**
 * Fetch DG event list and build a lookup of { normalizedName → eventId }
 * for events that have SG data. Also returns the full event list for
 * year-specific matching.
 *
 * Returns: { lookup, sgEventsByYear, stats }
 *   lookup: Map<normalizedName, eventId>
 *   sgEventsByYear: Map<year, Array<{event_id, event_name, sg_categories}>>
 */
async function buildDgEventLookup(prisma) {
  console.log('[DG-Map] Fetching DataGolf historical event list...')
  const eventList = await dg.getHistoricalEventList('pga')
  await stageRaw(prisma, 'datagolf', 'historical_event_list', null, eventList)

  const events = Array.isArray(eventList) ? eventList : eventList?.events || eventList?.data || []
  console.log(`[DG-Map] ${events.length} total events from DataGolf`)

  // Filter to events with SG data
  const sgEvents = events.filter(e => e.sg_categories !== 'no')
  console.log(`[DG-Map] ${sgEvents.length} events have SG data (full or partial)`)

  // Build normalized name → event_id lookup (many names map to one event_id)
  const lookup = new Map()
  for (const evt of sgEvents) {
    const norm = normalizeTournamentName(evt.event_name)
    if (norm && !lookup.has(norm)) {
      lookup.set(norm, String(evt.event_id))
    }
  }

  // Build year → events index for precise matching
  const sgEventsByYear = new Map()
  for (const evt of sgEvents) {
    const yr = evt.calendar_year
    if (!sgEventsByYear.has(yr)) sgEventsByYear.set(yr, [])
    sgEventsByYear.get(yr).push(evt)
  }

  return { lookup, sgEventsByYear, totalEvents: events.length, sgCount: sgEvents.length }
}

/**
 * Map DG events to our tournaments and report match stats.
 * This is the diagnostic/reporting function — backfillAllSG does the actual work.
 */
async function mapDataGolfEvents(prisma) {
  const { lookup, sgEventsByYear, totalEvents, sgCount } = await buildDgEventLookup(prisma)

  // Load all our tournaments
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true, datagolfId: true, startDate: true },
  })

  let matched = 0
  let alreadyMapped = 0
  let noMatch = 0

  for (const t of tournaments) {
    if (t.datagolfId) {
      alreadyMapped++
      continue
    }

    const year = t.startDate ? new Date(t.startDate).getFullYear() : null
    const dgEventId = findDgEventId(t.name, year, lookup, sgEventsByYear)
    if (dgEventId) {
      matched++
    } else {
      noMatch++
    }
  }

  const result = {
    totalDgEvents: totalEvents,
    withSgData: sgCount,
    tournamentsInDb: tournaments.length,
    alreadyHaveDatagolfId: alreadyMapped,
    matchableByName: matched,
    noMatch,
  }
  console.log(`[DG-Map] Results:`, result)
  return result
}

/**
 * Find the DG event_id for a tournament by name matching.
 * First tries the year-specific event list, then falls back to the general lookup.
 */
function findDgEventId(tournamentName, year, lookup, sgEventsByYear) {
  const normName = normalizeTournamentName(tournamentName)
  if (!normName) return null

  // Try year-specific events first (more precise)
  if (year && sgEventsByYear.has(year)) {
    for (const evt of sgEventsByYear.get(year)) {
      const evtNorm = normalizeTournamentName(evt.event_name)
      if (evtNorm === normName ||
          evtNorm.includes(normName) ||
          normName.includes(evtNorm) ||
          tokenOverlap(evtNorm, normName) >= 0.6) {
        return String(evt.event_id)
      }
    }
  }

  // Fall back to general lookup
  if (lookup.has(normName)) return lookup.get(normName)

  // Try substring matching on the lookup
  for (const [key, eventId] of lookup) {
    if (key.includes(normName) || normName.includes(key)) return eventId
  }

  return null
}

// ─── 2. Backfill SG for One Tournament ──────────────────────────────────────

// Cached player lookups (loaded once, reused across tournaments)
let _playerByDgId = null
let _playerByName = null

async function loadPlayerLookups(prisma) {
  if (_playerByDgId && _playerByName) return { playerByDgId: _playerByDgId, playerByName: _playerByName }

  const allPlayers = await prisma.player.findMany({
    where: { OR: [{ datagolfId: { not: null } }, { name: { not: '' } }] },
    select: { id: true, datagolfId: true, name: true, firstName: true, lastName: true },
  })
  _playerByDgId = new Map()
  _playerByName = new Map()
  for (const p of allPlayers) {
    if (p.datagolfId) _playerByDgId.set(p.datagolfId, p.id)
    if (p.name) _playerByName.set(normalizeName(p.name), p.id)
    if (p.firstName && p.lastName) {
      _playerByName.set(normalizeName(`${p.firstName} ${p.lastName}`), p.id)
    }
  }
  console.log(`[DG-SG] Player lookup loaded: ${_playerByDgId.size} by dgId, ${_playerByName.size} by name`)
  return { playerByDgId: _playerByDgId, playerByName: _playerByName }
}

async function backfillTournamentSG(prisma, tournament, dgEventId) {
  const year = new Date(tournament.startDate).getFullYear()
  const eventId = dgEventId || tournament.datagolfId
  if (!eventId) {
    console.warn(`[DG-SG] No DG event ID for "${tournament.name}" — skipping`)
    return { playersUpdated: 0, roundsUpserted: 0, playersNotFound: [] }
  }

  console.log(`[DG-SG] Fetching rounds for "${tournament.name}" (eventId=${eventId}, ${year})...`)

  let roundsData
  try {
    roundsData = await dg.getHistoricalRounds('pga', eventId, year)
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`[DG-SG] No data for "${tournament.name}" (404)`)
      return { playersUpdated: 0, roundsUpserted: 0, playersNotFound: [] }
    }
    throw err
  }

  // Response format: { scores: [ { dg_id, player_name, round_1: {...}, round_2: {...}, ... } ] }
  const scores = roundsData?.scores || []
  if (scores.length === 0) {
    console.log(`[DG-SG] No round data for "${tournament.name}"`)
    return { playersUpdated: 0, roundsUpserted: 0, playersNotFound: [] }
  }

  // Use cached player lookups
  const { playerByDgId, playerByName } = await loadPlayerLookups(prisma)

  const roundRows = []  // raw values for bulk SQL
  const perfUpdates = [] // { playerId, sgTotal, sgPutting, ... }
  const playersNotFound = []
  let playersUpdated = 0

  for (const entry of scores) {
    const dgId = String(entry.dg_id)

    // Match player: datagolfId first, then normalized name fallback
    let playerId = playerByDgId.get(dgId)
    if (!playerId && entry.player_name) {
      const parts = entry.player_name.split(',').map(s => s.trim())
      const fullName = parts.length === 2 ? `${parts[1]} ${parts[0]}` : entry.player_name
      playerId = playerByName.get(normalizeName(fullName))
      if (!playerId) playerId = playerByName.get(normalizeName(entry.player_name))
    }
    if (!playerId) {
      playersNotFound.push({ dgId, name: entry.player_name || 'unknown' })
      continue
    }

    let sgTotal = 0, sgPutt = 0, sgArg = 0, sgApp = 0, sgOtt = 0, sgT2g = 0
    let hasAnySg = false

    for (let roundNum = 1; roundNum <= 4; roundNum++) {
      const r = entry[`round_${roundNum}`]
      if (!r || typeof r !== 'object') continue

      if (r.sg_total != null) { sgTotal += r.sg_total; hasAnySg = true }
      if (r.sg_putt != null) sgPutt += r.sg_putt
      if (r.sg_arg != null) sgArg += r.sg_arg
      if (r.sg_app != null) sgApp += r.sg_app
      if (r.sg_ott != null) sgOtt += r.sg_ott
      if (r.sg_t2g != null) sgT2g += r.sg_t2g

      let toPar = null
      if (r.score != null && r.course_par != null) toPar = r.score - r.course_par

      roundRows.push({
        tournamentId: tournament.id,
        playerId,
        roundNumber: roundNum,
        score: r.score ?? null,
        toPar,
        sgTotal: r.sg_total ?? null,
        sgPutting: r.sg_putt ?? null,
        sgAroundGreen: r.sg_arg ?? null,
        sgApproach: r.sg_app ?? null,
        sgOffTee: r.sg_ott ?? null,
        birdies: r.birdies ?? 0,
        eagles: r.eagles_or_better ?? 0,
        bogeys: r.bogies ?? 0,
        pars: r.pars ?? 0,
        doubleBogeys: r.doubles_or_worse ?? 0,
        putts: typeof r.putts === 'number' ? r.putts : null,
        greensHit: typeof r.gir === 'number' && r.gir > 1 ? Math.round(r.gir) : null,
        avgDrivingDist: typeof r.driving_dist === 'number' ? r.driving_dist : null,
      })
    }

    if (hasAnySg) {
      perfUpdates.push({
        playerId,
        sgTotal: Math.round(sgTotal * 1000) / 1000,
        sgPutting: Math.round(sgPutt * 1000) / 1000,
        sgAroundGreen: Math.round(sgArg * 1000) / 1000,
        sgApproach: Math.round(sgApp * 1000) / 1000,
        sgOffTee: Math.round(sgOtt * 1000) / 1000,
        sgTeeToGreen: Math.round(sgT2g * 1000) / 1000,
      })
      playersUpdated++
    }
  }

  // Bulk upsert rounds via raw SQL (single query per chunk of 100)
  if (roundRows.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < roundRows.length; i += CHUNK) {
      const chunk = roundRows.slice(i, i + CHUNK)
      const now = new Date().toISOString()
      const values = chunk.map(r =>
        `('${genId()}', '${r.tournamentId}', '${r.playerId}', ${r.roundNumber}, ${r.score ?? 'NULL'}, ${r.toPar ?? 'NULL'}, ${r.sgTotal ?? 'NULL'}, ${r.sgPutting ?? 'NULL'}, ${r.sgAroundGreen ?? 'NULL'}, ${r.sgApproach ?? 'NULL'}, ${r.sgOffTee ?? 'NULL'}, ${r.birdies}, ${r.eagles}, ${r.bogeys}, ${r.pars}, ${r.doubleBogeys}, ${r.putts ?? 'NULL'}, ${r.greensHit ?? 'NULL'}, ${r.avgDrivingDist ?? 'NULL'}, 1, 0, 0, false, '${now}', '${now}')`
      ).join(',\n')

      await prisma.$executeRawUnsafe(`
        INSERT INTO round_scores (id, "tournamentId", "playerId", "roundNumber", score, "toPar", "sgTotal", "sgPutting", "sgAroundGreen", "sgApproach", "sgOffTee", birdies, eagles, bogeys, pars, "doubleBogeys", putts, "greensHit", "avgDrivingDist", "startingHole", "worseThanDouble", "consecutiveBirdies", "bogeyFree", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("tournamentId", "playerId", "roundNumber")
        DO UPDATE SET
          score = EXCLUDED.score,
          "toPar" = EXCLUDED."toPar",
          "sgTotal" = EXCLUDED."sgTotal",
          "sgPutting" = EXCLUDED."sgPutting",
          "sgAroundGreen" = EXCLUDED."sgAroundGreen",
          "sgApproach" = EXCLUDED."sgApproach",
          "sgOffTee" = EXCLUDED."sgOffTee",
          birdies = EXCLUDED.birdies,
          eagles = EXCLUDED.eagles,
          bogeys = EXCLUDED.bogeys,
          pars = EXCLUDED.pars,
          "doubleBogeys" = EXCLUDED."doubleBogeys",
          putts = EXCLUDED.putts,
          "greensHit" = EXCLUDED."greensHit",
          "avgDrivingDist" = EXCLUDED."avgDrivingDist"
      `)
    }
  }

  // Bulk update performances via raw SQL CASE statements (single query)
  if (perfUpdates.length > 0) {
    const playerIds = perfUpdates.map(p => `'${p.playerId}'`).join(',')
    const buildCase = (field) => perfUpdates.map(p => `WHEN "playerId" = '${p.playerId}' THEN ${p[field]}`).join(' ')

    await prisma.$executeRawUnsafe(`
      UPDATE performances SET
        "sgTotal" = CASE ${buildCase('sgTotal')} END,
        "sgPutting" = CASE ${buildCase('sgPutting')} END,
        "sgAroundGreen" = CASE ${buildCase('sgAroundGreen')} END,
        "sgApproach" = CASE ${buildCase('sgApproach')} END,
        "sgOffTee" = CASE ${buildCase('sgOffTee')} END,
        "sgTeeToGreen" = CASE ${buildCase('sgTeeToGreen')} END
      WHERE "tournamentId" = '${tournament.id}'
        AND "playerId" IN (${playerIds})
    `)
  }

  if (playersNotFound.length > 0 && playersNotFound.length <= 10) {
    console.log(`[DG-SG] Unmatched players: ${playersNotFound.map(p => p.name).join(', ')}`)
  } else if (playersNotFound.length > 10) {
    console.log(`[DG-SG] ${playersNotFound.length} unmatched players`)
  }

  console.log(`[DG-SG] "${tournament.name}": ${playersUpdated} perfs updated, ${roundRows.length} rounds upserted`)
  return { playersUpdated, roundsUpserted: roundRows.length, playersNotFound }
}

// ─── 3. Orchestrate Full SG Backfill ─────────────────────────────────────────

async function backfillAllSG(prisma, options = {}) {
  const {
    years,
    year,
    forceReprocess = false,
    limit = 0,
  } = options

  // Determine year range
  let yearFilter = []
  if (years && years.length > 0) {
    yearFilter = years
  } else if (year) {
    yearFilter = [year]
  } else {
    yearFilter = Array.from({ length: 9 }, (_, i) => 2018 + i)
  }

  console.log(`[DG-SG] Starting SG backfill for years: ${yearFilter.join(', ')}`)

  // Step 1: Build DG event lookup (one API call)
  const { lookup, sgEventsByYear } = await buildDgEventLookup(prisma)

  // Step 2: Query ALL tournaments in year range (not just ones with datagolfId)
  const startDate = new Date(`${Math.min(...yearFilter)}-01-01`)
  const endDate = new Date(`${Math.max(...yearFilter)}-12-31`)

  const tournaments = await prisma.tournament.findMany({
    where: {
      startDate: { gte: startDate, lte: endDate },
    },
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true, datagolfId: true, startDate: true },
  })

  console.log(`[DG-SG] Found ${tournaments.length} tournaments in DB for ${yearFilter.join(', ')}`)

  // Step 3: Resolve DG event ID for each tournament
  const tournamentsWithEventId = []
  let noEventId = 0
  for (const t of tournaments) {
    const yr = t.startDate ? new Date(t.startDate).getFullYear() : null
    const dgEventId = t.datagolfId || findDgEventId(t.name, yr, lookup, sgEventsByYear)
    if (dgEventId) {
      tournamentsWithEventId.push({ ...t, resolvedEventId: dgEventId })
    } else {
      noEventId++
    }
  }
  console.log(`[DG-SG] ${tournamentsWithEventId.length} matched to DG events, ${noEventId} unmatched`)

  // Step 4: Filter out tournaments that already have SG data (resumable)
  let toProcess = tournamentsWithEventId
  if (!forceReprocess) {
    const ids = tournamentsWithEventId.map(t => t.id)
    if (ids.length > 0) {
      const tournamentsWithSG = await prisma.$queryRaw`
        SELECT DISTINCT "tournamentId"
        FROM performances
        WHERE "tournamentId" = ANY(${ids})
          AND "sgTotal" IS NOT NULL
      `
      const hasSG = new Set(tournamentsWithSG.map(r => r.tournamentId))
      toProcess = tournamentsWithEventId.filter(t => !hasSG.has(t.id))
      console.log(`[DG-SG] Skipping ${tournamentsWithEventId.length - toProcess.length} tournaments (already have SG data)`)
    }
  }

  if (limit > 0) {
    toProcess = toProcess.slice(0, limit)
    console.log(`[DG-SG] Limited to ${limit} tournaments`)
  }

  console.log(`[DG-SG] Processing ${toProcess.length} tournaments...\n`)

  // Step 5: Process each tournament with rate limiting
  const results = []
  let totalPerfs = 0
  let totalRounds = 0
  let totalNotFound = 0
  let retryDelay = 2000

  let dbRetries = 0

  for (let i = 0; i < toProcess.length; i++) {
    const t = toProcess[i]
    const progress = `[${i + 1}/${toProcess.length}]`

    try {
      const result = await backfillTournamentSG(prisma, t, t.resolvedEventId)
      results.push({ tournament: t.name, year: new Date(t.startDate).getFullYear(), ...result })
      totalPerfs += result.playersUpdated
      totalRounds += result.roundsUpserted
      totalNotFound += result.playersNotFound.length
      retryDelay = 2000
      dbRetries = 0

      console.log(`${progress} Done\n`)
    } catch (err) {
      if (err.response?.status === 429) {
        const waitTime = Math.min(retryDelay, 60000)
        console.warn(`${progress} Rate limited, waiting ${waitTime / 1000}s...`)
        await sleep(waitTime)
        retryDelay = Math.min(retryDelay * 2, 60000)
        i-- // retry
        continue
      }

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
        i-- // retry this tournament
        continue
      }

      console.error(`${progress} Failed "${t.name}": ${err.message}`)
      results.push({ tournament: t.name, error: err.message })
      dbRetries = 0
    }

    // Reconnect every 20 tournaments to prevent stale connections
    if (i > 0 && i % 20 === 0) {
      console.log(`[DG-SG] Refreshing DB connection (every 20 tournaments)...`)
      try { await prisma.$disconnect() } catch {}
      await sleep(1000)
      try { await prisma.$connect() } catch {}
    }

    if (i < toProcess.length - 1) {
      await sleep(500)
    }
  }

  const summary = {
    tournamentsProcessed: results.filter(r => !r.error).length,
    tournamentsFailed: results.filter(r => r.error).length,
    totalPerformancesUpdated: totalPerfs,
    totalRoundsUpserted: totalRounds,
    totalPlayersNotFound: totalNotFound,
  }

  console.log('\n[DG-SG] ═══ Backfill Summary ═══')
  console.log(`  Tournaments: ${summary.tournamentsProcessed} processed, ${summary.tournamentsFailed} failed`)
  console.log(`  Performances updated: ${summary.totalPerformancesUpdated}`)
  console.log(`  Rounds upserted: ${summary.totalRoundsUpserted}`)
  console.log(`  Players not found: ${summary.totalPlayersNotFound}`)

  return { summary, details: results }
}

module.exports = {
  mapDataGolfEvents,
  backfillTournamentSG,
  backfillAllSG,
}
