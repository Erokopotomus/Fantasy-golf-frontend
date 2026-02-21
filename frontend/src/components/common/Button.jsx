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
    primary: 'text-white font-display focus:ring-[#F06820] hover:brightness-110',
    secondary: 'bg-[#1E2A3A] text-white font-display focus:ring-[#1E2A3A] hover:brightness-110',
    outline: 'bg-transparent text-[var(--text-1)] border border-[var(--stone)] hover:border-[var(--text-3)] focus:ring-[var(--stone)] hover:bg-[var(--glass-hover)]',
    ghost: 'bg-transparent hover:bg-[var(--glass-hover)] text-[var(--text-2)] hover:text-[var(--text-1)]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  // Primary & secondary buttons get gradient/solid bg via inline style
  const inlineStyle = variant === 'primary'
    ? { background: 'linear-gradient(135deg, #F06820, #FF8828)', boxShadow: '0 4px 16px rgba(240,104,32,0.16)' }
    : variant === 'secondary'
      ? { boxShadow: '0 4px 16px rgba(30,42,58,0.19)' }
      : {}

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
      style={inlineStyle}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  )
}

export default Button
