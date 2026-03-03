import { useDraftContext } from '../../context/DraftContext'
import { useDraftTimer } from '../../hooks/useDraftTimer'

const DraftTimer = ({ onTimeout, compact = false }) => {
  const { isPaused } = useDraftContext()
  const { timerSeconds, formattedTime } = useDraftTimer(onTimeout)

  const getTimerColor = () => {
    if (isPaused) return 'text-crown'
    if (timerSeconds <= 10) return 'text-live-red'
    if (timerSeconds <= 30) return 'text-crown'
    return 'text-gold'
  }

  const getProgressWidth = () => {
    const maxTime = 90 // Default max time
    return Math.min((timerSeconds / maxTime) * 100, 100)
  }

  // Compact mode: inline timer for mobile header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-lg font-mono font-bold ${getTimerColor()}`}>
          {formattedTime}
        </span>
        <div className="w-12 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timerSeconds <= 10 ? 'bg-live-red' :
              timerSeconds <= 30 ? 'bg-crown' : 'bg-gold'
            }`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-lg p-3">
      <div className="text-center">
        <p className="text-text-muted text-sm mb-1">
          {isPaused ? 'PAUSED' : 'Time Remaining'}
        </p>
        <p className={`text-3xl font-mono font-bold ${getTimerColor()}`}>
          {formattedTime}
        </p>
      </div>
      <div className="mt-3 h-2 bg-[var(--bg)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timerSeconds <= 10 ? 'bg-live-red' :
            timerSeconds <= 30 ? 'bg-crown' : 'bg-gold'
          }`}
          style={{ width: `${getProgressWidth()}%` }}
        />
      </div>
    </div>
  )
}

export default DraftTimer
