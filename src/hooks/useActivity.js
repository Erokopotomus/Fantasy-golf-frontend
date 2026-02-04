import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useActivity = (limit = 10) => {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.activity.getAll(limit)
      setActivity(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  const refetch = () => {
    fetchActivity()
  }

  return { activity, loading, error, refetch }
}

export default useActivity
