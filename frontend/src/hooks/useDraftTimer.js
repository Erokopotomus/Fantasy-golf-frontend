import { useCallback } from 'react'
import { useDraftContext } from '../context/DraftContext'

export const useDraftTimer = (onTimeout) => {
  const { timerSeconds, isPaused } = useDraftContext()

  // Timer countdown is now managed by useDraft via pickDeadline from server.
  // This hook just reads the timer value and formats it.

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    timerSeconds,
    startTimer: () => {},
    stopTimer: () => {},
    formatTime,
    formattedTime: formatTime(timerSeconds),
    isRunning: timerSeconds > 0 && !isPaused,
  }
}

export default useDraftTimer
