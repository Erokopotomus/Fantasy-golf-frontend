import { useState, useEffect, useCallback } from 'react'
// Activity feed - no backend endpoint yet, returns empty for now
// TODO: Add /api/activity endpoint when ready

export const useActivity = (limit = 10) => {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // No backend endpoint yet - return empty array
      // When backend is ready: const data = await api.getActivity(limit)
      setActivity([])
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
