/**
 * League Intelligence Service (Addendum Part 3A-3C)
 *
 * Natural-language query engine scoped to a specific league's data.
 * Assembles context from platform imports + custom data + pre-computed stats,
 * then calls Claude to answer league history questions.
 *
 * NOT a general-purpose chatbot — only answers questions about data it has.
 */

const prisma = require('../lib/prisma.js')
const claudeService = require('./claudeService')
const { getLeagueStats } = require('./leagueStatsCache')

// ────────────────────────────────────────────────────────────
// System Prompt
// ────────────────────────────────────────────────────────────

const LEAGUE_QUERY_SYSTEM_PROMPT = `
You are the Clutch League Intelligence engine. You answer questions about a specific
fantasy sports league using ONLY the data provided to you. You have access to the
league's complete history including standings, matchups, drafts, transactions, records,
and any custom data the commissioner has imported.

CRITICAL RULES:
1. ONLY use data provided in the context. NEVER make up stats or records.
2. If the data doesn't contain the answer, say so clearly: "I don't have that data for your league."
3. Be specific — use actual numbers, actual names, actual seasons.
4. Be conversational — this is used during arguments between league mates.
   Light trash talk is encouraged when the data supports it.
5. When comparing two owners, present both sides fairly but don't be afraid to
   declare a winner if the data clearly supports one.
6. Always cite the source: "Based on your imported data" or "From your league records"
7. If the user asks "me" or "my", resolve their identity from the askingUser field.
8. Keep answers concise but complete. Lead with the answer, then provide context.
9. Format numbers for readability (1,842.5 not 1842.5).
10. For multi-season comparisons, show the data per season AND the aggregate.

OUTPUT FORMAT: Return a JSON object:
{
  "answer": "The natural language response",
  "data": { ... relevant stats used in the answer ... },
  "sources": ["yahoo_import", "custom_data", "clutch_live"],
  "suggestedFollowUps": ["What about playoff record?", "Who has the most championships?"]
}
`

// ────────────────────────────────────────────────────────────
// Query Classification (runs BEFORE AI call to minimize data loading)
// ────────────────────────────────────────────────────────────

function classifyQuery(query) {
  const q = (query || '').toLowerCase()

  return {
    needsStandings: /record|wins|losses|standing|finish|place|champion|playoff|season/.test(q),
    needsHeadToHead: /vs|versus|head.to.head|beat|against|record against|rivalry/.test(q),
    needsRecords: /record|highest|lowest|most|best|worst|all.time|history|blowout|close|streak/.test(q),
    needsDrafts: /draft|pick|round|auction|keeper|sleeper|bust|steal/.test(q),
    needsMatchups: /score|week|matchup|points|beat|margin|blowout|close/.test(q),
    needsTransactions: /trade|waiver|add|drop|faab|claim|pickup|transaction/.test(q),
    needsCustom: /trophy|award|punishment|custom|tradition/.test(q),
    needsRosters: /roster|lineup|start|bench|sit|play/.test(q),
    seasonFilter: extractSeasonFromQuery(q),
    weekFilter: extractWeekFromQuery(q),
  }
}

function extractSeasonFromQuery(q) {
  // Match 4-digit years (2015-2030 range)
  const match = q.match(/\b(20[1-3]\d)\b/)
  if (match) return parseInt(match[1])
  // Match "last season", "this season"
  const currentYear = new Date().getFullYear()
  if (/this\s+(season|year)/.test(q)) return currentYear
  if (/last\s+(season|year)/.test(q)) return currentYear - 1
  return null
}

function extractWeekFromQuery(q) {
  const match = q.match(/week\s+(\d{1,2})/i)
  if (match) return parseInt(match[1])
  return null
}

// ────────────────────────────────────────────────────────────
// Context Builder — assembles data scoped to the query
// ────────────────────────────────────────────────────────────

