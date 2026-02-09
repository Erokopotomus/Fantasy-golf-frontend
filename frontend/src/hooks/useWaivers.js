import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useNotifications } from '../context/NotificationContext'
import { useLeague } from './useLeague'

export const useWaivers = (leagueId, teamId, waiverType) => {
  const { notify } = useNotifications()
  const { league, loading: leagueLoading } = useLeague(leagueId)
  const [availablePlayers, setAvailablePlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [tour, setTour] = useState('All')

  // Waiver-specific state
  const [pendingClaims, setPendingClaims] = useState([])
  const [recentResults, setRecentResults] = useState([])
  const [budget, setBudget] = useState(null)

  const isWaiverMode = waiverType && waiverType !== 'none'

  // Derive waiver priority for rolling waivers
  const waiverPriority = useMemo(() => {
    if (waiverType !== 'rolling' || !teamId) return null
    const order = league?.settings?.waiverPriorityOrder
    if (!Array.isArray(order)) return null
    const idx = order.indexOf(teamId)
    return idx === -1 ? null : idx + 1
  }, [waiverType, teamId, league?.settings?.waiverPriorityOrder])

  const isNfl = (league?.sport || 'GOLF').toUpperCase() === 'NFL'

  const fetchAvailable = useCallback(async () => {
    if (!leagueId || leagueLoading) return

    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (search) params.search = search
      if (!isNfl && tour !== 'All') params.tour = tour
      if (isNfl && tour !== 'All') params.position = tour
      params.limit = '100'

      let data
      if (isNfl) {
        data = await api.getNflAvailablePlayers(leagueId, params)
      } else {
        data = await api.getAvailablePlayers(leagueId, params)
      }
      setAvailablePlayers(data.players || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, search, tour, isNfl, leagueLoading])

  const fetchClaims = useCallback(async () => {
    if (!leagueId || !isWaiverMode) return

    try {
      const data = await api.getWaiverClaims(leagueId)
      setPendingClaims(data.pendingClaims || [])
      setRecentResults(data.recentResults || [])
      setBudget(data.budget || null)
    } catch (err) {
      console.error('Failed to fetch waiver claims:', err.message)
    }
  }, [leagueId, isWaiverMode])

  useEffect(() => {
    fetchAvailable()
  }, [fetchAvailable])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  // Instant add (non-waiver leagues only)
  const claimPlayer = useCallback(async (playerId, dropPlayerId = null) => {
    if (!teamId) return

    try {
      setClaimLoading(true)
      setError(null)

      if (dropPlayerId) {
        await api.dropPlayerFromRoster(teamId, dropPlayerId)
      }

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

  // Submit waiver claim (FAAB/rolling)
  const submitClaim = useCallback(async (playerId, bidAmount = 0, dropPlayerId = null) => {
    if (!leagueId) return

    try {
      setClaimLoading(true)
      setError(null)

      const nextPriority = pendingClaims.length
      const result = await api.submitWaiverClaim(leagueId, {
        playerId,
        bidAmount,
        dropPlayerId,
        priority: nextPriority,
      })

      notify.success('Claim Submitted', `Waiver claim placed${bidAmount > 0 ? ` ($${bidAmount})` : ''}`)
      await fetchClaims()
      return result
    } catch (err) {
      setError(err.message)
      notify.error('Claim Failed', err.message)
      throw err
    } finally {
      setClaimLoading(false)
    }
  }, [leagueId, pendingClaims.length, notify, fetchClaims])

  // Update a pending claim
  const updateClaim = useCallback(async (claimId, data) => {
    if (!leagueId) return

    try {
      const result = await api.updateWaiverClaim(leagueId, claimId, data)
      await fetchClaims()
      notify.success('Claim Updated', 'Your waiver claim has been updated')
      return result
    } catch (err) {
      notify.error('Update Failed', err.message)
      throw err
    }
  }, [leagueId, notify, fetchClaims])

  // Cancel a pending claim
  const cancelClaim = useCallback(async (claimId) => {
    if (!leagueId) return

    try {
      await api.cancelWaiverClaim(leagueId, claimId)
      await fetchClaims()
      notify.success('Claim Cancelled', 'Your waiver claim has been cancelled')
    } catch (err) {
      notify.error('Cancel Failed', err.message)
      throw err
    }
  }, [leagueId, notify, fetchClaims])

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
    // Instant add
    claimPlayer,
    // Waiver mode
    submitClaim,
    updateClaim,
    cancelClaim,
    pendingClaims,
    recentResults,
    budget,
    isWaiverMode,
    waiverPriority,
    isNfl,
    refetchClaims: fetchClaims,
  }
}

export default useWaivers
