import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import { useAuth } from '../context/AuthContext'
import { useOnboarding } from '../context/OnboardingContext'
import { useLeagues } from '../hooks/useLeagues'
import { useTournaments } from '../hooks/useTournaments'
import { useActivity } from '../hooks/useActivity'
import useDraftBoards from '../hooks/useDraftBoards'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import LeagueCard from '../components/dashboard/LeagueCard'
// TournamentCard no longer used on dashboard — tournament data feeds "This Week" card
import ActivityFeed from '../components/dashboard/ActivityFeed'
import PredictionWidget from '../components/predictions/PredictionWidget'
import DashboardRatingWidget from '../components/dashboard/DashboardRatingWidget'
import api from '../services/api'

const LeagueCardSkeleton = () => (
  <Card className="animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-5 bg-[var(--stone)] rounded w-3/4 mb-2" />
        <div className="h-3 bg-[var(--stone)] rounded w-1/2" />
      </div>
      <div className="h-10 w-10 bg-[var(--stone)] rounded" />
    </div>
    <div className="h-16 bg-[var(--bg)] rounded-lg mb-4" />
    <div className="space-y-2 mb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-8 bg-[var(--stone)] rounded" />
      ))}
    </div>
    <div className="flex gap-2">
      <div className="h-9 bg-[var(--stone)] rounded flex-1" />
      <div className="h-9 bg-[var(--stone)] rounded flex-1" />
    </div>
  </Card>
)

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isCompleted: onboardingCompleted, startOnboarding } = useOnboarding()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const { currentTournament, loading: tournamentsLoading } = useTournaments()
  const { boards, loading: boardsLoading } = useDraftBoards()
  const primaryLeagueId = leagues?.[0]?.id
  const { activity, loading: activityLoading } = useActivity(primaryLeagueId, 8)
  const [coachingInsights, setCoachingInsights] = useState([])

  useEffect(() => {
    track(Events.DASHBOARD_VIEWED, { leagueCount: leagues?.length || 0 })
  }, [])

  // Fetch AI coaching insights
  useEffect(() => {
    api.getAiInsights().then(res => {
      setCoachingInsights((res.insights || []).slice(0, 2))
    }).catch(() => {})
  }, [])

  // Show onboarding for first-time users
  useEffect(() => {
    if (!onboardingCompleted && !leaguesLoading) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => {
        startOnboarding()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [onboardingCompleted, leaguesLoading, startOnboarding])

  const handleViewLeague = (league) => {
    navigate(`/leagues/${league.id}`)
  }

  const handleManageLineup = (league) => {
    navigate(`/leagues/${league.id}/roster`)
  }

  const [feedCards, setFeedCards] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)

  // Determine sport from user's leagues
  const leagueSports = leagues ? [...new Set(leagues.map(l => (l.sport || 'GOLF').toLowerCase()))] : []
  const feedSport = leagueSports.length === 1 ? leagueSports[0] : 'all'

  useEffect(() => {
    api.getFeed(feedSport, { limit: 3 })
      .then(data => setFeedCards(data.cards || []))
      .catch(() => setFeedCards([]))
      .finally(() => setFeedLoading(false))
  }, [feedSport])

  const [sportFilter, setSportFilter] = useState('all')
  const hasLeagues = leagues && leagues.length > 0
  const filteredLeagues = hasLeagues
    ? sportFilter === 'all'
      ? leagues
      : leagues.filter(l => (l.sport || 'GOLF').toLowerCase() === sportFilter)
    : []
  const hasMultipleSports = hasLeagues && new Set(leagues.map(l => (l.sport || 'GOLF').toLowerCase())).size > 1

  const quickActions = [
    { to: '/leagues/create', label: 'Create League', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />, color: 'text-gold' },
    { to: '/leagues/join', label: 'Join League', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />, color: 'text-orange' },
    { to: '/mock-draft', label: 'Mock Draft', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />, color: 'text-yellow-400' },
    { to: '/players', label: 'Players', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />, color: 'text-gold' },
    { to: '/import', label: 'Import', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />, color: 'text-purple-400' },
    { to: '/lab', label: 'The Lab', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />, color: 'text-blue-400' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

          {/* ── Section 1: Welcome Header + Latest Updates ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mb-2 leading-tight">
                Welcome back, {user?.name || 'Player'}!
              </h1>
              <p className="text-text-secondary leading-relaxed">
                Here's what's happening with your fantasy teams.
              </p>
            </div>

            {(feedLoading || feedCards.length > 0) && (
              <div className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h2 className="text-sm font-semibold font-display text-text-primary">Latest Updates</h2>
                  </div>
                  <Link
                    to="/feed"
                    className="text-gold text-xs font-semibold hover:text-gold/80 transition-colors flex items-center gap-1"
                  >
                    View Feed
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                {feedLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--stone)] flex-shrink-0" />
                        <div className="h-3 bg-[var(--stone)] rounded flex-1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedCards.slice(0, 3).map(card => (
                      <Link
                        key={card.id}
                        to={card.actions?.[0]?.href || '/feed'}
                        className="flex items-start gap-3 group"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                          style={{ backgroundColor: card.category === 'Big Performance' ? '#EF4444' : card.category === 'Stat Leader' ? '#F59E0B' : card.category === 'Team Trend' ? '#3B82F6' : card.category === 'Game Result' ? '#10B981' : '#F59E0B' }}
                        />
                        <span className="text-text-primary/70 text-xs leading-snug group-hover:text-text-primary transition-colors line-clamp-1">
                          {card.headline}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Section 2: Quick Actions — Compact Icon Strip ── */}
          <div>
            <h3 className="text-sm font-semibold font-display text-text-primary/60 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickActions.map(action => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-[var(--surface)] border border-[var(--card-border)] hover:border-[var(--crown)] transition-colors group"
                >
                  <svg className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {action.icon}
                  </svg>
                  <span className="text-text-primary text-xs font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Section 3: This Week + My Leagues ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* This Week — Command Center */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4.5 h-4.5 text-[var(--crown)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-base font-semibold font-display text-text-primary">This Week</h2>
              </div>

              <div className="space-y-2.5">
                {/* Live / Upcoming Tournament */}
                {tournamentsLoading ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-16 h-5 bg-[var(--stone)] rounded-full" />
                    <div className="h-4 bg-[var(--stone)] rounded flex-1" />
                  </div>
                ) : currentTournament ? (
                  <Link
                    to={`/tournaments/${currentTournament.id}${leagues?.length > 0 ? `?league=${leagues[0].id}` : ''}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-alt)] hover:bg-[var(--stone)] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {currentTournament.status === 'ACTIVE' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-live-red/10 text-live-red text-[10px] font-mono font-bold uppercase shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />
                          Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold uppercase shrink-0">
                          Upcoming
                        </span>
                      )}
                      <span className="text-sm text-text-primary font-medium truncate group-hover:text-[var(--field)] transition-colors">
                        {currentTournament.name}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-text-primary/20 group-hover:text-[var(--field)] shrink-0 ml-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : null}

                {/* League action items */}
                {!leaguesLoading && hasLeagues && filteredLeagues.slice(0, 3).map(league => (
                  <Link
                    key={league.id}
                    to={`/leagues/${league.id}/roster`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-alt)] hover:bg-[var(--stone)] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                        (league.sport || 'GOLF').toLowerCase() === 'nfl' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {(league.sport || 'GOLF').toLowerCase()}
                      </span>
                      <span className="text-sm text-text-primary truncate">{league.name}</span>
                    </div>
                    <span className="text-[11px] text-text-primary/30 font-mono shrink-0 ml-2 group-hover:text-[var(--crown)] transition-colors">
                      Set lineup &rarr;
                    </span>
                  </Link>
                ))}

                {/* Draft boards */}
                {!boardsLoading && boards.length > 0 && (
                  <Link
                    to="/lab"
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-alt)] hover:bg-[var(--stone)] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/15 text-blue-400 shrink-0">
                        Lab
                      </span>
                      <span className="text-sm text-text-primary">
                        {boards.length} board{boards.length !== 1 ? 's' : ''} in progress
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-text-primary/20 group-hover:text-blue-400 shrink-0 ml-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}

                {/* Empty state */}
                {!tournamentsLoading && !currentTournament && !hasLeagues && (
                  <p className="text-text-primary/40 text-sm py-2">No live events this week. Explore the hubs to get started!</p>
                )}
              </div>
            </Card>

            {/* My Leagues */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold font-display text-text-primary">My Leagues</h2>
                  {hasMultipleSports && (
                    <div className="flex items-center bg-[var(--bg-alt)] rounded-lg p-0.5">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'golf', label: '\u26F3' },
                        { key: 'nfl', label: '\uD83C\uDFC8' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setSportFilter(opt.key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                            sportFilter === opt.key
                              ? 'bg-gold/20 text-gold'
                              : 'text-text-primary/30 hover:text-text-primary/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/leagues/create">
                  <Button size="sm">Create League</Button>
                </Link>
              </div>

              {leaguesLoading ? (
                <div className="space-y-4">
                  <LeagueCardSkeleton />
                </div>
              ) : filteredLeagues.length > 0 ? (
                <div className={`space-y-4 ${filteredLeagues.length >= 3 ? 'max-h-[400px] overflow-y-auto scrollbar-thin pr-1' : ''}`}>
                  {filteredLeagues.map((league) => (
                    <LeagueCard
                      key={league.id}
                      league={league}
                      onView={handleViewLeague}
                      onManageLineup={handleManageLineup}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--stone)] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">No Leagues Yet</h3>
                    <p className="text-text-secondary mb-6 max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
                      Create your first league or join an existing one to start competing!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                      <Link to="/leagues/create">
                        <Button>Create a League</Button>
                      </Link>
                      <Link to="/leagues/join">
                        <Button variant="outline">Join a League</Button>
                      </Link>
                    </div>

                    <div className="border-t border-[var(--stone)] pt-6">
                      <p className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-4">Explore while you wait</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                        <Link
                          to="/golf"
                          className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <span className="text-lg">&#x26f3;</span>
                          </div>
                          <div className="text-left">
                            <p className="text-text-primary font-semibold text-sm">Golf Hub</p>
                            <p className="text-emerald-400/70 text-xs">PGA Tour, stats & previews</p>
                          </div>
                        </Link>
                        <Link
                          to="/nfl"
                          className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <span className="text-lg">&#x1f3c8;</span>
                          </div>
                          <div className="text-left">
                            <p className="text-text-primary font-semibold text-sm">NFL Hub</p>
                            <p className="text-blue-400/70 text-xs">Players, teams & leaderboards</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* ── Section 4: Insight Row — Three Engagement Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Prove It — green tint */}
            <div
              className="rounded-xl p-4 border-l-[3px]"
              style={{ backgroundColor: 'var(--tint-golf)', borderLeftColor: 'var(--field)' }}
            >
              <PredictionWidget />
            </div>

            {/* Clutch Rating — gold tint */}
            <div
              className="rounded-xl p-4 border-l-[3px]"
              style={{ backgroundColor: 'var(--tint-rating)', borderLeftColor: 'var(--crown)' }}
            >
              <DashboardRatingWidget />
            </div>

            {/* Coaching Corner — purple tint */}
            <div
              className="rounded-xl p-4 border-l-[3px]"
              style={{ backgroundColor: 'var(--tint-ai)', borderLeftColor: '#8B5CF6' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold font-display text-text-primary">Coaching Corner</h3>
              </div>
              {coachingInsights.length > 0 ? (
                <div className="space-y-2">
                  {coachingInsights.map(insight => (
                    <div key={insight.id} className="px-3 py-2.5 bg-purple-500/[0.05] border border-purple-400/10 rounded-lg">
                      <p className="text-xs font-semibold text-purple-300/70 mb-0.5">{insight.title}</p>
                      <p className="text-[11px] text-text-primary/45 leading-relaxed line-clamp-2">{insight.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-primary/40 text-xs">AI insights will appear here as you play.</p>
              )}
            </div>
          </div>

          {/* ── Section 5: Bottom Row — Boards + Activity ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Boards */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold font-display text-text-primary">My Boards</h3>
                {boards.length > 0 && (
                  <Link to="/lab" className="text-gold text-xs font-semibold hover:text-gold/80 transition-colors">
                    View All &rarr;
                  </Link>
                )}
              </div>
              {boardsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-10 bg-[var(--bg-alt)] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : boards.length === 0 ? (
                <Link
                  to="/lab"
                  className="block text-center py-4 text-text-primary/30 text-sm hover:text-text-primary/50 transition-colors"
                >
                  Create your first draft board &rarr;
                </Link>
              ) : (
                <div className="space-y-2">
                  {boards.slice(0, 3).map(board => (
                    <Link
                      key={board.id}
                      to={`/lab/${board.id}`}
                      className="flex items-center justify-between px-3 py-2 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--stone)] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          board.sport === 'nfl' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {board.sport}
                        </span>
                        <span className="text-sm text-text-primary font-medium truncate">{board.name}</span>
                      </div>
                      <span className="text-[11px] text-text-primary/30 font-mono shrink-0 ml-2">{board.playerCount} players</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold font-display text-text-primary">Recent Activity</h3>
                {activity && activity.length > 0 && (
                  <button className="text-gold text-xs hover:underline">
                    View All
                  </button>
                )}
              </div>
              <ActivityFeed activity={activity} loading={activityLoading} />
            </Card>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Dashboard
