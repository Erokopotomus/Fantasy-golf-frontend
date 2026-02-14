const prisma = require('../lib/prisma.js')

async function generateInsight(userId) {
  // Check cache first
  const cached = await prisma.labInsightCache.findUnique({ where: { userId } })
  if (cached && !cached.dismissedAt) {
    const age = Date.now() - new Date(cached.generatedAt).getTime()
    if (age < 24 * 60 * 60 * 1000) {
      return { text: cached.insightText, type: cached.insightType }
    }
  }

  // Generate fresh insight
  const insight = await computeInsight(userId)

  // Upsert cache
  await prisma.labInsightCache.upsert({
    where: { userId },
    update: {
      insightText: insight.text,
      insightType: insight.type,
      generatedAt: new Date(),
      dismissedAt: null,
    },
    create: {
      userId,
      insightText: insight.text,
      insightType: insight.type,
    },
  })

  return insight
}

async function computeInsight(userId) {
  // 1. Onboarding — no boards
  const boardCount = await prisma.draftBoard.count({ where: { userId } })
  if (boardCount === 0) {
    return {
      text: "Welcome to The Lab. This is where your draft thesis takes shape. Start by creating your first board — we'll pre-load it with consensus rankings so you can start adjusting right away.",
      type: 'onboarding',
    }
  }

  // Load boards for further checks
  const boards = await prisma.draftBoard.findMany({
    where: { userId },
    include: {
      entries: { select: { player: { select: { nflPosition: true } } } },
      _count: { select: { entries: true } },
    },
  })

  const nflBoards = boards.filter(b => b.sport === 'nfl')

  // 2. Missing positions
  for (const board of nflBoards) {
    if (board.entries.length === 0) continue
    const positions = board.entries.map(e => e.player?.nflPosition).filter(Boolean)
    const posSet = new Set(positions)
    const missing = ['QB', 'RB', 'WR', 'TE'].filter(p => !posSet.has(p))
    if (missing.length > 0 && missing.length < 4) {
      const missingStr = missing.join(' and ')
      return {
        text: `You've got rankings going but haven't touched ${missingStr} yet. The ${missing[0]} landscape this year has some interesting tier breaks — worth getting your take down.`,
        type: 'nudge',
      }
    }
  }

  // 3. Stale board (14+ days without update)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  for (const board of nflBoards) {
    if (board._count.entries > 0 && board.updatedAt < twoWeeksAgo) {
      const dateStr = board.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        text: `Your "${board.name}" hasn't been updated since ${dateStr}. Time to revisit?`,
        type: 'nudge',
      }
    }
  }

  // 4. No captures
  const captureCount = await prisma.labCapture.count({ where: { userId } })
  if (captureCount === 0 && boardCount > 0) {
    return {
      text: "You've built boards but haven't captured any notes yet. Next time you hear a podcast take, hit the capture button — those fleeting insights are the edge.",
      type: 'nudge',
    }
  }

  // 5-7. Seasonal
  const month = new Date().getMonth() // 0-indexed
  if (month >= 1 && month <= 4) {
    // Feb-May: offseason
    return {
      text: 'Offseason research mode. Build your boards, capture takes, develop your thesis.',
      type: 'seasonal',
    }
  }
  if (month >= 5 && month <= 7) {
    // Jun-Aug: draft prep
    const readyCount = nflBoards.filter(b => {
      if (b.entries.length === 0) return false
      const positions = b.entries.map(e => e.player?.nflPosition).filter(Boolean)
      const posSet = new Set(positions)
      return ['QB', 'RB', 'WR', 'TE'].every(p => posSet.has(p))
    }).length
    return {
      text: `Draft season is approaching. Your boards are ${readyCount}/${nflBoards.length} ready. Time to finalize.`,
      type: 'seasonal',
    }
  }
  if (month >= 8 || month === 0) {
    // Sep-Jan: in-season
    return {
      text: "Season underway. Your pre-season boards are tracking — check Prove It to see how your thesis is holding up.",
      type: 'seasonal',
    }
  }

  // 8. Default
  return {
    text: 'Keep refining your thesis. Every ranking move is a conviction.',
    type: 'nudge',
  }
}

async function dismissInsight(userId) {
  await prisma.labInsightCache.upsert({
    where: { userId },
    update: { dismissedAt: new Date() },
    create: {
      userId,
      insightText: '',
      insightType: 'dismissed',
      dismissedAt: new Date(),
    },
  })
  return { success: true }
}

module.exports = {
  generateInsight,
  dismissInsight,
}
