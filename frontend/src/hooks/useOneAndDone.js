import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useOneAndDone = (leagueId, userId) => {
  const [userPicks, setUserPicks] = useState({ usedPlayers: [], picks: [], currentPick: null })
  const [tiers, setTiers] = useState([])
  const [currentTournament, setCurrentTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pickLoading, setPickLoading] = useState(false)

  const fetchOADData = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [picksData, leaderboardData] = await Promise.all([
        userId ? mockApi.oneAndDone.getPicks(leagueId, userId) : Promise.resolve(null),
        mockApi.oneAndDone.getLeaderboard(leagueId),
      ])

      if (picksData) {
        setUserPicks(picksData.userPicks)
        setTiers(picksData.tiers)
        setCurrentTournament(picksData.currentTournament)
      }

      setLeaderboard(leaderboardData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, userId])

  useEffect(() => {
    fetchOADData()
  }, [fetchOADData])

  // Make a pick
  const makePick = useCallback(async (playerId, tournamentId) => {
    if (!leagueId || !userId) return

    try {
      setPickLoading(true)
      const result = await mockApi.oneAndDone.makePick(leagueId, userId, playerId, tournamentId)
      // Refresh data after pick
      await fetchOADData()
      return result
    } catch (err) {
      throw err
    } finally {
      setPickLoading(false)
    }
  }, [leagueId, userId, fetchOADData])

  // Check if a player is already used
  const isPlayerUsed = useCallback((playerId) => {
    return userPicks.usedPlayers.includes(playerId)
  }, [userPicks.usedPlayers])

  // Get the tier for a player based on rank
  const getPlayerTier = useCallback((playerRank) => {
    for (const tier of tiers) {
      if (tier.maxRank === null || playerRank <= tier.maxRank) {
        return tier
      }
    }
    return tiers[tiers.length - 1] // Default to last tier
  }, [tiers])

  // Calculate potential points for a player
  const calculatePotentialPoints = useCallback((basePoints, playerRank, isMajor = false) => {
    const tier = getPlayerTier(playerRank)
    let points = basePoints * (tier?.multiplier || 1)
    if (isMajor) {
      points *= 1.5 // Major multiplier
    }
    return Math.round(points)
  }, [getPlayerTier])

  // Get total points from all picks
  const totalPoints = userPicks.picks.reduce((sum, pick) => sum + (pick.points || 0), 0)

  // Check if user has made a pick for current tournament
  const hasCurrentPick = userPicks.currentPick !== null

  return {
    userPicks,
    tiers,
    currentTournament,
    leaderboard,
    loading,
    error,
    pickLoading,
    refetch: fetchOADData,
    makePick,
    isPlayerUsed,
    getPlayerTier,
    calculatePotentialPoints,
    totalPoints,
    hasCurrentPick,
  }
}

export default useOneAndDone
