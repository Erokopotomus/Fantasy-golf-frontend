import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import ImageUpload from '../components/common/ImageUpload'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import api from '../services/api'

// Preset avatar options - golf themed emojis
const PRESET_AVATARS = [
  '⛳', '🏌️', '🏆', '🦅', '🐦', '🐤',
  '🔥', '💪', '🎯', '⭐', '🌟', '💎',
  '🦁', '🐯', '🦈', '🐺', '🦊', '🐻',
  '🎱', '🏅', '👑', '🎪', '🚀', '⚡',
]

const TeamSettings = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)
  const { notify } = useNotifications()

  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')
  const [useCustomAvatar, setUseCustomAvatar] = useState(false)

  // Find user's team in the league
  useEffect(() => {
    if (league?.teams) {
      const userTeam = league.teams.find(t => t.userId === user?.id)
      if (userTeam) {
        setTeam(userTeam)
        setTeamName(userTeam.name || '')
        setSelectedAvatar(userTeam.avatar || '⛳')
        setCustomAvatarUrl(userTeam.avatarUrl || '')
        setUseCustomAvatar(!!userTeam.avatarUrl)
      }
      setLoading(false)
    }
  }, [league, user])

  const handleSave = async () => {
    if (!team) return

    setSaving(true)
    try {
      const updateData = {
        name: teamName,
        avatar: useCustomAvatar ? null : selectedAvatar,
        avatarUrl: useCustomAvatar ? customAvatarUrl : null,
      }

      await api.updateTeam(team.id, updateData)
      notify.success('Team Updated', 'Your team settings have been saved')
    } catch (error) {
      notify.error('Error', error.message || 'Failed to update team')
    } finally {
      setSaving(false)
    }
  }

  const getDisplayAvatar = () => {
    if (useCustomAvatar && customAvatarUrl) {
      return (
        <img
          src={customAvatarUrl}
          alt="Team avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }}
        />
      )
    }
    return selectedAvatar || '⛳'
  }

  if (loading || leagueLoading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading team settings...</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold font-display text-white mb-2">Team Not Found</h2>
              <p className="text-text-secondary mb-6">You don't have a team in this league.</p>
              <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">
                Back to League
              </Link>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to={`/leagues/${leagueId}/roster`}
              className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Roster
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">Team Settings</h1>
            <p className="text-text-secondary">Customize your team in {league?.name}</p>
          </div>

          {/* Team Preview */}
          <Card className="mb-6 bg-gradient-to-br from-gold/10 to-dark-secondary border-gold/30">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-dark-primary rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                {useCustomAvatar && customAvatarUrl ? (
                  <>
                    <img
                      src={customAvatarUrl}
                      alt="Team avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </>
                ) : (
                  selectedAvatar || '⛳'
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold font-display text-white">{teamName || 'Your Team'}</h2>
                <p className="text-text-muted text-sm">{league?.name}</p>
              </div>
            </div>
          </Card>

          {/* Team Name */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold font-display text-white mb-4">Team Name</h3>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              maxLength={30}
            />
            <p className="text-text-muted text-xs mt-2">{teamName.length}/30 characters</p>
          </Card>

          {/* Avatar Selection */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold font-display text-white mb-4">Team Avatar</h3>

            {/* Toggle between preset and custom */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUseCustomAvatar(false)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  !useCustomAvatar
                    ? 'bg-gold/20 border-gold text-white'
                    : 'bg-dark-tertiary border-dark-border text-text-secondary hover:border-dark-border/80'
                }`}
              >
                Preset Icons
              </button>
              <button
                onClick={() => setUseCustomAvatar(true)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  useCustomAvatar
                    ? 'bg-gold/20 border-gold text-white'
                    : 'bg-dark-tertiary border-dark-border text-text-secondary hover:border-dark-border/80'
                }`}
              >
                Custom Image
              </button>
            </div>

            {!useCustomAvatar ? (
              /* Preset Avatar Grid */
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`w-full aspect-square rounded-lg text-2xl flex items-center justify-center transition-all ${
                      selectedAvatar === avatar
                        ? 'bg-gold/20 border-2 border-gold scale-110'
                        : 'bg-dark-tertiary border border-dark-border hover:border-gold/50'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            ) : (
              /* Custom Image Upload */
              <div className="space-y-4">
                <ImageUpload
                  currentImage={customAvatarUrl}
                  onUpload={(url) => setCustomAvatarUrl(url)}
                  size={200}
                />
                <p className="text-text-muted text-xs text-center">
                  Your image will be automatically resized and cropped to a square.
                </p>
              </div>
            )}
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            loading={saving}
            fullWidth
            size="lg"
          >
            Save Team Settings
          </Button>
        </div>
      </main>
    </div>
  )
}

export default TeamSettings
