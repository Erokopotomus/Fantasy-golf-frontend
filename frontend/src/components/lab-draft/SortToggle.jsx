// frontend/src/components/lab-draft/SortToggle.jsx
const OPTIONS = [
  { key: 'adp', label: 'ADP' },
  { key: 'projected', label: 'Projected' },
]

export default function SortToggle({ value = 'adp', onChange }) {
  return (
    <div className="inline-flex items-center bg-[var(--surface)] rounded-button border border-[var(--color-border)] overflow-hidden">
      {OPTIONS.map(opt => {
        const selected = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] transition-colors ${
              selected ? 'bg-blaze/15 text-blaze' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
