import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useSurvivor = (leagueId) => {
  const [survivorData, setSurvivorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buyBackLoading, setBuyBackLoading] = useState(false)

  const fetchSurvivorData = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await mockApi.survivor.getStatus(leagueId)
      setSurvivorData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchSurvivorData()
  }, [fetchSurvivorData])

  const useBuyBack = useCallback(async (userId) => {
    if (!leagueId || !userId) return

    try {
      setBuyBackLoading(true)
      const result = await mockApi.survivor.useBuyBack(leagueId, userId)
      // Refresh data after buy-back
      await fetchSurvivorData()
      return result
    } catch (err) {
      throw err
    } finally {
      setBuyBackLoading(false)
    }
  }, [leagueId, fetchSurvivorData])

  // Check if a user can use buy-back
  const canUseBuyBack = useCallback((userId, userStatus) => {
    if (!survivorData) return false
    if (!survivorData.buyBacksAllowed) return false
    if (userStatus !== 'eliminated') return false

    // Check if user already used buy-back
    const existingBuyBack = survivorData.buyBacks?.find(b => b.userId === userId)
    return !existingBuyBack
  }, [survivorData])

  // Get elimination history for a specific week
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
