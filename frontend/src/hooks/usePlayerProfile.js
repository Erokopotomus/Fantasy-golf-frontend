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
      const performances = p?.performances || []

      // Build recentForm: position strings like 'T5', '1', 'CUT' from recent performances
      const recentForm = performances.slice(0, 8).map((perf) => {
        if (perf.status === 'CUT') return 'CUT'
        if (perf.status === 'WD') return 'WD'
        if (perf.position == null) return null
        return perf.positionTied ? `T${perf.position}` : String(perf.position)
      }).filter(Boolean)

      const transformedPlayer = p ? {
        ...p,
        rank: p.owgrRank || p.datagolfRank || p.rank,
        recentForm,
        stats: {
          sgTotal: p.sgTotal ?? null,
          sgOffTee: p.sgOffTee ?? null,
          sgApproach: p.sgApproach ?? null,
          sgAroundGreen: p.sgAroundGreen ?? null,
          sgPutting: p.sgPutting ?? null,
          sgTeeToGreen: p.sgTeeToGreen ?? null,
          scoringAvg: p.scoringAvg ?? null,
          drivingDistance: p.drivingDistance ?? null,
          drivingAccuracy: p.drivingAccuracy ?? null,
          gir: p.gir ?? null,
        },
        countryFlag: p.countryFlag || getCountryFlag(p.country),
      } : null

      setPlayer(transformedPlayer)

      // Tournament history from performances
      setTournamentHistory(performances.map(perf => {
        let pos
        if (perf.status === 'CUT') pos = 'CUT'
        else if (perf.status === 'WD') pos = 'WD'
        else if (perf.position != null) pos = perf.positionTied ? `T${perf.position}` : String(perf.position)
        else pos = '-'

        return {
          name: perf.tournament?.name,
          date: perf.tournament?.startDate,
          position: pos,
          points: perf.fantasyPoints,
        }
      }))
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
