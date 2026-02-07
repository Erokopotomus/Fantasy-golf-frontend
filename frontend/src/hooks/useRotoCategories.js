import { useState, useCallback } from 'react'

export const useRotoCategories = (leagueId) => {
  const [categories] = useState([])
  const [categoryLabels] = useState({})
  const [standings] = useState([])
  const [loading] = useState(false)
  const [error] = useState(null)

  const fetchRotoData = useCallback(async () => {
    // TODO: Replace with real API call when backend roto endpoints are built
    // e.g. const data = await api.getRotoCategories(leagueId)
  }, [leagueId])

  const getCategoryRank = useCallback((userId, categoryId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.categories?.[categoryId]?.rank || null
  }, [standings])

  const getCategoryValue = useCallback((userId, categoryId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.categories?.[categoryId]?.value || null
  }, [standings])

  const getTotalRotoPoints = useCallback((userId) => {
    const team = standings.find(s => s.userId === userId)
    return team?.totalRotoPoints || 0
  }, [standings])

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
