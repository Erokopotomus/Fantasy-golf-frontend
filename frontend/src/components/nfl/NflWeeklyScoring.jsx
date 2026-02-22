import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Card from '../common/Card'
import WeekInReview from './WeekInReview'

// Position color badges
const posColors = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-emerald-500/20 text-emerald-400',
  TE: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-orange-400',
  DL: 'bg-orange-500/20 text-orange-400',
  LB: 'bg-orange-500/20 text-orange-400',
  DB: 'bg-cyan-500/20 text-cyan-400',
}

// Build a human-readable stat line from the statLine object
const formatStatLine = (sl) => {
  if (!sl) return null
  const parts = []
  if (sl.pass) parts.push(sl.pass)
  if (sl.rush) parts.push(sl.rush)
  if (sl.rec) parts.push(sl.rec)
  if (sl.kick) parts.push(sl.kick)
  if (sl.def) parts.push(sl.def)
  if (sl.tackles) parts.push(sl.tackles)
  if (sl.fumbles) parts.push(sl.fumbles)
  return parts.length > 0 ? parts.join(' | ') : null
}

const NflPlayerRow = ({ ps, isBench, benchOutscoredStarter }) => {
  const posClass = posColors[ps.nflPos] || 'bg-[var(--bg-alt)] text-text-muted'
  const statLine = formatStatLine(ps.statLine)

  return (
    <div
      className={`py-2 px-2.5 rounded-lg ${
        isBench
          ? benchOutscoredStarter
            ? 'bg-amber-500/8 border border-amber-500/20'
            : 'opacity-40'
          : 'bg-[var(--bg-alt)] border border-[var(--card-border)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Position badge */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0 ${posClass}`}>
          {ps.nflPos || '—'}
        </span>

        {/* Name + team */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-text-primary truncate">{ps.playerName}</p>
            {ps.nflTeam && (
              <span className="text-[10px] text-text-muted flex-shrink-0">{ps.nflTeam}</span>
            )}
          </div>
        </div>

        {/* Slot label */}
        <span className="text-[10px] text-text-muted w-5 text-center flex-shrink-0">
          {isBench ? 'BN' : 'S'}
        </span>

        {/* Points */}
        <span className={`text-sm font-bold font-mono w-12 text-right flex-shrink-0 ${
          ps.points > 20 ? 'text-emerald-400' :
          ps.points > 10 ? 'text-text-primary' :
          ps.points > 0 ? 'text-text-secondary' : 'text-text-muted'
        }`}>
          {(ps.points || 0).toFixed(1)}
        </span>
      </div>

      {/* Stat line */}
      {statLine && (
        <p className="text-[10px] text-text-muted mt-0.5 ml-10 truncate">{statLine}</p>
      )}

      {/* Bench outscore indicator */}
      {isBench && benchOutscoredStarter && (
        <p className="text-[10px] text-amber-400 mt-0.5 ml-10">Outscored a starter</p>
      )}
    </div>
  )
}

const NflWeeklyScoring = ({ leagueId }) => {
  const { user } = useAuth()
  const [weekNumber, setWeekNumber] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTeamId, setExpandedTeamId] = useState(null)

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    api.getNflWeeklyScores(leagueId, weekNumber)
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [leagueId, weekNumber])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading week {weekNumber} scores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">Error</h2>
            <p className="text-text-secondary mb-4">{error}</p>
            <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to League</Link>
          </Card>
        </div>
      </div>
    )
  }

  const week = data?.week
  const teams = data?.teams || []
  const matchups = data?.matchups || []
  const userTeam = teams.find(t => t.userId === user?.id)

  // Position display order: QB → WR → RB → TE → K → DEF, then anything else
  const posOrder = { QB: 0, WR: 1, RB: 2, TE: 3, K: 4, DEF: 5, DST: 5, DL: 6, LB: 7, DB: 8 }

  // Sort + split players into starters and bench
  const splitPlayers = (playerScores) => {
    if (!playerScores) return { starters: [], bench: [] }
    const starters = playerScores
      .filter(p => p.position === 'ACTIVE')
      .sort((a, b) => {
        const pa = posOrder[a.nflPos] ?? 99
        const pb = posOrder[b.nflPos] ?? 99
        if (pa !== pb) return pa - pb
        return (b.points || 0) - (a.points || 0)
      })
    const bench = [...playerScores]
      .filter(p => p.position !== 'ACTIVE')
      .sort((a, b) => (b.points || 0) - (a.points || 0))
    return { starters, bench }
  }

  // Check if a bench player outscored any starter
  const getLowestStarterPoints = (starters) => {
    if (!starters.length) return 0
    return Math.min(...starters.map(s => s.points || 0))
  }

  const renderTeamDetail = (team) => {
    const { starters, bench } = splitPlayers(team.playerScores)
    const lowestStarter = getLowestStarterPoints(starters)

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${
              team.weekRank === 1 ? 'text-yellow-400' :
              team.weekRank <= 3 ? 'text-emerald-400' : 'text-text-primary'
            }`}>
              #{team.weekRank}
            </span>
            <div>
              <h3 className="text-lg font-semibold font-display text-text-primary">{team.teamName}</h3>
              <p className="text-xs text-text-muted">
                {starters.length} starters, {bench.length} bench
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-display text-emerald-400">
              {team.totalPoints?.toFixed(1)}
            </p>
            <p className="text-xs text-text-muted">fantasy pts</p>
          </div>
        </div>

        {/* Optimal bar */}
        {team.optimalPoints > team.totalPoints && (
          <div className="mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            Optimal lineup: {team.optimalPoints?.toFixed(1)} pts ({team.pointsLeftOnBench?.toFixed(1)} left on bench)
          </div>
        )}

        {/* Starters */}
        <div className="space-y-1">
          {starters.map((ps, i) => (
            <NflPlayerRow
              key={ps.playerId || i}
              ps={ps}
              isBench={false}
            />
          ))}
        </div>

        {/* Bench */}
        {bench.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Bench</span>
              <div className="flex-1 border-t border-[var(--card-border)]" />
              <span className="text-xs text-text-muted">
                {bench.reduce((s, p) => s + (p.points || 0), 0).toFixed(1)} pts
              </span>
            </div>
            <div className="space-y-1">
              {bench.map((ps, i) => (
                <NflPlayerRow
                  key={ps.playerId || i}
                  ps={ps}
                  isBench={true}
                  benchOutscoredStarter={(ps.points || 0) > lowestStarter && starters.length > 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Link to={`/leagues/${leagueId}`} className="inline-flex items-center text-text-secondary hover:text-text-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to League
            </Link>
            <h1 className="text-xl font-bold font-display text-text-primary">NFL Scoring</h1>
          </div>

          {/* Week Selector */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-4">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  weekNumber === w
                    ? 'bg-emerald-500 text-text-primary'
                    : 'bg-[var(--bg-alt)] text-text-muted hover:text-text-primary'
                }`}
              >
                Wk {w}
              </button>
            ))}
          </div>

          {/* Week Banner */}
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-text-primary">
                  {week?.name || `Week ${weekNumber}`}
                </h2>
                <p className="text-sm text-text-muted">
                  {week?.status === 'COMPLETED' ? 'Final' : week?.status || 'Scheduled'}
                </p>
              </div>
              {teams.length > 0 && (
                <p className="text-xs text-text-muted">{teams.length} teams scored</p>
              )}
            </div>
          </Card>

          {teams.length === 0 ? (
            <Card className="text-center py-12">
              <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold font-display text-text-primary mb-2">No Scores Yet</h2>
              <p className="text-text-secondary">Week {weekNumber} hasn't been scored yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Team */}
              <Card>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-text-primary">Your Team</h3>
                </div>
                {userTeam ? renderTeamDetail(userTeam) : (
                  <div className="text-center py-8 text-text-muted">
                    <p>You don't have a team in this league.</p>
                  </div>
                )}
              </Card>

              {/* League Scoreboard + Matchups */}
              <div className="space-y-6">
                {/* League Scoreboard */}
                <Card>
                  <h3 className="text-base font-semibold text-text-primary mb-4">League Scoreboard</h3>
                  <div className="space-y-2">
                    {teams.map(team => {
                      const isUser = team.userId === user?.id
                      const isExpanded = expandedTeamId === team.teamId
                      return (
                        <div
                          key={team.teamId}
                          className={`rounded-lg transition-colors ${
                            isUser
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'bg-[var(--bg-alt)] hover:bg-[var(--surface-alt)]'
                          }`}
                        >
                          <div
                            onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
                            className="flex items-center gap-3 p-3 cursor-pointer"
                          >
                            <span className={`text-lg font-bold w-7 text-center ${
                              team.weekRank === 1 ? 'text-yellow-400' :
                              team.weekRank === 2 ? 'text-gray-300' :
                              team.weekRank === 3 ? 'text-amber-500' : 'text-text-muted'
                            }`}>
                              {team.weekRank}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isUser ? 'text-emerald-400' : 'text-text-primary'}`}>
                                {team.teamName}
                                {isUser && <span className="text-xs ml-1 text-emerald-400/60">(You)</span>}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold font-display text-text-primary">
                                {team.totalPoints?.toFixed(1)}
                              </p>
                            </div>
                            <svg className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {isExpanded && team.playerScores && (
                            <div className="px-3 pb-3 border-t border-[var(--card-border)] pt-2 space-y-1">
                              {[...team.playerScores]
                                .sort((a, b) => {
                                  if (a.position === 'ACTIVE' && b.position !== 'ACTIVE') return -1
                                  if (a.position !== 'ACTIVE' && b.position === 'ACTIVE') return 1
                                  return (b.points || 0) - (a.points || 0)
                                })
                                .map((ps, i) => {
                                  const isBench = ps.position !== 'ACTIVE'
                                  const statLine = formatStatLine(ps.statLine)
                                  return (
                                    <div
                                      key={ps.playerId || i}
                                      className={`py-1.5 px-2 rounded text-sm ${
                                        isBench ? 'opacity-40' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {ps.nflPos && (
                                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center ${posColors[ps.nflPos] || 'bg-[var(--bg-alt)] text-text-muted'}`}>
                                            {ps.nflPos}
                                          </span>
                                        )}
                                        <span className="flex-1 text-text-primary truncate">{ps.playerName}</span>
                                        <span className="font-bold text-emerald-400 w-12 text-right">{(ps.points || 0).toFixed(1)}</span>
                                      </div>
                                      {statLine && (
                                        <p className="text-[9px] text-text-muted mt-0.5 ml-9 truncate">{statLine}</p>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Matchups */}
                {matchups.length > 0 && (
                  <Card>
                    <h3 className="text-base font-semibold text-text-primary mb-4">Matchups</h3>
                    <div className="space-y-3">
                      {matchups.map(m => {
                        const homeWon = m.isComplete && m.homeScore > m.awayScore
                        const awayWon = m.isComplete && m.awayScore > m.homeScore
                        return (
                          <div
                            key={m.id}
                            className="bg-[var(--bg-alt)] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 text-right">
                                <p className={`font-medium text-sm truncate ${homeWon ? 'text-emerald-400' : 'text-text-primary'}`}>
                                  {m.homeTeam?.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 px-3">
                                <span className={`text-lg font-bold font-mono ${homeWon ? 'text-emerald-400' : 'text-text-primary'}`}>
                                  {m.homeScore?.toFixed(1) || '0.0'}
                                </span>
                                <span className="text-text-muted text-xs">vs</span>
                                <span className={`text-lg font-bold font-mono ${awayWon ? 'text-emerald-400' : 'text-text-primary'}`}>
                                  {m.awayScore?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium text-sm truncate ${awayWon ? 'text-emerald-400' : 'text-text-primary'}`}>
                                  {m.awayTeam?.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Week in Review — always visible for completed weeks */}
          {week?.status === 'COMPLETED' && userTeam && (
            <div className="mt-6">
              <WeekInReview leagueId={leagueId} weekNumber={weekNumber} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default NflWeeklyScoring
