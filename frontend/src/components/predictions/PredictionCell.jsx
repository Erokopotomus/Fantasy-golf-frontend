import { useCallback, useMemo } from 'react'

/**
 * PredictionCell — Dual-button prediction cell for the Prove It table.
 *
 * Renders a <td> with two side-by-side buttons for each prediction type:
 *   winner: single trophy toggle
 *   top:    Yes | No
 *   cut:    Make | Miss
 *   sg:     Over | Under (with benchmark value shown above)
 *
 * One button can be active at a time. Tapping the active button clears it.
 */

// Button configs per column type: [positiveDirection, negativeDirection]
const BUTTON_PAIRS = {
  top: [
    { dir: 'yes',  label: 'Yes',  short: 'Y' },
    { dir: 'no',   label: 'No',   short: 'N' },
  ],
  cut: [
    { dir: 'make', label: 'Make', short: 'M' },
    { dir: 'miss', label: 'Miss', short: 'X' },
  ],
  sg: [
    { dir: 'over',  label: 'Over',  short: 'O' },
    { dir: 'under', label: 'Under', short: 'U' },
  ],
}

export default function PredictionCell({
  columnType,
  prediction,
  player,
  disabled,
  onTap,
  benchmarkValue,
  isWinnerSelected,
}) {
  const direction = prediction?.predictionData?.direction ?? null
  const outcome = prediction?.outcome ?? null

  const effectiveDirection = columnType === 'winner'
    ? (isWinnerSelected ? 'pick' : null)
    : direction

  const isResolved = outcome === 'CORRECT' || outcome === 'INCORRECT'

  // ── Winner: single trophy toggle ──
  if (columnType === 'winner') {
    const isActive = effectiveDirection === 'pick'
    return (
      <td className="px-0.5 py-0.5 text-center">
        <button
          type="button"
          onClick={() => {
            if (disabled || isResolved) return
            onTap?.(isActive ? null : 'pick')
          }}
          disabled={disabled || isResolved}
          className={[
            'w-9 h-8 rounded text-sm',
            'flex items-center justify-center',
            'transition-colors duration-150 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isResolved
              ? (outcome === 'CORRECT' ? 'bg-field-bright/20 text-field border border-field-bright/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
              : isActive
                ? 'bg-crown/20 text-crown border border-crown/40'
                : 'bg-[var(--bg-alt)] text-text-primary/20 border border-[var(--card-border)] hover:border-crown/30 hover:text-crown/40 cursor-pointer',
          ].join(' ')}
          aria-label={isActive ? 'Winner selected — tap to clear' : 'Tap to pick as winner'}
        >
          {isResolved ? (outcome === 'CORRECT' ? '\u2713' : '\u2717') : '\u{1F3C6}'}
        </button>
      </td>
    )
  }

  // ── Resolved state: show result ──
  if (isResolved) {
    return (
      <td className="px-0.5 py-0.5 text-center">
        <div className={[
          'h-8 rounded flex items-center justify-center text-xs font-medium',
          outcome === 'CORRECT'
            ? 'bg-field-bright/20 text-field border border-field-bright/30'
            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        ].join(' ')}>
          {outcome === 'CORRECT' ? '\u2713' : '\u2717'}
        </div>
      </td>
    )
  }

  // ── Dual-button cell (top, cut, sg) ──
  const pair = BUTTON_PAIRS[columnType]
  if (!pair) return <td />

  return (
    <td className="px-0.5 py-0.5 text-center">
      {/* SG benchmark label above buttons */}
      {columnType === 'sg' && benchmarkValue != null && (
        <div className="text-[9px] font-mono text-text-primary/30 leading-none mb-0.5">
          {benchmarkValue > 0 ? '+' : ''}{Number(benchmarkValue).toFixed(1)}
        </div>
      )}
      <div className="flex gap-px">
        {pair.map(({ dir, label, short }) => {
          const isActive = effectiveDirection === dir
          const isPositive = dir === pair[0].dir

          return (
            <button
              key={dir}
              type="button"
              onClick={() => {
                if (disabled) return
                onTap?.(isActive ? null : dir)
              }}
              disabled={disabled}
              className={[
                'flex-1 h-7 rounded text-[10px] font-medium',
                'flex items-center justify-center',
                'transition-colors duration-150 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isActive
                  ? isPositive
                    ? 'bg-field/15 text-field border border-field/40 font-semibold'
                    : 'bg-live-red/15 text-live-red border border-live-red/40 font-semibold'
                  : 'bg-[var(--bg-alt)] text-text-primary/35 border border-[var(--card-border)] hover:border-blaze/30 hover:text-text-primary/60 cursor-pointer',
              ].join(' ')}
              aria-label={`${label} — ${isActive ? 'selected, tap to clear' : 'tap to select'}`}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </td>
  )
}
