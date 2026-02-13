/**
 * OWGR Rankings Sync — Phase 4E Tier 1 Data Source
 *
 * Scrapes Official World Golf Rankings from owgr.com.
 * Provides independent OWGR data: total points, average points, events divisor.
 * Validates/enriches DataGolf-sourced owgrRank.
 *
 * Strategy (in order of attempt):
 * 1. Try owgr.com internal API endpoint
 * 2. Fall back to parsing __NEXT_DATA__ from the HTML page
 * 3. Fall back to parsing the HTML table with node-html-parser
 */

const { parse: parseHTML } = require('node-html-parser')
const { stageRaw, markProcessed } = require('./etlPipeline')

const LOG_PREFIX = '[OWGR Sync]'
const API_URL = 'https://apiweb.owgr.com/api'
const SITE_URL = 'https://www.owgr.com'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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
 * Fetch OWGR rankings data. Tries multiple strategies.
 * @param {number} page - Page number (1-based, 100 players per page)
 * @param {number} pageSize - Players per page
 * @returns {Array<{ rank, lastWeekRank, name, country, avgPoints, totalPoints, eventsPlayed, eventsDivisor }>}
 */
async function fetchOwgrRankings(page = 1, pageSize = 200) {
  // Strategy 1: Try the OWGR API endpoint
  try {
    const apiData = await tryOwgrApi(page, pageSize)
    if (apiData && apiData.length > 0) {
      console.log(`${LOG_PREFIX} Strategy 1 (API) succeeded: ${apiData.length} players`)
      return apiData
    }
  } catch (e) {
    console.log(`${LOG_PREFIX} Strategy 1 (API) failed: ${e.message}`)
  }

  // Strategy 2: Try __NEXT_DATA__ from HTML page
  try {
    const nextData = await tryNextData(page)
    if (nextData && nextData.length > 0) {
      console.log(`${LOG_PREFIX} Strategy 2 (__NEXT_DATA__) succeeded: ${nextData.length} players`)
      return nextData
    }
  } catch (e) {
    console.log(`${LOG_PREFIX} Strategy 2 (__NEXT_DATA__) failed: ${e.message}`)
  }

  // Strategy 3: Parse the HTML table
  try {
    const htmlData = await tryHtmlParse(page)
    if (htmlData && htmlData.length > 0) {
      console.log(`${LOG_PREFIX} Strategy 3 (HTML parse) succeeded: ${htmlData.length} players`)
      return htmlData
    }
  } catch (e) {
    console.log(`${LOG_PREFIX} Strategy 3 (HTML parse) failed: ${e.message}`)
  }

  console.warn(`${LOG_PREFIX} All strategies failed for page ${page}`)
  return []
}

/** Strategy 1: OWGR public API (confirmed working Feb 2026) */
async function tryOwgrApi(page, pageSize) {
  const url = `${API_URL}/owgr/rankings/getRankings?page=${page}&pageSize=${pageSize}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Referer: `${SITE_URL}/current-world-ranking`,
      Origin: SITE_URL,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  const rankings = data?.rankingsList
  if (Array.isArray(rankings) && rankings.length > 0) {
    return rankings.map(parseOwgrApiPlayer)
  }
  return []
}

/** Strategy 2: Parse __NEXT_DATA__ embedded JSON */
async function tryNextData(page) {
  const url = page === 1
    ? `${SITE_URL}/current-world-ranking`
    : `${SITE_URL}/current-world-ranking?page=${page}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()

  // Find __NEXT_DATA__ script
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('No __NEXT_DATA__ found')

  const nextData = JSON.parse(match[1])

  // Navigate the Next.js page props to find ranking data
  const pageProps = nextData?.props?.pageProps
  if (!pageProps) throw new Error('No pageProps in __NEXT_DATA__')

  // Try common shapes
  const rankings = pageProps?.rankingsList
    || pageProps?.rankings
    || pageProps?.data?.rankings
    || pageProps?.initialData?.rankings
    || pageProps?.dehydratedState?.queries?.[0]?.state?.data?.rankingsList

  if (Array.isArray(rankings) && rankings.length > 0) {
    return rankings.map(parseOwgrPlayer)
  }

  // Try navigating deeper into dehydrated state (React Query cache)
  const queries = pageProps?.dehydratedState?.queries || []
  for (const query of queries) {
    const qData = query?.state?.data
    if (!qData) continue
    const list = qData?.rankingsList || qData?.rankings || qData?.data
    if (Array.isArray(list) && list.length > 0 && list[0]?.playerName) {
      return list.map(parseOwgrPlayer)
    }
  }

  throw new Error('Could not find rankings in __NEXT_DATA__')
}

