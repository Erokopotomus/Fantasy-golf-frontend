import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/**
 * DecisionTimeline — Surfaces the Opinion Timeline for a "your journey with players" view.
 * Shows last 10-15 opinion events with event badges and sentiment dots.
 */
export default function DecisionTimeline({ sport = 'golf', limit = 15 }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDecisionTimeline(sport, limit)
      .then(res => setEvents(res.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [sport, limit])

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">Decision Timeline</h2>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--stone)] rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (events.length === 0) return null

  return (
    <div className="mb-6 p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl">
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">Decision Timeline</h2>

      {/* Vertical timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--card-border)]" />

        <div className="space-y-0.5">
          {events.map((event, i) => (
            <div key={i} className="relative flex items-start gap-3 py-1.5 pl-7">
              {/* Dot on timeline */}
              <div className={`absolute left-[9px] top-3 w-1.5 h-1.5 rounded-full shrink-0 ${
                sentimentDotColor(event.sentiment)
              }`} />

              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <EventBadge type={event.eventType} />
                    <span className="text-xs text-text-primary/70 truncate">
                      {event.playerName || 'Unknown'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-text-primary/20 shrink-0 whitespace-nowrap">
                  {formatDate(event.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const EVENT_BADGE_MAP = {
  BOARD_ADD: { label: 'Added to Board', color: 'bg-blue-500/15 text-blue-400' },
  BOARD_REMOVE: { label: 'Removed from Board', color: 'bg-red-500/15 text-red-400' },
  BOARD_TAG: { label: 'Tagged', color: 'bg-emerald-500/15 text-emerald-400' },
  WATCH_ADD: { label: 'Watching', color: 'bg-purple-500/15 text-purple-400' },
  WATCH_REMOVE: { label: 'Unwatched', color: 'bg-text-primary/10 text-text-primary/40' },
  DRAFT_PICK: { label: 'Drafted', color: 'bg-[var(--crown)]/15 text-[var(--crown)]' },
  WAIVER_ADD: { label: 'Claimed', color: 'bg-emerald-500/15 text-emerald-400' },
  WAIVER_DROP: { label: 'Dropped', color: 'bg-red-500/15 text-red-400' },
  TRADE_ACQUIRE: { label: 'Traded For', color: 'bg-emerald-500/15 text-emerald-400' },
  TRADE_AWAY: { label: 'Traded Away', color: 'bg-red-500/15 text-red-400' },
  LINEUP_START: { label: 'Started', color: 'bg-emerald-500/15 text-emerald-400' },
  LINEUP_BENCH: { label: 'Benched', color: 'bg-text-primary/10 text-text-primary/40' },
  CAPTURE: { label: 'Captured', color: 'bg-purple-500/15 text-purple-400' },
}

function EventBadge({ type }) {
  const badge = EVENT_BADGE_MAP[type] || { label: type, color: 'bg-text-primary/10 text-text-primary/40' }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badge.color}`}>
      {badge.label}
    </span>
  )
}

function sentimentDotColor(sentiment) {
  if (sentiment === 'positive') return 'bg-emerald-400'
  if (sentiment === 'negative') return 'bg-red-400'
  return 'bg-[var(--stone)]'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
