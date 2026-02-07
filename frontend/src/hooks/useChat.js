import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import socketService from '../services/socket'
import { track, Events } from '../services/analytics'

export const useChat = (leagueId) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const unsubRef = useRef(null)

  // Fetch initial messages from API
  const fetchMessages = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      const data = await api.getLeagueMessages(leagueId, { limit: 100 })
      // Backend returns { messages: [...] } or just array
      const msgs = Array.isArray(data) ? data : (data.messages || [])
      // Normalize shape for ChatMessage component
      const normalized = msgs.map(m => {
        let type = 'user'
        let activityType = null
        if (m.messageType === 'SYSTEM') {
          type = 'system'
        } else if (m.messageType === 'TRADE') {
          type = 'activity'
          activityType = 'trade'
        } else if (m.messageType === 'DRAFT') {
          type = 'activity'
          activityType = 'lineup'
        }
        return {
          id: m.id,
          content: m.content,
          type,
          activityType,
          userId: m.userId,
          userName: m.user?.name || 'Unknown',
          userAvatar: m.user?.name?.charAt(0).toUpperCase() || '?',
          timestamp: m.createdAt,
        }
      })
      setMessages(normalized)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  // Send a message via API (Socket.IO will broadcast it back)
  const sendMessage = useCallback(async (content) => {
    if (!leagueId || !user || !content.trim()) return

    try {
      setSending(true)
      const data = await api.sendMessage(leagueId, content.trim())
      track(Events.MESSAGE_SENT, { leagueId, type: 'text' })
      // Optimistically add to local state
      const msg = {
        id: data.id || data.message?.id || Date.now().toString(),
        content: content.trim(),
        type: 'user',
        userId: user.id,
        userName: user.name,
        userAvatar: user.name?.charAt(0).toUpperCase() || 'U',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, msg])
      return msg
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSending(false)
    }
  }, [leagueId, user])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Socket.IO: join league room and listen for new messages
  useEffect(() => {
    if (!leagueId) return

    socketService.connect()
    socketService.joinLeague(leagueId)

    // Listen for incoming messages from other users
    const unsub = socketService.onNewMessage((data) => {
      // Don't duplicate own messages (already added optimistically)
      if (data.userId === user?.id) return

      let msgType = 'user'
      let actType = null
      if (data.messageType === 'SYSTEM') {
        msgType = 'system'
      } else if (data.messageType === 'TRADE') {
        msgType = 'activity'
        actType = 'trade'
      } else if (data.messageType === 'DRAFT') {
        msgType = 'activity'
        actType = 'lineup'
      }
      const msg = {
        id: data.id || Date.now().toString(),
        content: data.content,
        type: msgType,
        activityType: actType,
        userId: data.userId,
        userName: data.userName || data.user?.name || 'Unknown',
        userAvatar: data.userAvatar || data.user?.name?.charAt(0).toUpperCase() || '?',
        timestamp: data.createdAt || new Date().toISOString(),
      }

      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    unsubRef.current = unsub

    return () => {
      if (unsubRef.current) unsubRef.current()
      socketService.leaveLeague(leagueId)
    }
  }, [leagueId, user?.id])

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refetch: fetchMessages,
  }
}

export default useChat
