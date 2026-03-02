import { Link } from 'react-router-dom'
import { PHASES } from '../../hooks/useLeaguePhase'

/**
 * PreDraftHero — shown when primaryPhase is PRE_DRAFT, DRAFT_PREP, or DRAFT_IMMINENT.
 * Adapts content and urgency based on specific sub-phase.
 */
export default function PreDraftHero({ phase, phaseMeta, phaseContext, boards, onCreateBoard }) {
  const data = phaseContext?.phaseData || {}

  if (phase === PHASES.DRAFT_IMMINENT) {
    return <DraftImminentHero phaseMeta={phaseMeta} data={data} boards={boards} />
  }

  if (phase === PHASES.DRAFT_PREP) {
    return <DraftPrepHero phaseMeta={phaseMeta} data={data} boards={boards} />
  }

  // PRE_DRAFT — no draft scheduled
  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-[var(--crown)]/[0.06] to-[var(--surface)] border border-[var(--crown)]/15 rounded-xl">
      <h3 className="text-base font-display font-bold text-text-primary mb-2">
        Your boards are your edge.
      </h3>
      <p className="text-sm text-text-primary/50 mb-4 leading-relaxed">
        Start ranking players to build your thesis. The more you tag and note,
        the sharper your coach gets.
      </p>
      {boards.length === 0 ? (
        <button
          onClick={onCreateBoard}
          className="px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Create Your First Board
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            to={`/lab/${boards[0].id}`}
            className="px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Continue Building
          </Link>
          <span className="text-xs text-text-primary/30">
            {boards.length} board{boards.length !== 1 ? 's' : ''} in progress
          </span>
        </div>
      )}
    </div>
  )
}

function DraftPrepHero({ phaseMeta, data, boards }) {
  const draftDate = phaseMeta?.scheduledFor
    ? new Date(phaseMeta.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const hoursUntil = phaseMeta?.hoursUntil
  const daysUntil = hoursUntil != null ? Math.floor(hoursUntil / 24) : null

  const boardReadiness = data.boardReadiness || {}
  const readinessPercent = boardReadiness.total > 0
    ? Math.round((boardReadiness.complete / boardReadiness.total) * 100)
    : 0

  const primaryBoard = boards?.[0]

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-[var(--crown)]/[0.06] to-[var(--surface)] border border-[var(--crown)]/15 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-text-primary">
          Draft: {phaseMeta?.leagueName || 'Your League'}
          {draftDate && <span className="text-text-primary/40 font-normal"> · {draftDate}</span>}
          {daysUntil != null && <span className="text-[var(--crown)] font-normal"> ({daysUntil}d)</span>}
        </h3>
      </div>

      {/* Board Readiness Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-primary/40">Board Readiness</span>
          <span className="font-mono text-text-primary/60">{readinessPercent}%</span>
        </div>
        <div className="h-2 bg-[var(--bg-alt)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--crown)] rounded-full transition-all duration-500"
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs text-text-primary/40 mb-3">
        {data.boldTakeCount > 0 && (
          <span>Bold Takes: <span className="text-text-primary/60 font-medium">{data.boldTakeCount}</span></span>
        )}
        {data.positionGaps > 0 && (
          <span>Position Gaps: <span className="text-live-red font-medium">{data.positionGaps}</span></span>
        )}
        {data.divergenceCount > 0 && (
          <span>Divergence: <span className="text-text-primary/60 font-medium">{data.divergenceCount} picks off consensus</span></span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {primaryBoard && (
          <Link
            to={`/lab/${primaryBoard.id}`}
            className="px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Review Board
          </Link>
        )}
        {primaryBoard && (
          <Link
            to={`/lab/cheatsheet/${primaryBoard.id}`}
            className="px-4 py-2 border border-[var(--card-border)] text-text-primary/50 text-sm font-medium rounded-lg hover:border-[var(--crown)]/30 hover:text-[var(--crown)] transition-colors"
          >
            Generate Cheat Sheet
          </Link>
        )}
      </div>
    </div>
  )
}

function DraftImminentHero({ phaseMeta, data, boards }) {
  const hoursUntil = phaseMeta?.hoursUntil
  const hours = hoursUntil != null ? Math.floor(hoursUntil) : null
  const minutes = hoursUntil != null ? Math.floor((hoursUntil % 1) * 60) : null

  const primaryBoard = boards?.[0]

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-[var(--crown)]/[0.08] to-[var(--surface)] border-l-[3px] border-l-[var(--crown)] border border-[var(--crown)]/20 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-bold text-[var(--crown)]">
          Draft in {hours != null ? `${hours}h ${minutes}m` : 'soon'}
        </h3>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--crown)]/20 text-[var(--crown)] animate-pulse">
          Imminent
        </span>
      </div>
      <p className="text-sm text-text-primary/50 mb-3">
        {phaseMeta?.leagueName || 'Your league'} — final prep time. Trust your research.
      </p>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs text-text-primary/40 mb-3">
        {data.boldTakeCount > 0 && (
          <span>Bold Takes: <span className="text-text-primary/60 font-medium">{data.boldTakeCount}</span></span>
        )}
        {data.boardReadiness?.avgScore > 0 && (
          <span>Readiness: <span className="text-text-primary/60 font-medium">{data.boardReadiness.avgScore}%</span></span>
        )}
      </div>

      {primaryBoard && (
        <Link
          to={`/lab/${primaryBoard.id}`}
          className="inline-block px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Final Review
        </Link>
      )}
    </div>
  )
}
