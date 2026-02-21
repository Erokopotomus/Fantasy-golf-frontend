// Dashboard widget showing the user's Clutch Rating with progressive unlock states
// States: Locked (0-2 active components), Activating (3+), Active (rating calculated)

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useClutchRating from '../../hooks/useClutchRating'
import RatingRing from '../vault/RatingRing'
import RatingBreakdown from '../vault/RatingBreakdown'
import RatingTierBadge from '../vault/RatingTierBadge'
import RatingTrendIndicator from '../vault/RatingTrendIndicator'
import RatingConfidenceIndicator from '../vault/RatingConfidenceIndicator'

const COMPONENT_UNLOCK_ACTIONS = [
  { key: 'winRate', label: 'Win Rate', action: 'Import league history', link: '/import' },
  { key: 'draftIQ', label: 'Draft IQ', action: 'Complete a draft', link: null },
  { key: 'rosterMgmt', label: 'Roster Mgmt', action: 'Set lineups', link: null },
  { key: 'predictions', label: 'Predictions', action: 'Make predictions', link: '/prove-it' },
  { key: 'championships', label: 'Championships', action: 'Import league history', link: '/import' },
  { key: 'consistency', label: 'Consistency', action: 'Play 2+ seasons', link: null },
]

export default function DashboardRatingWidget() {
  const { user } = useAuth()
  const { rating, loading } = useClutchRating(user?.id)

  if (loading) {
    return (
      <div className="bg-dark-secondary/60 rounded-xl border border-dark-border p-5">
        <div className="h-6 w-32 bg-dark-tertiary/50 rounded animate-pulse mb-3" />
        <div className="h-16 w-16 rounded-full bg-dark-tertiary/50 animate-pulse mx-auto mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-dark-tertiary/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Count active components
  const components = rating?.components || {}
  const activeCount = Object.values(components).filter(c => c?.active).length
  const totalComponents = 6 // Excluding trade acumen (deferred)

  // Determine state
  const isActive = rating?.overall != null
  const isActivating = !isActive && activeCount >= 3
  const isLocked = !isActive && !isActivating

  return (
    <div className="bg-dark-secondary/60 rounded-xl border border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">&#9889;</span>
          <span className="text-sm font-display font-bold text-text-primary">Clutch Rating</span>
        </div>
        {isActive && rating.tier && (
          <RatingTierBadge tier={rating.tier} size="sm" />
        )}
      </div>

      <div className="px-5 pb-5">
        {/* ─── Active State ─── */}
        {isActive && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <RatingRing
                rating={rating.overall}
                confidence={rating.confidence}
                tier={rating.tier}
                size="lg"
                animate={false}
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-2xl font-mono font-bold text-text-primary">{rating.overall}</span>
                  <RatingTrendIndicator trend={rating.trend} />
                </div>
                <RatingConfidenceIndicator
                  confidence={rating.confidence}
                  dataSourceSummary={rating.dataSourceSummary}
                />
              </div>
            </div>
            <RatingBreakdown components={rating.components} animate={false} />
            <Link
              to="/my-rating"
              className="block mt-3 text-center text-[11px] font-mono text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              View full rating breakdown &rarr;
            </Link>
          </>
        )}

        {/* ─── Activating State ─── */}
        {isActivating && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <RatingRing
                rating={null}
                confidence={0}
                tier="DEVELOPING"
                size="lg"
              />
              <div className="flex-1">
                <div className="text-sm font-display font-semibold text-text-primary mb-1">
                  Almost There!
                </div>
                <div className="text-xs font-mono text-text-muted">
                  {activeCount} of {totalComponents} components active
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: totalComponents }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < activeCount ? 'bg-accent-gold' : 'bg-dark-tertiary'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <RatingBreakdown components={components} animate={false} />
            <Link
              to="/my-rating"
              className="block mt-3 text-center text-[11px] font-mono text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              View full rating breakdown &rarr;
            </Link>
          </>
        )}

        {/* ─── Locked State ─── */}
        {isLocked && (
          <>
            <div className="text-center py-2 mb-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-stone/30 mb-3">
                <span className="text-2xl text-text-primary/20">🔒</span>
              </div>
              <div className="text-xs font-mono text-text-muted mb-1">
                {activeCount > 0
                  ? `${activeCount} of ${totalComponents} components active`
                  : 'No data yet'
                }
              </div>
              <div className="flex gap-1 justify-center max-w-[160px] mx-auto">
                {Array.from({ length: totalComponents }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < activeCount ? 'bg-accent-gold' : 'bg-dark-tertiary'}`}
                  />
                ))}
              </div>
            </div>

            {/* Unlock actions */}
            <div className="space-y-1.5">
              {COMPONENT_UNLOCK_ACTIONS.filter(c => !components[c.key]?.active).slice(0, 3).map(c => (
                <div key={c.key} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-dark-tertiary/30">
                  <span className="text-text-muted font-sans">{c.label}</span>
                  {c.link ? (
                    <Link to={c.link} className="text-accent-gold font-mono text-[10px] hover:underline">
                      {c.action} &rarr;
                    </Link>
                  ) : (
                    <span className="text-text-muted/50 font-mono text-[10px]">{c.action}</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              to="/my-rating"
              className="block mt-3 text-center text-[11px] font-mono text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              View full rating breakdown &rarr;
            </Link>
          </>
        )}

        {/* Import CTA — always shown */}
        {(!isActive || rating?.confidence < 60) && (
          <Link
            to="/import"
            className="block mt-4 text-center py-2 rounded-lg border border-accent-gold/15 text-[11px] font-mono text-accent-gold hover:bg-accent-gold/5 transition-colors"
          >
            Have league history? Import to boost your rating &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}
