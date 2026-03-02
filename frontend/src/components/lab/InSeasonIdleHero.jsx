import { Link } from 'react-router-dom'

/**
 * InSeasonIdleHero — shown when primaryPhase is IN_SEASON_IDLE (between events).
 * Focuses on preparation for next event and roster improvement.
 */
export default function InSeasonIdleHero({ weeklyIntel, phaseMeta, phaseContext }) {
  if (!weeklyIntel) return null

  const { tournament, courseProfile, rosterFit, waiverTargets, leagueId } = weeklyIntel
  const standingsHistory = phaseContext?.phaseData?.standingsHistory

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-[var(--crown)]/[0.05] to-[var(--surface)] border border-[var(--crown)]/10 rounded-xl">
      {/* Next tournament header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/30 mb-0.5">Next Up</p>
          <h3 className="text-base font-display font-bold text-text-primary">{tournament.name}</h3>
          {tournament.startDate && (
            <p className="text-xs text-text-primary/40 mt-0.5">
              {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {tournament.daysUntil > 0 && ` · ${tournament.daysUntil} days out`}
            </p>
          )}
        </div>
        {courseProfile && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--crown)]/10 text-[var(--crown)]/70 capitalize">
            {courseProfile.topSkillLabel} course
          </span>
        )}
      </div>

      {/* Roster fit for next course */}
      {rosterFit && courseProfile && (
        <div className="p-3 bg-[var(--surface)]/60 border border-[var(--card-border)]/50 rounded-lg mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/30">
              Your Roster SG {courseProfile.topSkillLabel}
            </span>
            <span className={`text-xs font-mono font-bold ${
              rosterFit.avgSg > 0.3 ? 'text-field' : rosterFit.avgSg > 0 ? 'text-crown' : 'text-live-red'
            }`}>
              {rosterFit.avgSg > 0 ? '+' : ''}{rosterFit.avgSg}
            </span>
          </div>
          <p className="text-xs text-text-primary/40">
            {rosterFit.strength === 'strong' ? 'Strong fit for this course.'
              : rosterFit.strength === 'average' ? 'Average fit — check the wire for upgrades.'
              : 'Weak fit — consider making moves.'}
          </p>
        </div>
      )}

      {/* Waiver suggestions */}
      {waiverTargets?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/30 mb-2">Suggested Moves</p>
          <div className="space-y-1">
            {waiverTargets.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 min-w-0">
                  {p.headshotUrl ? (
                    <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full bg-[var(--stone)] shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[var(--stone)] shrink-0" />
                  )}
                  <span className="text-text-primary/60 truncate">{p.name}</span>
                  {p.countryFlag && <span className="text-[10px]">{p.countryFlag}</span>}
                </div>
                <span className="text-field font-mono text-[11px] font-bold shrink-0 ml-2">
                  +{p.skillSg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standings Sparkline */}
      {standingsHistory?.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] text-text-primary/30">Standings trend:</span>
          <StandingsSparkline data={standingsHistory} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          to="/golf"
          className="px-4 py-2 bg-[var(--crown)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Scout Players
        </Link>
        {leagueId && (
          <Link
            to={`/leagues/${leagueId}/waivers`}
            className="px-4 py-2 border border-[var(--card-border)] text-text-primary/50 text-sm font-medium rounded-lg hover:border-[var(--crown)]/30 hover:text-[var(--crown)] transition-colors"
          >
            Waiver Wire
          </Link>
        )}
      </div>
    </div>
  )
}

/**
 * Tiny inline SVG sparkline showing standings position over time.
 */
function StandingsSparkline({ data }) {
  if (!data || data.length < 2) return null

  const width = 80
  const height = 20
  const padding = 2
  const maxRank = Math.max(...data.map(d => d.rank))
  const minRank = Math.min(...data.map(d => d.rank))
  const range = Math.max(maxRank - minRank, 1)

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    // Invert Y — rank 1 should be at top
    const y = padding + ((d.rank - minRank) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const lastPoint = data[data.length - 1]

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke="var(--crown)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px] font-mono text-text-primary/40">
        {ordinal(lastPoint.rank)}
      </span>
    </div>
  )
}

function ordinal(n) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}
