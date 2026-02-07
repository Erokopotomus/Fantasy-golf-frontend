const GlassCard = ({ children, className = '', highlighted = false }) => {
  return (
    <div
      className={`
        rounded-card backdrop-blur-xl backdrop-saturate-150 border
        ${highlighted
          ? 'bg-white/[0.06] border-gold/20'
          : 'bg-white/[0.04] border-white/[0.08]'
        }
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default GlassCard
