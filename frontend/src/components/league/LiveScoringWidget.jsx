import { useNavigate } from 'react-router-dom'
import { useLeagueLiveScoring } from '../../hooks/useLeagueLiveScoring'
import Card from '../common/Card'

const LiveScoringWidget = ({ leagueId, tournament: currentTournament }) => {
  const navigate = useNavigate()
  const { tournament, isLive, teams, userTeam, loading, error } = useLeagueLiveScoring(leagueId)

  // Don't render if there's no tournament data and we're done loading
  if (!loading && (!tournament || error)) return null

  // Loading skeleton
  if (loading) {
    return (
      <div className="mb-6">
        <Card className="border-field-bright/30 bg-gradient-to-r from-field-bright/10 to-[var(--surface)]">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-[var(--bg-alt)] rounded w-64" />
              <div className="h-8 bg-[var(--bg-alt)] rounded w-28" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="h-12 bg-[var(--bg-alt)] rounded" />
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
                <div className="h-8 bg-[var(--bg-alt)] rounded" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const isFinal = tournament.status === 'COMPLETED'
  const borderClass = isFinal ? 'border-[var(--card-border)]' : 'border-field-bright/30'
  const gradientClass = isFinal
    ? 'bg-gradient-to-r from-[var(--bg-alt)] to-[var(--surface)]'
    : 'bg-gradient-to-r from-field-bright/10 to-[var(--surface)]'

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
    if (toPar === null || toPar === undefined) return 'E'
    if (toPar === 0) return 'E'
    return toPar > 0 ? `+${toPar}` : `${toPar}`
  }

  const toParColor = (toPar) => {
    if (toPar === null || toPar === undefined || toPar === 0) return 'text-text-primary'
    return toPar < 0 ? 'text-field' : 'text-live-red'
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
    <div className="mb-6">
      <Card className={`${borderClass} ${gradientClass}`} padding="none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--card-border)]/50">
          <div className="flex items-center gap-2 min-w-0">
            {isLive && (
              <span className="w-2 h-2 bg-field rounded-full animate-pulse flex-shrink-0" />
            )}
            <h3 className="text-sm font-display font-bold text-text-primary truncate">
              {tournament.name}
              {tournament.currentRound && (
                <span className="text-text-muted font-body font-normal"> &middot; Round {tournament.currentRound}</span>
              )}
            </h3>
            {isLive && (
              <span className="px-1.5 py-0.5 bg-field-bright/20 text-field text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
                Live
              </span>
            )}
            {isFinal && (
              <span className="px-1.5 py-0.5 bg-[var(--bg-alt)] text-text-muted text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
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
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Your Team */}
            {userTeam ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Your Team</p>
                {/* Rank + Points */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-display font-bold text-text-primary">
                    #{userTeam.rank}
                  </span>
                  <span className="text-text-muted text-sm">of {teams.length}</span>
                  <span className="text-text-muted mx-1">&mdash;</span>
                  <span className="text-2xl font-display font-bold text-gold">
                    {userTeam.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-text-muted text-sm">pts</span>
                </div>

                {/* Top Starters */}
                {topStarters.length > 0 && (
                  <div className="space-y-1.5">
                    {topStarters.map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-[var(--bg-alt)]/50"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm text-text-primary font-medium truncate">
                            {player.playerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs font-mono text-text-muted w-8 text-center">
                            {formatPosition(player.position)}
                          </span>
                          <span className={`text-xs font-mono w-8 text-center ${toParColor(player.totalToPar)}`}>
                            {formatToPar(player.totalToPar)}
                          </span>
                          <span className="text-xs font-mono text-text-muted w-6 text-center">
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
              <div className="flex items-center justify-center py-6 text-text-muted text-sm">
                <p>No team yet — draft to see your scores here</p>
              </div>
            )}

            {/* Right: League Leaderboard */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">League</p>
              <div className="space-y-1.5">
                {leaderboardTeams.map((team, idx) => {
                  const isUser = userTeam && team.userId === userTeam.userId
                  // Show separator before user's row if they're not contiguous with top block
                  const showGap = userTeam && team.rank > 5 && idx === leaderboardTeams.length - 1 && teams.length > 8

                  return (
                    <div key={team.teamId || team.userId}>
                      {showGap && (
                        <div className="flex items-center gap-2 py-0.5 px-2">
                          <span className="text-text-muted/50 text-xs">···</span>
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                          isUser
                            ? 'bg-gold/10 border border-gold/30'
                            : 'bg-[var(--bg-alt)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-xs font-mono font-bold w-5 ${
                            team.rank === 1 ? 'text-crown' :
                            team.rank === 2 ? 'text-gray-400 dark:text-gray-300' :
                            team.rank === 3 ? 'text-amber-500' : 'text-text-muted'
                          }`}>
                            {team.rank}.
                          </span>
                          <span className={`text-sm truncate ${isUser ? 'text-gold font-semibold' : 'text-text-primary'}`}>
                            {team.teamName || team.userName || 'Team'}
                            {isUser && <span className="text-xs text-gold/60 ml-1">(You)</span>}
                          </span>
                        </div>
                        <span className={`text-sm font-mono font-semibold flex-shrink-0 ml-2 ${
                          isUser ? 'text-gold' : 'text-text-primary'
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
          <div className="px-4 pb-3 sm:px-6">
            <p className="text-[10px] text-text-muted/60 text-right">Updates every 60s</p>
          </div>
        )}
      </Card>
    </div>
  )
}

export default LiveScoringWidget
