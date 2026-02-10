import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function useWatchList() {
  const [watchedIds, setWatchedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getWatchListIds()
      .then(data => {
        if (!cancelled) {
          setWatchedIds(new Set(data.playerIds || []))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const isWatched = useCallback((playerId) => watchedIds.has(playerId), [watchedIds])

  const toggleWatch = useCallback(async (playerId, sport) => {
    const wasWatched = watchedIds.has(playerId)
    // Optimistic update
    setWatchedIds(prev => {
      const next = new Set(prev)
      if (wasWatched) next.delete(playerId)
      else next.add(playerId)
      return next
    })
    try {
      if (wasWatched) {
        await api.removeFromWatchList(playerId)
      } else {
        await api.addToWatchList(playerId, sport)
      }
    } catch (err) {
      // Revert on failure
      setWatchedIds(prev => {
        const next = new Set(prev)
        if (wasWatched) next.add(playerId)
        else next.delete(playerId)
        return next
      })
      console.error('Watch toggle failed:', err)
    }
  }, [watchedIds])

  return { watchedIds, isWatched, toggleWatch, loading }
}
