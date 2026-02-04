import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useRoster = (leagueId) => {
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.roster.getRoster(leagueId)
      setRoster(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    if (leagueId) {
      fetchRoster()
    }
  }, [leagueId, fetchRoster])

  const dropPlayer = useCallback(async (playerId) => {
    try {
      await mockApi.roster.dropPlayer(leagueId, playerId)
      setRoster(prev => prev.filter(p => p.id !== playerId))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [leagueId])

  return { roster, loading, error, refetch: fetchRoster, dropPlayer }
}

export default useRoster
