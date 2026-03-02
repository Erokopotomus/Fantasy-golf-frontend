import Card from '../common/Card'

const WeeklyBreakdown = ({ results, currentUserId }) => {
  if (!results || results.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Weekly Results</h3>
        <p className="text-text-muted text-center py-8">No tournament results yet</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Tournament Results</h3>

      <div className="space-y-4">
        {results.map((week) => (
          <div key={week.tournamentId} className="bg-[var(--card-bg)] rounded-lg overflow-hidden">
            {/* Tournament Header */}
            <div className="p-3 bg-[var(--surface)] border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">{week.tournamentName}</p>
                  <p className="text-xs text-text-muted">{week.dates}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  week.status === 'completed'
                    ? 'bg-field-bright/20 text-field'
                    : week.status === 'live'
                      ? 'bg-live-red/20 text-live-red'
                      : 'bg-crown/20 text-crown'
                }`}>
                  {week.status === 'completed' ? 'Final' : week.status?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-[var(--card-border)]/50">
                    <th className="p-2 text-center w-12">#</th>
                    <th className="p-2 text-left">Team</th>
                    <th className="p-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {week.results.slice(0, 5).map((result, idx) => {
                    const isCurrentUser = result.userId === currentUserId

                    return (
                      <tr
                        key={result.teamId}
                        className={`
                          border-b border-[var(--card-border)]/30
                          ${isCurrentUser ? 'bg-field/10' : ''}
                        `}
                      >
                        <td className="p-2 text-center">
                          {idx === 0 && <span className="text-crown">🥇</span>}
                          {idx === 1 && <span className="text-gray-400 dark:text-gray-300">🥈</span>}
                          {idx === 2 && <span className="text-amber-700 dark:text-amber-500">🥉</span>}
                          {idx > 2 && <span className="text-text-muted">{idx + 1}</span>}
                        </td>
                        <td className={`p-2 font-medium ${isCurrentUser ? 'text-field' : 'text-text-primary'}`}>
                          {result.teamName}
                        </td>
                        <td className="p-2 text-right font-bold text-field">
                          {result.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default WeeklyBreakdown
