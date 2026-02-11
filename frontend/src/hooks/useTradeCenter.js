import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { track, Events } from '../services/analytics'

export const useTradeCenter = (leagueId) => {
  const { user } = useAuth()
  const [pendingTrades, setPendingTrades] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [leagueMembers, setLeagueMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrades = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Fetch trades and league data in parallel
      const [tradesData, leagueData] = await Promise.all([
        api.getTrades({ leagueId }),
        api.getLeague(leagueId),
      ])

      const trades = tradesData.trades || []
      const league = leagueData.league || leagueData

      // Separate pending vs completed/rejected/cancelled
      const pending = []
      const history = []

      for (const trade of trades) {
        const isIncoming = trade.receiverId === user?.id
        const otherUser = isIncoming ? trade.initiator : trade.receiver
        const otherTeam = isIncoming ? trade.senderTeam : trade.receiverTeam

        const mapped = {
          id: trade.id,
          status: trade.status,
          createdAt: trade.proposedAt || trade.createdAt,
          message: trade.message,
          isIncoming,
          otherTeamName: otherTeam?.name || otherUser?.name || 'Unknown',
          otherUser,
          // For incoming: playersOffered = what THEY are sending (sender's players), playersRequested = what they want (receiver's / your players)
          // For outgoing: playersOffered = what you're sending, playersRequested = what you want
          playersOffered: isIncoming
            ? (trade.senderPlayerDetails || [])
            : (trade.senderPlayerDetails || []),
          playersRequested: isIncoming
            ? (trade.receiverPlayerDetails || [])
            : (trade.receiverPlayerDetails || []),
          initiator: trade.initiator,
          receiver: trade.receiver,
          senderTeam: trade.senderTeam,
          receiverTeam: trade.receiverTeam,
        }

        if (trade.status === 'PENDING') {
          pending.push(mapped)
        } else {
          history.push({
            ...mapped,
            description: `${trade.initiator?.name} traded with ${trade.receiver?.name}`,
            date: new Date(trade.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }),
          })
        }
      }

      setPendingTrades(pending)
      setTradeHistory(history)

      // Build league members list (other teams with their rosters)
      const teams = league.teams || league.standings || []
      const members = teams
        .filter(t => t.userId !== user?.id)
        .map(t => ({
          id: t.userId,
          teamId: t.id,
          name: t.name || t.user?.name || 'Unknown',
          avatar: t.user?.avatar,
          roster: (t.roster || []).map(entry => ({
            id: entry.player?.id || entry.playerId,
            name: entry.player?.name || 'Unknown',
            country: entry.player?.country,
            owgr: entry.player?.owgr,
          })),
        }))

      setLeagueMembers(members)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, user?.id])

  useEffect(() => {
    setLoading(true)
    fetchTrades()
  }, [leagueId, fetchTrades])

  const proposeTrade = useCallback(async (tradeData) => {
    try {
      const result = await api.proposeTrade({
        leagueId,
        receiverId: tradeData.toUserId,
        senderPlayers: tradeData.playersOffered,
        receiverPlayers: tradeData.playersRequested,
        message: tradeData.message,
        senderDollars: tradeData.senderDollars,
        receiverDollars: tradeData.receiverDollars,
        reasoning: tradeData.reasoning,
      })
      track(Events.TRADE_PROPOSED, { leagueId, playersOffered: tradeData.playersOffered.length, playersRequested: tradeData.playersRequested.length })
      fetchTrades()
      return result
    } catch (err) {
      throw err
    }
  }, [leagueId, fetchTrades])

  const acceptTrade = useCallback(async (tradeId) => {
    try {
      await api.acceptTrade(tradeId)
      track(Events.TRADE_ACCEPTED, { leagueId, tradeId })
      fetchTrades()
    } catch (err) {
      throw err
    }
  }, [fetchTrades])

  const rejectTrade = useCallback(async (tradeId) => {
    try {
      await api.rejectTrade(tradeId)
      track(Events.TRADE_REJECTED, { leagueId, tradeId })
      fetchTrades()
    } catch (err) {
      throw err
    }
  }, [fetchTrades])

  const cancelTrade = useCallback(async (tradeId) => {
    try {
      await api.cancelTrade(tradeId)
      track(Events.TRADE_CANCELLED, { leagueId, tradeId })
      fetchTrades()
    } catch (err) {
      throw err
    }
  }, [fetchTrades])

  return {
    pendingTrades,
    tradeHistory,
    leagueMembers,
    loading,
    error,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,
    refetch: fetchTrades
  }
}

export default useTradeCenter
