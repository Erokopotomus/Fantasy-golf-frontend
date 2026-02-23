import { DISPLAY_STEPS } from '../../hooks/useLabPhase'

/**
 * Compact horizontal breadcrumb showing season phases with "you are here" indicator.
 * Renders: [ Prep ] → [ Draft ] → [ Compete ] → [ Reflect ]
 */
export default function PhaseTimeline({ displayStep, phaseMeta, boards = [] }) {
  // Count badges per step
  const stepBadges = {
    prep: boards.length > 0 ? `${boards.length}` : null,
    draft: null,
    compete: null,
    reflect: null,
  }

  // Context line below active step
  const contextLines = {
    prep: phaseMeta?.scheduledFor
      ? `Draft ${formatCountdown(phaseMeta.scheduledFor)}`
      : boards.length > 0
        ? `${boards.length} board${boards.length !== 1 ? 's' : ''}`
        : null,
    draft: phaseMeta?.draftId ? 'Live now' : null,
    compete: phaseMeta?.tournamentName || null,
    reflect: 'Season complete',
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 text-xs font-mono">
        {DISPLAY_STEPS.map((step, i) => {
          const isActive = displayStep === step.key
          const isPast = DISPLAY_STEPS.findIndex(s => s.key === displayStep) > i

          return (
            <div key={step.key} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="w-3 h-3 text-text-primary/15 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <div className="flex flex-col items-center">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-[var(--crown)]/15 text-[var(--crown)] border border-[var(--crown)]/30'
                    : isPast
                      ? 'text-text-primary/40'
                      : 'text-text-primary/20'
                }`}>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--crown)]" />
                  )}
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isActive ? 'text-[var(--crown)]' : ''
                  }`}>
                    {step.label}
                  </span>
                  {stepBadges[step.key] && (
                    <span className="text-[9px] text-text-primary/30 font-normal">
                      {stepBadges[step.key]}
                    </span>
                  )}
                </div>
                {isActive && contextLines[step.key] && (
                  <span className="text-[9px] text-text-primary/30 mt-0.5 whitespace-nowrap">
                    {contextLines[step.key]}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatCountdown(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}
