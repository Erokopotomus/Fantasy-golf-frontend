const LABELS = {
  ppr: 'PPR',
  half_ppr: 'Half PPR',
  standard: 'Standard',
}

export default function FormatPill({ format }) {
  if (!format) return null
  return (
    <span className="inline-flex items-center px-2 py-1 rounded bg-blaze/15 text-blaze font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
      {LABELS[format] || format}
    </span>
  )
}
