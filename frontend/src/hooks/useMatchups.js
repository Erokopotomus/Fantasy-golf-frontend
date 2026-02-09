import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

export const useMatchups = (leagueId) => {
  const [schedule, setSchedule] = useState([])
  const [currentWeek, setCurrentWeek] = useState(null)
  const [playoffs, setPlayoffs] = useState(null)
  const [standings, setStandings] = useState([])
  const [divisionStandings, setDivisionStandings] = useState(null)
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

      const data = await api.getLeagueMatchups(leagueId)

      setSchedule(data.schedule || [])
      setCurrentWeek(data.currentWeek || null)
      setPlayoffs(data.playoffs || null)
      setStandings(data.standings || [])
      setDivisionStandings(data.divisionStandings || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchMatchups()
  }, [fetchMatchups])

  const getWeekMatchups = useCallback((weekNum) => {
    return schedule.find(w => w.week === weekNum) || null
  }, [schedule])

  const getUserMatchup = useCallback((weekNum, userId) => {
    const week = getWeekMatchups(weekNum)
    if (!week) return null
    return week.matchups.find(m => m.home === userId || m.away === userId) || null
  }, [getWeekMatchups])

  return {
    schedule,
    currentWeek,
    playoffs,
    standings,
    divisionStandings,
    loading,
    error,
    refetch: fetchMatchups,
    getWeekMatchups,
    getUserMatchup,
  }
}

export default useMatchups
