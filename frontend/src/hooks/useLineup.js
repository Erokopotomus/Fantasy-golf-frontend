import { useState, useCallback } from 'react'
import api from '../services/api'
import { useNotifications } from '../context/NotificationContext'

export const useLineup = (teamId) => {
  const { notify } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const saveLineup = useCallback(async (activePlayerIds) => {
    if (!teamId) return

    try {
      setLoading(true)
      setError(null)
      setSaved(false)
      const result = await api.saveLineup(teamId, activePlayerIds)
      setSaved(true)
      notify.success('Lineup Saved', `${activePlayerIds.length} active players set`)
      return result
    } catch (err) {
      setError(err.message)
      notify.error('Save Failed', err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, notify])

  const clearSaved = useCallback(() => {
    setSaved(false)
  }, [])

  return { saveLineup, loading, error, saved, clearSaved }
}

export default useLineup
