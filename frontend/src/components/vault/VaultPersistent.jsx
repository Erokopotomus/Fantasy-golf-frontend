// VaultPersistent — The instant-display returning-visit vault experience.
// No loading screen, no animations, no shimmer — just clean, instant data.
// Shows: title, league stats, ranked owner rows, Active Only filter, detail modal on click.
// Supports live season indicators via owner.currentSeason.

import { useState, useMemo } from 'react'
import OwnerRow from './OwnerRow'
import OwnerDetailModal from './OwnerDetailModal'

export default function VaultPersistent({
  ownerStats,      // Array of owner data sorted by winPct
  leagueStats,     // { totalSeasons, totalOwners, totalGames, totalPoints, totalTitles }
  hasLiveSeason,   // Boolean — whether any owner has a current in-progress season
  onOwnerClick,    // (ownerName) => void — optional external handler
  ratings = {},     // Map: ownerName → ClutchRating object (optional)
}) {
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [activeOnly, setActiveOnly] = useState(false)

  const selectedOwnerData = selectedOwner
    ? ownerStats.find(o => o.name === selectedOwner)
    : null
  // Always compute rank against FULL list (preserves global ranking)
  const selectedOwnerRank = selectedOwner
    ? ownerStats.findIndex(o => o.name === selectedOwner) + 1
    : 0

  const handleOwnerClick = (name) => {
    setSelectedOwner(name)
    onOwnerClick?.(name)
  }

  // Filter for active-only while preserving global rank
  const displayOwners = useMemo(() => {
    if (!activeOnly) return ownerStats.map((o, i) => ({ owner: o, globalRank: i + 1 }))
    return ownerStats
      .map((o, i) => ({ owner: o, globalRank: i + 1 }))
      .filter(({ owner }) => owner.isActive)
  }, [ownerStats, activeOnly])

  const seasonCount = leagueStats.totalSeasons

  // Detect the live season year for subtitle
  const liveYear = useMemo(() => {
    if (!hasLiveSeason) return null
    for (const o of ownerStats) {
      if (o.currentSeason) return o.currentSeason.seasonYear
    }
    return null
  }, [ownerStats, hasLiveSeason])

  const statItems = [
    { label: 'Seasons', value: leagueStats.totalSeasons },
    { label: 'Owners', value: leagueStats.totalOwners },
    { label: 'Games Played', value: leagueStats.totalGames },
    { label: 'Total Points', value: leagueStats.totalPoints },
    { label: 'Championships', value: leagueStats.totalTitles },
  ]

  return (
    <>
      {/* livePulse keyframe for current season indicators */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

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
          {/* League headline — smaller, no shimmer */}
          <div className="text-center mb-12">
            <h1
              className="text-[28px] font-display font-bold tracking-tight mb-2"
              style={{ color: '#D4A853' }}
            >
              League Vault
            </h1>
            <div className="text-[13px] font-mono text-text-muted max-w-lg mx-auto">
              {seasonCount} season{seasonCount !== 1 ? 's' : ''} &middot; {leagueStats.totalOwners} owner{leagueStats.totalOwners !== 1 ? 's' : ''}
              {hasLiveSeason && liveYear && (
                <span className="ml-2" style={{ color: '#6BCB77' }}>
                  &#9679; {liveYear} Season Live
                </span>
              )}
            </div>
          </div>

          {/* Big league stats — instant display, no animation */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 mb-12">
            {statItems.map(stat => (
              <div
                key={stat.label}
                className="text-center px-3 py-5 bg-[var(--bg-alt)] rounded-xl border border-[var(--card-border)]"
              >
                <div className="text-2xl sm:text-[28px] font-display font-bold text-text-primary mb-1">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Section divider with Active Only filter */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #2A2520)' }} />
            <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.12em] flex-shrink-0">
              All-Time Owner Rankings
            </span>

            {/* Active Only toggle */}
            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className="text-[10px] font-mono px-2.5 py-1 rounded-md transition-all duration-200 flex-shrink-0"
              style={{
                border: `1px solid ${activeOnly ? '#D4A85340' : '#1C1F1D'}`,
                background: activeOnly ? '#D4A85310' : 'transparent',
                color: activeOnly ? '#D4A853' : '#4A4540',
              }}
            >
              Active Only
            </button>

            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #2A2520, transparent)' }} />
          </div>

          {/* Owner rows — instant, no stagger */}
          <div className="flex flex-col gap-2.5">
            {displayOwners.map(({ owner, globalRank }) => (
              <OwnerRow
                key={owner.name}
                owner={owner}
                rank={globalRank}
                isLeader={globalRank === 1}
                onClick={() => handleOwnerClick(owner.name)}
                animate={false}
                animationDelay={0}
                showCards={true}
                rating={ratings[owner.name] || null}
              />
            ))}
          </div>

          {/* Empty state when Active Only filters everyone */}
          {displayOwners.length === 0 && activeOnly && (
            <div className="text-center py-12">
              <div className="text-sm font-mono text-text-muted">
                No active owners found. Try turning off the Active Only filter.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
