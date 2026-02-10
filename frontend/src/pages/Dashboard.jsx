import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import { useAuth } from '../context/AuthContext'
import { useOnboarding } from '../context/OnboardingContext'
import { useLeagues } from '../hooks/useLeagues'
import { useTournaments } from '../hooks/useTournaments'
import { useActivity } from '../hooks/useActivity'
import { useStats } from '../hooks/useStats'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import LeagueCard from '../components/dashboard/LeagueCard'
import TournamentCard from '../components/dashboard/TournamentCard'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import PredictionWidget from '../components/predictions/PredictionWidget'
import FeedCard from '../components/feed/FeedCard'
import api from '../services/api'

const StatCardSkeleton = () => (
  <Card className="text-center animate-pulse" hover>
    <div className="h-3 bg-dark-tertiary rounded w-20 mx-auto mb-2" />
    <div className="h-8 bg-dark-tertiary rounded w-12 mx-auto" />
  </Card>
)

const LeagueCardSkeleton = () => (
  <Card className="animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-5 bg-dark-tertiary rounded w-3/4 mb-2" />
        <div className="h-3 bg-dark-tertiary rounded w-1/2" />
      </div>
      <div className="h-10 w-10 bg-dark-tertiary rounded" />
    </div>
    <div className="h-16 bg-dark-primary rounded-lg mb-4" />
    <div className="space-y-2 mb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-8 bg-dark-tertiary rounded" />
      ))}
    </div>
    <div className="flex gap-2">
      <div className="h-9 bg-dark-tertiary rounded flex-1" />
      <div className="h-9 bg-dark-tertiary rounded flex-1" />
    </div>
  </Card>
)

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isCompleted: onboardingCompleted, startOnboarding } = useOnboarding()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const { currentTournament, loading: tournamentsLoading } = useTournaments()
  const primaryLeagueId = leagues?.[0]?.id
  const { activity, loading: activityLoading } = useActivity(primaryLeagueId, 8)
  const { stats, loading: statsLoading } = useStats()

  useEffect(() => {
    track(Events.DASHBOARD_VIEWED, { leagueCount: leagues?.length || 0 })
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

  const handleSetLineup = (tournament) => {
    // Navigate to roster page for the first league (to set lineup)
    if (leagues && leagues.length > 0) {
      navigate(`/leagues/${leagues[0].id}/roster`)
    }
  }

  const handleViewTournament = (tournament) => {
    // Navigate to tournament scoring view
    if (tournament) {
      navigate(`/tournaments/${tournament.id}${leagues?.length > 0 ? `?league=${leagues[0].id}` : ''}`)
    }
  }

  const [feedCards, setFeedCards] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)

  // Determine sport from user's leagues
  const leagueSports = leagues ? [...new Set(leagues.map(l => (l.sport || 'GOLF').toLowerCase()))] : []
  const feedSport = leagueSports.length === 1 ? leagueSports[0] : 'all'

  useEffect(() => {
    api.getFeed(feedSport, { limit: 4 })
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

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 leading-tight">
              Welcome back, {user?.name || 'Player'}!
            </h1>
            <p className="text-text-secondary leading-relaxed">
              Here's what's happening with your fantasy teams.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {statsLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <Link to="/leagues">
                  <Card className="text-center" hover>
                    <p className="text-text-muted text-xs sm:text-sm mb-1">Active Leagues</p>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-white">
                      {stats?.activeLeagues ?? 0}
                    </p>
                  </Card>
                </Link>
                <Link to="/profile">
                  <Card className="text-center" hover>
                    <p className="text-text-muted text-xs sm:text-sm mb-1">Total Points</p>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-gold">
                      {stats?.totalPoints?.toLocaleString() ?? '—'}
                    </p>
                  </Card>
                </Link>
                <Link to="/leagues">
                  <Card className="text-center" hover>
                    <p className="text-text-muted text-xs sm:text-sm mb-1">Best Finish</p>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-yellow-400">
                      {stats?.bestFinish ? `${stats.bestFinish}${stats.bestFinish === 1 ? 'st' : stats.bestFinish === 2 ? 'nd' : stats.bestFinish === 3 ? 'rd' : 'th'}` : '—'}
                    </p>
                  </Card>
                </Link>
                <Link to="/profile">
                  <Card className="text-center" hover>
                    <p className="text-text-muted text-xs sm:text-sm mb-1">Win Rate</p>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-white">
                      {stats?.winRate !== undefined ? `${stats.winRate}%` : '—'}
                    </p>
                  </Card>
                </Link>
              </>
            )}
          </div>

          {/* Mock Draft Banner */}
          <Link to="/mock-draft" className="block mb-6 sm:mb-8 group">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gold/20 via-dark-secondary to-yellow-500/20 border border-gold/30 p-5 sm:p-6 hover:border-gold/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Mock Draft</h3>
                    <p className="text-text-secondary text-sm">Practice your draft strategy against AI opponents</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-text-muted group-hover:text-gold group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Your Feed Tease */}
          {(feedLoading || feedCards.length > 0) && (
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg sm:text-xl font-semibold font-display text-white">Your Feed</h2>
                <Link
                  to="/feed"
                  className="text-gold text-xs font-semibold hover:text-gold/80 transition-colors"
                >
                  View All
                </Link>
              </div>
              {feedLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 animate-pulse">
                      <div className="h-3 w-20 bg-white/10 rounded mb-2" />
                      <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-full bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {feedCards.map(card => (
                    <FeedCard key={card.id} card={card} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - My Leagues */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold font-display text-white">My Leagues</h2>
                  {hasMultipleSports && (
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5">
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
                              : 'text-white/30 hover:text-white/50'
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
                  <LeagueCardSkeleton />
                </div>
              ) : filteredLeagues.length > 0 ? (
                <div className="space-y-4">
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
                  {/* Empty State */}
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-white mb-2">No Leagues Yet</h3>
                    <p className="text-text-secondary mb-6 max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
                      Create your first league or join an existing one to start competing!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link to="/leagues/create">
                        <Button>Create a League</Button>
                      </Link>
                      <Link to="/leagues/join">
                        <Button variant="outline">Join a League</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Upcoming Tournament */}
              {tournamentsLoading ? (
                <Card className="animate-pulse">
                  <div className="h-5 bg-dark-tertiary rounded w-1/2 mb-4" />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-dark-tertiary rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-dark-tertiary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-dark-tertiary rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-20 bg-dark-primary rounded-lg mb-4" />
                  <div className="h-9 bg-dark-tertiary rounded" />
                </Card>
              ) : (
                <TournamentCard
                  tournament={currentTournament}
                  onSetLineup={handleSetLineup}
                  onViewDetails={handleViewTournament}
                />
              )}

              {/* Prove It Widget */}
              <PredictionWidget />

              {/* Quick Actions */}
              <Card>
                <h3 className="text-base sm:text-lg font-semibold font-display text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link to="/leagues/create" className="quick-action-btn group">
                    <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">Create League</p>
                      <p className="text-text-muted text-xs">Start a new competition</p>
                    </div>
                  </Link>

                  <Link to="/leagues/join" className="quick-action-btn group">
                    <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">Join League</p>
                      <p className="text-text-muted text-xs">Enter with a code</p>
                    </div>
                  </Link>

                  <Link to="/mock-draft" className="quick-action-btn group">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">Mock Draft</p>
                      <p className="text-text-muted text-xs">Practice against AI</p>
                    </div>
                  </Link>

                  <Link to="/players" className="quick-action-btn group">
                    <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">View Players</p>
                      <p className="text-text-muted text-xs">Browse and compare</p>
                    </div>
                  </Link>

                  <Link to="/import" className="quick-action-btn group">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">Import League</p>
                      <p className="text-text-muted text-xs">Bring history from Sleeper</p>
                    </div>
                  </Link>

                </div>
              </Card>

              {/* Recent Activity */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold font-display text-white">Recent Activity</h3>
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
        </div>
      </main>
    </div>
  )
}

export default Dashboard
