import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Card from '../common/Card'

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
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading week {weekNumber} scores...</p>
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

  const week = data?.week
  const teams = data?.teams || []
  const matchups = data?.matchups || []
  const userTeam = teams.find(t => t.userId === user?.id)

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
            <h1 className="text-xl font-bold font-display text-white">NFL Scoring</h1>
          </div>

          {/* Week Selector */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-4">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  weekNumber === w
                    ? 'bg-emerald-500 text-white'
                    : 'bg-dark-tertiary text-text-muted hover:text-white'
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
                <h2 className="text-lg font-bold font-display text-white">
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
              <h2 className="text-xl font-bold font-display text-white mb-2">No Scores Yet</h2>
              <p className="text-text-secondary">Week {weekNumber} hasn't been scored yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Team */}
              <Card>
                <h3 className="text-base font-semibold text-white mb-4">Your Team</h3>
                {userTeam ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${
                          userTeam.weekRank === 1 ? 'text-yellow-400' :
                          userTeam.weekRank <= 3 ? 'text-emerald-400' : 'text-white'
                        }`}>
                          #{userTeam.weekRank}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold font-display text-white">{userTeam.teamName}</h3>
                          <p className="text-xs text-text-muted">
                            {userTeam.playerScores?.length || 0} players scored
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold font-display text-emerald-400">
                          {userTeam.totalPoints?.toFixed(1)}
                        </p>
                        <p className="text-xs text-text-muted">fantasy pts</p>
                      </div>
                    </div>

                    {/* Optimal bar */}
                    {userTeam.optimalPoints > userTeam.totalPoints && (
                      <div className="mb-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                        Optimal: {userTeam.optimalPoints?.toFixed(1)} pts ({userTeam.pointsLeftOnBench?.toFixed(1)} on bench)
                      </div>
                    )}

                    {/* Player scores */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 px-2 text-[10px] text-text-muted uppercase tracking-wider mb-1">
                        <div className="flex-1">Player</div>
                        <div className="w-10 text-center">Pos</div>
                        <div className="w-14 text-right">Pts</div>
                      </div>
                      {(userTeam.playerScores || [])
                        .sort((a, b) => {
                          if (a.position === 'ACTIVE' && b.position !== 'ACTIVE') return -1
                          if (a.position !== 'ACTIVE' && b.position === 'ACTIVE') return 1
                          return (b.points || 0) - (a.points || 0)
                        })
                        .map((ps, i) => {
                          const isBench = ps.position !== 'ACTIVE'
                          return (
                            <div
                              key={ps.playerId || i}
                              className={`flex items-center gap-3 py-2 px-2 rounded-lg ${
                                isBench ? 'opacity-50' : 'bg-dark-tertiary/50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{ps.playerName}</p>
                              </div>
                              <div className="w-10 text-center text-xs text-text-muted">
                                {isBench ? 'BN' : 'S'}
                              </div>
                              <div className="w-14 text-right text-sm font-bold text-emerald-400">
                                {(ps.points || 0).toFixed(1)}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <p>You don't have a team in this league.</p>
                  </div>
                )}
              </Card>

              {/* League Scoreboard + Matchups */}
              <div className="space-y-6">
                {/* League Scoreboard */}
                <Card>
                  <h3 className="text-base font-semibold text-white mb-4">League Scoreboard</h3>
                  <div className="space-y-2">
                    {teams.map(team => {
                      const isUser = team.userId === user?.id
                      return (
                        <div
                          key={team.teamId}
                          onClick={() => setExpandedTeamId(expandedTeamId === team.teamId ? null : team.teamId)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            isUser
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'bg-dark-tertiary/50 hover:bg-dark-tertiary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold w-7 text-center ${
                              team.weekRank === 1 ? 'text-yellow-400' :
                              team.weekRank === 2 ? 'text-gray-300' :
                              team.weekRank === 3 ? 'text-amber-500' : 'text-text-muted'
                            }`}>
                              {team.weekRank}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isUser ? 'text-emerald-400' : 'text-white'}`}>
                                {team.teamName}
                                {isUser && <span className="text-xs ml-1 text-emerald-400/60">(You)</span>}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold font-display text-white">
                                {team.totalPoints?.toFixed(1)}
                              </p>
                            </div>
                            <svg className={`w-4 h-4 text-text-muted transition-transform ${expandedTeamId === team.teamId ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {expandedTeamId === team.teamId && team.playerScores && (
                            <div className="mt-3 space-y-1 border-t border-dark-border/50 pt-3">
                              {team.playerScores
                                .sort((a, b) => {
                                  if (a.position === 'ACTIVE' && b.position !== 'ACTIVE') return -1
                                  if (a.position !== 'ACTIVE' && b.position === 'ACTIVE') return 1
                                  return (b.points || 0) - (a.points || 0)
                                })
                                .map((ps, i) => (
                                  <div
                                    key={ps.playerId || i}
                                    className={`flex items-center gap-3 py-1.5 px-2 rounded text-sm ${
                                      ps.position !== 'ACTIVE' ? 'opacity-40' : ''
                                    }`}
                                  >
                                    <span className="flex-1 text-white truncate">{ps.playerName}</span>
                                    <span className="text-xs text-text-muted">{ps.position !== 'ACTIVE' ? 'BN' : 'S'}</span>
                                    <span className="font-bold text-emerald-400 w-12 text-right">{(ps.points || 0).toFixed(1)}</span>
                                  </div>
                                ))}
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
                    <h3 className="text-base font-semibold text-white mb-4">Matchups</h3>
                    <div className="space-y-3">
                      {matchups.map(m => {
                        const homeWon = m.isComplete && m.homeScore > m.awayScore
                        const awayWon = m.isComplete && m.awayScore > m.homeScore
                        return (
                          <div
                            key={m.id}
                            className="bg-dark-tertiary/50 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 text-right">
                                <p className={`font-medium text-sm truncate ${homeWon ? 'text-emerald-400' : 'text-white'}`}>
                                  {m.homeTeam?.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 px-3">
                                <span className={`text-lg font-bold font-mono ${homeWon ? 'text-emerald-400' : 'text-white'}`}>
                                  {m.homeScore?.toFixed(1) || '0.0'}
                                </span>
                                <span className="text-text-muted text-xs">vs</span>
                                <span className={`text-lg font-bold font-mono ${awayWon ? 'text-emerald-400' : 'text-white'}`}>
                                  {m.awayScore?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium text-sm truncate ${awayWon ? 'text-emerald-400' : 'text-white'}`}>
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
        </div>
      </main>
    </div>
  )
}

export default NflWeeklyScoring
