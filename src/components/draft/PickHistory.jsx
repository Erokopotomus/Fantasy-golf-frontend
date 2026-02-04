import Card from '../common/Card'

const PickHistory = ({ picks, limit = 10 }) => {
  const recentPicks = [...picks].reverse().slice(0, limit)

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Recent Picks</h3>

      {recentPicks.length === 0 ? (
        <div className="text-center py-6 text-text-muted">
          <p>No picks yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentPicks.map((pick, index) => (
            <div
              key={pick.id || index}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${index === 0 ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-dark-tertiary'}
              `}
            >
              <div className="w-8 h-8 bg-dark-primary rounded-full flex items-center justify-center text-text-muted text-xs font-medium">
                {pick.pickNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{pick.playerFlag}</span>
                  <span className="text-white font-medium truncate">
                    {pick.playerName}
                  </span>
                </div>
                <p className="text-text-muted text-xs">
                  {pick.teamName}
                  {pick.amount && ` • $${pick.amount}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs">
                  R{pick.round} P{pick.roundPick}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {picks.length > limit && (
        <button className="w-full text-center text-accent-green text-sm mt-3 hover:underline">
          View all {picks.length} picks
        </button>
      )}
    </Card>
  )
}

export default PickHistory
