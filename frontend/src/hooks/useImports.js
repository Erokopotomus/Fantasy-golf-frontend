import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useImports() {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchImports = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getImports()
      setImports(data.imports || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchImports() }, [fetchImports])

  const deleteImport = async (id) => {
    await api.deleteImport(id)
    setImports(prev => prev.filter(i => i.id !== id))
  }

  return { imports, loading, error, refetch: fetchImports, deleteImport }
}

export function useSleeperImport() {
  const [discovery, setDiscovery] = useState(null)
  const [importing, setImporting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const discover = async (leagueId) => {
    try {
      setDiscovering(true)
      setError(null)
      setDiscovery(null)
      const data = await api.discoverSleeperLeague(leagueId)
      setDiscovery(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiscovering(false)
    }
  }

  const startImport = async (leagueId) => {
    try {
      setImporting(true)
      setError(null)
      const data = await api.importSleeperLeague(leagueId)
      setResult(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setDiscovery(null)
    setResult(null)
    setError(null)
  }

  return { discovery, discovering, importing, result, error, discover, startImport, reset }
}

export function useLeagueHistory(leagueId) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    const fetch = async () => {
      try {
        setLoading(true)
        const data = await api.getLeagueHistory(leagueId)
        if (!cancelled) setHistory(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [leagueId])

  return { history, loading, error }
}
