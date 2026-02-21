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
        rounded-card border
        ${shadow ? 'shadow-card' : ''}
        ${hover ? 'hover:shadow-card-hover transition-all duration-300 cursor-pointer' : 'transition-colors duration-300'}
        ${paddings[padding]}
        ${className}
      `}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--card-border)',
        ...(hover ? {} : {}),
      }}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = 'translateY(-3px)' } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = 'translateY(0)' } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
