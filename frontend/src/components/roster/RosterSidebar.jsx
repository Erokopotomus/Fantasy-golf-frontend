import { Link } from 'react-router-dom'

/**
 * Desktop sidebar for the My Team page.
 * Shows mini league leaderboard when a tournament is live,
 * a placeholder card when not live, and quick links always.
 */
const RosterSidebar = ({ liveTeams, liveUserTeam, liveTournament, isLive, leagueId, userId }) => {
  return (
    <div className="space-y-4 sticky top-24">
      {/* Live tournament: Mini league leaderboard */}
      {isLive && liveTournament && liveTeams.length > 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--card-border)] p-4">
          {/* Tournament header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live-red opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-live-red" />
              </span>
              <h3 className="text-sm font-display font-bold text-text-primary truncate">
                {liveTournament.name}
              </h3>
            </div>
            <span className="text-[11px] text-text-muted font-mono flex-shrink-0">R{liveTournament.currentRound || 1}</span>
          </div>

          {/* Mini leaderboard */}
          <div className="space-y-1">
            {liveTeams.map((team, idx) => {
              const isUser = team.userId === userId
              return (
                <div
                  key={team.teamId || team.userId || idx}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    isUser
                      ? 'bg-crown/10 border border-crown/25'
                      : 'hover:bg-[var(--bg-alt)]'
                  }`}
                >
                  {/* Rank */}
                  <span className={`text-xs font-mono font-bold w-5 text-right flex-shrink-0 ${
                    team.rank === 1 ? 'text-crown' :
                    team.rank === 2 ? 'text-text-muted' :
                    team.rank === 3 ? 'text-amber-500' :
                    'text-text-muted/50'
                  }`}>
                    {team.rank}
                  </span>

                  {/* Team name */}
                  <span className={`flex-1 min-w-0 truncate ${
                    isUser ? 'font-semibold text-text-primary' : 'text-text-secondary'
                  }`}>
                    {team.teamName || team.userName || 'Team'}
                    {isUser && <span className="text-crown ml-1 text-[10px] font-medium">YOU</span>}
                  </span>

                  {/* Points */}
                  <span className={`font-mono text-xs flex-shrink-0 ${
                    isUser ? 'font-bold text-crown' : 'text-text-muted'
                  }`}>
                    {(team.totalPoints || 0).toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Link to full scoring */}
          <Link
            to={`/leagues/${leagueId}/scoring`}
            className="block mt-3 text-center text-xs text-field hover:text-field-bright font-medium transition-colors"
          >
            Full Scoring Page &rarr;
          </Link>
        </div>
      ) : (
        /* Not live: placeholder card */
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--card-border)] p-4">
          <h3 className="text-sm font-display font-bold text-text-primary mb-2">League Standings</h3>
          <p className="text-sm text-text-muted">
            No active tournament right now. Check back when the next event starts for live league standings.
          </p>
          <Link
            to={`/leagues/${leagueId}`}
            className="block mt-3 text-xs text-field hover:text-field-bright font-medium transition-colors"
          >
            View League Home &rarr;
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--card-border)] p-4">
        <h3 className="text-sm font-display font-bold text-text-primary mb-3">Quick Links</h3>
        <div className="space-y-1.5">
          <QuickLink to={`/leagues/${leagueId}`} label="League Home" icon={leagueIcon} />
          <QuickLink to={`/leagues/${leagueId}/scoring`} label="Full Scoring" icon={scoringIcon} />
          <QuickLink to={`/leagues/${leagueId}/waivers`} label="Free Agents" icon={waiverIcon} />
          <QuickLink to="/golf" label="Golf Hub" icon={golfIcon} />
        </div>
      </div>
    </div>
  )
}

/** Reusable quick link row */
const QuickLink = ({ to, label, icon }) => (
  <Link
    to={to}
    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-[var(--bg-alt)] transition-colors"
  >
    <span className="w-5 h-5 flex items-center justify-center text-text-muted flex-shrink-0">{icon}</span>
    <span>{label}</span>
  </Link>
)

/* SVG icons */
const leagueIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
  </svg>
)

const scoringIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const waiverIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
)

const golfIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M12 3v14m0-14l7 5-7 5" />
  </svg>
)

export default RosterSidebar
