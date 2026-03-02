import Card from '../common/Card'

const SurvivorStandings = ({ standings, survivorData, currentUserId }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  // Separate by status and sort by points
  const alive = standings.filter(t => t.status === 'alive' || t.status === 'buyback').sort((a, b) => b.points - a.points)
  const eliminated = standings.filter(t => t.status === 'eliminated').sort((a, b) => (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0))

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold font-display text-text-primary">Survivor Standings</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold"></div>
            <span className="text-text-muted">{alive.length} Alive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-live-red"></div>
            <span className="text-text-muted">{eliminated.length} Eliminated</span>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-text-muted mb-2">
          <span>Week {survivorData?.currentWeek || 1}</span>
          <span>{alive.length} teams remaining</span>
        </div>
        <div className="h-2 bg-[var(--stone)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-live-red transition-all duration-500"
            style={{ width: `${((standings.length - alive.length) / standings.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-text-muted border-b border-[var(--card-border)]">
              <th className="pb-3 pl-2">Rank</th>
              <th className="pb-3">Team</th>
              <th className="pb-3 text-center">Status</th>
              <th className="pb-3 text-right pr-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {alive.map((team, index) => {
              const isUser = team.userId === currentUserId

              return (
                <tr
                  key={team.userId}
                  className={`border-b border-[var(--card-border)]/50 ${
                    isUser ? 'bg-gold/10' : 'hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  <td className="py-3 pl-2">
                    <span className={`font-semibold ${
                      index === 0 ? 'text-crown' :
                      index === 1 ? 'text-gray-400 dark:text-gray-300' :
                      index === 2 ? 'text-amber-700 dark:text-amber-500' : 'text-text-muted'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isUser ? 'bg-gold/20 text-gold' : 'bg-[var(--bg-alt)] text-text-secondary'
                      }`}>
                        {team.avatar}
                      </div>
                      <span className={`font-medium ${isUser ? 'text-gold' : 'text-text-primary'}`}>
                        {team.name}
                        {isUser && <span className="text-xs ml-1">(You)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      team.status === 'buyback'
                        ? 'bg-crown/20 text-crown'
                        : 'bg-gold/20 text-gold'
                    }`}>
                      {team.status === 'buyback' ? 'Buyback' : 'Alive'}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 font-semibold text-text-primary">
                    {team.points?.toLocaleString()}
                  </td>
                </tr>
              )
            })}

            {/* Divider */}
            {eliminated.length > 0 && (
              <tr>
                <td colSpan={4} className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-live-red/30"></div>
                    <span className="text-xs text-live-red">Eliminated</span>
                    <div className="flex-1 h-px bg-live-red/30"></div>
                  </div>
                </td>
              </tr>
            )}

            {eliminated.map((team) => {
              const isUser = team.userId === currentUserId

              return (
                <tr
                  key={team.userId}
                  className={`border-b border-[var(--card-border)]/50 opacity-60 ${
                    isUser ? 'bg-live-red/10' : ''
                  }`}
                >
                  <td className="py-3 pl-2">
                    <span className="text-text-muted">-</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isUser ? 'bg-live-red/20 text-live-red' : 'bg-[var(--bg-alt)] text-text-muted'
                      }`}>
                        {team.avatar}
                      </div>
                      <span className={`font-medium ${isUser ? 'text-live-red' : 'text-text-secondary'}`}>
                        {team.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-live-red/20 text-live-red">
                      Week {team.eliminatedWeek}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 text-text-muted">
                    {team.points?.toLocaleString()}
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

export default SurvivorStandings
