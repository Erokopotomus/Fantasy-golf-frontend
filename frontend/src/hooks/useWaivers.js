import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'
import { useNotifications } from '../context/NotificationContext'

export const useWaivers = (leagueId) => {
  const { notify } = useNotifications()
  const [availablePlayers, setAvailablePlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAvailable = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.waivers.getAvailable(leagueId)
      setAvailablePlayers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    if (leagueId) {
      fetchAvailable()
    }
  }, [leagueId, fetchAvailable])

  const claimPlayer = useCallback(async (playerId, dropPlayerId = null) => {
    try {
      setClaimLoading(true)
      setError(null)
      const result = await mockApi.waivers.claimPlayer(leagueId, playerId, dropPlayerId)
      // Remove claimed player from available list
      setAvailablePlayers(prev => prev.filter(p => p.id !== playerId))
      notify.success('Player Claimed', `${result.player?.name || 'Player'} added to your roster`)
      return result
    } catch (err) {
      setError(err.message)
      notify.error('Claim Failed', err.message)
      throw err
    } finally {
      setClaimLoading(false)
    }
  }, [leagueId, notify])

  return {
    availablePlayers,
    loading,
    claimLoading,
    error,
    refetch: fetchAvailable,
    claimPlayer,
  }
}

export default useWaivers
