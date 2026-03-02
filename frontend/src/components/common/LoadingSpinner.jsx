const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
}

export default function LoadingSpinner({ size = 'md', label, className = '', inline = false }) {
  const spinner = (
    <div className={`${sizes[size] || sizes.md} border-gold/30 border-t-gold rounded-full animate-spin ${className}`} />
  )

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        {label && <span className="text-text-muted text-xs font-mono">{label}</span>}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {spinner}
      {label && <p className="text-text-muted text-sm">{label}</p>}
    </div>
  )
}
