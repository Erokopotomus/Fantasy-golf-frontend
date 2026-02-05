import { useState, useEffect, useCallback } from 'react'
import { mockApi } from '../services/mockApi'

export const useNews = (options = {}) => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await mockApi.news.getAll(options)
      setNews(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch news')
    } finally {
      setLoading(false)
    }
  }, [options.type, options.priority, options.playerId, options.limit])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const refetch = useCallback(() => {
    fetchNews()
  }, [fetchNews])

  return { news, loading, error, refetch }
}

export const useHighPriorityNews = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        const data = await mockApi.news.getHighPriority()
        setNews(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [])

  return { news, loading, error }
}

export const usePlayerNews = (playerId) => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!playerId) {
      setNews([])
      setLoading(false)
      return
    }

    const fetchNews = async () => {
      try {
        setLoading(true)
        const data = await mockApi.news.getByPlayer(playerId)
        setNews(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [playerId])

  return { news, loading, error }
}

export const useInjuryReports = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const data = await mockApi.news.getInjuryReports()
        setReports(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  return { reports, loading, error }
}

export const useTrendingPlayers = () => {
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        const data = await mockApi.news.getTrending()
        setTrending(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [])

  return { trending, loading, error }
}

export default useNews
