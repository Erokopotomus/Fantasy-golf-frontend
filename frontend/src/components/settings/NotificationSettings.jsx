import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import webPush from '../../services/webPush'

const CATEGORY_LABELS = {
  trades: { label: 'Trades', description: 'Trade proposals, acceptances, and rejections' },
  waivers: { label: 'Waivers', description: 'Waiver claim results and processing' },
  drafts: { label: 'Drafts', description: 'Draft start, your turn alerts, and completion' },
  roster_moves: { label: 'Roster Moves', description: 'Player adds and drops by league members' },
  league_activity: { label: 'League Activity', description: 'New members joining and league updates' },
  scores: { label: 'Scores', description: 'Matchup results and tournament completions' },
  chat: { label: 'Chat', description: 'Chat mentions and direct messages' },
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pushStatus, setPushStatus] = useState('loading')
  const [pushTokenId, setPushTokenId] = useState(null)

  const fetchPrefs = useCallback(async () => {
    try {
      const data = await api.getNotificationPreferences()
      setPrefs(data.preferences)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrefs()
    // Check push status
    if (webPush.isSupported()) {
      const status = webPush.getPermissionStatus()
      setPushStatus(status)
      if (status === 'granted') {
        api.getPushTokens().then(data => {
          if (data.tokens?.length > 0) {
            setPushTokenId(data.tokens[0].id)
          }
        }).catch(() => {})
      }
    } else {
      setPushStatus('unsupported')
    }
  }, [fetchPrefs])

  const togglePref = async (key) => {
    if (!prefs) return
    const newValue = !prefs[key]
    setSaving(true)
    try {
      const data = await api.updateNotificationPreferences({ [key]: newValue })
      setPrefs(data.preferences)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePushToggle = async () => {
    if (pushStatus === 'granted' && pushTokenId) {
      // Disable push
      await webPush.unsubscribe(pushTokenId)
      setPushTokenId(null)
      setPushStatus('default')
      await api.updateNotificationPreferences({ push_enabled: false }).catch(() => {})
    } else {
      // Enable push
      const token = await webPush.subscribe()
      if (token) {
        setPushTokenId(token.id)
        setPushStatus('granted')
        await api.updateNotificationPreferences({ push_enabled: true }).catch(() => {})
      } else {
        setPushStatus(webPush.getPermissionStatus())
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary pt-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary pt-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold font-display text-white mb-6">Notification Settings</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Push Notifications */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold font-display text-white mb-4">Push Notifications</h2>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white font-medium">Desktop Push Notifications</p>
              <p className="text-gray-400 text-sm">
                {pushStatus === 'unsupported'
                  ? 'Your browser does not support push notifications'
                  : pushStatus === 'denied'
                    ? 'Notifications are blocked. Enable them in your browser settings.'
                    : 'Receive notifications even when the app is in the background'}
              </p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushStatus === 'unsupported' || pushStatus === 'denied'}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                pushStatus === 'granted' && pushTokenId
                  ? 'bg-primary'
                  : 'bg-gray-600'
              } ${(pushStatus === 'unsupported' || pushStatus === 'denied') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  pushStatus === 'granted' && pushTokenId ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-dark-border">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-gray-400 text-sm">Coming soon</p>
            </div>
            <button
              disabled
              className="relative w-12 h-6 rounded-full bg-gray-600 opacity-50 cursor-not-allowed"
            >
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full" />
            </button>
          </div>
        </div>

        {/* Category Toggles */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h2 className="text-lg font-semibold font-display text-white mb-4">Notification Categories</h2>
          <p className="text-gray-400 text-sm mb-4">
            Choose which types of notifications you want to receive.
          </p>

          <div className="space-y-1">
            {Object.entries(CATEGORY_LABELS).map(([key, { label, description }]) => (
              <div key={key} className="flex items-center justify-between py-3 border-t border-dark-border first:border-t-0">
                <div>
                  <p className="text-white font-medium">{label}</p>
                  <p className="text-gray-400 text-sm">{description}</p>
                </div>
                <button
                  onClick={() => togglePref(key)}
                  disabled={saving}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    prefs?.[key] ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      prefs?.[key] ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
