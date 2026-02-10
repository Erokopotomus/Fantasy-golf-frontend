import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export default function useDraftBoardEditor(boardId) {
  const [board, setBoard] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const saveTimer = useRef(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Load board
  useEffect(() => {
    if (!boardId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api.getDraftBoard(boardId)
      .then(data => {
        if (cancelled) return
        setBoard(data.board)
        setEntries(data.board.entries || [])
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [boardId])

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const currentEntries = entriesRef.current
      if (!currentEntries.length && !board) return
      setIsSaving(true)
      try {
        const payload = currentEntries.map((e, i) => ({
          playerId: e.playerId,
          rank: i + 1,
          tier: e.tier ?? null,
          notes: e.notes ?? null,
        }))
        await api.saveDraftBoardEntries(boardId, payload)
        setLastSaved(new Date())
      } catch (err) {
        console.error('Auto-save failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, 1500)
  }, [boardId, board])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const moveEntry = useCallback((fromIndex, toIndex) => {
    setEntries(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      // Re-number ranks
      return next.map((e, i) => ({ ...e, rank: i + 1 }))
    })
    scheduleSave()
  }, [scheduleSave])

  const addPlayer = useCallback(async (playerId) => {
    try {
      const data = await api.addDraftBoardEntry(boardId, playerId)
      setEntries(data.board.entries || [])
      setLastSaved(new Date())
    } catch (err) {
      console.error('Add player failed:', err)
      throw err
    }
  }, [boardId])

  const removePlayer = useCallback(async (playerId) => {
    // Optimistic removal
    setEntries(prev => prev.filter(e => e.playerId !== playerId).map((e, i) => ({ ...e, rank: i + 1 })))
    try {
      await api.removeDraftBoardEntry(boardId, playerId)
      setLastSaved(new Date())
    } catch (err) {
      // Revert on failure — refetch
      const data = await api.getDraftBoard(boardId)
      setEntries(data.board.entries || [])
      console.error('Remove player failed:', err)
    }
  }, [boardId])

  const updateNotes = useCallback(async (playerId, notes) => {
    setEntries(prev => prev.map(e => e.playerId === playerId ? { ...e, notes } : e))
    try {
      await api.updateDraftBoardEntryNotes(boardId, playerId, notes)
    } catch (err) {
      console.error('Update notes failed:', err)
    }
  }, [boardId])

  const insertTierBreak = useCallback((afterIndex) => {
    setEntries(prev => {
      const next = [...prev]
      // Everything at afterIndex+1 and beyond gets tier incremented
      const currentTier = next[afterIndex]?.tier ?? 1
      for (let i = afterIndex + 1; i < next.length; i++) {
        next[i] = { ...next[i], tier: (next[i].tier ?? currentTier) + 1 }
      }
      return next
    })
    scheduleSave()
  }, [scheduleSave])

  const removeTierBreak = useCallback((atIndex) => {
    setEntries(prev => {
      const next = [...prev]
      // Merge tier at atIndex with previous tier
      const prevTier = atIndex > 0 ? (next[atIndex - 1]?.tier ?? 1) : 1
      for (let i = atIndex; i < next.length; i++) {
        if (next[i].tier !== next[atIndex].tier) break
        next[i] = { ...next[i], tier: prevTier }
      }
      return next
    })
    scheduleSave()
  }, [scheduleSave])

  const updateBoardMeta = useCallback(async (data) => {
    try {
      const result = await api.updateDraftBoard(boardId, data)
      setBoard(prev => ({ ...prev, ...result.board }))
    } catch (err) {
      console.error('Update board failed:', err)
    }
  }, [boardId])

  return {
    board,
    entries,
    loading,
    error,
    moveEntry,
    addPlayer,
    removePlayer,
    updateNotes,
    insertTierBreak,
    removeTierBreak,
    updateBoardMeta,
    isSaving,
    lastSaved,
  }
}
