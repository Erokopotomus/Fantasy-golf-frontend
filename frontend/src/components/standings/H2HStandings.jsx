import Card from '../common/Card'
import { calculateWinPct } from '../../utils/scheduleGenerator'

const H2HStandings = ({ standings, currentUserId }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  // Sort by wins, then by points for
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.ties !== a.ties) return b.ties - a.ties
    return b.pointsFor - a.pointsFor
  })

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Head-to-Head Standings</h3>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-text-muted border-b border-dark-border">
              <th className="pb-3 pl-2">Rank</th>
              <th className="pb-3">Team</th>
              <th className="pb-3 text-center">W</th>
              <th className="pb-3 text-center">L</th>
              <th className="pb-3 text-center">T</th>
              <th className="pb-3 text-center">PCT</th>
              <th className="pb-3 text-right">PF</th>
              <th className="pb-3 text-right">PA</th>
              <th className="pb-3 text-right pr-2">+/-</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => {
              const isUser = team.userId === currentUserId
              const diff = (team.pointsFor || 0) - (team.pointsAgainst || 0)

              return (
                <tr
                  key={team.userId}
                  className={`border-b border-dark-border/50 ${
                    isUser ? 'bg-emerald-400/10' : 'hover:bg-dark-tertiary/50'
                  }`}
                >
                  <td className="py-3 pl-2">
                    <span className={`font-semibold ${
                      index === 0 ? 'text-yellow-400' :
                      index < 4 ? 'text-emerald-400' : 'text-text-muted'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isUser ? 'bg-emerald-400/20 text-emerald-400' : 'bg-dark-primary text-text-secondary'
                      }`}>
                        {team.avatar}
                      </div>
                      <span className={`font-medium ${isUser ? 'text-emerald-400' : 'text-white'}`}>
                        {team.name}
                        {isUser && <span className="text-xs ml-1">(You)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-white font-semibold">{team.wins || 0}</td>
                  <td className="py-3 text-center text-text-secondary">{team.losses || 0}</td>
                  <td className="py-3 text-center text-text-muted">{team.ties || 0}</td>
                  <td className="py-3 text-center text-text-secondary">
                    {calculateWinPct(team.wins || 0, team.losses || 0, team.ties || 0)}
                  </td>
                  <td className="py-3 text-right text-white">{(team.pointsFor || 0).toLocaleString()}</td>
                  <td className="py-3 text-right text-text-secondary">{(team.pointsAgainst || 0).toLocaleString()}</td>
                  <td className={`py-3 text-right pr-2 font-semibold ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-text-muted'
                  }`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {sortedStandings.map((team, index) => {
          const isUser = team.userId === currentUserId
          const diff = (team.pointsFor || 0) - (team.pointsAgainst || 0)

          return (
            <div
              key={team.userId}
              className={`p-3 rounded-lg ${
                isUser ? 'bg-emerald-400/10 border border-emerald-400/30' : 'bg-dark-tertiary'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold w-6 ${
                    index === 0 ? 'text-yellow-400' :
                    index < 4 ? 'text-emerald-400' : 'text-text-muted'
                  }`}>
                    {index + 1}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isUser ? 'bg-emerald-400/20 text-emerald-400' : 'bg-dark-primary text-text-secondary'
                  }`}>
                    {team.avatar}
                  </div>
                  <span className={`font-medium ${isUser ? 'text-emerald-400' : 'text-white'}`}>
                    {team.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    {team.wins || 0}-{team.losses || 0}{team.ties ? `-${team.ties}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>PF: {(team.pointsFor || 0).toLocaleString()}</span>
                <span>PA: {(team.pointsAgainst || 0).toLocaleString()}</span>
                <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : ''}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-dark-border flex flex-wrap gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span>1st Place</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span>Playoff Position (Top 4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">PF = Points For</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">PA = Points Against</span>
        </div>
      </div>
    </Card>
  )
}

export default H2HStandings