async function buildLeagueContext(leagueId, queryHint) {
  const context = {
    leagueInfo: null,
    owners: [],
    cachedStats: null,
    standings: [],
    drafts: [],
    matchups: [],
    transactions: [],
    customData: [],
  }

  const queryClass = classifyQuery(queryHint)

  // Always load league basics
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true, name: true, sport: true, format: true, draftType: true,
      maxTeams: true, settings: true,
    },
  })
  if (!league) return context
  context.leagueInfo = {
    name: league.name,
    sport: league.sport,
    format: league.format,
    draftType: league.draftType,
    maxTeams: league.maxTeams,
  }

  // Always load owner list from historical seasons
  const allSeasons = await prisma.historicalSeason.findMany({
    where: { leagueId },
    select: {
      ownerName: true, teamName: true, seasonYear: true,
      ownerUserId: true, wins: true, losses: true, ties: true,
      pointsFor: true, pointsAgainst: true, finalStanding: true,
      playoffResult: true,
    },
    orderBy: { seasonYear: 'asc' },
  })

  // Build unique owner list
  const ownerMap = new Map()
  for (const s of allSeasons) {
    const name = s.ownerName || s.teamName
    if (!name) continue
    if (!ownerMap.has(name)) {
      ownerMap.set(name, {
        name,
        teamNames: new Set(),
        seasons: [],
        userId: s.ownerUserId,
      })
    }
    const owner = ownerMap.get(name)
    if (s.teamName) owner.teamNames.add(s.teamName)
    owner.seasons.push(s.seasonYear)
    if (s.ownerUserId && !owner.userId) owner.userId = s.ownerUserId
  }
  context.owners = Array.from(ownerMap.values()).map(o => ({
    name: o.name,
    teamNames: Array.from(o.teamNames),
    seasonsActive: [...new Set(o.seasons)].sort(),
    userId: o.userId,
  }))

  // Load pre-computed stats from cache (covers standings, H2H, records)
  if (queryClass.needsStandings || queryClass.needsHeadToHead || queryClass.needsRecords) {
    context.cachedStats = await getLeagueStats(leagueId)
  }

  // Standings (per-season, lightweight — already in allSeasons)
  if (queryClass.needsStandings) {
    const filter = queryClass.seasonFilter
      ? allSeasons.filter(s => s.seasonYear === queryClass.seasonFilter)
      : allSeasons
    context.standings = filter.map(s => ({
      owner: s.ownerName || s.teamName,
      season: s.seasonYear,
      record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ''}`,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      standing: s.finalStanding,
      playoffResult: s.playoffResult,
    }))
  }

  // Draft data (heavier — only load if asked)
  if (queryClass.needsDrafts) {
    const draftSeasons = await prisma.historicalSeason.findMany({
      where: {
        leagueId,
        draftData: { not: null },
        ...(queryClass.seasonFilter ? { seasonYear: queryClass.seasonFilter } : {}),
      },
      select: { ownerName: true, teamName: true, seasonYear: true, draftData: true },
      orderBy: { seasonYear: 'asc' },
    })
    context.drafts = draftSeasons.map(s => ({
      owner: s.ownerName || s.teamName,
      season: s.seasonYear,
      picks: s.draftData,
    }))
  }

  // Weekly matchup data (heavy — filter by season/week if possible)
  if (queryClass.needsMatchups) {
    const matchupSeasons = await prisma.historicalSeason.findMany({
      where: {
        leagueId,
        weeklyScores: { not: null },
        ...(queryClass.seasonFilter ? { seasonYear: queryClass.seasonFilter } : {}),
      },
      select: { ownerName: true, teamName: true, seasonYear: true, weeklyScores: true },
      orderBy: { seasonYear: 'asc' },
    })
    context.matchups = matchupSeasons.map(s => {
      let scores = s.weeklyScores || []
      if (queryClass.weekFilter) {
        scores = scores.filter(w => w.week === queryClass.weekFilter)
      }
      return {
        owner: s.ownerName || s.teamName,
        season: s.seasonYear,
        scores,
      }
    })
  }

  // Transaction history
  if (queryClass.needsTransactions) {
    const txSeasons = await prisma.historicalSeason.findMany({
      where: {
        leagueId,
        transactions: { not: null },
        ...(queryClass.seasonFilter ? { seasonYear: queryClass.seasonFilter } : {}),
      },
      select: { ownerName: true, teamName: true, seasonYear: true, transactions: true },
      orderBy: { seasonYear: 'asc' },
    })
    context.transactions = txSeasons.map(s => ({
      owner: s.ownerName || s.teamName,
      season: s.seasonYear,
      transactions: s.transactions,
    }))
  }

  // Custom league data (trophies, awards, punishments, etc.)
  if (queryClass.needsCustom) {
    const custom = await prisma.customLeagueData.findMany({
      where: { leagueId },
      select: { dataCategory: true, seasonYear: true, data: true, sourceType: true },
      orderBy: { seasonYear: 'desc' },
    })
    context.customData = custom
  }

  return context
}

// ────────────────────────────────────────────────────────────
// Owner Identity Resolution
// ────────────────────────────────────────────────────────────

async function resolveOwnerIdentity(userId, leagueId) {
  if (!userId || !leagueId) return null

  // Find this user's team(s) in historical data
  const historicalTeams = await prisma.historicalSeason.findMany({
    where: { leagueId, ownerUserId: userId },
    select: { ownerName: true, teamName: true, seasonYear: true },
    orderBy: { seasonYear: 'desc' },
  })

  // Also check current league membership
  const member = await prisma.leagueMember.findUnique({
    where: { userId_leagueId: { userId, leagueId } },
    include: {
      user: { select: { name: true } },
    },
  })

  // Check current team
  const team = await prisma.team.findFirst({
    where: {
      league: { id: leagueId },
      members: { some: { userId } },
    },
    select: { name: true },
  })

  const ownerNames = [...new Set(historicalTeams.map(t => t.ownerName || t.teamName).filter(Boolean))]
  const teamNames = [...new Set(historicalTeams.map(t => t.teamName).filter(Boolean))]

  return {
    clutchUsername: member?.user?.name || null,
    currentTeamName: team?.name || null,
    historicalOwnerNames: ownerNames,
    historicalTeamNames: teamNames,
    seasonsActive: [...new Set(historicalTeams.map(t => t.seasonYear))].sort(),
  }
}

// ────────────────────────────────────────────────────────────
// Query Engine
// ────────────────────────────────────────────────────────────

async function queryLeague(userId, leagueId, question) {
  // 1. Resolve the asking user's identity
  const userOwnerInfo = await resolveOwnerIdentity(userId, leagueId)

  // 2. Build targeted context
  const context = await buildLeagueContext(leagueId, question)
  context.askingUser = userOwnerInfo

  // 3. Truncate context to stay under ~6K tokens of input
  const contextStr = truncateContext(context)

  // 4. Call Claude
  const result = await claudeService.generateJsonCompletion(
    LEAGUE_QUERY_SYSTEM_PROMPT,
    JSON.stringify({ question, leagueContext: JSON.parse(contextStr) }),
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 1000,
      feature: 'ambient', // Use ambient feature toggle
    }
  )

  if (!result) {
    return {
      answer: "I'm unable to answer right now. The AI engine may be disabled or temporarily unavailable.",
      data: null,
      sources: [],
      suggestedFollowUps: [],
    }
  }

  return result.data
}

async function queryLeagueWithHistory(userId, leagueId, question, sessionId) {
  // Load conversation history if resuming a session
  let messages = []
  let session = null

  if (sessionId) {
    session = await prisma.leagueQuerySession.findUnique({
      where: { id: sessionId },
    })
    if (session && session.userId === userId && session.leagueId === leagueId) {
      messages = session.messages || []
    }
  }

  // Add new question
  messages.push({ role: 'user', content: question, timestamp: new Date().toISOString() })

  // Build context
  const context = await buildLeagueContext(leagueId, question)
  context.askingUser = await resolveOwnerIdentity(userId, leagueId)
  context.conversationHistory = messages.slice(-10) // Keep last 10 messages

  const contextStr = truncateContext(context)

  // Call Claude with full conversation context
  const result = await claudeService.generateJsonCompletion(
    LEAGUE_QUERY_SYSTEM_PROMPT,
    JSON.stringify({
      question,
      leagueContext: JSON.parse(contextStr),
      conversationHistory: context.conversationHistory,
    }),
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 1000,
      feature: 'ambient',
    }
  )

  const parsed = result?.data || {
    answer: "I'm unable to answer right now. The AI engine may be disabled or temporarily unavailable.",
    data: null,
    sources: [],
    suggestedFollowUps: [],
  }

  // Add response to history
  messages.push({ role: 'assistant', content: parsed.answer, timestamp: new Date().toISOString() })

  // Upsert session (expires in 24 hours)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  if (session) {
    await prisma.leagueQuerySession.update({
      where: { id: session.id },
      data: { messages, updatedAt: new Date(), expiresAt },
    })
  } else {
    session = await prisma.leagueQuerySession.create({
      data: {
        userId,
        leagueId,
        messages,
        expiresAt,
      },
    })
  }

  return { ...parsed, sessionId: session.id }
}

// ────────────────────────────────────────────────────────────
// Session Management
// ────────────────────────────────────────────────────────────

async function getUserSessions(userId, leagueId) {
  const sessions = await prisma.leagueQuerySession.findMany({
    where: {
      userId,
      leagueId,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      messages: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  return sessions.map(s => ({
    id: s.id,
    messageCount: (s.messages || []).length,
    lastMessage: (s.messages || []).slice(-1)[0]?.content || '',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
}

async function deleteSession(sessionId, userId) {
  const session = await prisma.leagueQuerySession.findUnique({
    where: { id: sessionId },
  })
  if (!session || session.userId !== userId) return false

  await prisma.leagueQuerySession.delete({ where: { id: sessionId } })
  return true
}

// Cleanup expired sessions (called from cron or ad-hoc)
async function cleanupExpiredSessions() {
  const result = await prisma.leagueQuerySession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Truncate context JSON to stay within token budget (~6K tokens ≈ ~24K chars).
 * Prioritizes: leagueInfo > cachedStats > standings > owners > rest.
 */
function truncateContext(context) {
  const MAX_CHARS = 24000
  let str = JSON.stringify(context)

  if (str.length <= MAX_CHARS) return str

  // Progressive truncation — remove heaviest data first
  const truncated = { ...context }

  // 1. Trim matchup scores (heaviest)
  if (truncated.matchups && truncated.matchups.length > 0) {
    truncated.matchups = truncated.matchups.map(m => ({
      ...m,
      scores: (m.scores || []).slice(0, 5), // Keep first 5 weeks
    }))
  }

  str = JSON.stringify(truncated)
  if (str.length <= MAX_CHARS) return str

  // 2. Remove draft picks (keep summary)
  if (truncated.drafts && truncated.drafts.length > 0) {
    truncated.drafts = truncated.drafts.map(d => ({
      owner: d.owner,
      season: d.season,
      pickCount: Array.isArray(d.picks) ? d.picks.length : 0,
      note: '(draft details truncated for size)',
    }))
  }

  str = JSON.stringify(truncated)
  if (str.length <= MAX_CHARS) return str

  // 3. Remove transactions
  if (truncated.transactions && truncated.transactions.length > 0) {
    truncated.transactions = truncated.transactions.map(t => ({
      owner: t.owner,
      season: t.season,
      count: Array.isArray(t.transactions) ? t.transactions.length : 0,
      note: '(transaction details truncated for size)',
    }))
  }

  str = JSON.stringify(truncated)
  if (str.length <= MAX_CHARS) return str

  // 4. Drop matchups entirely
  truncated.matchups = []

  str = JSON.stringify(truncated)
  if (str.length <= MAX_CHARS) return str

  // 5. Trim standings to last 5 seasons
  if (truncated.standings && truncated.standings.length > 50) {
    truncated.standings = truncated.standings.slice(-50)
  }

  return JSON.stringify(truncated).slice(0, MAX_CHARS)
}

module.exports = {
  queryLeague,
  queryLeagueWithHistory,
  getUserSessions,
  deleteSession,
  cleanupExpiredSessions,
  buildLeagueContext,
  classifyQuery,
  resolveOwnerIdentity,
}
