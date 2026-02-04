const Checkbox = ({
  label,
  checked,
  onChange,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div className={`
          w-5 h-5 rounded border-2 transition-all duration-300
          ${checked
            ? 'bg-accent-green border-accent-green'
            : 'bg-dark-tertiary border-dark-border group-hover:border-text-muted'
          }
          peer-focus:ring-2 peer-focus:ring-accent-green peer-focus:ring-offset-2 peer-focus:ring-offset-dark-primary
        `}>
          {checked && (
            <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-300">
          {label}
        </span>
      )}
    </label>
  )
}

export default Checkbox
