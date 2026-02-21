import Card from '../common/Card'

const RotoOverview = ({ team, categories, categoryLabels, totalTeams, currentUserId }) => {
  if (!team) return null

  const isUser = team.userId === currentUserId

  // Calculate strengths and weaknesses
  const categoryPerformance = categories
    .map(cat => ({
      id: cat,
      label: categoryLabels[cat] || cat,
      rank: team.categories?.[cat]?.rank || totalTeams,
      value: team.categories?.[cat]?.value,
      points: team.categories?.[cat]?.points || 0,
    }))
    .sort((a, b) => a.rank - b.rank)

  const strengths = categoryPerformance.slice(0, 2)
  const weaknesses = categoryPerformance.slice(-2).reverse()

  return (
    <Card className={isUser ? 'ring-2 ring-gold/30' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
            isUser ? 'bg-gold/20 text-gold' : 'bg-dark-tertiary text-text-secondary'
          }`}>
            {team.avatar}
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${isUser ? 'text-gold' : 'text-text-primary'}`}>
              {team.name}
              {isUser && <span className="text-sm font-normal ml-2">(You)</span>}
            </h3>
            <p className="text-sm text-text-muted">Roto Standings</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold font-display text-gold">{team.totalRotoPoints}</p>
          <p className="text-xs text-text-muted">Total Roto Points</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {categories.map(cat => {
          const catData = team.categories?.[cat]
          const rank = catData?.rank || totalTeams
          const value = catData?.value
          const pct = rank / totalTeams

          let bgColor = 'bg-dark-tertiary'
          if (pct <= 0.33) bgColor = 'bg-gold/10 border-gold/30'
          else if (pct <= 0.66) bgColor = 'bg-yellow-500/10 border-yellow-500/30'
          else bgColor = 'bg-red-400/10 border-red-400/30'

          return (
            <div key={cat} className={`p-3 rounded-lg border ${bgColor}`}>
              <p className="text-xs text-text-muted mb-1">{categoryLabels[cat] || cat}</p>
              <p className="text-lg font-bold font-display text-text-primary">
                {typeof value === 'number'
                  ? cat === 'scoring_avg'
                    ? value.toFixed(1)
                    : value
                  : '-'}
              </p>
              <p className={`text-xs font-medium ${
                pct <= 0.33 ? 'text-gold' :
                pct <= 0.66 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                Rank: {rank}/{totalTeams}
              </p>
            </div>
          )
        })}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gold mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Strengths
          </h4>
          <div className="space-y-2">
            {strengths.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2 bg-gold/10 rounded">
                <span className="text-sm text-text-primary">{cat.label}</span>
                <span className="text-sm font-semibold text-gold">#{cat.rank}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Needs Improvement
          </h4>
          <div className="space-y-2">
            {weaknesses.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2 bg-red-400/10 rounded">
                <span className="text-sm text-text-primary">{cat.label}</span>
                <span className="text-sm font-semibold text-red-400">#{cat.rank}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default RotoOverview
