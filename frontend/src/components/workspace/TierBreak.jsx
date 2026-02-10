export default function TierBreak({ tier, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 group">
      <div className="flex-1 h-px bg-gradient-to-r from-gold/60 via-gold/30 to-transparent" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-gold/70 shrink-0">
        Tier {tier}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-gold/60 via-gold/30 to-transparent" />
      <button
        onClick={onRemove}
        className="p-0.5 text-white/0 group-hover:text-white/30 hover:!text-red-400 transition-colors shrink-0"
        title="Remove tier break"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
