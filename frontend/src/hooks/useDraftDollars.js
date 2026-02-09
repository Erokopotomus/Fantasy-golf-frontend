import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useDraftDollars(leagueId) {
  const [balances, setBalances] = useState(null)
  const [ledger, setLedger] = useState([])
  const [ledgerTotal, setLedgerTotal] = useState(0)
  const [settings, setSettings] = useState({})
  const [leagueSeasonId, setLeagueSeasonId] = useState(null)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBalances = useCallback(async () => {
    if (!leagueId) return
    try {
      const data = await api.getDraftDollarBalances(leagueId)
      setEnabled(data.enabled || false)
      setBalances(data.accounts || [])
      setSettings(data.settings || {})
      setLeagueSeasonId(data.leagueSeasonId || null)
    } catch (err) {
      setError(err.message)
    }
  }, [leagueId])

  const fetchLedger = useCallback(async (params = {}) => {
    if (!leagueId) return
    try {
      const data = await api.getDraftDollarLedger(leagueId, params)
      setLedger(data.transactions || [])
      setLedgerTotal(data.total || 0)
    } catch (err) {
      console.error('Ledger fetch failed:', err.message)
    }
  }, [leagueId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchBalances(), fetchLedger()])
      .finally(() => setLoading(false))
  }, [fetchBalances, fetchLedger])

  const recordTransaction = useCallback(async (data) => {
    const result = await api.recordDraftDollarTransaction(leagueId, data)
    await fetchBalances()
    await fetchLedger()
    return result
  }, [leagueId, fetchBalances, fetchLedger])

  const adjustBalance = useCallback(async (data) => {
    const result = await api.adjustDraftDollarBalance(leagueId, data)
    await fetchBalances()
    await fetchLedger()
    return result
  }, [leagueId, fetchBalances, fetchLedger])

  return {
    balances,
    ledger,
    ledgerTotal,
    settings,
    leagueSeasonId,
    enabled,
    loading,
    error,
    refetchBalances: fetchBalances,
    refetchLedger: fetchLedger,
    recordTransaction,
    adjustBalance,
  }
}

export default useDraftDollars
