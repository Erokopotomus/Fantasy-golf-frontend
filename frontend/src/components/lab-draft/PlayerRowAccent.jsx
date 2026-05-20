// frontend/src/components/lab-draft/PlayerRowAccent.jsx
import { teamPrimary } from './teamColorHelpers'

/**
 * Single available-player row. Left-border accent in team primary color.
 *
 * `statsColumns` lets callers inject position-specific stat values (e.g., for
 * QB rows: passing yards, TDs; for RB: rushing yards, TDs, receptions). Each
 * column is `{ key, value }` and the matching headers are rendered by the caller.
 * When `statsColumns` is omitted, only ADP / team / position / name / projected
 * are shown — matching the original simple layout.
 */
export default function PlayerRowAccent({
  player,
  onPick,
  disabled,
  selected,
  showProjected,
  statsColumns,
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
      <span className="font-display font-bold text-sm text-text-primary truncate flex-1 min-w-0">
        {player.name}
      </span>
      {statsColumns && statsColumns.map(s => (
        <span
          key={s.key}
          className="font-mono text-[11px] text-text-secondary tabular-nums w-10 shrink-0 text-right"
          title={s.title}
        >
          {s.value == null || s.value === 0 ? '—' : s.value}
        </span>
      ))}
      <span className="font-mono text-xs text-text-secondary tabular-nums shrink-0 w-12 text-right">
        {showProjected ? (player.projectedPoints?.toFixed(0) ?? '—') : ''}
      </span>
    </button>
  )
}
