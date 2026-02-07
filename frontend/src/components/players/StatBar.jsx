const StatBar = ({ value, maxValue, label, isBest = false, showValue = true }) => {
  const percentage = Math.min((value / maxValue) * 100, 100)

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">{label}</span>
          {showValue && (
            <span className={isBest ? 'text-gold font-medium' : 'text-white'}>
              {typeof value === 'number' ? value.toFixed(2) : value}
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-dark-primary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isBest ? 'bg-gold' : 'bg-orange'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default StatBar
