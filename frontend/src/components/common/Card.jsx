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
        backdrop-blur-xl backdrop-saturate-150 bg-white/[0.07] rounded-card border border-white/[0.12]
        ${shadow ? 'shadow-card' : ''}
        ${hover ? 'hover:bg-white/[0.10] hover:border-gold/30 hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300 cursor-pointer' : 'transition-colors duration-300'}
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
