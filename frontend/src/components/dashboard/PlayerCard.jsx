import Card from '../common/Card'

const PlayerCard = ({ player, compact = false, showTournamentStatus = true }) => {
  const {
    name,
    rank,
    countryFlag,
    stats,
    recentForm,
    tournamentStatus,
  } = player

  const formatStat = (value) => {
    if (value === undefined || value === null) return '—'
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
  }

  const getFormColor = (result) => {
    if (result.includes('1st')) return 'text-yellow-400'
    if (result.includes('2nd') || result.includes('3rd')) return 'text-accent-green'
    if (result.startsWith('T') && parseInt(result.slice(1)) <= 10) return 'text-accent-blue'
    return 'text-text-secondary'
  }

  const getPositionColor = (position) => {
    if (position === '1st') return 'text-yellow-400'
    if (position.includes('T2') || position === '2nd') return 'text-gray-300'
    if (position.includes('T3') || position === '3rd') return 'text-amber-600'
    if (position.includes('T') && parseInt(position.slice(1)) <= 10) return 'text-accent-green'
    return 'text-white'
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-dark-secondary rounded-lg border border-dark-border hover:border-accent-green/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark-tertiary rounded-full flex items-center justify-center text-lg">
            {countryFlag}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{name}</p>
            <p className="text-text-muted text-xs">#{rank} OWGR</p>
          </div>
        </div>
        {showTournamentStatus && tournamentStatus && (
          <div className="text-right">
            <p className={`font-bold ${getPositionColor(tournamentStatus.position)}`}>
              {tournamentStatus.position}
            </p>
            <p className="text-text-muted text-xs">
              {tournamentStatus.score > 0 ? '+' : ''}{tournamentStatus.score} ({tournamentStatus.thru})
            </p>
          </div>
        )}
        {(!showTournamentStatus || !tournamentStatus) && stats && (
          <div className="text-right">
            <p className={`font-bold ${stats.sgTotal > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgTotal)}
            </p>
            <p className="text-text-muted text-xs">SG Total</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-dark-tertiary rounded-full flex items-center justify-center text-2xl">
            {countryFlag}
          </div>
          <div>
            <p className="text-white font-semibold">{name}</p>
            <p className="text-text-muted text-sm">#{rank} World Ranking</p>
          </div>
        </div>
        {tournamentStatus && (
          <div className="text-right">
            <p className={`text-xl font-bold ${getPositionColor(tournamentStatus.position)}`}>
              {tournamentStatus.position}
            </p>
            <p className="text-text-secondary text-sm">
              {tournamentStatus.score > 0 ? '+' : ''}{tournamentStatus.score}
            </p>
          </div>
        )}
      </div>

      {/* Strokes Gained Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="text-center">
            <p className={`font-semibold text-sm ${stats.sgTotal > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgTotal)}
            </p>
            <p className="text-text-muted text-xs">Total</p>
          </div>
          <div className="text-center">
            <p className={`font-semibold text-sm ${stats.sgOffTee > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgOffTee)}
            </p>
            <p className="text-text-muted text-xs">OTT</p>
          </div>
          <div className="text-center">
            <p className={`font-semibold text-sm ${stats.sgApproach > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgApproach)}
            </p>
            <p className="text-text-muted text-xs">APP</p>
          </div>
          <div className="text-center">
            <p className={`font-semibold text-sm ${stats.sgAroundGreen > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgAroundGreen)}
            </p>
            <p className="text-text-muted text-xs">ATG</p>
          </div>
          <div className="text-center">
            <p className={`font-semibold text-sm ${stats.sgPutting > 0 ? 'text-accent-green' : 'text-red-400'}`}>
              {formatStat(stats.sgPutting)}
            </p>
            <p className="text-text-muted text-xs">PUTT</p>
          </div>
        </div>
      )}

      {/* Recent Form */}
      {recentForm && recentForm.length > 0 && (
        <div>
          <p className="text-text-muted text-xs mb-2">Recent Form</p>
          <div className="flex gap-2">
            {recentForm.map((result, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded text-xs font-medium bg-dark-primary ${getFormColor(result)}`}
              >
                {result}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Basic Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-dark-border">
          <div className="text-center">
            <p className="text-white font-medium text-sm">{stats.drivingDistance?.toFixed(1)}</p>
            <p className="text-text-muted text-xs">Driving (yds)</p>
          </div>
          <div className="text-center">
            <p className="text-white font-medium text-sm">{stats.gir?.toFixed(1)}%</p>
            <p className="text-text-muted text-xs">GIR</p>
          </div>
          <div className="text-center">
            <p className="text-white font-medium text-sm">{stats.scoringAvg?.toFixed(1)}</p>
            <p className="text-text-muted text-xs">Scoring Avg</p>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PlayerCard
