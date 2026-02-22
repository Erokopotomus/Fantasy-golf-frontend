import Card from '../common/Card'

const CategoryTable = ({ standings, categories, categoryLabels, currentUserId }) => {
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No roto standings data available
        </div>
      </Card>
    )
  }

  // Sort by total roto points
  const sortedStandings = [...standings].sort((a, b) => b.totalRotoPoints - a.totalRotoPoints)

  // Determine if lower is better for a category (e.g., scoring average)
  const isLowerBetter = (categoryId) => {
    return categoryId === 'scoring_avg'
  }

  // Get color class based on rank
  const getRankColor = (rank, total) => {
    const pct = rank / total
    if (pct <= 0.2) return 'text-gold'
    if (pct <= 0.4) return 'text-green-400'
    if (pct <= 0.6) return 'text-yellow-400'
    if (pct <= 0.8) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Roto Category Standings</h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left text-xs text-text-muted border-b border-[var(--card-border)]">
              <th className="pb-3 pl-2 sticky left-0 bg-[var(--surface)] z-10">Rank</th>
              <th className="pb-3 sticky left-8 bg-[var(--surface)] z-10">Team</th>
              {categories.map(cat => (
                <th key={cat} className="pb-3 text-center px-2">
                  <div className="flex flex-col items-center">
                    <span>{categoryLabels[cat] || cat}</span>
                    {isLowerBetter(cat) && (
                      <span className="text-xs text-text-muted">(lower is better)</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="pb-3 text-center pr-2 font-semibold text-gold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => {
              const isUser = team.userId === currentUserId

              return (
                <tr
                  key={team.userId}
                  className={`border-b border-[var(--card-border)]/50 ${
                    isUser ? 'bg-gold/10' : 'hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  <td className="py-3 pl-2 sticky left-0 bg-[var(--surface)] z-10">
                    <span className={`font-semibold ${
                      index === 0 ? 'text-yellow-400' : 'text-text-muted'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 sticky left-8 bg-[var(--surface)] z-10">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isUser ? 'bg-gold/20 text-gold' : 'bg-[var(--bg-alt)] text-text-secondary'
                      }`}>
                        {team.avatar}
                      </div>
                      <span className={`font-medium ${isUser ? 'text-gold' : 'text-text-primary'}`}>
                        {team.name}
                      </span>
                    </div>
                  </td>
                  {categories.map(cat => {
                    const catData = team.categories?.[cat]
                    const value = catData?.value
                    const rank = catData?.rank
                    const points = catData?.points

                    return (
                      <td key={cat} className="py-3 text-center px-2">
                        <div className="flex flex-col items-center">
                          <span className="text-text-primary text-sm">
                            {typeof value === 'number'
                              ? cat === 'scoring_avg'
                                ? value.toFixed(1)
                                : value
                              : '-'}
                          </span>
                          <span className={`text-xs font-medium ${getRankColor(rank, sortedStandings.length)}`}>
                            {points ? `+${points}` : '-'}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-3 text-center pr-2">
                    <span className="text-lg font-bold font-display text-gold">
                      {team.totalRotoPoints}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <p className="text-xs text-text-muted mb-2">How Roto Scoring Works:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gold font-medium">+{sortedStandings.length}</span>
            <span className="text-text-muted">= 1st place in category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-medium">+1</span>
            <span className="text-text-muted">= Last place in category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Highest total points wins</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default CategoryTable
