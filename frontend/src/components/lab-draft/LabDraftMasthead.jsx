import { Link } from 'react-router-dom'
import FormatPill from './FormatPill'

/**
 * Broadcast-style ticker bar that matches the Prep aesthetic.
 * Use `compact` variant in the draft room (lives in h-[calc(100vh-64px)]).
 */
export default function LabDraftMasthead({
  title = 'Mock Draft',
  subtitle,
  format,
  backHref = '/lab',
  backLabel = '← The Lab',
  compact = false,
  rightSlot,
}) {
  return (
    <>
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className={`bg-slate-mid text-white border-b border-black/20 ${compact ? 'py-1.5' : 'py-2.5'}`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 flex items-center justify-between gap-3 md:gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to={backHref} className="text-white/60 hover:text-white transition-colors shrink-0">
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white font-bold whitespace-nowrap">{title}</span>
            {subtitle && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/60 truncate">{subtitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {format && <FormatPill format={format} />}
            {rightSlot}
          </div>
        </div>
      </div>
    </>
  )
}
