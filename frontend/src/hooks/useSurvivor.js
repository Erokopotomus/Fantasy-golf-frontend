import { useState, useCallback } from 'react'

export const useSurvivor = (leagueId) => {
  const [survivorData] = useState({
    currentWeek: 1,
    eliminations: [],
    buyBacks: [],
    buyBacksAllowed: true,
  })
  const [loading] = useState(false)
  const [error] = useState(null)
  const [buyBackLoading, setBuyBackLoading] = useState(false)

  const fetchSurvivorData = useCallback(async () => {
    // TODO: Replace with real API call when backend survivor endpoints are built
    // e.g. const data = await api.getSurvivorStatus(leagueId)
  }, [leagueId])

  const useBuyBack = useCallback(async (userId) => {
    if (!leagueId || !userId) return
    try {
      setBuyBackLoading(true)
      // TODO: Replace with real API call
      await fetchSurvivorData()
    } finally {
      setBuyBackLoading(false)
    }
  }, [leagueId, fetchSurvivorData])

  const canUseBuyBack = useCallback((userId, userStatus) => {
    if (!survivorData) return false
    if (!survivorData.buyBacksAllowed) return false
    if (userStatus !== 'eliminated') return false
    const existingBuyBack = survivorData.buyBacks?.find(b => b.userId === userId)
    return !existingBuyBack
  }, [survivorData])

  const getEliminationForWeek = useCallback((week) => {
    return survivorData?.eliminations?.find(e => e.week === week) || null
  }, [survivorData])

  return {
    survivorData,
    loading,
    error,
    buyBackLoading,
    refetch: fetchSurvivorData,
    useBuyBack,
    canUseBuyBack,
    getEliminationForWeek,
  }
}

export default useSurvivor
