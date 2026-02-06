import { useState, useCallback } from 'react'

// Stub — trade backend not yet implemented. Returns empty state so roster page doesn't crash.
export const useTrades = (leagueId) => {
  const [pendingTrades] = useState([])
  const [loading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error] = useState(null)

  const proposeTrade = useCallback(async () => {
    // TODO: wire to real API when trade endpoints are built
    setActionLoading(false)
  }, [])

  const acceptTrade = useCallback(async () => {}, [])
  const rejectTrade = useCallback(async () => {}, [])
  const cancelTrade = useCallback(async () => {}, [])
  const refetch = useCallback(async () => {}, [])

  return {
    pendingTrades,
    loading,
    actionLoading,
    error,
    refetch,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,
  }
}

export default useTrades
