import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// Fallback flag lookup — maps both 3-letter codes and full country names from DataGolf
const getCountryFlag = (country) => {
  if (!country) return '\u{1F3F3}\u{FE0F}'
  const flags = {
    // Full country names (DataGolf format)
    'United States': '\u{1F1FA}\u{1F1F8}',
    'England': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    'Scotland': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    'Northern Ireland': '\u{1F1EC}\u{1F1E7}',
    'Ireland': '\u{1F1EE}\u{1F1EA}',
    'Australia': '\u{1F1E6}\u{1F1FA}',
    'South Africa': '\u{1F1FF}\u{1F1E6}',
    'Japan': '\u{1F1EF}\u{1F1F5}',
    'Korea - Republic of': '\u{1F1F0}\u{1F1F7}',
    'South Korea': '\u{1F1F0}\u{1F1F7}',
    'Spain': '\u{1F1EA}\u{1F1F8}',
    'Norway': '\u{1F1F3}\u{1F1F4}',
    'Sweden': '\u{1F1F8}\u{1F1EA}',
    'Canada': '\u{1F1E8}\u{1F1E6}',
    'France': '\u{1F1EB}\u{1F1F7}',
    'Germany': '\u{1F1E9}\u{1F1EA}',
    'Colombia': '\u{1F1E8}\u{1F1F4}',
    'Belgium': '\u{1F1E7}\u{1F1EA}',
    'Italy': '\u{1F1EE}\u{1F1F9}',
    'Austria': '\u{1F1E6}\u{1F1F9}',
    'Denmark': '\u{1F1E9}\u{1F1F0}',
    'Finland': '\u{1F1EB}\u{1F1EE}',
    'Netherlands': '\u{1F1F3}\u{1F1F1}',
    'China': '\u{1F1E8}\u{1F1F3}',
    'Thailand': '\u{1F1F9}\u{1F1ED}',
    'India': '\u{1F1EE}\u{1F1F3}',
    'Philippines': '\u{1F1F5}\u{1F1ED}',
    'Venezuela': '\u{1F1FB}\u{1F1EA}',
    'New Zealand': '\u{1F1F3}\u{1F1FF}',
    'Mexico': '\u{1F1F2}\u{1F1FD}',
    'Argentina': '\u{1F1E6}\u{1F1F7}',
    'Chile': '\u{1F1E8}\u{1F1F1}',
    'Taiwan': '\u{1F1F9}\u{1F1FC}',
    'Zimbabwe': '\u{1F1FF}\u{1F1FC}',
    'Paraguay': '\u{1F1F5}\u{1F1FE}',
    // 3-letter codes (legacy)
    'USA': '\u{1F1FA}\u{1F1F8}', 'NIR': '\u{1F1EC}\u{1F1E7}', 'ESP': '\u{1F1EA}\u{1F1F8}',
    'JPN': '\u{1F1EF}\u{1F1F5}', 'NOR': '\u{1F1F3}\u{1F1F4}', 'KOR': '\u{1F1F0}\u{1F1F7}',
    'ENG': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    'IRL': '\u{1F1EE}\u{1F1EA}', 'AUS': '\u{1F1E6}\u{1F1FA}', 'RSA': '\u{1F1FF}\u{1F1E6}',
    'SWE': '\u{1F1F8}\u{1F1EA}', 'SCO': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    'CAN': '\u{1F1E8}\u{1F1E6}', 'FRA': '\u{1F1EB}\u{1F1F7}', 'GER': '\u{1F1E9}\u{1F1EA}',
    'COL': '\u{1F1E8}\u{1F1F4}', 'BEL': '\u{1F1E7}\u{1F1EA}',
  }
  return flags[country] || '\u{1F3F3}\u{FE0F}'
}

export const usePlayerProfile = (playerId) => {
  const [player, setPlayer] = useState(null)
  const [projection, setProjection] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [liveScore, setLiveScore] = useState(null)
  const [upcomingTournaments, setUpcomingTournaments] = useState([])
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
        datagolfRank: p.datagolfRank ?? null,
        datagolfSkill: p.datagolfSkill ?? null,
        primaryTour: p.primaryTour ?? null,
        // Season stats — prefer API-computed seasonStats over raw player fields
        events: data.seasonStats?.events ?? p.events ?? 0,
        wins: data.seasonStats?.wins ?? p.wins ?? 0,
        top5s: data.seasonStats?.top5s ?? p.top5s ?? 0,
        top10s: data.seasonStats?.top10s ?? p.top10s ?? 0,
        top25s: data.seasonStats?.top25s ?? p.top25s ?? 0,
        cutsMade: data.seasonStats?.cutsMade ?? p.cutsMade ?? 0,
        earnings: data.seasonStats?.earnings ?? p.earnings ?? 0,
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
        // Prefer DB flag, fall back to lookup
        countryFlag: p.countryFlag || getCountryFlag(p.country),
      } : null

      setPlayer(transformedPlayer)
      setProjection(data.projection || null)
      setPredictions(data.predictions || null)
      setLiveScore(data.liveScore || null)
      setUpcomingTournaments(data.upcomingTournaments || [])

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
    projection,
    predictions,
    liveScore,
    upcomingTournaments,
    courseHistory,
    tournamentHistory,
    loading,
    error,
    refetch: fetchPlayerProfile
  }
}

export default usePlayerProfile
