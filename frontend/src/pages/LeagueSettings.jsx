import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { useLeague } from '../hooks/useLeague'
import { useNotifications } from '../context/NotificationContext'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import { track, Events } from '../services/analytics'
import api from '../services/api'
import FullLeagueSettings from '../components/league/settings/FullLeagueSettings'
import HeadToHeadSettings from '../components/league/settings/HeadToHeadSettings'
import RotoSettings from '../components/league/settings/RotoSettings'
import SurvivorSettings from '../components/league/settings/SurvivorSettings'
import OneAndDoneSettings from '../components/league/settings/OneAndDoneSettings'
import ScoringSettings from '../components/league/settings/ScoringSettings'
import NflScoringSettings from '../components/league/settings/NflScoringSettings'
import ScheduleManager from '../components/league/settings/ScheduleManager'

const LeagueSettings = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { league, loading, isCommissioner, refetch } = useLeague(leagueId)
  const { notify } = useNotifications()
  const [copied, setCopied] = useState(false)
  const { format, formatSettings } = useLeagueFormat(league)

  // Format change state
  const [newFormat, setNewFormat] = useState('')
  const [showFormatConfirm, setShowFormatConfirm] = useState(false)
  const [formatChanging, setFormatChanging] = useState(false)

  // Delete league state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    name: league?.name || '',
    scoringType: league?.settings?.scoringType || 'standard',
    rosterSize: league?.settings?.rosterSize || 6,
    irSlots: league?.settings?.irSlots || 0,
    rosterLockDeadline: league?.settings?.rosterLockDeadline || 'tournament-start',
    maxRosterMoves: league?.settings?.maxRosterMoves || 'unlimited',
    tradeReview: 'commissioner',
    tradeDeadline: league?.settings?.tradeDeadline || false,
    tradeDeadlineDate: league?.settings?.tradeDeadlineDate || '',
    waiverType: 'rolling',
    waiverPriority: 'reverse-standings',
    waiverClearDay: 'wednesday',
    waiverClearTime: '12:00',
    faabBudget: 100,
    waiverPeriodHours: 24,
    playoffTeams: league?.settings?.playoffTeams || 4,
    playoffWeeks: league?.settings?.playoffWeeks || 3,
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
        irSlots: league.settings?.irSlots || 0,
        rosterLockDeadline: league.settings?.rosterLockDeadline || 'tournament-start',
        maxRosterMoves: league.settings?.maxRosterMoves || 'unlimited',
        tradeDeadline: league.settings?.tradeDeadline || false,
        tradeDeadlineDate: league.settings?.tradeDeadlineDate || '',
        waiverType: league.settings?.waiverType || 'rolling',
        waiverPriority: league.settings?.waiverPriority || 'reverse-standings',
        waiverClearDay: league.settings?.waiverClearDay || 'wednesday',
        waiverClearTime: league.settings?.waiverClearTime || '12:00',
        faabBudget: league.settings?.faabBudget || 100,
        waiverPeriodHours: league.settings?.waiverPeriodHours || 24,
        playoffTeams: league.settings?.playoffTeams || 4,
        playoffWeeks: league.settings?.playoffWeeks || 3,
        formatSettings: league.settings?.formatSettings || {},
      }))
    }
  }, [league])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
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
          <Link to="/leagues" className="text-gold hover:underline">
            Back to Leagues
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    if (!isCommissioner) {
      notify.error('Error', 'Only the commissioner can update settings')
      return
    }

    setSaving(true)
    try {
      await api.updateLeague(leagueId, {
        name: settings.name,
        settings: {
          scoringType: settings.scoringType,
          rosterSize: settings.rosterSize,
          irSlots: settings.irSlots,
          rosterLockDeadline: settings.rosterLockDeadline,
          maxRosterMoves: settings.maxRosterMoves,
          tradeReview: settings.tradeReview,
          tradeDeadline: settings.tradeDeadline,
          tradeDeadlineDate: settings.tradeDeadlineDate,
          waiverType: settings.waiverType,
          waiverPriority: settings.waiverPriority,
          waiverClearDay: settings.waiverClearDay,
          waiverClearTime: settings.waiverClearTime,
          faabBudget: settings.faabBudget,
          waiverPeriodHours: settings.waiverPeriodHours,
          playoffTeams: settings.playoffTeams,
          playoffWeeks: settings.playoffWeeks,
          formatSettings: settings.formatSettings,
        }
      })
      track(Events.LEAGUE_SETTINGS_UPDATED, { leagueId })
      notify.success('Settings Saved', 'League settings have been updated')
      refetch() // Refresh league data
    } catch (error) {
      notify.error('Error', error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const inviteCode = league?.inviteCode || league?.joinCode
  const inviteLink = inviteCode ? `${window.location.origin}/leagues/join?code=${inviteCode}` : ''

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      track(Events.INVITE_LINK_COPIED, { leagueId, method: 'code' })
      setCopied(true)
      notify.success('Copied!', 'Invite code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      track(Events.INVITE_LINK_COPIED, { leagueId, method: 'link' })
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
        return <SurvivorSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} leagueSettings={settings} />
      case 'one-and-done':
        return <OneAndDoneSettings settings={settings.formatSettings} onChange={handleFormatSettingsChange} />
      default:
        return null
    }
  }

  // Check if format can be safely changed (before draft or no games played)
  const canChangeFormat = league?.status === 'draft-pending' ||
    league?.status === 'DRAFT_PENDING' ||
    league?.status === 'setup'

  const handleFormatChange = async () => {
    if (!newFormat || newFormat === league?.format) return

    setFormatChanging(true)
    try {
      await api.updateLeague(leagueId, { format: newFormat })
      notify.success('Format Changed', `League format updated to ${LEAGUE_FORMATS[newFormat]?.name || newFormat}`)
      setShowFormatConfirm(false)
      setNewFormat('')
      refetch()
    } catch (error) {
      notify.error('Error', error.message || 'Failed to change format')
    } finally {
      setFormatChanging(false)
    }
  }

  const handleDeleteLeague = async () => {
    setDeleting(true)
    try {
      await api.deleteLeague(leagueId)
      track(Events.LEAGUE_DELETED, { leagueId, leagueName: league.name })
      notify.success('League Deleted', `${league.name} has been permanently deleted`)
      navigate('/leagues')
    } catch (error) {
      notify.error('Error', error.message || 'Failed to delete league')
      setDeleting(false)
    }
  }

  const resetDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    setDeleteStep(1)
    setDeleteConfirmText('')
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'format', label: format?.name || 'Format' },
    { id: 'scoring', label: 'Scoring' },
    { id: 'trades', label: 'Trades' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'members', label: 'Members' },
    ...(isCommissioner ? [{ id: 'schedule', label: 'Schedule' }] : []),
    ...(isCommissioner ? [{ id: 'danger', label: 'Danger Zone' }] : []),
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
        <h1 className="text-2xl font-bold font-display text-white">League Settings</h1>
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
                ? 'bg-gold text-white'
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
          <h3 className="text-lg font-semibold font-display text-white mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                League Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Roster Size
              </label>
              <select
                value={settings.rosterSize}
                onChange={(e) => setSettings({ ...settings, rosterSize: parseInt(e.target.value) })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              >
                {[4, 5, 6, 7, 8, 10, 12].map(size => (
                  <option key={size} value={size}>{size} players</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                IR Slots
              </label>
              <select
                value={settings.irSlots}
                onChange={(e) => setSettings({ ...settings, irSlots: parseInt(e.target.value) })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              >
                {[0, 1, 2, 3, 4].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'None' : `${n} IR slot${n > 1 ? 's' : ''}`}</option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-2">
                Injured reserve slots let teams hold injured players without using bench spots
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Roster Lock Deadline
              </label>
              <select
                value={settings.rosterLockDeadline}
                onChange={(e) => setSettings({ ...settings, rosterLockDeadline: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              >
                <option value="tournament-start">Tournament Start (Thursday)</option>
                <option value="first-tee">First Tee Time</option>
                <option value="individual-tee">Individual Player Tee Times</option>
              </select>
              <p className="text-xs text-text-muted mt-2">
                When rosters lock for each tournament week
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Roster Moves
              </label>
              <select
                value={settings.maxRosterMoves}
                onChange={(e) => setSettings({ ...settings, maxRosterMoves: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              >
                <option value="unlimited">Unlimited</option>
                <option value="3-week">3 per week</option>
                <option value="5-week">5 per week</option>
                <option value="10-season">10 per season</option>
                <option value="20-season">20 per season</option>
                <option value="30-season">30 per season</option>
              </select>
              <p className="text-xs text-text-muted mt-2">
                Limit how many add/drop transactions teams can make
              </p>
            </div>

            {/* Playoff Settings (H2H leagues) */}
            {(league?.format === 'HEAD_TO_HEAD' || league?.format === 'head-to-head') && (
              <div className="pt-4 border-t border-dark-border">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Playoff Settings
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      Playoff Teams
                    </label>
                    <select
                      value={settings.playoffTeams}
                      onChange={(e) => setSettings({ ...settings, playoffTeams: parseInt(e.target.value) })}
                      className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                    >
                      {[2, 4, 6, 8].map(n => (
                        <option key={n} value={n}>{n} teams</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      Playoff Weeks
                    </label>
                    <select
                      value={settings.playoffWeeks}
                      onChange={(e) => setSettings({ ...settings, playoffWeeks: parseInt(e.target.value) })}
                      className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                    >
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Top teams qualify for playoffs after regular season. Bracket generated by commissioner.
                </p>
              </div>
            )}

            {/* League Format Info */}
            {league?.format && (
              <div className="pt-4 border-t border-dark-border">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  League Format
                </label>
                <div className="p-3 bg-dark-tertiary rounded-lg border border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
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
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Format Settings */}
      {activeTab === 'format' && (
        <div className="space-y-6">
          {renderFormatSettings()}
          <Button onClick={handleSave} loading={saving}>Save Format Settings</Button>
        </div>
      )}

      {/* Scoring Settings */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {league?.sport?.toLowerCase() === 'nfl' ? (
            <NflScoringSettings
              leagueId={leagueId}
              onSaved={() => {
                notify.success('Scoring Saved', 'NFL scoring settings have been updated')
                refetch()
              }}
            />
          ) : (
            <>
              <ScoringSettings
                settings={settings}
                onChange={(scoringUpdates) => setSettings({ ...settings, ...scoringUpdates })}
              />
              <Button onClick={handleSave} loading={saving}>Save Scoring Settings</Button>
            </>
          )}
        </div>
      )}

      {/* Trade Settings */}
      {activeTab === 'trades' && (
        <Card>
          <h3 className="text-lg font-semibold font-display text-white mb-4">Trade Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Trade Review
              </label>
              <select
                value={settings.tradeReview}
                onChange={(e) => setSettings({ ...settings, tradeReview: e.target.value })}
                className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
              >
                <option value="commissioner">Commissioner Review</option>
                <option value="league-vote">League Vote</option>
                <option value="none">No Review (Instant)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg">
                <div>
                  <p className="text-white font-medium">Trade Deadline</p>
                  <p className="text-xs text-text-muted">Set a date after which trades are no longer allowed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tradeDeadline: !settings.tradeDeadline })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.tradeDeadline ? 'bg-gold' : 'bg-dark-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.tradeDeadline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.tradeDeadline && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    value={settings.tradeDeadlineDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSettings({ ...settings, tradeDeadlineDate: e.target.value })}
                    className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                  <p className="text-xs text-text-muted mt-2">
                    No trades will be allowed after this date
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Waiver Settings */}
      {activeTab === 'waivers' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold font-display text-white mb-4">Waiver System</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Waiver Type
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    settings.waiverType === 'rolling' ? 'bg-gold/10 border-gold/50' : 'bg-dark-tertiary border-dark-border hover:border-dark-border/80'
                  }`}>
                    <input
                      type="radio"
                      name="waiverType"
                      value="rolling"
                      checked={settings.waiverType === 'rolling'}
                      onChange={(e) => setSettings({ ...settings, waiverType: e.target.value })}
                      className="mt-1 text-gold"
                    />
                    <div>
                      <p className="text-white font-medium">Rolling Waivers</p>
                      <p className="text-text-muted text-xs">Claims process in priority order. Priority shifts after successful claims.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    settings.waiverType === 'faab' ? 'bg-gold/10 border-gold/50' : 'bg-dark-tertiary border-dark-border hover:border-dark-border/80'
                  }`}>
                    <input
                      type="radio"
                      name="waiverType"
                      value="faab"
                      checked={settings.waiverType === 'faab'}
                      onChange={(e) => setSettings({ ...settings, waiverType: e.target.value })}
                      className="mt-1 text-gold"
                    />
                    <div>
                      <p className="text-white font-medium">FAAB (Free Agent Auction Budget)</p>
                      <p className="text-text-muted text-xs">Blind auction bidding. Highest bid wins the player.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    settings.waiverType === 'none' ? 'bg-gold/10 border-gold/50' : 'bg-dark-tertiary border-dark-border hover:border-dark-border/80'
                  }`}>
                    <input
                      type="radio"
                      name="waiverType"
                      value="none"
                      checked={settings.waiverType === 'none'}
                      onChange={(e) => setSettings({ ...settings, waiverType: e.target.value })}
                      className="mt-1 text-gold"
                    />
                    <div>
                      <p className="text-white font-medium">Free Agency (No Waivers)</p>
                      <p className="text-text-muted text-xs">First come, first served. Players can be added instantly.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Waiver Priority - only show for rolling waivers */}
              {settings.waiverType === 'rolling' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Waiver Priority
                  </label>
                  <select
                    value={settings.waiverPriority}
                    onChange={(e) => setSettings({ ...settings, waiverPriority: e.target.value })}
                    className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                  >
                    <option value="reverse-standings">Reverse Standings (worst team picks first)</option>
                    <option value="rolling">Rolling (resets to last after successful claim)</option>
                    <option value="weekly-reset">Weekly Reset (resets to reverse standings each week)</option>
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* FAAB Budget - only show for FAAB */}
          {settings.waiverType === 'faab' && (
            <Card>
              <h3 className="text-lg font-semibold font-display text-white mb-4">FAAB Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Season Budget per Team
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">$</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.faabBudget}
                      onChange={(e) => setSettings({ ...settings, faabBudget: parseInt(e.target.value) || 100 })}
                      className="w-32 p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                    />
                  </div>
                  <p className="text-text-muted text-xs mt-2">
                    Each team gets this budget to spend on waiver claims for the entire season.
                  </p>
                </div>

                <div className="bg-dark-tertiary rounded-lg p-4">
                  <p className="text-text-secondary text-sm">
                    <span className="text-gold font-medium">How FAAB works:</span> Teams submit blind bids on players.
                    When waivers process, highest bid wins. Tied bids go to the team with worse standings.
                    $0 bids are allowed. Budget doesn't reset.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Waiver Clear Schedule */}
          {settings.waiverType !== 'none' && (
            <Card>
              <h3 className="text-lg font-semibold font-display text-white mb-4">Waiver Processing Schedule</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Waivers Clear On
                    </label>
                    <select
                      value={settings.waiverClearDay}
                      onChange={(e) => setSettings({ ...settings, waiverClearDay: e.target.value })}
                      className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Clear Time
                    </label>
                    <select
                      value={settings.waiverClearTime}
                      onChange={(e) => setSettings({ ...settings, waiverClearTime: e.target.value })}
                      className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                    >
                      <option value="00:00">12:00 AM (Midnight)</option>
                      <option value="03:00">3:00 AM</option>
                      <option value="06:00">6:00 AM</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="12:00">12:00 PM (Noon)</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="18:00">6:00 PM</option>
                      <option value="21:00">9:00 PM</option>
                    </select>
                  </div>
                </div>
                <p className="text-text-muted text-xs">
                  All times are in Eastern Time (ET). Waiver claims submitted before this time will be processed.
                </p>
              </div>
            </Card>
          )}

          {/* Dropped Player Waiver Period */}
          <Card>
            <h3 className="text-lg font-semibold font-display text-white mb-4">Dropped Player Rules</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Waiver Period After Drop
                </label>
                <select
                  value={settings.waiverPeriodHours}
                  onChange={(e) => setSettings({ ...settings, waiverPeriodHours: parseInt(e.target.value) })}
                  className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                >
                  <option value="0">No waiver period (immediate free agent)</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                  <option value="168">1 week</option>
                  <option value="-1">Until next waiver clear</option>
                </select>
                <p className="text-text-muted text-xs mt-2">
                  How long a dropped player must go through waivers before becoming a free agent.
                </p>
              </div>

              {settings.waiverType === 'none' && settings.waiverPeriodHours > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    Note: With "No Waivers" selected, dropped players will still have a {settings.waiverPeriodHours}-hour
                    waiting period before they can be picked up.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Button onClick={handleSave} loading={saving}>Save Waiver Settings</Button>
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Invite Code Section */}
          <Card className="border-gold/30">
            <h3 className="text-lg font-semibold font-display text-white mb-4">Invite Members</h3>

            {/* Invite Code Display */}
            <div className="bg-dark-primary rounded-lg p-4 mb-4">
              <p className="text-text-muted text-xs mb-2">LEAGUE INVITE CODE</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-mono tracking-[0.3em] text-gold font-bold">
                  {inviteCode || '------'}
                </span>
                <button
                  onClick={copyInviteCode}
                  className="p-2 bg-dark-tertiary hover:bg-dark-border rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <h3 className="text-lg font-semibold font-display text-white">League Members</h3>
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
                      isOwner ? 'bg-gold/10 border border-gold/30' : 'bg-dark-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-primary flex items-center justify-center text-sm font-semibold text-text-secondary">
                        {member.user?.avatar || member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className={`font-medium ${isOwner ? 'text-gold' : 'text-white'}`}>
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

      {/* Schedule Management - Commissioner Only */}
      {activeTab === 'schedule' && isCommissioner && (
        <ScheduleManager leagueId={leagueId} notify={notify} />
      )}

      {/* Danger Zone - Commissioner Only */}
      {activeTab === 'danger' && isCommissioner && (
        <div className="space-y-6">
          {/* Change League Format */}
          <Card className="border-yellow-500/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold font-display text-white">Change League Format</h3>
                <p className="text-text-muted text-sm">
                  Switch between competition formats (Full League, Head-to-Head, Roto, etc.)
                </p>
              </div>
            </div>

            {!canChangeFormat && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">Format changes may affect standings</p>
                    <p className="text-text-muted text-xs mt-1">
                      Your league has already started. Changing formats mid-season may reset standings,
                      affect matchups, or cause other data inconsistencies. Proceed with caution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Current Format: <span className="text-gold">{format?.name || 'Unknown'}</span>
                </label>
                <select
                  value={newFormat || league?.format || ''}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
                >
                  <option value="">Select new format...</option>
                  <option value="full-league">Full League - Total points accumulation</option>
                  <option value="head-to-head">Head-to-Head - Weekly matchups with W/L record</option>
                  <option value="roto">Roto - Category-based rankings</option>
                  <option value="survivor">Survivor - Lowest score eliminated weekly</option>
                  <option value="one-and-done">One-and-Done - Pick one player per tournament</option>
                </select>
              </div>

              {newFormat && newFormat !== league?.format && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setNewFormat('')}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowFormatConfirm(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    Change Format
                  </Button>
                </div>
              )}
            </div>

            {/* Format Change Confirmation Modal */}
            {showFormatConfirm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full border-yellow-500/50">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold font-display text-white mb-2">Confirm Format Change</h3>
                    <p className="text-text-secondary">
                      Change from <span className="text-white font-medium">{format?.name}</span> to{' '}
                      <span className="text-gold font-medium">{LEAGUE_FORMATS[newFormat]?.name || newFormat}</span>?
                    </p>
                  </div>

                  {!canChangeFormat && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-red-400 text-sm text-center">
                        This may affect existing standings and data
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => setShowFormatConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      fullWidth
                      loading={formatChanging}
                      onClick={handleFormatChange}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      Yes, Change Format
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </Card>

          {/* Delete League */}
          <Card className="border-red-500/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold font-display text-red-400">Delete League</h3>
                <p className="text-text-muted text-sm">
                  Permanently delete this league and all associated data
                </p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm font-medium mb-2">This action cannot be undone!</p>
              <ul className="text-text-muted text-xs space-y-1">
                <li>• All league settings will be deleted</li>
                <li>• All team rosters will be deleted</li>
                <li>• All draft history will be deleted</li>
                <li>• All trade history will be deleted</li>
                <li>• All chat messages will be deleted</li>
                <li>• All members will be removed from the league</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="text-red-400 border-red-500/50 hover:bg-red-500/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete League...
            </Button>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full border-red-500/50">
                  {deleteStep === 1 && (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold font-display text-white mb-2">Delete "{league.name}"?</h3>
                        <p className="text-text-secondary">
                          This will permanently delete the league with{' '}
                          <span className="text-white font-medium">{league.members?.length || 0} members</span>.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" fullWidth onClick={resetDeleteConfirm}>
                          Cancel
                        </Button>
                        <Button
                          fullWidth
                          onClick={() => setDeleteStep(2)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Continue
                        </Button>
                      </div>
                    </>
                  )}

                  {deleteStep === 2 && (
                    <>
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold font-display text-white mb-2">Are you absolutely sure?</h3>
                        <p className="text-text-secondary mb-4">
                          Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm
                        </p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                          placeholder="Type DELETE"
                          className="text-center"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" fullWidth onClick={resetDeleteConfirm}>
                          Cancel
                        </Button>
                        <Button
                          fullWidth
                          disabled={deleteConfirmText !== 'DELETE'}
                          loading={deleting}
                          onClick={handleDeleteLeague}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

export default LeagueSettings
