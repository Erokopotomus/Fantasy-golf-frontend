import { Link } from 'react-router-dom'
import { computeLeaguePhase } from '../../hooks/useLabPhase'
import { PHASES } from '../../hooks/useLeaguePhase'

const PHASE_PILL = {
  [PHASES.PRE_DRAFT]: { label: 'PRE-DRAFT', cls: 'text-[var(--crown)]' },
  [PHASES.DRAFT_PREP]: { label: 'PREP', cls: 'text-[var(--crown)]' },
  [PHASES.DRAFT_IMMINENT]: { label: 'DRAFT SOON', cls: 'text-[var(--crown)] animate-pulse' },
  [PHASES.DRAFTING]: { label: 'DRAFTING', cls: 'text-[var(--crown)] animate-pulse' },
  [PHASES.IN_SEASON_LIVE]: { label: 'LIVE', cls: 'text-live-red animate-pulse' },
  [PHASES.IN_SEASON_IDLE]: { label: 'IN SEASON', cls: 'text-[var(--crown)]/60' },
  [PHASES.SEASON_COMPLETE]: { label: 'COMPLETE', cls: 'text-purple-400' },
}

function phaseContextLine(phase, meta) {
  switch (phase) {
    case PHASES.PRE_DRAFT:
      return 'No draft scheduled'
    case PHASES.DRAFT_PREP: {
      if (!meta.scheduledFor) return 'Draft date TBD'
      const days = Math.ceil(meta.hoursUntil / 24)
      const date = new Date(meta.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `Draft ${date} · ${days}d away`
    }
    case PHASES.DRAFT_IMMINENT: {
      const hours = Math.max(0, Math.round(meta.hoursUntil || 0))
      return `Draft in ${hours}h`
    }
    case PHASES.DRAFTING:
      return 'Draft in progress'
    case PHASES.IN_SEASON_LIVE:
      return meta.tournamentName ? `Live: ${meta.tournamentName}` : 'Live event'
    case PHASES.IN_SEASON_IDLE:
      return meta.nextTournament ? `Next: ${meta.nextTournament}` : 'Between events'
    case PHASES.SEASON_COMPLETE:
      return 'Season complete'
    default:
      return ''
  }
}

export default function LeagueCockpit({ leagues = [], boards = [], currentTournament }) {
  if (leagues.length === 0) {
    return (
      <div className="mb-6 p-5 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl text-center">
        <p className="text-sm text-text-primary/40 mb-3">No leagues yet</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/create-league"
            className="px-4 py-2 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors"
          >
            Create League
          </Link>
          <Link
            to="/join"
            className="px-4 py-2 text-sm font-semibold text-text-primary/60 border border-[var(--card-border)] rounded-lg hover:border-gold/30 transition-colors"
          >
            Join League
          </Link>
        </div>
      </div>
    )
  }

  // Split boards into linked and unlinked
  const linkedBoardIds = new Set()
  const unlinkedBoards = []
  for (const b of boards) {
    if (b.leagueId) {
      linkedBoardIds.add(b.id)
    } else {
      unlinkedBoards.push(b)
    }
  }

  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">My Leagues</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leagues.map(league => {
          const sport = (league.sport || league.sportRef?.slug || 'golf').toLowerCase()
          const { phase, meta } = computeLeaguePhase(league, currentTournament)
          const pill = PHASE_PILL[phase] || PHASE_PILL[PHASES.PRE_DRAFT]
          const leagueBoards = boards.filter(b => b.leagueId === league.id)
          const contextLine = phaseContextLine(phase, meta)

          return (
            <div
              key={league.id}
              className="p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl hover:border-gold/20 transition-colors"
            >
              {/* Row 1: Sport badge + league name + phase pill */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    sport === 'nfl' ? 'bg-orange-100 dark:bg-orange/20 text-orange-700 dark:text-orange' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {sport}
                  </span>
                  <span className="text-sm font-semibold text-text-primary truncate">{league.name}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 ${pill.cls}`}>
                  {pill.label}
                </span>
              </div>

              {/* Row 2: Phase context */}
              <p className="text-xs text-text-primary/40 mb-2">{contextLine}</p>

              {/* Row 3: Linked boards */}
              {leagueBoards.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {leagueBoards.map(b => (
                    <Link
                      key={b.id}
                      to={`/lab/${b.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-primary/60 bg-[var(--bg-alt)] rounded-md hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                      <svg className="w-3 h-3 text-text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                      {b.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-primary/25 mb-2">No boards linked</p>
              )}

              {/* Row 4: League Home link */}
              <Link
                to={`/leagues/${league.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold/60 hover:text-gold transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                League Home
              </Link>
            </div>
          )
        })}
      </div>

      {/* Unlinked boards */}
      {unlinkedBoards.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/20 mb-2">Unlinked Boards</p>
          <div className="flex flex-wrap gap-1.5">
            {unlinkedBoards.map(b => (
              <Link
                key={b.id}
                to={`/lab/${b.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-text-primary/50 bg-[var(--surface)] border border-[var(--card-border)] rounded-md hover:text-gold hover:border-gold/30 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  b.sport === 'nfl' ? 'bg-orange' : 'bg-emerald-400'
                }`} />
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
