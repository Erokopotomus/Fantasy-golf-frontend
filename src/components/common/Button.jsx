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
    inline-flex items-center justify-center font-semibold rounded-lg
    transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-primary
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `

  const variants = {
    primary: 'bg-accent-green hover:bg-accent-green-hover hover:shadow-button-hover text-white focus:ring-accent-green shadow-button',
    secondary: 'bg-dark-tertiary hover:bg-dark-border text-white border border-dark-border focus:ring-dark-border hover:shadow-card',
    outline: 'bg-transparent hover:bg-dark-tertiary text-white border border-dark-border focus:ring-dark-border hover:shadow-card',
    ghost: 'bg-transparent hover:bg-dark-tertiary text-text-secondary hover:text-white',
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
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  )
}

export default Button
