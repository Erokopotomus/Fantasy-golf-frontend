import { TEAM_COLORS } from '../../utils/nflTeamColors'

/**
 * Returns the ET-local weekday short label (e.g. 'Thu', 'Sun', 'Mon').
 * Uses Intl with timeZone='America/New_York' so DST and the UTC date-rollover
 * for primetime games (TNF/SNF/MNF kick off past midnight UTC) don't shift
 * the weekday label out of the ET-local frame the NFL schedules against.
 * Matches the backend's detectPrimetime tz logic in backend/src/routes/prep.js.
 */
function kickoffDay(kickoff) {
  if (!kickoff) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
    }).format(new Date(kickoff))
  } catch {
    return null
  }
}

function ScheduleRow({ game }) {
  if (!game) {
    // Bye week row
    return (
      <div className="flex items-baseline gap-3 px-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0 bg-[var(--bg-alt)]/30">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted w-8 shrink-0">—</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">BYE</span>
      </div>
    )
  }
  const accent = TEAM_COLORS[game.opponent?.abbreviation] ?? '#F06820'
  const opponentLabel = game.opponent?.abbreviation ?? '???'
  const opponentName = game.opponent?.name ?? ''
  return (
    <div
      className="flex items-baseline gap-3 px-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0 hover:bg-[var(--glass)] transition-colors"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted w-8 shrink-0">
        WK {game.week}
      </span>
      <span className="font-display font-bold text-sm text-[var(--text-1)] w-14 shrink-0">
        {game.isHome ? '' : '@'}{opponentLabel}
      </span>
      <span className="font-editorial italic text-sm text-text-secondary truncate flex-1">
        {opponentName}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted shrink-0">
        {kickoffDay(game.kickoff)}
      </span>
      {game.isPrimetime && (
        <span
          className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 rounded shrink-0 text-blaze"
          style={{ backgroundColor: 'rgba(240, 104, 32, 0.12)' }}
        >
          {game.isPrimetime}
        </span>
      )}
    </div>
  )
}

/**
 * Builds an 18-week array, slotting each game into its `week` index.
 * Empty slots become bye weeks.
 */
function buildWeekSlots(schedule) {
  const slots = Array(18).fill(null)
  for (const g of schedule) {
    if (g.week >= 1 && g.week <= 18) slots[g.week - 1] = g
  }
  return slots
}

export default function TeamScheduleStrip({ schedule, teamAbbreviation }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] px-4 py-10 text-center font-mono text-xs text-text-muted">
        Schedule loading…
      </div>
    )
  }
  const slots = buildWeekSlots(schedule)
  const left = slots.slice(0, 9)
  const right = slots.slice(9, 18)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] overflow-hidden">
        {left.map((g, i) => (
          <ScheduleRow key={`L${i}`} game={g} />
        ))}
      </div>
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] overflow-hidden">
        {right.map((g, i) => (
          <ScheduleRow key={`R${i}`} game={g} />
        ))}
      </div>
    </div>
  )
}
