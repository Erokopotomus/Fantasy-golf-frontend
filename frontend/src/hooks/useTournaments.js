import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState([])
  const [currentTournament, setCurrentTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [upcoming, current] = await Promise.all([
        mockApi.tournaments.getUpcoming(),
        mockApi.tournaments.getCurrent(),
      ])
      setTournaments(upcoming)
      setCurrentTournament(current)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const refetch = () => {
    fetchTournaments()
  }

  return { tournaments, currentTournament, loading, error, refetch }
}

export default useTournaments
