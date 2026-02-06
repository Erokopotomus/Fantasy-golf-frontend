import Card from '../common/Card'

const ProbBar = ({ label, value, color = 'bg-accent-green' }) => {
  const pct = value != null ? (value * 100) : null
  if (pct == null) return null

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-white font-semibold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-dark-primary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

const PlayerPredictions = ({ predictions }) => {
  if (!predictions) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Tournament Predictions</h4>
        <p className="text-text-muted text-sm">No upcoming predictions available</p>
      </Card>
    )
  }

  const tournamentName = predictions.tournament?.name || 'Upcoming Tournament'

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-text-muted">Tournament Predictions</h4>
        <span className="text-xs text-text-secondary bg-dark-primary px-2 py-1 rounded">
          {tournamentName}
        </span>
      </div>

      <div className="space-y-3">
        <ProbBar label="Win" value={predictions.winProbability} color="bg-yellow-500" />
        <ProbBar label="Top 5" value={predictions.top5Probability} color="bg-accent-green" />
        <ProbBar label="Top 10" value={predictions.top10Probability} color="bg-blue-500" />
        <ProbBar label="Top 20" value={predictions.top20Probability} color="bg-purple-500" />
        <ProbBar label="Make Cut" value={predictions.makeCutProbability} color="bg-teal-500" />
      </div>

      {predictions.courseFitScore != null && (
        <div className="mt-4 pt-3 border-t border-dark-border">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Course Fit</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-dark-primary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green transition-all duration-500"
                  style={{ width: `${Math.min(predictions.courseFitScore * 100, 100)}%` }}
                />
              </div>
              <span className="text-white font-semibold text-sm">
                {(predictions.courseFitScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PlayerPredictions
