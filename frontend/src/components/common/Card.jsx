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
        backdrop-blur-xl backdrop-saturate-150 bg-[#1F1B17] rounded-card border border-[#3A342D]
        ${shadow ? 'shadow-card' : ''}
        ${hover ? 'hover:bg-[#26211C] hover:border-gold/30 hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300 cursor-pointer' : 'transition-colors duration-300'}
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
