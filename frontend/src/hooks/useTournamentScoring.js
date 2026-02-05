import { useState, useEffect, useCallback, useRef } from 'react'
import { mockApi } from '../services/mockApi'

export const useTournamentScoring = (tournamentId, leagueId = null) => {
  const [tournament, setTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [myPlayers, setMyPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)

  const fetchScoring = useCallback(async () => {
    try {
      setError(null)
      const data = await mockApi.tournaments.getScoring(tournamentId, leagueId)
      setTournament(data.tournament)
      setLeaderboard(data.leaderboard)
      setMyPlayers(data.myPlayers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId, leagueId])

  useEffect(() => {
    if (tournamentId) {
      setLoading(true)
      fetchScoring()

      // Poll for updates every 30 seconds (simulating live scoring)
      pollIntervalRef.current = setInterval(fetchScoring, 30000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [tournamentId, fetchScoring])

  const simulateScoreUpdate = useCallback(() => {
    // Manually trigger a score update for testing
    fetchScoring()
  }, [fetchScoring])

  return {
    tournament,
    leaderboard,
    myPlayers,
    loading,
    error,
    refetch: fetchScoring,
    simulateScoreUpdate,
  }
}

export default useTournamentScoring
