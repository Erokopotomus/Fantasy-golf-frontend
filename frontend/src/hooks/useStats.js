import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.stats.get()
      setStats(data)
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
