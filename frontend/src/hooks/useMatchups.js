import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useMatchups = (leagueId) => {
  const [schedule, setSchedule] = useState([])
  const [currentWeek, setCurrentWeek] = useState(null)
  const [playoffs, setPlayoffs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMatchups = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [scheduleData, currentWeekData, playoffData] = await Promise.all([
        mockApi.matchups.getSchedule(leagueId),
        mockApi.matchups.getCurrentWeek(leagueId),
        mockApi.matchups.getPlayoffBracket(leagueId),
      ])

      setSchedule(scheduleData.schedule || [])
      setCurrentWeek(currentWeekData)
      setPlayoffs(playoffData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchMatchups()
  }, [fetchMatchups])

  // Get matchup by week number
  const getWeekMatchups = useCallback((weekNum) => {
    return schedule.find(w => w.week === weekNum) || null
  }, [schedule])

  // Get user's matchup for a specific week
  const getUserMatchup = useCallback((weekNum, userId) => {
    const week = getWeekMatchups(weekNum)
    if (!week) return null

    return week.matchups.find(m => m.home === userId || m.away === userId) || null
  }, [getWeekMatchups])

  // Calculate standings from schedule
  const calculateStandings = useCallback(() => {
    const standings = {}

    schedule.forEach(week => {
      if (!week.matchups) return

      week.matchups.forEach(matchup => {
        if (!matchup.completed) return

        // Initialize if needed
        if (!standings[matchup.home]) {
          standings[matchup.home] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }
        }
        if (!standings[matchup.away]) {
          standings[matchup.away] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }
        }

        // Update stats
        standings[matchup.home].pointsFor += matchup.homeScore || 0
        standings[matchup.home].pointsAgainst += matchup.awayScore || 0
        standings[matchup.away].pointsFor += matchup.awayScore || 0
        standings[matchup.away].pointsAgainst += matchup.homeScore || 0

        // Determine winner
        if (matchup.homeScore > matchup.awayScore) {
          standings[matchup.home].wins++
          standings[matchup.away].losses++
        } else if (matchup.awayScore > matchup.homeScore) {
          standings[matchup.away].wins++
          standings[matchup.home].losses++
        } else {
          standings[matchup.home].ties++
          standings[matchup.away].ties++
        }
      })
    })

    return standings
  }, [schedule])

  return {
    schedule,
    currentWeek,
    playoffs,
    loading,
    error,
    refetch: fetchMatchups,
    getWeekMatchups,
    getUserMatchup,
    calculateStandings,
  }
}

export default useMatchups
