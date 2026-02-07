import Card from '../common/Card'

const UsedPlayersGrid = ({ usedPlayers = [], picks = [], allPlayers = [] }) => {
  // Create a map of player info
  const playerMap = allPlayers.reduce((acc, p) => {
    acc[p.id] = p
    return acc
  }, {})

  // Create a map of picks for quick lookup
  const pickMap = picks.reduce((acc, pick) => {
    acc[pick.playerId] = pick
    return acc
  }, {})

  if (usedPlayers.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Used Players</h3>
        <div className="text-center py-8 text-text-muted">
          No players used yet. Make your first pick!
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-white">Used Players</h3>
        <span className="text-sm text-text-muted">{usedPlayers.length} players used</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {usedPlayers.map(playerId => {
          const player = playerMap[playerId]
          const pick = pickMap[playerId]

          return (
            <div
              key={playerId}
              className="bg-dark-tertiary rounded-lg p-3 opacity-60"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{player?.countryFlag || '🏌️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {player?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-text-muted">#{player?.rank || '?'}</p>
                </div>
              </div>

              {pick && (
                <div className="pt-2 border-t border-dark-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{pick.position}</span>
                    <span className="text-gold font-medium">+{pick.points}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center justify-center">
                <span className="text-xs text-red-400 font-medium px-2 py-0.5 bg-red-400/10 rounded">
                  USED
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default UsedPlayersGrid
