/**
 * Custom Data Import Service (Addendum Part 2)
 *
 * Handles spreadsheet and website imports for custom league data:
 *   - .xlsx / .csv file parsing
 *   - Google Sheets URL import (public sheets only)
 *   - AI-powered column mapping via Claude
 *   - Website crawling + AI content extraction
 *   - CustomLeagueData storage
 *
 * All raw content stored in RawProviderData before processing.
 */

const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')
const claudeService = require('./claudeService')

const prisma = new PrismaClient()

// ─── Column Mapping Categories ──────────────────────────────────────────────

const KNOWN_CATEGORIES = [
  'SEASON_YEAR', 'TEAM_NAME', 'OWNER_NAME', 'WINS', 'LOSSES', 'TIES',
  'POINTS_FOR', 'POINTS_AGAINST', 'FINAL_STANDING', 'PLAYOFF_RESULT',
  'CHAMPIONSHIP_WON', 'DRAFT_PICK', 'DRAFT_ROUND', 'PLAYER_NAME',
  'PLAYER_POSITION', 'TRADE_DATE', 'TRADE_DETAILS', 'WAIVER_CLAIM',
  'FAAB_SPENT', 'WEEKLY_SCORE', 'WEEK_NUMBER', 'OPPONENT',
  'ALL_TIME_WINS', 'ALL_TIME_LOSSES', 'TROPHY_NAME', 'AWARD_NAME',
  'PUNISHMENT', 'NICKNAME', 'NOTES', 'CUSTOM',
]

const SHEET_INTERPRETATION_PROMPT = `You are analyzing a fantasy sports league spreadsheet uploaded by a commissioner. Your job is to map each column to a known Clutch data category.

Known categories:
${KNOWN_CATEGORIES.join(', ')}

For each column, return:
- header: the original column header
- mappedTo: the best matching category from the list above, or "CUSTOM" if none fit
- confidence: "high", "medium", or "low"
- description: brief explanation of what this column appears to contain

Also determine the dataCategory for the entire sheet. Choose one:
- "standings" — season standings (wins, losses, points, rank)
- "records" — all-time records (highest score, longest streak, etc.)
- "awards" — league awards or trophies
- "trophies" — trophy history
- "draft_history" — draft picks/results
- "transactions" — trades, waivers, adds/drops
- "custom_stats" — computed stats that don't fit other categories
- "punishments" — last-place punishments
- "nicknames" — owner/team nicknames
- "other" — doesn't fit any category

Return JSON:
{
  "dataCategory": "standings",
  "seasonYear": 2023 or null,
  "columns": [
    { "header": "Team", "mappedTo": "TEAM_NAME", "confidence": "high", "description": "Team name" },
    ...
  ]
}`

const WEBSITE_INTERPRETATION_PROMPT = `You are analyzing a fantasy sports league website page. Extract any structured data you find: standings, records, awards, historical results, trophies, punishments, draft results, etc.

For each piece of data found, categorize it into one of these categories:
- "standings" — season standings
- "records" — all-time records
- "awards" — league awards
- "trophies" — trophy history
- "draft_history" — draft picks
- "punishments" — last-place punishments
- "custom_stats" — other stats
- "other" — uncategorized

Return JSON:
{
  "extractedData": [
    {
      "category": "records",
      "seasonYear": null,
      "description": "All-time league records",
      "rows": [
        { "record": "Highest Single Week Score", "holder": "Eric", "value": 212.4, "season": 2022 }
      ]
    }
  ]
}`

// ─── Raw Data Storage ───────────────────────────────────────────────────────

async function storeRawData(sourceType, sourceRef, payload) {
  try {
    await prisma.rawProviderData.create({
      data: {
        provider: sourceType === 'website' ? 'website' : 'custom_spreadsheet',
        dataType: sourceType,
        eventRef: sourceRef || 'custom-upload',
        payload,
        recordCount: null,
        processedAt: null,
      },
    })
  } catch (err) {
    console.error(`[CustomImport] Failed to store raw ${sourceType}:`, err.message)
  }
}

// ─── Spreadsheet Parsing ────────────────────────────────────────────────────

/**
 * Parse an uploaded spreadsheet file (xlsx/csv) into headers + rows.
 * @param {Buffer} fileBuffer - The uploaded file buffer
 * @param {string} fileName - Original filename for type detection
 * @returns {{ sheets: Array<{ name, headers, rows }> }}
 */
function parseSpreadsheet(fileBuffer, fileName) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

  const sheets = workbook.SheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (jsonData.length < 2) {
      return { name: sheetName, headers: [], rows: [] }
    }

    const headers = jsonData[0].map(h => String(h || '').trim())
    const rows = jsonData.slice(1).filter(row =>
      row.some(cell => cell != null && String(cell).trim() !== '')
    )

    return { name: sheetName, headers, rows }
  })

  return { sheets }
}

/**
 * Fetch and parse a Google Sheets public URL.
 * Converts the share URL to a CSV export URL and fetches it.
 * @param {string} url - Google Sheets share URL
 * @returns {{ sheets: Array<{ name, headers, rows }> }}
 */
async function parseGoogleSheetsUrl(url) {
  // Convert share URL to CSV export URL
  // Format: https://docs.google.com/spreadsheets/d/{ID}/export?format=csv
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) {
    throw new Error('Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/...')
  }

  const sheetId = match[1]
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

  const res = await fetch(csvUrl)
  if (!res.ok) {
    throw new Error('Could not access Google Sheet. Make sure it is set to "Anyone with the link can view".')
  }

  const csvText = await res.text()
  const workbook = XLSX.read(csvText, { type: 'string' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  if (jsonData.length < 2) {
    throw new Error('Google Sheet appears empty.')
  }

  const headers = jsonData[0].map(h => String(h || '').trim())
  const rows = jsonData.slice(1).filter(row =>
    row.some(cell => cell != null && String(cell).trim() !== '')
  )

  return {
    sheets: [{ name: 'Sheet1', headers, rows }],
  }
}

// ─── AI Column Mapping ──────────────────────────────────────────────────────

/**
 * Use Claude to interpret spreadsheet columns and map them to known categories.
 * @param {string[]} headers - Column headers
 * @param {Array} sampleRows - First 5 data rows
 * @param {object} leagueContext - Optional league info (name, sport, etc.)
 * @returns {{ dataCategory, seasonYear, columns: Array<{ header, mappedTo, confidence, description }> }}
 */
async function interpretSpreadsheet(headers, sampleRows, leagueContext = {}) {
  const result = await claudeService.generateJsonCompletion(
    SHEET_INTERPRETATION_PROMPT,
    JSON.stringify({
      headers,
      sampleRows: sampleRows.slice(0, 5),
      leagueContext,
    }),
    { feature: 'ambient', skipConfigCheck: true, maxTokens: 1500 }
  )

  if (!result) {
    // Fallback: return unmapped columns
    return {
      dataCategory: 'other',
      seasonYear: null,
      columns: headers.map(h => ({
        header: h,
        mappedTo: 'CUSTOM',
        confidence: 'low',
        description: 'AI mapping unavailable',
      })),
    }
  }

  return result.data
}

// ─── Spreadsheet Import Pipeline ────────────────────────────────────────────

/**
 * Process a spreadsheet upload — parse, store raw, get AI mapping, return preview.
 * This is step 1: returns the preview for user confirmation.
 */
async function previewSpreadsheetImport(fileBuffer, fileName, leagueId, userId) {
  // Parse the spreadsheet
  const parsed = parseSpreadsheet(fileBuffer, fileName)

  if (parsed.sheets.length === 0 || parsed.sheets[0].rows.length === 0) {
    throw new Error('Spreadsheet appears empty — no data rows found.')
  }

  // Store raw content
  storeRawData('spreadsheet', fileName, {
    fileName,
    sheetCount: parsed.sheets.length,
    sheetNames: parsed.sheets.map(s => s.name),
    totalRows: parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0),
  }).catch(() => {})

  // Get AI mapping for each sheet
  const sheetPreviews = []
  for (const sheet of parsed.sheets) {
    if (sheet.headers.length === 0) continue

    const mapping = await interpretSpreadsheet(
      sheet.headers,
      sheet.rows,
      { leagueId }
    )

    sheetPreviews.push({
      sheetName: sheet.name,
      headers: sheet.headers,
      sampleRows: sheet.rows.slice(0, 5),
      totalRows: sheet.rows.length,
      mapping,
    })
  }

  // Store preview in a temporary record for confirmation step
  const preview = await prisma.rawProviderData.create({
    data: {
      provider: 'custom_spreadsheet',
      dataType: 'import_preview',
      eventRef: `preview-${userId}-${Date.now()}`,
      payload: {
        fileName,
        leagueId,
        userId,
        sheets: sheetPreviews,
        rawData: parsed.sheets,
      },
      recordCount: parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0),
      processedAt: null,
    },
  })

  return {
    previewId: preview.id,
    fileName,
    sheets: sheetPreviews,
  }
}

