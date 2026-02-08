import { useState, useEffect } from 'react'
import api from '../services/api'

export default function usePublicProfile(username) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!username) return

    setLoading(true)
    setError(null)

    api.getPublicProfile(username)
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Profile not found'))
      .finally(() => setLoading(false))
  }, [username])

  return {
    user: data?.user || null,
    reputations: data?.reputations || [],
    clutchRating: data?.clutchRating || null,
    managerStats: data?.managerStats || null,
    recentCalls: data?.recentCalls || [],
    achievements: data?.achievements || [],
    loading,
    error,
  }
}
