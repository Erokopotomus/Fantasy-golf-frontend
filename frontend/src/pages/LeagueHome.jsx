import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import { useAuth } from '../context/AuthContext'
import useActivity from '../hooks/useActivity'
import { useLeagueLiveScoring } from '../hooks/useLeagueLiveScoring'
import useMatchups from '../hooks/useMatchups'
import api from '../services/api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import NeuralCluster from '../components/common/NeuralCluster'
import ChatPanel from '../components/chat/ChatPanel'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import DraftCountdown from '../components/DraftCountdown'
import LeagueChat from '../components/ai/LeagueChat'
import CommissionerNotes from '../components/league/CommissionerNotes'
import LiveScoringWidget from '../components/league/LiveScoringWidget'
import TournamentHeader from '../components/tournament/TournamentHeader'
import PhaseActionRow from '../components/league/PhaseActionRow'
import { useLeaguePhase } from '../hooks/useLeaguePhase'
import { formatDate } from '../utils/dateUtils'
import { buildLabUrl } from '../utils/labBridge'

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
  const [showDraftScheduler, setShowDraftScheduler] = useState(false)
  const [cancellingDraft, setCancellingDraft] = useState(false)
  const [draftRoomOpen, setDraftRoomOpen] = useState(false)
  const [generatingPlayoffs, setGeneratingPlayoffs] = useState(false)
  const [leagueLeaderboard, setLeagueLeaderboard] = useState([])
  const [historicalTeams, setHistoricalTeams] = useState(null) // most recent season from import
  const [existingBoardId, setExistingBoardId] = useState(null)
  const [leagueBriefing, setLeagueBriefing] = useState(null)
  const [unclaimedOwners, setUnclaimedOwners] = useState(null) // unclaimed vault owners for banner

  const loading = leaguesLoading && detailLoading
  const league = detailedLeague || leagues?.find(l => l.id === leagueId)
  const { format, hasDraft, isHeadToHead, isRoto, isSurvivor, isOneAndDone } = useLeagueFormat(league)
  const leagueSport = (league?.sport || 'GOLF').toUpperCase()
  const isNflLeague = leagueSport === 'NFL'

  // Fetch matchup data for H2H NFL leagues (hero card)
  const { schedule: matchupSchedule, standings: matchupStandings } = useMatchups(
    isHeadToHead ? leagueId : null
  )

  // Fetch live tournament scoring for "This Week" column (golf leagues only)
  const isTournamentLive = !isNflLeague && currentTournament?.status === 'IN_PROGRESS'
  const { teams: liveTeams, isLive: isLiveScoring } = useLeagueLiveScoring(
    isTournamentLive ? leagueId : null
  )

  // Derive current matchup for the hero card
  const nflMatchupData = useMemo(() => {
    if (!isHeadToHead || !matchupSchedule || matchupSchedule.length === 0) return null

    // Active week (in progress) or last completed or next upcoming
    const active = matchupSchedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const hasIncomplete = w.matchups.some(m => !m.completed)
      return hasScores && hasIncomplete
    })
    const completed = matchupSchedule.filter(w => w.matchups.every(m => m.completed))
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null
    const upcoming = matchupSchedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const allComplete = w.matchups.every(m => m.completed)
      return !hasScores && !allComplete
    })

    const heroWeek = active || lastCompleted || upcoming
    if (!heroWeek) return null

    const userMatchup = heroWeek.matchups.find(m => m.home === user?.id || m.away === user?.id)
    if (!userMatchup) return null

    const isHome = userMatchup.home === user?.id
    const opponentId = isHome ? userMatchup.away : userMatchup.home
    const teamLookup = matchupStandings.reduce((acc, t) => { acc[t.userId] = t; return acc }, {})

    const isLive = !!active && heroWeek === active
    const isComplete = heroWeek.matchups.every(m => m.completed)

    return {
      week: heroWeek.week,
      userScore: isHome ? userMatchup.homeScore : userMatchup.awayScore,
      opponentScore: isHome ? userMatchup.awayScore : userMatchup.homeScore,
      userTeam: teamLookup[user?.id],
      opponentTeam: teamLookup[opponentId],
      isLive,
      isComplete,
      userWon: isComplete && ((isHome ? userMatchup.homeScore : userMatchup.awayScore) > (isHome ? userMatchup.awayScore : userMatchup.homeScore)),
      // Previous completed week (for "last week" result)
      lastResult: lastCompleted && lastCompleted !== heroWeek ? (() => {
        const lm = lastCompleted.matchups.find(m => m.home === user?.id || m.away === user?.id)
        if (!lm) return null
        const lHome = lm.home === user?.id
        return {
          week: lastCompleted.week,
          userScore: lHome ? lm.homeScore : lm.awayScore,
          opponentScore: lHome ? lm.awayScore : lm.homeScore,
          won: (lHome ? lm.homeScore : lm.awayScore) > (lHome ? lm.awayScore : lm.homeScore),
        }
      })() : null,
    }
  }, [isHeadToHead, matchupSchedule, matchupStandings, user?.id])

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
  const [tournamentField, setTournamentField] = useState([])
  useEffect(() => {
    if (isNflLeague) return
    api.getCurrentTournament()
      .then(data => {
        const t = data.tournament || data
        setCurrentTournament(t)
        // Fetch leaderboard/field for Field Strength in header
        if (t?.id) {
          api.getTournamentLeaderboard(t.id)
            .then(lbData => {
              // Flatten nested player data so TournamentHeader can access owgrRank at top level
              const flat = (lbData?.leaderboard || []).map(entry => {
                const p = entry.player || {}
                return { ...entry, id: p.id, name: p.name, owgrRank: p.owgrRank, countryFlag: p.countryFlag }
              })
              setTournamentField(flat)
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [isNflLeague])


  // Fetch user's draft boards to find existing one for this league (prefer leagueId match, fall back to sport)
  useEffect(() => {
    if (!league) return
    const sport = (league.sport || 'golf').toLowerCase()
    api.getDraftBoards()
      .then(data => {
        const boards = data.boards || data || []
        // Prefer boards linked to this specific league
        const linkedMatch = boards.find(b => b.leagueId === leagueId && b.playerCount > 0)
        if (linkedMatch) { setExistingBoardId(linkedMatch.id); return }
        // Fall back to sport match
        const sportMatch = boards.find(b => b.sport === sport && b.playerCount > 0)
        if (sportMatch) setExistingBoardId(sportMatch.id)
      })
      .catch(() => {})
  }, [league, leagueId])

  // Fetch league prediction leaderboard
  useEffect(() => {
    if (!leagueId) return
    api.getPredictionLeaderboard({ leagueId, timeframe: 'weekly', limit: 5 })
      .then(data => setLeagueLeaderboard(data.leaderboard || []))
      .catch(() => {})
  }, [leagueId])

  // Fetch league coach briefing
  useEffect(() => {
    if (!leagueId) return
    api.getCoachBriefing(leagueId)
      .then(data => setLeagueBriefing(data.briefing))
      .catch(() => {})
  }, [leagueId])

  // For imported leagues with no active teams, fetch most recent historical season
  const isImportedLeague = !!league?.settings?.importedFrom
  const hasNoActiveTeams = !league?.teams?.length && !league?.standings?.length
  useEffect(() => {
    if (!leagueId || !isImportedLeague || !hasNoActiveTeams) return
    api.getLeagueHistory(leagueId)
      .then(data => {
        const seasons = data.seasons || data
        if (!seasons || typeof seasons !== 'object') return
        // Get the most recent year's teams
        const years = Object.keys(seasons).map(Number).sort((a, b) => b - a)
        if (years.length > 0) {
          const recentYear = years[0]
          const teams = seasons[recentYear] || []
          setHistoricalTeams({ year: recentYear, teams: teams.sort((a, b) => (a.finalStanding || 99) - (b.finalStanding || 99)) })
        }
      })
      .catch(() => {})
  }, [leagueId, isImportedLeague, hasNoActiveTeams])

  // Check for unclaimed vault owners (show "Claim Your History" banner)
  useEffect(() => {
    if (!leagueId || !isImportedLeague || !user?.id) return
    api.getOwnerAliases(leagueId)
      .then(data => {
        const aliases = data.aliases || data || []
        const userClaimed = aliases.some(a => a.ownerUserId === user.id)
        if (!userClaimed) {
          const unclaimed = [...new Set(aliases.filter(a => !a.ownerUserId).map(a => a.canonicalName))]
          if (unclaimed.length > 0) setUnclaimedOwners(unclaimed)
        }
      })
      .catch(() => {})
  }, [leagueId, isImportedLeague, user?.id])

  // Derive user position from standings data
  const userTeamStanding = league?.standings?.find(t => t.userId === user?.id)
  const userRank = userTeamStanding?.rank || '-'
  const userPoints = userTeamStanding?.totalPoints || 0
  const leaderStanding = league?.standings?.[0]
  const leaderPoints = leaderStanding?.totalPoints || 0
  const pointsDiff = leaderPoints - userPoints

  const { phase: leaguePhase } = useLeaguePhase({ league, currentTournament })
  const isCommissioner = league?.ownerId === user?.id || league?.owner?.id === user?.id
  const latestDraft = league?.drafts?.[0]
  const draftStatus = latestDraft?.status
  const hasDraftRecord = !!latestDraft
  const teamsHavePlayers = league?.teams?.some(t => t.totalPoints > 0 || t.wins > 0)
  const isDraftScheduledOrInProgress = draftStatus === 'SCHEDULED' || draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED'
  const isDraftComplete = draftStatus === 'COMPLETED'

  // Check if draft room should be open (1 hour before scheduled time)
  useEffect(() => {
    if (draftStatus !== 'SCHEDULED' || !latestDraft?.scheduledFor) {
      setDraftRoomOpen(false)
      return
    }
    const check = () => {
      const opensAt = new Date(latestDraft.scheduledFor).getTime() - 3600000
      setDraftRoomOpen(Date.now() >= opensAt)
    }
    check()
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [latestDraft?.scheduledFor, draftStatus])

  const handleCreateDraft = async () => {
    if (!draftDateInput) return
    try {
      setCreatingDraft(true)
      await api.createDraft(leagueId, { scheduledFor: new Date(draftDateInput).toISOString() })
      const data = await api.getLeague(leagueId)
      setDetailedLeague(data.league || data)
      setShowDraftScheduler(false)
      setDraftDateInput('')
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

  const handleCancelDraft = async () => {
    if (!latestDraft?.id) return
    if (!window.confirm('Cancel this draft? This will delete the draft and all its data.')) return
    try {
      setCancellingDraft(true)
      await api.cancelDraft(latestDraft.id)
      const data = await api.getLeague(leagueId)
      setDetailedLeague(data.league || data)
    } catch (err) {
      alert(err.message)
    } finally {
      setCancellingDraft(false)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading league...</p>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="min-h-screen">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold font-display text-text-primary mb-2">League Not Found</h2>
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
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/leagues"
                className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Leagues
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">{league.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-text-secondary">{format?.name || 'League'}</span>
                {hasDraft && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary capitalize">{league.draftType} Draft</span>
                  </>
                )}
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary">
                  {hasNoActiveTeams && isImportedLeague
                    ? `${league.maxTeams || historicalTeams?.teams?.length || '–'} teams`
                    : (() => { const c = league.members?.length || league._count?.members || league.memberCount || 0; return `${c} member${c !== 1 ? 's' : ''}` })()
                  }
                </span>
                <span className="text-text-muted">•</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  ['active', 'ACTIVE'].includes(league.status) ? 'bg-gold/20 text-gold' :
                  ['draft-pending', 'DRAFT_PENDING'].includes(league.status) ? 'bg-crown/20 text-crown' :
                  ['DRAFTING'].includes(league.status) ? 'bg-blue-500/20 text-blue-400' :
                  ['COMPLETED'].includes(league.status) ? 'bg-field-bright/20 text-field' :
                  ['ARCHIVED'].includes(league.status) ? 'bg-[var(--bg-alt)] text-text-muted/50' :
                  'bg-[var(--bg-alt)] text-text-muted'
                }`}>
                  {{ active: 'Active', ACTIVE: 'Active', 'draft-pending': 'Pre-Draft', DRAFT_PENDING: 'Pre-Draft', DRAFTING: 'Drafting', COMPLETED: 'Complete', ARCHIVED: 'Archived' }[league.status] || league.status}
                </span>
              </div>
            </div>
            {/* Compact nav pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                // Core — always show (except OAD)
                ...(!isOneAndDone ? [
                  { to: `/leagues/${leagueId}/roster`, label: 'My Team' },
                  ...(hasDraft && isDraftScheduledOrInProgress ? [{ to: `/leagues/${leagueId}/draft`, label: 'Draft Room' }] : []),
                  { to: `/leagues/${leagueId}/waivers`, label: 'Waivers' },
                ] : []),
                // Format-specific
                ...(isHeadToHead ? [
                  { to: `/leagues/${leagueId}/matchups`, label: 'Matchups' },
                ] : []),
                ...(isRoto ? [{ to: `/leagues/${leagueId}/categories`, label: 'Categories' }] : []),
                ...(isSurvivor ? [{ to: `/leagues/${leagueId}/survivor`, label: 'Survivor' }] : []),
                ...(isOneAndDone ? [{ to: `/leagues/${leagueId}/picks`, label: 'Picks' }] : []),
                // Common
                { to: isNflLeague ? `/nfl/players?league=${leagueId}` : `/players?league=${leagueId}`, label: 'Players' },
                { to: existingBoardId ? `/lab/${existingBoardId}` : buildLabUrl(league), label: 'Lab' },
                { to: `/leagues/${leagueId}/standings`, label: 'Standings' },
                { to: `/leagues/${leagueId}/vault`, label: 'Vault' },
                { to: `/leagues/${leagueId}/scoring`, label: 'Scoring' },
                { to: `/leagues/${leagueId}/settings`, label: 'Settings' },
              ].map(nav => (
                <Link
                  key={nav.to}
                  to={nav.to}
                  className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-xs font-medium text-text-secondary bg-[var(--surface)] border border-[var(--card-border)] hover:text-text-primary hover:border-[var(--crown)]/40 transition-colors"
                >
                  {nav.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Claim Your History banner for imported leagues */}
          {unclaimedOwners && (
            <div className="mb-4 rounded-lg border border-crown/30 bg-crown/5 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Your league history is ready</p>
                <p className="text-xs text-text-secondary truncate">Claim your owner identity to see your all-time stats in the Vault.</p>
              </div>
              <Link
                to={`/leagues/${leagueId}/vault`}
                className="shrink-0 px-4 py-2 bg-crown text-white text-xs font-bold rounded-lg hover:bg-crown/80 transition-colors"
              >
                Claim History
              </Link>
            </div>
          )}

          {/* Coach + Draft Hero Section */}
          {hasDraft && !isOneAndDone && (
            <div className="mb-6">
              {!hasDraftRecord && isCommissioner && !teamsHavePlayers && (
                <Card className="border-gold/30 bg-gradient-to-r from-gold/10 to-[var(--surface)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold font-display text-text-primary">Set Up Your Draft</h3>
                      <p className="text-text-secondary text-sm">Schedule a draft date for your league.</p>
                    </div>
                    {!showDraftScheduler ? (
                      <Button onClick={() => setShowDraftScheduler(true)}>
                        Schedule Draft
                      </Button>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <input
                          type="datetime-local"
                          value={draftDateInput}
                          onChange={(e) => setDraftDateInput(e.target.value)}
                          className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary"
                        />
                        <Button size="sm" onClick={handleCreateDraft} disabled={creatingDraft || !draftDateInput}>
                          {creatingDraft ? 'Scheduling...' : 'Schedule Draft'}
                        </Button>
                        <button
                          onClick={() => setShowDraftScheduler(false)}
                          className="text-xs text-text-muted hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {isDraftScheduledOrInProgress && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Left: Coach Briefing */}
                  <div className="relative overflow-hidden rounded-xl border border-[var(--card-border-strong)] bg-[var(--surface)] p-3 shadow-sm dark:shadow-none">
                    <div className="flex items-start gap-4">
                      {/* Text content — left half */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">Coach Briefing</span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary leading-snug">
                          {leagueBriefing?.headline || (draftStatus === 'SCHEDULED' ? 'Draft day is approaching — time to prepare' : 'The draft is live — trust your board')}
                        </p>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {leagueBriefing?.body || 'Get your rankings dialed in. Your coach is analyzing the field and tracking your board for blind spots.'}
                        </p>
                        {existingBoardId && (
                          <button
                            onClick={() => navigate(`/lab/${existingBoardId}`)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--crown)] hover:text-[var(--crown-bright)] transition-colors"
                          >
                            Open Lab →
                          </button>
                        )}
                      </div>
                      {/* Neural cluster — right half */}
                      <div className="hidden sm:flex items-center justify-center flex-shrink-0 opacity-60">
                        <NeuralCluster size="md" intensity="active" />
                      </div>
                    </div>
                  </div>

                  {/* Right: Draft Countdown */}
                  <div className="rounded-xl border border-crown/30 bg-gradient-to-br from-crown/10 to-[var(--surface)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold font-display text-text-primary">
                        {draftStatus === 'SCHEDULED' ? 'Draft Scheduled' :
                         draftStatus === 'PAUSED' ? 'Draft Paused' : 'Draft In Progress'}
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/leagues/${leagueId}/draft`)}
                        disabled={draftStatus === 'SCHEDULED' && (!latestDraft?.scheduledFor || !draftRoomOpen)}
                      >
                        {draftStatus === 'IN_PROGRESS' ? 'Join Draft' : 'Draft Room'}
                      </Button>
                    </div>
                    {draftStatus === 'SCHEDULED' && latestDraft?.scheduledFor && !editingDraftDate && (
                      <>
                        <DraftCountdown scheduledFor={latestDraft.scheduledFor} />
                        <div className="flex items-center gap-3 mt-1.5">
                          {isCommissioner && (
                            <>
                              <button
                                onClick={() => {
                                  setDraftDateInput(new Date(latestDraft.scheduledFor).toISOString().slice(0, 16))
                                  setEditingDraftDate(true)
                                }}
                                className="text-[10px] text-text-muted hover:text-text-primary underline"
                              >
                                Change Date
                              </button>
                              <button
                                onClick={handleCancelDraft}
                                disabled={cancellingDraft}
                                className="text-[10px] text-live-red hover:text-red-300 underline"
                              >
                                {cancellingDraft ? 'Cancelling...' : 'Cancel Draft'}
                              </button>
                            </>
                          )}
                          {!draftRoomOpen && (
                            <span className="text-[10px] text-text-muted ml-auto">Opens 1hr before</span>
                          )}
                        </div>
                      </>
                    )}
                    {draftStatus === 'SCHEDULED' && !latestDraft?.scheduledFor && !editingDraftDate && (
                      <div>
                        {isCommissioner ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setEditingDraftDate(true)}
                              className="text-xs text-gold hover:underline"
                            >
                              Set a draft date & time
                            </button>
                            <button
                              onClick={handleCancelDraft}
                              disabled={cancellingDraft}
                              className="text-[10px] text-live-red hover:text-red-300 underline"
                            >
                              {cancellingDraft ? 'Cancelling...' : 'Cancel Draft'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-text-muted text-xs">No draft date set yet</p>
                        )}
                      </div>
                    )}
                    {draftStatus === 'SCHEDULED' && editingDraftDate && isCommissioner && (
                      <div className="mt-1 flex flex-wrap items-end gap-2">
                        <input
                          type="datetime-local"
                          value={draftDateInput}
                          onChange={(e) => setDraftDateInput(e.target.value)}
                          className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs text-text-primary"
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
                          className="text-[10px] text-text-muted hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {draftStatus === 'PAUSED' && (
                      <p className="text-text-secondary text-xs">The commissioner has paused the draft.</p>
                    )}
                    {draftStatus === 'IN_PROGRESS' && (
                      <p className="text-text-secondary text-xs">The draft is live! Join now.</p>
                    )}
                  </div>
                </div>
              )}
              {isDraftComplete && !(currentTournament?.status === 'IN_PROGRESS' || currentTournament?.status === 'COMPLETED') && (
                <Card className="border-field/30 bg-gradient-to-r from-field/5 to-[var(--surface)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-field/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-field" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-text-primary font-medium">Draft Complete</h3>
                        <p className="text-text-muted text-sm">Your roster is set. Season is underway!</p>
                      </div>
                    </div>
                    <Link
                      to={`/draft/history/${latestDraft.id}`}
                      className="px-4 py-2 bg-field/10 hover:bg-field/20 text-field font-medium text-sm rounded-lg transition-colors whitespace-nowrap"
                    >
                      View Draft Recap
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Coach Briefing Card (non-draft states) */}
          {leagueBriefing && !(hasDraft && !isOneAndDone && isDraftScheduledOrInProgress) && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
              <NeuralCluster size="sm" intensity="calm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-text-primary leading-snug">
                  {leagueBriefing.headline}
                </p>
                {leagueBriefing.body && (
                  <p className="text-xs text-text-secondary mt-0.5 font-editorial italic truncate">
                    {leagueBriefing.body}
                  </p>
                )}
              </div>
              {leagueBriefing.cta && (
                <Link
                  to={leagueBriefing.cta.to}
                  className="min-h-[44px] inline-flex items-center text-xs font-mono font-semibold text-purple-400 hover:text-purple-300 transition-colors shrink-0"
                >
                  {leagueBriefing.cta.label} &rarr;
                </Link>
              )}
            </div>
          )}

          {/* Phase-Aware Action Row */}
          <PhaseActionRow phase={leaguePhase} league={league} existingBoardId={existingBoardId} />

          {/* Live / Final Tournament Scoring Widget (golf leagues only) */}
          {!isNflLeague && currentTournament && (currentTournament.status === 'IN_PROGRESS' || currentTournament.status === 'COMPLETED') && (
            <LiveScoringWidget leagueId={leagueId} tournament={currentTournament} />
          )}
          {!isNflLeague && currentTournament && (currentTournament.status === 'UPCOMING' || currentTournament.status === 'IN_PROGRESS') && (
            <div className="mb-6">
              <Link to="/golf" className="block group">
                <div className="relative">
                  <TournamentHeader tournament={currentTournament} leaderboard={tournamentField} />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono font-bold text-gold bg-gold/10 px-2 py-1 rounded-full">
                      Golf Hub &rarr;
                    </span>
                  </div>
                </div>
              </Link>

            </div>
          )}

          {/* NFL Matchup Hero Card */}
          {isNflLeague && isHeadToHead && nflMatchupData && (
            <div className="mb-6">
              <Card className={`border-${nflMatchupData.isLive ? 'field-bright' : 'gold'}/30 bg-gradient-to-r ${
                nflMatchupData.isLive
                  ? 'from-field-bright/10 to-[var(--surface)]'
                  : nflMatchupData.isComplete
                    ? 'from-[var(--card-bg)] to-[var(--surface)]'
                    : 'from-gold/10 to-[var(--surface)]'
              }`}>
                {/* Week label + status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {nflMatchupData.isLive && (
                      <span className="w-2 h-2 bg-field rounded-full animate-pulse" />
                    )}
                    <h3 className="text-sm font-display font-bold text-text-primary uppercase tracking-wide">
                      {nflMatchupData.isLive ? 'Live — ' : nflMatchupData.isComplete ? '' : 'Up Next — '}
                      Week {nflMatchupData.week}
                    </h3>
                  </div>
                  {nflMatchupData.isComplete && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      nflMatchupData.userWon ? 'bg-field-bright/20 text-field' : 'bg-live-red/20 text-live-red'
                    }`}>
                      {nflMatchupData.userWon ? 'WIN' : 'LOSS'}
                    </span>
                  )}
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-between gap-4">
                  {/* Your team */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-field font-medium mb-1">You</p>
                    <p className="text-sm text-text-primary font-medium truncate">
                      {nflMatchupData.userTeam?.teamName || nflMatchupData.userTeam?.name || 'Your Team'}
                    </p>
                    {nflMatchupData.userTeam && (
                      <p className="text-xs text-text-muted">
                        {nflMatchupData.userTeam.wins}-{nflMatchupData.userTeam.losses}
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3 px-4">
                    <span className={`text-3xl font-bold font-display ${
                      nflMatchupData.isComplete
                        ? nflMatchupData.userWon ? 'text-field' : 'text-live-red'
                        : 'text-text-primary'
                    }`}>
                      {nflMatchupData.userScore?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-text-muted text-lg">—</span>
                    <span className={`text-3xl font-bold font-display ${
                      nflMatchupData.isComplete
                        ? !nflMatchupData.userWon ? 'text-field' : 'text-live-red'
                        : 'text-text-primary'
                    }`}>
                      {nflMatchupData.opponentScore?.toFixed(1) || '0.0'}
                    </span>
                  </div>

                  {/* Opponent */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-text-muted font-medium mb-1">Opponent</p>
                    <p className="text-sm text-text-primary font-medium truncate">
                      {nflMatchupData.opponentTeam?.teamName || nflMatchupData.opponentTeam?.name || 'Opponent'}
                    </p>
                    {nflMatchupData.opponentTeam && (
                      <p className="text-xs text-text-muted">
                        {nflMatchupData.opponentTeam.wins}-{nflMatchupData.opponentTeam.losses}
                      </p>
                    )}
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/leagues/${leagueId}/roster`)}
                  >
                    Set Lineup
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/leagues/${leagueId}/gameday`)}
                  >
                    {nflMatchupData.isLive ? 'Watch Live' : 'Gameday Portal'}
                  </Button>
                </div>

                {/* Last week result */}
                {nflMatchupData.lastResult && (
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)]/50 text-center">
                    <p className="text-xs text-text-muted">
                      Last week: {nflMatchupData.lastResult.won ? 'W' : 'L'}{' '}
                      {nflMatchupData.lastResult.userScore.toFixed(1)} - {nflMatchupData.lastResult.opponentScore.toFixed(1)}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Generate Playoffs Banner (commissioner, H2H, draft complete) */}
          {isCommissioner && isHeadToHead && isDraftComplete && (
            <div className="mb-6">
              <Card className="border-crown/30 bg-gradient-to-r from-crown/10 to-[var(--surface)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-crown/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-crown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-text-primary font-semibold">Playoffs</h3>
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
            {/* Left Column — Standings (the one source of truth) + Quick Links */}
            <div className="lg:col-span-2 space-y-6">
              {/* Teams / Standings — merged into one card */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold font-display text-text-primary">
                    {hasNoActiveTeams && historicalTeams ? `${historicalTeams.year} Standings` : 'Teams'}
                  </h3>
                  <span className="text-text-muted text-sm">
                    {hasNoActiveTeams && historicalTeams
                      ? `${historicalTeams.teams.length} teams`
                      : `${league.teams?.length || league._count?.teams || 0} / ${league.maxTeams || '–'}`
                    }
                  </span>
                </div>
                <div className="overflow-x-auto">
                  {/* Active teams table */}
                  {!hasNoActiveTeams && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] text-xs text-text-muted">
                        <th className="pb-2 text-left w-10">#</th>
                        <th className="pb-2 text-left">Team</th>
                        <th className="pb-2 text-left">Owner</th>
                        <th className="pb-2 text-center">Players</th>
                        <th className="pb-2 text-center">W-L</th>
                        {!isNflLeague && <th className="pb-2 text-center">This Week</th>}
                        <th className="pb-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const baseTeams = league.standings || league.teams || []
                        // When tournament is live, sort by live points (highest first)
                        if (isTournamentLive && liveTeams?.length > 0) {
                          const sorted = [...baseTeams].sort((a, b) => {
                            const aLive = liveTeams.find(lt => lt.teamId === a.id)
                            const bLive = liveTeams.find(lt => lt.teamId === b.id)
                            return (bLive?.totalPoints || 0) - (aLive?.totalPoints || 0)
                          })
                          return sorted
                        }
                        return baseTeams
                      })().map((team, i) => {
                        const rank = (isTournamentLive && liveTeams?.length > 0) ? i + 1 : (team.rank || i + 1)
                        const isMe = team.userId === user?.id
                        const ownerName = team.user?.name || team.name
                        const rosterCount = team.roster?.length || 0
                        return (
                          <tr
                            key={team.id || i}
                            onClick={() => team.id && navigate(isMe ? `/leagues/${leagueId}/roster` : `/leagues/${leagueId}/roster?member=${team.userId}`)}
                            className={`
                              border-b border-[var(--card-border)] transition-colors cursor-pointer
                              ${isMe ? 'bg-field-bright/8' : 'hover:bg-[var(--surface-alt)]'}
                            `}
                          >
                            <td className={`py-3 font-bold ${
                              rank === 1 ? 'text-crown' :
                              rank === 2 ? 'text-gray-400 dark:text-gray-300' :
                              rank === 3 ? 'text-amber-500' : 'text-text-muted'
                            }`}>
                              {rank}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-[var(--bg-alt)] rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary flex-shrink-0 overflow-hidden">
                                  {team.avatarUrl ? (
                                    <img src={team.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : team.avatar ? (
                                    <span className="text-base">{team.avatar}</span>
                                  ) : (
                                    (team.name || ownerName || '?').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <span className={`font-medium truncate ${isMe ? 'text-field' : 'text-text-primary'}`}>
                                  {team.name || 'Team ' + rank}
                                  {isMe && <span className="text-xs text-field/60 ml-1">(You)</span>}
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
                            {!isNflLeague && (() => {
                              const liveTeam = liveTeams?.find(lt => lt.teamId === team.id)
                              const livePoints = liveTeam?.totalPoints
                              return (
                                <td className="py-3 text-center">
                                  {isTournamentLive && livePoints != null ? (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-field-bright">
                                      {isLiveScoring && <span className="w-1.5 h-1.5 bg-field rounded-full animate-pulse" />}
                                      {livePoints.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted">–</span>
                                  )}
                                </td>
                              )
                            })()}
                            <td className="py-3 text-right font-semibold text-text-primary">
                              {team.totalPoints?.toLocaleString() || '0'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  )}

                  {/* Historical teams from import (when no active season) */}
                  {hasNoActiveTeams && historicalTeams && (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] text-xs text-text-muted">
                          <th className="pb-2 text-left w-10">#</th>
                          <th className="pb-2 text-left">Team</th>
                          <th className="pb-2 text-left">Owner</th>
                          <th className="pb-2 text-center">W-L</th>
                          <th className="pb-2 text-right">PF</th>
                          <th className="pb-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalTeams.teams.map((ht, i) => {
                          const rank = ht.finalStanding || i + 1
                          const isChamp = ht.playoffResult === 'champion'
                          return (
                            <tr
                              key={ht.id || i}
                              className={`border-b border-[var(--card-border)] ${isChamp ? 'bg-crown/5' : ''}`}
                            >
                              <td className={`py-3 font-bold ${
                                rank === 1 ? 'text-crown' :
                                rank === 2 ? 'text-gray-400 dark:text-gray-300' :
                                rank === 3 ? 'text-amber-500' : 'text-text-muted'
                              }`}>
                                {rank}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-[var(--bg-alt)] rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary flex-shrink-0">
                                    {(ht.teamName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium truncate text-text-primary">
                                    {ht.teamName}
                                    {isChamp && <span className="ml-1">🏆</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 text-text-secondary truncate max-w-[120px]">
                                {ht.ownerName}
                              </td>
                              <td className="py-3 text-center text-text-secondary">
                                {ht.wins != null ? `${ht.wins}-${ht.losses || 0}${ht.ties > 0 ? `-${ht.ties}` : ''}` : '–'}
                              </td>
                              <td className="py-3 text-right font-mono text-sm text-text-primary">
                                {ht.pointsFor ? Number(ht.pointsFor).toFixed(1) : '–'}
                              </td>
                              <td className="py-3 text-right">
                                {ht.playoffResult === 'champion' && <span className="text-crown text-xs font-semibold">Champion</span>}
                                {ht.playoffResult === 'runner_up' && <span className="text-gray-400 dark:text-gray-300 text-xs">Runner-Up</span>}
                                {ht.playoffResult === 'eliminated' && <span className="text-text-muted text-xs">Playoffs</span>}
                                {ht.playoffResult === 'missed' && <span className="text-text-muted/50 text-xs">Missed</span>}
                                {!ht.playoffResult && <span className="text-text-muted/30 text-xs">–</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-text-muted">
                        Most recent season from {league.settings.importedFrom === 'yahoo' ? 'Yahoo' :
                          league.settings.importedFrom === 'sleeper' ? 'Sleeper' :
                          league.settings.importedFrom === 'espn' ? 'ESPN' :
                          league.settings.importedFrom === 'mfl' ? 'MFL' :
                          league.settings.importedFrom || 'import'}
                      </p>
                      <Link
                        to={`/leagues/${leagueId}/vault`}
                        className="min-h-[44px] inline-flex items-center text-xs text-accent-gold hover:text-accent-gold/80 font-medium"
                      >
                        View All History →
                      </Link>
                    </div>
                  </>
                  )}

                  {/* Empty state — no teams and no import history */}
                  {hasNoActiveTeams && !historicalTeams && !isImportedLeague && (
                    <div className="text-center py-8 text-text-muted text-sm">
                      No teams yet. Invite members to join!
                    </div>
                  )}
                  {hasNoActiveTeams && !historicalTeams && isImportedLeague && (
                    <div className="text-center py-6 text-text-muted text-sm">
                      <p>Loading history...</p>
                    </div>
                  )}
                </div>

                {/* League members without teams */}
                {league.members && league.members.length > (league.teams?.length || 0) && (
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <p className="text-xs text-text-muted mb-2">Members without teams</p>
                    <div className="flex flex-wrap gap-2">
                      {league.members
                        .filter(m => !league.teams?.some(t => t.userId === m.userId))
                        .map(m => (
                          <span key={m.userId} className="px-2 py-1 bg-[var(--bg-alt)] rounded text-xs text-text-secondary">
                            {m.user?.name || 'Member'}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </Card>

              {/* Secondary links (only what's not in top nav pills) */}
              <div className="flex flex-wrap gap-1.5">
                {!isOneAndDone && (
                  <Link to={`/leagues/${leagueId}/trades`} className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-xs text-text-muted bg-[var(--surface)] border border-[var(--card-border)] hover:text-text-primary hover:border-[var(--crown)]/40 transition-colors">
                    Trades
                  </Link>
                )}
                {isHeadToHead && (
                  <Link to={`/leagues/${leagueId}/playoffs`} className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-xs text-text-muted bg-[var(--surface)] border border-[var(--card-border)] hover:text-text-primary hover:border-[var(--crown)]/40 transition-colors">
                    Playoffs
                  </Link>
                )}
                <Link to={`/leagues/${leagueId}/recap`} className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-xs text-text-muted bg-[var(--surface)] border border-[var(--card-border)] hover:text-text-primary hover:border-[var(--crown)]/40 transition-colors">
                  Recap
                </Link>
              </div>

              {/* Commissioner Blog — full width for rich content */}
              <CommissionerNotes
                leagueId={leagueId}
                isCommissioner={isCommissioner}
                leagueName={league.name}
              />
            </div>

            {/* Right Column — Activity, Chat */}
            <div className="lg:col-span-1 space-y-6">
              {/* Activity Feed */}
              <Card>
                <h3 className="text-sm font-semibold font-display text-text-primary mb-3">Recent Activity</h3>
                <ActivityFeed activity={activity} loading={activityLoading} />
              </Card>

              {/* League Prediction Leaderboard */}
              {leagueLeaderboard.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-display font-bold text-text-primary">Sharpest Predictors</h3>
                    <Link to="/prove-it" className="min-h-[44px] inline-flex items-center text-xs text-accent-gold hover:text-accent-gold/80 font-mono">View All</Link>
                  </div>
                  <div className="space-y-2">
                    {leagueLeaderboard.map((entry, i) => (
                      <div key={entry.userId || i} className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold w-5 ${i === 0 ? 'text-accent-gold' : 'text-text-secondary'}`}>
                          {i + 1}.
                        </span>
                        <Link
                          to={`/manager/${entry.userId}`}
                          className="flex-1 text-sm text-text-primary hover:text-accent-gold transition-colors truncate font-display"
                        >
                          {entry.name || entry.userName || 'Unknown'}
                        </Link>
                        <span className="text-xs font-mono text-field">
                          {(entry.accuracyRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Chat */}
              <ChatPanel
                leagueId={leagueId}
                leagueName={league.name}
                memberCount={league.memberCount || league._count?.members || league.members?.length}
                className="h-[350px]"
              />
            </div>
          </div>
        </div>
      </main>
      <LeagueChat leagueId={leagueId} leagueName={league?.name} pageContext="home" />
    </div>
  )
}

export default LeagueHome