/**
 * Preview a Google Sheets URL import.
 */
async function previewGoogleSheetsImport(url, leagueId, userId) {
  const parsed = await parseGoogleSheetsUrl(url)

  // Store raw content
  storeRawData('google_sheets', url, {
    url,
    sheetCount: parsed.sheets.length,
    totalRows: parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0),
  }).catch(() => {})

  const sheetPreviews = []
  for (const sheet of parsed.sheets) {
    if (sheet.headers.length === 0) continue

    const mapping = await interpretSpreadsheet(
      sheet.headers,
      sheet.rows,
      { leagueId }
    )

    sheetPreviews.push({
      sheetName: sheet.name,
      headers: sheet.headers,
      sampleRows: sheet.rows.slice(0, 5),
      totalRows: sheet.rows.length,
      mapping,
    })
  }

  const preview = await prisma.rawProviderData.create({
    data: {
      provider: 'custom_spreadsheet',
      dataType: 'import_preview',
      eventRef: `preview-${userId}-${Date.now()}`,
      payload: {
        sourceUrl: url,
        leagueId,
        userId,
        sheets: sheetPreviews,
        rawData: parsed.sheets,
      },
      recordCount: parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0),
      processedAt: null,
    },
  })

  return {
    previewId: preview.id,
    sourceUrl: url,
    sheets: sheetPreviews,
  }
}

/**
 * Confirm and finalize a spreadsheet import.
 * Takes the previewId and optional column mapping overrides.
 *
 * @param {string} previewId - ID from preview step
 * @param {object} overrides - Optional user overrides for column mappings
 * @param {string} userId
 * @returns {Array<CustomLeagueData>}
 */
async function confirmSpreadsheetImport(previewId, overrides = {}, userId) {
  const preview = await prisma.rawProviderData.findUnique({
    where: { id: previewId },
  })

  if (!preview || preview.dataType !== 'import_preview') {
    throw new Error('Import preview not found or expired.')
  }

  const { leagueId, sheets: sheetPreviews, rawData, fileName, sourceUrl } = preview.payload

  const created = []

  for (let i = 0; i < sheetPreviews.length; i++) {
    const sheetPreview = sheetPreviews[i]
    const raw = rawData[i]
    const sheetOverrides = overrides[sheetPreview.sheetName] || {}

    // Apply user overrides to the AI mapping
    const finalMapping = { ...sheetPreview.mapping }
    if (sheetOverrides.dataCategory) {
      finalMapping.dataCategory = sheetOverrides.dataCategory
    }
    if (sheetOverrides.seasonYear !== undefined) {
      finalMapping.seasonYear = sheetOverrides.seasonYear
    }
    if (sheetOverrides.columns) {
      for (const override of sheetOverrides.columns) {
        const col = finalMapping.columns.find(c => c.header === override.header)
        if (col) {
          col.mappedTo = override.mappedTo
        }
      }
    }

    // Build structured data rows using the mapping
    const structuredRows = raw.rows.map(row => {
      const obj = {}
      for (let j = 0; j < raw.headers.length; j++) {
        const colMapping = finalMapping.columns[j]
        if (colMapping) {
          obj[colMapping.mappedTo] = row[j] != null ? row[j] : null
        }
      }
      return obj
    })

    const record = await prisma.customLeagueData.create({
      data: {
        leagueId,
        importedBy: userId,
        sourceType: sourceUrl ? 'google_sheets' : 'spreadsheet',
        sourceFileName: fileName || sourceUrl || null,
        dataCategory: finalMapping.dataCategory || 'other',
        seasonYear: finalMapping.seasonYear ? parseInt(finalMapping.seasonYear) : null,
        data: { rows: structuredRows, rawHeaders: raw.headers },
        columnMapping: finalMapping,
      },
    })

    created.push(record)
  }

  // Mark preview as processed
  await prisma.rawProviderData.update({
    where: { id: previewId },
    data: { processedAt: new Date() },
  })

  return created
}

