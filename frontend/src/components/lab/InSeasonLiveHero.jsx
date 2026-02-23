import { Link } from 'react-router-dom'
import NeuralCluster from '../common/NeuralCluster'

/**
 * InSeasonLiveHero — shown when primaryPhase is IN_SEASON_LIVE.
 * The "war room" view — surfaces live tournament intel from weeklyIntel data.
 */
export default function InSeasonLiveHero({ weeklyIntel, phaseMeta }) {
  if (!weeklyIntel) return null

  const { tournament, courseProfile, rosterFit, waiverTargets, boardInsights, leagueId } = weeklyIntel

  const strengthColor = rosterFit?.strength === 'strong'
    ? 'text-emerald-400'
    : rosterFit?.strength === 'average'
      ? 'text-yellow-400'
      : 'text-red-400'

  return (
    <div className="mb-6 bg-gradient-to-br from-red-500/[0.06] via-[var(--surface)] to-[var(--crown)]/[0.04] border border-red-400/15 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <NeuralCluster size="sm" intensity="active" className="shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400/80">Live</h3>
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500/20 text-red-400 animate-pulse">
          In Progress
        </span>
      </div>

      {/* Tournament name */}
      <div className="px-5 pb-3">
        <h4 className="text-lg font-display font-bold text-text-primary">{tournament.name}</h4>
        {courseProfile && (
          <p className="text-xs text-text-primary/40 mt-1">
            {courseProfile.courseName}
            {courseProfile.description && ` — ${courseProfile.topSkillLabel} course`}
          </p>
        )}
      </div>

      {/* Roster fit + course key skill */}
      {(rosterFit || courseProfile) && (
        <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courseProfile && (
            <div className="p-3 bg-[var(--surface)]/60 border border-[var(--card-border)]/50 rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/30 mb-1">Course Favors</p>
              <p className="text-sm text-text-primary/70 capitalize">{courseProfile.topSkillLabel}</p>
              {rosterFit && (
                <p className="text-xs text-text-primary/40 mt-1">
                  Your roster: <span className={`font-semibold capitalize ${strengthColor}`}>{rosterFit.strength}</span>
                </p>
              )}
            </div>
          )}
          {rosterFit && (
            <div className="p-3 bg-[var(--surface)]/60 border border-[var(--card-border)]/50 rounded-lg">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-primary/30">Best fit</span>
                <span className="text-emerald-400 font-medium">{rosterFit.bestPlayer}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-primary/30">Weakest</span>
                <span className="text-red-400/70 font-medium">{rosterFit.worstPlayer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiver targets + board insights */}
      {(waiverTargets?.length > 0 || boardInsights?.length > 0) && (
        <div className="px-5 pb-4 flex items-center gap-4 text-xs text-text-primary/40">
          {waiverTargets?.length > 0 && (
            <span>Waiver targets: <span className="text-emerald-400 font-medium">{waiverTargets.length} course fits</span></span>
          )}
          {boardInsights?.length > 0 && (
            <span>Board tags on waivers: <span className="text-[var(--crown)] font-medium">{boardInsights.length}</span></span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-4 flex items-center gap-2">
        {tournament.id && (
          <Link
            to={`/tournaments/${tournament.id}`}
            className="px-4 py-2 bg-red-500/10 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/20 transition-colors border border-red-400/20"
          >
            Live Scoring
          </Link>
        )}
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
