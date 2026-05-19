import useKickoffCountdown from '../../hooks/useKickoffCountdown'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Live broadcast-ticker countdown to the 2026 NFL kickoff. Ticks every
 * second. Drops into the dark-slate masthead used across all Prep pages.
 *
 * Shape: KICKOFF  114D  23:47:12   — big blaze days, mono HH:MM:SS to drive
 * the "oh shit, draft is coming" pacing.
 */
export default function KickoffCountdown() {
  const { days, hours, minutes, seconds } = useKickoffCountdown()
  const live = days + hours + minutes + seconds > 0
  return (
    <div className="flex items-baseline gap-2.5 tabular-nums" aria-live="off">
      <span className="text-white/50 text-[10px] uppercase tracking-[0.22em]">
        Kickoff
      </span>
      <span className="font-display font-extrabold text-blaze text-2xl leading-none tracking-tight">
        {days}
      </span>
      <span className="text-blaze font-bold text-[11px] uppercase">d</span>
      <span
        className="font-mono font-bold text-blaze text-[15px] leading-none tracking-tight"
        aria-label={live ? `${hours} hours ${minutes} minutes ${seconds} seconds` : 'Kickoff is now'}
      >
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  )
}
