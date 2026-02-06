import Card from '../common/Card'

const PlayerStats = ({ player }) => {
  if (!player) return null

  const { stats } = player

  const formatSG = (value) => {
    if (typeof value !== 'number') return '—'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2)}`
  }

  const getSGColor = (value) => {
    if (typeof value !== 'number') return 'text-text-muted'
    if (value > 0.5) return 'text-accent-green'
    if (value > 0) return 'text-green-400'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const sgStats = stats ? [
    { label: 'Total', value: stats.sgTotal, color: 'text-accent-green' },
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

  return (
    <div className="space-y-4">
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
                <p className="text-lg font-bold text-white">{stat.value}</p>
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
            <span className="font-semibold text-white">{formatRankValue(player.owgrRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Rank</span>
            <span className="font-semibold text-white">{formatRankValue(player.datagolfRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Skill</span>
            <span className="font-semibold text-accent-green">
              {player.datagolfSkill != null ? player.datagolfSkill.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PlayerStats
