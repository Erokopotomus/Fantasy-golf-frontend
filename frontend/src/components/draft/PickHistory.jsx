import Card from '../common/Card'
import EmptyState from '../common/EmptyState'

const PickHistory = ({ picks, limit = 10 }) => {
  const recentPicks = [...picks].reverse().slice(0, limit)

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Recent Picks</h3>

      {recentPicks.length === 0 ? (
        <EmptyState icon="history" title="No picks yet" message="Picks will appear here as the draft progresses." />
      ) : (
        <div className="space-y-2">
          {recentPicks.map((pick, index) => (
            <div
              key={pick.id || index}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${index === 0 ? 'bg-gold/10 border border-gold/30' : 'bg-[var(--card-bg)]'}
              `}
            >
              <div className="w-8 h-8 bg-[var(--bg)] rounded-full flex items-center justify-center text-text-muted text-xs font-medium">
                {pick.pickNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{pick.playerFlag}</span>
                  <span className="text-text-primary font-medium truncate">
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
        <button className="w-full text-center text-gold text-sm mt-3 hover:underline">
          View all {picks.length} picks
        </button>
      )}
    </Card>
  )
}

export default PickHistory
