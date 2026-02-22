/**
 * Centralized date/time formatting for Clutch Fantasy Sports.
 * All time functions use Eastern Time (PGA Tour standard, same as ESPN/Golf Channel).
 * Uses Intl.DateTimeFormat — handles EDT/EST automatically, no library needed.
 */

const ET = 'America/New_York'

/**
 * "9:00 AM ET" — tee times, lock times, draft times
 */
export function formatTimeET(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ET,
  }) + ' ET'
}

/**
 * "Thu, Feb 20 at 7:00 AM ET" — lock deadlines, draft schedules
 */
export function formatDateTimeET(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: ET,
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ET,
  })
  return `${datePart} at ${timePart} ET`
}

/**
 * "Feb 20" — tournament dates (date-only, no TZ concern)
 */
export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * "Feb 20 – Feb 23" — tournament date ranges
 */
export function formatDateRange(start, end) {
  if (!start) return ''
  const s = formatDate(start)
  const e = end ? formatDate(end) : ''
  return e ? `${s} – ${e}` : s
}

/**
 * "Thursday" — day name in ET ("Tees off Thursday" on Dashboard)
 */
export function formatDayET(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: ET,
  })
}

/**
 * "$20.0M" — purse display (currently duplicated in 6+ files)
 */
export function formatPurse(purse) {
  if (!purse) return null
  const num = Number(purse)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num}`
}
