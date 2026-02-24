/**
 * TournamentPreview — Intelligence page for UPCOMING tournaments
 *
 * Layout: 2/3 field table + 1/3 sidebar (insights + weather)
 * Course DNA is displayed in TournamentHeader.
 */

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import WeatherStrip from './WeatherStrip'
import QuickInsights from './QuickInsights'
import PlayerDrawer from '../players/PlayerDrawer'

/** Tooltip wrapper for column headers — shows explanation on hover */
const HeaderTooltip = ({ label, tip, align = 'center', tooltipAlign, sortBy, sortKey, onSort, className = '' }) => {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef(null)

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 400)
  }
  const handleLeave = () => {
    clearTimeout(timeoutRef.current)
    setShow(false)
  }

  // Position classes for tooltip: left-aligned for leftmost columns, right-aligned for rightmost, centered default
  const posClass = tooltipAlign === 'left'
    ? 'left-0'
    : tooltipAlign === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'

  return (
    <th
      className={`text-${align} px-2 py-2 font-medium cursor-pointer hover:text-text-primary transition-colors relative ${sortBy === sortKey ? 'text-gold' : ''} ${className}`}
      onClick={() => onSort(sortKey)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="border-b border-dotted border-current">{label}</span>
      {show && (
        <div className={`absolute z-50 top-full mt-1 ${posClass} w-52 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--card-border)] shadow-xl text-left normal-case tracking-normal pointer-events-none`}>
          <p className="text-[11px] text-text-primary font-semibold mb-0.5 leading-tight">{label}</p>
          <p className="text-[10px] text-text-muted font-normal leading-snug">{tip}</p>
        </div>
      )}
    </th>
  )
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'top20fit', label: 'Top 20 Fit' },
  { key: 'hotForm', label: 'Hot Form (80+)' },
  { key: 'myRoster', label: 'My Roster' },
]

/**
 * Clutch Power Rank — composite tournament ranking.
 * Weights: Form 35%, CPI 25%, Fit 25%, OWGR 15%
 * Each component is normalized to 0-100 before weighting.
 */
function computePowerScore(entry) {
  const cm = entry.clutchMetrics || {}
  if (cm.formScore == null && cm.cpi == null && cm.courseFitScore == null) return null

  // Normalize CPI (-3 to +3) → 0-100
  const cpiNorm = cm.cpi != null ? Math.min(Math.max((cm.cpi + 3) / 6 * 100, 0), 100) : 50
  // Form is already 0-100
  const formNorm = cm.formScore ?? 50
  // Fit is already 0-100
  const fitNorm = cm.courseFitScore ?? 50
  // OWGR: rank 1→100, rank 200→0 (inverted, lower rank = better)
  const owgrNorm = entry.owgrRank ? Math.max(100 - (entry.owgrRank - 1) * 0.5, 0) : 25

  return formNorm * 0.35 + cpiNorm * 0.25 + fitNorm * 0.25 + owgrNorm * 0.15
}

