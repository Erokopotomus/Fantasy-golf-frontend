const { stageRaw } = require('./etlPipeline')

// ESPN team ID → our NflTeam.abbreviation
const ESPN_TEAM_MAP = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR',
  15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA',
  27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
}

const TRANSACTION_KEYWORDS = [
  'signs', 'signed', 'signing', 'traded', 'trade', 'released', 'waived',
  'cut', 'free agent', 'contract', 'franchise tag', 'extension', 'deal',
  'restructure', 'void', 'opt out',
]

const INJURY_KEYWORDS = [
  'injury', 'injured', 'out for', 'ACL', 'MCL', 'concussion', 'hamstring',
  'ankle', 'knee', 'shoulder', 'surgery', 'IR', 'injured reserve',
  'questionable', 'doubtful', 'ruled out', 'DNP', 'limited',
]

const HIGH_PRIORITY_REPORTERS = [
  'adam schefter', 'ian rapoport', 'tom pelissero', 'dianna russini',
  'jordan schultz', 'albert breer', 'peter king',
]

/**
 * Categorize an ESPN article based on headline + categories
 */
function categorizeArticle(article) {
  const headline = (article.headline || '').toLowerCase()
  const desc = (article.description || '').toLowerCase()
  const text = headline + ' ' + desc

  if (TRANSACTION_KEYWORDS.some(kw => text.includes(kw))) {
    return { type: 'transaction', category: 'transaction' }
  }
  if (INJURY_KEYWORDS.some(kw => text.includes(kw))) {
    return { type: 'injury', category: 'injury' }
  }
  // Analysis: opinion, rankings, breakdown, preview
  if (/analysis|preview|ranking|breakdown|projection|prediction|power rank/i.test(text)) {
    return { type: 'analysis', category: 'analysis' }
  }
  return { type: 'news', category: 'news' }
}

/**
 * Determine priority based on byline + content
 */
function determinePriority(article, category) {
  const byline = (article.byline || '').toLowerCase()
  const headline = (article.headline || '').toLowerCase()

  // Breaking: major transaction/injury from top reporters
  if (HIGH_PRIORITY_REPORTERS.some(r => byline.includes(r))) {
    if (category === 'transaction' || category === 'injury') return 1
    return 2
  }

  // Injury: "out for season" or "torn" = breaking
  if (/out for season|torn acl|torn achilles|career.ending/i.test(headline)) return 1

  // Transaction with big names
  if (category === 'transaction') return 2

  return 3
}

/**
 * Extract team abbreviations from ESPN article categories
 */
function matchTeams(article) {
  const abbrs = new Set()

  // ESPN categories contain team references with teamId
  const categories = article.categories || []
  for (const cat of categories) {
    if (cat.type === 'team' && cat.teamId) {
      const abbr = ESPN_TEAM_MAP[cat.teamId]
      if (abbr) abbrs.add(abbr)
    }
    // Also check nested athletes for team info
    if (cat.type === 'athlete' && cat.teamId) {
      const abbr = ESPN_TEAM_MAP[cat.teamId]
      if (abbr) abbrs.add(abbr)
    }
  }

  return [...abbrs]
}

/**
 * Match ESPN article to player IDs in our DB
 */
async function matchPlayers(article, prisma) {
  const playerIds = []
  const categories = article.categories || []

  for (const cat of categories) {
    if (cat.type !== 'athlete') continue

    const athleteId = String(cat.athleteId || cat.id || '')
    const name = cat.description || ''

    if (!athleteId && !name) continue

    // Try ESPN ID match first
    if (athleteId) {
      const player = await prisma.player.findFirst({
        where: { espnId: athleteId },
        select: { id: true },
      })
      if (player) {
        playerIds.push(player.id)
        continue
      }
    }

    // Fallback: case-insensitive name match
    if (name) {
      const player = await prisma.player.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (player) {
        playerIds.push(player.id)
      }
    }
  }

  return playerIds
}

/**
 * Parse ESPN article into our NewsArticle shape
 */
