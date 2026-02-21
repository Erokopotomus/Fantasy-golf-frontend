const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-button
    transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-primary
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `

  const variants = {
    primary: 'bg-gradient-to-r from-gold to-orange text-slate font-display hover:shadow-glow-gold focus:ring-gold shadow-button',
    secondary: 'bg-transparent border border-gold/20 text-gold backdrop-blur-sm hover:bg-surface-hover hover:border-gold/40 focus:ring-gold',
    outline: 'bg-transparent hover:bg-dark-tertiary text-text-primary border border-dark-border hover:border-gold/30 focus:ring-dark-border hover:shadow-card',
    ghost: 'bg-transparent hover:bg-dark-tertiary text-text-secondary hover:text-text-primary',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  return (
    <button
      type={type}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  )
}

export default Button
