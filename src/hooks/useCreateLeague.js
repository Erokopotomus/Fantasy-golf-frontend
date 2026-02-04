import { useState } from 'react'
import { mockApi } from '../services/mockApi'

export const useCreateLeague = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createLeague = async (leagueData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await mockApi.leagues.create(leagueData)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createLeague, loading, error }
}

export default useCreateLeague
