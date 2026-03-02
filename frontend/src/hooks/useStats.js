import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useStats = (userId) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Try ManagerProfile aggregate first (includes imported league history)
      if (userId) {
        try {
          const profile = await api.getManagerProfile(userId)
          const agg = profile?.aggregate
          if (agg) {
            setStats({
              activeLeagues: agg.totalLeagues || 0,
              totalPoints: agg.totalPoints || undefined,
              bestFinish: agg.bestFinish || null,
              winRate: agg.winPct != null ? Math.round(agg.winPct * 100) : undefined,
            })
            return
          }
        } catch {
          // Fall through to leagues-derived stats
        }
      }

      // Fallback: derive stats from leagues data (on-platform only)
      const data = await api.getLeagues()
      const leagues = data.leagues || data || []

      const activeLeagues = leagues.length
      const totalPoints = leagues.reduce((sum, l) => {
        const teamPts = l.teams?.[0]?.totalPoints || 0
        return sum + teamPts
      }, 0)

      let bestFinish = null
      leagues.forEach(l => {
        if (l.userRank && (!bestFinish || l.userRank < bestFinish)) {
          bestFinish = l.userRank
        }
      })

      let totalWins = 0
      let totalGames = 0
      leagues.forEach(l => {
        const team = l.teams?.[0]
        if (team) {
          totalWins += team.wins || 0
          totalGames += (team.wins || 0) + (team.losses || 0)
        }
      })
      const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : undefined

      setStats({
        activeLeagues,
        totalPoints: totalPoints || undefined,
        bestFinish,
        winRate,
      })
    } catch (err) {
      setError(err.message)
      setStats({
        activeLeagues: 0,
        totalPoints: undefined,
        bestFinish: null,
        winRate: undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refetch = () => {
    fetchStats()
  }

  return { stats, loading, error, refetch }
}

export default useStats
