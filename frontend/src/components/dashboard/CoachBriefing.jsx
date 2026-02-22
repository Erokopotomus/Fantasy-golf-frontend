import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NeuralCluster from '../common/NeuralCluster'
import api from '../../services/api'

const getGreeting = (name) => {
  const hour = new Date().getHours()
  const first = name?.split(' ')[0] || 'Player'
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 17) return `Good afternoon, ${first}`
  if (hour < 21) return `Good evening, ${first}`
  return `Burning the midnight oil, ${first}?`
}

const CoachBriefing = ({ feedCards = [], feedLoading = false }) => {
  const { user } = useAuth()
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.getCoachBriefing()
      .then(data => setBriefing(data.briefing))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const greeting = getGreeting(user?.name)
  const intensity = briefing?.type === 'live' ? 'active' : 'calm'
  const hasFeed = feedCards.length > 0 || feedLoading

  // Error or no briefing — fall back to simple greeting with feed
  if ((error || !briefing) && !loading) {
    return (
      <div className="flex items-center gap-4 mb-2">
        <NeuralCluster size="sm" intensity="calm" className="shrink-0" />
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary leading-tight">
          {greeting}
        </h1>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Coach Briefing — takes 2 cols on desktop */}
      <div className={`relative overflow-hidden rounded-xl border border-purple-200 dark:border-purple-500/20 bg-gradient-to-br from-purple-50 via-white to-white dark:from-purple-500/[0.08] dark:via-[var(--surface)] dark:to-[var(--surface)] p-5 shadow-sm dark:shadow-none ${hasFeed ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        {/* Background sphere */}
        <div className="absolute -right-4 -top-4 opacity-[0.15] dark:opacity-[0.12] pointer-events-none">
          <NeuralCluster size="lg" intensity={intensity} />
        </div>

        <div className="relative z-10">
          {/* Label row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <NeuralCluster size="sm" intensity={intensity} className="shrink-0" />
              <span className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider">Coach Briefing</span>
            </div>
            <span className="text-xs text-text-muted">{greeting}</span>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-5 bg-[var(--stone)] rounded w-3/4" />
              <div className="h-3 bg-[var(--stone)] rounded w-1/2" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-display font-bold text-text-primary leading-snug mb-1">
                  {briefing.headline}
                </h2>
                {briefing.body && (
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {briefing.body}
                  </p>
                )}
              </div>
              {briefing.cta && (
                <Link
                  to={briefing.cta.to}
                  className="text-sm font-semibold text-[var(--crown)] hover:text-[var(--crown)]/80 transition-colors flex items-center gap-1 shrink-0 mt-1"
                >
                  {briefing.cta.label}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Latest Updates — right column */}
      {hasFeed && (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] p-4 lg:col-span-1 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xs font-semibold font-display text-text-primary">Latest Updates</h2>
            </div>
            <Link
              to="/feed"
              className="text-gold text-[10px] font-semibold hover:text-gold/80 transition-colors flex items-center gap-0.5"
            >
              Feed
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {feedLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2.5 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--stone)] flex-shrink-0" />
                  <div className="h-3 bg-[var(--stone)] rounded flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {feedCards.slice(0, 4).map(card => (
                <Link
                  key={card.id}
                  to={card.actions?.[0]?.href || '/feed'}
                  className="flex items-start gap-2.5 group"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: card.category === 'Big Performance' ? '#EF4444' : card.category === 'Stat Leader' ? '#F59E0B' : card.category === 'Team Trend' ? '#3B82F6' : card.category === 'Game Result' ? '#10B981' : '#F59E0B' }}
                  />
                  <span className="text-text-primary/60 text-xs leading-snug group-hover:text-text-primary transition-colors line-clamp-2">
                    {card.headline}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CoachBriefing
