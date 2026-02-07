/**
 * Centralized Notification Service
 *
 * All notification creation flows through here. Handles:
 * - DB persistence
 * - Socket.IO real-time push to user rooms
 * - Web push (when available)
 * - User preference checking
 */

const NOTIFICATION_TYPES = {
  TRADE_PROPOSED: 'TRADE_PROPOSED',
  TRADE_ACCEPTED: 'TRADE_ACCEPTED',
  TRADE_REJECTED: 'TRADE_REJECTED',
  TRADE_CANCELLED: 'TRADE_CANCELLED',
  WAIVER_WON: 'WAIVER_WON',
  WAIVER_LOST: 'WAIVER_LOST',
  WAIVER_INVALID: 'WAIVER_INVALID',
  WAIVER_PROCESSED: 'WAIVER_PROCESSED',
  DRAFT_STARTED: 'DRAFT_STARTED',
  DRAFT_YOUR_TURN: 'DRAFT_YOUR_TURN',
  DRAFT_COMPLETED: 'DRAFT_COMPLETED',
  DRAFT_PICK_MADE: 'DRAFT_PICK_MADE',
  PLAYER_ADDED: 'PLAYER_ADDED',
  PLAYER_DROPPED: 'PLAYER_DROPPED',
  MEMBER_JOINED: 'MEMBER_JOINED',
  LEAGUE_INVITE: 'LEAGUE_INVITE',
  MATCHUP_RESULT: 'MATCHUP_RESULT',
  TOURNAMENT_COMPLETE: 'TOURNAMENT_COMPLETE',
  CHAT_MENTION: 'CHAT_MENTION',
}

// Map notification types to preference categories
const TYPE_TO_CATEGORY = {
  TRADE_PROPOSED: 'trades',
  TRADE_ACCEPTED: 'trades',
  TRADE_REJECTED: 'trades',
  TRADE_CANCELLED: 'trades',
  WAIVER_WON: 'waivers',
  WAIVER_LOST: 'waivers',
  WAIVER_INVALID: 'waivers',
  WAIVER_PROCESSED: 'waivers',
  DRAFT_STARTED: 'drafts',
  DRAFT_YOUR_TURN: 'drafts',
  DRAFT_COMPLETED: 'drafts',
  DRAFT_PICK_MADE: 'drafts',
  PLAYER_ADDED: 'roster_moves',
  PLAYER_DROPPED: 'roster_moves',
  MEMBER_JOINED: 'league_activity',
  LEAGUE_INVITE: 'league_activity',
  MATCHUP_RESULT: 'scores',
  TOURNAMENT_COMPLETE: 'scores',
  CHAT_MENTION: 'chat',
}

const DEFAULT_PREFERENCES = {
  trades: true,
  waivers: true,
  drafts: true,
  roster_moves: false,
  league_activity: true,
  scores: true,
  chat: true,
  push_enabled: true,
  email_enabled: false,
}

/**
 * Check if a user wants notifications for a given category.
 */
async function shouldNotifyUser(userId, category, prisma) {
  if (!category) return true

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    })

    const prefs = user?.notificationPreferences || {}
    // If the preference is not set, use the default
    if (prefs[category] === undefined) {
      return DEFAULT_PREFERENCES[category] !== false
    }
    return prefs[category] === true
  } catch {
    return true // Fail open — don't suppress notifications on error
  }
}

/**
 * Create a single notification.
 *
 * @param {object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.type - Notification type (from NOTIFICATION_TYPES)
 * @param {string} params.title - Short title
 * @param {string} params.message - Description
 * @param {string} [params.actionUrl] - Deep link URL
 * @param {object} [params.data] - Extra JSON data
 * @param {string} [params.category] - Preference category (auto-derived if omitted)
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<object|null>} Created notification or null if suppressed
 */
async function createNotification({ userId, type, title, message, actionUrl, data, category }, prisma) {
  const resolvedCategory = category || TYPE_TO_CATEGORY[type]

  // Check user preferences
  const shouldSend = await shouldNotifyUser(userId, resolvedCategory, prisma)
  if (!shouldSend) return null

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      data: data || null,
    },
  })

  // Socket.IO real-time push
  try {
    const io = global.io
    if (io) {
      io.to(`user-${userId}`).emit('notification', notification)
    }
  } catch (err) {
    console.error('[notificationService] Socket emit failed:', err.message)
  }

  // Web push (non-blocking)
  try {
    const webPush = require('./webPushService')
    if (webPush?.sendWebPush) {
      webPush.sendWebPush(userId, notification, prisma).catch(err =>
        console.error('[notificationService] Web push failed:', err.message)
      )
    }
  } catch {
    // webPushService not available yet — that's fine
  }

  return notification
}

/**
 * Create notifications for multiple users at once.
 */
async function createBulkNotifications(notifications, prisma) {
  const results = []
  for (const notif of notifications) {
    try {
      const result = await createNotification(notif, prisma)
      if (result) results.push(result)
    } catch (err) {
      console.error('[notificationService] Bulk create failed for user', notif.userId, ':', err.message)
    }
  }
  return results
}

/**
 * Notify all members of a league (except excluded users).
 *
 * @param {string} leagueId
 * @param {object} notificationData - { type, title, message, actionUrl, data, category }
 * @param {string[]} [excludeUserIds] - Users to skip (e.g. the actor)
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function notifyLeague(leagueId, notificationData, excludeUserIds = [], prisma) {
  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    select: { userId: true },
  })

  const notifications = members
    .filter(m => !excludeUserIds.includes(m.userId))
    .map(m => ({
      ...notificationData,
      userId: m.userId,
    }))

  return createBulkNotifications(notifications, prisma)
}

module.exports = {
  NOTIFICATION_TYPES,
  TYPE_TO_CATEGORY,
  DEFAULT_PREFERENCES,
  createNotification,
  createBulkNotifications,
  notifyLeague,
  shouldNotifyUser,
}
