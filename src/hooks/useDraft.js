import { useCallback, useEffect, useRef, useState } from 'react'
import { useDraftContext } from '../context/DraftContext'
import { mockApi } from '../services/mockApi'

export const useDraft = (leagueId) => {
  const [recentPick, setRecentPick] = useState(null)
  const aiPickTimeoutRef = useRef(null)
  const isAiPickingRef = useRef(false)
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
      setRecentPick(result)
      // Clear recent pick after 3 seconds
      setTimeout(() => setRecentPick(null), 3000)
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

  // Calculate next pick info based on snake draft order
  const getNextPickInfo = useCallback((currentPicks, teams, rosterSize) => {
    const totalTeams = teams.length
    const pickNumber = currentPicks.length
    const totalPicks = totalTeams * rosterSize

    if (pickNumber >= totalPicks) {
      return { complete: true }
    }

    const round = Math.floor(pickNumber / totalTeams) + 1
    const pickInRound = pickNumber % totalTeams
    const isReverseRound = round % 2 === 0
    const orderIndex = isReverseRound ? totalTeams - 1 - pickInRound : pickInRound
    const team = teams[orderIndex]

    return {
      round,
      pick: pickNumber + 1,
      teamId: team?.id,
      teamName: team?.name,
      isUserTurn: team?.id === 'team-1',
      complete: false,
    }
  }, [])

  // Simulate AI making a pick
  const simulateAIPick = useCallback(async (currentPicks, currentPlayers, currentDraft, currentLeague) => {
    if (!currentDraft || isAiPickingRef.current) return

    isAiPickingRef.current = true

    const available = currentPlayers.filter(p => !p.drafted)
    if (available.length === 0) {
      isAiPickingRef.current = false
      return
    }

    const nextInfo = getNextPickInfo(currentPicks, currentDraft.teams, currentLeague?.settings?.rosterSize || 6)
    if (nextInfo.complete || nextInfo.isUserTurn) {
      isAiPickingRef.current = false
      return
    }

    // AI picks the best available player (by rank) with some randomness
    const topAvailable = available.slice(0, 5)
    const randomIndex = Math.floor(Math.random() * Math.min(3, topAvailable.length))
    const selectedPlayer = topAvailable[randomIndex]

    // Simulate delay for AI "thinking"
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))

    const aiPick = {
      id: `pick-${currentPicks.length + 1}`,
      pickNumber: currentPicks.length + 1,
      round: nextInfo.round,
      roundPick: (currentPicks.length % currentDraft.teams.length) + 1,
      teamId: nextInfo.teamId,
      teamName: nextInfo.teamName,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      playerFlag: selectedPlayer.countryFlag,
      playerRank: selectedPlayer.rank,
    }

    dispatchPick(aiPick)
    setRecentPick(aiPick)

    // Clear recent pick after 3 seconds
    setTimeout(() => setRecentPick(null), 3000)
    isAiPickingRef.current = false
  }, [getNextPickInfo, dispatchPick])

  // Update current pick info whenever picks change
  useEffect(() => {
    if (!draft || !league) return

    const nextInfo = getNextPickInfo(picks, draft.teams, league?.settings?.rosterSize || 6)

    if (nextInfo.complete) {
      setCurrentPick({ ...nextInfo })
      return
    }

    setCurrentPick(nextInfo, nextInfo.isUserTurn, 90)

    // If it's AI's turn, schedule their pick
    if (!nextInfo.isUserTurn && !isPaused && !isAiPickingRef.current) {
      if (aiPickTimeoutRef.current) {
        clearTimeout(aiPickTimeoutRef.current)
      }
      aiPickTimeoutRef.current = setTimeout(() => {
        simulateAIPick(picks, players, draft, league)
      }, 2000)
    }

    return () => {
      if (aiPickTimeoutRef.current) {
        clearTimeout(aiPickTimeoutRef.current)
      }
    }
  }, [picks.length, draft, league, players, isPaused, getNextPickInfo, setCurrentPick, simulateAIPick])

  // Clear AI timeout when paused
  useEffect(() => {
    if (isPaused) {
      if (aiPickTimeoutRef.current) {
        clearTimeout(aiPickTimeoutRef.current)
      }
      isAiPickingRef.current = false
    }
  }, [isPaused])

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
    recentPick,
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
