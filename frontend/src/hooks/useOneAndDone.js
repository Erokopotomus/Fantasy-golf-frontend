import { useState, useCallback } from 'react'

export const useOneAndDone = (leagueId, userId) => {
  const [userPicks, setUserPicks] = useState({ usedPlayers: [], picks: [], currentPick: null })
  const [tiers, setTiers] = useState([])
  const [currentTournament, setCurrentTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading] = useState(false)
  const [error] = useState(null)
  const [pickLoading, setPickLoading] = useState(false)

  const fetchOADData = useCallback(async () => {
    // TODO: Replace with real API call when backend OAD endpoints are built
    // e.g. const data = await api.getOADData(leagueId, userId)
  }, [leagueId, userId])

  const makePick = useCallback(async (playerId, tournamentId) => {
    if (!leagueId || !userId) return
    try {
      setPickLoading(true)
      // TODO: Replace with real API call
      await fetchOADData()
    } catch (err) {
      throw err
    } finally {
      setPickLoading(false)
    }
  }, [leagueId, userId, fetchOADData])

  const isPlayerUsed = useCallback((playerId) => {
    return userPicks.usedPlayers.includes(playerId)
  }, [userPicks.usedPlayers])

  const getPlayerTier = useCallback((playerRank) => {
    for (const tier of tiers) {
      if (tier.maxRank === null || playerRank <= tier.maxRank) {
        return tier
      }
    }
    return tiers[tiers.length - 1]
  }, [tiers])

  const calculatePotentialPoints = useCallback((basePoints, playerRank, isMajor = false) => {
    const tier = getPlayerTier(playerRank)
    let points = basePoints * (tier?.multiplier || 1)
    if (isMajor) {
      points *= 1.5
    }
    return Math.round(points)
  }, [getPlayerTier])

  const totalPoints = userPicks.picks.reduce((sum, pick) => sum + (pick.points || 0), 0)
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
