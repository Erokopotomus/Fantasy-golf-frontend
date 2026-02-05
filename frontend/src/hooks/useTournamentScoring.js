import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

/**
 * Flatten API leaderboard entry into the shape components expect:
 * { id, name, countryFlag, position, score, today, thru, fantasyPoints, ... }
 */
function flattenEntry(entry) {
  const player = entry.player || {}
  // "today" from API is last round raw score; convert to toPar (par 72)
  const todayRaw = entry.today
  const todayToPar = todayRaw != null ? todayRaw - 72 : null

  return {
    id: player.id,
    name: player.name,
    country: player.country,
    countryFlag: player.countryFlag,
    headshotUrl: player.headshotUrl,
    owgrRank: player.owgrRank,
    primaryTour: player.primaryTour,
    position: entry.positionTied ? `T${entry.position}` : entry.position,
    score: entry.totalToPar,
    today: todayToPar,
    thru: entry.thru,
    status: entry.status,
    totalScore: entry.totalScore,
    rounds: entry.rounds,
    fantasyPoints: entry.fantasyPoints,
    breakdown: entry.breakdown,
    eagles: entry.eagles,
    birdies: entry.birdies,
    bogeys: entry.bogeys,
  }
}

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

      // Flatten leaderboard entries to match component expectations
      const rawLeaderboard = results[1]?.leaderboard || []
      setLeaderboard(rawLeaderboard.map(flattenEntry))

      // Extract user's players from league scoring data
      if (results[2]?.teams) {
        const allPlayerIds = new Set()
        for (const team of results[2].teams) {
          for (const player of team.players) {
            allPlayerIds.add(player.playerId)
          }
        }
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
