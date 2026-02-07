/**
 * Service Worker for Clutch Fantasy Sports
 *
 * Handles push notification display and click actions.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-72.png',
      data: {
        actionUrl: data.actionUrl || '/',
        type: data.type,
      },
      tag: data.type || 'clutch-notification',
      renotify: true,
      requireInteraction: false,
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Clutch Fantasy', options)
    )
  } catch (err) {
    console.error('[SW] Push parse error:', err)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const actionUrl = event.notification.data?.actionUrl || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if possible
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(actionUrl)
          return client.focus()
        }
      }
      // Open new window
      return self.clients.openWindow(actionUrl)
    })
  )
})
