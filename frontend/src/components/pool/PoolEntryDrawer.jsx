import { useEffect } from 'react'

/**
 * Slide-in drawer showing a single pool entry's roster with live tournament scoring.
 * Tap any pick to open the player drawer (handled by parent via onPlayerClick).
 */
export default function PoolEntryDrawer({ entry, rank, totalEntries, liveByPlayer, isOpen, onClose, onPlayerClick, onEditPicks, scoringMode = 'to_par' }) {
  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !entry) return null

  // Mode-aware total + label for the hero number
  const isToPar = scoringMode === 'to_par'
  const totalValue = isToPar
    ? (entry.totalScoreToPar == null ? '—' : entry.totalScoreToPar === 0 ? 'E' : (entry.totalScoreToPar > 0 ? `+${entry.totalScoreToPar}` : `${entry.totalScoreToPar}`))
    : (entry.totalFantasyPoints != null ? entry.totalFantasyPoints.toFixed(1) : '—')
  const totalLabel = isToPar ? 'To par' : 'Fantasy pts'

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-[var(--surface)] z-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-text-2/15 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-2 mb-1">
              {rank ? `Rank #${rank}${totalEntries ? ` of ${totalEntries}` : ''}` : 'Entry'}
            </div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary truncate">{entry.teamName}</h2>
            {entry.entrantName && (
              <div className="font-editorial italic text-sm text-text-2 truncate">{entry.entrantName}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-2 hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Total points hero */}
        <div className="px-5 py-5 border-b border-text-2/10 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono font-extrabold text-5xl text-blaze leading-none">{totalValue}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-text-2">{totalLabel}</span>
          </div>
          {onEditPicks && (
            <button
              onClick={() => { onClose?.(); onEditPicks(); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-text-2/25 hover:border-blaze/40 hover:text-blaze text-text-primary font-display font-semibold text-sm px-3 py-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit picks
            </button>
          )}
        </div>

        {/* Picks hidden until tournament starts */}
        {entry.picksHidden && (
          <div className="px-5 py-8 text-center border-b border-text-2/10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blaze/10 mb-3">
              <svg className="w-7 h-7 text-blaze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="font-display font-bold text-text-primary text-base mb-1">Picks revealed at tee time</div>
            <p className="font-editorial italic text-sm text-text-2 max-w-[260px] mx-auto">
              Everyone's roster locks in together — no peeking at what your buddies picked until Round 1 starts.
            </p>
          </div>
        )}

        {/* Picks list — crossed-out picks (excluded by best-N-of-M) get a strikethrough */}
        <div className="divide-y divide-text-2/10">
          {entry.picks?.map((pick) => {
            const excluded = pick.excluded === true
            const live = liveByPlayer?.get(pick.player?.id)
            const pos = live?.position
            const posTied = live?.positionTied
            const totalToPar = live?.totalToPar
            const today = live?.today
            const thru = live?.thru
            const status = live?.status

            return (
              <button
                key={pick.id || pick.player?.id}
                onClick={() => onPlayerClick?.(pick.player?.id)}
                className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-bg transition-colors ${excluded ? 'opacity-50' : ''}`}
                title={excluded ? 'Not counting toward your total (best N of M)' : undefined}
              >
                <PlayerAvatar player={pick.player} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-text-primary truncate">
                    {pick.player?.name}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-2 mt-0.5 flex items-center gap-2">
                    {pick.tier && <span>T{pick.tier.tierNumber}</span>}
                    {pos && <span>{posTied ? 'T' : ''}{pos}</span>}
                    {thru != null && thru !== '' && (
                      <span className="text-text-2/70">
                        {thru === 'CUT' || status === 'CUT' ? 'CUT' : thru === 'F' || thru === 18 ? 'F' : `Thru ${thru}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold text-base ${scoreClass(totalToPar)}`}>
                    {formatScore(totalToPar)}
                  </div>
                  {today != null && (
                    <div className={`font-mono text-[10px] ${scoreClass(today)}`}>
                      Today {formatScore(today)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 w-14 border-l border-text-2/10 pl-3">
                  {isToPar ? (
                    <>
                      <div className={`font-mono font-bold text-base ${excluded ? 'line-through text-text-2' : scoreClass(pick.scoreToPar)}`}>
                        {formatScore(pick.scoreToPar)}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">to par</div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono font-bold text-base text-text-primary">
                        {pick.fantasyPoints != null ? pick.fantasyPoints.toFixed(1) : '—'}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">pts</div>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {entry.tiebreakerScore != null && (
          <div className="px-5 py-4 border-t border-text-2/10 text-sm flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-2">Tiebreaker (winner's score)</span>
            <span className="font-mono font-bold text-text-primary">{formatScore(entry.tiebreakerScore)}</span>
          </div>
        )}
      </aside>
    </>
  )
}

function PlayerAvatar({ player, size = 40 }) {
  const dim = { width: `${size}px`, height: `${size}px` }
  if (player?.headshotUrl) {
    return (
      <img
        src={player.headshotUrl}
        alt=""
        style={dim}
        className="rounded-full object-cover bg-text-2/10 shrink-0"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <span
      style={dim}
      className="rounded-full bg-text-2/10 shrink-0 flex items-center justify-center text-lg"
      aria-hidden="true"
    >
      {player?.countryFlag || '🏌'}
    </span>
  )
}

function formatScore(v) {
  if (v == null) return '—'
  if (v === 0) return 'E'
  return v > 0 ? `+${v}` : `${v}`
}

function scoreClass(v) {
  if (v == null) return 'text-text-2'
  if (v < 0) return 'text-field'
  if (v > 0) return 'text-live-red'
  return 'text-text-primary'
}
