import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// Helper to get country flag emoji
const getCountryFlag = (country) => {
  const flags = {
    'USA': '🇺🇸', 'NIR': '🇬🇧', 'ESP': '🇪🇸', 'JPN': '🇯🇵', 'NOR': '🇳🇴',
    'KOR': '🇰🇷', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'IRL': '🇮🇪', 'AUS': '🇦🇺', 'RSA': '🇿🇦',
    'SWE': '🇸🇪', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'CAN': '🇨🇦', 'FRA': '🇫🇷', 'GER': '🇩🇪',
    'CHI': '🇨🇱', 'ARG': '🇦🇷', 'MEX': '🇲🇽', 'COL': '🇨🇴', 'BEL': '🇧🇪',
    'ITA': '🇮🇹', 'AUT': '🇦🇹', 'DEN': '🇩🇰', 'FIN': '🇫🇮', 'NED': '🇳🇱',
    'THA': '🇹🇭', 'CHN': '🇨🇳', 'TPE': '🇹🇼', 'IND': '🇮🇳', 'PHI': '🇵🇭',
    'ZIM': '🇿🇼', 'VEN': '🇻🇪', 'PAR': '🇵🇾', 'PUR': '🇵🇷',
  }
  return flags[country] || '🏳️'
}

export const usePlayerProfile = (playerId) => {
  const [player, setPlayer] = useState(null)
  const [courseHistory, setCourseHistory] = useState([])
  const [tournamentHistory, setTournamentHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlayerProfile = useCallback(async () => {
    if (!playerId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await api.getPlayer(playerId)
      const p = data.player

      // Transform player to match frontend expectations
      const transformedPlayer = p ? {
        ...p,
        rank: p.owgrRank || p.rank,
        stats: {
          sgTotal: p.sgTotal,
          sgOffTee: p.sgOffTee,
          sgApproach: p.sgApproach,
          sgAroundGreen: p.sgAroundGreen,
          sgPutting: p.sgPutting,
          sgTeeToGreen: p.sgTeeToGreen,
        },
        countryFlag: getCountryFlag(p.country),
      } : null

      setPlayer(transformedPlayer)

      // Tournament history comes from player.performances
      const performances = p?.performances || []
      setTournamentHistory(performances.map(perf => ({
        tournament: perf.tournament?.name,
        date: perf.tournament?.startDate,
        position: perf.position,
        points: perf.fantasyPoints
      })))
      // Course history - not yet implemented in backend
      setCourseHistory([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    setLoading(true)
    fetchPlayerProfile()
  }, [playerId, fetchPlayerProfile])

  return {
    player,
    courseHistory,
    tournamentHistory,
    loading,
    error,
    refetch: fetchPlayerProfile
  }
}

export default usePlayerProfile
