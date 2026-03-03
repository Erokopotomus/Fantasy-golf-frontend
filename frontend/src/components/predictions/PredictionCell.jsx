/**
 * PredictionCell — Dual-button prediction cell for the Prove It table.
 *
 * Each cell shows two compact buttons (Y|N, M|X, O|U).
 * Positive side has a green tint, negative side has a red tint — even when
 * unselected, so the table has visual rhythm. Selected = bold fill.
 * Winner is a single trophy toggle.
 */

const BUTTON_PAIRS = {
  top: [
    { dir: 'yes',  label: 'Y' },
    { dir: 'no',   label: 'N' },
  ],
  cut: [
    { dir: 'make', label: 'M' },
    { dir: 'miss', label: 'X' },
  ],
  sg: [
    { dir: 'over',  label: 'O' },
    { dir: 'under', label: 'U' },
  ],
}

// Unselected buttons get a subtle tint so the two sides are distinguishable
const IDLE_STYLES = {
  pos: 'bg-field/5 text-field/40 border border-field/15 hover:bg-field/10 hover:text-field/70 cursor-pointer',
  neg: 'bg-live-red/5 text-live-red/40 border border-live-red/15 hover:bg-live-red/10 hover:text-live-red/70 cursor-pointer',
}
const ACTIVE_STYLES = {
  pos: 'bg-field/20 text-field border border-field/50 font-bold',
  neg: 'bg-live-red/20 text-live-red border border-live-red/50 font-bold',
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
            'w-9 h-8 rounded text-sm mx-auto',
            'flex items-center justify-center',
            'transition-colors duration-150 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isResolved
              ? (outcome === 'CORRECT' ? 'bg-field-bright/20 text-field border border-field-bright/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
              : isActive
                ? 'bg-crown/20 text-crown border border-crown/40'
                : 'bg-crown/5 text-crown/30 border border-crown/15 hover:bg-crown/10 hover:text-crown/50 cursor-pointer',
          ].join(' ')}
        >
          {isResolved ? (outcome === 'CORRECT' ? '\u2713' : '\u2717') : '\u{1F3C6}'}
        </button>
      </td>
    )
  }

  // ── Resolved state ──
  if (isResolved) {
    return (
      <td className="px-0.5 py-0.5 text-center">
        <div className={[
          'h-8 rounded flex items-center justify-center text-xs font-bold',
          outcome === 'CORRECT'
            ? 'bg-field/20 text-field border border-field/40'
            : 'bg-live-red/20 text-live-red border border-live-red/40',
        ].join(' ')}>
          {outcome === 'CORRECT' ? '\u2713' : '\u2717'}
        </div>
      </td>
    )
  }

  // ── Dual-button cell ──
  const pair = BUTTON_PAIRS[columnType]
  if (!pair) return <td />

  // SG: show benchmark inline between buttons
  const sgLabel = columnType === 'sg' && benchmarkValue != null
    ? (benchmarkValue > 0 ? '+' : '') + Number(benchmarkValue).toFixed(1)
    : null

  return (
    <td className="px-0.5 py-0.5 text-center">
      <div className="flex items-center gap-px">
        {pair.map(({ dir, label }, i) => {
          const isActive = effectiveDirection === dir
          const isPos = i === 0
          const style = isActive
            ? (isPos ? ACTIVE_STYLES.pos : ACTIVE_STYLES.neg)
            : (isPos ? IDLE_STYLES.pos : IDLE_STYLES.neg)

          return [
            // SG benchmark between the two buttons
            i === 1 && sgLabel && (
              <span key="sg-val" className="text-[10px] font-mono font-semibold text-text-primary/60 px-0.5 shrink-0">
                {sgLabel}
              </span>
            ),
            <button
              key={dir}
              type="button"
              onClick={() => {
                if (disabled) return
                onTap?.(isActive ? null : dir)
              }}
              disabled={disabled}
              className={[
                'flex-1 h-7 rounded text-[11px] font-semibold',
                'flex items-center justify-center',
                'transition-all duration-150 active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                style,
              ].join(' ')}
            >
              {label}
            </button>,
          ]
        })}
      </div>
    </td>
  )
}
