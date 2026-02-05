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
  onStart,
  onTimeout,
}) => {
  const draftType = draft?.type || 'snake'
  const currentRound = currentPick?.round || 1
  const currentPickNumber = currentPick?.pick || 1
  const totalPicks = (league?.settings?.rosterSize || 6) * (league?.memberCount || 8)

  return (
    <div className="bg-dark-secondary border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left - League Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {league?.name || 'Draft Room'}
              </h1>
              <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                draft?.status === 'active' ? 'bg-accent-green/20 text-accent-green' :
                draft?.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-dark-tertiary text-text-muted'
              }`}>
                {draft?.status || 'Waiting'}
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
            <div className={`rounded-lg p-4 text-center ${
              isUserTurn ? 'bg-accent-green/20 border border-accent-green' : 'bg-dark-tertiary'
            }`}>
              {isUserTurn ? (
                <>
                  <p className="text-accent-green text-sm font-medium">YOUR PICK!</p>
                  <p className="text-white text-lg font-bold">Make your selection</p>
                </>
              ) : (
                <>
                  <p className="text-text-muted text-sm">On the Clock</p>
                  <p className="text-white text-lg font-bold">
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
                {isPaused ? (
                  <Button size="sm" onClick={onStart}>
                    Resume Draft
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={onPause}>
                    Pause Draft
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DraftHeader
