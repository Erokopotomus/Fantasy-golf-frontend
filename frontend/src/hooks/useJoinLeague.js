import { useState } from 'react'
import api from '../services/api'

export const useJoinLeague = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewLeague, setPreviewLeague] = useState(null)

  const validateCode = async (code) => {
    try {
      setLoading(true)
      setError(null)
      setPreviewLeague(null)
      // Try to get league info by code - backend may return league preview
      const result = await api.joinLeagueByCode(code)
      setPreviewLeague(result.league || result)
      return result
    } catch (err) {
      setError(err.message)
      setPreviewLeague(null)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinLeague = async (code) => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.joinLeagueByCode(code)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearPreview = () => {
    setPreviewLeague(null)
    setError(null)
  }

  return { validateCode, joinLeague, loading, error, previewLeague, clearPreview }
}

export default useJoinLeague
