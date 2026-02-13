/**
 * ESPN Calendar Sync — Phase 4E Tier 1 Data Source
 *
 * Backfills historical tournament results from ESPN's free public API.
 * Cross-references ESPN event IDs with our tournaments for enrichment.
 *
 * Data flow: ESPN Scoreboard API → stageRaw() → match tournaments → enrich Performance records
 */

const espn = require('./espnClient')
const { stageRaw, markProcessed } = require('./etlPipeline')

const LOG_PREFIX = '[ESPN Calendar]'

/** Normalize player name for matching (reuse pattern from espnSync) */
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

/** Normalize tournament name for matching (strip "The", punctuation, etc.) */
function normalizeTournamentName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sync ESPN season calendar — match ESPN events to our tournaments and set espnEventId.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ matched: number, total: number, year: number }}
 */
async function syncCalendar(prisma) {
  const year = new Date().getFullYear()
  console.log(`${LOG_PREFIX} Syncing calendar for ${year}`)

  // 1. Fetch ESPN season events
  const events = await espn.getSeasonEvents(year)
  if (!events.length) {
    console.log(`${LOG_PREFIX} No events found for ${year}`)
    return { matched: 0, total: 0, year }
  }

  console.log(`${LOG_PREFIX} Found ${events.length} ESPN events for ${year}`)

  // Stage raw data
  const rawId = await stageRaw(prisma, 'espn', 'calendar', String(year), events)

  // 2. Load our tournaments for the year
  const startOfYear = new Date(`${year}-01-01`)
  const endOfYear = new Date(`${year}-12-31`)
  const tournaments = await prisma.tournament.findMany({
    where: {
      startDate: { gte: startOfYear, lte: endOfYear },
    },
    select: { id: true, name: true, startDate: true, endDate: true, espnEventId: true },
  })

  console.log(`${LOG_PREFIX} ${tournaments.length} tournaments in DB for ${year}`)

  // 3. Match ESPN events to tournaments
  let matched = 0
  for (const evt of events) {
    const espnEventId = evt.id
    if (!espnEventId) continue

    // Skip if already matched
    const alreadyMatched = tournaments.find((t) => t.espnEventId === espnEventId)
    if (alreadyMatched) {
      matched++
      continue
    }

    // Try matching by name and date
    const espnName = normalizeTournamentName(evt.name)
    const espnDate = evt.date ? new Date(evt.date) : null

    let bestMatch = null

    for (const t of tournaments) {
      if (t.espnEventId) continue // Already has an ESPN ID

      const ourName = normalizeTournamentName(t.name)

      // Exact name match
      if (ourName === espnName) {
        bestMatch = t
        break
      }

      // Fuzzy name match (one contains the other)
      if (ourName.includes(espnName) || espnName.includes(ourName)) {
        bestMatch = t
        break
      }

      // Date-based match (within 2 days)
      if (espnDate && t.startDate) {
        const diff = Math.abs(new Date(t.startDate).getTime() - espnDate.getTime())
        if (diff < 2 * 24 * 60 * 60 * 1000) {
          bestMatch = t
          // Don't break — prefer name match if found later
        }
      }
    }

    if (bestMatch) {
      try {
        await prisma.tournament.update({
          where: { id: bestMatch.id },
          data: { espnEventId: String(espnEventId) },
        })
        matched++
        console.log(`${LOG_PREFIX} Matched: "${evt.name}" → "${bestMatch.name}" (${espnEventId})`)
      } catch (e) {
        console.warn(`${LOG_PREFIX} Failed to update tournament ${bestMatch.id}: ${e.message}`)
      }
    }
  }

  await markProcessed(prisma, rawId)
  console.log(`${LOG_PREFIX} Calendar sync done: ${matched} matched out of ${events.length} ESPN events`)

  // 4. Backfill results for completed events
  const backfillResult = await backfillSeasonResults(prisma)

  return { matched, total: events.length, year, backfilled: backfillResult.backfilled }
}

/**
 * Sync results for a single ESPN event — enriches Performance records.
 * @param {string} espnEventId - ESPN event ID
 * @param {string} tournamentId - Our tournament ID
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ playersMatched: number, enriched: number }}
 */
