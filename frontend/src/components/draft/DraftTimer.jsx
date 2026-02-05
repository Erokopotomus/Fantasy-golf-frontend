import { useDraftContext } from '../../context/DraftContext'
import { useDraftTimer } from '../../hooks/useDraftTimer'

const DraftTimer = ({ onTimeout }) => {
  const { isPaused } = useDraftContext()
  const { timerSeconds, formattedTime } = useDraftTimer(onTimeout)

  const getTimerColor = () => {
    if (isPaused) return 'text-yellow-400'
    if (timerSeconds <= 10) return 'text-red-500'
    if (timerSeconds <= 30) return 'text-yellow-400'
    return 'text-accent-green'
  }

  const getProgressWidth = () => {
    const maxTime = 90 // Default max time
    return Math.min((timerSeconds / maxTime) * 100, 100)
  }

  return (
    <div className="bg-dark-tertiary rounded-lg p-4">
      <div className="text-center">
        <p className="text-text-muted text-sm mb-1">
          {isPaused ? 'PAUSED' : 'Time Remaining'}
        </p>
        <p className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
          {formattedTime}
        </p>
      </div>
      <div className="mt-3 h-2 bg-dark-primary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timerSeconds <= 10 ? 'bg-red-500' :
            timerSeconds <= 30 ? 'bg-yellow-400' : 'bg-accent-green'
          }`}
          style={{ width: `${getProgressWidth()}%` }}
        />
      </div>
    </div>
  )
}

export default DraftTimer
