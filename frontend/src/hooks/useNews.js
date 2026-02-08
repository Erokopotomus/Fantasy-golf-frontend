import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// Derives news from tournament leaderboard + player data
// No dedicated news backend — synthesizes from existing endpoints

export const useNews = (options = {}) => {
  const { limit = 20, type } = options
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const items = []

      // Get current tournament
      const tourneyRes = await api.getCurrentTournament().catch(() => null)
      const tournament = tourneyRes?.tournament || tourneyRes

      if (tournament) {
        // Tournament status news
        const statusMap = {
          IN_PROGRESS: 'is underway',
          COMPLETED: 'has concluded',
          UPCOMING: 'starts soon',
          SCHEDULED: 'is scheduled',
        }
        items.push({
          id: `tourney-${tournament.id}`,
          type: 'tournament',
          priority: tournament.status === 'IN_PROGRESS' ? 'high' : 'normal',
          headline: `${tournament.name} ${statusMap[tournament.status] || ''}`,
          summary: [
            tournament.courseName,
            tournament.purse ? `$${(tournament.purse / 1000000).toFixed(1)}M purse` : null,
          ].filter(Boolean).join(' — '),
          playerName: null,
          playerFlag: null,
          timestamp: tournament.startDate || new Date().toISOString(),
          category: 'tournament',
          source: 'Clutch',
          tournamentId: tournament.id,
        })

        // Get leaderboard data
        const lbRes = await api.getTournamentLeaderboard(tournament.id, { limit: 100 }).catch(() => null)
        const leaderboard = lbRes?.leaderboard || []

        // Leader / top 5 performances
        leaderboard.slice(0, 5).forEach((p, i) => {
          items.push({
            id: `perf-${tournament.id}-${p.id || p.playerId || i}`,
            type: i === 0 ? 'hot' : 'trending',
            priority: i === 0 ? 'high' : 'normal',
            impact: 'positive',
            headline: i === 0
              ? `${p.name || p.playerName} leads ${tournament.name}`
              : `${p.name || p.playerName} in contention at ${p.position ? (p.positionTied ? 'T' : '') + p.position : '#' + (i + 1)}`,
            summary: `Score: ${p.totalScore || p.score || '—'} | SG Total: ${p.sgTotal != null ? (p.sgTotal > 0 ? '+' : '') + p.sgTotal.toFixed(1) : '—'}`,
            playerName: p.name || p.playerName,
            playerId: p.id || p.playerId,
            playerFlag: p.countryFlag,
            timestamp: new Date().toISOString(),
            category: 'leaderboard',
            source: 'DataGolf',
          })
        })

        // Withdrawals as news
        leaderboard.filter(p => p.status === 'WD' || p.status === 'wd').forEach(p => {
          items.push({
            id: `wd-news-${p.id || p.playerId}`,
            type: 'withdrawal',
            priority: 'high',
            impact: 'negative',
            headline: `${p.name || p.playerName} withdraws from ${tournament.name}`,
            summary: 'Withdrawal confirmed',
            playerName: p.name || p.playerName,
            playerId: p.id || p.playerId,
            playerFlag: p.countryFlag,
            timestamp: new Date().toISOString(),
            category: 'injury',
            source: 'Clutch',
          })
        })

        // Cold performers (bottom of leaderboard with negative SG)
        const withSg = leaderboard.filter(p => p.sgTotal != null && p.status !== 'WD' && p.status !== 'CUT')
        const coldPlayers = [...withSg].sort((a, b) => a.sgTotal - b.sgTotal).slice(0, 3)
        coldPlayers.forEach(p => {
          if (p.sgTotal < -1) {
            items.push({
              id: `cold-${p.id || p.playerId}`,
              type: 'cold',
              priority: 'normal',
              impact: 'negative',
              headline: `${p.name || p.playerName} struggling at ${p.position ? (p.positionTied ? 'T' : '') + p.position : '—'}`,
              summary: `SG Total: ${p.sgTotal.toFixed(1)}`,
              playerName: p.name || p.playerName,
              playerId: p.id || p.playerId,
              playerFlag: p.countryFlag,
              timestamp: new Date().toISOString(),
              category: 'performance',
              source: 'DataGolf',
            })
          }
        })
      }

      // Recent completed tournaments
      const tourneysRes = await api.getTournaments({ limit: 5 }).catch(() => null)
      const tournaments = tourneysRes?.tournaments || tourneysRes || []
      const completed = tournaments.filter(t => t.status === 'COMPLETED' && t.id !== tournament?.id)
      completed.slice(0, 2).forEach(t => {
        items.push({
          id: `result-${t.id}`,
          type: 'tournament',
          priority: 'normal',
          headline: `${t.name} — Final Results Available`,
          summary: t.courseName || '',
          playerName: null,
          playerFlag: null,
          timestamp: t.endDate || t.startDate,
          category: 'results',
          source: 'Clutch',
          tournamentId: t.id,
        })
      })

      // Filter by type if requested
      const filtered = type ? items.filter(i => i.type === type) : items
      setNews(filtered.slice(0, limit))
    } catch (err) {
      console.error('Failed to load news:', err)
      setError(err.message)
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [limit, type])

  useEffect(() => { fetchNews() }, [fetchNews])

  return { news, loading, error, refetch: fetchNews }
}

