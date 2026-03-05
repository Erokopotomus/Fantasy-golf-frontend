import { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'

/**
 * Composite power score: blends CPI + SG Total for ranking when projections
 * aren't available.  CPI range ~[-3,+3], SG Total ~[-2,+3].
 * Normalise both to a 0-100 scale, weight CPI 55%, SG 45%.
 */
const computePowerScore = (p) => {
  const cpi = p.cpi ?? 0     // -3 to +3
  const sg  = p.sgTotal ?? 0 // roughly -2 to +3
  const cpiNorm = Math.min(100, Math.max(0, ((cpi + 3) / 6) * 100))
  const sgNorm  = Math.min(100, Math.max(0, ((sg + 2) / 5) * 100))
  return cpiNorm * 0.55 + sgNorm * 0.45
}

/**
 * Lineup Optimizer — fetches projections for all roster players,
 * ranks them, and suggests the best active lineup.
 * Falls back to CPI + SG Total composite when projections are unavailable.
 */
const LineupOptimizer = ({ roster, maxActive, currentActiveIds, onApply, onClose }) => {
  const [playerProfiles, setPlayerProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('composite') // default to composite (always available)

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
                cpi: data.player?.clutchMetrics?.cpi ?? data.player?.cpi ?? null,
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
                cpi: null,
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

  // Check if any player has real projection data
  const hasProjections = useMemo(
    () => playerProfiles.some(p => p.projection?.projected != null),
    [playerProfiles]
  )

  // Best ranking function: use projections when available, otherwise CPI+SG composite
  const getRankScore = (p) => {
    if (hasProjections && p.projection?.projected != null) return p.projection.projected
    return computePowerScore(p)
  }

  // Sort players by the selected metric
  const sorted = [...playerProfiles].sort((a, b) => {
    if (sortBy === 'composite') return computePowerScore(b) - computePowerScore(a)
    if (sortBy === 'projected') {
      return (b.projection?.projected || 0) - (a.projection?.projected || 0)
    }
    if (sortBy === 'sgTotal') return (b.sgTotal || 0) - (a.sgTotal || 0)
    if (sortBy === 'cpi') return (b.cpi ?? -99) - (a.cpi ?? -99)
    if (sortBy === 'recentAvg') {
      return (b.projection?.recentAvg || 0) - (a.projection?.recentAvg || 0)
    }
    if (sortBy === 'consistency') {
      return (b.projection?.consistency || 0) - (a.projection?.consistency || 0)
    }
    return 0
  })

  // Optimal lineup = top N by best available ranking
  const optimalIds = new Set(
    [...playerProfiles]
      .sort((a, b) => getRankScore(b) - getRankScore(a))
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
    { id: 'composite', label: 'Power Score' },
    ...(hasProjections ? [{ id: 'projected', label: 'Projected' }] : []),
    { id: 'sgTotal', label: 'SG: Total' },
    { id: 'cpi', label: 'CPI' },
    ...(hasProjections ? [{ id: 'consistency', label: 'Consistency' }] : []),
  ]

  return (
    <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--card-border)] bg-gradient-to-r from-field-bright/10 to-[var(--surface)]">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-field" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-bold font-display text-text-primary">Lineup Optimizer</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs">
          Close
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-field-bright/30 border-t-field-bright rounded-full animate-spin" />
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
                    ? 'bg-field-bright/15 text-field'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Player comparison table */}
          <div className="px-3 pb-3">
            <div className={`grid ${hasProjections ? 'grid-cols-[auto_1fr_50px_50px_50px_50px]' : 'grid-cols-[auto_1fr_50px_50px_50px]'} gap-x-2 text-[10px] text-text-muted uppercase tracking-wider font-medium px-2 pb-1`}>
              <div className="w-5"></div>
              <div>Player</div>
              <div className="text-center" title="Power Score — composite of CPI (55%) + SG Total (45%)">Power</div>
              <div className="text-center" title="Clutch Performance Index (-3.0 to +3.0)">CPI</div>
              <div className="text-center" title="Strokes Gained Total per round">SG</div>
              {hasProjections && <div className="text-center">Proj</div>}
            </div>

            <div className="space-y-1">
              {sorted.map((p, idx) => {
                const isOptimal = optimalIds.has(p.id)
                const isCurrent = currentSet.has(p.id)
                const power = computePowerScore(p)
                return (
                  <div
                    key={p.id}
                    className={`grid ${hasProjections ? 'grid-cols-[auto_1fr_50px_50px_50px_50px]' : 'grid-cols-[auto_1fr_50px_50px_50px]'} gap-x-2 items-center p-2 rounded-lg transition-colors ${
                      isOptimal
                        ? 'bg-field-bright/10 border border-field-bright/20'
                        : 'bg-[var(--surface)] border border-transparent'
                    }`}
                  >
                    {/* Rank indicator */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx < maxActive ? 'bg-field-bright/20 text-field' : 'bg-[var(--bg-alt)] text-text-muted'
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm flex-shrink-0">{p.countryFlag || '?'}</span>
                      <div className="min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                          {isCurrent && <span className="text-field">Active</span>}
                          {isOptimal && !isCurrent && <span className="text-crown">Suggested</span>}
                          {!isOptimal && isCurrent && <span className="text-blaze">Bench?</span>}
                        </div>
                      </div>
                    </div>

                    {/* Power Score (composite) */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${
                        power > 70 ? 'text-field' :
                        power > 50 ? 'text-text-primary' : 'text-text-muted'
                      }`}>
                        {power.toFixed(0)}
                      </span>
                    </div>

                    {/* CPI */}
                    <div className="text-center">
                      <span className={`text-xs font-medium ${
                        (p.cpi ?? 0) > 0.5 ? 'text-field' :
                        (p.cpi ?? 0) > -0.3 ? 'text-text-primary' : 'text-live-red'
                      }`}>
                        {p.cpi != null ? (p.cpi > 0 ? '+' : '') + p.cpi.toFixed(1) : '\u2014'}
                      </span>
                    </div>

                    {/* SG Total */}
                    <div className="text-center">
                      <span className={`text-xs font-medium ${
                        (p.sgTotal || 0) > 1 ? 'text-field' :
                        (p.sgTotal || 0) > 0 ? 'text-text-primary' : 'text-live-red'
                      }`}>
                        {p.sgTotal != null ? (p.sgTotal > 0 ? '+' : '') + p.sgTotal.toFixed(1) : '\u2014'}
                      </span>
                    </div>

                    {/* Projected (only when available) */}
                    {hasProjections && (
                      <div className="text-center">
                        <span className={`text-xs font-medium ${
                          (p.projection?.projected || 0) > 30 ? 'text-field' :
                          (p.projection?.projected || 0) > 20 ? 'text-text-primary' : 'text-text-muted'
                        }`}>
                          {p.projection?.projected?.toFixed(1) || '\u2014'}
                        </span>
                      </div>
                    )}
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
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-field-bright text-text-primary hover:bg-emerald-600 transition-colors"
              >
                Apply Suggested Lineup
              </button>
              <p className="text-[10px] text-text-muted text-center mt-1.5">
                This will set the top {maxActive} players by {hasProjections ? 'projected points' : 'CPI + SG Total'} as active
              </p>
            </div>
          )}

          {!hasChanges && (
            <div className="px-3 pb-3">
              <div className="text-center py-2 text-xs text-field bg-field-bright/10 rounded-lg">
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
