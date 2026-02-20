// Dedicated deep-dive page for the Clutch Rating system
// 6 sections: Hero, 7-Component Deep-Dive, Per-Sport, How to Improve, Compare Teaser, Rating Journey

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useClutchRating from '../hooks/useClutchRating'
import useManagerProfile from '../hooks/useManagerProfile'
import RatingRing from '../components/vault/RatingRing'
import RatingTierBadge from '../components/vault/RatingTierBadge'
import RatingTrendIndicator from '../components/vault/RatingTrendIndicator'
import RatingConfidenceIndicator from '../components/vault/RatingConfidenceIndicator'
import RatingComponentCard from '../components/vault/RatingComponentCard'

// ── Component order matching V2 weights ──────────────────────────────────────
const COMPONENT_ORDER = [
  { key: 'winRate', weight: 20 },
  { key: 'draftIQ', weight: 18 },
  { key: 'rosterMgmt', weight: 18 },
  { key: 'predictions', weight: 15 },
  { key: 'tradeAcumen', weight: 12 },
  { key: 'championships', weight: 10 },
  { key: 'consistency', weight: 7 },
]

export default function ClutchRatingPage() {
  const { user } = useAuth()
  const { rating, loading, compute } = useClutchRating(user?.id)
  const { bySport, loading: profileLoading } = useManagerProfile(user?.id)

  const isLoading = loading || profileLoading

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const isActive = rating?.overall != null
  const components = rating?.components || {}
  const activeCount = Object.values(components).filter(c => c?.active).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── 1. Hero Section ────────────────────────────────────────────────── */}
      <section className="bg-dark-secondary/60 rounded-2xl border border-white/[0.06] p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Rating Ring */}
          <div className="shrink-0">
            <RatingRing
              rating={isActive ? rating.overall : null}
              confidence={rating?.confidence || 0}
              tier={rating?.tier || 'UNRANKED'}
              size="lg"
              animate={true}
            />
          </div>

          {/* Score + meta */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 className="text-3xl font-display font-bold text-white">
                {isActive ? rating.overall : 'Clutch Rating'}
              </h1>
              {isActive && <RatingTrendIndicator trend={rating.trend} />}
            </div>

            {isActive && rating.tier && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <RatingTierBadge tier={rating.tier} size="md" />
              </div>
            )}

            {isActive ? (
              <div className="max-w-sm mx-auto md:mx-0">
                <RatingConfidenceIndicator
                  confidence={rating.confidence}
                  dataSourceSummary={rating.dataSourceSummary}
                />
              </div>
            ) : (
              <p className="text-sm text-white/40 max-w-sm mx-auto md:mx-0">
                {activeCount > 0
                  ? `${activeCount} of 7 components active. Keep going to unlock your Clutch Rating.`
                  : 'Import league history, complete drafts, and make predictions to build your Clutch Rating.'}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
              <button
                onClick={compute}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold/15 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold/25 transition-colors"
              >
                Recompute Rating
              </button>
              {isActive && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/my-rating`
                    navigator.clipboard.writeText(url)
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white/[0.04] text-white/50 border border-white/[0.08] hover:text-white/70 transition-colors"
                >
                  Share
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. 7-Component Deep-Dive ──────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-display font-bold text-white mb-1">Rating Components</h2>
        <p className="text-xs text-white/30 mb-4">
          Your Clutch Rating is built from 7 weighted components. Expand each to see what feeds it and how to improve.
        </p>
        <div className="space-y-2">
          {COMPONENT_ORDER.map(({ key }) => (
            <RatingComponentCard
              key={key}
              componentKey={key}
              componentData={components[key]}
            />
          ))}
        </div>
      </section>

      {/* ── 3. Per-Sport Breakdown ────────────────────────────────────────── */}
      {bySport && bySport.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-bold text-white mb-1">Per-Sport Breakdown</h2>
          <p className="text-xs text-white/30 mb-4">
            See which sports contribute to your overall rating.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bySport.map((sp) => {
              const sportName = sp.sport?.name || 'Unknown'
              const isNfl = sportName.toLowerCase().includes('football') || sportName.toLowerCase() === 'nfl'
              return (
                <div
                  key={sp.id}
                  className="p-4 bg-dark-secondary/60 rounded-xl border border-white/[0.06]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{isNfl ? '🏈' : '⛳'}</span>
                    <h3 className="text-sm font-semibold text-white">{sportName}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-mono font-bold text-white">{sp.wins || 0}</p>
                      <p className="text-[10px] text-white/40">Wins</p>
                    </div>
                    <div>
                      <p className="text-lg font-mono font-bold text-accent-gold">{sp.championships || 0}</p>
                      <p className="text-[10px] text-white/40">Titles</p>
                    </div>
                    <div>
                      <p className="text-lg font-mono font-bold text-white">
                        {sp.winPct != null ? `${(sp.winPct * 100).toFixed(0)}%` : '—'}
                      </p>
                      <p className="text-[10px] text-white/40">Win %</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 4. How to Improve ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-display font-bold text-white mb-1">How to Improve</h2>
        <p className="text-xs text-white/30 mb-4">
          Take action to strengthen your rating across all components.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* The Lab */}
          <Link
            to="/lab"
            className="group p-5 bg-dark-secondary/60 rounded-xl border border-white/[0.06] hover:border-purple-400/30 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors mb-1">
              The Lab
            </h3>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Build draft boards and plan rosters. Feeds <span className="text-purple-300/70">Draft IQ</span> and <span className="text-purple-300/70">Roster Management</span>.
            </p>
          </Link>

          {/* Prove It */}
          <Link
            to="/prove-it"
            className="group p-5 bg-dark-secondary/60 rounded-xl border border-white/[0.06] hover:border-accent-gold/30 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-gold/15 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-accent-gold transition-colors mb-1">
              Prove It
            </h3>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Make predictions and build your track record. Feeds <span className="text-accent-gold/70">Prediction Accuracy</span>.
            </p>
          </Link>

          {/* League Vault */}
          <Link
            to="/import"
            className="group p-5 bg-dark-secondary/60 rounded-xl border border-white/[0.06] hover:border-accent-gold/30 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-gold/15 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.5} />
                <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-accent-gold transition-colors mb-1">
              League Vault
            </h3>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Import your league history from other platforms. Feeds <span className="text-accent-gold/70">Win Rate</span> and <span className="text-accent-gold/70">Championships</span>.
            </p>
          </Link>
        </div>
      </section>

      {/* ── 5. How Do You Compare? (Teaser) ───────────────────────────────── */}
      <section className="p-5 bg-dark-secondary/60 rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">How Do You Compare?</h3>
            <p className="text-[11px] text-white/40">
              Rating leaderboards coming soon. See where you stack up against other managers on the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Rating Journey ─────────────────────────────────────────────── */}
      <section className="p-5 bg-dark-secondary/60 rounded-xl border border-white/[0.06]">
        <h2 className="text-sm font-display font-bold text-white mb-3">Your Rating Journey</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Active Since</p>
            <p className="text-sm font-mono text-white/60">
              {rating?.activeSince
                ? new Date(rating.activeSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Last Updated</p>
            <p className="text-sm font-mono text-white/60">
              {rating?.updatedAt
                ? new Date(rating.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Trend</p>
            <p className="text-sm text-white/60 flex items-center justify-center gap-1">
              {rating?.trend ? (
                <>
                  <RatingTrendIndicator trend={rating.trend} />
                  <span className="capitalize">{rating.trend}</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Manager profile link */}
      {user?.id && (
        <div className="text-center">
          <Link
            to={`/manager/${user.id}`}
            className="text-xs text-white/30 hover:text-accent-gold transition-colors font-mono"
          >
            View full Manager Profile &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
