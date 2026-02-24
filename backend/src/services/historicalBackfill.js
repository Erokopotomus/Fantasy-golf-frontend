/**
 * Historical Tournament Results Backfill (ESPN-powered)
 *
 * Uses ESPN's free public API to fetch historical tournament results,
 * creates Tournament and Performance records, then recalculates all
 * Player career stats from the Performance table.
 *
 * Usage (via API):
 *   POST /api/sync/backfill-historical  { year: 2024 }
 *   POST /api/sync/recalculate-stats
 */

const espn = require('./espnClient')

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize player name for matching */
function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o').replace(/Ø/g, 'o')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'ae')
    .replace(/å/g, 'a').replace(/Å/g, 'a')
    .replace(/ð/g, 'd').replace(/Ð/g, 'd')
    .replace(/þ/g, 'th').replace(/Þ/g, 'th')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse ESPN score string to numeric to-par ("-12"→-12, "+2"→2, "E"→0, "CUT"→null) */
function parseToPar(scoreStr) {
  if (!scoreStr) return null
  const s = String(scoreStr).trim()
  if (s === 'E') return 0
  if (s === 'CUT' || s === 'WD' || s === 'DQ' || s === 'MC') return null
  const num = parseInt(s)
  return isNaN(num) ? null : num
}

/** Determine player status from ESPN score string */
function parseStatus(scoreStr) {
  if (!scoreStr) return 'ACTIVE'
  const s = String(scoreStr).trim().toUpperCase()
  if (s === 'CUT' || s === 'MC') return 'CUT'
  if (s === 'WD' || s === 'W/D') return 'WD'
  if (s === 'DQ') return 'DQ'
  return 'ACTIVE'
}

/** Run an array of Prisma operations in batched transactions (chunks of 50) */
async function batchTransaction(prisma, operations, chunkSize = 50) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize)
    await prisma.$transaction(chunk)
  }
}

/** Sleep helper for rate limiting */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Backfill Historical Results for a Year (ESPN) ──────────────────────────

async function backfillYear(year, prisma) {
  if (!prisma) {
    prisma = require('../lib/prisma')
  }

  console.log(`[Backfill] Starting ESPN historical backfill for ${year}...`)

  // 1. Fetch all events for this year from ESPN
  const events = await espn.getSeasonEvents(year)
  const completedEvents = events.filter(e => e.status === 'STATUS_FINAL')
  console.log(`[Backfill] ESPN: ${events.length} total events, ${completedEvents.length} completed for ${year}`)

  if (completedEvents.length === 0) {
    return { year, tournaments: 0, performances: 0 }
  }

  // 2. Build player name → id lookup
  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, firstName: true, lastName: true, espnId: true },
  })
  const playerByEspnId = new Map()
  const playerByName = new Map()
  for (const p of allPlayers) {
    if (p.espnId) playerByEspnId.set(String(p.espnId), p.id)
    playerByName.set(normalizeName(p.name), p.id)
    if (p.firstName && p.lastName) {
      playerByName.set(normalizeName(`${p.firstName} ${p.lastName}`), p.id)
    }
  }
  console.log(`[Backfill] ${allPlayers.length} players in DB (${playerByEspnId.size} with ESPN IDs)`)

  // 3. Load existing tournaments for matching
  const existingTournaments = await prisma.tournament.findMany({
    where: { startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    select: { id: true, name: true, espnEventId: true, startDate: true },
  })
  const tournamentByEspnId = new Map(
    existingTournaments.filter(t => t.espnEventId).map(t => [t.espnEventId, t.id])
  )

  let tournamentsCreated = 0
  let tournamentsMatched = 0
  let performancesCreated = 0
  let playersNotFound = 0
  const espnIdUpdates = []

  // 4. Process each completed event
  for (const evt of completedEvents) {
    const espnEventId = String(evt.id)

    // a. Find or create Tournament record
    let tournamentId = tournamentByEspnId.get(espnEventId)

    if (!tournamentId) {
      // Try matching by name/date to existing tournament
      const evtName = normalizeName(evt.name)
      const evtDate = evt.date ? new Date(evt.date) : null
      for (const t of existingTournaments) {
        if (t.espnEventId) continue
        const ourName = normalizeName(t.name)
        const dateMatch = evtDate && t.startDate &&
          Math.abs(new Date(t.startDate).getTime() - evtDate.getTime()) < 3 * 24 * 60 * 60 * 1000
        if (ourName === evtName || ourName.includes(evtName) || evtName.includes(ourName) || dateMatch) {
          tournamentId = t.id
          // Update with ESPN ID
          await prisma.tournament.update({
            where: { id: t.id },
            data: { espnEventId, status: 'COMPLETED' },
          }).catch(() => {})
          tournamentByEspnId.set(espnEventId, tournamentId)
          tournamentsMatched++
          break
        }
      }
    } else {
      tournamentsMatched++
    }

    if (!tournamentId) {
      // Create new tournament
      try {
        const t = await prisma.tournament.create({
          data: {
            name: evt.name,
            shortName: evt.shortName || evt.name,
            espnEventId,
            tour: 'PGA',
            status: 'COMPLETED',
            startDate: evt.date ? new Date(evt.date) : new Date(`${year}-01-01`),
            endDate: evt.endDate ? new Date(evt.endDate) : new Date(evt.date || `${year}-01-04`),
            sourceProvider: 'espn_backfill',
            sourceIngestedAt: new Date(),
          },
        })
        tournamentId = t.id
        tournamentByEspnId.set(espnEventId, tournamentId)
        tournamentsCreated++
      } catch (err) {
        console.warn(`[Backfill] Failed to create tournament "${evt.name}": ${err.message}`)
        continue
      }
    }

    // b. Fetch detailed results from ESPN
    let results
    try {
      results = await espn.getEventResults(espnEventId)
    } catch (err) {
      console.warn(`[Backfill] Failed to fetch results for "${evt.name}": ${err.message}`)
      await sleep(2000)
      continue
    }

    const competitors = results.competitors || []
    if (competitors.length === 0) {
      await sleep(1000)
      continue
    }

    // c. Match players and create Performance records
    const perfOps = []
    for (const comp of competitors) {
      const espnId = String(comp.id || '')
      const playerName = comp.athlete?.fullName || comp.athlete?.displayName || ''

      // Match player
      let playerId = playerByEspnId.get(espnId)
      if (!playerId && playerName) {
        playerId = playerByName.get(normalizeName(playerName))
        // Save ESPN ID mapping for future use
        if (playerId && espnId) {
          espnIdUpdates.push({ id: playerId, espnId })
          playerByEspnId.set(espnId, playerId)
        }
      }
      if (!playerId) {
        playersNotFound++
        continue
      }

      // Extract position and score
      const position = comp.order ? parseInt(comp.order) : null
      const status = parseStatus(comp.score)
      const totalToPar = parseToPar(comp.score)

      // Extract round scores from linescores
      const linescores = comp.linescores || []

      const perfData = {
        status,
        position: status === 'ACTIVE' && typeof position === 'number' ? position : null,
        totalToPar,
      }

      // Remove null/undefined
      for (const k of Object.keys(perfData)) {
        if (perfData[k] === undefined) delete perfData[k]
      }

      perfOps.push(
        prisma.performance.upsert({
          where: { tournamentId_playerId: { tournamentId, playerId } },
          update: perfData,
          create: { tournamentId, playerId, ...perfData },
        })
      )
    }

    if (perfOps.length > 0) {
      await batchTransaction(prisma, perfOps)
      performancesCreated += perfOps.length
    }

    console.log(`[Backfill] ${evt.name}: ${perfOps.length} performances (${competitors.length - perfOps.length} unmatched)`)

    // Rate limit: 1.5s between ESPN requests
    await sleep(1500)
  }

  // 5. Save ESPN ID mappings for newly matched players
  if (espnIdUpdates.length > 0) {
    const uniqueUpdates = [...new Map(espnIdUpdates.map(u => [u.id, u])).values()]
    for (const u of uniqueUpdates) {
      await prisma.player.update({ where: { id: u.id }, data: { espnId: u.espnId } }).catch(() => {})
    }
    console.log(`[Backfill] Saved ${uniqueUpdates.length} new ESPN ID mappings`)
  }

  console.log(`[Backfill] Year ${year} complete: ${tournamentsCreated} created, ${tournamentsMatched} matched, ${performancesCreated} performances, ${playersNotFound} unmatched players`)
  return { year, tournamentsCreated, tournamentsMatched, performancesCreated, playersNotFound }
}

