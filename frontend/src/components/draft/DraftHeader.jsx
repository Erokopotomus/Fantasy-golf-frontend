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
    <div className="bg-dark-secondary border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left - League Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-bold font-display text-white">
                {league?.name || 'Draft Room'}
              </h1>
              <span className={`px-2 py-1 rounded text-xs font-mono font-medium uppercase ${
                isInProgress ? 'bg-gold/20 text-gold' :
                isPaused ? 'bg-yellow-500/20 text-yellow-400' :
                isScheduled ? 'bg-blue-500/20 text-blue-400' :
                'bg-dark-tertiary text-text-muted'
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
            <div className={`rounded-lg p-3 text-center ${
              isScheduled ? 'bg-blue-500/10 border border-blue-500/30' :
              isUserTurn ? 'bg-gold/20 border border-gold' : 'bg-dark-tertiary'
            }`}>
              {isScheduled ? (
                <>
                  <p className="text-blue-400 text-sm font-medium">DRAFT SCHEDULED</p>
                  <p className="text-white text-lg font-bold font-display">
                    {isCommissioner ? 'Press Start when ready' : 'Waiting for commissioner...'}
                  </p>
                </>
              ) : currentPick?.complete ? (
                <>
                  <p className="text-gold text-sm font-medium">DRAFT COMPLETE</p>
                  <p className="text-white text-lg font-bold font-display">All picks are in!</p>
                </>
              ) : isUserTurn ? (
                <>
                  <p className="text-gold text-sm font-medium">YOUR PICK!</p>
                  <p className="text-white text-lg font-bold font-display">Make your selection</p>
                </>
              ) : (
                <>
                  <p className="text-text-muted text-sm">On the Clock</p>
                  <p className="text-white text-lg font-bold font-display">
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
                        className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
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
