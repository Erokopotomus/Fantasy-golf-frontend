import { useCallback, useEffect, useRef } from 'react'
import { useDraftContext } from '../context/DraftContext'

export const useDraftTimer = (onTimeout) => {
  const { timerSeconds, isPaused, isUserTurn } = useDraftContext()
  const timeoutFiredRef = useRef(false)
  const prevDeadlineSecondsRef = useRef(timerSeconds)

  // Timer countdown is now managed by useDraft via pickDeadline from server.
  // This hook reads the timer value, formats it, and fires onTimeout when
  // the timer reaches 0 on the current user's turn.

  // Reset the timeout-fired flag when a new pick starts (timer resets to a higher value)
  // or when it's no longer the user's turn.
  useEffect(() => {
    if (timerSeconds > prevDeadlineSecondsRef.current || !isUserTurn) {
      timeoutFiredRef.current = false
    }
    prevDeadlineSecondsRef.current = timerSeconds
  }, [timerSeconds, isUserTurn])

  // Fire onTimeout exactly once when timer hits 0 and it's the user's turn
  useEffect(() => {
    if (
      timerSeconds === 0 &&
      isUserTurn &&
      !isPaused &&
      !timeoutFiredRef.current &&
      typeof onTimeout === 'function'
    ) {
      timeoutFiredRef.current = true
      onTimeout()
    }
  }, [timerSeconds, isUserTurn, isPaused, onTimeout])

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
