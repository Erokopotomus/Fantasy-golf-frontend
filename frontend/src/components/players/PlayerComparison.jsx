import Card from '../common/Card'
import Button from '../common/Button'
import StatBar from './StatBar'
import SgRadarChart from './SgRadarChart'

const COLORS = ['#D4930D', '#10B981', '#3B82F6', '#8B5CF6', '#F97316']

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
          <div className="w-16 h-16 bg-[var(--bg-alt)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Compare Players</h3>
          <p className="text-text-muted text-sm">
            Select 2-5 players to compare their stats side by side
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
    owgrRank: 'OWGR',
    cpi: 'CPI',
    drivingDistance: 'Driving Distance',
    drivingAccuracy: 'Driving Accuracy',
    gir: 'Greens in Reg',
    scoringAvg: 'Scoring Avg',
  }

  const formatStatValue = (stat, value) => {
    if (stat === 'owgrRank') return value ? `#${value}` : '\u2014'
    if (stat === 'cpi') return value ? (value > 0 ? '+' : '') + value.toFixed(1) : '\u2014'
    if (stat === 'drivingDistance') return `${value.toFixed(1)} yds`
    if (stat === 'drivingAccuracy' || stat === 'gir') return `${value.toFixed(1)}%`
    if (stat === 'scoringAvg') return value.toFixed(2)
    return value ? (value > 0 ? '+' : '') + value.toFixed(2) : '\u2014'
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-text-primary">Player Comparison</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear All
        </Button>
      </div>

      {/* SG Radar Chart */}
      <div className="mb-6">
        <SgRadarChart players={players} />
      </div>

      {/* Player Headers with headshots */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
        {players.map((player, pi) => (
          <div
            key={player.id}
            className="bg-[var(--bg-alt)] rounded-lg p-3 text-center relative"
            style={{ borderTop: `3px solid ${COLORS[pi % COLORS.length]}` }}
          >
            <button
              onClick={() => onRemovePlayer(player.id)}
              className="absolute top-2 right-2 text-text-muted hover:text-live-red transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-12 h-12 rounded-full bg-[var(--surface)] overflow-hidden mx-auto mb-2">
              {player.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-lg font-bold">
                  {player.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <p className="text-text-primary font-bold text-sm">{player.name}</p>
            {player.countryFlag && (
              <p className="text-[10px] text-text-primary/30 mt-0.5">{player.countryFlag}</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              {player.owgrRank && (
                <span className="text-[10px] font-mono text-text-primary/50">OWGR #{player.owgrRank}</span>
              )}
              {player.cpi != null && (
                <span className={`text-[10px] font-mono font-bold ${player.cpi >= 0 ? 'text-field-bright' : 'text-live-red'}`}>
                  CPI {player.cpi > 0 ? '+' : ''}{player.cpi.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stat Comparisons */}
      <div className="space-y-3">
        {Object.entries(comparisonData).map(([stat, data]) => (
          <div key={stat} className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--card-border)]">
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">{statLabels[stat] || stat}</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
              {data.map((item) => {
                const player = players.find(p => p.id === item.playerId)
                return (
                  <div key={item.playerId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted truncate">
                        {player?.name.split(' ').pop()}
                      </span>
                      <span className={`text-xs font-mono font-medium ${
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

      {/* Categories Won Summary */}
      <div className="mt-6 p-4 bg-[var(--bg-alt)] rounded-lg">
        <h4 className="text-text-primary font-medium text-sm mb-2">Categories Won</h4>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
          {players.map((player, pi) => {
            const wins = Object.values(comparisonData).filter(data =>
              data.find(d => d.playerId === player.id)?.isBest
            ).length
            return (
              <div key={player.id} className="text-center">
                <p className="text-2xl font-bold font-display" style={{ color: COLORS[pi % COLORS.length] }}>{wins}</p>
                <p className="text-text-muted text-[10px] font-medium">{player.name?.split(' ').pop()}</p>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default PlayerComparison
