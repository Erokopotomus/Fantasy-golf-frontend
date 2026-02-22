import Card from '../common/Card'

const RotoStandings = ({ standings, currentUserId }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  // Sort by total roto points
  const sortedStandings = [...standings].sort((a, b) => b.totalRotoPoints - a.totalRotoPoints)

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Roto Standings</h3>

      <div className="space-y-2">
        {sortedStandings.map((team, index) => {
          const isUser = team.userId === currentUserId
          const leader = sortedStandings[0].totalRotoPoints
          const behind = leader - team.totalRotoPoints

          return (
            <div
              key={team.userId}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                isUser
                  ? 'bg-gold/10 border border-gold/30'
                  : 'bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
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
                isUser ? 'bg-gold/20 text-gold' : 'bg-[var(--bg-alt)] text-text-secondary'
              }`}>
                {team.avatar}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <p className={`font-semibold ${isUser ? 'text-gold' : 'text-text-primary'}`}>
                  {team.name}
                  {isUser && <span className="text-xs font-normal ml-2">(You)</span>}
                </p>
                <p className="text-xs text-text-muted">
                  {behind > 0 ? `${behind} pts behind leader` : 'League Leader'}
                </p>
              </div>

              {/* Total Points */}
              <div className="text-right">
                <p className="text-2xl font-bold font-display text-gold">{team.totalRotoPoints}</p>
                <p className="text-xs text-text-muted">Roto Points</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default RotoStandings
