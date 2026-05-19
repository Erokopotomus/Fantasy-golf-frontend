// frontend/src/components/lab-draft/FormatToggleGroup.jsx
const FORMATS = [
  { key: 'standard', label: 'Standard' },
  { key: 'half_ppr', label: 'Half PPR' },
  { key: 'ppr', label: 'PPR' },
]

export default function FormatToggleGroup({ value, onChange }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mb-2">
        Scoring Format
      </label>
      <div className="grid grid-cols-3 gap-2">
        {FORMATS.map(fmt => {
          const selected = value === fmt.key
          return (
            <button
              key={fmt.key}
              type="button"
              onClick={() => onChange(fmt.key)}
              className={`py-3 rounded-button font-display font-bold transition-all ${
                selected
                  ? 'bg-blaze text-white shadow-button'
                  : 'bg-[var(--surface)] text-text-secondary border border-[var(--color-border)] hover:text-text-primary'
              }`}
            >
              {fmt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
