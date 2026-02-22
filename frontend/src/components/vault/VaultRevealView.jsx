// VaultRevealView — The animated first-visit vault experience.
// Shared between the assignment wizard Step 3 and the standalone first-visit vault page.
// Shows: shimmer title, counting stats, cascading owner rows, detail modal on click.

import { useState, useEffect, useMemo } from 'react'
import AnimatedNumber from './AnimatedNumber'
import OwnerRow from './OwnerRow'
import OwnerDetailModal from './OwnerDetailModal'
import RatingTierBadge from './RatingTierBadge'

const REVEAL_KEYFRAMES = `
  @keyframes vaultFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes vaultShimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`

export default function VaultRevealView({
  ownerStats,      // Array of owner data sorted by winPct
  leagueStats,     // { totalSeasons, totalOwners, totalGames, totalPoints, totalTitles }
  showCards,        // Boolean — true when cards should start animating in
  onOwnerClick,     // (ownerName) => void — optional external handler
  children,         // Slot for bottom CTA area (save button, etc.)
  ratings = {},     // Map: ownerName → ClutchRating object (optional)
}) {
  const [selectedOwner, setSelectedOwner] = useState(null)

  // Sort by Clutch Rating when available, fall back to winPct
  const sortedOwners = useMemo(() => {
    const hasRatings = Object.keys(ratings).length > 0
    if (!hasRatings) return ownerStats
    return [...ownerStats].sort((a, b) => {
      const rA = ratings[a.name]?.overall ?? -1
      const rB = ratings[b.name]?.overall ?? -1
      return rB - rA
    })
  }, [ownerStats, ratings])

  // Compute average rating for the league stat bar
  const avgRating = useMemo(() => {
    const ratingValues = Object.values(ratings).filter(r => r?.overall != null).map(r => r.overall)
    if (ratingValues.length === 0) return null
    return Math.round(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length)
  }, [ratings])

  const selectedOwnerData = selectedOwner
    ? sortedOwners.find(o => o.name === selectedOwner)
    : null
  const selectedOwnerRank = selectedOwner
    ? sortedOwners.findIndex(o => o.name === selectedOwner) + 1
    : 0

  const handleOwnerClick = (name) => {
    setSelectedOwner(name)
    onOwnerClick?.(name)
  }

  const seasonCount = leagueStats.totalSeasons

  return (
    <>
      <style>{REVEAL_KEYFRAMES}</style>

      {/* Owner Detail Modal */}
      {selectedOwnerData && (
        <OwnerDetailModal
          owner={selectedOwnerData}
          rank={selectedOwnerRank}
          onClose={() => setSelectedOwner(null)}
          rating={ratings[selectedOwnerData.name] || null}
        />
      )}

      <div className="relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.03) 0%, transparent 70%)' }}
        />

        <div className="max-w-[1100px] mx-auto relative">
          {/* League headline */}
          <div
            className="text-center mb-12"
            style={{ animation: 'vaultFadeUp 0.8s ease 0.2s both' }}
          >
            <div className="text-[11px] font-mono text-text-muted uppercase tracking-[0.15em] mb-3">
              Your League History is Ready
            </div>
            <h1
              className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2"
              style={{
                background: 'linear-gradient(90deg, #D4A853, #FFF3C4, #D4A853)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'vaultShimmer 3s ease-in-out infinite',
              }}
            >
              League Vault
            </h1>
            <div className="text-[13px] font-mono text-text-muted max-w-lg mx-auto">
              {seasonCount} year{seasonCount !== 1 ? 's' : ''} of history, unified for the first time
            </div>
          </div>

          {/* Big league stats */}
          <div
            className={`grid gap-3 sm:gap-4 mb-12 ${avgRating != null ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5'}`}
            style={{ animation: 'vaultFadeUp 0.8s ease 0.6s both' }}
          >
            {[
              { label: 'Seasons', value: leagueStats.totalSeasons },
              { label: 'Owners', value: leagueStats.totalOwners },
              { label: 'Games Played', value: leagueStats.totalGames },
              { label: 'Total Points', value: leagueStats.totalPoints },
              { label: 'Championships', value: leagueStats.totalTitles },
              ...(avgRating != null ? [{ label: 'Avg Rating', value: avgRating, isRating: true }] : []),
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="text-center px-3 py-5 bg-[var(--bg-alt)] rounded-xl border border-[var(--card-border)]"
              >
                <div className="text-2xl sm:text-[28px] font-display font-bold text-text-primary mb-1">
                  <AnimatedNumber
                    target={stat.value}
                    delay={800 + i * 150}
                    duration={1400}
                  />
                </div>
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Rating Introduction Card (shown when ratings are available) */}
          {Object.keys(ratings).length > 0 && (
            <div
              className="mb-10 rounded-xl border border-accent-gold/10 overflow-hidden"
              style={{ animation: 'vaultFadeUp 0.8s ease 0.9s both' }}
            >
              <div className="px-5 py-4 bg-accent-gold/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">&#9889;</span>
                  <span className="text-sm font-display font-bold text-accent-gold">Introducing Clutch Rating</span>
                </div>
                <p className="text-xs font-sans text-text-secondary leading-relaxed mb-2">
                  Every owner now has a Clutch Rating — a composite score from 0 to 100 measuring fantasy skill
                  across win rate, championships, consistency, and more. Owners are ranked by their rating below.
                </p>
                <p className="text-[11px] font-mono text-text-muted">
                  This is just the beginning. As you use Clutch — drafting, setting lineups, making predictions — your rating
                  unlocks more dimensions and becomes more accurate.
                </p>
              </div>
            </div>
          )}

          {/* Section divider */}
          <div
            className="flex items-center gap-3 mb-6"
            style={{ animation: 'vaultFadeUp 0.8s ease 1s both' }}
          >
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #2A2520)' }} />
            <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.12em] flex-shrink-0">
              {Object.keys(ratings).length > 0 ? 'Clutch Rating Rankings' : 'All-Time Owner Rankings'}
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #2A2520, transparent)' }} />
          </div>

          {/* Owner rows */}
          <div className="flex flex-col gap-2.5">
            {sortedOwners.map((owner, i) => (
              <OwnerRow
                key={owner.name}
                owner={owner}
                rank={i + 1}
                isLeader={i === 0}
                onClick={() => handleOwnerClick(owner.name)}
                animate={true}
                animationDelay={1.2 + i * 0.1}
                showCards={showCards}
                rating={ratings[owner.name] || null}
              />
            ))}
          </div>

          {/* Bottom CTA slot */}
          {children && (
            <div
              className="text-center mt-12 pt-8 border-t border-[var(--card-border)]/50"
              style={{
                animation: showCards
                  ? `vaultFadeUp 0.8s ease ${1.2 + ownerStats.length * 0.1 + 0.3}s both`
                  : 'none',
                opacity: showCards ? undefined : 0,
              }}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
