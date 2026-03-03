import { useCallback, useMemo } from 'react'

/**
 * PredictionCell — A compact tappable cell for the Prove It prediction table.
 *
 * Renders a <td> with a button that cycles through prediction directions.
 * Used by CompactSlateTable for each column (winner, top 5/10/20, cut, SG).
 *
 * Tap cycling:
 *   winner: off → pick → off
 *   top:    empty → yes → no → empty
 *   cut:    empty → make → miss → empty
 *   sg:     empty → over → under → empty
 *
 * Empty cells show ghost labels hinting what the first tap does.
 * Selected cells show readable words instead of cryptic letters.
 */

// Direction cycle maps per column type
const CYCLES = {
  winner: [null, 'pick'],
  top:    [null, 'yes', 'no'],
  cut:    [null, 'make', 'miss'],
  sg:     [null, 'over', 'under'],
}

// Readable display labels per direction
const LABELS = {
  pick:  '\u{1F3C6}',
  yes:   'Yes',
  no:    'No',
  make:  'Make',
  miss:  'Miss',
  over:  'Over',
  under: 'Undr',
}

// Ghost labels — neutral hints showing both directions are available
const GHOST_LABELS = {
  winner: '\u{1F3C6}',
  top:    'Y/N',
  cut:    'M/X',
  sg:     null, // SG shows benchmark number as ghost instead
}

// Classify direction as positive, negative, or empty for styling
function getPolarity(direction) {
  if (!direction) return 'empty'
  if (['yes', 'over', 'make', 'pick'].includes(direction)) return 'positive'
  if (['no', 'under', 'miss'].includes(direction)) return 'negative'
  return 'empty'
}

// Style maps for each visual state
const STYLE_MAP = {
  empty:    'bg-[var(--bg-alt)] text-text-primary/25 border border-[var(--card-border)] hover:border-blaze/30 hover:bg-blaze/5 cursor-pointer',
  positive: 'bg-field/10 text-field border border-field/30',
  negative: 'bg-live-red/10 text-live-red border border-live-red/30',
  winner:   'bg-crown/20 text-crown border border-crown/40',
  correct:  'bg-field-bright/20 text-field border border-field-bright/30',
  incorrect:'bg-rose-500/20 text-rose-400 border border-rose-500/30',
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

  // For winner column, prefer the isWinnerSelected prop (parent tracks which player is picked)
  const effectiveDirection = columnType === 'winner'
    ? (isWinnerSelected ? 'pick' : null)
    : direction

  // Resolved state: CORRECT or INCORRECT — no more taps allowed
  const isResolved = outcome === 'CORRECT' || outcome === 'INCORRECT'

  // Determine the next direction in the cycle
  const getNextDirection = useCallback(() => {
    const cycle = CYCLES[columnType]
    if (!cycle) return null

    // Winner is a simple toggle based on isWinnerSelected
    if (columnType === 'winner') {
      return isWinnerSelected ? null : 'pick'
    }

    // For cycling types: find current index, advance by 1, wrap around
    const currentIdx = cycle.indexOf(direction)
    const nextIdx = (currentIdx + 1) % cycle.length
    return cycle[nextIdx]
  }, [columnType, direction, isWinnerSelected])

  const handleTap = useCallback(() => {
    if (disabled || isResolved) return
    const next = getNextDirection()
    onTap?.(next)
  }, [disabled, isResolved, getNextDirection, onTap])

  // Determine visual style
  const styleClass = useMemo(() => {
    if (isResolved) {
      return outcome === 'CORRECT' ? STYLE_MAP.correct : STYLE_MAP.incorrect
    }
    if (columnType === 'winner' && effectiveDirection === 'pick') {
      return STYLE_MAP.winner
    }
    const polarity = getPolarity(effectiveDirection)
    return STYLE_MAP[polarity]
  }, [isResolved, outcome, columnType, effectiveDirection])

  // Determine display content
  const content = useMemo(() => {
    // Resolved: show result icon
    if (isResolved) {
      return outcome === 'CORRECT' ? '\u2713' : '\u2717'
    }

    // SG column: show benchmark as ghost when empty, Over/Under when selected
    if (columnType === 'sg') {
      const formatted = benchmarkValue != null
        ? `${benchmarkValue > 0 ? '+' : ''}${Number(benchmarkValue).toFixed(1)}`
        : '\u2014'

      if (!effectiveDirection) return formatted // ghost benchmark number
      return LABELS[effectiveDirection] // "Over" or "Undr"
    }

    // Winner selected
    if (columnType === 'winner' && effectiveDirection === 'pick') {
      return '\u{1F3C6}'
    }

    // Empty state — show ghost label hinting what first tap does
    if (!effectiveDirection) {
      return GHOST_LABELS[columnType] || '\u2013'
    }

    // Active direction label (readable words)
    return LABELS[effectiveDirection] ?? '\u00B7'
  }, [isResolved, outcome, columnType, effectiveDirection, benchmarkValue])

  // Width: SG column needs more space, standard columns wider for words
  const widthClass = columnType === 'sg' ? 'min-w-[3rem]' : 'min-w-[2.75rem]'

  return (
    <td className="px-0.5 py-0.5 text-center">
      <button
        type="button"
        onClick={handleTap}
        disabled={disabled || isResolved}
        className={[
          // Base touch target
          `${widthClass} h-8 rounded`,
          // Text styling — smaller font for words to fit
          'text-[10px] font-medium',
          // Flex centering
          'flex items-center justify-center',
          // Transitions
          'transition-colors duration-150',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Active tap feedback
          'active:scale-95',
          // Visual state
          styleClass,
        ].join(' ')}
        aria-label={getAriaLabel(columnType, effectiveDirection, isResolved, outcome)}
      >
        {content}
      </button>
    </td>
  )
}

// Accessible label for screen readers
function getAriaLabel(columnType, direction, isResolved, outcome) {
  if (isResolved) {
    return `${columnType} prediction: ${outcome === 'CORRECT' ? 'correct' : 'incorrect'}`
  }
  if (!direction) {
    return `${columnType}: tap to predict`
  }
  return `${columnType}: ${direction} \u2014 tap to change`
}
