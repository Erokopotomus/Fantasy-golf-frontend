import { useState, useEffect } from 'react'
import { api } from '../../services/api'

/**
 * Lineup Optimizer — fetches projections for all roster players,
 * ranks them, and suggests the best active lineup.
 */
const LineupOptimizer = ({ roster, maxActive, currentActiveIds, onApply, onClose }) => {
  const [playerProfiles, setPlayerProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('projected')

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const results = await Promise.all(
          roster.map(async (p) => {
            try {
              const data = await api.getPlayerProfile(p.id)
              return {
                id: p.id,
                name: p.name,
                countryFlag: p.countryFlag,
                owgrRank: p.owgrRank,
                primaryTour: p.primaryTour,
                sgTotal: data.player?.sgTotal ?? p.sgTotal,
                sgApproach: data.player?.sgApproach ?? p.sgApproach,
                sgOffTee: data.player?.sgOffTee ?? p.sgOffTee,
                sgPutting: data.player?.sgPutting ?? p.sgPutting,
                sgAroundGreen: data.player?.sgAroundGreen,
                projection: data.projection || null,
                rosterPosition: p.rosterPosition,
              }
            } catch {
              return {
                id: p.id,
                name: p.name,
                countryFlag: p.countryFlag,
                owgrRank: p.owgrRank,
                primaryTour: p.primaryTour,
                sgTotal: p.sgTotal,
                sgApproach: p.sgApproach,
                sgOffTee: p.sgOffTee,
                sgPutting: p.sgPutting,
                sgAroundGreen: null,
                projection: null,
                rosterPosition: p.rosterPosition,
              }
            }
          })
        )
        setPlayerProfiles(results)
      } catch (err) {
        console.error('Optimizer fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    if (roster.length > 0) fetchAll()
  }, [roster])

  // Sort players by the selected metric
  const sorted = [...playerProfiles].sort((a, b) => {
    if (sortBy === 'projected') {
      return (b.projection?.projected || 0) - (a.projection?.projected || 0)
    }
    if (sortBy === 'sgTotal') return (b.sgTotal || 0) - (a.sgTotal || 0)
    if (sortBy === 'recentAvg') {
      return (b.projection?.recentAvg || 0) - (a.projection?.recentAvg || 0)
    }
    if (sortBy === 'consistency') {
      return (b.projection?.consistency || 0) - (a.projection?.consistency || 0)
    }
    return 0
  })

  // Optimal lineup = top N by projected points
  const optimalIds = new Set(
    [...playerProfiles]
      .sort((a, b) => (b.projection?.projected || 0) - (a.projection?.projected || 0))
      .slice(0, maxActive)
      .map(p => p.id)
  )

  const currentSet = new Set(currentActiveIds || [])
  const hasChanges = (() => {
    if (currentSet.size !== optimalIds.size) return true
    for (const id of optimalIds) {
      if (!currentSet.has(id)) return true
    }
    return false
  })()

  const sortOptions = [
    { id: 'projected', label: 'Projected' },
    { id: 'sgTotal', label: 'SG: Total' },
    { id: 'recentAvg', label: 'Recent Avg' },
    { id: 'consistency', label: 'Consistency' },
  ]

  return (
    <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--card-border)] bg-gradient-to-r from-emerald-500/10 to-dark-secondary">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-bold text-text-primary">Lineup Optimizer</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs">
          Close
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-text-muted text-sm ml-3">Analyzing roster...</span>
        </div>
      ) : (
        <>
          {/* Sort toggle */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-2">
            <span className="text-[10px] text-text-muted uppercase font-medium mr-1">Sort:</span>
            {sortOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  sortBy === opt.id
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Player comparison table */}
          <div className="px-3 pb-3">
            <div className="grid grid-cols-[auto_1fr_60px_60px_60px_50px] gap-x-2 text-[10px] text-text-muted uppercase tracking-wider font-medium px-2 pb-1">
              <div className="w-5"></div>
              <div>Player</div>
              <div className="text-center">Proj</div>
              <div className="text-center">SG</div>
              <div className="text-center">Trend</div>
              <div className="text-center">Conf</div>
            </div>

            <div className="space-y-1">
              {sorted.map((p, idx) => {
                const isOptimal = optimalIds.has(p.id)
                const isCurrent = currentSet.has(p.id)
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[auto_1fr_60px_60px_60px_50px] gap-x-2 items-center p-2 rounded-lg transition-colors ${
                      isOptimal
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-[var(--surface)] border border-transparent'
                    }`}
                  >
                    {/* Rank indicator */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx < maxActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--bg-alt)] text-text-muted'
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm flex-shrink-0">{p.countryFlag || '?'}</span>
                      <div className="min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                          {isCurrent && <span className="text-emerald-400">Active</span>}
                          {isOptimal && !isCurrent && <span className="text-yellow-400">Suggested</span>}
                          {!isOptimal && isCurrent && <span className="text-orange-400">Bench?</span>}
                        </div>
                      </div>
                    </div>

                    {/* Projected */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${
                        (p.projection?.projected || 0) > 30 ? 'text-emerald-400' :
                        (p.projection?.projected || 0) > 20 ? 'text-text-primary' : 'text-text-muted'
                      }`}>
                        {p.projection?.projected?.toFixed(1) || '\u2014'}
                      </span>
                    </div>

                    {/* SG Total */}
                    <div className="text-center">
                      <span className={`text-xs font-medium ${
                        (p.sgTotal || 0) > 1 ? 'text-emerald-400' :
                        (p.sgTotal || 0) > 0 ? 'text-text-primary' : 'text-red-400'
                      }`}>
                        {p.sgTotal != null ? (p.sgTotal > 0 ? '+' : '') + p.sgTotal.toFixed(1) : '\u2014'}
                      </span>
                    </div>

                    {/* Trend */}
                    <div className="text-center">
                      <span className={`text-xs font-medium ${
                        (p.projection?.trend || 0) > 5 ? 'text-emerald-400' :
                        (p.projection?.trend || 0) < -5 ? 'text-red-400' : 'text-text-muted'
                      }`}>
                        {p.projection?.trend != null
                          ? `${p.projection.trend > 0 ? '+' : ''}${p.projection.trend.toFixed(0)}%`
                          : '\u2014'}
                      </span>
                    </div>

                    {/* Consistency */}
                    <div className="text-center">
                      <span className={`text-xs font-medium ${
                        (p.projection?.consistency || 0) > 70 ? 'text-emerald-400' :
                        (p.projection?.consistency || 0) > 40 ? 'text-text-primary' : 'text-yellow-400'
                      }`}>
                        {p.projection?.consistency?.toFixed(0) || '\u2014'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Apply suggestion */}
          {hasChanges && onApply && (
            <div className="px-3 pb-3">
              <button
                onClick={() => onApply([...optimalIds])}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-emerald-500 text-text-primary hover:bg-emerald-600 transition-colors"
              >
                Apply Suggested Lineup
              </button>
              <p className="text-[10px] text-text-muted text-center mt-1.5">
                This will set the top {maxActive} projected players as active
              </p>
            </div>
          )}

          {!hasChanges && (
            <div className="px-3 pb-3">
              <div className="text-center py-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg">
                Your current lineup matches the optimal suggestion
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default LineupOptimizer
