import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useRotoCategories = (leagueId) => {
  const [categories, setCategories] = useState([])
  const [categoryLabels, setCategoryLabels] = useState({})
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRotoData = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await mockApi.roto.getCategories(leagueId)

      if (data) {
        setCategories(data.categories || [])
        setCategoryLabels(data.categoryLabels || {})
        setStandings(data.standings || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchRotoData()
  }, [fetchRotoData])

  // Get a team's rank in a specific category
  const getCategoryRank = useCallback((userId, categoryId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.categories?.[categoryId]?.rank || null
  }, [standings])

  // Get a team's value in a specific category
  const getCategoryValue = useCallback((userId, categoryId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.categories?.[categoryId]?.value || null
  }, [standings])

  // Calculate total roto points for a team
  const getTotalRotoPoints = useCallback((userId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.totalRotoPoints || 0
  }, [standings])

  // Sort standings by total roto points
  const sortedStandings = [...standings].sort((a, b) => b.totalRotoPoints - a.totalRotoPoints)

  return {
    categories,
    categoryLabels,
    standings: sortedStandings,
    loading,
    error,
    refetch: fetchRotoData,
    getCategoryRank,
    getCategoryValue,
    getTotalRotoPoints,
  }
}

export default useRotoCategories
