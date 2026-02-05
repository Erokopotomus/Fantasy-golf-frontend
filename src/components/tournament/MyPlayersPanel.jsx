import Card from '../common/Card'

const MyPlayersPanel = ({ players, onSelectPlayer, selectedPlayerId }) => {
  const formatScore = (score) => {
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return score
  }

  const totalPoints = players.reduce((sum, p) => sum + (p.fantasyPoints || 0), 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">My Players</h3>
        <div className="text-right">
          <p className="text-xs text-text-muted">Fantasy Points</p>
          <p className="text-xl font-bold text-accent-green">{totalPoints}</p>
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            onClick={() => onSelectPlayer?.(player)}
            className={`
              p-3 rounded-lg cursor-pointer transition-all
              ${selectedPlayerId === player.id
                ? 'bg-accent-green/20 border border-accent-green'
                : 'bg-dark-tertiary hover:bg-dark-secondary border border-transparent'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{player.countryFlag}</span>
                <div>
                  <p className="font-medium text-white">{player.name}</p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{player.position}</span>
                    <span>•</span>
                    <span>Thru {player.thru}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${parseInt(player.score) < 0 ? 'text-accent-green' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatScore(player.score)}
                </p>
                <p className="text-xs text-accent-green">+{player.fantasyPoints || 0} pts</p>
              </div>
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p>No players in your lineup</p>
            <p className="text-xs mt-1">Set your lineup before the tournament starts</p>
          </div>
        )}
      </div>
    </Card>
  )
}

export default MyPlayersPanel
