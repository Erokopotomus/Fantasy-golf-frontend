import Card from '../common/Card'
import { calculateWinPct } from '../../utils/scheduleGenerator'

const H2HStandings = ({ standings, currentUserId, divisionStandings }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  const hasDivisions = divisionStandings && Object.keys(divisionStandings).length > 0

  // Render a standings table for a group of teams
  const renderTable = (teams, startRank = 1) => (
    <>
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
              {hasDivisions && <th className="pb-3 text-center">Div</th>}
              <th className="pb-3 text-right">PF</th>
              <th className="pb-3 text-right">PA</th>
              <th className="pb-3 text-right pr-2">+/-</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const isUser = team.userId === currentUserId
              const diff = (team.pointsFor || 0) - (team.pointsAgainst || 0)
              const rank = startRank + index

              return (
                <tr
                  key={team.userId}
                  className={`border-b border-dark-border/50 ${
                    isUser ? 'bg-emerald-400/10' : 'hover:bg-dark-tertiary/50'
                  }`}
                >
                  <td className="py-3 pl-2">
                    <span className={`font-semibold ${
                      rank === 1 ? 'text-yellow-400' :
                      rank <= 4 ? 'text-emerald-400' : 'text-text-muted'
                    }`}>
                      {rank}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isUser ? 'bg-emerald-400/20 text-emerald-400' : 'bg-dark-primary text-text-secondary'
                      }`}>
                        {team.avatar}
                      </div>
                      <span className={`font-medium ${isUser ? 'text-emerald-400' : 'text-text-primary'}`}>
                        {team.name}
                        {isUser && <span className="text-xs ml-1">(You)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono text-text-primary font-semibold">{team.wins || 0}</td>
                  <td className="py-3 text-center font-mono text-text-secondary">{team.losses || 0}</td>
                  <td className="py-3 text-center font-mono text-text-muted">{team.ties || 0}</td>
                  <td className="py-3 text-center font-mono text-text-secondary">
                    {calculateWinPct(team.wins || 0, team.losses || 0, team.ties || 0)}
                  </td>
                  {hasDivisions && (
                    <td className="py-3 text-center font-mono text-text-muted text-xs">
                      {team.divWins != null ? `${team.divWins}-${team.divLosses}${team.divTies ? `-${team.divTies}` : ''}` : '-'}
                    </td>
                  )}
                  <td className="py-3 text-right font-mono text-text-primary">{(team.pointsFor || 0).toFixed(1)}</td>
                  <td className="py-3 text-right font-mono text-text-secondary">{(team.pointsAgainst || 0).toFixed(1)}</td>
                  <td className={`py-3 text-right pr-2 font-mono font-semibold ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-text-muted'
                  }`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {teams.map((team, index) => {
          const isUser = team.userId === currentUserId
          const diff = (team.pointsFor || 0) - (team.pointsAgainst || 0)
          const rank = startRank + index

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
                    rank === 1 ? 'text-yellow-400' :
                    rank <= 4 ? 'text-emerald-400' : 'text-text-muted'
                  }`}>
                    {rank}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isUser ? 'bg-emerald-400/20 text-emerald-400' : 'bg-dark-primary text-text-secondary'
                  }`}>
                    {team.avatar}
                  </div>
                  <span className={`font-medium ${isUser ? 'text-emerald-400' : 'text-text-primary'}`}>
                    {team.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-text-primary font-mono font-semibold">
                    {team.wins || 0}-{team.losses || 0}{team.ties ? `-${team.ties}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>PF: {(team.pointsFor || 0).toFixed(1)}</span>
                <span>PA: {(team.pointsAgainst || 0).toFixed(1)}</span>
                {hasDivisions && team.divWins != null && (
                  <span>Div: {team.divWins}-{team.divLosses}</span>
                )}
                <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : ''}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  // Sort overall standings
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.ties !== a.ties) return b.ties - a.ties
    return b.pointsFor - a.pointsFor
  })

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Head-to-Head Standings</h3>

      {hasDivisions ? (
        <div className="space-y-6">
          {Object.entries(divisionStandings).map(([divName, divTeams]) => (
            <div key={divName}>
              <h4 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3 pb-2 border-b border-gold/30">
                {divName}
              </h4>
              {renderTable(divTeams)}
            </div>
          ))}
        </div>
      ) : (
        renderTable(sortedStandings)
      )}

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
        {hasDivisions && (
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Div = Division Record</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default H2HStandings
