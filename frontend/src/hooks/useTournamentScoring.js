import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export const useTournamentScoring = (tournamentId, leagueId = null) => {
  const [tournament, setTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [myPlayers, setMyPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)

  const fetchScoring = useCallback(async () => {
    if (!tournamentId) return

    try {
      setError(null)

      // Fetch tournament details and leaderboard in parallel
      const promises = [
        api.getTournament(tournamentId),
        api.getTournamentLeaderboard(tournamentId),
      ]

      // If we have a leagueId, also fetch league-specific scoring
      if (leagueId) {
        promises.push(api.getLeagueScoring(leagueId, tournamentId))
      }

      const results = await Promise.all(promises)

      setTournament(results[0]?.tournament || null)
      setLeaderboard(results[1]?.leaderboard || [])

      // Extract user's players from league scoring data
      if (results[2]?.teams) {
        // Find user's team and get their players' performances
        const allPlayerIds = new Set()
        for (const team of results[2].teams) {
          for (const player of team.players) {
            allPlayerIds.add(player.playerId)
          }
        }
        // Mark leaderboard entries that are on user's team
        setMyPlayers(results[2].teams)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId, leagueId])

  useEffect(() => {
    if (tournamentId) {
      setLoading(true)
      fetchScoring()

      // Poll for updates every 30 seconds
      pollIntervalRef.current = setInterval(fetchScoring, 30000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [tournamentId, fetchScoring])

  return {
    tournament,
    leaderboard,
    myPlayers,
    loading,
    error,
    refetch: fetchScoring,
  }
}

export default useTournamentScoring
