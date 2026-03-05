import { useNavigate } from 'react-router-dom'
import { useLeagueLiveScoring } from '../../hooks/useLeagueLiveScoring'

const LiveScoringWidget = ({ leagueId, tournament: currentTournament }) => {
  const navigate = useNavigate()
  const { tournament, isLive, teams, userTeam, loading, error } = useLeagueLiveScoring(leagueId)

  // Don't render if there's no tournament data and we're done loading
  if (!loading && (!tournament || error)) return null

  // Loading skeleton
  if (loading) {
    return (
      <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-2xl">
        <div className="animate-pulse px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-white/[0.06] rounded w-64" />
            <div className="h-8 bg-white/[0.06] rounded w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="h-12 bg-white/[0.06] rounded" />
              <div className="h-8 bg-white/[0.06] rounded" />
              <div className="h-8 bg-white/[0.06] rounded" />
              <div className="h-8 bg-white/[0.06] rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-8 bg-white/[0.06] rounded" />
              <div className="h-8 bg-white/[0.06] rounded" />
              <div className="h-8 bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isFinal = tournament.status === 'COMPLETED'

  // Decide how many teams to show in the leaderboard
  const leaderboardTeams = teams.length <= 8
    ? teams
    : (() => {
        const top5 = teams.slice(0, 5)
        // If user's team isn't in top 5, append it
        if (userTeam && userTeam.rank > 5) {
          top5.push(userTeam)
        }
        return top5
      })()

  // Top 4 starters by fantasy points
  const topStarters = userTeam?.starters
    ? [...userTeam.starters].sort((a, b) => b.fantasyPoints - a.fantasyPoints).slice(0, 4)
    : []

  const formatToPar = (toPar) => {
    if (toPar === null || toPar === undefined) return '–'
    if (toPar === 0) return 'E'
    return toPar > 0 ? `+${toPar}` : `${toPar}`
  }

  const toParColor = (toPar) => {
    if (toPar === null || toPar === undefined || toPar === 0) return 'text-white/60'
    return toPar < 0 ? 'text-field-bright' : 'text-live-red'
  }

  const formatPosition = (pos) => {
    if (!pos) return '–'
    return pos
  }

  const formatThru = (thru) => {
    if (thru === null || thru === undefined) return '–'
    if (thru === 'CUT' || thru === 'WD' || thru === 'DQ') return thru
    if (thru === 18 || thru === 'F') return 'F'
    return thru
  }

  return (
    <div className={`mb-6 rounded-xl overflow-hidden border ${isFinal ? 'border-white/5' : 'border-white/10'} ${isFinal ? 'bg-slate-900/80' : 'bg-slate-900/90'} backdrop-blur-md shadow-2xl`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b border-white/10 ${isFinal ? 'bg-gradient-to-r from-white/5 via-transparent to-white/[0.02]' : 'bg-gradient-to-r from-field-bright/10 via-transparent to-gold/5'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isLive && (
            <span className="w-2 h-2 bg-field-bright rounded-full animate-pulse flex-shrink-0" />
          )}
          <h3 className="text-sm font-display font-bold text-white truncate">
            {tournament.name}
            {tournament.currentRound && (
              <span className="text-white/60 font-body font-normal"> &middot; Round {tournament.currentRound}</span>
            )}
          </h3>
          {isLive && (
            <span className="px-1.5 py-0.5 bg-field-bright/25 text-field-bright text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
              Live
            </span>
          )}
          {isFinal && (
            <span className="px-1.5 py-0.5 bg-white/[0.06] text-white/40 text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
              Final
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/leagues/${leagueId}/scoring`)}
          className="text-sm font-display font-semibold text-gold hover:text-gold/80 transition-colors flex items-center gap-1 flex-shrink-0 ml-3"
        >
          Full Scoring
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Your Team */}
          {userTeam ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Your Team</p>
              {/* Rank + Points */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-display font-bold text-white">
                  #{userTeam.rank}
                </span>
                <span className="text-white/40 text-sm">of {teams.length}</span>
                <span className="text-white/20 mx-1">&mdash;</span>
                <span className="text-3xl font-display font-bold text-gold">
                  {userTeam.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-white/40 text-sm">pts</span>
              </div>

              {/* Top Starters */}
              {topStarters.length > 0 && (
                <div className="space-y-1.5">
                  {topStarters.map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-white/90 font-medium truncate">
                          {player.playerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs font-mono text-white/30 w-8 text-center">
                          {formatPosition(player.position)}
                        </span>
                        <span className={`text-xs font-mono w-8 text-center ${toParColor(player.totalToPar)}`}>
                          {formatToPar(player.totalToPar)}
                        </span>
                        <span className="text-xs font-mono text-white/30 w-6 text-center">
                          {formatThru(player.thru)}
                        </span>
                        <span className="text-sm font-mono font-semibold text-gold w-12 text-right">
                          {player.fantasyPoints.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* No team — user hasn't drafted */
            <div className="flex items-center justify-center py-6 text-white/40 text-sm">
              <p>No team yet — draft to see your scores here</p>
            </div>
          )}

          {/* Right: League Leaderboard */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">League</p>
            <div className="space-y-1.5">
              {leaderboardTeams.map((team, idx) => {
                const isUser = userTeam && team.userId === userTeam.userId
                // Show separator before user's row if they're not contiguous with top block
                const showGap = userTeam && team.rank > 5 && idx === leaderboardTeams.length - 1 && teams.length > 8

                return (
                  <div key={team.teamId || team.userId}>
                    {showGap && (
                      <div className="flex items-center gap-2 py-0.5 px-2">
                        <span className="text-white/20 text-xs">···</span>
                      </div>
                    )}
                    <div
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                        isUser
                          ? 'bg-gold/10 border border-gold/25'
                          : 'bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-xs font-mono font-bold w-5 ${
                          team.rank === 1 ? 'text-crown' :
                          team.rank === 2 ? 'text-gray-300' :
                          team.rank === 3 ? 'text-amber-500' : 'text-white/30'
                        }`}>
                          {team.rank}.
                        </span>
                        <span className={`text-sm truncate ${isUser ? 'text-gold font-semibold' : 'text-white/80'}`}>
                          {team.teamName || team.userName || 'Team'}
                          {isUser && <span className="text-xs text-gold/60 ml-1">(You)</span>}
                        </span>
                      </div>
                      <span className={`text-sm font-mono font-semibold flex-shrink-0 ml-2 ${
                        isUser ? 'text-gold' : 'text-white/90'
                      }`}>
                        {team.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — subtle update indicator */}
      {isLive && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-white/20 text-right">Updates every 60s</p>
        </div>
      )}
    </div>
  )
}

export default LiveScoringWidget