function parseEspnArticle(article, sport) {
  // Get image URL — ESPN provides multiple sizes
  let imageUrl = null
  if (article.images?.length > 0) {
    // Prefer 'header' type, then any image
    const headerImg = article.images.find(i => i.type === 'header')
    imageUrl = (headerImg || article.images[0])?.url || null
  }

  // Get article URL
  let url = null
  if (article.links?.web?.href) {
    url = article.links.web.href
  } else if (article.links?.web?.short?.href) {
    url = article.links.web.short.href
  }

  return {
    externalId: String(article.id || article.dataSourceIdentifier || ''),
    provider: 'espn',
    sport,
    headline: article.headline || '',
    description: article.description || null,
    url,
    imageUrl,
    byline: article.byline || null,
    published: article.published ? new Date(article.published) : new Date(),
  }
}

/**
 * Fetch + parse + upsert NFL news from ESPN
 */
async function syncNflNews(prisma) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50'
  let data

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[newsSync] ESPN NFL news HTTP ${res.status}`)
      return { new: 0, updated: 0, error: `HTTP ${res.status}` }
    }
    data = await res.json()
  } catch (err) {
    console.error(`[newsSync] ESPN NFL fetch failed: ${err.message}`)
    return { new: 0, updated: 0, error: err.message }
  }

  // Stage raw
  await stageRaw(prisma, 'espn', 'nfl_news', null, data).catch(() => {})

  const articles = data.articles || []
  let newCount = 0
  let updatedCount = 0

  for (const article of articles) {
    try {
      const parsed = parseEspnArticle(article, 'nfl')
      if (!parsed.externalId || !parsed.headline) continue

      const { type, category } = categorizeArticle(article)
      const priority = determinePriority(article, category)
      const teamAbbrs = matchTeams(article)
      const playerIds = await matchPlayers(article, prisma)

      const existing = await prisma.newsArticle.findUnique({
        where: { externalId: parsed.externalId },
      })

      if (existing) {
        await prisma.newsArticle.update({
          where: { externalId: parsed.externalId },
          data: {
            headline: parsed.headline,
            description: parsed.description,
            imageUrl: parsed.imageUrl,
            teamAbbrs,
            playerIds,
            category,
            type,
            priority,
          },
        })
        updatedCount++
      } else {
        await prisma.newsArticle.create({
          data: {
            ...parsed,
            type,
            category,
            priority,
            teamAbbrs,
            playerIds,
          },
        })
        newCount++
      }
    } catch (err) {
      // Skip individual article errors
      console.error(`[newsSync] Article error: ${err.message}`)
    }
  }

  console.log(`[newsSync] NFL: ${newCount} new, ${updatedCount} updated from ${articles.length} articles`)
  return { new: newCount, updated: updatedCount }
}

/**
 * Fetch + parse + upsert Golf news from ESPN
 */
async function syncGolfNews(prisma) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/news?limit=25'
  let data

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[newsSync] ESPN Golf news HTTP ${res.status}`)
      return { new: 0, updated: 0, error: `HTTP ${res.status}` }
    }
    data = await res.json()
  } catch (err) {
    console.error(`[newsSync] ESPN Golf fetch failed: ${err.message}`)
    return { new: 0, updated: 0, error: err.message }
  }

  // Stage raw
  await stageRaw(prisma, 'espn', 'golf_news', null, data).catch(() => {})

  const articles = data.articles || []
  let newCount = 0
  let updatedCount = 0

  for (const article of articles) {
    try {
      const parsed = parseEspnArticle(article, 'golf')
      if (!parsed.externalId || !parsed.headline) continue

      const { type, category } = categorizeArticle(article)
      const priority = determinePriority(article, category)

      // Golf: no team matching, but try player matching
      const playerIds = await matchPlayers(article, prisma)

      const existing = await prisma.newsArticle.findUnique({
        where: { externalId: parsed.externalId },
      })

      if (existing) {
        await prisma.newsArticle.update({
          where: { externalId: parsed.externalId },
          data: {
            headline: parsed.headline,
            description: parsed.description,
            imageUrl: parsed.imageUrl,
            playerIds,
            category,
            type,
            priority,
          },
        })
        updatedCount++
      } else {
        await prisma.newsArticle.create({
          data: {
            ...parsed,
            type,
            category,
            priority,
            teamAbbrs: [],
            playerIds,
          },
        })
        newCount++
      }
    } catch (err) {
      console.error(`[newsSync] Golf article error: ${err.message}`)
    }
  }

  console.log(`[newsSync] Golf: ${newCount} new, ${updatedCount} updated from ${articles.length} articles`)
  return { new: newCount, updated: updatedCount }
}

module.exports = { syncNflNews, syncGolfNews }
