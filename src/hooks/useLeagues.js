import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useLeagues = () => {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeagues = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.leagues.getAll()
      setLeagues(data)
    } catch (err) {
      setError(err.message)
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
