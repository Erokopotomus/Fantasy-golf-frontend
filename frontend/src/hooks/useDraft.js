import { useCallback, useEffect, useRef, useState } from 'react'
import { useDraftContext } from '../context/DraftContext'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import socketService from '../services/socket'
import { track, Events } from '../services/analytics'

export const useDraft = (leagueId) => {
  const [recentPick, setRecentPick] = useState(null)
  const [draftId, setDraftId] = useState(null)
  const lastNotifiedTurnRef = useRef(null)
  const pickDeadlineRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const { user } = useAuth()
  const { notify } = useNotifications()
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
    setTimer,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setCurrentBid,
    updateBudget,
    pauseDraft: dispatchPause,
    resumeDraft: dispatchResume,
  } = useDraftContext()

  // Transform backend draft response into context state shape
  const transformDraftState = useCallback((draftData, playersList) => {
    const d = draftData
    const teams = d.league?.teams?.map(t => ({
      id: t.id,
      name: t.name,
      userId: t.userId || t.user?.id,
      userName: t.user?.name,
      avatar: t.user?.avatar,
    })) || []

    const draftOrder = d.draftOrder?.map(o => ({
      position: o.position,
      teamId: o.teamId,
    })) || []

    const existingPicks = d.picks?.map(p => ({
      id: p.id,
      pickNumber: p.pickNumber,
      round: p.round,
      teamId: p.teamId,
      teamName: teams.find(t => t.id === p.teamId)?.name || 'Unknown',
      playerId: p.playerId || p.player?.id,
      playerName: p.player?.name,
      playerRank: p.player?.owgrRank,
      playerCountry: p.player?.country,
      amount: p.amount,
    })) || []

    // Mark drafted players
    const draftedIds = new Set(existingPicks.map(p => p.playerId))
    const allPlayers = (playersList || []).map(p => ({
      ...p,
      rank: p.owgrRank,
      drafted: draftedIds.has(p.id),
      draftedBy: draftedIds.has(p.id)
        ? existingPicks.find(pick => pick.playerId === p.id)?.teamId
        : null,
    }))

    return {
      draft: {
        id: d.id,
        status: d.status,
        type: d.league?.draftType?.toLowerCase() || 'snake',
        currentPick: d.currentPick,
        currentRound: d.currentRound,
        timePerPick: d.timePerPick,
        totalRounds: d.totalRounds,
        teams,
        draftOrder,
        userTeamId: d.userTeamId,
        pickDeadline: d.pickDeadline,
      },
      league: {
        id: d.league?.id,
        name: d.league?.name,
        ownerId: d.league?.ownerId || d.league?.owner?.id,
        settings: d.league?.settings,
        memberCount: teams.length,
      },
      players: allPlayers,
      picks: existingPicks,
    }
  }, [])

  // Load draft data
  const loadDraft = useCallback(async () => {
    try {
      setLoading(true)
      const { draft: draftData } = await api.getDraftByLeague(leagueId)

      setDraftId(draftData.id)

      // Load players
      let playersList = []
      try {
        const { players: pl } = await api.getDraftPlayers(draftData.id, { limit: 500 })
        playersList = pl
      } catch (e) {
        console.warn('Could not load draft players:', e.message)
      }

      const state = transformDraftState(draftData, playersList)
      setDraftState(state)
      pickDeadlineRef.current = draftData.pickDeadline

      // Set initial budget for auction drafts
      if (draftData.league?.draftType === 'AUCTION') {
        const budget = draftData.league?.settings?.budget || 200
        updateBudget(budget)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [leagueId, setLoading, setDraftState, setError, transformDraftState])

  // Initial load
  useEffect(() => {
    if (leagueId) {
      loadDraft()
    }
  }, [leagueId, loadDraft])

  // Socket.IO connection and listeners
  useEffect(() => {
    if (!draftId) return

    socketService.connect()
    socketService.joinDraft(draftId)

    const unsubPick = socketService.onDraftPick((data) => {
      const pick = data.pick
      const pickForContext = {
        id: pick.id,
        pickNumber: pick.pickNumber,
        round: pick.round,
        teamId: pick.teamId,
        teamName: pick.team?.name || pick.team?.user?.name || 'Unknown',
        playerId: pick.playerId || pick.player?.id,
        playerName: pick.player?.name,
        playerRank: pick.player?.owgrRank,
        playerCountry: pick.player?.country,
      }

      dispatchPick(pickForContext)
      setRecentPick(pickForContext)
      setTimeout(() => setRecentPick(null), 3000)

      // Update deadline from server
      pickDeadlineRef.current = data.pickDeadline
    })

    const unsubStarted = socketService.onDraftStarted(() => {
      loadDraft()
    })

    const unsubPaused = socketService.onDraftPaused(() => {
      dispatchPause()
    })

    const unsubResumed = socketService.onDraftResumed((data) => {
      dispatchResume()
      pickDeadlineRef.current = data.pickDeadline
    })

    const unsubCompleted = socketService.onDraftCompleted(() => {
      loadDraft()
    })

    // Auction draft listeners
    const unsubNomination = socketService.onAuctionNomination((data) => {
      setCurrentBid({
        playerId: data.playerId,
        playerName: data.playerName,
        player: data.playerData,
        amount: data.currentBid,
        highBidderTeamId: data.highBidderTeamId,
        nominatedByTeamId: data.nominatedByTeamId,
        deadline: data.deadline,
      })
      // Update all team budgets
      if (data.budgets) {
        const userTeamId = draft?.userTeamId
        if (userTeamId && data.budgets[userTeamId] !== undefined) {
          updateBudget(data.budgets[userTeamId])
        }
      }
    })

    const unsubAuctionBid = socketService.onAuctionBid((data) => {
      setCurrentBid({
        playerId: data.playerId,
        amount: data.currentBid,
        highBidderTeamId: data.highBidderTeamId,
        deadline: data.deadline,
      })
      if (data.budgets) {
        const userTeamId = draft?.userTeamId
        if (userTeamId && data.budgets[userTeamId] !== undefined) {
          updateBudget(data.budgets[userTeamId])
        }
      }
    })

    const unsubAuctionWon = socketService.onAuctionWon((data) => {
      setCurrentBid(null)
      if (data.budgets) {
        const userTeamId = draft?.userTeamId
        if (userTeamId && data.budgets[userTeamId] !== undefined) {
          updateBudget(data.budgets[userTeamId])
        }
      }
    })

    const unsubNextNominator = socketService.onAuctionNextNominator((data) => {
      // Update budgets and nominator info — the turn detection effect handles isUserTurn
      if (data.budgets) {
        const userTeamId = draft?.userTeamId
        if (userTeamId && data.budgets[userTeamId] !== undefined) {
          updateBudget(data.budgets[userTeamId])
        }
      }
    })

    return () => {
      unsubPick()
      unsubStarted()
      unsubPaused()
      unsubResumed()
      unsubCompleted()
      unsubNomination()
      unsubAuctionBid()
      unsubAuctionWon()
      unsubNextNominator()
      socketService.leaveDraft(draftId)
    }
  }, [draftId, draft?.userTeamId, dispatchPick, dispatchPause, dispatchResume, loadDraft, setCurrentBid, updateBudget])

  // Timer countdown based on pickDeadline
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    if (!draft || draft.status !== 'IN_PROGRESS' || isPaused) {
      setTimer(0)
      return
    }

    const tick = () => {
      const deadline = pickDeadlineRef.current
      if (!deadline) {
        setTimer(draft.timePerPick || 90)
        return
      }
      const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setTimer(remaining)
    }

    tick()
    timerIntervalRef.current = setInterval(tick, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [draft?.status, draft?.timePerPick, isPaused, setTimer])

  // Update current pick info and turn detection
  useEffect(() => {
    if (!draft || !draft.draftOrder?.length) return

    const totalTeams = draft.draftOrder.length
    const totalPicks = totalTeams * (draft.totalRounds || 6)

    if (picks.length >= totalPicks) {
      setCurrentPick({ complete: true }, false, 0)
      return
    }

    const pickNumber = draft.currentPick || picks.length + 1
    const round = draft.currentRound || Math.floor((pickNumber - 1) / totalTeams) + 1
    const pickInRound = (pickNumber - 1) % totalTeams
    const isEvenRound = round % 2 === 0

    let currentPosition
    if (isEvenRound) {
      currentPosition = totalTeams - pickInRound
    } else {
      currentPosition = pickInRound + 1
    }

    const currentOrder = draft.draftOrder.find(o => o.position === currentPosition)
    const currentTeamId = currentOrder?.teamId
    const currentTeam = draft.teams?.find(t => t.id === currentTeamId)
    const userTurn = currentTeamId === draft.userTeamId

    setCurrentPick(
      {
        round,
        pick: pickNumber,
        teamId: currentTeamId,
        teamName: currentTeam?.name,
        isUserTurn: userTurn,
        complete: false,
      },
      userTurn,
      draft.timePerPick || 90
    )

    // Notify user when it's their turn
    if (userTurn && lastNotifiedTurnRef.current !== pickNumber) {
      lastNotifiedTurnRef.current = pickNumber
      notify.draft('Your Turn!', `Round ${round}, Pick #${pickNumber}`)
    }
  }, [picks.length, draft, setCurrentPick, notify])

  // Make a pick
  const makePick = useCallback(async (playerId) => {
    if (!draftId) return
    try {
      setLoading(true)
      const result = await api.makeDraftPick(draftId, playerId)
      track(Events.DRAFT_PICK_MADE, { draftId, playerId, round: draft?.currentRound })
      // Socket will broadcast the pick to all clients including us
      // But update deadline immediately for responsiveness
      pickDeadlineRef.current = result.pickDeadline
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [draftId, setLoading, setError])

  // Auto-pick on timeout
  const handleTimeout = useCallback(async () => {
    if (!isUserTurn) return
    if (queue.length > 0) {
      const topPick = queue[0]
      try {
        await makePick(topPick.id)
        removeFromQueue(topPick.id)
      } catch (e) {
        // If top queue pick fails (already drafted), try next
        for (let i = 1; i < queue.length; i++) {
          try {
            await makePick(queue[i].id)
            removeFromQueue(queue[i].id)
            return
          } catch (e2) {
            continue
          }
        }
      }
    }
  }, [isUserTurn, queue, makePick, removeFromQueue])

  const nominatePlayer = useCallback(async (playerId, startingBid) => {
    if (!draftId) return
    try {
      const result = await api.nominatePlayer(draftId, playerId, startingBid)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [draftId, setError])

  const placeBid = useCallback(async (amount) => {
    if (!draftId) return
    try {
      const result = await api.placeBid(draftId, amount)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [draftId, setError])

  const handleAddToQueue = useCallback((player) => {
    addToQueue(player)
  }, [addToQueue])

  const handleRemoveFromQueue = useCallback((playerId) => {
    removeFromQueue(playerId)
  }, [removeFromQueue])

  const handleReorderQueue = useCallback((newQueue) => {
    reorderQueue(newQueue)
  }, [reorderQueue])

  const handlePauseDraft = useCallback(async () => {
    if (!draftId) return
    try {
      await api.pauseDraft(draftId)
      // Socket will broadcast the pause
    } catch (err) {
      setError(err.message)
    }
  }, [draftId, setError])

  const handleResumeDraft = useCallback(async () => {
    if (!draftId) return
    try {
      const result = await api.resumeDraft(draftId)
      pickDeadlineRef.current = result.pickDeadline
      // Socket will broadcast the resume
    } catch (err) {
      setError(err.message)
    }
  }, [draftId, setError])

  const handleStartDraft = useCallback(async () => {
    if (!draftId) return
    try {
      const { draft: updatedDraft } = await api.startDraft(draftId)
      pickDeadlineRef.current = updatedDraft.pickDeadline
      // Socket will broadcast draft-started, triggering reload for all
    } catch (err) {
      setError(err.message)
    }
  }, [draftId, setError])

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
    recentPick,
    draftId,
    makePick,
    nominatePlayer,
    placeBid,
    addToQueue: handleAddToQueue,
    removeFromQueue: handleRemoveFromQueue,
    reorderQueue: handleReorderQueue,
    pauseDraft: handlePauseDraft,
    resumeDraft: handleResumeDraft,
    startDraft: handleStartDraft,
    getAvailablePlayers,
    getDraftedPlayers,
    handleTimeout,
    refetch: loadDraft,
  }
}

export default useDraft
