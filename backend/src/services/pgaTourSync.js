/**
 * PGA Tour Stats Sync — Phase 4E Tier 1 Data Source
 *
 * Fetches official PGA Tour traditional stats from pgatour.com.
 * Parses embedded __NEXT_DATA__ JSON from stat pages.
 * Enriches Player records with scoring avg, driving distance, GIR, etc.
 *
 * Graceful degradation: if PGA Tour blocks or changes structure,
 * logs warning and returns empty results — never crashes the cron.
 */

const { parse: parseHTML } = require('node-html-parser')
const { stageRaw, markProcessed } = require('./etlPipeline')

const LOG_PREFIX = '[PGA Tour Sync]'
const BASE_URL = 'https://www.pgatour.com'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Rate limit delay between page fetches (ms) */
const FETCH_DELAY = 3000

/**
 * PGA Tour stat IDs → Player field mappings
 * See: pgatour.com/stats/detail/{statId}
 */
const STAT_CONFIGS = [
  { statId: '120', statName: 'Scoring Average', playerField: 'scoringAvg', parseAs: 'float' },
  { statId: '101', statName: 'Driving Distance', playerField: 'drivingDistance', parseAs: 'float' },
  { statId: '102', statName: 'Driving Accuracy', playerField: 'drivingAccuracy', parseAs: 'pct' },
  { statId: '103', statName: 'Greens in Regulation', playerField: 'gir', parseAs: 'pct' },
  { statId: '130', statName: 'Scrambling', playerField: 'scrambling', parseAs: 'pct' },
  { statId: '104', statName: 'Putts per Round', playerField: 'puttsPerRound', parseAs: 'float' },
  { statId: '111', statName: 'Sand Saves', playerField: 'sandSaves', parseAs: 'pct' },
]

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

/**
 * Fetch a single PGA Tour stat page and extract player data.
 * @param {string} statId - PGA Tour stat ID (e.g., "120")
 * @returns {Array<{ name: string, value: number|string, rank: number }>}
 */
async function fetchPgaTourStat(statId) {
  const url = `${BASE_URL}/stats/detail/${statId}`

  let res
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
  } catch (e) {
    console.warn(`${LOG_PREFIX} Network error fetching stat ${statId}: ${e.message}`)
    return []
  }

  if (!res.ok) {
    console.warn(`${LOG_PREFIX} HTTP ${res.status} for stat ${statId}`)
    return []
  }

  const html = await res.text()

  // Strategy 1: Parse __NEXT_DATA__
  try {
    const data = extractNextData(html, statId)
    if (data.length > 0) return data
  } catch (e) {
    console.log(`${LOG_PREFIX} __NEXT_DATA__ parse failed for stat ${statId}: ${e.message}`)
  }

  // Strategy 2: Parse HTML table
  try {
    const data = extractHtmlTable(html, statId)
    if (data.length > 0) return data
  } catch (e) {
    console.log(`${LOG_PREFIX} HTML table parse failed for stat ${statId}: ${e.message}`)
  }

  console.warn(`${LOG_PREFIX} No data extracted for stat ${statId}`)
  return []
}

/** Extract stat data from __NEXT_DATA__ script tag */
function extractNextData(html, statId) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('No __NEXT_DATA__ found')

  const nextData = JSON.parse(match[1])
  const pageProps = nextData?.props?.pageProps

  if (!pageProps) throw new Error('No pageProps')

  // PGA Tour uses dehydratedState with React Query cache (confirmed Feb 2026)
  const queries = pageProps?.dehydratedState?.queries || []

  // Find the statDetails query for the current year (without event filter)
  const year = new Date().getFullYear()
  const statQuery = queries.find((q) =>
    q.queryKey?.[0] === 'statDetails'
    && q.queryKey?.[1]?.statId === statId
    && q.queryKey?.[1]?.year === year
    && !q.queryKey?.[1]?.eventQuery
  ) || queries.find((q) =>
    q.queryKey?.[0] === 'statDetails'
    && q.queryKey?.[1]?.statId === statId
  )

  const rows = statQuery?.state?.data?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No stat rows found in dehydratedState')
  }

  return rows.map((row) => ({
    name: row.playerName || '',
    // Primary stat value is the first entry in the stats array
    value: row.stats?.[0]?.statValue || null,
    rank: parseInt(row.rank) || null,
    pgaTourId: row.playerId || null,
  })).filter((r) => r.name)
}

/** Extract stat data from HTML table (fallback) */
function extractHtmlTable(html, statId) {
  const root = parseHTML(html)

  const rows = root.querySelectorAll('table tbody tr')
  if (!rows || rows.length === 0) {
    // Try alternate selectors
    const altRows = root.querySelectorAll('[class*="stats"] tr, [data-testid*="stat"] tr')
    if (!altRows || altRows.length === 0) throw new Error('No stat table rows found')
    return parseStatRows(altRows)
  }

  return parseStatRows(rows)
}

