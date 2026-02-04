const Select = ({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  className = '',
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  ...props
}) => {
  const getSelectStyles = () => {
    if (error) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500'
    }
    return 'border-dark-border hover:border-text-muted focus:border-accent-green'
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
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-dark-tertiary border rounded-lg px-4 py-3 text-white
            appearance-none cursor-pointer
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:shadow-glow-green
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getSelectStyles()}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-text-muted">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-dark-tertiary text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
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

export default Select
