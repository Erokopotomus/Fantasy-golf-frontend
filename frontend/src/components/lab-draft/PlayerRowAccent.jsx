// frontend/src/components/lab-draft/PlayerRowAccent.jsx
import { teamPrimary } from './teamColorHelpers'

/**
 * Single available-player row. Left-border accent in team primary color.
 * Designed to slot into the existing MockDraftRoom available-players list
 * without changing the surrounding layout grid.
 */
export default function PlayerRowAccent({
  player,
  onPick,
  disabled,
  selected,
  showProjected,
}) {
  const accent = teamPrimary(player.teamAbbr)
  return (
    <button
      type="button"
      onClick={() => !disabled && onPick?.(player)}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b border-[var(--color-border)] ${
        selected ? 'bg-blaze/10' : 'hover:bg-[var(--glass)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="font-mono text-[10px] text-text-muted w-10 shrink-0">
        {player.adp != null ? player.adp.toFixed(1) : '—'}
      </span>
      <span className="font-mono text-[10px] font-bold text-text-secondary uppercase w-10 shrink-0">
        {player.teamAbbr || '—'}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted w-8 shrink-0">
        {player.position}
      </span>
      <span className="font-display font-bold text-sm text-text-primary truncate flex-1">
        {player.name}
      </span>
      <span className="font-mono text-xs text-text-secondary tabular-nums shrink-0">
        {showProjected ? (player.projectedPoints?.toFixed(0) ?? '—') : ''}
      </span>
    </button>
  )
}
