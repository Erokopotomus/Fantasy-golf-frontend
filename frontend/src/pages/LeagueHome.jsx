import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import { useAuth } from '../context/AuthContext'
import useActivity from '../hooks/useActivity'
import api from '../services/api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ChatPanel from '../components/chat/ChatPanel'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import DraftCountdown from '../components/DraftCountdown'

const LeagueHome = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const [creatingDraft, setCreatingDraft] = useState(false)
  const { activity, loading: activityLoading } = useActivity(leagueId, 10)
  const [detailedLeague, setDetailedLeague] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [currentTournament, setCurrentTournament] = useState(null)
  const [editingDraftDate, setEditingDraftDate] = useState(false)
  const [draftDateInput, setDraftDateInput] = useState('')
  const [savingDate, setSavingDate] = useState(false)
  const [generatingPlayoffs, setGeneratingPlayoffs] = useState(false)
  const [leagueLeaderboard, setLeagueLeaderboard] = useState([])

  const loading = leaguesLoading && detailLoading
  const league = detailedLeague || leagues?.find(l => l.id === leagueId)
  const { format, hasDraft, isHeadToHead, isRoto, isSurvivor, isOneAndDone } = useLeagueFormat(league)
  const leagueSport = (league?.sport || 'GOLF').toUpperCase()
  const isNflLeague = leagueSport === 'NFL'

  // Fetch detailed league data (with full members, teams, rosters)
  useEffect(() => {
    if (!leagueId) return
    setDetailLoading(true)
    api.getLeague(leagueId)
      .then(data => setDetailedLeague(data.league || data))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [leagueId])

  // Fetch current tournament for the widget (golf leagues only)
  useEffect(() => {
    if (isNflLeague) return
    api.getCurrentTournament()
      .then(data => setCurrentTournament(data.tournament || data))
      .catch(() => {})
  }, [isNflLeague])

  // Fetch league prediction leaderboard
  useEffect(() => {
    if (!leagueId) return
    api.getPredictionLeaderboard({ leagueId, timeframe: 'weekly', limit: 5 })
      .then(data => setLeagueLeaderboard(data.leaderboard || []))
      .catch(() => {})
  }, [leagueId])

  // Derive user position from standings data
  const userTeamStanding = league?.standings?.find(t => t.userId === user?.id)
  const userRank = userTeamStanding?.rank || '-'
  const userPoints = userTeamStanding?.totalPoints || 0
  const leaderStanding = league?.standings?.[0]
  const leaderPoints = leaderStanding?.totalPoints || 0
  const pointsDiff = leaderPoints - userPoints

  const isCommissioner = league?.ownerId === user?.id || league?.owner?.id === user?.id
  const latestDraft = league?.drafts?.[0]
  const draftStatus = latestDraft?.status
  const hasDraftRecord = !!latestDraft
  const teamsHavePlayers = league?.teams?.some(t => t.totalPoints > 0 || t.wins > 0)
  const isDraftScheduledOrInProgress = draftStatus === 'SCHEDULED' || draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED'
  const isDraftComplete = draftStatus === 'COMPLETED'

  const handleCreateDraft = async () => {
    try {
      setCreatingDraft(true)
      await api.createDraft(leagueId)
      navigate(`/leagues/${leagueId}/draft`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingDraft(false)
    }
  }

  const handleSaveDraftDate = async () => {
    if (!latestDraft?.id || !draftDateInput) return
    try {
      setSavingDate(true)
      await api.scheduleDraft(latestDraft.id, new Date(draftDateInput).toISOString())
      // Refresh league data
      const data = await api.getLeague(leagueId)
      setDetailedLeague(data.league || data)
      setEditingDraftDate(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingDate(false)
    }
  }

  const handleClearDraftDate = async () => {
    if (!latestDraft?.id) return
    try {
      setSavingDate(true)
      await api.scheduleDraft(latestDraft.id, null)
      const data = await api.getLeague(leagueId)
      setDetailedLeague(data.league || data)
      setEditingDraftDate(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingDate(false)
    }
  }

  const handleGeneratePlayoffs = async () => {
    if (!window.confirm('Generate the playoff bracket? This will seed teams based on current standings.')) return
    try {
      setGeneratingPlayoffs(true)
      await api.generatePlayoffs(leagueId)
      navigate(`/leagues/${leagueId}/matchups`)
    } catch (err) {
      alert(err.message)
    } finally {
      setGeneratingPlayoffs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading league...</p>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold font-display text-white mb-2">League Not Found</h2>
              <p className="text-text-secondary mb-6">This league doesn't exist or you don't have access.</p>
              <Link to="/leagues" className="text-gold hover:underline">
                Back to Leagues
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/leagues"
                className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Leagues
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">{league.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-text-secondary">{format?.name || 'League'}</span>
                {hasDraft && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary capitalize">{league.draftType} Draft</span>
                  </>
                )}
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary">{league.members?.length || league._count?.members || league.memberCount || 0} members</span>
                <span className="text-text-muted">•</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  league.status === 'active' ? 'bg-gold/20 text-gold' :
                  league.status === 'draft-pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-dark-tertiary text-text-muted'
                }`}>
                  {league.status === 'active' ? 'Active' :
                   league.status === 'draft-pending' ? 'Draft Pending' : league.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Standard buttons for leagues with rosters */}
              {!isOneAndDone && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/leagues/${leagueId}/roster`)}
                  >
                    My Roster
                  </Button>
                  {hasDraft && isDraftScheduledOrInProgress && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/leagues/${leagueId}/draft`)}
                    >
                      Draft Room
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/leagues/${leagueId}/waivers`)}
                  >
                    Waivers
                  </Button>
                </>
              )}

              {/* Format-specific buttons */}
              {isHeadToHead && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/matchups`)}
                >
                  Matchups
                </Button>
              )}
              {isRoto && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/categories`)}
                >
                  Categories
                </Button>
              )}
              {isSurvivor && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/survivor`)}
                >
                  Survivor Board
                </Button>
              )}
              {isOneAndDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/picks`)}
                >
                  Pick Center
                </Button>
              )}

              {/* Common buttons */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(isNflLeague ? `/nfl/players?league=${leagueId}` : `/players?league=${leagueId}`)}
              >
                Players
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/standings`)}
              >
                Standings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/scoring`)}
              >
                Scoring
              </Button>
              {!isOneAndDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/trades`)}
                >
                  Trades
                </Button>
              )}
              {league?.settings?.draftDollarSettings?.enabled && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/draft-dollars`)}
                >
                  Draft Dollars
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/settings`)}
              >
                Settings
              </Button>
            </div>
          </div>

          {/* Draft Status Banner */}
          {hasDraft && !isOneAndDone && (
            <div className="mb-6">
              {!hasDraftRecord && isCommissioner && !teamsHavePlayers && (
                <Card className="border-gold/30 bg-gradient-to-r from-gold/10 to-dark-secondary">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold font-display text-white">Ready to Draft?</h3>
                      <p className="text-text-secondary text-sm">Create a draft for this league to get started.</p>
                    </div>
                    <Button onClick={handleCreateDraft} disabled={creatingDraft}>
                      {creatingDraft ? 'Creating...' : 'Create Draft'}
                    </Button>
                  </div>
                </Card>
              )}
              {isDraftScheduledOrInProgress && (
                <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-dark-secondary">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold font-display text-white">
                        {draftStatus === 'SCHEDULED' ? 'Draft Scheduled' :
                         draftStatus === 'PAUSED' ? 'Draft Paused' : 'Draft In Progress'}
                      </h3>
                      {draftStatus === 'SCHEDULED' && latestDraft?.scheduledFor && !editingDraftDate && (
                        <div className="mt-3">
                          <DraftCountdown scheduledFor={latestDraft.scheduledFor} />
                          {isCommissioner && (
                            <button
                              onClick={() => {
                                setDraftDateInput(new Date(latestDraft.scheduledFor).toISOString().slice(0, 16))
                                setEditingDraftDate(true)
                              }}
                              className="text-xs text-text-muted hover:text-white mt-2 underline"
                            >
                              Change Date
                            </button>
                          )}
                        </div>
                      )}
                      {draftStatus === 'SCHEDULED' && !latestDraft?.scheduledFor && !editingDraftDate && (
                        <div className="mt-1">
                          {isCommissioner ? (
                            <button
                              onClick={() => setEditingDraftDate(true)}
                              className="text-sm text-gold hover:underline"
                            >
                              Set a draft date & time
                            </button>
                          ) : (
                            <p className="text-text-muted text-sm">No draft date set yet</p>
                          )}
                        </div>
                      )}
                      {draftStatus === 'SCHEDULED' && editingDraftDate && isCommissioner && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <input
                            type="datetime-local"
                            value={draftDateInput}
                            onChange={(e) => setDraftDateInput(e.target.value)}
                            className="bg-dark-primary border border-dark-border rounded-lg px-3 py-1.5 text-sm text-white"
                          />
                          <Button size="sm" onClick={handleSaveDraftDate} disabled={savingDate || !draftDateInput}>
                            {savingDate ? 'Saving...' : 'Save'}
                          </Button>
                          {latestDraft?.scheduledFor && (
                            <Button size="sm" variant="secondary" onClick={handleClearDraftDate} disabled={savingDate}>
                              Clear
                            </Button>
                          )}
                          <button
                            onClick={() => setEditingDraftDate(false)}
                            className="text-xs text-text-muted hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {draftStatus === 'PAUSED' && (
                        <p className="text-text-secondary text-sm">The commissioner has paused the draft.</p>
                      )}
                      {draftStatus === 'IN_PROGRESS' && (
                        <p className="text-text-secondary text-sm">The draft is live! Join the draft room now.</p>
                      )}
                    </div>
                    <Button onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
                      Enter Draft Room
                    </Button>
                  </div>
                </Card>
              )}
              {isDraftComplete && (
                <Card className="border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Draft Complete</h3>
                      <p className="text-text-muted text-sm">The draft has finished. Manage your roster below.</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Active Tournament Widget (golf leagues only) */}
          {!isNflLeague && currentTournament && currentTournament.status === 'IN_PROGRESS' && (
            <div className="mb-6">
              <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-dark-secondary">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{currentTournament.name}</h3>
                      <p className="text-text-muted text-xs">
                        {currentTournament.courseName && <span>{currentTournament.courseName} &middot; </span>}
                        Round {currentTournament.currentRound || '?'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/leagues/${leagueId}/scoring`)}>
                    View Scoring
                  </Button>
                </div>
              </Card>
            </div>
          )}
          {!isNflLeague && currentTournament && currentTournament.status === 'UPCOMING' && (
            <div className="mb-6">
              <Card className="border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-tertiary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">Next Event: {currentTournament.name}</h3>
                    <p className="text-text-muted text-xs">
                      Starts {new Date(currentTournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Generate Playoffs Banner (commissioner, H2H, draft complete) */}
          {isCommissioner && isHeadToHead && isDraftComplete && (
            <div className="mb-6">
              <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-dark-secondary">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Playoffs</h3>
                      <p className="text-text-muted text-sm">
                        Generate the playoff bracket based on current standings ({league.settings?.playoffTeams || 4} teams)
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGeneratePlayoffs}
                    disabled={generatingPlayoffs}
                  >
                    {generatingPlayoffs ? 'Generating...' : 'Generate Playoffs'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Standings & Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Your Position */}
              <Card className="bg-gradient-to-br from-gold/20 to-dark-secondary border-gold/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold font-display text-white">Your Position</h3>
                  <span className={`text-3xl font-bold ${
                    userRank === 1 ? 'text-yellow-400' :
                    userRank <= 3 ? 'text-gold' : 'text-white'
                  }`}>
                    #{userRank}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-primary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-display text-gold">{userPoints?.toLocaleString()}</p>
                    <p className="text-text-muted text-xs">Total Points</p>
                  </div>
                  <div className="bg-dark-primary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-display text-white">
                      {pointsDiff > 0 ? '-' : '+'}{Math.abs(pointsDiff).toLocaleString()}
                    </p>
                    <p className="text-text-muted text-xs">vs Leader</p>
                  </div>
                </div>
              </Card>

              {/* Standings */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold font-display text-white">Standings</h3>
                  <span className="text-text-muted text-sm">{league.standings?.length} teams</span>
                </div>
                <div className="space-y-2">
                  {league.standings?.slice(0, 8).map((team) => (
                    <div
                      key={team.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        team.userId === '1' ? 'bg-gold/10 border border-gold/30' : 'bg-dark-tertiary'
                      }`}
                    >
                      <span className={`text-lg font-bold w-6 ${
                        team.rank === 1 ? 'text-yellow-400' :
                        team.rank === 2 ? 'text-gray-300' :
                        team.rank === 3 ? 'text-amber-600' : 'text-text-muted'
                      }`}>
                        {team.rank}
                      </span>
                      <div className="w-8 h-8 bg-dark-primary rounded-full flex items-center justify-center text-sm font-semibold text-text-secondary">
                        {team.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${team.userId === '1' ? 'text-gold' : 'text-white'}`}>
                          {team.name}
                          {team.userId === '1' && <span className="text-xs ml-1">(You)</span>}
                        </p>
                      </div>
                      <span className="text-text-secondary font-medium">{team.points?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* League Info */}
              <Card>
                <h3 className="text-lg font-semibold font-display text-white mb-4">League Settings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Format</span>
                    <span className="text-gold">{format?.name || 'League'}</span>
                  </div>
                  {hasDraft && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Draft Type</span>
                      <span className="text-white capitalize">{league.draftType}</span>
                    </div>
                  )}
                  {!isOneAndDone && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Roster Size</span>
                      <span className="text-white">{league.settings?.rosterSize || 6} players</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-muted">Scoring</span>
                    <span className="text-white capitalize">{league.settings?.scoringType || 'Standard'}</span>
                  </div>
                  {league.settings?.budget && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Budget</span>
                      <span className="text-white">${league.settings.budget}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-muted">Current Event</span>
                    <span className="text-gold">{league.currentRound || 'TBD'}</span>
                  </div>
                </div>
              </Card>

              {/* League Vault link */}
              {league?.settings?.importedFrom && (
                <Link
                  to={`/leagues/${leagueId}/vault`}
                  className="block"
                >
                  <Card className="hover:border-accent-gold/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-display font-bold text-sm group-hover:text-accent-gold transition-colors">League Vault</p>
                        <p className="text-xs text-text-secondary">View your league's imported history</p>
                      </div>
                      <svg className="w-4 h-4 text-text-secondary group-hover:text-accent-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Card>
                </Link>
              )}

              {/* Season Recap link */}
              <Link
                to={`/leagues/${leagueId}/recap`}
                className="block"
              >
                <Card className="hover:border-accent-gold/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-display font-bold text-sm group-hover:text-accent-gold transition-colors">Season Recap</p>
                      <p className="text-xs text-text-secondary">Awards, records, and final standings</p>
                    </div>
                    <svg className="w-4 h-4 text-text-secondary group-hover:text-accent-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>

              {/* League Prediction Leaderboard */}
              {leagueLeaderboard.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-display font-bold text-white">Sharpest Predictors</h3>
                    <Link to="/prove-it" className="text-xs text-accent-gold hover:text-accent-gold/80 font-mono">View All</Link>
                  </div>
                  <div className="space-y-2">
                    {leagueLeaderboard.map((entry, i) => (
                      <div key={entry.userId || i} className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold w-5 ${i === 0 ? 'text-accent-gold' : 'text-text-secondary'}`}>
                          {i + 1}.
                        </span>
                        <Link
                          to={`/manager/${entry.userId}`}
                          className="flex-1 text-sm text-white hover:text-accent-gold transition-colors truncate font-display"
                        >
                          {entry.name || entry.userName || 'Unknown'}
                        </Link>
                        <span className="text-xs font-mono text-green-400">
                          {(entry.accuracyRate * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs font-mono text-text-secondary">
                          {entry.totalPredictions}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Activity Feed */}
              <Card>
                <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
                <ActivityFeed activity={activity} loading={activityLoading} />
              </Card>
            </div>

            {/* Right Column - Members & Chat */}
            <div className="lg:col-span-2 space-y-6">
              {/* League Members / Teams */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold font-display text-white">Teams</h3>
                  <span className="text-text-muted text-sm">
                    {league.teams?.length || league._count?.teams || 0} / {league.maxTeams || '–'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border text-xs text-text-muted">
                        <th className="pb-2 text-left w-10">#</th>
                        <th className="pb-2 text-left">Team</th>
                        <th className="pb-2 text-left">Owner</th>
                        <th className="pb-2 text-center">Players</th>
                        <th className="pb-2 text-center">W-L</th>
                        <th className="pb-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(league.standings || league.teams || []).map((team, i) => {
                        const rank = team.rank || i + 1
                        const isMe = team.userId === user?.id
                        const ownerName = team.user?.name || team.name
                        const rosterCount = team.roster?.length || 0
                        return (
                          <tr
                            key={team.id || i}
                            onClick={() => team.id && navigate(`/leagues/${leagueId}/roster`)}
                            className={`
                              border-b border-dark-border/30 transition-colors cursor-pointer
                              ${isMe ? 'bg-emerald-500/8' : 'hover:bg-dark-tertiary/50'}
                            `}
                          >
                            <td className={`py-3 font-bold ${
                              rank === 1 ? 'text-yellow-400' :
                              rank === 2 ? 'text-gray-300' :
                              rank === 3 ? 'text-amber-500' : 'text-text-muted'
                            }`}>
                              {rank}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-dark-tertiary rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary flex-shrink-0">
                                  {(team.name || ownerName || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-medium truncate ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                                  {team.name || 'Team ' + rank}
                                  {isMe && <span className="text-xs text-emerald-400/60 ml-1">(You)</span>}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-text-secondary truncate max-w-[120px]">
                              {ownerName}
                            </td>
                            <td className="py-3 text-center text-text-secondary">
                              {rosterCount || '–'}
                            </td>
                            <td className="py-3 text-center text-text-secondary">
                              {team.wins != null ? `${team.wins}-${team.losses || 0}` : '–'}
                            </td>
                            <td className="py-3 text-right font-semibold text-white">
                              {team.totalPoints?.toLocaleString() || '0'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {(!league.standings?.length && !league.teams?.length) && (
                    <div className="text-center py-8 text-text-muted text-sm">
                      No teams yet. Invite members to join!
                    </div>
                  )}
                </div>

                {/* League members without teams */}
                {league.members && league.members.length > (league.teams?.length || 0) && (
                  <div className="mt-4 pt-4 border-t border-dark-border">
                    <p className="text-xs text-text-muted mb-2">Members without teams</p>
                    <div className="flex flex-wrap gap-2">
                      {league.members
                        .filter(m => !league.teams?.some(t => t.userId === m.userId))
                        .map(m => (
                          <span key={m.userId} className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-secondary">
                            {m.user?.name || 'Member'}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </Card>

              {/* Chat - compact */}
              <ChatPanel
                leagueId={leagueId}
                leagueName={league.name}
                memberCount={league.memberCount || league._count?.members || league.members?.length}
                className="h-[400px]"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeagueHome
