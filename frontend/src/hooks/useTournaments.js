import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState([])
  const [currentTournament, setCurrentTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all tournaments and current tournament
      const [allData, currentData] = await Promise.all([
        api.getTournaments(),
        api.getCurrentTournament().catch(() => null), // Don't fail if no current tournament
      ])

      // Handle response format
      const tournamentList = allData.tournaments || allData || []

      // Filter for upcoming tournaments
      const upcoming = tournamentList.filter(t =>
        t.status === 'UPCOMING' || t.status === 'IN_PROGRESS'
      )

      setTournaments(upcoming)
      setCurrentTournament(currentData?.tournament || currentData || null)
    } catch (err) {
      setError(err.message)
      setTournaments([])
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
