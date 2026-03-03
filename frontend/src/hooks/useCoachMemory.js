import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useCoachMemory() {
  const [identity, setIdentity] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getCoachDocument('identity'),
      api.getCoachInteractions(20),
    ])
      .then(([identityRes, interactionsRes]) => {
        setIdentity(identityRes.document?.content || {
          coachingTone: 'encouraging',
          coachingFrequency: 'daily',
          riskAppetite: 'balanced',
          draftPhilosophy: ['best_available'],
          favoriteTeams: [],
          statedBiases: [],
          userNotes: [],
        })
        setInteractions(interactionsRes.interactions || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const updateIdentity = useCallback(async (updates) => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.updateCoachIdentity(updates)
      setIdentity(res.document.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const addNote = useCallback(async (text) => {
    setError(null)
    try {
      const res = await api.addCoachNote(text)
      setIdentity(prev => ({ ...prev, userNotes: res.document.content.userNotes }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const deleteNote = useCallback(async (index) => {
    setError(null)
    try {
      const res = await api.deleteCoachNote(index)
      setIdentity(prev => ({ ...prev, userNotes: res.document.content.userNotes }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const reactToInteraction = useCallback(async (id, reaction) => {
    try {
      await api.reactToCoachInteraction(id, reaction)
      setInteractions(prev =>
        prev.map(i => i.id === id ? { ...i, userReaction: reaction } : i)
      )
    } catch (err) {
      setError(err.message)
    }
  }, [])

  return {
    identity, interactions, loading, saving, error,
    updateIdentity, addNote, deleteNote, reactToInteraction,
  }
}
