import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

/**
 * Hook to fetch a user's Clutch Rating V2.
 * Returns the full 7-component rating with confidence and tier.
 */
export default function useClutchRating(userId) {
  const [rating, setRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRating = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await api.getClutchRating(userId)
      setRating(data.clutchRating || null)
    } catch (err) {
      setError(err.message)
      setRating(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRating()
  }, [fetchRating])

  // Trigger on-demand computation and refetch
  const compute = useCallback(async () => {
    if (!userId) return null
    try {
      const data = await api.computeClutchRating(userId)
      const newRating = data.clutchRating || null
      setRating(newRating)
      return newRating
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [userId])

  return { rating, loading, error, refetch: fetchRating, compute }
}

/**
 * Batch fetch ratings for multiple users (for vault views).
 * Returns a Map of userId → clutchRating.
 */
export function useClutchRatings(userIds) {
  const [ratings, setRatings] = useState(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      const results = new Map()

      // Fetch in parallel with individual error handling
      await Promise.all(
        userIds.filter(Boolean).map(async (uid) => {
          try {
            const data = await api.getClutchRating(uid)
            if (!cancelled && data.clutchRating) {
              results.set(uid, data.clutchRating)
            }
          } catch {
            // Skip users without ratings
          }
        })
      )

      if (!cancelled) {
        setRatings(results)
        setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [userIds?.join(',')])

  return { ratings, loading }
}
