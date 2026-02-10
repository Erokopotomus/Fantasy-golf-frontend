import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function useDraftBoards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBoards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDraftBoards()
      setBoards(data.boards || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBoards() }, [fetchBoards])

  const createBoard = useCallback(async ({ name, sport, scoringFormat, boardType }) => {
    const data = await api.createDraftBoard({ name, sport, scoringFormat, boardType })
    await fetchBoards()
    return data.board
  }, [fetchBoards])

  const deleteBoard = useCallback(async (id) => {
    await api.deleteDraftBoard(id)
    setBoards(prev => prev.filter(b => b.id !== id))
  }, [])

  return { boards, loading, error, createBoard, deleteBoard, refetch: fetchBoards }
}
