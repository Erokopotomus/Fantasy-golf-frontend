import Button from '../common/Button'
import DraftTimer from './DraftTimer'

const DraftHeader = ({
  league,
  draft,
  currentPick,
  isUserTurn,
  isPaused,
  isCommissioner,
  onPause,
  onResume,
  onStart,
  onTimeout,
  onUndoPick,
  picksCount = 0,
}) => {
  const draftType = draft?.type || 'snake'
  const currentRound = currentPick?.round || 1
  const currentPickNumber = currentPick?.pick || 1
  const totalTeams = draft?.teams?.length || league?.memberCount || 8
  const totalPicks = (draft?.totalRounds || league?.settings?.rosterSize || 6) * totalTeams
  const isScheduled = draft?.status?.toUpperCase() === 'SCHEDULED'
  const isInProgress = draft?.status?.toUpperCase() === 'IN_PROGRESS'

  return (
    <div className={`bg-[var(--surface)] border-b border-[var(--card-border)] ${
      isUserTurn && isInProgress ? 'ring-2 ring-gold animate-pulse' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-3">

        {/* ── Mobile Layout (compact) ── */}
        <div className="lg:hidden">
          {/* Row 1: League name + status badge + timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold font-display text-text-primary truncate">
                {league?.name || 'Draft Room'}
              </h1>
              <span className={`px-2 py-1 rounded text-[10px] font-mono font-medium uppercase shrink-0 font-semibold ${
                isInProgress ? 'bg-gold/30 text-gold border border-gold/50' :
                isPaused ? 'bg-crown/30 text-crown border border-crown/50' :
                isScheduled ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' :
                'bg-[var(--card-bg)] text-text-muted border border-[var(--card-border)]'
              }`}>
                {isPaused ? 'Paused' : isInProgress ? 'Live' : isScheduled ? 'Scheduled' : draft?.status || 'Waiting'}
              </span>
            </div>
            <DraftTimer onTimeout={onTimeout} compact />
          </div>

          {/* Row 2: Draft info + status message */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="capitalize">{draftType} Draft</span>
              <span>Rd {currentRound}</span>
              <span>Pick {currentPickNumber}/{totalPicks}</span>
            </div>
            <div className="text-xs font-medium">
              {isScheduled ? (
                <span className="text-blue-400">{isCommissioner ? 'Press Start' : 'Waiting...'}</span>
              ) : currentPick?.complete ? (
                <span className="text-gold">Complete!</span>
              ) : isUserTurn ? (
                <span className={`text-gold font-bold px-2 py-1 rounded ${isInProgress ? 'bg-gold/20 animate-pulse' : ''}`}>🎯 YOUR PICK!</span>
              ) : (
                <span className="text-text-muted">{currentPick?.teamName || 'Waiting...'}</span>
              )}
            </div>
          </div>

          {/* Row 3: Commissioner controls (only if needed) */}
          {isCommissioner && (
            <div className="flex gap-2 mt-2">
              {isScheduled ? (
                <Button size="sm" onClick={onStart}>Start Draft</Button>
              ) : isPaused ? (
                <Button size="sm" onClick={onResume || onStart}>Resume</Button>
              ) : isInProgress ? (
                <>
                  <Button size="sm" variant="secondary" onClick={onPause}>Pause</Button>
                  {picksCount > 0 && onUndoPick && (
                    <button onClick={onUndoPick} className="px-2 py-1 text-xs font-medium text-live-red bg-live-red/10 hover:bg-live-red/20 border border-live-red/30 rounded-lg transition-colors">
                      Undo
                    </button>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Desktop Layout (original) ── */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          {/* Left - League Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-text-primary">
                {league?.name || 'Draft Room'}
              </h1>
              <span className={`px-2 py-1 rounded text-xs font-mono font-medium uppercase font-semibold ${
                isInProgress ? 'bg-gold/30 text-gold border border-gold/50' :
                isPaused ? 'bg-crown/30 text-crown border border-crown/50' :
                isScheduled ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' :
                'bg-[var(--card-bg)] text-text-muted border border-[var(--card-border)]'
              }`}>
                {isPaused ? 'Paused' : isInProgress ? 'Live' : isScheduled ? 'Scheduled' : draft?.status || 'Waiting'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
              <span className="capitalize">{draftType} Draft</span>
              <span>Round {currentRound}</span>
              <span>Pick {currentPickNumber} of {totalPicks}</span>
            </div>
          </div>

          {/* Center - Current Pick Info */}
          <div className="flex-1">
            <div className={`rounded-lg p-3 text-center relative overflow-hidden ${
              isScheduled ? 'bg-blue-500/10 border border-blue-500/30' :
              isUserTurn ? 'bg-gradient-to-r from-gold/30 via-gold/20 to-gold/30 border-2 border-gold' : 'bg-[var(--card-bg)]'
            } ${isUserTurn && isInProgress ? 'animate-pulse' : ''}`}>
              {isUserTurn && isInProgress && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/20 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
              )}
              {isScheduled ? (
                <>
                  <p className="text-blue-400 text-sm font-medium">DRAFT SCHEDULED</p>
                  <p className="text-text-primary text-lg font-bold font-display">
                    {isCommissioner ? 'Press Start when ready' : 'Waiting for commissioner...'}
                  </p>
                </>
              ) : currentPick?.complete ? (
                <>
                  <p className="text-gold text-sm font-medium">DRAFT COMPLETE</p>
                  <p className="text-text-primary text-lg font-bold font-display">All picks are in!</p>
                </>
              ) : isUserTurn ? (
                <>
                  <p className="text-gold text-sm font-medium z-10 relative">🎯 YOUR PICK!</p>
                  <p className="text-text-primary text-lg font-bold font-display z-10 relative">Make your selection</p>
                </>
              ) : (
                <>
                  <p className="text-text-muted text-sm">On the Clock</p>
                  <p className="text-text-primary text-lg font-bold font-display">
                    {currentPick?.teamName || 'Waiting...'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right - Timer & Controls */}
          <div className="flex-1 flex flex-col items-end gap-3">
            <DraftTimer onTimeout={onTimeout} />
            {isCommissioner && (
              <div className="flex gap-2">
                {isScheduled ? (
                  <Button size="sm" onClick={onStart}>
                    Start Draft
                  </Button>
                ) : isPaused ? (
                  <Button size="sm" onClick={onResume || onStart}>
                    Resume Draft
                  </Button>
                ) : isInProgress ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={onPause}>
                      Pause Draft
                    </Button>
                    {picksCount > 0 && onUndoPick && (
                      <button
                        onClick={onUndoPick}
                        className="px-3 py-1.5 text-xs font-medium text-live-red bg-live-red/10 hover:bg-live-red/20 border border-live-red/30 rounded-lg transition-colors"
                      >
                        Undo Last Pick
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default DraftHeader
