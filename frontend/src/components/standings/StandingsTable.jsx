import Card from '../common/Card'

const StandingsTable = ({ standings, currentUserId }) => {
  const getTrendIcon = (trend) => {
    if (trend > 0) {
      return (
        <span className="flex items-center text-accent-green text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {trend}
        </span>
      )
    }
    if (trend < 0) {
      return (
        <span className="flex items-center text-red-400 text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {Math.abs(trend)}
        </span>
      )
    }
    return <span className="text-text-muted text-xs">-</span>
  }

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/50'
    if (rank === 3) return 'bg-amber-600/20 text-amber-500 border-amber-600/50'
    return 'bg-dark-tertiary text-text-secondary border-dark-border'
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-lg font-semibold text-white">Season Standings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-tertiary">
            <tr className="text-xs text-text-muted">
              <th className="p-3 text-center w-16">Rank</th>
              <th className="p-3 text-left">Team</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">T</th>
              <th className="p-3 text-right">Points</th>
              <th className="p-3 text-right hidden sm:table-cell">Avg</th>
              <th className="p-3 text-center hidden md:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => {
              const isCurrentUser = team.userId === currentUserId

              return (
                <tr
                  key={team.id}
                  className={`
                    border-b border-dark-border/50 transition-colors
                    ${isCurrentUser ? 'bg-accent-green/10' : 'hover:bg-dark-tertiary/50'}
                  `}
                >
                  <td className="p-3 text-center">
                    <span className={`
                      inline-flex items-center justify-center w-8 h-8 rounded-full border
                      font-bold text-sm ${getRankStyle(team.rank)}
                    `}>
                      {team.rank}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center text-lg">
                        {team.avatar || '⛳'}
                      </div>
                      <div>
                        <p className={`font-medium ${isCurrentUser ? 'text-accent-green' : 'text-white'}`}>
                          {team.name}
                        </p>
                        <p className="text-xs text-text-muted">{team.ownerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center font-medium text-accent-green">{team.wins}</td>
                  <td className="p-3 text-center font-medium text-red-400">{team.losses}</td>
                  <td className="p-3 text-center font-medium text-text-secondary">{team.ties}</td>
                  <td className="p-3 text-right font-bold text-white">{(team.totalPoints || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-text-secondary hidden sm:table-cell">
                    {typeof team.avgPoints === 'number' ? team.avgPoints.toFixed(1) : '-'}
                  </td>
                  <td className="p-3 text-center hidden md:table-cell">
                    {getTrendIcon(team.trend)}
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

export default StandingsTable
