import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export const useLeague = (leagueId) => {
  const { user } = useAuth()
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeague = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.getLeague(leagueId)
      setLeague(data.league || data)
    } catch (err) {
      setError(err.message)
      setLeague(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchLeague()
  }, [fetchLeague])

  // Determine if current user is the commissioner (owner)
  const isCommissioner = league?.ownerId === user?.id ||
    league?.members?.some(m => m.userId === user?.id && m.role === 'OWNER')

  // Get current user's membership info
  const userMembership = league?.members?.find(m => m.userId === user?.id)

  return {
    league,
    loading,
    error,
    refetch: fetchLeague,
    isCommissioner,
    userMembership
  }
}

export default useLeague
