import { useState, useCallback } from 'react'

// TODO: Replace stubs with real API calls when backend news endpoints are built

export const useNews = (options = {}) => {
  const [news] = useState([])
  const [loading] = useState(false)
  const [error] = useState(null)

  const refetch = useCallback(() => {}, [])

  return { news, loading, error, refetch }
}

export const useHighPriorityNews = () => {
  return { news: [], loading: false, error: null }
}

export const usePlayerNews = (playerId) => {
  return { news: [], loading: false, error: null }
}

export const useInjuryReports = () => {
  return { reports: [], loading: false, error: null }
}

export const useTrendingPlayers = () => {
  return { trending: [], loading: false, error: null }
}

export default useNews