const TournamentPreview = ({ tournament, leaderboard = [], weather = [], myPlayerIds = [] }) => {
  // Auto-detect whether clutch metrics exist to pick smart defaults
  const hasClutchData = leaderboard.some(p => p.clutchMetrics?.courseFitScore != null)

  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState(hasClutchData ? 'powerRank' : 'owgr')
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)

  // Compute power ranks once (stable ranking regardless of sort/filter)
  const powerRanked = [...leaderboard]
    .map(p => ({ ...p, _powerScore: computePowerScore(p) }))
    .sort((a, b) => (b._powerScore ?? -999) - (a._powerScore ?? -999))
    .map((p, i) => ({ ...p, _powerRank: p._powerScore != null ? i + 1 : null }))

  // Build lookup by player id
  const powerRankMap = new Map(powerRanked.map(p => [p.id, p._powerRank]))

  // Filter leaderboard (use powerRanked so we have _powerScore)
  let filteredField = [...powerRanked]

  if (filter === 'top20fit') {
    filteredField = filteredField
      .filter(p => p.clutchMetrics?.courseFitScore != null)
      .sort((a, b) => (b.clutchMetrics?.courseFitScore || 0) - (a.clutchMetrics?.courseFitScore || 0))
      .slice(0, 20)
  } else if (filter === 'hotForm') {
    filteredField = filteredField.filter(p => (p.clutchMetrics?.formScore || 0) >= 80)
  } else if (filter === 'myRoster') {
    filteredField = filteredField.filter(p => myPlayerIds.includes(p.id))
  }

  // Sort
  if (sortBy === 'powerRank') {
    filteredField.sort((a, b) => (b._powerScore ?? -999) - (a._powerScore ?? -999))
  } else if (sortBy === 'courseFit') {
    filteredField.sort((a, b) => (b.clutchMetrics?.courseFitScore || 0) - (a.clutchMetrics?.courseFitScore || 0))
  } else if (sortBy === 'form') {
    filteredField.sort((a, b) => (b.clutchMetrics?.formScore || 0) - (a.clutchMetrics?.formScore || 0))
  } else if (sortBy === 'cpi') {
    filteredField.sort((a, b) => (b.clutchMetrics?.cpi || -9) - (a.clutchMetrics?.cpi || -9))
  } else if (sortBy === 'owgr') {
    filteredField.sort((a, b) => (a.owgrRank || 999) - (b.owgrRank || 999))
  } else if (sortBy === 'history') {
    filteredField.sort((a, b) => (a.courseHistory?.avgToPar ?? 99) - (b.courseHistory?.avgToPar ?? 99))
  }

  const formatScore = (val) => {
    if (val == null) return '—'
    return val > 0 ? `+${val.toFixed(1)}` : val === 0 ? 'E' : val.toFixed(1)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Left: Field Table ── */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
          {/* Filters */}
          <div className="px-4 py-3 border-b border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-text-primary">
                Field Analysis
              </h3>
              <span className="text-xs font-mono text-text-muted">
                {filteredField.length} player{filteredField.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map(opt => {
                const disabled = !hasClutchData && (opt.key === 'top20fit' || opt.key === 'hotForm')
                return (
                  <button
                    key={opt.key}
                    onClick={() => !disabled && setFilter(opt.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filter === opt.key
                        ? 'bg-gold/15 text-gold border border-gold/25'
                        : disabled
                          ? 'bg-[var(--stone)] text-text-muted/40 border border-[var(--card-border)] cursor-not-allowed'
                          : 'bg-[var(--stone)] text-text-muted border border-[var(--card-border)] hover:text-text-primary'
                    }`}
                    title={disabled ? 'Clutch metrics not yet computed for this event' : ''}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-text-muted text-[10px] uppercase tracking-wider">
                  <HeaderTooltip
                    label="#"
                    tip="Clutch Power Rank — our composite tournament ranking. Blends Form (35%), CPI (25%), Course Fit (25%), and OWGR (15%) into one overall projection."
                    align="center"
                    tooltipAlign="left"
                    sortBy={sortBy} sortKey="powerRank" onSort={setSortBy}
                    className="w-8 px-1"
                  />
                  <th className="text-left px-2 py-2 font-medium">Player</th>
                  <HeaderTooltip
                    label="CPI"
                    tip="Clutch Performance Index (-3 to +3). A weighted blend of strokes gained skills — higher means a stronger all-around player."
                    sortBy={sortBy} sortKey="cpi" onSort={setSortBy}
                  />
                  <HeaderTooltip
                    label="Form"
                    tip="Current form rating (0-100). Blends recent skill level with world ranking momentum. 80+ means hot."
                    sortBy={sortBy} sortKey="form" onSort={setSortBy}
                  />
                  <HeaderTooltip
                    label="Fit"
                    tip="Course Fit score (0-100). How well this player's skill profile matches what this course demands. Higher = better matchup."
                    sortBy={sortBy} sortKey="courseFit" onSort={setSortBy}
                  />
                  <HeaderTooltip
                    label="History"
                    tip="Average score to par at this specific course from past tournaments. Fewer rounds = less reliable."
                    sortBy={sortBy} sortKey="history" onSort={setSortBy}
                    className="hidden sm:table-cell"
                  />
                  <HeaderTooltip
                    label="OWGR"
                    tip="Official World Golf Ranking. Lower is better — #1 is the top-ranked player in the world."
                    align="right"
                    sortBy={sortBy} sortKey="owgr" onSort={setSortBy}
                    className="hidden sm:table-cell px-4"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredField.map((entry, i) => {
                  const isMyPlayer = myPlayerIds.includes(entry.id)
                  const cm = entry.clutchMetrics || {}
                  const ch = entry.courseHistory

                  return (
                    <tr
                      key={entry.id || i}
                      className={`hover:bg-[var(--surface-alt)] transition-colors ${isMyPlayer ? 'bg-gold/[0.04]' : ''}`}
                    >
                      <td className="w-8 px-1 py-2.5 text-center">
                        <span className={`text-[11px] font-mono font-bold ${
                          (powerRankMap.get(entry.id) || 999) <= 5 ? 'text-gold' :
                          (powerRankMap.get(entry.id) || 999) <= 15 ? 'text-text-primary' : 'text-text-muted'
                        }`}>
                          {powerRankMap.get(entry.id) || '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <button onClick={() => setDrawerPlayerId(entry.id)} className="flex items-center gap-2.5 group text-left">
                          {entry.headshotUrl ? (
                            <img src={entry.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-[var(--stone)]" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--stone)] flex items-center justify-center text-sm">
                              {entry.countryFlag || '?'}
                            </div>
                          )}
                          <span className={`font-semibold text-xs group-hover:text-gold transition-colors ${isMyPlayer ? 'text-gold' : 'text-text-primary'}`}>
                            {entry.name}
                          </span>
                          {isMyPlayer && <span className="text-[10px] text-gold">★</span>}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-mono text-xs font-bold ${
                          cm.cpi > 1.5 ? 'text-emerald-400' :
                          cm.cpi > 1.0 ? 'text-green-400' :
                          cm.cpi > 0.5 ? 'text-green-300/80' :
                          cm.cpi > 0 ? 'text-text-secondary' :
                          cm.cpi != null ? 'text-red-400' : 'text-text-muted'
                        }`}>
                          {cm.cpi != null ? (cm.cpi > 0 ? `+${cm.cpi.toFixed(1)}` : cm.cpi.toFixed(1)) : '—'}
                        </span>
                        {cm.cpi != null && (
                          <div className="mt-0.5 mx-auto w-12 h-1 bg-[var(--stone)] rounded-full overflow-hidden relative">
                            <div
                              className={`absolute h-full rounded-full ${
                                cm.cpi > 1.5 ? 'bg-emerald-400' : cm.cpi > 1.0 ? 'bg-green-400' : cm.cpi > 0.5 ? 'bg-green-300/60' : cm.cpi > 0 ? 'bg-green-300/30' : 'bg-red-400'
                              }`}
                              style={{
                                left: cm.cpi >= 0 ? '50%' : `${Math.max(50 - Math.abs(cm.cpi) / 3 * 50, 5)}%`,
                                width: `${Math.min(Math.abs(cm.cpi) / 3 * 50, 50)}%`,
                              }}
                            />
                            <div className="absolute left-1/2 top-0 w-[2px] h-full bg-text-muted/70 rounded-full" />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-mono text-xs font-bold ${
                          cm.formScore >= 90 ? 'text-emerald-400' :
                          cm.formScore >= 80 ? 'text-green-400' :
                          cm.formScore >= 70 ? 'text-green-300/80' :
                          cm.formScore >= 60 ? 'text-text-secondary' :
                          cm.formScore != null ? 'text-text-muted' : 'text-text-muted'
                        }`}>
                          {cm.formScore != null ? Math.round(cm.formScore) : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-mono text-xs font-bold ${
                          cm.courseFitScore >= 85 ? 'text-gold' :
                          cm.courseFitScore >= 78 ? 'text-yellow-400' :
                          cm.courseFitScore >= 70 ? 'text-yellow-300/70' :
                          cm.courseFitScore >= 60 ? 'text-text-secondary' :
                          cm.courseFitScore != null ? 'text-text-muted' : 'text-text-muted'
                        }`}>
                          {cm.courseFitScore != null ? Math.round(cm.courseFitScore) : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                        {ch ? (
                          <div className="flex flex-col items-center">
                            <span className={`font-mono text-xs font-bold ${
                              ch.avgToPar != null ? (ch.avgToPar <= -1 ? 'text-gold' : ch.avgToPar <= 0 ? 'text-green-400' : 'text-red-400') : 'text-text-muted'
                            }`}>
                              {formatScore(ch.avgToPar)}
                            </span>
                            <span className="text-[9px] text-text-muted">{ch.rounds} rds</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-text-secondary hidden sm:table-cell">
                        {entry.owgrRank || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredField.length === 0 && (
              <div className="py-12 text-center text-text-muted text-sm">
                {filter === 'myRoster' ? 'No roster players in field. Select a league to highlight your players.' : 'No players match this filter.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Sidebar ── */}
      <div className="space-y-4">
        <QuickInsights leaderboard={leaderboard} />

        {/* Weather in sidebar */}
        <WeatherStrip weather={weather} tournamentStart={tournament?.startDate} />

        {/* Field snapshot when no clutch data */}
        {!hasClutchData && leaderboard.length > 0 && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--card-border)] bg-gradient-to-r from-emerald-500/5 to-transparent">
              <h3 className="text-sm font-bold text-text-primary">Field Snapshot</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Top OWGR */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Top Ranked</p>
                {[...leaderboard]
                  .filter(p => p.owgrRank != null)
                  .sort((a, b) => a.owgrRank - b.owgrRank)
                  .slice(0, 5)
                  .map((p, i) => (
                    <button key={p.id || i} onClick={() => setDrawerPlayerId(p.id)} className="flex items-center justify-between py-1 hover:bg-[var(--surface-alt)] -mx-1 px-1 rounded transition-colors w-full text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-text-muted w-4">{i + 1}.</span>
                        {p.headshotUrl ? (
                          <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
                        ) : (
                          <span className="text-xs">{p.countryFlag || '?'}</span>
                        )}
                        <span className="text-xs font-medium text-text-primary truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-mono text-gold ml-2 flex-shrink-0">#{p.owgrRank}</span>
                    </button>
                  ))
                }
              </div>

              {/* Field stats */}
              <div className="pt-3 border-t border-[var(--card-border)] space-y-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Field Stats</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Total Players</span>
                  <span className="text-xs font-mono text-text-primary">{leaderboard.length}</span>
                </div>
                {(() => {
                  const ranked = leaderboard.filter(p => p.owgrRank && p.owgrRank <= 50).length
                  return ranked > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Top 50 OWGR</span>
                      <span className="text-xs font-mono text-emerald-400">{ranked}</span>
                    </div>
                  ) : null
                })()}
                {(() => {
                  const ranked = leaderboard.filter(p => p.owgrRank && p.owgrRank <= 100).length
                  return ranked > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Top 100 OWGR</span>
                      <span className="text-xs font-mono text-text-secondary">{ranked}</span>
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player info drawer */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        tournamentContext={{
          entry: leaderboard.find(p => p.id === drawerPlayerId),
          course: tournament?.course,
          tournamentName: tournament?.name,
        }}
      />
    </div>
  )
}

export default TournamentPreview
