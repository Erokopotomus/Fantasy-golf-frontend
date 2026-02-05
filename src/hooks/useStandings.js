import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useStandings = (leagueId) => {
  const [standings, setStandings] = useState([])
  const [weeklyResults, setWeeklyResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStandings = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      setError('No league selected')
      return
    }

    try {
      setError(null)
      const data = await mockApi.leagues.getStandings(leagueId)
      setStandings(data.standings)
      setWeeklyResults(data.weeklyResults)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    setLoading(true)
    fetchStandings()
  }, [leagueId, fetchStandings])

  return {
    standings,
    weeklyResults,
    loading,
    error,
    refetch: fetchStandings
  }
}

export default useStandings
