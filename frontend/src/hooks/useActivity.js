import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useActivity = (leagueId, limit = 10) => {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivity = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.getLeagueActivity(leagueId, limit)
      setActivity(data.activity || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, limit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return { activity, loading, error, refetch: fetchActivity }
}

export default useActivity
