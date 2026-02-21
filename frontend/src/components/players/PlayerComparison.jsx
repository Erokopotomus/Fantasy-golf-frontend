import Card from '../common/Card'
import Button from '../common/Button'
import StatBar from './StatBar'

const PlayerComparison = ({
  players,
  comparisonData,
  onRemovePlayer,
  onClear,
}) => {
  if (players.length < 2) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Compare Players</h3>
          <p className="text-text-muted text-sm">
            Select 2-3 players from the table to compare their stats side by side
          </p>
        </div>
      </Card>
    )
  }

  const statLabels = {
    sgTotal: 'SG: Total',
    sgOffTee: 'SG: Off the Tee',
    sgApproach: 'SG: Approach',
    sgAroundGreen: 'SG: Around Green',
    sgPutting: 'SG: Putting',
    drivingDistance: 'Driving Distance',
    drivingAccuracy: 'Driving Accuracy',
    gir: 'Greens in Reg',
    scoringAvg: 'Scoring Avg',
  }

  const formatStatValue = (stat, value) => {
    if (stat === 'drivingDistance') return `${value.toFixed(1)} yds`
    if (stat === 'drivingAccuracy' || stat === 'gir') return `${value.toFixed(1)}%`
    if (stat === 'scoringAvg') return value.toFixed(2)
    return value.toFixed(2)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold font-display text-text-primary">Player Comparison</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear All
        </Button>
      </div>

      {/* Player Headers */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-dark-tertiary rounded-lg p-4 text-center relative"
          >
            <button
              onClick={() => onRemovePlayer(player.id)}
              className="absolute top-2 right-2 text-text-muted hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-3xl mb-2 block">{player.countryFlag}</span>
            <p className="text-text-primary font-bold">{player.name}</p>
            <p className="text-text-muted text-sm">Rank #{player.rank}</p>
          </div>
        ))}
      </div>

      {/* Stat Comparisons */}
      <div className="space-y-4">
        {Object.entries(comparisonData).map(([stat, data]) => (
          <div key={stat} className="bg-dark-primary rounded-lg p-4">
            <p className="text-text-muted text-sm mb-3">{statLabels[stat]}</p>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
              {data.map((item) => {
                const player = players.find(p => p.id === item.playerId)
                return (
                  <div key={item.playerId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted truncate">
                        {player?.name.split(' ').pop()}
                      </span>
                      <span className={`text-sm font-medium ${
                        item.isBest ? 'text-gold' : 'text-text-primary'
                      }`}>
                        {formatStatValue(stat, item.value)}
                      </span>
                    </div>
                    <StatBar
                      value={item.percentile}
                      maxValue={100}
                      isBest={item.isBest}
                      showValue={false}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-dark-tertiary rounded-lg">
        <h4 className="text-text-primary font-medium mb-2">Summary</h4>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
          {players.map((player) => {
            const wins = Object.values(comparisonData).filter(data =>
              data.find(d => d.playerId === player.id)?.isBest
            ).length
            return (
              <div key={player.id} className="text-center">
                <p className="text-2xl font-bold font-display text-gold">{wins}</p>
                <p className="text-text-muted text-xs">Categories Won</p>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default PlayerComparison
