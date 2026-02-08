import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

/**
 * Flatten API leaderboard entry into the shape components expect:
 * { id, name, countryFlag, position, score, today, thru, fantasyPoints, ... }
 */
function flattenEntry(entry) {
  const player = entry.player || {}
  // "today" from the backend is already todayToPar (live) or last round raw score
  const todayRaw = entry.today
  const todayToPar = todayRaw

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
    // Live-only fields
    currentHole: entry.currentHole ?? null,
    currentRound: entry.currentRound ?? null,
    probabilities: entry.probabilities ?? null,
    sgTotalLive: entry.sgTotalLive ?? null,
    teeTimes: entry.teeTimes ?? null,
    // Clutch metrics
    clutchMetrics: entry.clutchMetrics ?? null,
  }
}

export const useTournamentScoring = (tournamentId, leagueId = null) => {
  const [tournament, setTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [isLive, setIsLive] = useState(false)
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

      const tournamentData = results[0]?.tournament || null
      setTournament(tournamentData)
      setIsLive(results[1]?.isLive === true)

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

      // Poll every 60s for live tournaments, 30s otherwise
      const interval = isLive ? 60000 : 30000
      pollIntervalRef.current = setInterval(fetchScoring, interval)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [tournamentId, fetchScoring, isLive])

  return {
    tournament,
    leaderboard,
    isLive,
    myPlayers,
    loading,
    error,
    refetch: fetchScoring,
  }
}

export default useTournamentScoring
