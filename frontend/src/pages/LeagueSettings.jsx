import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useLeague } from '../hooks/useLeague'
import { useNotifications } from '../context/NotificationContext'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import FullLeagueSettings from '../components/league/settings/FullLeagueSettings'
import HeadToHeadSettings from '../components/league/settings/HeadToHeadSettings'
import RotoSettings from '../components/league/settings/RotoSettings'
import SurvivorSettings from '../components/league/settings/SurvivorSettings'
import OneAndDoneSettings from '../components/league/settings/OneAndDoneSettings'

const LeagueSettings = () => {
  const { leagueId } = useParams()
  const { league, loading, isCommissioner } = useLeague(leagueId)
  const { notify } = useNotifications()
  const [copied, setCopied] = useState(false)
  const { format, formatSettings } = useLeagueFormat(league)

  const [settings, setSettings] = useState({
    name: league?.name || '',
    scoringType: league?.settings?.scoringType || 'standard',
    rosterSize: league?.settings?.rosterSize || 6,
    tradeReview: 'commissioner',
    tradeDeadline: league?.settings?.tradeDeadline || '',
    waiverType: 'rolling',
    waiverPriority: 'reverse-standings',
    formatSettings: league?.settings?.formatSettings || {},
  })

  const [activeTab, setActiveTab] = useState('general')

  // Update settings when league loads
  useEffect(() => {
    if (league) {
      setSettings(prev => ({
        ...prev,
        name: league.name,
        scoringType: league.settings?.scoringType || 'standard',
        rosterSize: league.settings?.rosterSize || 6,
        formatSettings: league.settings?.formatSettings || {},
      }))
    }
  }, [league])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">League not found</p>
          <Link to="/leagues" className="text-accent-green hover:underline">
            Back to Leagues
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    notify.success('Settings Saved', 'League settings have been updated')
  }

  const inviteCode = league?.inviteCode || league?.joinCode
  const inviteLink = inviteCode ? `${window.location.origin}/leagues/join?code=${inviteCode}` : ''

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      notify.success('Copied!', 'Invite code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      notify.success('Copied!', 'Invite link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareInvite = async () => {
    if (navigator.share && inviteLink) {
      try {
        await navigator.share({
          title: `Join ${league.name} on Clutch`,
          text: `Join my fantasy golf league "${league.name}"! Use code: ${inviteCode}`,
          url: inviteLink
        })
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        copyInviteLink()
      }
    } else {
      copyInviteLink()
    }
  }

  const handleFormatSettingsChange = (newFormatSettings) => {
    setSettings(prev => ({ ...prev, formatSettings: newFormatSettings }))
  }

  const renderFormatSettings = () => {
    switch (league?.format) {
      case 'full-league':
        return <FullLeagueSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      case 'head-to-head':
        return <HeadToHeadSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      case 'roto':
        return <RotoSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      case 'survivor':
        return <SurvivorSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      case 'one-and-done':
        return <OneAndDoneSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      default:
        return null
    }
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'format', label: format?.name || 'Format' },
    { id: 'scoring', label: 'Scoring' },
    { id: 'trades', label: 'Trades' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'members', label: 'Members' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>
        <h1 className="text-2xl font-bold text-white">League Settings</h1>
        <p className="text-text-secondary">Manage {league.name} settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-green text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                League Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Roster Size
              </label>
              <select
                value={settings.rosterSize}
                onChange={(e) => setSettings({ ...settings, rosterSize: parseInt(e.target.value) })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              >
                {[4, 5, 6, 7, 8, 10, 12].map(size => (
                  <option key={size} value={size}>{size} players</option>
                ))}
              </select>
            </div>

            {/* League Format Info */}
            {league?.format && (
              <div className="pt-4 border-t border-dark-border">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  League Format
                </label>
                <div className="p-3 bg-dark-tertiary rounded-lg border border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center text-accent-green">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">{format?.name}</p>
                      <p className="text-xs text-text-muted">{format?.description}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  League format cannot be changed after creation
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Format Settings */}
      {activeTab === 'format' && (
        <div className="space-y-6">
          {renderFormatSettings()}
          <Button onClick={handleSave}>Save Format Settings</Button>
        </div>
      )}

      {/* Scoring Settings */}
      {activeTab === 'scoring' && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Scoring Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Scoring Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="scoringType"
                    value="standard"
                    checked={settings.scoringType === 'standard'}
                    onChange={(e) => setSettings({ ...settings, scoringType: e.target.value })}
                    className="text-accent-green"
                  />
                  <div>
                    <p className="text-white font-medium">Standard</p>
                    <p className="text-text-muted text-xs">Points based on finish position</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="scoringType"
                    value="strokes-gained"
                    checked={settings.scoringType === 'strokes-gained'}
                    onChange={(e) => setSettings({ ...settings, scoringType: e.target.value })}
                    className="text-accent-green"
                  />
                  <div>
                    <p className="text-white font-medium">Strokes Gained</p>
                    <p className="text-text-muted text-xs">Advanced stats-based scoring</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Trade Settings */}
      {activeTab === 'trades' && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Trade Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Trade Review
              </label>
              <select
                value={settings.tradeReview}
                onChange={(e) => setSettings({ ...settings, tradeReview: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              >
                <option value="commissioner">Commissioner Review</option>
                <option value="league-vote">League Vote</option>
                <option value="none">No Review (Instant)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Trade Deadline
              </label>
              <input
                type="date"
                value={settings.tradeDeadline}
                onChange={(e) => setSettings({ ...settings, tradeDeadline: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Waiver Settings */}
      {activeTab === 'waivers' && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Waiver Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Waiver Type
              </label>
              <select
                value={settings.waiverType}
                onChange={(e) => setSettings({ ...settings, waiverType: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              >
                <option value="rolling">Rolling Waivers</option>
                <option value="faab">FAAB (Auction)</option>
                <option value="none">Free Agency (No Waivers)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Waiver Priority
              </label>
              <select
                value={settings.waiverPriority}
                onChange={(e) => setSettings({ ...settings, waiverPriority: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              >
                <option value="reverse-standings">Reverse Standings</option>
                <option value="rolling">Rolling (resets after claim)</option>
                <option value="weekly-reset">Weekly Reset</option>
              </select>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Invite Code Section */}
          <Card className="border-accent-green/30">
            <h3 className="text-lg font-semibold text-white mb-4">Invite Members</h3>

            {/* Invite Code Display */}
            <div className="bg-dark-primary rounded-lg p-4 mb-4">
              <p className="text-text-muted text-xs mb-2">LEAGUE INVITE CODE</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-mono tracking-[0.3em] text-accent-green font-bold">
                  {inviteCode || '------'}
                </span>
                <button
                  onClick={copyInviteCode}
                  className="p-2 bg-dark-tertiary hover:bg-dark-border rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="flex gap-3">
              <Button onClick={copyInviteLink} variant="secondary" className="flex-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Copy Link
              </Button>
              <Button onClick={shareInvite} className="flex-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </Button>
            </div>

            <p className="text-text-muted text-xs mt-3">
              Share this code with friends to invite them to your league. They can enter it at the Join League page.
            </p>
          </Card>

          {/* Members List */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">League Members</h3>
              <span className="text-text-muted text-sm">
                {league?.members?.length || 0} / {league?.maxTeams || 10}
              </span>
            </div>
            <div className="space-y-2">
              {(league?.members || []).map((member) => {
                const isOwner = member.role === 'OWNER'
                return (
                  <div
                    key={member.userId || member.user?.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isOwner ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-dark-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-primary flex items-center justify-center text-sm font-semibold text-text-secondary">
                        {member.user?.avatar || member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className={`font-medium ${isOwner ? 'text-accent-green' : 'text-white'}`}>
                          {member.user?.name || 'Unknown'}
                        </p>
                        <p className="text-text-muted text-xs flex items-center gap-1">
                          {isOwner ? (
                            <>
                              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Commissioner
                            </>
                          ) : 'Member'}
                        </p>
                      </div>
                    </div>
                    {isCommissioner && !isOwner && (
                      <button className="text-text-muted hover:text-red-400 transition-colors text-sm">
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Empty state if no members loaded yet */}
            {(!league?.members || league.members.length === 0) && (
              <div className="text-center py-8 text-text-muted">
                <p>No members data available</p>
              </div>
            )}
          </Card>

          {/* Commissioner Note */}
          {!isCommissioner && (
            <Card className="bg-dark-tertiary/50 border-dark-border">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-text-secondary text-sm">
                    Only the league commissioner can invite or remove members.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default LeagueSettings
