// Horizontal owner card for the all-time rankings list
// Used in VaultReveal (animated) and VaultPersistent (instant)
// Clicking opens the OwnerDetailModal
// Supports live season indicator via owner.currentSeason

import Sparkline from './Sparkline'
import Crown from './Crown'
import RatingRing from './RatingRing'
import RatingTrendIndicator from './RatingTrendIndicator'

export default function OwnerRow({
  owner,        // { name, color, isActive, totalWins, totalLosses, totalPF, winPct, titles, seasonCount, bestSeason, winPcts, currentSeason? }
  rank,         // 1-indexed
  isLeader,     // rank === 1
  onClick,
  animate = true,
  animationDelay = 0,
  showCards = true,
  rating = null, // ClutchRating object or null
}) {
  const winPctStr = (owner.winPct * 100).toFixed(1)
  const pfStr = owner.totalPF >= 1000
    ? `${(owner.totalPF / 1000).toFixed(1)}k`
    : owner.totalPF.toFixed(0)

  const winPctColor = owner.winPct >= 0.6 ? 'text-accent-green'
    : owner.winPct < 0.5 ? 'text-red-400'
    : 'text-text-primary'

  const currentSeason = owner.currentSeason

  return (
    <>
      {animate && (
        <style>{`
          @keyframes vaultFadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes livePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
      {/* livePulse keyframe needed even without animate for returning mode */}
      {!animate && currentSeason && (
        <style>{`
          @keyframes livePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
      <button
        onClick={onClick}
        className={`w-full group relative overflow-hidden rounded-xl border transition-all duration-250 cursor-pointer
          ${isLeader
            ? 'bg-[var(--surface)] border-accent-gold/15'
            : 'bg-[var(--bg-alt)] border-[var(--card-border)] hover:border-[var(--card-border)]'
          }
          hover:-translate-y-1 hover:shadow-lg`}
        style={{
          animation: animate && showCards
            ? `vaultFadeUp 0.5s ease ${animationDelay}s both`
            : 'none',
          opacity: animate && !showCards ? 0 : undefined,
        }}
      >
        {/* Leader top glow bar */}
        {isLeader && (
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent 10%, ${owner.color}80 50%, transparent 90%)`,
            }}
          />
        )}

        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at left, ${owner.color}08 0%, transparent 60%)`,
          }}
        />

        {/* Desktop layout: 9-column grid (with rating ring) */}
        <div className="hidden md:grid items-center gap-3 px-5 py-3.5"
          style={{ gridTemplateColumns: `44px ${rating ? '48px ' : ''}44px 1fr 120px 80px 70px 56px 56px` }}
        >
          {/* Rank */}
          <div className={`text-center font-mono font-bold ${isLeader ? 'text-accent-gold text-lg' : 'text-text-muted text-base'}`}>
            {isLeader ? (
              <div className="flex flex-col items-center">
                <Crown size={18} animated={animate} />
                <span className="-mt-0.5">1</span>
              </div>
            ) : rank}
          </div>

          {/* Rating Ring (if available) */}
          {rating && (
            <div className="flex justify-center">
              <RatingRing
                rating={rating.overall}
                confidence={rating.confidence}
                tier={rating.tier}
                color={owner.color}
                size="sm"
                animate={animate}
              />
            </div>
          )}

          {/* Avatar */}
          <div className="relative">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[17px] font-display font-bold transition-colors duration-200"
              style={{
                background: `${owner.color}15`,
                border: `2px solid ${owner.color}60`,
                color: owner.color,
              }}
            >
              {owner.name[0]}
            </div>
            {/* Live season pulse dot */}
            {currentSeason && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)]"
                style={{ background: '#6BCB77' }}
              >
                <div className="w-full h-full rounded-full"
                  style={{ background: '#6BCB77', animation: 'livePulse 2s ease infinite' }}
                />
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-display font-bold truncate ${isLeader ? 'text-accent-gold' : 'text-text-primary'}`}>
                {owner.name}
              </span>
              {rating && <RatingTrendIndicator trend={rating.trend} />}
              {!owner.isActive && (
                <span className="text-[9px] font-mono text-text-muted bg-[var(--bg-alt)] px-1.5 py-0.5 rounded flex-shrink-0">
                  FORMER
                </span>
              )}
              {/* Current season record inline */}
              {currentSeason && (
                <span className="text-[10px] font-mono text-accent-green font-medium flex-shrink-0">
                  {currentSeason.wins}-{currentSeason.losses}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-text-muted mt-0.5 truncate">
              {owner.seasonCount} season{owner.seasonCount !== 1 ? 's' : ''}
              {owner.bestSeason && (
                <span> &middot; Best: {owner.bestSeason.team} ({owner.bestSeason.season})</span>
              )}
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex justify-center">
            <Sparkline data={owner.winPcts} color={owner.color} width={100} height={28} />
          </div>

          {/* Record */}
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-text-primary">{owner.totalWins}-{owner.totalLosses}</div>
            <div className="text-[10px] font-mono text-text-muted">Record</div>
          </div>

          {/* Win % */}
          <div className="text-right">
            <div className={`text-sm font-mono font-bold ${winPctColor}`}>{winPctStr}%</div>
            <div className="text-[10px] font-mono text-text-muted">Win %</div>
          </div>

          {/* PF */}
          <div className="text-right">
            <div className="text-[13px] font-mono font-semibold text-text-secondary">{pfStr}</div>
            <div className="text-[10px] font-mono text-text-muted">PF</div>
          </div>

          {/* Titles */}
          <div className="text-center">
            {owner.titles > 0 ? (
              <div className="text-sm">{'🏆'.repeat(Math.min(owner.titles, 5))}</div>
            ) : (
              <div className="text-[11px] text-text-muted/40">&mdash;</div>
            )}
          </div>
        </div>

        {/* Mobile layout: stacked */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div className={`w-8 text-center font-mono font-bold flex-shrink-0 ${isLeader ? 'text-accent-gold' : 'text-text-muted'}`}>
              {isLeader ? (
                <div className="flex flex-col items-center">
                  <Crown size={14} animated={animate} />
                  <span className="text-sm -mt-0.5">1</span>
                </div>
              ) : (
                <span className="text-sm">{rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-display font-bold"
                style={{ background: `${owner.color}15`, border: `2px solid ${owner.color}60`, color: owner.color }}
              >
                {owner.name[0]}
              </div>
              {currentSeason && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-[var(--surface)]"
                  style={{ background: '#6BCB77' }}
                >
                  <div className="w-full h-full rounded-full"
                    style={{ background: '#6BCB77', animation: 'livePulse 2s ease infinite' }}
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-display font-bold truncate ${isLeader ? 'text-accent-gold' : 'text-text-primary'}`}>
                  {owner.name}
                </span>
                {!owner.isActive && (
                  <span className="text-[8px] font-mono text-text-muted bg-[var(--bg-alt)] px-1 py-0.5 rounded flex-shrink-0">
                    FORMER
                  </span>
                )}
                {currentSeason && (
                  <span className="text-[9px] font-mono text-accent-green font-medium flex-shrink-0">
                    {currentSeason.wins}-{currentSeason.losses}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-text-muted mt-0.5">
                {owner.totalWins}-{owner.totalLosses} &middot; {winPctStr}% &middot; {pfStr} PF
                {owner.titles > 0 && <span> &middot; {'🏆'.repeat(Math.min(owner.titles, 3))}</span>}
              </div>
            </div>

            {/* Mini sparkline */}
            <div className="flex-shrink-0">
              <Sparkline data={owner.winPcts} color={owner.color} width={60} height={22} />
            </div>
          </div>
        </div>
      </button>
    </>
  )
}