async function syncEventResults(espnEventId, tournamentId, prisma) {
  console.log(`${LOG_PREFIX} Syncing results for ESPN event ${espnEventId}`)

  // 1. Fetch event results
  const { competitors, eventName } = await espn.getEventResults(espnEventId)
  if (!competitors.length) {
    console.log(`${LOG_PREFIX} No competitors found for event ${espnEventId}`)
    return { playersMatched: 0, enriched: 0 }
  }

  // Stage raw
  await stageRaw(prisma, 'espn', 'event_results', espnEventId, { competitors: competitors.length, eventName })

  // 2. Build player matching index
  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, espnId: true, firstName: true, lastName: true },
  })

  const byEspnId = new Map()
  const byName = new Map()
  for (const p of allPlayers) {
    if (p.espnId) byEspnId.set(String(p.espnId), p.id)
    byName.set(normalizeName(p.name), p.id)
    if (p.firstName && p.lastName) {
      byName.set(normalizeName(`${p.firstName} ${p.lastName}`), p.id)
    }
  }

  // 3. Load existing performances for this tournament
  const existingPerfs = await prisma.performance.findMany({
    where: { tournamentId },
    select: { id: true, playerId: true, position: true, totalScore: true },
  })
  const perfByPlayerId = new Map()
  for (const p of existingPerfs) {
    perfByPlayerId.set(p.playerId, p)
  }

  // 4. Match and enrich
  let playersMatched = 0
  let enriched = 0
  const espnIdUpdates = []

  for (const comp of competitors) {
    const espnId = String(comp.id || comp.athlete?.id || '')
    const espnName = comp.athlete?.fullName || comp.athlete?.displayName

    // Match to our player
    let playerId = byEspnId.get(espnId)
    if (!playerId && espnName) {
      playerId = byName.get(normalizeName(espnName))
      if (playerId && espnId) {
        espnIdUpdates.push({ id: playerId, espnId })
      }
    }
    if (!playerId) continue
    playersMatched++

    // Extract result data from ESPN competitor
    // ESPN: order = finishing position (1,2,3...), score = string ("-35", "+2", "E")
    const positionNum = comp.order ? parseInt(comp.order) : null
    const totalToPar = parseToPar(typeof comp.score === 'string' ? comp.score : comp.score?.displayValue)

    // Enrich existing Performance record if it exists
    const existingPerf = perfByPlayerId.get(playerId)
    if (existingPerf) {
      // Only fill in missing data — don't overwrite DataGolf data
      const update = {}
      if (!existingPerf.position && positionNum) update.position = positionNum
      if (existingPerf.totalScore == null && totalToPar != null) update.totalScore = totalToPar

      if (Object.keys(update).length > 0) {
        try {
          await prisma.performance.update({
            where: { id: existingPerf.id },
            data: update,
          })
          enriched++
        } catch (e) {
          // Non-critical
        }
      }
    }
  }

  // Update espnIds for newly matched players
  for (const u of espnIdUpdates) {
    try {
      await prisma.player.update({ where: { id: u.id }, data: { espnId: u.espnId } })
    } catch (e) { /* Non-critical */ }
  }

  console.log(`${LOG_PREFIX} Event ${espnEventId}: ${playersMatched} matched, ${enriched} enriched`)
  return { playersMatched, enriched }
}

/**
 * Backfill results for all completed tournaments that have an espnEventId
 * but may be missing ESPN-sourced data.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ backfilled: number }}
 */
async function backfillSeasonResults(prisma) {
  // Find completed tournaments with ESPN IDs
  const tournaments = await prisma.tournament.findMany({
    where: {
      status: 'COMPLETED',
      espnEventId: { not: null },
    },
    select: { id: true, name: true, espnEventId: true },
    orderBy: { startDate: 'desc' },
    take: 10, // Process at most 10 per run
  })

  let backfilled = 0
  for (const t of tournaments) {
    try {
      const result = await syncEventResults(t.espnEventId, t.id, prisma)
      if (result.enriched > 0) backfilled++
      // Rate limit: 2s between ESPN requests
      await new Promise((r) => setTimeout(r, 2000))
    } catch (e) {
      console.warn(`${LOG_PREFIX} Backfill failed for "${t.name}": ${e.message}`)
    }
  }

  console.log(`${LOG_PREFIX} Backfill done: ${backfilled} tournaments enriched`)
  return { backfilled }
}

/** Parse ESPN score display value to numeric to-par (e.g., "-12" → -12, "E" → 0) */
function parseToPar(displayValue) {
  if (!displayValue) return null
  if (displayValue === 'E') return 0
  const num = parseInt(displayValue)
  return isNaN(num) ? null : num
}

module.exports = {
  syncCalendar,
  syncEventResults,
  backfillSeasonResults,
}
