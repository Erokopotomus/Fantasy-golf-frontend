const Card = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  shadow = true,
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={`
        bg-dark-secondary rounded-xl border border-dark-border
        ${shadow ? 'shadow-card' : ''}
        ${hover ? 'hover:bg-dark-tertiary hover:border-accent-green/50 hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300 cursor-pointer' : 'transition-colors duration-300'}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
