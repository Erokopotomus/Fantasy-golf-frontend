import { useEffect, useState } from 'react'

// 2026 NFL season opener — Thursday Night Football, 8:20pm ET (EDT, UTC-4)
// Sept 10, 2026 at 8:20pm ET == Sept 11 00:20 UTC.
const KICKOFF_UTC = Date.UTC(2026, 8, 11, 0, 20)

function diffParts(targetMs, nowMs) {
  const ms = Math.max(0, targetMs - nowMs)
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return { days, hours, minutes, seconds, ms }
}

/**
 * Returns a live-updating countdown to the 2026 NFL kickoff.
 * Ticks once per second. Stops at zero.
 *
 * Shape: { days, hours, minutes, seconds }
 */
export default function useKickoffCountdown() {
  const [parts, setParts] = useState(() =>
    diffParts(KICKOFF_UTC, Date.now()),
  )

  useEffect(() => {
    if (parts.ms === 0) return
    const id = setInterval(() => {
      setParts(diffParts(KICKOFF_UTC, Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [parts.ms])

  return parts
}
