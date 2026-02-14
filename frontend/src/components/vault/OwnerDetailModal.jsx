// Full career breakdown modal — opens when clicking an OwnerRow
// Shows avatar, stats, large sparkline with year labels, and season-by-season table
// Supports current season callout via owner.currentSeason

import Sparkline from './Sparkline'
import StatGrid from './StatGrid'
import Crown from './Crown'
import RatingRing from './RatingRing'
import RatingBreakdown from './RatingBreakdown'
import RatingTierBadge from './RatingTierBadge'
import RatingConfidenceIndicator from './RatingConfidenceIndicator'

export default function OwnerDetailModal({ owner, rank, onClose, rating = null }) {
  if (!owner) return null

  const winPctStr = (owner.winPct * 100).toFixed(1)
  const statItems = [
    { label: 'Record', value: `${owner.totalWins}-${owner.totalLosses}` },
    { label: 'Win %', value: `${winPctStr}%` },
    { label: 'Titles', value: String(owner.titles), highlight: owner.titles > 0 },
    { label: 'Total PF', value: owner.totalPF.toLocaleString() },
  ]

  const currentSeason = owner.currentSeason

  // Sort seasons newest first for the table (exclude in-progress)
  const completedSeasons = [...(owner.teams || [])]
    .filter(s => !s.inProgress)
    .sort((a, b) => b.seasonYear - a.seasonYear)

  // For sparkline year labels: oldest and newest completed
  const oldestYear = completedSeasons.length > 0 ? completedSeasons[completedSeasons.length - 1].seasonYear : null
  const newestYear = completedSeasons.length > 0 ? completedSeasons[0].seasonYear : null

  return (
    <>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(5,7,6,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'modalFadeIn 0.25s ease',
        }}
      >
        {/* Modal panel */}
        <div
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-dark-border"
          style={{
            background: '#0E100F',
            animation: 'modalSlideUp 0.3s ease',
          }}
        >
          {/* Color glow bar at top */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${owner.color}, transparent)` }}
          />

          <div className="p-6 sm:p-7">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div
                className="relative w-13 h-13 rounded-xl flex items-center justify-center text-2xl font-display font-bold flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  background: `${owner.color}18`,
                  border: `2px solid ${owner.color}`,
                  color: owner.color,
                }}
              >
                {owner.name[0]}
                {rank === 1 && (
                  <div className="absolute -top-2.5 -right-1.5">
                    <Crown size={18} animated={false} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className="text-xl sm:text-[22px] font-display font-bold truncate"
                  style={{ color: owner.color }}
                >
                  {owner.name}
                </div>
                <div className="text-xs font-mono text-text-muted mt-0.5">
                  #{rank} All-Time &middot; {owner.seasonCount} season{owner.seasonCount !== 1 ? 's' : ''}
                  {currentSeason ? ' + current' : ''} &middot; {owner.isActive ? 'Active' : 'Former'}
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-text-muted hover:text-white p-1 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Clutch Rating Section */}
            {rating && rating.overall != null && (
              <div
                className="rounded-xl px-5 py-4 mb-6"
                style={{
                  background: `${owner.color}06`,
                  border: `1px solid ${owner.color}15`,
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <RatingRing
                    rating={rating.overall}
                    confidence={rating.confidence}
                    tier={rating.tier}
                    color={owner.color}
                    size="lg"
                    animate={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-display font-bold text-white">Clutch Rating</span>
                      <RatingTierBadge tier={rating.tier} size="sm" />
                    </div>
                    <RatingConfidenceIndicator
                      confidence={rating.confidence}
                      dataSourceSummary={rating.dataSourceSummary}
                    />
                  </div>
                </div>
                <RatingBreakdown
                  components={rating.components}
                  ownerColor={owner.color}
                  animate={true}
                />
              </div>
            )}

            {/* Current season callout */}
            {currentSeason && (
              <div
                className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between"
                style={{
                  background: `${owner.color}08`,
                  border: `1px solid ${owner.color}20`,
                }}
              >
                <div>
                  <div
                    className="text-[11px] font-mono font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: owner.color }}
                  >
                    {currentSeason.seasonYear} &mdash; In Progress
                  </div>
                  <div className="text-[13px] font-display text-text-secondary">
                    {currentSeason.teamName || currentSeason.rawName}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-mono font-bold ${currentSeason.wins > currentSeason.losses ? 'text-accent-green' : 'text-text-primary'}`}>
                    {currentSeason.wins}-{currentSeason.losses}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted">
                    Week {currentSeason.wins + currentSeason.losses}
                  </div>
                </div>
              </div>
            )}

            {/* Stat Grid */}
            <div className="mb-6">
              <StatGrid stats={statItems} ownerColor={owner.color} />
            </div>

            {/* Sparkline with year labels */}
            {owner.winPcts && owner.winPcts.length >= 2 && (
              <div className="mb-6">
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-2">
                  Win % by Season
                </div>
                <div className="bg-dark-tertiary/30 rounded-lg p-3 sm:p-4">
                  <Sparkline data={owner.winPcts} color={owner.color} width={420} height={48} />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-mono text-text-muted/60">{oldestYear}</span>
                    <span className="text-[10px] font-mono text-text-muted/60">{newestYear}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Season-by-season table */}
            {completedSeasons.length > 0 && (
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-2">
                  Season History
                </div>
                <div className="divide-y divide-dark-border/50">
                  {completedSeasons.map(s => {
                    const [w, l] = s.record.split('-').map(Number)
                    const recordColor = w > l ? 'text-accent-green'
                      : w < l ? 'text-red-400'
                      : 'text-text-secondary'
                    return (
                      <div
                        key={`${s.seasonYear}-${s.rawName}`}
                        className="grid items-center gap-2 py-2 px-2.5 text-xs"
                        style={{ gridTemplateColumns: '48px 1fr 56px 64px 24px' }}
                      >
                        <span className="font-mono font-semibold text-accent-gold">{s.seasonYear}</span>
                        <span className="font-display text-text-secondary truncate">{s.rawName || s.teamName}</span>
                        <span className={`font-mono font-semibold text-right ${recordColor}`}>{s.record}</span>
                        <span className="font-mono text-text-muted text-right">
                          {s.pointsFor ? s.pointsFor.toLocaleString() : '—'}
                        </span>
                        <span className="text-center">{s.playoffResult === 'champion' ? '🏆' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
