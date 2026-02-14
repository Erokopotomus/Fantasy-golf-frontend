// 4-up stat display boxes — used in OwnerDetailModal
// Shows Record, Win%, Titles, Total PF in a responsive grid

export default function StatGrid({ stats, ownerColor }) {
  // stats: array of { label, value, highlight? }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="bg-dark-tertiary/40 rounded-lg px-3 py-2.5 text-center"
        >
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
            {s.label}
          </div>
          <div
            className="text-base font-mono font-bold"
            style={{ color: s.highlight ? (ownerColor || '#D4A853') : '#E8E0D0' }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}
