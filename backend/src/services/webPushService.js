/**
 * Web Push Service
 *
 * Sends push notifications to user's registered WEB_PUSH tokens.
 * Uses the `web-push` npm package with VAPID keys.
 * Gracefully degrades if web-push is not installed or VAPID keys aren't set.
 */

let webpush = null
let isConfigured = false

try {
  webpush = require('web-push')

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      'mailto:support@clutchfantasysports.com',
      vapidPublicKey,
      vapidPrivateKey
    )
    isConfigured = true
    console.log('[webPush] Configured with VAPID keys')
  } else {
    console.log('[webPush] VAPID keys not set — web push disabled')
  }
} catch {
  console.log('[webPush] web-push package not installed — web push disabled')
}

/**
 * Send a web push notification to all of a user's active WEB_PUSH tokens.
 *
 * @param {string} userId
 * @param {object} notification - { title, message, actionUrl, type, data }
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function sendWebPush(userId, notification, prisma) {
  if (!isConfigured || !webpush) return

  // Check if user has push enabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  })
  const prefs = user?.notificationPreferences || {}
  if (prefs.push_enabled === false) return

  const tokens = await prisma.pushToken.findMany({
    where: { userId, type: 'WEB_PUSH', isActive: true },
  })

  if (tokens.length === 0) return

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    actionUrl: notification.actionUrl || '/',
    type: notification.type,
    timestamp: new Date().toISOString(),
  })

  for (const token of tokens) {
    try {
      const subscription = {
        endpoint: token.endpoint || token.token,
        keys: {
          p256dh: token.p256dh,
          auth: token.auth,
        },
      }

      await webpush.sendNotification(subscription, payload)

      // Update lastUsed
      await prisma.pushToken.update({
        where: { id: token.id },
        data: { lastUsed: new Date() },
      })
    } catch (err) {
      // 410 Gone or 404 = subscription expired, deactivate token
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[webPush] Token expired for user ${userId}, deactivating`)
        await prisma.pushToken.update({
          where: { id: token.id },
          data: { isActive: false },
        })
      } else {
        console.error(`[webPush] Push failed for token ${token.id}:`, err.message)
      }
    }
  }
}

module.exports = { sendWebPush, isConfigured }
