import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'

export const usePlayers = (initialParams = {}) => {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [params, setParams] = useState({
    search: '',
    sortBy: 'owgrRank',
    sortDir: 'asc',
    minRank: 1,
    maxRank: 100,
    country: '',
    minSgTotal: null,
    availability: 'all', // 'all', 'available', 'owned'
    page: 1,
    perPage: 20,
    ...initialParams,
  })

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getPlayers()
      // Handle both array response and object with players property
      const playerList = data.players || data || []
      // Transform players to match frontend expectations
      const transformedPlayers = playerList.map(p => ({
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
        countryFlag: p.countryFlag || getCountryFlag(p.country),
        headshotUrl: p.headshotUrl || null,
      }))
      setPlayers(transformedPlayers)
    } catch (err) {
      setError(err.message)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Helper to get country flag emoji (supports both full names and 3-letter codes)
  const getCountryFlag = (country) => {
    if (!country) return '🏳️'
    const flags = {
      // Full country names (as stored by DataGolf sync)
      'United States': '🇺🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Northern Ireland': '🇬🇧', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ireland': '🇮🇪',
      'Australia': '🇦🇺', 'Canada': '🇨🇦', 'South Africa': '🇿🇦',
      'Japan': '🇯🇵', 'Korea': '🇰🇷', 'Korea - Republic of': '🇰🇷', 'South Korea': '🇰🇷',
      'Spain': '🇪🇸', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Italy': '🇮🇹',
      'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
      'Belgium': '🇧🇪', 'Netherlands': '🇳🇱', 'Austria': '🇦🇹',
      'Argentina': '🇦🇷', 'Mexico': '🇲🇽', 'Colombia': '🇨🇴', 'Chile': '🇨🇱',
      'Venezuela': '🇻🇪', 'Paraguay': '🇵🇾', 'Puerto Rico': '🇵🇷',
      'Thailand': '🇹🇭', 'China': '🇨🇳', 'Chinese Taipei': '🇹🇼', 'Taiwan': '🇹🇼',
      'India': '🇮🇳', 'Philippines': '🇵🇭', 'Zimbabwe': '🇿🇼',
      'New Zealand': '🇳🇿', 'Fiji': '🇫🇯', 'Singapore': '🇸🇬', 'Malaysia': '🇲🇾',
      'Brazil': '🇧🇷', 'Portugal': '🇵🇹', 'Switzerland': '🇨🇭', 'Poland': '🇵🇱',
      // 3-letter codes (fallback)
      'USA': '🇺🇸', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'NIR': '🇬🇧',
      'IRL': '🇮🇪', 'AUS': '🇦🇺', 'CAN': '🇨🇦', 'RSA': '🇿🇦',
      'JPN': '🇯🇵', 'KOR': '🇰🇷', 'ESP': '🇪🇸', 'FRA': '🇫🇷',
      'GER': '🇩🇪', 'ITA': '🇮🇹', 'SWE': '🇸🇪', 'NOR': '🇳🇴',
      'DEN': '🇩🇰', 'FIN': '🇫🇮', 'BEL': '🇧🇪', 'NED': '🇳🇱',
      'AUT': '🇦🇹', 'ARG': '🇦🇷', 'MEX': '🇲🇽', 'COL': '🇨🇴',
      'CHI': '🇨🇱', 'VEN': '🇻🇪', 'PAR': '🇵🇾', 'PUR': '🇵🇷',
      'THA': '🇹🇭', 'CHN': '🇨🇳', 'TPE': '🇹🇼', 'IND': '🇮🇳',
      'PHI': '🇵🇭', 'ZIM': '🇿🇼',
    }
    return flags[country] || '🏳️'
  }

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const updateParams = useCallback((newParams) => {
    setParams(prev => ({ ...prev, ...newParams, page: 1 }))
  }, [])

  const setPage = useCallback((page) => {
    setParams(prev => ({ ...prev, page }))
  }, [])

  const filteredPlayers = useMemo(() => {
    let result = [...players]

    // Search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.country?.toLowerCase().includes(searchLower)
      )
    }

    // Rank filter (use owgrRank from new schema)
    result = result.filter(p => {
      const rank = p.owgrRank || p.rank || 999
      return rank >= params.minRank && rank <= params.maxRank
    })

    // Country filter
    if (params.country) {
      result = result.filter(p =>
        p.country?.toLowerCase() === params.country.toLowerCase()
      )
    }

    // Min SG filter
    if (params.minSgTotal !== null) {
      result = result.filter(p =>
        (p.sgTotal || 0) >= params.minSgTotal
      )
    }

    // Availability filter
    if (params.availability === 'available') {
      result = result.filter(p => !p.owned)
    } else if (params.availability === 'owned') {
      result = result.filter(p => p.owned)
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal
      switch (params.sortBy) {
        case 'name':
          aVal = a.name || ''
          bVal = b.name || ''
          break
        case 'sgTotal':
          aVal = a.sgTotal || 0
          bVal = b.sgTotal || 0
          break
        case 'sgOffTee':
          aVal = a.sgOffTee || 0
          bVal = b.sgOffTee || 0
          break
        case 'sgApproach':
          aVal = a.sgApproach || 0
          bVal = b.sgApproach || 0
          break
        case 'sgPutting':
          aVal = a.sgPutting || 0
          bVal = b.sgPutting || 0
          break
        case 'owgrRank':
        case 'rank':
        default:
          aVal = a.owgrRank || a.rank || 999
          bVal = b.owgrRank || b.rank || 999
      }
      if (typeof aVal === 'string') {
        return params.sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return params.sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [players, params])

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / params.perPage)
  const paginatedPlayers = filteredPlayers.slice(
    (params.page - 1) * params.perPage,
    params.page * params.perPage
  )

  return {
    players: paginatedPlayers,
    allPlayers: filteredPlayers,
    totalPlayers: filteredPlayers.length,
    loading,
    error,
    params,
    updateParams,
    setPage,
    totalPages,
    currentPage: params.page,
    refetch: fetchPlayers,
  }
}

export default usePlayers
