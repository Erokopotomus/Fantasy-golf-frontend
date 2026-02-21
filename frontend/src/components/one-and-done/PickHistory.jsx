import Card from '../common/Card'

const PickHistory = ({ picks = [], tiers = [] }) => {
  const tierColors = [
    { bg: 'bg-yellow-400/10', text: 'text-yellow-400' },
    { bg: 'bg-purple-400/10', text: 'text-purple-400' },
    { bg: 'bg-blue-400/10', text: 'text-blue-400' },
    { bg: 'bg-green-400/10', text: 'text-green-400' },
  ]

  if (picks.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Pick History</h3>
        <div className="text-center py-8 text-text-muted">
          No picks made yet
        </div>
      </Card>
    )
  }

  // Sort picks by tournament (most recent first)
  const sortedPicks = [...picks].reverse()

  // Calculate total points
  const totalPoints = picks.reduce((sum, pick) => sum + (pick.points || 0), 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-text-primary">Pick History</h3>
        <div className="text-right">
          <span className="text-2xl font-bold font-display text-gold">{totalPoints}</span>
          <p className="text-xs text-text-muted">Total Points</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedPicks.map((pick, index) => {
          const tierIndex = (pick.tier || 1) - 1
          const colors = tierColors[tierIndex] || tierColors[tierColors.length - 1]

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-dark-tertiary rounded-lg"
            >
              {/* Tournament Number */}
              <div className="text-2xl font-bold font-display text-text-muted w-8 text-center">
                {sortedPicks.length - index}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <p className="text-text-primary font-medium">{pick.playerName}</p>
                <p className="text-xs text-text-muted">
                  Tournament #{sortedPicks.length - index}
                </p>
              </div>

              {/* Tier Badge */}
              <div className={`px-2 py-1 rounded ${colors.bg}`}>
                <span className={`text-xs font-medium ${colors.text}`}>
                  Tier {pick.tier} ({pick.multiplier}x)
                </span>
              </div>

              {/* Result */}
              <div className="text-right">
                <p className="text-lg font-bold font-display text-gold">+{pick.points}</p>
                <p className="text-xs text-text-muted">{pick.position}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-dark-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-text-primary">{picks.length}</p>
            <p className="text-xs text-text-muted">Tournaments</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-gold">
              {Math.round(totalPoints / (picks.length || 1))}
            </p>
            <p className="text-xs text-text-muted">Avg Points</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-yellow-400">
              {picks.filter(p => p.tier === 1).length}
            </p>
            <p className="text-xs text-text-muted">Tier 1 Used</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PickHistory
