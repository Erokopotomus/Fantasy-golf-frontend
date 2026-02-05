import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useLeagues = () => {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeagues = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getLeagues()
      setLeagues(data.leagues || data || [])
    } catch (err) {
      setError(err.message)
      setLeagues([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  const refetch = () => {
    fetchLeagues()
  }

  return { leagues, loading, error, refetch }
}

export default useLeagues
