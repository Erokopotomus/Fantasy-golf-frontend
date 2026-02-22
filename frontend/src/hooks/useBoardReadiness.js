import { useState, useEffect } from 'react'
import api from '../services/api'

export default function useBoardReadiness(boardId) {
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!boardId) return
    let cancelled = false
    api.getBoardReadiness(boardId)
      .then(res => {
        if (!cancelled) setReadiness(res.readiness)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [boardId])

  return { readiness, loading }
}
