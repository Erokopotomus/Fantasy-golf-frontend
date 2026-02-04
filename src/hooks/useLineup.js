import { useState, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useLineup = (leagueId) => {
  const [activeLineup, setActiveLineup] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const setLineup = useCallback(async (tournamentId, playerIds) => {
    try {
      setLoading(true)
      setError(null)
      setSaved(false)
      const result = await mockApi.roster.setLineup(leagueId, tournamentId, playerIds)
      setActiveLineup(playerIds)
      setSaved(true)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  const clearSaved = useCallback(() => {
    setSaved(false)
  }, [])

  return { activeLineup, setActiveLineup, setLineup, loading, error, saved, clearSaved }
}

export default useLineup
