import { chipsForSport } from '../../constants/reasonChips'

/**
 * Optional multi-select chips for "why did you do that?" on decision events.
 *
 * Used by the trade modal, waiver claim flow, draft pick UI, etc.
 * Returns string[] of selected chip labels via onChange. Null/[] is a valid
 * value — chips are always optional (null is itself a signal in the bias
 * engine: "user declined to explain").
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md §8.
 *
 * Props:
 *   value: string[]                    currently-selected chip labels
 *   onChange: (next: string[]) => void
 *   sport: 'nfl' | 'golf'              gates which chips appear
 *   label?: string                     small label above the row (default: "Why?")
 *   max?: number                       cap on selections (default: 3)
 *   compact?: boolean                  smaller text + padding
 */
const ReasonChipsPicker = ({
  value = [],
  onChange,
  sport = 'golf',
  label = 'Why? (optional)',
  max = 3,
  compact = false,
}) => {
  const options = chipsForSport(sport)
  const selected = new Set(value || [])

  const toggle = (chip) => {
    const next = new Set(selected)
    if (next.has(chip)) {
      next.delete(chip)
    } else {
      if (next.size >= max) return
      next.add(chip)
    }
    onChange([...next])
  }

  return (
    <div>
      {label && (
        <label className={`block text-text-secondary ${compact ? 'text-[10px]' : 'text-[11px]'} mb-1.5`}>
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((chip) => {
          const isOn = selected.has(chip)
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={`
                ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}
                rounded-full font-medium transition-colors
                ${isOn
                  ? 'bg-blaze text-white'
                  : 'bg-[var(--surface-alt)] text-text-secondary hover:bg-[var(--glass-hover)] hover:text-text-primary'}
              `}
            >
              {chip}
            </button>
          )
        })}
      </div>
      {value.length >= max && (
        <p className="text-text-muted text-[10px] mt-1">{max} max — tap a selected chip to swap</p>
      )}
    </div>
  )
}

export default ReasonChipsPicker
