import Card from '../common/Card'

const PlayerProjection = ({ projection }) => {
  if (!projection || projection.totalEvents === 0) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Fantasy Projection</h4>
        <p className="text-text-muted text-sm">No tournament data available yet</p>
      </Card>
    )
  }

  const { projected, floor, ceiling, trend, consistency, recentAvg } = projection

  // Need 3+ completed events with real fantasy points for meaningful projections
  const hasEnoughData = projection.totalEvents >= 3 && (recentAvg > 0 || floor > 0)

  if (!hasEnoughData) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Fantasy Projection</h4>
        <div className="text-center py-4">
          <p className="text-2xl font-bold font-display text-gold mb-1">
            {projected > 0 ? projected.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-text-muted mb-3">SG-Based Estimate</p>
          <p className="text-text-muted text-sm">
            Full projections unlock after 3+ completed events.
            Currently tracking {projection.totalEvents} event{projection.totalEvents !== 1 ? 's' : ''}.
          </p>
        </div>
      </Card>
    )
  }

  // Normalize floor/ceiling to a 0-100 bar range
  const range = ceiling - floor || 1
  const projectedPct = range > 0 ? ((projected - floor) / range) * 100 : 50

  const trendUp = trend > 0
  const trendColor = trendUp ? 'text-gold' : trend < 0 ? 'text-red-400' : 'text-text-secondary'
  const trendArrow = trendUp ? '\u2191' : trend < 0 ? '\u2193' : '\u2192'

  // Consistency color
  const getConsistencyColor = (val) => {
    if (val >= 75) return 'text-gold'
    if (val >= 50) return 'text-yellow-400'
    if (val >= 25) return 'text-orange-400'
    return 'text-red-400'
  }

  const getConsistencyBarColor = (val) => {
    if (val >= 75) return 'bg-gold'
    if (val >= 50) return 'bg-yellow-500'
    if (val >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <h4 className="text-sm font-semibold text-text-muted mb-4">Fantasy Projection</h4>

      {/* Projected Points */}
      <div className="text-center mb-4">
        <p className="text-3xl font-bold font-display text-gold">{projected.toFixed(1)}</p>
        <p className="text-xs text-text-muted">Projected Fantasy Points</p>
      </div>

      {/* Floor / Ceiling Range Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Floor: {floor.toFixed(1)}</span>
          <span>Ceiling: {ceiling.toFixed(1)}</span>
        </div>
        <div className="relative h-3 bg-dark-primary rounded-full overflow-hidden">
          {/* Full range background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-green-500/30 rounded-full" />
          {/* Projected marker */}
          <div
            className="absolute top-0 h-full w-1.5 bg-dark-tertiary rounded-full shadow-lg"
            style={{ left: `${Math.min(Math.max(projectedPct, 2), 98)}%`, transform: 'translateX(-50%)' }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Trend */}
        <div className="bg-dark-primary rounded-lg p-3 text-center">
          <p className={`text-lg font-bold ${trendColor}`}>
            {trendArrow} {Math.abs(trend).toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted">Trend</p>
        </div>

        {/* Consistency */}
        <div className="bg-dark-primary rounded-lg p-3 text-center">
          <p className={`text-lg font-bold ${getConsistencyColor(consistency)}`}>
            {consistency.toFixed(0)}
          </p>
          <p className="text-xs text-text-muted">Consistency</p>
        </div>

        {/* Recent Avg */}
        <div className="bg-dark-primary rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display text-text-primary">{recentAvg.toFixed(1)}</p>
          <p className="text-xs text-text-muted">Recent Avg</p>
        </div>
      </div>

      {/* Consistency Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Consistency</span>
          <span className={getConsistencyColor(consistency)}>{consistency.toFixed(0)}/100</span>
        </div>
        <div className="h-2 bg-dark-primary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getConsistencyBarColor(consistency)} transition-all duration-500`}
            style={{ width: `${consistency}%` }}
          />
        </div>
      </div>
    </Card>
  )
}

export default PlayerProjection
