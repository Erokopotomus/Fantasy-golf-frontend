/**
 * TournamentPreview — Full intelligence page for UPCOMING tournaments
 *
 * Three sections:
 * A. Course Intelligence Card (course DNA, specs, link to course detail)
 * B. Weather Strip (4-day forecast with difficulty badges)
 * C. Field Analysis (table sorted by Course Fit + Quick Insights sidebar)
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import WeatherStrip from './WeatherStrip'
import QuickInsights from './QuickInsights'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'top20fit', label: 'Top 20 Fit' },
  { key: 'hotForm', label: 'Hot Form (80+)' },
  { key: 'myRoster', label: 'My Roster' },
]

const TournamentPreview = ({ tournament, leaderboard = [], weather = [], myPlayerIds = [] }) => {
  const course = tournament?.course

  // Auto-detect whether clutch metrics exist to pick smart defaults
  const hasClutchData = leaderboard.some(p => p.clutchMetrics?.courseFitScore != null)
  const hasHistoryData = leaderboard.some(p => p.courseHistory != null)

  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState(hasClutchData ? 'courseFit' : 'owgr')

  // Course DNA — translate raw weights into actionable labels
  // Weights sum to ~1.0 across 4 categories, so 0.25 = average
  const getDnaLabel = (val) => {
    if (val == null) return null
    if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bg: 'bg-gold/15 border-gold/25' }
    if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' }
    if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bg: 'bg-white/5 border-white/10' }
    return { text: 'Low', color: 'text-text-muted', bg: 'bg-white/[0.03] border-white/[0.06]' }
  }

  const dnaCategories = course ? [
    { label: 'Driving', value: course.drivingImportance, desc: 'Distance & accuracy off the tee' },
    { label: 'Approach', value: course.approachImportance, desc: 'Iron play into greens' },
    { label: 'Short Game', value: course.aroundGreenImportance, desc: 'Chipping & scrambling' },
    { label: 'Putting', value: course.puttingImportance, desc: 'Performance on the greens' },
  ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) })) : []

  // Build a one-line summary: "This course rewards approach play and putting"
  const premiumSkills = dnaCategories.filter(d => d.value >= 0.27).sort((a, b) => b.value - a.value)
  const courseSummary = premiumSkills.length > 0
    ? `Rewards ${premiumSkills.map(s => s.label.toLowerCase()).join(' and ')}`
    : null

  // Filter leaderboard
  let filteredField = [...leaderboard]

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
  if (sortBy === 'courseFit') {
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
    <div className="space-y-4">
      {/* A. Course Intelligence Card */}
      {course && (
        <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-white">{course.name}</h3>
                {course.nickname && course.nickname !== course.name && (
                  <p className="text-gold text-xs font-medium">"{course.nickname}"</p>
                )}
                {(course.city || course.state) && (
                  <p className="text-text-muted text-xs mt-0.5">
                    {[course.city, course.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <Link
                to={`/courses/${course.id}`}
                className="text-xs text-gold hover:text-gold/80 transition-colors font-medium flex-shrink-0"
              >
                Full Profile →
              </Link>
            </div>

            {/* Specs row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-4">
              {course.par && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted uppercase">Par</span>
                  <span className="text-sm font-mono font-bold text-white">{course.par}</span>
                </div>
              )}
              {course.yardage && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted uppercase">Yardage</span>
                  <span className="text-sm font-mono font-bold text-white">{course.yardage?.toLocaleString()}</span>
                </div>
              )}
              {course.grassType && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted uppercase">Grass</span>
                  <span className="text-sm font-mono font-bold text-white">{course.grassType}</span>
                </div>
              )}
            </div>

            {/* What Wins Here */}
            {dnaCategories.length > 0 && (
              <div>
                {courseSummary && (
                  <p className="text-xs text-emerald-400 font-medium mb-3">{courseSummary}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {dnaCategories.map((cat) => (
                    <div key={cat.label} className={`rounded-lg border px-3 py-2 ${cat.rating.bg}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white text-xs font-semibold">{cat.label}</span>
                        <span className={`text-[10px] font-mono font-bold ${cat.rating.color}`}>
                          {cat.rating.text}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-tight">{cat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. Weather Strip */}
      <WeatherStrip weather={weather} tournamentStart={tournament?.startDate} />

      {/* C. Field Analysis — 2/3 table + 1/3 insights sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Field Table */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
            {/* Header + Filters */}
            <div className="px-4 py-3 border-b border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">
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
                            ? 'bg-dark-tertiary text-text-muted/40 border border-dark-border cursor-not-allowed'
                            : 'bg-dark-tertiary text-text-muted border border-dark-border hover:text-white'
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border text-text-muted text-[10px] uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Player</th>
                    <th
                      className={`text-center px-2 py-2 font-medium cursor-pointer hover:text-white transition-colors ${sortBy === 'cpi' ? 'text-gold' : ''}`}
                      onClick={() => setSortBy('cpi')}
                    >
                      CPI
                    </th>
                    <th
                      className={`text-center px-2 py-2 font-medium cursor-pointer hover:text-white transition-colors ${sortBy === 'form' ? 'text-gold' : ''}`}
                      onClick={() => setSortBy('form')}
                    >
                      Form
                    </th>
                    <th
                      className={`text-center px-2 py-2 font-medium cursor-pointer hover:text-white transition-colors ${sortBy === 'courseFit' ? 'text-gold' : ''}`}
                      onClick={() => setSortBy('courseFit')}
                    >
                      Fit
                    </th>
                    <th
                      className={`text-center px-2 py-2 font-medium cursor-pointer hover:text-white transition-colors hidden sm:table-cell ${sortBy === 'history' ? 'text-gold' : ''}`}
                      onClick={() => setSortBy('history')}
                    >
                      History
                    </th>
                    <th
                      className={`text-right px-4 py-2 font-medium cursor-pointer hover:text-white transition-colors hidden sm:table-cell ${sortBy === 'owgr' ? 'text-gold' : ''}`}
                      onClick={() => setSortBy('owgr')}
                    >
                      OWGR
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/30">
                  {filteredField.map((entry, i) => {
                    const isMyPlayer = myPlayerIds.includes(entry.id)
                    const cm = entry.clutchMetrics || {}
                    const ch = entry.courseHistory

                    return (
                      <tr
                        key={entry.id || i}
                        className={`hover:bg-dark-tertiary/50 transition-colors ${isMyPlayer ? 'bg-gold/[0.04]' : ''}`}
                      >
                        <td className="px-4 py-2.5">
                          <Link to={`/players/${entry.id}`} className="flex items-center gap-2.5 group">
                            {entry.headshotUrl ? (
                              <img src={entry.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-dark-tertiary" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-dark-tertiary flex items-center justify-center text-sm">
                                {entry.countryFlag || '?'}
                              </div>
                            )}
                            <span className={`font-semibold text-xs group-hover:text-gold transition-colors ${isMyPlayer ? 'text-gold' : 'text-white'}`}>
                              {entry.name}
                            </span>
                            {isMyPlayer && <span className="text-[10px] text-gold">★</span>}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`font-mono text-xs font-bold ${
                            cm.cpi > 1 ? 'text-emerald-400' : cm.cpi > 0 ? 'text-green-400' : cm.cpi != null ? 'text-red-400' : 'text-text-muted'
                          }`}>
                            {cm.cpi != null ? (cm.cpi > 0 ? `+${cm.cpi.toFixed(1)}` : cm.cpi.toFixed(1)) : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`font-mono text-xs font-bold ${
                            cm.formScore >= 80 ? 'text-emerald-400' : cm.formScore >= 60 ? 'text-green-400' : cm.formScore != null ? 'text-text-secondary' : 'text-text-muted'
                          }`}>
                            {cm.formScore != null ? Math.round(cm.formScore) : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`font-mono text-xs font-bold ${
                            cm.courseFitScore >= 80 ? 'text-gold' : cm.courseFitScore >= 60 ? 'text-yellow-400' : cm.courseFitScore != null ? 'text-text-secondary' : 'text-text-muted'
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

        {/* Quick Insights Sidebar */}
        <div className="space-y-4">
          <QuickInsights leaderboard={leaderboard} />

          {/* Field snapshot when no clutch data */}
          {!hasClutchData && leaderboard.length > 0 && (
            <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border bg-gradient-to-r from-emerald-500/5 to-transparent">
                <h3 className="text-sm font-bold text-white">Field Snapshot</h3>
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
                      <Link key={p.id || i} to={`/players/${p.id}`} className="flex items-center justify-between py-1 hover:bg-dark-tertiary/50 -mx-1 px-1 rounded transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-text-muted w-4">{i + 1}.</span>
                          {p.headshotUrl ? (
                            <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                          ) : (
                            <span className="text-xs">{p.countryFlag || '?'}</span>
                          )}
                          <span className="text-xs font-medium text-white truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-mono text-gold ml-2 flex-shrink-0">#{p.owgrRank}</span>
                      </Link>
                    ))
                  }
                </div>

                {/* Field stats */}
                <div className="pt-3 border-t border-dark-border/50 space-y-2">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Field Stats</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Total Players</span>
                    <span className="text-xs font-mono text-white">{leaderboard.length}</span>
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
      </div>
    </div>
  )
}

export default TournamentPreview