export const useHighPriorityNews = () => {
  const { news, loading, error } = useNews({ limit: 50 })
  const highPriority = news.filter(n => n.priority === 'high')
  return { news: highPriority, loading, error }
}

export const usePlayerNews = (playerId) => {
  const { news: allNews, loading, error } = useNews({ limit: 50 })
  const playerNews = allNews.filter(n => n.playerId === playerId)
  return { news: playerNews, loading, error }
}

export const useInjuryReports = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const tourneyRes = await api.getCurrentTournament().catch(() => null)
        const tournament = tourneyRes?.tournament || tourneyRes
        if (!tournament?.id) {
          setLoading(false)
          return
        }

        const lbRes = await api.getTournamentLeaderboard(tournament.id, { limit: 200 }).catch(() => null)
        const leaderboard = lbRes?.leaderboard || []
        const items = []

        leaderboard.forEach(p => {
          if (p.status === 'WD' || p.status === 'wd') {
            items.push({
              id: `wd-${p.id || p.playerId}`,
              type: 'withdrawal',
              priority: 'high',
              impact: 'negative',
              playerName: p.name || p.playerName,
              playerId: p.id || p.playerId,
              playerFlag: p.countryFlag,
              headline: `${p.name || p.playerName} — Withdrawn`,
              summary: `Withdrew from ${tournament.name}`,
              timestamp: new Date().toISOString(),
              source: 'Clutch',
            })
          }
          if (p.status === 'CUT') {
            items.push({
              id: `cut-${p.id || p.playerId}`,
              type: 'injury',
              priority: 'normal',
              impact: 'negative',
              playerName: p.name || p.playerName,
              playerId: p.id || p.playerId,
              playerFlag: p.countryFlag,
              headline: `${p.name || p.playerName} — Missed Cut`,
              summary: `Score: ${p.totalScore || p.score || '—'}`,
              timestamp: new Date().toISOString(),
              source: 'Clutch',
            })
          }
        })

        setReports(items)
      } catch (err) {
        setError(err.message)
        setReports([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { reports, loading, error }
}

export const useTrendingPlayers = () => {
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const tourneyRes = await api.getCurrentTournament().catch(() => null)
        const tournament = tourneyRes?.tournament || tourneyRes
        if (!tournament?.id) {
          setLoading(false)
          return
        }

        const lbRes = await api.getTournamentLeaderboard(tournament.id, { limit: 50 }).catch(() => null)
        const leaderboard = lbRes?.leaderboard || []
        const items = []

        const active = leaderboard.filter(p => p.sgTotal != null && p.status !== 'WD')
        const sorted = [...active].sort((a, b) => (b.sgTotal || 0) - (a.sgTotal || 0))

        // Hot — top SG performers
        sorted.slice(0, 6).forEach(p => {
          items.push({
            id: `hot-${p.id || p.playerId}`,
            type: 'hot',
            impact: 'positive',
            playerName: p.name || p.playerName,
            playerId: p.id || p.playerId,
            playerFlag: p.countryFlag,
            headline: `SG Total: ${p.sgTotal > 0 ? '+' : ''}${p.sgTotal.toFixed(1)}`,
            sgTotal: p.sgTotal,
            position: p.position,
          })
        })

        // Cold — bottom SG performers
        sorted.slice(-4).reverse().forEach(p => {
          if (p.sgTotal < 0) {
            items.push({
              id: `cold-${p.id || p.playerId}`,
              type: 'cold',
              impact: 'negative',
              playerName: p.name || p.playerName,
              playerId: p.id || p.playerId,
              playerFlag: p.countryFlag,
              headline: `SG Total: ${p.sgTotal.toFixed(1)}`,
              sgTotal: p.sgTotal,
              position: p.position,
            })
          }
        })

        setTrending(items)
      } catch (err) {
        setError(err.message)
        setTrending([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { trending, loading, error }
}

export default useNews
