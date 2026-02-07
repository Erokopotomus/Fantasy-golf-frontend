import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

/**
 * Hook for prediction state management.
 * Handles user predictions, reputation, event slates, and leaderboards.
 */
export function usePredictions(options = {}) {
  const { eventId, sport = 'golf' } = options

  const [myPredictions, setMyPredictions] = useState([])
  const [reputation, setReputation] = useState(null)
  const [slate, setSlate] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMyData = useCallback(async () => {
    try {
      const [predRes, repRes] = await Promise.all([
        api.getMyPredictions({ sport, limit: 20 }).catch(() => ({ predictions: [], total: 0 })),
        api.getMyReputation().catch(() => null),
      ])
      setMyPredictions(predRes.predictions || [])
      setReputation(repRes)
    } catch (err) {
      console.error('Failed to fetch prediction data:', err)
    }
  }, [sport])

  const fetchSlate = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await api.getEventSlate(eventId, { sport })
      setSlate(res.slate || [])
    } catch (err) {
      console.error('Failed to fetch event slate:', err)
    }
  }, [eventId, sport])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchMyData(), fetchSlate()]).finally(() => setLoading(false))
  }, [fetchMyData, fetchSlate])

  const submitPrediction = useCallback(async (data) => {
    try {
      const res = await api.submitPrediction(data)
      await fetchMyData()
      if (eventId) await fetchSlate()
      return res.prediction
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [fetchMyData, fetchSlate, eventId])

  const updatePrediction = useCallback(async (id, data) => {
    try {
      const res = await api.updatePrediction(id, data)
      await fetchMyData()
      return res.prediction
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [fetchMyData])

  const deletePrediction = useCallback(async (id) => {
    try {
      await api.deletePrediction(id)
      setMyPredictions(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  return {
    myPredictions,
    reputation,
    slate,
    loading,
    error,
    submitPrediction,
    updatePrediction,
    deletePrediction,
    refetch: () => Promise.all([fetchMyData(), fetchSlate()]),
  }
}

/**
 * Hook for community consensus on a specific player/event.
 */
export function useConsensus(eventId, playerId, type = 'player_benchmark') {
  const [consensus, setConsensus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !playerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    api.getPredictionConsensus(eventId, playerId, type)
      .then(setConsensus)
      .catch(() => setConsensus(null))
      .finally(() => setLoading(false))
  }, [eventId, playerId, type])

  return { consensus, loading }
}

/**
 * Hook for prediction leaderboard.
 */
export function useLeaderboard(options = {}) {
  const { sport = 'all', timeframe = 'weekly', limit = 50 } = options
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getPredictionLeaderboard({ sport, timeframe, limit })
      .then(res => setLeaderboard(res.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [sport, timeframe, limit])

  return { leaderboard, loading }
}

export default usePredictions
