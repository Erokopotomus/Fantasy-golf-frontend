import Card from '../common/Card'

const ProbRow = ({ label, preRound, live, color = 'bg-gold' }) => {
  const prePct = preRound != null ? (preRound * 100) : null
  const livePct = live != null ? (live * 100) : null
  if (prePct == null && livePct == null) return null

  // Show change arrow if both exist
  const diff = (prePct != null && livePct != null) ? livePct - prePct : null

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <div className="flex items-center gap-3">
          {prePct != null && livePct != null ? (
            <>
              <span className="text-text-muted text-xs line-through">{prePct.toFixed(1)}%</span>
              <span className="text-white font-semibold">{livePct.toFixed(1)}%</span>
              {diff != null && diff !== 0 && (
                <span className={`text-xs font-medium ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </span>
              )}
            </>
          ) : (
            <span className="text-white font-semibold">{(prePct ?? livePct).toFixed(1)}%</span>
          )}
        </div>
      </div>
      {/* Stacked bars: pre-round (dimmed) and live (solid) */}
      <div className="relative h-2 bg-dark-primary rounded-full overflow-hidden">
        {prePct != null && livePct != null && (
          <div
            className={`absolute h-full rounded-full ${color} opacity-25`}
            style={{ width: `${Math.min(prePct, 100)}%` }}
          />
        )}
        <div
          className={`absolute h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(livePct ?? prePct, 100)}%` }}
        />
      </div>
    </div>
  )
}

const PlayerPredictions = ({ predictions, liveScore }) => {
  const hasPredictions = predictions != null
  const hasLive = liveScore != null && (
    liveScore.winProbability != null ||
    liveScore.top5Probability != null ||
    liveScore.top10Probability != null
  )

  if (!hasPredictions && !hasLive) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Tournament Predictions</h4>
        <p className="text-text-muted text-sm">No upcoming predictions available</p>
      </Card>
    )
  }

  const tournamentName = predictions?.tournament?.name || 'Current Tournament'

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-text-muted">Tournament Predictions</h4>
        <span className="text-xs text-text-secondary bg-dark-primary px-2 py-1 rounded">
          {tournamentName}
        </span>
      </div>

      {/* Legend */}
      {hasPredictions && hasLive && (
        <div className="flex items-center gap-4 mb-3 text-[10px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-gold/25 inline-block" />
            Pre-Round
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-gold inline-block" />
            Live
          </div>
        </div>
      )}

      {!hasLive && hasPredictions && (
        <p className="text-[10px] text-text-muted mb-3">Pre-round projections</p>
      )}

      {hasLive && !hasPredictions && (
        <p className="text-[10px] text-text-muted mb-3">Live in-tournament odds</p>
      )}

      <div className="space-y-3">
        <ProbRow
          label="Win"
          preRound={predictions?.winProbability}
          live={liveScore?.winProbability}
          color="bg-yellow-500"
        />
        <ProbRow
          label="Top 5"
          preRound={predictions?.top5Probability}
          live={liveScore?.top5Probability}
          color="bg-gold"
        />
        <ProbRow
          label="Top 10"
          preRound={predictions?.top10Probability}
          live={liveScore?.top10Probability}
          color="bg-blue-500"
        />
        <ProbRow
          label="Top 20"
          preRound={predictions?.top20Probability}
          live={liveScore?.top20Probability}
          color="bg-purple-500"
        />
        <ProbRow
          label="Make Cut"
          preRound={predictions?.makeCutProbability}
          live={liveScore?.makeCutProbability}
          color="bg-gold-muted"
        />
      </div>

      {predictions?.courseFitScore != null && (
        <div className="mt-4 pt-3 border-t border-dark-border">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Course Fit</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-dark-primary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
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
