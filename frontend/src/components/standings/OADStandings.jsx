import Card from '../common/Card'

const OADStandings = ({ standings, currentUserId }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  // Sort by points
  const sortedStandings = [...standings].sort((a, b) => b.points - a.points)

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">One & Done Standings</h3>

      <div className="space-y-2">
        {sortedStandings.map((team, index) => {
          const isUser = team.userId === currentUserId
          const leader = sortedStandings[0].points
          const behind = leader - team.points

          return (
            <div
              key={team.userId}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                isUser
                  ? 'bg-accent-green/10 border border-accent-green/30'
                  : 'bg-dark-tertiary hover:bg-dark-tertiary/70'
              }`}
            >
              {/* Rank */}
              <div className={`text-2xl font-bold w-8 text-center ${
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-amber-600' : 'text-text-muted'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                isUser ? 'bg-accent-green/20 text-accent-green' : 'bg-dark-primary text-text-secondary'
              }`}>
                {team.avatar}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <p className={`font-semibold ${isUser ? 'text-accent-green' : 'text-white'}`}>
                  {team.name}
                  {isUser && <span className="text-xs font-normal ml-2">(You)</span>}
                </p>
                <p className="text-xs text-text-muted">
                  {team.usedPlayers || 0} players used
                </p>
              </div>

              {/* Points Behind */}
              <div className="text-right mr-4">
                {behind > 0 ? (
                  <p className="text-sm text-red-400">-{behind}</p>
                ) : (
                  <p className="text-sm text-accent-green">Leader</p>
                )}
              </div>

              {/* Total Points */}
              <div className="text-right">
                <p className="text-2xl font-bold text-accent-green">{team.points}</p>
                <p className="text-xs text-text-muted">pts</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-dark-border text-xs text-text-muted">
        <p>Points include tier multipliers. Higher tier picks earn bonus multipliers on their points.</p>
      </div>
    </Card>
  )
}

export default OADStandings
