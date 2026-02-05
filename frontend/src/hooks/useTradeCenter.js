import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'
import { useNotifications } from '../context/NotificationContext'

export const useTradeCenter = (leagueId) => {
  const { notify } = useNotifications()
  const [pendingTrades, setPendingTrades] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [leagueMembers, setLeagueMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrades = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await mockApi.trades.getAll(leagueId)
      setPendingTrades(data.pending)
      setTradeHistory(data.history)
      setLeagueMembers(data.members)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    setLoading(true)
    fetchTrades()
  }, [leagueId, fetchTrades])

  const proposeTrade = useCallback(async (tradeData) => {
    try {
      const result = await mockApi.trades.propose(leagueId, tradeData)
      setPendingTrades(prev => [...prev, result])
      notify.trade('Trade Proposed', `Trade sent to ${tradeData.toTeamName}`)
      return result
    } catch (err) {
      notify.error('Trade Failed', err.message)
      throw err
    }
  }, [leagueId, notify])

  const acceptTrade = useCallback(async (tradeId) => {
    try {
      await mockApi.trades.accept(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
      notify.success('Trade Accepted', 'The trade has been completed')
      fetchTrades()
    } catch (err) {
      notify.error('Error', err.message)
      throw err
    }
  }, [notify, fetchTrades])

  const rejectTrade = useCallback(async (tradeId) => {
    try {
      await mockApi.trades.reject(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
      notify.info('Trade Rejected', 'The trade has been declined')
    } catch (err) {
      notify.error('Error', err.message)
      throw err
    }
  }, [notify])

  const cancelTrade = useCallback(async (tradeId) => {
    try {
      await mockApi.trades.cancel(tradeId)
      setPendingTrades(prev => prev.filter(t => t.id !== tradeId))
      notify.info('Trade Cancelled', 'Your trade proposal has been withdrawn')
    } catch (err) {
      notify.error('Error', err.message)
      throw err
    }
  }, [notify])

  return {
    pendingTrades,
    tradeHistory,
    leagueMembers,
    loading,
    error,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,
    refetch: fetchTrades
  }
}

export default useTradeCenter
