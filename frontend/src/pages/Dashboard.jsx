import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import { useAuth } from '../context/AuthContext'
import { useOnboarding } from '../context/OnboardingContext'
import { useLeagues } from '../hooks/useLeagues'
import { useTournaments } from '../hooks/useTournaments'
import { useActivity } from '../hooks/useActivity'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import LeagueCard from '../components/dashboard/LeagueCard'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import api from '../services/api'
import { buildLabUrl } from '../utils/labBridge'

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
  const primaryLeagueId = leagues?.[0]?.id
  const { activity, loading: activityLoading } = useActivity(primaryLeagueId, 6)

  // Coach briefing — single sentence
  const [briefing, setBriefing] = useState(null)
  useEffect(() => {
    api.getCoachBriefing()
      .then(data => setBriefing(data.briefing))
      .catch(() => {})
  }, [])

  useEffect(() => {
    track(Events.DASHBOARD_VIEWED, { leagueCount: leagues?.length || 0 })
  }, [])

  // Show onboarding for first-time users
  useEffect(() => {
    if (!onboardingCompleted && !leaguesLoading) {
      const timer = setTimeout(() => startOnboarding(), 500)
      return () => clearTimeout(timer)
    }
  }, [onboardingCompleted, leaguesLoading, startOnboarding])

  const handleViewLeague = (league) => navigate(`/leagues/${league.id}`)
  const handleManageLineup = (league) => navigate(`/leagues/${league.id}/roster`)

  const [sportFilter, setSportFilter] = useState('all')
  const hasLeagues = leagues && leagues.length > 0
  const filteredLeagues = hasLeagues
    ? sportFilter === 'all'
      ? leagues
      : leagues.filter(l => (l.sport || 'GOLF').toLowerCase() === sportFilter)
    : []
  const hasMultipleSports = hasLeagues && new Set(leagues.map(l => (l.sport || 'GOLF').toLowerCase())).size > 1

  // Prioritize leagues by urgency: draft today > live tournament > upcoming draft > idle
  const prioritizedLeagues = [...filteredLeagues].sort((a, b) => {
    const urgency = (league) => {
      const draft = league.drafts?.[0]
      if (draft?.status === 'IN_PROGRESS' || draft?.status === 'PAUSED') return 0
      if (draft?.status === 'SCHEDULED' && draft?.scheduledFor) {
        const daysUntil = (new Date(draft.scheduledFor) - new Date()) / (1000 * 60 * 60 * 24)
        if (daysUntil <= 0) return 1
        if (daysUntil <= 3) return 2
        return 3
      }
      if (league.status === 'active') return 4
      return 5
    }
    return urgency(a) - urgency(b)
  })

  // Greeting
  const hour = new Date().getHours()
  const firstName = user?.name?.split(' ')[0] || 'Player'
  const greeting = hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Good afternoon, ${firstName}` : hour < 21 ? `Good evening, ${firstName}` : `Burning the midnight oil, ${firstName}?`

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Coach Line ── */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mb-1">
              {greeting}
            </h1>
            {briefing ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {briefing.headline}
                  {briefing.cta && (
                    <>
                      {' '}
                      <Link
                        to={briefing.cta.to}
                        className="text-[var(--crown)] font-semibold hover:text-[var(--crown)]/80 transition-colors"
                      >
                        {briefing.cta.label} &rarr;
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                {hasLeagues
                  ? `You have ${leagues.length} active league${leagues.length > 1 ? 's' : ''}. Let's get to work.`
                  : 'Create or join a league to get started.'
                }
              </p>
            )}
          </div>

          {/* ── Urgency Signals (live event, upcoming drafts) ── */}
          {(() => {
            const hasEvent = !tournamentsLoading && currentTournament
            const isLive = hasEvent && currentTournament.status === 'ACTIVE'
            const upcomingDrafts = (leagues || [])
              .filter(l => l.drafts?.[0]?.status === 'SCHEDULED' && l.drafts?.[0]?.scheduledFor)
              .sort((a, b) => new Date(a.drafts[0].scheduledFor) - new Date(b.drafts[0].scheduledFor))
              .slice(0, 2)

            if (!hasEvent && upcomingDrafts.length === 0) return null

            return (
              <div className="flex flex-wrap gap-3">
                {hasEvent && (
                  <Link
                    to={`/tournaments/${currentTournament.id}${hasLeagues ? `?league=${leagues[0].id}` : ''}`}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-colors group ${
                      isLive
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30 hover:border-emerald-500/50'
                        : 'bg-[var(--surface)] border-[var(--card-border)] hover:border-[var(--card-border-strong)]'
                    }`}
                  >
                    {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                    <span className="text-sm font-medium text-text-primary group-hover:text-[var(--field)] transition-colors">
                      {currentTournament.name}
                    </span>
                    {isLive && (
                      <span className="text-[10px] font-mono font-bold text-live-red uppercase">Live</span>
                    )}
                    {!isLive && (
                      <span className="text-[11px] text-text-muted font-mono">Upcoming</span>
                    )}
                    <svg className="w-3.5 h-3.5 text-text-primary/20 group-hover:text-[var(--field)] ml-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                {upcomingDrafts.map(dl => {
                  const draftDate = new Date(dl.drafts[0].scheduledFor)
                  const diffDays = Math.floor((draftDate - new Date()) / (1000 * 60 * 60 * 24))
                  const label = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `in ${diffDays} days`
                  return (
                    <Link
                      key={dl.id}
                      to={buildLabUrl(dl)}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--crown)]/[0.06] border border-[var(--crown)]/30 hover:border-[var(--crown)]/50 transition-colors group"
                    >
                      <svg className="w-4 h-4 text-[var(--crown)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium text-text-primary group-hover:text-[var(--crown)] transition-colors">
                        {dl.name}
                      </span>
                      <span className="text-[10px] text-[var(--crown)] font-semibold">Draft {label}</span>
                      <span className="text-xs text-[var(--crown)]/60 font-semibold ml-1">Prep &rarr;</span>
                    </Link>
                  )
                })}
              </div>
            )
          })()}

          {/* ── My Leagues ── */}
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
              <div className="flex items-center gap-2">
                <Link to="/leagues/join">
                  <Button size="sm" variant="secondary">Join</Button>
                </Link>
                <Link to="/leagues/create">
                  <Button size="sm">Create League</Button>
                </Link>
              </div>
            </div>

            {leaguesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LeagueCardSkeleton />
              </div>
            ) : prioritizedLeagues.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${prioritizedLeagues.length >= 6 ? 'max-h-[540px] overflow-y-auto scrollbar-thin pr-1' : ''}`}>
                {prioritizedLeagues.map((league) => (
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
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l3.5 5L12 3l3.5 5L19 3v12a2 2 0 01-2 2H7a2 2 0 01-2-2V3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 17h14v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-text-primary mb-2">Your league empire starts here</h3>
                  <p className="text-text-secondary mb-6 max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
                    Join other managers competing across Golf and NFL — your first championship awaits.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                    <Link to="/leagues/create">
                      <Button className="bg-gradient-to-r from-blaze to-blaze-hot hover:from-blaze-hot hover:to-blaze text-white shadow-md">Create a League</Button>
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

          {/* ── Recent Activity (minimized) ── */}
          {hasLeagues && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold font-display text-text-primary">Recent Activity</h3>
              </div>
              <ActivityFeed activity={activity} loading={activityLoading} />
            </Card>
          )}

        </div>
      </main>
    </div>
  )
}

export default Dashboard