// ─── Website Crawling ───────────────────────────────────────────────────────

/**
 * Crawl a league website and extract structured data.
 * Rate limited: 1 request per second, max 20 pages.
 * Only crawls within the same domain.
 *
 * @param {string} url - Starting URL
 * @param {number} maxPages - Maximum pages to crawl (default 20)
 * @returns {{ pages: Array<{ url, title, textContent, tables }> }}
 */
async function crawlLeagueWebsite(url, maxPages = 20) {
  const baseUrl = new URL(url)
  const baseDomain = baseUrl.hostname
  const visited = new Set()
  const pages = []
  const queue = [url]

  while (queue.length > 0 && pages.length < maxPages) {
    const currentUrl = queue.shift()

    // Normalize and deduplicate
    const normalized = normalizeUrl(currentUrl)
    if (visited.has(normalized)) continue
    visited.add(normalized)

    // Only crawl same domain
    try {
      const parsedUrl = new URL(currentUrl)
      if (parsedUrl.hostname !== baseDomain) continue
    } catch {
      continue
    }

    // Skip obvious non-content pages
    if (shouldSkipUrl(currentUrl)) continue

    try {
      // Rate limit: 1 second between requests
      if (pages.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const res = await fetch(currentUrl, {
        headers: { 'User-Agent': 'Clutch Fantasy Bot/1.0 (league data import)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) continue

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) continue

      const html = await res.text()

      // Extract text content and links
      const { title, textContent, tables, links } = extractPageContent(html, currentUrl)

      if (textContent.length > 50) {
        pages.push({ url: currentUrl, title, textContent, tables })
      }

      // Add internal links to the queue
      for (const link of links) {
        try {
          const linkUrl = new URL(link, currentUrl)
          if (linkUrl.hostname === baseDomain && !visited.has(normalizeUrl(linkUrl.href))) {
            queue.push(linkUrl.href)
          }
        } catch {
          // Invalid URL — skip
        }
      }
    } catch {
      // Fetch failed — skip this page
    }
  }

  return { pages }
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

function shouldSkipUrl(url) {
  const skip = ['/login', '/signin', '/signup', '/register', '/contact', '/about',
    '/privacy', '/terms', '/admin', '/wp-admin', '/wp-login', '.pdf',
    '.jpg', '.png', '.gif', '.svg', '.css', '.js', '/feed', '/rss']
  const lower = url.toLowerCase()
  return skip.some(s => lower.includes(s))
}

/**
 * Extract content from HTML — basic regex-based extraction.
 * Strips scripts, styles, and nav chrome. Preserves tables.
 */
function extractPageContent(html, baseUrl) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is)
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : ''

  // Remove scripts, styles, nav, header, footer
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')

  // Extract tables as structured data
  const tables = []
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRegex.exec(cleaned)) !== null) {
    const tableHtml = tableMatch[1]
    const rows = []
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells = []
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim())
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length > 0) tables.push(rows)
  }

  // Extract text content
  const textContent = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000) // Cap at 10K chars per page

  // Extract internal links
  const links = []
  const linkRegex = /href=["']([^"']+)["']/gi
  let linkMatch
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    links.push(linkMatch[1])
  }

  return { title, textContent, tables, links }
}

/**
 * Use Claude to interpret crawled website content and extract structured data.
 * @param {Array} pages - Crawled pages with textContent and tables
 * @param {object} leagueContext - Optional league info
 * @returns {{ pages: Array<{ url, title, extractedData }> }}
 */
