import { useState } from 'react'
import { mockApi } from '../services/mockApi'

export const useJoinLeague = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewLeague, setPreviewLeague] = useState(null)

  const validateCode = async (code) => {
    try {
      setLoading(true)
      setError(null)
      setPreviewLeague(null)
      const result = await mockApi.leagues.validateCode(code)
      setPreviewLeague(result)
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
      const result = await mockApi.leagues.join(code)
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
