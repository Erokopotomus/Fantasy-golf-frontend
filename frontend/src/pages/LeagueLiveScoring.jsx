import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import useLeagueLiveScoring from '../hooks/useLeagueLiveScoring'
import Card from '../components/common/Card'

const formatToPar = (toPar) => {
  if (toPar == null) return '–'
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

const toParColor = (toPar) => {
  if (toPar == null) return 'text-text-muted'
  if (toPar < 0) return 'text-emerald-400'
  if (toPar > 0) return 'text-red-400'
  return 'text-white'
}

const positionColor = (pos, status) => {
  if (status === 'CUT' || status === 'WD' || status === 'DQ') return 'text-red-400'
  if (pos == null) return 'text-text-muted'
  if (pos <= 10) return 'text-emerald-400'
  if (pos <= 25) return 'text-white'
  return 'text-text-secondary'
}

const formatPosition = (pos, status) => {
  if (status === 'CUT') return 'CUT'
  if (status === 'WD') return 'WD'
  if (status === 'DQ') return 'DQ'
  if (status === 'DNS') return 'DNS'
  if (pos == null) return '–'
  return pos
}

const PlayerRow = ({ player, isBench }) => (
  <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${isBench ? 'opacity-50' : 'bg-dark-tertiary/50'}`}>
    {/* Headshot */}
    <div className="w-8 h-8 rounded-full bg-dark-primary flex-shrink-0 overflow-hidden">
      {player.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-semibold">
          {player.playerName?.charAt(0) || '?'}
        </div>
      )}
    </div>

    {/* Name + tour */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white truncate">{player.playerName}</p>
      {player.primaryTour && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
          player.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {player.primaryTour}
        </span>
      )}
    </div>

    {/* Position */}
    <div className={`text-sm font-semibold w-10 text-center ${positionColor(player.position, player.status)}`}>
      {formatPosition(player.position, player.status)}
    </div>

    {/* Score */}
    <div className={`text-sm font-medium w-10 text-center ${toParColor(player.totalToPar)}`}>
      {formatToPar(player.totalToPar)}
    </div>

    {/* Today */}
    <div className={`text-sm w-10 text-center hidden sm:block ${toParColor(player.todayToPar)}`}>
      {formatToPar(player.todayToPar)}
    </div>

    {/* Thru */}
    <div className="text-sm text-text-muted w-8 text-center hidden sm:block">
      {player.thru ?? '–'}
    </div>

    {/* Fantasy Points */}
    <div className="text-sm font-bold text-emerald-400 w-14 text-right">
      {player.fantasyPoints?.toFixed(1) || '0.0'}
    </div>
  </div>
)

const TeamCard = ({ team, isUser, isExpanded, onToggle }) => (
  <div
    onClick={onToggle}
    className={`p-3 rounded-lg cursor-pointer transition-colors ${
      isUser
        ? 'bg-emerald-500/10 border border-emerald-500/30'
        : 'bg-dark-tertiary/50 hover:bg-dark-tertiary'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={`text-lg font-bold w-7 text-center ${
        team.rank === 1 ? 'text-yellow-400' :
        team.rank === 2 ? 'text-gray-300' :
        team.rank === 3 ? 'text-amber-500' : 'text-text-muted'
      }`}>
        {team.rank}
      </span>
      <div className="w-8 h-8 bg-dark-primary rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary flex-shrink-0">
        {(team.userName || team.teamName || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isUser ? 'text-emerald-400' : 'text-white'}`}>
          {team.teamName}
          {isUser && <span className="text-xs ml-1 text-emerald-400/60">(You)</span>}
        </p>
        <p className="text-xs text-text-muted">{team.userName}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold font-display text-white">{team.totalPoints.toFixed(1)}</p>
        <p className="text-[10px] text-text-muted">pts</p>
      </div>
      <svg className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    {/* Expanded roster */}
    {isExpanded && (
      <div className="mt-3 space-y-1 border-t border-dark-border/50 pt-3">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 text-[10px] text-text-muted uppercase tracking-wider mb-1">
          <div className="w-8" />
          <div className="flex-1">Player</div>
          <div className="w-10 text-center">Pos</div>
          <div className="w-10 text-center">Score</div>
          <div className="w-10 text-center hidden sm:block">Today</div>
          <div className="w-8 text-center hidden sm:block">Thru</div>
          <div className="w-14 text-right">Pts</div>
        </div>
        {team.starters.map((p) => (
          <PlayerRow key={p.playerId} player={p} isBench={false} />
        ))}
        {team.bench.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2 px-3">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Bench</span>
              <div className="flex-1 border-t border-dark-border/30" />
              <span className="text-xs text-text-muted">{team.benchPoints.toFixed(1)} pts on bench</span>
            </div>
            {team.bench.map((p) => (
              <PlayerRow key={p.playerId} player={p} isBench={true} />
            ))}
          </>
        )}
      </div>
    )}
  </div>
)

const LeagueLiveScoring = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { tournament, isLive, teams, userTeam, loading, error } = useLeagueLiveScoring(leagueId)
  const [mobileTab, setMobileTab] = useState('myteam')
  const [expandedTeamId, setExpandedTeamId] = useState(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading scoring...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <h2 className="text-xl font-bold font-display text-white mb-2">Error</h2>
            <p className="text-text-secondary mb-4">{error}</p>
            <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to League</Link>
          </Card>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-dark-primary pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link to={`/leagues/${leagueId}`} className="inline-flex items-center text-text-secondary hover:text-white mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>
          <Card className="text-center py-12">
            <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold font-display text-white mb-2">No Tournament in Progress</h2>
            <p className="text-text-secondary">Check back when the next tournament begins.</p>
          </Card>
        </div>
      </div>
    )
  }

  const myTeamContent = userTeam ? (
    <div>
      {/* User team header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${
            userTeam.rank === 1 ? 'text-yellow-400' :
            userTeam.rank <= 3 ? 'text-emerald-400' : 'text-white'
          }`}>
            #{userTeam.rank}
          </span>
          <div>
            <h3 className="text-lg font-semibold font-display text-white">{userTeam.teamName}</h3>
            <p className="text-xs text-text-muted">{userTeam.starters.length} starters, {userTeam.bench.length} bench</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display text-emerald-400">{userTeam.totalPoints.toFixed(1)}</p>
          <p className="text-xs text-text-muted">fantasy pts</p>
        </div>
      </div>

      {/* Optimal points bar */}
      {userTeam.optimalPoints > userTeam.totalPoints && (
        <div className="mb-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
          Optimal lineup: {userTeam.optimalPoints.toFixed(1)} pts ({(userTeam.optimalPoints - userTeam.totalPoints).toFixed(1)} pts left on bench)
        </div>
      )}

      {/* Player header row */}
      <div className="flex items-center gap-3 px-3 mb-1 text-[10px] text-text-muted uppercase tracking-wider">
        <div className="w-8" />
        <div className="flex-1">Player</div>
        <div className="w-10 text-center">Pos</div>
        <div className="w-10 text-center">Score</div>
        <div className="w-10 text-center hidden sm:block">Today</div>
        <div className="w-8 text-center hidden sm:block">Thru</div>
        <div className="w-14 text-right">Pts</div>
      </div>

      {/* Starters */}
      <div className="space-y-1">
        {userTeam.starters.map((p) => (
          <PlayerRow key={p.playerId} player={p} isBench={false} />
        ))}
      </div>

      {/* Bench */}
      {userTeam.bench.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Bench</span>
            <div className="flex-1 border-t border-dark-border/30" />
            <span className="text-xs text-text-muted">{userTeam.benchPoints.toFixed(1)} pts on bench</span>
          </div>
          <div className="space-y-1">
            {userTeam.bench.map((p) => (
              <PlayerRow key={p.playerId} player={p} isBench={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-center py-8 text-text-muted">
      <p>You don't have a team in this league.</p>
    </div>
  )

  const leagueContent = (
    <div className="space-y-2">
      {teams.map((team) => (
        <TeamCard
          key={team.teamId}
          team={team}
          isUser={team.userId === userTeam?.userId}
          isExpanded={expandedTeamId === team.teamId}
          onToggle={() => setExpandedTeamId(expandedTeamId === team.teamId ? null : team.teamId)}
        />
      ))}
      {teams.length === 0 && (
        <p className="text-center text-text-muted py-8">No teams have rostered players yet.</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Link to={`/leagues/${leagueId}`} className="inline-flex items-center text-text-secondary hover:text-white">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to League
            </Link>
            <h1 className="text-xl font-bold font-display text-white">Live Scoring</h1>
          </div>

          {/* Tournament Banner */}
          <Card className={`mb-6 ${isLive ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-dark-secondary' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-display text-white">{tournament.name}</h2>
                  {isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {tournament.status === 'COMPLETED' && (
                    <span className="px-2 py-0.5 rounded-full bg-dark-tertiary text-text-muted text-xs font-semibold">
                      FINAL
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  {tournament.courseName && <span>{tournament.courseName}</span>}
                  {tournament.currentRound && <span> &middot; Round {tournament.currentRound}</span>}
                </p>
              </div>
              {isLive && (
                <p className="text-xs text-text-muted">Updates every 60s</p>
              )}
            </div>
          </Card>

          {/* Mobile tabs */}
          <div className="sm:hidden flex border-b border-dark-border mb-4">
            <button
              className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
                mobileTab === 'myteam' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-text-muted'
              }`}
              onClick={() => setMobileTab('myteam')}
            >
              My Team
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
                mobileTab === 'league' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-text-muted'
              }`}
              onClick={() => setMobileTab('league')}
            >
              League
            </button>
          </div>

          {/* Desktop: side by side */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-semibold text-white mb-4">My Team</h3>
              {myTeamContent}
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-white mb-4">League Standings</h3>
              {leagueContent}
            </Card>
          </div>

          {/* Mobile: tabbed */}
          <div className="sm:hidden">
            {mobileTab === 'myteam' && (
              <Card>{myTeamContent}</Card>
            )}
            {mobileTab === 'league' && (
              <Card>{leagueContent}</Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeagueLiveScoring
