import { useState, useEffect } from 'react'

function getTimeRemaining(scheduledFor) {
  const diff = new Date(scheduledFor).getTime() - Date.now()
  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  return { days, hours, minutes, seconds, totalMs: diff }
}

function getUrgencyColor(totalMs) {
  if (totalMs == null) return 'text-red-400'
  const hours = totalMs / (1000 * 60 * 60)
  if (hours < 2) return 'text-red-400'
  if (hours < 24) return 'text-yellow-400'
  return 'text-accent-green'
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const DraftCountdown = ({ scheduledFor, compact = false }) => {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(scheduledFor))

  useEffect(() => {
    if (!scheduledFor) return
    setRemaining(getTimeRemaining(scheduledFor))
    const id = setInterval(() => {
      const r = getTimeRemaining(scheduledFor)
      setRemaining(r)
      if (!r) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [scheduledFor])

  if (!scheduledFor) return null

  // Draft time has passed
  if (!remaining) {
    if (compact) {
      return <span className="text-red-400 text-xs font-medium">Draft time passed</span>
    }
    return (
      <div className="text-center">
        <p className="text-red-400 font-semibold">Draft time has passed</p>
        <p className="text-text-muted text-sm">{formatDate(scheduledFor)} at {formatTime(scheduledFor)}</p>
      </div>
    )
  }

  const color = getUrgencyColor(remaining.totalMs)
  const shouldPulse = remaining.totalMs < 5 * 60 * 1000

  if (compact) {
    const parts = []
    if (remaining.days > 0) parts.push(`${remaining.days}d`)
    if (remaining.hours > 0 || remaining.days > 0) parts.push(`${remaining.hours}h`)
    parts.push(`${remaining.minutes}m`)

    return (
      <div className={`flex items-center gap-1.5 text-xs ${shouldPulse ? 'animate-pulse' : ''}`}>
        <svg className={`w-3.5 h-3.5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-text-secondary">
          Draft: {formatDate(scheduledFor)} @ {formatTime(scheduledFor)}
        </span>
        <span className={`font-semibold ${color}`}>
          {parts.join(' ')}
        </span>
      </div>
    )
  }

  // Full variant
  return (
    <div className={shouldPulse ? 'animate-pulse' : ''}>
      <div className="flex items-center gap-2 mb-2">
        <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="text-white font-semibold">Draft Day</h4>
      </div>
      <p className="text-text-secondary text-sm mb-3">
        {new Date(scheduledFor).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })} at {formatTime(scheduledFor)}
      </p>
      <div className="flex gap-3">
        {remaining.days > 0 && (
          <div className="bg-dark-primary rounded-lg px-3 py-2 text-center min-w-[56px]">
            <p className={`text-xl font-bold ${color}`}>{remaining.days}</p>
            <p className="text-text-muted text-xs">days</p>
          </div>
        )}
        <div className="bg-dark-primary rounded-lg px-3 py-2 text-center min-w-[56px]">
          <p className={`text-xl font-bold ${color}`}>{remaining.hours}</p>
          <p className="text-text-muted text-xs">hrs</p>
        </div>
        <div className="bg-dark-primary rounded-lg px-3 py-2 text-center min-w-[56px]">
          <p className={`text-xl font-bold ${color}`}>{remaining.minutes}</p>
          <p className="text-text-muted text-xs">min</p>
        </div>
        <div className="bg-dark-primary rounded-lg px-3 py-2 text-center min-w-[56px]">
          <p className={`text-xl font-bold ${color}`}>{remaining.seconds}</p>
          <p className="text-text-muted text-xs">sec</p>
        </div>
      </div>
    </div>
  )
}

export default DraftCountdown