/** Strategy 3: Parse HTML table */
async function tryHtmlParse(page) {
  const url = page === 1
    ? `${SITE_URL}/current-world-ranking`
    : `${SITE_URL}/current-world-ranking?page=${page}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const root = parseHTML(html)

  // Look for ranking table rows
  const rows = root.querySelectorAll('table tbody tr')
    || root.querySelectorAll('[class*="ranking"] tr')
    || root.querySelectorAll('[data-testid*="ranking"] tr')

  if (!rows || rows.length === 0) {
    // Try a different selector — OWGR might use divs
    const rankItems = root.querySelectorAll('[class*="table-row"], [class*="ranking-row"]')
    if (rankItems.length > 0) {
      return parseOwgrDivRows(rankItems)
    }
    throw new Error('No ranking table/rows found in HTML')
  }

  const results = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 5) continue

    const rank = parseInt(cells[0]?.text?.trim())
    if (isNaN(rank)) continue

    results.push({
      rank,
      lastWeekRank: parseInt(cells[1]?.text?.trim()) || null,
      name: cells[2]?.text?.trim() || cells[3]?.text?.trim(),
      country: cells[3]?.text?.trim() || cells[4]?.text?.trim(),
      avgPoints: parseFloat(cells[cells.length - 3]?.text?.trim()) || null,
      totalPoints: parseFloat(cells[cells.length - 2]?.text?.trim()) || null,
      eventsPlayed: parseInt(cells[cells.length - 1]?.text?.trim()) || null,
      eventsDivisor: null,
    })
  }

  return results
}

/** Parse OWGR div-based rows (fallback) */
function parseOwgrDivRows(items) {
  return Array.from(items).map((item) => {
    const texts = item.querySelectorAll('span, div, td, p')
      .map((el) => el.text?.trim())
      .filter(Boolean)

    // Best effort extraction — rank is usually first number
    const rank = parseInt(texts[0])
    return {
      rank: isNaN(rank) ? null : rank,
      lastWeekRank: null,
      name: texts.find((t) => /^[A-Z][a-z]/.test(t) && t.includes(' ')) || texts[1],
      country: null,
      avgPoints: null,
      totalPoints: null,
      eventsPlayed: null,
      eventsDivisor: null,
    }
  }).filter((r) => r.rank && r.name)
}

/** Parse OWGR API response player (confirmed structure Feb 2026) */
function parseOwgrApiPlayer(raw) {
  return {
    rank: raw.rank || null,
    lastWeekRank: raw.lastWeekRank || null,
    name: raw.player?.fullName || `${raw.player?.firstName || ''} ${raw.player?.lastName || ''}`.trim(),
    country: raw.player?.country?.name || null,
    countryCode: raw.player?.country?.code3 || null,
    avgPoints: raw.pointsAverage || null,
    totalPoints: raw.pointsTotal || null,
    eventsPlayed: raw.divisorActual || null,
    eventsDivisor: raw.divisorApplied || null,
    pointsLost: raw.pointsLost || null,
    pointsWon: raw.pointsWon || null,
    endLastYearRank: raw.endLastYearRank || null,
  }
}

/** Parse a single OWGR player object from HTML/fallback responses */
function parseOwgrPlayer(raw) {
  return {
    rank: raw.rank || raw.currentRank || raw.position || null,
    lastWeekRank: raw.lastWeekRank || raw.previousRank || null,
    name: raw.playerName || raw.name || raw.fullName || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    country: raw.country || raw.nationality || raw.countryName || null,
    avgPoints: parseFloat(raw.avgPoints || raw.averagePoints || raw.avgPts) || null,
    totalPoints: parseFloat(raw.totalPoints || raw.totalPts || raw.points) || null,
    eventsPlayed: parseInt(raw.totalEvents || raw.eventsPlayed || raw.events) || null,
    eventsDivisor: parseInt(raw.eventsDivisor || raw.divisor) || null,
  }
}

/**
 * Sync OWGR rankings — fetch top 500 and enrich Player records.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ fetched: number, matched: number, updated: number }}
 */
async function syncOwgrRankings(prisma) {
  console.log(`${LOG_PREFIX} Starting OWGR rankings sync`)

  // Fetch rankings (multiple pages to get top 500)
  let allRankings = []
  for (let page = 1; page <= 3; page++) {
    const pageData = await fetchOwgrRankings(page, 200)
    if (!pageData.length) break
    allRankings = allRankings.concat(pageData)

    if (allRankings.length >= 500) break

    // Rate limit between pages
    await new Promise((r) => setTimeout(r, 3000))
  }

  if (!allRankings.length) {
    console.warn(`${LOG_PREFIX} No OWGR data fetched — all strategies failed`)
    return { fetched: 0, matched: 0, updated: 0, error: 'OWGR data unavailable' }
  }

  console.log(`${LOG_PREFIX} Fetched ${allRankings.length} OWGR rankings`)

  // Stage raw data
  const rawId = await stageRaw(prisma, 'owgr', 'rankings', null, allRankings)

  // Build player matching index
  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, firstName: true, lastName: true, owgrRank: true, owgr: true },
  })

  const byName = new Map()
  for (const p of allPlayers) {
    byName.set(normalizeName(p.name), p)
    if (p.firstName && p.lastName) {
      byName.set(normalizeName(`${p.firstName} ${p.lastName}`), p)
      // Also "Last, First" variations
      byName.set(normalizeName(`${p.lastName} ${p.firstName}`), p)
    }
  }

  // Match and update
  let matched = 0
  let updated = 0
  const updates = []

  for (const ranking of allRankings) {
    if (!ranking.name || !ranking.rank) continue

    const player = byName.get(normalizeName(ranking.name))
    if (!player) continue
    matched++

    const update = {}

    // Update owgrRank if different
    if (ranking.rank && ranking.rank !== player.owgrRank) {
      update.owgrRank = ranking.rank
    }

    // Fill OWGR total points (new data DataGolf doesn't provide)
    if (ranking.totalPoints != null) {
      update.owgr = ranking.totalPoints
    } else if (ranking.avgPoints != null) {
      update.owgr = ranking.avgPoints
    }

    if (Object.keys(update).length > 0) {
      updates.push(
        prisma.player.update({
          where: { id: player.id },
          data: {
            ...update,
            sourceProvider: 'owgr',
            sourceIngestedAt: new Date(),
          },
        })
      )
    }
  }

  // Execute in batches
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50)
    await prisma.$transaction(chunk)
    updated += chunk.length
  }

  await markProcessed(prisma, rawId)
  console.log(`${LOG_PREFIX} Done: ${allRankings.length} fetched, ${matched} matched, ${updated} updated`)
  return { fetched: allRankings.length, matched, updated }
}

module.exports = {
  fetchOwgrRankings,
  syncOwgrRankings,
}
