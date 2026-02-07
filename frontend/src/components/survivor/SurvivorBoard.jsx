import Card from '../common/Card'

const SurvivorBoard = ({ standings, survivorData, currentUserId, onBuyBack }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No survivor data available
        </div>
      </Card>
    )
  }

  const aliveTeams = standings.filter(t => t.status === 'alive')
  const buybackTeams = standings.filter(t => t.status === 'buyback')
  const eliminatedTeams = standings.filter(t => t.status === 'eliminated')

  const getStatusBadge = (status) => {
    switch (status) {
      case 'alive':
        return <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full">Alive</span>
      case 'buyback':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Buyback</span>
      case 'eliminated':
        return <span className="px-2 py-0.5 bg-red-400/20 text-red-400 text-xs rounded-full">Eliminated</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Alive Teams */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-display text-white flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gold animate-pulse"></div>
            Still Alive
          </h3>
          <span className="text-text-muted text-sm">{aliveTeams.length + buybackTeams.length} teams remaining</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...aliveTeams, ...buybackTeams]
            .sort((a, b) => b.points - a.points)
            .map((team, index) => {
              const isUser = team.userId === currentUserId

              return (
                <div
                  key={team.userId}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    isUser
                      ? 'bg-gold/10 border border-gold/30'
                      : 'bg-dark-tertiary'
                  }`}
                >
                  <div className={`text-xl font-bold w-6 ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-amber-600' : 'text-text-muted'
                  }`}>
                    {index + 1}
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isUser ? 'bg-gold/20 text-gold' : 'bg-dark-primary text-text-secondary'
                  }`}>
                    {team.avatar}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isUser ? 'text-gold' : 'text-white'}`}>
                        {team.name}
                      </p>
                      {getStatusBadge(team.status)}
                    </div>
                    <p className="text-xs text-text-muted">{team.points?.toLocaleString()} pts</p>
                  </div>

                  {/* Trophy for leader */}
                  {index === 0 && (
                    <div className="text-yellow-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                        <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </Card>

      {/* Eliminated Teams */}
      {eliminatedTeams.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold font-display text-white flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              Eliminated
            </h3>
            <span className="text-text-muted text-sm">{eliminatedTeams.length} teams out</span>
          </div>

          <div className="space-y-2">
            {eliminatedTeams
              .sort((a, b) => (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0))
              .map((team) => {
                const isUser = team.userId === currentUserId
                const canBuyBack = survivorData?.buyBacksAllowed && !team.usedBuyBack

                return (
                  <div
                    key={team.userId}
                    className={`flex items-center gap-4 p-4 rounded-lg opacity-60 ${
                      isUser ? 'bg-red-400/10 border border-red-400/30' : 'bg-dark-tertiary'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isUser ? 'bg-red-400/20 text-red-400' : 'bg-dark-primary text-text-secondary'
                    }`}>
                      {team.avatar}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isUser ? 'text-red-400' : 'text-white'}`}>
                          {team.name}
                        </p>
                        {getStatusBadge(team.status)}
                      </div>
                      <p className="text-xs text-text-muted">
                        Eliminated Week {team.eliminatedWeek} - {team.points?.toLocaleString()} pts
                      </p>
                    </div>

                    {/* Buy-back button */}
                    {isUser && canBuyBack && onBuyBack && (
                      <button
                        onClick={() => onBuyBack(team.userId)}
                        className="px-3 py-1 bg-yellow-500 text-dark-primary text-sm font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                      >
                        Use Buy-Back
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Elimination History */}
      {survivorData?.eliminations?.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold font-display text-white mb-4">Elimination History</h3>
          <div className="space-y-2">
            {survivorData.eliminations
              .sort((a, b) => b.week - a.week)
              .map((elimination, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-dark-tertiary rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">Week {elimination.week}</span>
                    <span className="text-white font-medium">{elimination.name}</span>
                  </div>
                  <span className="text-sm text-red-400">{elimination.points} pts</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default SurvivorBoard
