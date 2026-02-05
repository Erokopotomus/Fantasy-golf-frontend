import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useLeagues } from '../hooks/useLeagues'
import { useNotifications } from '../context/NotificationContext'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import FullLeagueSettings from '../components/league/settings/FullLeagueSettings'
import HeadToHeadSettings from '../components/league/settings/HeadToHeadSettings'
import RotoSettings from '../components/league/settings/RotoSettings'
import SurvivorSettings from '../components/league/settings/SurvivorSettings'
import OneAndDoneSettings from '../components/league/settings/OneAndDoneSettings'

const LeagueSettings = () => {
  const { leagueId } = useParams()
  const { leagues, loading } = useLeagues()
  const { notify } = useNotifications()

  const league = leagues?.find(l => l.id === leagueId)
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
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">League Members</h3>
          <div className="space-y-2">
            {(league.standings || []).map((member, index) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 bg-dark-tertiary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-primary flex items-center justify-center text-sm font-semibold text-text-secondary">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-text-muted text-xs">
                      {index === 0 ? 'Commissioner' : 'Member'}
                    </p>
                  </div>
                </div>
                {index !== 0 && (
                  <button className="text-text-muted hover:text-red-400 transition-colors text-sm">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-dark-border">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Invite New Members</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter email address"
                className="flex-1 p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
              />
              <Button>Invite</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default LeagueSettings
