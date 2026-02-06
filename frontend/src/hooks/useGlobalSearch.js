import { useState, useCallback, useRef, useEffect } from 'react'
import api from '../services/api'

export const useGlobalSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({
    players: [],
    leagues: [],
    tournaments: [],
    news: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recentSearches, setRecentSearches] = useState(() => {
    const stored = localStorage.getItem('fantasy_golf_recent_searches')
    return stored ? JSON.parse(stored) : []
  })

  const debounceRef = useRef(null)

  const search = useCallback(async (searchQuery, options = {}) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ players: [], leagues: [], tournaments: [], news: [] })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.search(searchQuery, options)
      setResults(data)
    } catch (err) {
      setError(err.message || 'Search failed')
      setResults({ players: [], leagues: [], tournaments: [], news: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedSearch = useCallback((searchQuery, options = {}) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ players: [], leagues: [], tournaments: [], news: [] })
      setLoading(false)
      return
    }

    setLoading(true)

    debounceRef.current = setTimeout(() => {
      search(searchQuery, options)
    }, 300)
  }, [search])

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery)
    debouncedSearch(newQuery)
  }, [debouncedSearch])

  const addToRecentSearches = useCallback((item) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r.id !== item.id || r.type !== item.type)
      const updated = [item, ...filtered].slice(0, 5)
      localStorage.setItem('fantasy_golf_recent_searches', JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem('fantasy_golf_recent_searches')
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults({ players: [], leagues: [], tournaments: [], news: [] })
    setError(null)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const hasResults = Object.values(results).some(arr => arr.length > 0)

  return {
    query,
    setQuery: handleQueryChange,
    results,
    loading,
    error,
    hasResults,
    recentSearches,
    addToRecentSearches,
    clearRecentSearches,
    clearSearch,
    search,
  }
}

export default useGlobalSearch
