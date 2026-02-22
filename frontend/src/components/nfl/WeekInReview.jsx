import { useState, useEffect } from 'react'
import api from '../../services/api'
import Card from '../common/Card'

const posColors = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-emerald-500/20 text-emerald-400',
  TE: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-orange-400',
}

const WeekInReview = ({ leagueId, weekNumber, onClose }) => {
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!leagueId || !weekNumber) return
    setLoading(true)
    api.getNflWeekReview(leagueId, weekNumber)
      .then(data => setReview(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [leagueId, weekNumber])

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </Card>
    )
  }

  if (!review) return null

  const { result, lineup, decisions, seasonTrends } = review

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display text-text-primary">Week {weekNumber} in Review</h2>
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">Close</button>
          )}
        </div>

        {/* Matchup result */}
        {result && (
          <div className={`rounded-lg p-4 mb-4 ${result.won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/10'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-bold ${result.won ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.won ? 'WIN' : 'LOSS'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-text-primary">{(result.yourScore || 0).toFixed(1)}</span>
                <span className="text-text-muted mx-2">—</span>
                <span className="text-xl font-mono text-text-secondary">{(result.oppScore || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Optimal lineup comparison */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-text-muted mb-1">Your Lineup</p>
            <p className="text-xl font-bold font-mono text-text-primary">{lineup.actualPoints}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Optimal</p>
            <p className="text-xl font-bold font-mono text-emerald-400">{lineup.optimalPoints}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Efficiency</p>
            <p className={`text-xl font-bold font-mono ${
              lineup.efficiency >= 95 ? 'text-emerald-400' :
              lineup.efficiency >= 85 ? 'text-text-primary' :
              'text-yellow-400'
            }`}>
              {lineup.efficiency}%
            </p>
          </div>
        </div>

        {lineup.pointsLeftOnBench > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
            <p className="text-xs text-text-muted">
              Points left on bench: <span className="text-yellow-400 font-mono font-bold">{lineup.pointsLeftOnBench}</span>
            </p>
          </div>
        )}
      </Card>

      {/* Lineup Decisions */}
      {decisions && decisions.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold font-display text-text-primary uppercase tracking-wider mb-3">Lineup Decisions</h3>
          <div className="space-y-2">
            {decisions.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg ${
                  d.type === 'good' ? 'bg-emerald-500/5' : 'bg-red-500/5'
                }`}
              >
                <span className={`text-sm font-bold flex-shrink-0 ${
                  d.type === 'good' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {d.type === 'good' ? '✓' : '✗'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    Started <span className="font-medium">{d.starter.name}</span>
                    <span className="text-text-muted font-mono text-xs ml-1">({(d.starter.points || 0).toFixed(1)})</span>
                    {' '}over{' '}
                    <span className="text-text-secondary">{d.alternative.name}</span>
                    <span className="text-text-muted font-mono text-xs ml-1">({(d.alternative.points || 0).toFixed(1)})</span>
                  </p>
                </div>

                <span className={`text-xs font-bold font-mono flex-shrink-0 ${
                  d.type === 'good' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {d.type === 'good' ? '+' : '-'}{Math.abs(d.diff).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Optimal Lineup */}
      {lineup.optimalLineup && lineup.optimalLineup.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold font-display text-text-primary uppercase tracking-wider mb-3">
            Optimal Lineup ({lineup.optimalPoints} pts)
          </h3>
          <div className="space-y-1">
            {lineup.optimalLineup.map((p, i) => {
              const wasStarted = lineup.starters.some(s => s.playerId === p.playerId)
              return (
                <div
                  key={p.playerId || i}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded ${
                    wasStarted ? 'bg-[var(--bg-alt)]' : 'bg-yellow-500/5'
                  }`}
                >
                  {p.nflPos && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center flex-shrink-0 ${
                      posColors[p.nflPos] || 'bg-[var(--bg-alt)] text-text-muted'
                    }`}>{p.nflPos}</span>
                  )}
                  <span className="text-xs text-text-muted w-8 flex-shrink-0">{p.optimalSlot}</span>
                  <span className={`text-sm flex-1 truncate ${wasStarted ? 'text-text-primary' : 'text-yellow-400'}`}>
                    {p.playerName}
                    {!wasStarted && <span className="text-[10px] text-yellow-400/60 ml-1">(bench)</span>}
                  </span>
                  <span className="text-sm font-bold font-mono text-text-primary w-12 text-right">
                    {(p.points || 0).toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Season Trends */}
      {seasonTrends && (
        <Card>
          <h3 className="text-sm font-bold font-display text-text-primary uppercase tracking-wider mb-3">
            Season Trends ({seasonTrends.weeksAnalyzed} weeks)
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-muted">Avg Lineup Efficiency</p>
              <p className={`text-xl font-bold font-mono ${
                seasonTrends.avgEfficiency >= 90 ? 'text-emerald-400' : 'text-text-primary'
              }`}>{seasonTrends.avgEfficiency}%</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Points Left on Bench</p>
              <p className="text-xl font-bold font-mono text-yellow-400">{seasonTrends.totalPointsLeft}</p>
            </div>
          </div>

          {/* Weekly efficiency chart (simple bar representation) */}
          <div className="space-y-1">
            {seasonTrends.weeklyEfficiencies.map(we => (
              <div key={we.week} className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono w-8">Wk{we.week}</span>
                <div className="flex-1 h-4 bg-[var(--bg-alt)] rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${
                      we.efficiency >= 95 ? 'bg-emerald-500' :
                      we.efficiency >= 85 ? 'bg-emerald-500/60' :
                      we.efficiency >= 75 ? 'bg-yellow-500/60' :
                      'bg-red-500/60'
                    }`}
                    style={{ width: `${Math.min(100, we.efficiency)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary w-12 text-right">{we.efficiency}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default WeekInReview
