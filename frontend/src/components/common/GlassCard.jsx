const GlassCard = ({ children, className = '', highlighted = false }) => {
  return (
    <div
      className={`
        rounded-card border shadow-card
        ${highlighted
          ? 'bg-[var(--surface)] border-gold/20'
          : 'bg-[var(--surface)] border-[var(--card-border)]'
        }
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default GlassCard
