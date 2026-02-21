const GlassCard = ({ children, className = '', highlighted = false }) => {
  return (
    <div
      className={`
        rounded-card backdrop-blur-xl backdrop-saturate-150 border
        ${highlighted
          ? 'bg-dark-tertiary/[0.06] border-gold/20'
          : 'bg-dark-tertiary/[0.04] border-[var(--card-border)]'
        }
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default GlassCard
