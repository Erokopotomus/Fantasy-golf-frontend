import Card from '../common/Card'

const PlayerStats = ({ player, clutchMetrics }) => {
  if (!player) return null

  const { stats } = player

  const formatSG = (value) => {
    if (typeof value !== 'number') return '—'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2)}`
  }

  const getSGColor = (value) => {
    if (typeof value !== 'number') return 'text-text-muted'
    if (value > 0.5) return 'text-gold'
    if (value > 0) return 'text-green-400'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const sgStats = stats ? [
    { label: 'Total', value: stats.sgTotal, color: 'text-gold' },
    { label: 'Off the Tee', value: stats.sgOffTee },
    { label: 'Approach', value: stats.sgApproach },
    { label: 'Around Green', value: stats.sgAroundGreen },
    { label: 'Putting', value: stats.sgPutting },
  ] : []

  const seasonStats = [
    { label: 'Events', value: player.events || 0 },
    { label: 'Wins', value: player.wins || 0 },
    { label: 'Top 5s', value: player.top5s || 0 },
    { label: 'Top 10s', value: player.top10s || 0 },
    { label: 'Cuts Made', value: player.cutsMade || 0 },
    { label: 'Earnings', value: player.earnings > 0 ? `$${(player.earnings / 1e6).toFixed(2)}M` : '$0' },
  ]

  const hasSeasonData = player.events > 0

  const formatRankValue = (val) => val != null ? `#${val}` : '—'

  // Clutch metric helpers
  const getCPIColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v > 1.5) return 'text-gold'
    if (v > 0.5) return 'text-green-400'
    if (v > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }
  const getFormColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v >= 80) return 'text-orange'
    if (v >= 60) return 'text-yellow-400'
    if (v >= 40) return 'text-blue-400'
    return 'text-blue-300'
  }
  const getFormLabel = (v) => {
    if (v == null) return '—'
    if (v >= 80) return 'Hot'
    if (v >= 60) return 'Warm'
    if (v >= 40) return 'Cool'
    return 'Cold'
  }
  const getPressureColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v > 0.5) return 'text-gold'
    if (v > -0.5) return 'text-text-secondary'
    return 'text-red-400'
  }
  const getPressureLabel = (v) => {
    if (v == null) return '—'
    if (v > 0.5) return 'Clutch'
    if (v > -0.5) return 'Steady'
    return 'Fades'
  }
  const getFitColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v >= 85) return 'text-gold'
    if (v >= 70) return 'text-green-400'
    if (v >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }
  const getFitLabel = (v) => {
    if (v == null) return null
    if (v >= 85) return 'Elite Fit'
    if (v >= 70) return 'Strong Fit'
    if (v >= 50) return 'Neutral'
    return 'Poor Fit'
  }

  const hasClutchMetrics = clutchMetrics && (clutchMetrics.cpi != null || clutchMetrics.formScore != null || clutchMetrics.pressureScore != null)

  return (
    <div className="space-y-4">
      {/* Clutch Scores */}
      {hasClutchMetrics && (
        <Card>
          <h4 className="text-sm font-semibold text-text-muted mb-3">Clutch Scores</h4>
          <div className="space-y-3">
            {clutchMetrics.cpi != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">CPI</span>
                  <span className="text-text-muted text-xs ml-1">(Performance Index)</span>
                </div>
                <span className={`font-mono font-bold text-lg ${getCPIColor(clutchMetrics.cpi)}`}>
                  {clutchMetrics.cpi > 0 ? '+' : ''}{clutchMetrics.cpi.toFixed(2)}
                </span>
              </div>
            )}
            {clutchMetrics.formScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Form</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getFormColor(clutchMetrics.formScore)} bg-dark-primary`}>
                    {getFormLabel(clutchMetrics.formScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getFormColor(clutchMetrics.formScore)}`}>
                  {Math.round(clutchMetrics.formScore)}
                </span>
              </div>
            )}
            {clutchMetrics.pressureScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Pressure</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getPressureColor(clutchMetrics.pressureScore)} bg-dark-primary`}>
                    {getPressureLabel(clutchMetrics.pressureScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getPressureColor(clutchMetrics.pressureScore)}`}>
                  {clutchMetrics.pressureScore > 0 ? '+' : ''}{clutchMetrics.pressureScore.toFixed(2)}
                </span>
              </div>
            )}
            {clutchMetrics.courseFitScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Course Fit</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getFitColor(clutchMetrics.courseFitScore)} bg-dark-primary`}>
                    {getFitLabel(clutchMetrics.courseFitScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getFitColor(clutchMetrics.courseFitScore)}`}>
                  {Math.round(clutchMetrics.courseFitScore)}
                </span>
              </div>
            )}
          </div>
          {clutchMetrics.computedAt && (
            <p className="text-[10px] text-text-muted mt-3 text-right">
              Updated {new Date(clutchMetrics.computedAt).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      {/* Strokes Gained */}
      {stats && (
        <Card>
          <h4 className="text-sm font-semibold text-text-muted mb-3">Strokes Gained</h4>
          <div className="space-y-2">
            {sgStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">{stat.label}</span>
                <span className={`font-semibold ${stat.color || getSGColor(stat.value)}`}>
                  {formatSG(stat.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Season Stats */}
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Season Stats</h4>
        {hasSeasonData ? (
          <div className="grid grid-cols-2 gap-3">
            {seasonStats.map((stat) => (
              <div key={stat.label} className="bg-dark-primary rounded-lg p-3 text-center">
                <p className="text-lg font-bold font-display text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No season data available</p>
        )}
      </Card>

      {/* Rankings */}
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Rankings</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">OWGR</span>
            <span className="font-semibold text-text-primary">{formatRankValue(player.owgrRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Rank</span>
            <span className="font-semibold text-text-primary">{formatRankValue(player.datagolfRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Skill</span>
            <span className="font-semibold text-gold">
              {player.datagolfSkill != null ? player.datagolfSkill.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PlayerStats
