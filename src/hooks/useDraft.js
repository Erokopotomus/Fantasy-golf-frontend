import { useCallback, useEffect } from 'react'
import { useDraftContext } from '../context/DraftContext'
import { mockApi } from '../services/mockApi'

export const useDraft = (leagueId) => {
  const {
    draft,
    league,
    players,
    picks,
    queue,
    currentPick,
    currentBid,
    userBudget,
    isUserTurn,
    isPaused,
    loading,
    error,
    setDraftState,
    setLoading,
    setError,
    makePick: dispatchPick,
    setCurrentPick,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setCurrentBid,
    updateBudget,
    pauseDraft,
    resumeDraft,
  } = useDraftContext()

  const loadDraft = useCallback(async () => {
    try {
      setLoading(true)
      const draftState = await mockApi.draft.getState(leagueId)
      setDraftState(draftState)
    } catch (err) {
      setError(err.message)
    }
  }, [leagueId, setLoading, setDraftState, setError])

  useEffect(() => {
    if (leagueId) {
      loadDraft()
    }
  }, [leagueId, loadDraft])

  const makePick = useCallback(async (playerId) => {
    try {
      setLoading(true)
      const result = await mockApi.draft.makePick(draft?.id, playerId)
      dispatchPick(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [draft?.id, dispatchPick, setLoading, setError])

  const nominatePlayer = useCallback(async (playerId, startingBid) => {
    try {
      setLoading(true)
      const result = await mockApi.draft.nominatePlayer(draft?.id, playerId, startingBid)
      setCurrentBid(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [draft?.id, setCurrentBid, setLoading, setError])

  const placeBid = useCallback(async (amount) => {
    try {
      const result = await mockApi.draft.placeBid(draft?.id, amount)
      setCurrentBid(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [draft?.id, setCurrentBid, setError])

  const handleAddToQueue = useCallback((player) => {
    addToQueue(player)
    mockApi.draft.addToQueue(draft?.id, player.id).catch(() => {})
  }, [draft?.id, addToQueue])

  const handleRemoveFromQueue = useCallback((playerId) => {
    removeFromQueue(playerId)
    mockApi.draft.removeFromQueue(draft?.id, playerId).catch(() => {})
  }, [draft?.id, removeFromQueue])

  const handleReorderQueue = useCallback((newQueue) => {
    reorderQueue(newQueue)
    mockApi.draft.reorderQueue(draft?.id, newQueue.map(p => p.id)).catch(() => {})
  }, [draft?.id, reorderQueue])

  const handlePauseDraft = useCallback(async () => {
    try {
      await mockApi.draft.pauseDraft(draft?.id)
      pauseDraft()
    } catch (err) {
      setError(err.message)
    }
  }, [draft?.id, pauseDraft, setError])

  const handleStartDraft = useCallback(async () => {
    try {
      await mockApi.draft.startDraft(draft?.id)
      resumeDraft()
      await loadDraft()
    } catch (err) {
      setError(err.message)
    }
  }, [draft?.id, resumeDraft, loadDraft, setError])

  const getAvailablePlayers = useCallback(() => {
    return players.filter(p => !p.drafted)
  }, [players])

  const getDraftedPlayers = useCallback((teamId) => {
    return picks
      .filter(p => p.teamId === teamId)
      .map(p => players.find(player => player.id === p.playerId))
      .filter(Boolean)
  }, [picks, players])

  return {
    draft,
    league,
    players,
    picks,
    queue,
    currentPick,
    currentBid,
    userBudget,
    isUserTurn,
    isPaused,
    loading,
    error,
    makePick,
    nominatePlayer,
    placeBid,
    addToQueue: handleAddToQueue,
    removeFromQueue: handleRemoveFromQueue,
    reorderQueue: handleReorderQueue,
    pauseDraft: handlePauseDraft,
    startDraft: handleStartDraft,
    getAvailablePlayers,
    getDraftedPlayers,
    refetch: loadDraft,
  }
}

export default useDraft
