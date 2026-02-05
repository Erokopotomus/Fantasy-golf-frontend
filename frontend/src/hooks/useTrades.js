import { useState, useEffect, useCallback, useRef } from 'react'
import { mockApi } from '../services/mockApi'
import { useNotifications } from '../context/NotificationContext'

export const useTrades = (leagueId) => {
  const { notify } = useNotifications()
  const previousIncomingCountRef = useRef(0)
  const [pendingTrades, setPendingTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.trades.getPending(leagueId)
      setPendingTrades(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    if (leagueId) {
      fetchTrades()
    }
  }, [leagueId, fetchTrades])

  // Check for new incoming trades and notify
  useEffect(() => {
    const incomingTrades = pendingTrades.filter(t => t.isIncoming)
    const newIncomingCount = incomingTrades.length

    if (newIncomingCount > previousIncomingCountRef.current && previousIncomingCountRef.current > 0) {
      const newestTrade = incomingTrades[incomingTrades.length - 1]
      notify.trade(
        'Trade Proposal Received',
        `${newestTrade?.otherTeamName || 'Someone'} wants to trade with you`,
        {
          action: {
            label: 'View Trade',
            onClick: () => window.location.href = `/leagues/${leagueId}/roster`,
          },
        }
      )
    }
    previousIncomingCountRef.current = newIncomingCount
  }, [pendingTrades, leagueId, notify])

  const proposeTrade = useCallback(async (tradeData) => {
    try {
      setActionLoading(true)
      setError(null)
      const result = await mockApi.trades.propose(leagueId, tradeData)
      setPendingTrades(prev => [...prev, result])
      notify.success('Trade Proposed', `Trade offer sent to ${tradeData.toTeamName}`)
      return result
    } catch (err) {
      setError(err.message)
      notify.error('Trade Failed', err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [leagueId, notify])

  const acceptTrade = useCallback(async (tradeId) => {
    try {
      setActionLoading(true)
      setError(null)
      await mockApi.trades.accept(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
      notify.success('Trade Accepted', 'Players have been swapped')
    } catch (err) {
      setError(err.message)
      notify.error('Trade Failed', err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [notify])

  const rejectTrade = useCallback(async (tradeId) => {
    try {
      setActionLoading(true)
      setError(null)
      await mockApi.trades.reject(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const cancelTrade = useCallback(async (tradeId) => {
    try {
      setActionLoading(true)
      setError(null)
      await mockApi.trades.cancel(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  return {
    pendingTrades,
    loading,
    actionLoading,
    error,
    refetch: fetchTrades,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,
  }
}

export default useTrades
