import { useState, useEffect, useCallback, useRef } from 'react'
import { mockApi } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'

export const useChat = (leagueId) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const pollIntervalRef = useRef(null)
  const lastTimestampRef = useRef(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      const data = await mockApi.chat.getMessages(leagueId, 100)
      setMessages(data)
      if (data.length > 0) {
        lastTimestampRef.current = data[data.length - 1].timestamp
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!leagueId || !lastTimestampRef.current) return

    try {
      const newMessages = await mockApi.chat.pollMessages(leagueId, lastTimestampRef.current)
      if (newMessages.length > 0) {
        setMessages(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m.id))
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id))
          if (uniqueNew.length > 0) {
            lastTimestampRef.current = uniqueNew[uniqueNew.length - 1].timestamp
            return [...prev, ...uniqueNew]
          }
          return prev
        })
      }
    } catch (err) {
      console.error('Error polling messages:', err)
    }
  }, [leagueId])

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!leagueId || !user || !content.trim()) return

    try {
      setSending(true)
      const newMessage = await mockApi.chat.sendMessage(
        leagueId,
        user.id,
        user.name,
        user.name?.charAt(0).toUpperCase() || 'U',
        content.trim()
      )
      setMessages(prev => [...prev, newMessage])
      lastTimestampRef.current = newMessage.timestamp
      return newMessage
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSending(false)
    }
  }, [leagueId, user])

  // Post system/activity message
  const postActivity = useCallback(async (content, activityType = null) => {
    if (!leagueId) return

    try {
      const newMessage = await mockApi.chat.postSystemMessage(leagueId, content, activityType)
      setMessages(prev => [...prev, newMessage])
      lastTimestampRef.current = newMessage.timestamp
      return newMessage
    } catch (err) {
      console.error('Error posting activity:', err)
    }
  }, [leagueId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Set up polling for real-time updates
  useEffect(() => {
    if (!leagueId) return

    // Poll every 3 seconds for new messages
    pollIntervalRef.current = setInterval(pollMessages, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [leagueId, pollMessages])

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    postActivity,
    refetch: fetchMessages,
  }
}

export default useChat
