import { useEffect, useRef, useCallback } from 'react'
import { useDraftContext } from '../context/DraftContext'

export const useDraftTimer = (onTimeout) => {
  const { timerSeconds, setTimer, isPaused } = useDraftContext()
  const intervalRef = useRef(null)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const startTimer = useCallback((seconds) => {
    setTimer(seconds)
  }, [setTimer])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isPaused || timerSeconds <= 0) {
      stopTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        const newValue = prev - 1
        if (newValue <= 0) {
          stopTimer()
          if (onTimeoutRef.current) {
            onTimeoutRef.current()
          }
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => stopTimer()
  }, [isPaused, timerSeconds > 0, setTimer, stopTimer])

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    timerSeconds,
    startTimer,
    stopTimer,
    formatTime,
    formattedTime: formatTime(timerSeconds),
    isRunning: timerSeconds > 0 && !isPaused,
  }
}

export default useDraftTimer
