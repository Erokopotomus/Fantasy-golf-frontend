// frontend/src/components/lab-draft/MyTeamPanel.jsx
import { teamBlend } from './teamColorHelpers'
import { hexToRgba } from '../../utils/nflTeamColors'

/**
 * User's drafted-team panel. Header washes in a teamBlend() of the
 * abbrs of every drafted player. Empty state: blaze.
 */
export default function MyTeamPanel({ teamName, picks = [], renderPick }) {
  const abbrs = picks.map(p => p.teamAbbr).filter(Boolean)
  const blend = teamBlend(abbrs)

  return (
    <div className="rounded-card overflow-hidden border border-[var(--color-border)]">
      <div
        className="px-4 py-3 border-b border-black/10"
        style={{ background: `linear-gradient(90deg, ${hexToRgba(blend, 0.18)}, ${hexToRgba(blend, 0.06)})` }}
      >
        <h3 className="font-display font-bold text-text-primary truncate">
          {teamName || 'Your Team'}
        </h3>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mt-0.5">
          {picks.length} {picks.length === 1 ? 'pick' : 'picks'}
        </div>
      </div>
      <div className="bg-[var(--surface)]">
        {picks.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-text-muted">
            No picks yet
          </div>
        ) : (
          picks.map((pick, i) => renderPick ? renderPick(pick, i) : (
            <div key={i} className="px-4 py-2 border-b border-[var(--color-border)] last:border-0">
              <div className="font-display text-sm text-text-primary">{pick.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
