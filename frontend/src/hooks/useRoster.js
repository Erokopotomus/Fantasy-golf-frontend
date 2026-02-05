import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useRoster = (teamId) => {
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRoster = useCallback(async () => {
    if (!teamId) {
      setRoster([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.getTeam(teamId)
      // Team data includes roster entries
      setRoster(data.roster || data.team?.roster || [])
    } catch (err) {
      setError(err.message)
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  const dropPlayer = useCallback(async (playerId) => {
    if (!teamId) return

    try {
      await api.dropPlayerFromRoster(teamId, playerId)
      setRoster(prev => prev.filter(entry =>
        entry.playerId !== playerId && entry.player?.id !== playerId
      ))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [teamId])

  const addPlayer = useCallback(async (playerId) => {
    if (!teamId) return

    try {
      const result = await api.addPlayerToRoster(teamId, playerId)
      // Refetch to get updated roster
      await fetchRoster()
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [teamId, fetchRoster])

  return { roster, loading, error, refetch: fetchRoster, dropPlayer, addPlayer }
}

export default useRoster
