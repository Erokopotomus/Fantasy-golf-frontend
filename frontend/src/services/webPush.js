/**
 * Web Push Service (Frontend)
 *
 * Handles browser push notification permissions, subscription,
 * and token registration with the backend.
 */

import api from './api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Check if the browser supports push notifications.
 */
export function isSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Get current notification permission status.
 */
export function getPermissionStatus() {
  if (!isSupported()) return 'unsupported'
  return Notification.permission // 'default', 'granted', 'denied'
}

/**
 * Request notification permission from the browser.
 * @returns {Promise<string>} 'granted', 'denied', or 'default'
 */
export async function requestPermission() {
  if (!isSupported()) return 'unsupported'
  return Notification.requestPermission()
}

/**
 * Register the service worker and subscribe to push notifications.
 * Returns the token ID from the backend for later unsubscription.
 */
export async function subscribe() {
  if (!isSupported() || !VAPID_PUBLIC_KEY) {
    console.warn('[webPush] Not supported or VAPID key missing')
    return null
  }

  const permission = await requestPermission()
  if (permission !== 'granted') {
    console.warn('[webPush] Permission not granted:', permission)
    return null
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js')
    await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const subJson = subscription.toJSON()

    // Register token with backend
    const result = await api.registerPushToken({
      type: 'WEB_PUSH',
      token: subJson.endpoint,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      userAgent: navigator.userAgent,
    })

    return result.pushToken
  } catch (err) {
    console.error('[webPush] Subscribe failed:', err)
    return null
  }
}

/**
 * Unsubscribe from push notifications.
 * @param {string} tokenId - Backend token ID
 */
export async function unsubscribe(tokenId) {
  try {
    // Unsubscribe from browser push
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
    }

    // Delete from backend
    if (tokenId) {
      await api.unregisterPushToken(tokenId)
    }
  } catch (err) {
    console.error('[webPush] Unsubscribe failed:', err)
  }
}

/**
 * Convert a base64 VAPID key to Uint8Array for pushManager.subscribe.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default { isSupported, getPermissionStatus, requestPermission, subscribe, unsubscribe }
