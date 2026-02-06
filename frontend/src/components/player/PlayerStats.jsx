import Card from '../common/Card'

const PlayerStats = ({ player }) => {
  if (!player?.stats) return null

  const { stats } = player

  const statGroups = [
    {
      title: 'Strokes Gained',
      stats: [
        { label: 'Total', value: stats.sgTotal, color: 'text-accent-green' },
        { label: 'Off the Tee', value: stats.sgOffTee },
        { label: 'Approach', value: stats.sgApproach },
        { label: 'Around Green', value: stats.sgAroundGreen },
        { label: 'Putting', value: stats.sgPutting },
      ]
    },
    {
      title: 'Driving',
      stats: [
        { label: 'Distance', value: stats.drivingDistance != null ? `${stats.drivingDistance} yds` : '—', isRaw: true },
        { label: 'Accuracy', value: stats.drivingAccuracy != null ? `${stats.drivingAccuracy}%` : '—', isRaw: true },
      ]
    },
    {
      title: 'Scoring',
      stats: [
        { label: 'Scoring Avg', value: stats.scoringAvg ?? '—', isRaw: true },
        { label: 'GIR %', value: stats.gir != null ? `${stats.gir}%` : '—', isRaw: true },
      ]
    }
  ]

  const formatSG = (value) => {
    if (typeof value !== 'number') return value
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2)}`
  }

  const getSGColor = (value) => {
    if (typeof value !== 'number') return 'text-white'
    if (value > 0.5) return 'text-accent-green'
    if (value > 0) return 'text-green-400'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      {statGroups.map((group) => (
        <Card key={group.title}>
          <h4 className="text-sm font-semibold text-text-muted mb-3">{group.title}</h4>
          <div className="space-y-2">
            {group.stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">{stat.label}</span>
                <span className={`font-semibold ${stat.isRaw ? 'text-white' : stat.color || getSGColor(stat.value)}`}>
                  {stat.isRaw ? stat.value : formatSG(stat.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default PlayerStats
