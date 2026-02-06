import Card from '../common/Card'

const PlayerHeader = ({ player, onAddToRoster, onProposeTrade, isOwned, isOnMyTeam }) => {
  if (!player) return null

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    if (rank <= 5) return 'bg-accent-green/20 text-accent-green border-accent-green/50'
    if (rank <= 10) return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    if (rank <= 25) return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    return 'bg-dark-tertiary text-text-secondary border-dark-border'
  }

  const getTourBadge = (tour) => {
    if (!tour) return null
    const t = tour.toUpperCase()
    if (t === 'PGA') return { label: 'PGA TOUR', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/50' }
    if (t === 'LIV') return { label: 'LIV Golf', cls: 'bg-red-500/20 text-red-400 border-red-500/50' }
    if (t === 'DP' || t === 'DP WORLD' || t === 'EURO') return { label: 'DP World', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/50' }
    if (t === 'KFT' || t === 'KORN FERRY') return { label: 'Korn Ferry', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' }
    return null
  }

  const tourBadge = getTourBadge(player.primaryTour)

  const quickStats = [
    {
      label: 'SG Total',
      value: player.stats?.sgTotal != null
        ? `${player.stats.sgTotal > 0 ? '+' : ''}${player.stats.sgTotal.toFixed(2)}`
        : null,
      color: 'text-accent-green',
    },
    {
      label: 'DG Rank',
      value: player.datagolfRank != null ? `#${player.datagolfRank}` : null,
      color: 'text-white',
    },
    {
      label: 'Events',
      value: player.events > 0 ? player.events : null,
      color: 'text-white',
    },
    {
      label: 'Wins',
      value: player.wins > 0 ? player.wins : player.events > 0 ? '0' : null,
      color: player.wins > 0 ? 'text-yellow-400' : 'text-white',
    },
  ]

  return (
    <Card className="bg-gradient-to-r from-dark-card to-dark-tertiary">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Player Avatar/Flag */}
        <div className="flex items-center gap-4">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-20 h-20 rounded-full object-cover bg-dark-primary border-2 border-dark-border" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          ) : null}
          <div className={`w-20 h-20 rounded-full bg-dark-primary flex items-center justify-center text-4xl border-2 border-dark-border ${player.headshotUrl ? 'hidden' : ''}`}>
            {player.countryFlag}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              {isOnMyTeam && (
                <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded font-medium">
                  My Player
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {player.rank && (
                <span className={`px-2 py-0.5 rounded border font-medium ${getRankBadge(player.rank)}`}>
                  #{player.rank} OWGR
                </span>
              )}
              {tourBadge && (
                <span className={`px-2 py-0.5 rounded border font-medium ${tourBadge.cls}`}>
                  {tourBadge.label}
                </span>
              )}
              <span className="text-text-secondary">{player.country}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sm:ml-auto flex gap-2">
          {!isOwned && (
            <button
              onClick={onAddToRoster}
              className="px-4 py-2 bg-accent-green text-white rounded-lg font-medium hover:bg-accent-green/90 transition-colors"
            >
              Add to Roster
            </button>
          )}
          {isOwned && !isOnMyTeam && (
            <button
              onClick={onProposeTrade}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 transition-colors"
            >
              Propose Trade
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dark-border">
        {quickStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className={`text-2xl font-bold ${stat.value != null ? stat.color : 'text-text-muted'}`}>
              {stat.value ?? '—'}
            </p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default PlayerHeader
