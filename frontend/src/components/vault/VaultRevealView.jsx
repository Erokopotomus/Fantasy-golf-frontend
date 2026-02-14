// VaultRevealView — The animated first-visit vault experience.
// Shared between the assignment wizard Step 3 and the standalone first-visit vault page.
// Shows: shimmer title, counting stats, cascading owner rows, detail modal on click.

import { useState, useEffect } from 'react'
import AnimatedNumber from './AnimatedNumber'
import OwnerRow from './OwnerRow'
import OwnerDetailModal from './OwnerDetailModal'

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
}) {
  const [selectedOwner, setSelectedOwner] = useState(null)

  const selectedOwnerData = selectedOwner
    ? ownerStats.find(o => o.name === selectedOwner)
    : null
  const selectedOwnerRank = selectedOwner
    ? ownerStats.findIndex(o => o.name === selectedOwner) + 1
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
            className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 mb-12"
            style={{ animation: 'vaultFadeUp 0.8s ease 0.6s both' }}
          >
            {[
              { label: 'Seasons', value: leagueStats.totalSeasons },
              { label: 'Owners', value: leagueStats.totalOwners },
              { label: 'Games Played', value: leagueStats.totalGames },
              { label: 'Total Points', value: leagueStats.totalPoints },
              { label: 'Championships', value: leagueStats.totalTitles },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="text-center px-3 py-5 bg-dark-secondary/60 rounded-xl border border-dark-border"
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

          {/* Section divider */}
          <div
            className="flex items-center gap-3 mb-6"
            style={{ animation: 'vaultFadeUp 0.8s ease 1s both' }}
          >
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #2A2520)' }} />
            <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.12em] flex-shrink-0">
              All-Time Owner Rankings
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #2A2520, transparent)' }} />
          </div>

          {/* Owner rows */}
          <div className="flex flex-col gap-2.5">
            {ownerStats.map((owner, i) => (
              <OwnerRow
                key={owner.name}
                owner={owner}
                rank={i + 1}
                isLeader={i === 0}
                onClick={() => handleOwnerClick(owner.name)}
                animate={true}
                animationDelay={1.2 + i * 0.1}
                showCards={showCards}
              />
            ))}
          </div>

          {/* Bottom CTA slot */}
          {children && (
            <div
              className="text-center mt-12 pt-8 border-t border-dark-border/50"
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
