import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export const useLeagueLiveScoring = (leagueId, tournamentId = null) => {
  const { user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchScoring = useCallback(async () => {
    if (!leagueId) return
    try {
      setError(null)
      const data = await api.getLeagueLiveScoring(leagueId, tournamentId)
      setTournament(data.tournament)
      setIsLive(data.isLive)
      setTeams(data.teams || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, tournamentId])

  useEffect(() => {
    if (!leagueId) return

    setLoading(true)
    fetchScoring()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [leagueId, fetchScoring])

  // Set up / tear down polling based on isLive
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (isLive) {
      pollRef.current = setInterval(fetchScoring, 60000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isLive, fetchScoring])

  const userTeam = teams.find((t) => t.userId === user?.id) || null

  return { tournament, isLive, teams, userTeam, loading, error, refetch: fetchScoring }
}

export default useLeagueLiveScoring