async function interpretWebsiteContent(pages, leagueContext = {}) {
  const results = []

  // Process pages in batches of 3 to manage token costs
  for (let i = 0; i < pages.length; i += 3) {
    const batch = pages.slice(i, i + 3)

    const batchContent = batch.map(p => ({
      url: p.url,
      title: p.title,
      textContent: p.textContent.slice(0, 3000), // Cap per page for token management
      tables: p.tables.slice(0, 5), // Max 5 tables per page
    }))

    const result = await claudeService.generateJsonCompletion(
      WEBSITE_INTERPRETATION_PROMPT,
      JSON.stringify({
        pages: batchContent,
        leagueContext,
      }),
      { feature: 'ambient', skipConfigCheck: true, maxTokens: 2000, premium: true }
    )

    if (result?.data?.extractedData) {
      for (let j = 0; j < batch.length; j++) {
        const pageData = result.data.extractedData.filter(d =>
          // Match extracted data back to the source page (best effort)
          true // All data from this batch comes from these pages
        )
        if (pageData.length > 0) {
          results.push({
            url: batch[j].url,
            title: batch[j].title,
            extractedData: pageData,
          })
        }
      }
    }
  }

  return { pages: results }
}

/**
 * Preview a website import — crawl, interpret, return results for confirmation.
 */
async function previewWebsiteImport(url, leagueId, userId) {
  // Crawl the website
  const { pages } = await crawlLeagueWebsite(url)

  if (pages.length === 0) {
    throw new Error('No crawlable content found at that URL. Make sure the site is publicly accessible.')
  }

  // Store raw content
  storeRawData('website', url, {
    url,
    pageCount: pages.length,
    pages: pages.map(p => ({ url: p.url, title: p.title, textLength: p.textContent.length })),
  }).catch(() => {})

  // Interpret content with AI
  const interpreted = await interpretWebsiteContent(pages, { leagueId })

  // Store preview
  const preview = await prisma.rawProviderData.create({
    data: {
      provider: 'website',
      dataType: 'import_preview',
      eventRef: `preview-${userId}-${Date.now()}`,
      payload: {
        url,
        leagueId,
        userId,
        pages: interpreted.pages,
      },
      recordCount: pages.length,
      processedAt: null,
    },
  })

  return {
    previewId: preview.id,
    sourceUrl: url,
    pagesScanned: pages.length,
    pages: interpreted.pages,
  }
}

/**
 * Confirm and finalize a website import.
 * @param {string} previewId
 * @param {Array<string>} includedUrls - URLs to include (user can exclude pages)
 * @param {string} userId
 */
async function confirmWebsiteImport(previewId, includedUrls, userId) {
  const preview = await prisma.rawProviderData.findUnique({
    where: { id: previewId },
  })

  if (!preview || preview.dataType !== 'import_preview') {
    throw new Error('Import preview not found or expired.')
  }

  const { leagueId, pages } = preview.payload
  const created = []

  for (const page of pages) {
    // Skip excluded pages
    if (includedUrls && !includedUrls.includes(page.url)) continue

    for (const data of (page.extractedData || [])) {
      const record = await prisma.customLeagueData.create({
        data: {
          leagueId,
          importedBy: userId,
          sourceType: 'website',
          sourceFileName: page.url,
          dataCategory: data.category || 'other',
          seasonYear: data.seasonYear || null,
          data: { rows: data.rows || [], description: data.description },
          columnMapping: null,
        },
      })
      created.push(record)
    }
  }

  // Mark preview as processed
  await prisma.rawProviderData.update({
    where: { id: previewId },
    data: { processedAt: new Date() },
  })

  return created
}

// ─── Custom Data Queries ────────────────────────────────────────────────────

/**
 * Get all custom league data for a league.
 */
async function getCustomData(leagueId) {
  return prisma.customLeagueData.findMany({
    where: { leagueId },
    orderBy: [{ dataCategory: 'asc' }, { seasonYear: 'desc' }],
  })
}

/**
 * Delete a custom data record.
 */
async function deleteCustomData(dataId, userId) {
  const record = await prisma.customLeagueData.findUnique({
    where: { id: dataId },
  })
  if (!record) throw new Error('Custom data record not found')
  if (record.importedBy !== userId) throw new Error('Not authorized to delete this record')

  return prisma.customLeagueData.delete({ where: { id: dataId } })
}

module.exports = {
  parseSpreadsheet,
  parseGoogleSheetsUrl,
  interpretSpreadsheet,
  previewSpreadsheetImport,
  previewGoogleSheetsImport,
  confirmSpreadsheetImport,
  crawlLeagueWebsite,
  interpretWebsiteContent,
  previewWebsiteImport,
  confirmWebsiteImport,
  getCustomData,
  deleteCustomData,
}