/** Parse table rows into stat objects */
function parseStatRows(rows) {
  const results = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 3) continue

    const rank = parseInt(cells[0]?.text?.trim())
    if (isNaN(rank)) continue

    // Player name is typically in cell 1 or 2
    let name = ''
    for (let i = 1; i < Math.min(4, cells.length); i++) {
      const text = cells[i]?.text?.trim()
      if (text && /[a-zA-Z]/.test(text) && text.includes(' ')) {
        name = text
        break
      }
    }
    if (!name) continue

    // Stat value is typically the last meaningful cell
    let value = null
    for (let i = cells.length - 1; i >= 2; i--) {
      const text = cells[i]?.text?.trim()
      if (text && /[\d.]/.test(text)) {
        value = text.replace(/[,%]/g, '')
        break
      }
    }

    results.push({ name, value, rank })
  }
  return results
}

/**
 * Parse a stat value string into a number.
 * @param {string|number} value - Raw value (e.g., "69.73", "62.5%", "301.2")
 * @param {'float'|'pct'} parseAs - How to parse
 * @returns {number|null}
 */
function parseStatValue(value, parseAs) {
  if (value == null) return null
  const str = String(value).replace(/[,%]/g, '').trim()
  const num = parseFloat(str)
  if (isNaN(num)) return null

  if (parseAs === 'pct' && num > 1 && num <= 100) {
    return num // Already in percentage form
  }

  return num
}

/**
 * Sync all PGA Tour traditional stats — fetches key stats and enriches Player records.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ statsFetched: number, playersUpdated: number, errors: string[] }}
 */
async function syncPgaTourStats(prisma) {
  console.log(`${LOG_PREFIX} Starting PGA Tour stats sync (${STAT_CONFIGS.length} stats)`)

  // Build player matching index
  const allPlayers = await prisma.player.findMany({
    select: {
      id: true, name: true, firstName: true, lastName: true, pgaTourId: true,
      scoringAvg: true, drivingDistance: true, drivingAccuracy: true,
      gir: true, scrambling: true, puttsPerRound: true, sandSaves: true,
    },
  })

  const byPgaTourId = new Map()
  const byName = new Map()
  for (const p of allPlayers) {
    if (p.pgaTourId) byPgaTourId.set(String(p.pgaTourId), p)
    byName.set(normalizeName(p.name), p)
    if (p.firstName && p.lastName) {
      byName.set(normalizeName(`${p.firstName} ${p.lastName}`), p)
    }
  }

  let totalStatsFetched = 0
  const errors = []
  const playerUpdates = new Map() // playerId → { field: value, ... }

  for (const config of STAT_CONFIGS) {
    console.log(`${LOG_PREFIX} Fetching ${config.statName} (ID: ${config.statId})...`)

    try {
      const statRows = await fetchPgaTourStat(config.statId)

      if (statRows.length === 0) {
        errors.push(`No data for ${config.statName}`)
        console.warn(`${LOG_PREFIX} No data for ${config.statName}`)
      } else {
        // Stage raw data
        await stageRaw(prisma, 'pgatour', `stat_${config.statId}`, null, statRows)
        totalStatsFetched++

        // Match and accumulate updates
        for (const row of statRows) {
          let player = row.pgaTourId ? byPgaTourId.get(String(row.pgaTourId)) : null
          if (!player) player = byName.get(normalizeName(row.name))
          if (!player) continue

          const value = parseStatValue(row.value, config.parseAs)
          if (value == null) continue

          const existing = playerUpdates.get(player.id) || {}
          existing[config.playerField] = value

          // Save pgaTourId if we have it and the player doesn't
          if (row.pgaTourId && !player.pgaTourId) {
            existing._pgaTourId = String(row.pgaTourId)
          }

          playerUpdates.set(player.id, existing)
        }
      }
    } catch (e) {
      errors.push(`${config.statName}: ${e.message}`)
      console.warn(`${LOG_PREFIX} Error fetching ${config.statName}: ${e.message}`)
    }

    // Rate limit between stat page fetches
    await new Promise((r) => setTimeout(r, FETCH_DELAY))
  }

  // Execute player updates
  let playersUpdated = 0
  const updateOps = []

  for (const [playerId, fields] of playerUpdates) {
    const { _pgaTourId, ...statFields } = fields
    const data = {
      ...statFields,
      sourceProvider: 'pgatour',
      sourceIngestedAt: new Date(),
    }
    if (_pgaTourId) data.pgaTourId = _pgaTourId

    updateOps.push(
      prisma.player.update({ where: { id: playerId }, data })
    )
  }

  // Execute in batches
  for (let i = 0; i < updateOps.length; i += 50) {
    const chunk = updateOps.slice(i, i + 50)
    await prisma.$transaction(chunk)
    playersUpdated += chunk.length
  }

  console.log(`${LOG_PREFIX} Done: ${totalStatsFetched}/${STAT_CONFIGS.length} stats fetched, ${playersUpdated} players updated`)
  if (errors.length > 0) {
    console.log(`${LOG_PREFIX} Errors: ${errors.join('; ')}`)
  }

  return { statsFetched: totalStatsFetched, playersUpdated, errors }
}

module.exports = {
  fetchPgaTourStat,
  syncPgaTourStats,
}
