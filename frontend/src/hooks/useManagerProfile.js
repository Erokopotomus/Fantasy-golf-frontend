import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useManagerProfile = (userId) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [bySport, setBySport] = useState([])
  const [achievements, setAchievements] = useState([])
  const [achievementStats, setAchievementStats] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [clutchRating, setClutchRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      const [profileData, achievementData, reputationData, clutchRatingData] = await Promise.all([
        api.getManagerProfile(userId),
        api.getManagerAchievements(userId),
        api.getUserReputation(userId).catch(() => null),
        api.getClutchRating(userId).catch(() => null),
      ])

      setUser(profileData.user)
      setProfile(profileData.aggregate)
      setBySport(profileData.bySport || [])
      setAchievements(achievementData.achievements || [])
      setAchievementStats(achievementData.stats || null)
      setReputation(reputationData)
      setClutchRating(profileData.clutchRating || clutchRatingData?.clutchRating || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setLoading(true)
    fetchProfile()
  }, [userId, fetchProfile])

  return {
    user,
    profile,
    bySport,
    achievements,
    achievementStats,
    reputation,
    clutchRating,
    loading,
    error,
    refetch: fetchProfile,
  }
}

export default useManagerProfile
