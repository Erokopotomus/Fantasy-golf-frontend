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

export function useESPNImport() {
  const [discovery, setDiscovery] = useState(null)
  const [importing, setImporting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const discover = async (leagueId, espn_s2, swid) => {
    try {
      setDiscovering(true)
      setError(null)
      setDiscovery(null)
      const data = await api.discoverESPNLeague(leagueId, espn_s2, swid)
      setDiscovery(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiscovering(false)
    }
  }

  const startImport = async (leagueId, espn_s2, swid) => {
    try {
      setImporting(true)
      setError(null)
      const data = await api.importESPNLeague(leagueId, espn_s2, swid)
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

export function useYahooImport() {
  const [discovery, setDiscovery] = useState(null)
  const [importing, setImporting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const discover = async (leagueId, accessToken) => {
    try {
      setDiscovering(true)
      setError(null)
      setDiscovery(null)
      const data = await api.discoverYahooLeague(leagueId, accessToken)
      setDiscovery(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiscovering(false)
    }
  }

  const startImport = async (leagueId, accessToken) => {
    try {
      setImporting(true)
      setError(null)
      const data = await api.importYahooLeague(leagueId, accessToken)
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

export function useFantraxImport() {
  const [discovery, setDiscovery] = useState(null)
  const [importing, setImporting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const discover = async (csvData) => {
    try {
      setDiscovering(true)
      setError(null)
      setDiscovery(null)
      const data = await api.discoverFantraxLeague(csvData)
      setDiscovery(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiscovering(false)
    }
  }

  const startImport = async (csvData) => {
    try {
      setImporting(true)
      setError(null)
      const data = await api.importFantraxLeague(csvData)
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

export function useMFLImport() {
  const [discovery, setDiscovery] = useState(null)
  const [importing, setImporting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const discover = async (leagueId, apiKey) => {
    try {
      setDiscovering(true)
      setError(null)
      setDiscovery(null)
      const data = await api.discoverMFLLeague(leagueId, apiKey)
      setDiscovery(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiscovering(false)
    }
  }

  const startImport = async (leagueId, apiKey) => {
    try {
      setImporting(true)
      setError(null)
      const data = await api.importMFLLeague(leagueId, apiKey)
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
