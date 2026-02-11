/**
 * Opinion Evolution Timeline Service (Phase 6A-5)
 *
 * Records per-user-per-player opinion events across the platform.
 * Fire-and-forget — must NEVER block primary actions.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Record an opinion event. All calls should be fire-and-forget.
 */
async function recordEvent(userId, playerId, sport, eventType, eventData, sourceId, sourceType) {
  try {
    // Detect sentiment from event data or type
    let sentiment = eventData.sentiment || null
    if (!sentiment) {
      if (['WATCH_ADD', 'BOARD_ADD', 'WAIVER_ADD', 'TRADE_ACQUIRE', 'LINEUP_START'].includes(eventType)) {
        sentiment = 'positive'
      } else if (['WATCH_REMOVE', 'BOARD_REMOVE', 'WAIVER_DROP', 'TRADE_AWAY', 'LINEUP_BENCH'].includes(eventType)) {
        sentiment = 'negative'
      } else if (eventType === 'BOARD_TAG') {
        if (eventData.tag === 'TARGET' || eventData.tag === 'SLEEPER') sentiment = 'positive'
        else if (eventData.tag === 'AVOID') sentiment = 'negative'
      } else if (eventType === 'CAPTURE') {
        sentiment = eventData.sentiment || null
      }
    }

    await prisma.playerOpinionEvent.create({
      data: {
        userId,
        playerId,
        sport: sport || 'unknown',
        eventType,
        eventData,
        sentiment,
        sourceId: sourceId || null,
        sourceType: sourceType || null,
      },
    })
  } catch (err) {
    // Fire-and-forget — never throw
    console.error(`[OpinionTimeline] Failed to record ${eventType} for player ${playerId}:`, err.message)
  }
}

/**
 * Get all opinion events for a user+player, chronologically.
 */
async function getTimeline(userId, playerId) {
  return prisma.playerOpinionEvent.findMany({
    where: { userId, playerId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get all opinion events for a user in a sport/season window.
 */
async function getSeasonTimeline(userId, sport, startDate, endDate) {
  const where = { userId, sport }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }
  return prisma.playerOpinionEvent.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get the sentiment arc for a user+player (just sentiment + timestamp).
 */
async function getSentimentArc(userId, playerId) {
  const events = await prisma.playerOpinionEvent.findMany({
    where: { userId, playerId, sentiment: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { eventType: true, sentiment: true, createdAt: true },
  })
  return events
}

module.exports = {
  recordEvent,
  getTimeline,
  getSeasonTimeline,
  getSentimentArc,
}
