import { Link } from 'react-router-dom'

/**
 * SeasonCompleteHero — shown when primaryPhase is SEASON_COMPLETE.
 * Shows season summary, prediction accuracy, best/worst calls.
 */
export default function SeasonCompleteHero({ phaseMeta, seasonReview, onCreateBoard }) {
  const review = seasonReview || {}

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-purple-500/[0.06] to-[var(--surface)] border border-purple-400/15 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-text-primary">
          Season Complete{phaseMeta?.leagueName ? ` — ${phaseMeta.leagueName}` : ''}
        </h3>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-purple-500/15 text-purple-300">
          Review
        </span>
      </div>

      {review.finalRank && (
        <p className="text-sm text-text-primary/60 mb-3">
          You finished <span className="font-semibold text-text-primary">{ordinal(review.finalRank)}</span>
          {review.totalTeams ? ` of ${review.totalTeams}` : ''}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {review.predictionAccuracy != null && (
          <StatCard
            label="Prediction Accuracy"
            value={`${Math.round(review.predictionAccuracy * 100)}%`}
            sub={review.totalPredictions ? `${review.totalPredictions} calls` : null}
          />
        )}
        {review.boardAccuracy != null && (
          <StatCard
            label="Board Accuracy"
            value={`${Math.round(review.boardAccuracy * 100)}%`}
            sub="targets drafted"
          />
        )}
        {review.captureCount > 0 && (
          <StatCard
            label="Captures"
            value={review.captureCount}
            sub={review.captureToAction ? `${Math.round(review.captureToAction * 100)}% led to action` : null}
          />
        )}
      </div>

      {/* Best/Worst calls */}
      {(review.bestCall || review.worstCall) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {review.bestCall && (
            <div className="flex-1 p-2.5 bg-field-bright/[0.08] border border-field-bright/15 rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-field/60 mb-0.5">Best Call</p>
              <p className="text-xs text-text-primary/60">{review.bestCall}</p>
            </div>
          )}
          {review.worstCall && (
            <div className="flex-1 p-2.5 bg-live-red/[0.08] border border-live-red/15 rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-live-red/60 mb-0.5">Worst Call</p>
              <p className="text-xs text-text-primary/60">{review.worstCall}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          to="/prove-it"
          className="px-4 py-2 border border-purple-400/20 text-purple-300 text-sm font-medium rounded-lg hover:bg-purple-500/10 transition-colors"
        >
          View Full Season Review
        </Link>
        <button
          onClick={onCreateBoard}
          className="px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Start Prepping for Next Season
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="p-2.5 bg-[var(--surface)]/60 border border-[var(--card-border)]/50 rounded-lg">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/30 mb-1">{label}</p>
      <p className="text-lg font-mono font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[10px] text-text-primary/30 mt-0.5">{sub}</p>}
    </div>
  )
}

function ordinal(n) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}
