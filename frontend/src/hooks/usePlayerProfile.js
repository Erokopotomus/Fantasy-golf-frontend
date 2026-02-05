import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

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
      const data = await api.getPlayer(playerId)
      setPlayer(data.player)
      // Tournament history comes from player.performances
      const performances = data.player?.performances || []
      setTournamentHistory(performances.map(p => ({
        tournament: p.tournament?.name,
        date: p.tournament?.startDate,
        position: p.position,
        points: p.fantasyPoints
      })))
      // Course history - not yet implemented in backend
      setCourseHistory([])
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
