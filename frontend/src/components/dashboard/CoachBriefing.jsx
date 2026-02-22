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

const CoachBriefing = () => {
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

  // Loading state
  if (loading) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-5 border-l-[3px] border-l-purple-500">
        <div className="flex items-center gap-2 mb-3">
          <NeuralCluster size="sm" intensity="calm" className="shrink-0" />
          <span className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider">Coach Briefing</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-5 bg-[var(--stone)] rounded w-3/4" />
          <div className="h-3 bg-[var(--stone)] rounded w-1/2" />
        </div>
      </div>
    )
  }

  // Error or no briefing — fall back to simple greeting
  if (error || !briefing) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mb-2 leading-tight">
          {greeting}
        </h1>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-5 border-l-[3px] border-l-purple-500">
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <NeuralCluster size="sm" intensity={intensity} className="shrink-0" />
          <span className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider">Coach Briefing</span>
        </div>
        <span className="text-xs text-text-muted">{greeting}</span>
      </div>

      {/* Content */}
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
    </div>
  )
}

export default CoachBriefing
