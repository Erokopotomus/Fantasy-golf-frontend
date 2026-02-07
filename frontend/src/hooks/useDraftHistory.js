import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useDraftHistory() {
  const [leagueDrafts, setLeagueDrafts] = useState([])
  const [mockDrafts, setMockDrafts] = useState([])
  const [mockDraftTotal, setMockDraftTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [leagueData, mockData] = await Promise.all([
        api.getLeagueDraftHistory().catch(() => []),
        api.getMockDraftHistory(1).catch(() => ({ results: [], total: 0 })),
      ])
      setLeagueDrafts(leagueData)
      setMockDrafts(mockData.results || [])
      setMockDraftTotal(mockData.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const loadMoreMockDrafts = async (page) => {
    const data = await api.getMockDraftHistory(page)
    setMockDrafts(prev => [...prev, ...(data.results || [])])
    return data
  }

  const deleteMockDraft = async (id) => {
    await api.deleteMockDraft(id)
    setMockDrafts(prev => prev.filter(d => d.id !== id))
    setMockDraftTotal(prev => prev - 1)
  }

  return { leagueDrafts, mockDrafts, mockDraftTotal, loading, error, refresh: fetchAll, loadMoreMockDrafts, deleteMockDraft }
}

export function useDraftRecap(draftId) {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!draftId) return
    setLoading(true)
    api.getDraftRecap(draftId)
      .then(data => setDraft(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [draftId])

  return { draft, loading, error }
}

export function useMockDraftRecap(id) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.getMockDraftRecap(id)
      .then(data => setResult(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { result, loading, error }
}
