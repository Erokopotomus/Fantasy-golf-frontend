import Card from '../common/Card'

const TournamentLeaderboard = ({ leaderboard, cut, onSelectPlayer, myPlayerIds = [] }) => {
  const getPositionStyle = (position) => {
    if (position === '1st') return 'text-yellow-400 font-bold'
    if (position === '2nd' || position === 'T2') return 'text-gray-300 font-semibold'
    if (position === '3rd' || position === 'T3') return 'text-amber-600 font-semibold'
    return 'text-text-secondary'
  }

  const getScoreStyle = (score) => {
    const numScore = parseInt(score)
    if (numScore < 0) return 'text-accent-green'
    if (numScore > 0) return 'text-red-400'
    return 'text-white'
  }

  const formatScore = (score) => {
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return score
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <p className="text-text-muted text-sm">Cut: {formatScore(cut)}</p>
      </div>

      <div className="overflow-auto max-h-[500px]">
        <table className="w-full">
          <thead className="bg-dark-tertiary sticky top-0">
            <tr className="text-xs text-text-muted">
              <th className="p-3 text-left w-16">Pos</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-center">Today</th>
              <th className="p-3 text-center">Thru</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => {
              const isMyPlayer = myPlayerIds.includes(player.id)
              const isCutLine = cut && parseInt(player.score) === cut

              return (
                <tr
                  key={player.id}
                  onClick={() => onSelectPlayer?.(player)}
                  className={`
                    border-b border-dark-border/50 transition-colors cursor-pointer
                    ${isMyPlayer ? 'bg-accent-green/10' : 'hover:bg-dark-tertiary/50'}
                    ${isCutLine ? 'border-b-2 border-b-red-500/50' : ''}
                  `}
                >
                  <td className={`p-3 ${getPositionStyle(player.position)}`}>
                    {player.position}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{player.countryFlag}</span>
                      <div>
                        <p className={`font-medium ${isMyPlayer ? 'text-accent-green' : 'text-white'}`}>
                          {player.name}
                        </p>
                        {isMyPlayer && (
                          <span className="text-xs text-accent-green">My Player</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`p-3 text-center ${getScoreStyle(player.today)}`}>
                    {formatScore(player.today)}
                  </td>
                  <td className="p-3 text-center text-text-secondary">
                    {player.thru}
                  </td>
                  <td className={`p-3 text-right font-bold ${getScoreStyle(player.score)}`}>
                    {formatScore(player.score)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default TournamentLeaderboard