// ─── Recalculate Player Career Stats from Performance Table ─────────────────

async function recalculatePlayerCareerStats(prisma) {
  if (!prisma) {
    prisma = require('../lib/prisma')
  }

  console.log('[Recalc] Recalculating all player career stats from Performance records...')

  // Get aggregated stats from Performance table
  const stats = await prisma.$queryRaw`
    SELECT
      "playerId",
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE status = 'ACTIVE' OR status IS NULL)::int AS "cutsMade",
      COUNT(*) FILTER (WHERE position = 1)::int AS wins,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 5)::int AS top5s,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 10)::int AS top10s,
      COUNT(*) FILTER (WHERE position IS NOT NULL AND position <= 25)::int AS top25s,
      COALESCE(SUM(earnings), 0)::float AS earnings
    FROM performances
    WHERE "playerId" IS NOT NULL
    GROUP BY "playerId"
  `

  console.log(`[Recalc] Got stats for ${stats.length} players`)

  // Update each player's career stats
  const ops = []
  for (const row of stats) {
    ops.push(
      prisma.player.update({
        where: { id: row.playerId },
        data: {
          events: row.events || 0,
          cutsMade: row.cutsMade || 0,
          wins: row.wins || 0,
          top5s: row.top5s || 0,
          top10s: row.top10s || 0,
          top25s: row.top25s || 0,
          earnings: row.earnings || 0,
        },
      })
    )
  }

  await batchTransaction(prisma, ops)
  console.log(`[Recalc] Updated career stats for ${ops.length} players`)

  // Log top performers for sanity check
  const topWinners = await prisma.player.findMany({
    where: { wins: { gt: 0 } },
    orderBy: { wins: 'desc' },
    take: 10,
    select: { name: true, wins: true, top10s: true, events: true },
  })
  console.log('[Recalc] Top 10 winners:')
  for (const p of topWinners) {
    console.log(`  ${p.name}: ${p.wins}W, ${p.top10s} top-10s, ${p.events} events`)
  }

  return { playersUpdated: ops.length, topWinners }
}

// ─── Full Backfill (Multiple Years) ─────────────────────────────────────────

async function backfillMultipleYears(years, prisma) {
  if (!prisma) {
    prisma = require('../lib/prisma')
  }

  const results = []
  for (const year of years) {
    try {
      const result = await backfillYear(year, prisma)
      results.push(result)
    } catch (err) {
      console.error(`[Backfill] Year ${year} failed: ${err.message}`)
      results.push({ year, error: err.message })
    }
  }

  // After all years are done, recalculate career stats
  const statsResult = await recalculatePlayerCareerStats(prisma)

  return { years: results, statsRecalculated: statsResult }
}

module.exports = {
  backfillYear,
  backfillMultipleYears,
  recalculatePlayerCareerStats,
}
