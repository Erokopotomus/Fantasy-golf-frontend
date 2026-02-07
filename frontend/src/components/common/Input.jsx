const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  success,
  helperText,
  icon,
  className = '',
  required = false,
  disabled = false,
  ...props
}) => {
  const getInputStyles = () => {
    if (error) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500'
    }
    if (success) {
      return 'border-accent-green focus:ring-accent-green focus:border-accent-green'
    }
    return 'border-dark-border hover:border-text-muted focus:border-gold'
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-dark-tertiary border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:shadow-glow-gold
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${getInputStyles()}
          `}
          {...props}
        />
        {success && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      {helperText && !error && (
        <p className="mt-2 text-sm text-text-muted">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

export default Input
