import { useState, useEffect, useCallback } from 'react'
// User stats - no backend endpoint yet, returns defaults for now
// TODO: Add /api/users/me/stats endpoint when ready

export const useStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // No backend endpoint yet - return default stats
      // When backend is ready: const data = await api.getUserStats()
      setStats({
        totalLeagues: 0,
        activeTeams: 0,
        totalPoints: 0,
        rank: '-',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refetch = () => {
    fetchStats()
  }

  return { stats, loading, error, refetch }
}

export default useStats
