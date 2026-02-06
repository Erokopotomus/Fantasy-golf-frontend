import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useNotificationInbox = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('clutch_token')
    if (!token) return

    try {
      setLoading(true)
      const data = await api.getNotifications({ limit: 30 })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id) => {
    try {
      await api.markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }, [])

  const deleteNotification = useCallback(async (id) => {
    try {
      const notif = notifications.find(n => n.id === id)
      await api.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }, [notifications])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllRead,
    deleteNotification,
    refetch: fetchNotifications,
  }
}

export default useNotificationInbox
