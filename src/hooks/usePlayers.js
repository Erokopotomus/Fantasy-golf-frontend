import { useState, useEffect, useCallback, useMemo } from 'react'
import { mockApi } from '../services/mockApi'

export const usePlayers = (initialParams = {}) => {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [params, setParams] = useState({
    search: '',
    sortBy: 'rank',
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
      const data = await mockApi.players.getAll(params)
      setPlayers(data.players)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params])

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
        p.name.toLowerCase().includes(searchLower) ||
        p.country.toLowerCase().includes(searchLower)
      )
    }

    // Rank filter
    result = result.filter(p =>
      p.rank >= params.minRank && p.rank <= params.maxRank
    )

    // Country filter
    if (params.country) {
      result = result.filter(p =>
        p.country.toLowerCase() === params.country.toLowerCase()
      )
    }

    // Min SG filter
    if (params.minSgTotal !== null) {
      result = result.filter(p =>
        (p.stats?.sgTotal || 0) >= params.minSgTotal
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
          aVal = a.name
          bVal = b.name
          break
        case 'sgTotal':
          aVal = a.stats?.sgTotal || 0
          bVal = b.stats?.sgTotal || 0
          break
        case 'sgOffTee':
          aVal = a.stats?.sgOffTee || 0
          bVal = b.stats?.sgOffTee || 0
          break
        case 'sgApproach':
          aVal = a.stats?.sgApproach || 0
          bVal = b.stats?.sgApproach || 0
          break
        case 'sgPutting':
          aVal = a.stats?.sgPutting || 0
          bVal = b.stats?.sgPutting || 0
          break
        default:
          aVal = a.rank
          bVal = b.rank
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
