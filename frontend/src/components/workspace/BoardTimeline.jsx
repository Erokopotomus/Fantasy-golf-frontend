import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

function activityLabel(a) {
  const name = a.details?.playerName || 'Player'
  switch (a.action) {
    case 'board_created': return 'Board created'
    case 'player_moved': {
      const delta = a.details?.delta
      if (!delta) return `Moved ${name}`
      return `Moved ${name} ${delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`} (${a.details.from} → ${a.details.to})`
    }
    case 'player_added': return `Added ${name}`
    case 'player_removed': return `Removed ${name}`
    case 'player_tagged': {
      const tags = a.details?.tags
      if (Array.isArray(tags) && tags.length > 0) return `Tagged ${name} as ${tags.join(', ')}`
      return `Tagged ${name}`
    }
    case 'note_added': return `Note on ${name}`
    default: return a.action
  }
}

function actionIcon(action) {
  switch (action) {
    case 'board_created': return '🧪'
    case 'player_moved': return '↕'
    case 'player_added': return '+'
    case 'player_removed': return '−'
    case 'player_tagged': return '🏷'
    case 'note_added': return '📝'
    default: return '•'
  }
}

export default function BoardTimeline({ boardId }) {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDate, setExpandedDate] = useState(null)

  useEffect(() => {
    if (!boardId) return
    setLoading(true)
    api.getBoardTimeline(boardId)
      .then(res => setTimeline(res.timeline || []))
      .catch(err => console.error('Failed to load timeline:', err))
      .finally(() => setLoading(false))
  }, [boardId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-white/30">No activity yet. Start ranking players to build your timeline.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.06]" />

      <div className="space-y-4">
        {timeline.map((day, i) => {
          const isExpanded = expandedDate === day.date
          const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
          })

          return (
            <div key={day.date} className="relative pl-10">
              {/* Date dot */}
              <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-dark-secondary border-2 border-gold/40" />

              {/* Day summary */}
              <button
                onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white/50">{dateLabel}</span>
                    <p className="text-sm text-white/70 mt-0.5">{day.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20">{day.activityCount} action{day.activityCount !== 1 ? 's' : ''}</span>
                    <svg
                      className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Biggest move callout */}
                {day.biggestMove && !isExpanded && (
                  <p className="text-xs text-gold/60 mt-1">
                    Biggest move: {day.biggestMove.playerName} {day.biggestMove.delta > 0 ? '↑' : '↓'}{Math.abs(day.biggestMove.delta)} ({day.biggestMove.from} → {day.biggestMove.to})
                  </p>
                )}
              </button>

              {/* Expanded activities */}
              {isExpanded && (
                <div className="mt-2 space-y-1 ml-1">
                  {day.activities.map(a => (
                    <div key={a.id} className="flex items-start gap-2 py-1.5 text-xs">
                      <span className="w-5 text-center text-white/30 shrink-0">{actionIcon(a.action)}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/50">{activityLabel(a)}</span>
                        {a.details?.note && (
                          <p className="text-white/25 mt-0.5 italic truncate">"{a.details.note}"</p>
                        )}
                        {a.details?.reasonChips && a.details.reasonChips.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {a.details.reasonChips.map((c, ci) => (
                              <span key={ci} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-white/15 shrink-0">
                        {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
