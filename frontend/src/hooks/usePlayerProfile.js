import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const usePlayerProfile = (playerId) => {
  const [player, setPlayer] = useState(null)
  const [courseHistory, setCourseHistory] = useState([])
  const [tournamentHistory, setTournamentHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlayerProfile = useCallback(async () => {
    if (!playerId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await mockApi.players.getProfile(playerId)
      setPlayer(data.player)
      setCourseHistory(data.courseHistory)
      setTournamentHistory(data.tournamentHistory)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    setLoading(true)
    fetchPlayerProfile()
  }, [playerId, fetchPlayerProfile])

  return {
    player,
    courseHistory,
    tournamentHistory,
    loading,
    error,
    refetch: fetchPlayerProfile
  }
}

export default usePlayerProfile
