import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useNotifications } from '../context/NotificationContext'

export const useWaivers = (leagueId, teamId) => {
  const { notify } = useNotifications()
  const [availablePlayers, setAvailablePlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [tour, setTour] = useState('All')

  const fetchAvailable = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (search) params.search = search
      if (tour !== 'All') params.tour = tour
      params.limit = '100'

      const data = await api.getAvailablePlayers(leagueId, params)
      setAvailablePlayers(data.players || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, search, tour])

  useEffect(() => {
    fetchAvailable()
  }, [fetchAvailable])

  const claimPlayer = useCallback(async (playerId, dropPlayerId = null) => {
    if (!teamId) return

    try {
      setClaimLoading(true)
      setError(null)

      // If dropping a player, drop first
      if (dropPlayerId) {
        await api.dropPlayerFromRoster(teamId, dropPlayerId)
      }

      // Add the new player
      const result = await api.addPlayerToRoster(teamId, playerId)
      setAvailablePlayers(prev => prev.filter(p => p.id !== playerId))
      notify.success('Player Added', `${result.rosterEntry?.player?.name || 'Player'} added to your roster`)
      return result
    } catch (err) {
      setError(err.message)
      notify.error('Claim Failed', err.message)
      throw err
    } finally {
      setClaimLoading(false)
    }
  }, [teamId, notify])

  return {
    availablePlayers,
    loading,
    claimLoading,
    error,
    search,
    setSearch,
    tour,
    setTour,
    refetch: fetchAvailable,
    claimPlayer,
  }
}

export default useWaivers
