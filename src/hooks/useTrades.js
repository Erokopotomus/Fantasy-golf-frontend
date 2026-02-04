import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useTrades = (leagueId) => {
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

  const proposeTrade = useCallback(async (tradeData) => {
    try {
      setActionLoading(true)
      setError(null)
      const result = await mockApi.trades.propose(leagueId, tradeData)
      setPendingTrades(prev => [...prev, result])
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [leagueId])

  const acceptTrade = useCallback(async (tradeId) => {
    try {
      setActionLoading(true)
      setError(null)
      await mockApi.trades.accept(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

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
