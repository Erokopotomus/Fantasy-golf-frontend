import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'

const PlayerDrawer = ({ playerId, isOpen, onClose, rosterContext, isNfl = false }) => {
  const [player, setPlayer] = useState(null)
  const [projection, setProjection] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchPlayer = useCallback(async () => {
    if (!playerId) return
    setLoading(true)
    try {
      if (isNfl) {
        const data = await api.getNflPlayer(playerId, { season: 2024 })
        const p = data.player || data
        const totals = data.seasonTotals || {}
        // Merge season totals into player for the stat cards
        p.gamesPlayed = totals.gamesPlayed || 0
        p.seasonFantasyPts = totals.fantasyPtsHalf || 0
        p.fantasyPtsPerGame = p.gamesPlayed > 0 ? Math.round((p.seasonFantasyPts / p.gamesPlayed) * 10) / 10 : 0
        p.gameLog = data.gameLog || []
        setPlayer(p)
        const ppg = p.fantasyPtsPerGame || 0
        setProjection({
          projected: Math.round(ppg),
          avgFantasyPoints: ppg.toFixed(1),
          trend: 0,
          consistency: p.gamesPlayed > 0 ? 100 : 0,
          floor: 0, ceiling: 0, totalEvents: p.gamesPlayed, recentAvg: ppg.toFixed(1),
        })
        setUpcoming([])
      } else {
        const data = await api.getPlayerProfile(playerId)
        setPlayer(data.player)
        setProjection(data.projection)
        setUpcoming(data.upcomingTournaments || [])
      }
    } catch (err) {
      console.error('Failed to load player:', err)
    } finally {
      setLoading(false)
    }
  }, [playerId, isNfl])

  useEffect(() => {
    if (isOpen && playerId) {
      setActiveTab('overview')
      fetchPlayer()
    }
  }, [isOpen, playerId, fetchPlayer])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs = isNfl
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'gamelog', label: 'Game Log' },
      ]
    : [
        { id: 'overview', label: 'Overview' },
        { id: 'results', label: 'Results' },
        { id: 'schedule', label: 'Schedule' },
        { id: 'sg', label: 'Strokes Gained' },
      ]

  const formatStat = (value, prefix = '') => {
    if (value == null) return '\u2014'
    if (prefix === '+') return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
    return typeof value === 'number' ? value.toFixed(2) : value
  }

  const getStatColor = (value) => {
    if (value == null) return 'text-text-muted'
    if (value > 0.5) return 'text-emerald-400'
    if (value > 0) return 'text-text-primary'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatPosition = (pos, tied) => {
    if (!pos) return '\u2014'
    const prefix = tied ? 'T' : ''
    return `${prefix}${pos}`
  }

  const getPositionColor = (pos) => {
    if (!pos) return 'text-text-muted'
    if (pos === 1) return 'text-yellow-400'
    if (pos <= 5) return 'text-emerald-400'
    if (pos <= 10) return 'text-emerald-300'
    if (pos <= 25) return 'text-text-primary'
    return 'text-text-secondary'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-dark-primary border-l border-dark-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-dark-primary/80 z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-dark-secondary to-dark-tertiary border-b border-dark-border">
          <div className="flex items-start justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              {player?.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-dark-tertiary flex items-center justify-center text-3xl flex-shrink-0">
                  {player?.countryFlag || '?'}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-bold font-display text-text-primary truncate">{player?.name || 'Loading...'}</h2>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  {isNfl ? (
                    <>
                      {player?.nflPosition && <span className="font-medium text-emerald-400">{player.nflPosition}</span>}
                      {player?.nflTeamAbbr && (
                        <>
                          <span className="text-text-muted">&middot;</span>
                          <span>{player.nflTeamAbbr}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {player?.owgrRank && <span>#{player.owgrRank} OWGR</span>}
                      {player?.primaryTour && (
                        <>
                          <span className="text-text-muted">&middot;</span>
                          <span>{player.primaryTour}</span>
                        </>
                      )}
                      {player?.country && (
                        <>
                          <span className="text-text-muted">&middot;</span>
                          <span>{player.countryFlag} {player.country}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {/* Roster badge */}
                {rosterContext?.isOnRoster && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[11px] font-medium rounded">
                    {rosterContext.position === 'ACTIVE' ? 'Active' : 'Bench'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-dark-tertiary rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Projection quick bar */}
          {projection && (
            <div className="grid grid-cols-4 gap-px bg-dark-border/30 mx-4 mb-3 rounded-lg overflow-hidden">
              <div className="bg-dark-secondary p-2 text-center">
                <p className="text-emerald-400 text-lg font-bold font-display">{projection.projected}</p>
                <p className="text-[10px] text-text-muted uppercase">Proj</p>
              </div>
              <div className="bg-dark-secondary p-2 text-center">
                <p className="text-text-primary text-lg font-bold font-display">{projection.avgFantasyPoints}</p>
                <p className="text-[10px] text-text-muted uppercase">Avg FPts</p>
              </div>
              <div className="bg-dark-secondary p-2 text-center">
                <p className={`text-lg font-bold ${projection.trend > 0 ? 'text-emerald-400' : projection.trend < 0 ? 'text-red-400' : 'text-text-primary'}`}>
                  {projection.trend > 0 ? '+' : ''}{projection.trend}%
                </p>
                <p className="text-[10px] text-text-muted uppercase">Trend</p>
              </div>
              <div className="bg-dark-secondary p-2 text-center">
                <p className="text-text-primary text-lg font-bold font-display">{projection.consistency}</p>
                <p className="text-[10px] text-text-muted uppercase">Consist</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-text-muted hover:text-text-primary border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!player ? null : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-4 space-y-4">
                  {/* Projection detail card */}
                  {projection && (
                    <div className="bg-dark-secondary rounded-lg border border-dark-border p-3">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Fantasy Projection</h3>
                      <div className="space-y-3">
                        {/* Range bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                            <span>Floor: {projection.floor}</span>
                            <span>Ceiling: {projection.ceiling}</span>
                          </div>
                          <div className="h-3 bg-dark-tertiary rounded-full relative overflow-hidden">
                            {projection.ceiling > 0 && (
                              <>
                                <div
                                  className="absolute h-full bg-emerald-500/20 rounded-full"
                                  style={{
                                    left: `${(projection.floor / projection.ceiling) * 100}%`,
                                    width: `${100 - (projection.floor / projection.ceiling) * 100}%`,
                                  }}
                                />
                                <div
                                  className="absolute h-full w-1 bg-emerald-400 rounded-full"
                                  style={{ left: `${(projection.projected / projection.ceiling) * 100}%` }}
                                />
                              </>
                            )}
                          </div>
                          <p className="text-center text-sm font-bold text-emerald-400 mt-1">
                            Projected: {projection.projected} pts
                          </p>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-dark-tertiary/50 rounded p-2">
                            <p className="text-text-primary text-sm font-bold">{projection.totalEvents}</p>
                            <p className="text-[10px] text-text-muted">Events</p>
                          </div>
                          <div className="bg-dark-tertiary/50 rounded p-2">
                            <p className="text-text-primary text-sm font-bold">{projection.recentAvg}</p>
                            <p className="text-[10px] text-text-muted">Recent Avg</p>
                          </div>
                          <div className="bg-dark-tertiary/50 rounded p-2">
                            <p className={`text-sm font-bold ${projection.trend > 0 ? 'text-emerald-400' : projection.trend < 0 ? 'text-red-400' : 'text-text-primary'}`}>
                              {projection.trend > 0 ? '\u2191' : projection.trend < 0 ? '\u2193' : '\u2192'} {Math.abs(projection.trend)}%
                            </p>
                            <p className="text-[10px] text-text-muted">Trend</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  {isNfl ? (
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="Position" value={player.nflPosition || '\u2014'} color="text-emerald-400" />
                      <StatCard label="Team" value={player.nflTeamAbbr || '\u2014'} color="text-text-primary" />
                      <StatCard label="Games" value={player.gamesPlayed || 0} color="text-text-primary" />
                      <StatCard label="Fantasy Pts" value={player.fantasyPtsHalf?.toFixed(1) || player.seasonFantasyPts?.toFixed(1) || '\u2014'} color="text-emerald-400" />
                      <StatCard label="Pts/Game" value={player.fantasyPtsPerGame?.toFixed(1) || '\u2014'} color="text-text-primary" />
                      <StatCard label="Status" value={player.injuryStatus || 'Active'} color={player.injuryStatus ? 'text-red-400' : 'text-emerald-400'} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="SG: Total" value={formatStat(player.sgTotal, '+')} color={getStatColor(player.sgTotal)} />
                      <StatCard label="Avg Score" value={player.avgScore?.toFixed(1) || '\u2014'} color="text-text-primary" />
                      <StatCard label="Wins" value={player.wins || 0} color={player.wins > 0 ? 'text-yellow-400' : 'text-text-primary'} />
                      <StatCard label="Top 10s" value={player.top10s || 0} color="text-text-primary" />
                      <StatCard label="Cuts Made" value={player.cutsMade || 0} color="text-text-primary" />
                      <StatCard label="Earnings" value={player.earnings > 0 ? `$${(player.earnings / 1e6).toFixed(1)}M` : '\u2014'} color="text-emerald-400" />
                    </div>
                  )}

                  {/* SG Summary (golf only) */}
                  {!isNfl && (
                    <div className="bg-dark-secondary rounded-lg border border-dark-border p-3">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Strokes Gained Summary</h3>
                      <div className="space-y-2">
                        <SGBar label="Off the Tee" value={player.sgOffTee} />
                        <SGBar label="Approach" value={player.sgApproach} />
                        <SGBar label="Around Green" value={player.sgAroundGreen} />
                        <SGBar label="Putting" value={player.sgPutting} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 'results' && (
                <div className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Recent Tournaments</h3>
                  {(player.performances || []).length === 0 ? (
                    <div className="text-center py-8 text-text-muted">No tournament results yet</div>
                  ) : (
                    player.performances.map((perf) => (
                      <div key={perf.id} className="bg-dark-secondary rounded-lg border border-dark-border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-text-primary font-semibold text-sm truncate pr-2">{perf.tournament?.name}</p>
                          <span className={`text-lg font-bold flex-shrink-0 ${getPositionColor(perf.position)}`}>
                            {formatPosition(perf.position, perf.positionTied)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>{perf.tournament?.startDate ? formatDate(perf.tournament.startDate) : ''}</span>
                          <div className="flex items-center gap-3">
                            {perf.totalToPar != null && (
                              <span className={perf.totalToPar < 0 ? 'text-emerald-400' : perf.totalToPar > 0 ? 'text-red-400' : 'text-text-primary'}>
                                {perf.totalToPar > 0 ? '+' : ''}{perf.totalToPar}
                              </span>
                            )}
                            <span className="text-emerald-400 font-medium">{(perf.fantasyPoints || 0).toFixed(1)} pts</span>
                          </div>
                        </div>
                        {/* Round scores */}
                        <div className="flex items-center gap-2 mt-2">
                          {[perf.round1, perf.round2, perf.round3, perf.round4].map((r, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded ${
                              r == null ? 'text-text-muted/30' :
                              r < 70 ? 'bg-emerald-500/15 text-emerald-400' :
                              r <= 72 ? 'bg-dark-tertiary text-text-primary' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {r != null ? r : '\u2013'}
                            </span>
                          ))}
                          {perf.status === 'CUT' && (
                            <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">CUT</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="p-4 space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Upcoming Tournaments</h3>
                  {upcoming.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <svg className="w-10 h-10 mx-auto mb-2 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      No upcoming tournaments scheduled
                    </div>
                  ) : (
                    upcoming.map((t) => (
                      <div key={t.id} className="bg-dark-secondary rounded-lg border border-dark-border p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-text-primary font-semibold text-sm truncate">{t.name}</p>
                              {t.isMajor && (
                                <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded flex-shrink-0">MAJOR</span>
                              )}
                            </div>
                            {t.location && <p className="text-text-muted text-xs mt-0.5">{t.location}</p>}
                          </div>
                          {t.tour && (
                            <span className="text-[10px] font-medium text-text-muted bg-dark-tertiary px-1.5 py-0.5 rounded flex-shrink-0">{t.tour}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                          <span>{formatDate(t.startDate)} - {formatDate(t.endDate)}</span>
                          {t.purse > 0 && <span className="text-emerald-400">${(t.purse / 1e6).toFixed(1)}M</span>}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Past event summary */}
                  {player && player.performances?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 mt-6">Season Summary</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-dark-secondary rounded-lg p-3 text-center border border-dark-border">
                          <p className="text-text-primary font-bold text-lg">{player.performances.length}</p>
                          <p className="text-[10px] text-text-muted uppercase">Events</p>
                        </div>
                        <div className="bg-dark-secondary rounded-lg p-3 text-center border border-dark-border">
                          <p className="text-text-primary font-bold text-lg">
                            {player.performances.filter(p => p.status !== 'CUT').length}
                          </p>
                          <p className="text-[10px] text-text-muted uppercase">Cuts Made</p>
                        </div>
                        <div className="bg-dark-secondary rounded-lg p-3 text-center border border-dark-border">
                          <p className="text-emerald-400 font-bold text-lg">
                            {Math.min(...player.performances.filter(p => p.position).map(p => p.position)) || '\u2014'}
                          </p>
                          <p className="text-[10px] text-text-muted uppercase">Best Finish</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Game Log Tab (NFL) */}
              {activeTab === 'gamelog' && (
                <div className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">2024 Game Log</h3>
                  {(player.gameLog || []).length === 0 ? (
                    <div className="text-center py-8 text-text-muted">No game data available</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-2 text-[10px] text-text-muted uppercase tracking-wider">
                        <div className="w-8">Wk</div>
                        <div className="flex-1">Opp</div>
                        <div className="w-16 text-right">Half PPR</div>
                      </div>
                      {player.gameLog.map((g) => (
                        <div key={g.week} className="flex items-center gap-2 py-2 px-2 rounded-lg bg-dark-secondary/50">
                          <div className="w-8 text-sm text-text-muted">{g.week}</div>
                          <div className="flex-1 text-sm text-text-primary">
                            {g.isHome ? 'vs' : '@'} {g.opponent}
                          </div>
                          <div className="w-16 text-right text-sm font-bold text-emerald-400">
                            {g.fantasyPts?.half_ppr?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Strokes Gained Tab */}
              {activeTab === 'sg' && (
                <div className="p-4 space-y-4">
                  <p className="text-text-secondary text-xs">
                    Strokes Gained measures performance relative to the field average. Positive = better than average.
                  </p>

                  {[
                    { label: 'SG: Total', value: player.sgTotal, desc: 'Overall performance' },
                    { label: 'SG: Off-the-Tee', value: player.sgOffTee, desc: 'Tee shot performance' },
                    { label: 'SG: Approach', value: player.sgApproach, desc: 'Approach shot quality' },
                    { label: 'SG: Around-the-Green', value: player.sgAroundGreen, desc: 'Short game' },
                    { label: 'SG: Putting', value: player.sgPutting, desc: 'Putting efficiency' },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-dark-secondary rounded-lg border border-dark-border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-text-primary font-medium text-sm">{stat.label}</p>
                          <p className="text-text-muted text-[11px]">{stat.desc}</p>
                        </div>
                        <p className={`text-xl font-bold ${getStatColor(stat.value)}`}>
                          {formatStat(stat.value, '+')}
                        </p>
                      </div>
                      <div className="h-1.5 bg-dark-tertiary rounded-full overflow-hidden relative">
                        {stat.value != null && (
                          <div
                            className={`absolute h-full rounded-full transition-all duration-500 ${
                              stat.value >= 0 ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                            style={{
                              left: stat.value >= 0 ? '50%' : `${50 - Math.min(Math.abs(stat.value) * 20, 50)}%`,
                              width: `${Math.min(Math.abs(stat.value) * 20, 50)}%`,
                            }}
                          />
                        )}
                        {/* Center line */}
                        <div className="absolute left-1/2 top-0 w-px h-full bg-dark-border/30" />
                      </div>
                    </div>
                  ))}

                  {/* Tee-to-Green combined */}
                  <div className="bg-dark-secondary rounded-lg border border-emerald-500/20 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-text-primary font-medium text-sm">SG: Tee-to-Green</p>
                        <p className="text-text-muted text-[11px]">Combined ball-striking</p>
                      </div>
                      <p className={`text-xl font-bold ${getStatColor(
                        (player.sgOffTee || 0) + (player.sgApproach || 0) + (player.sgAroundGreen || 0)
                      )}`}>
                        {formatStat(
                          (player.sgOffTee || 0) + (player.sgApproach || 0) + (player.sgAroundGreen || 0),
                          '+'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {player && rosterContext && (
          <div className="flex-shrink-0 border-t border-dark-border bg-dark-secondary p-3 flex gap-2">
            {rosterContext.isOnRoster ? (
              <>
                {rosterContext.onMovePosition && (
                  <button
                    onClick={() => {
                      rosterContext.onMovePosition(player.id, rosterContext.position === 'ACTIVE' ? 'BENCH' : 'ACTIVE')
                      onClose()
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-dark-tertiary text-text-primary hover:bg-dark-border transition-colors"
                  >
                    Move to {rosterContext.position === 'ACTIVE' ? 'Bench' : 'Active'}
                  </button>
                )}
                {rosterContext.onDrop && (
                  <button
                    onClick={() => {
                      rosterContext.onDrop(player.id)
                      onClose()
                    }}
                    className="py-2.5 px-4 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Drop
                  </button>
                )}
              </>
            ) : rosterContext.onAdd ? (
              <button
                onClick={() => {
                  rosterContext.onAdd(player)
                  onClose()
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 text-text-primary hover:bg-emerald-600 transition-colors"
              >
                Add to Roster
              </button>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}

/** Small stat card */
const StatCard = ({ label, value, color = 'text-text-primary' }) => (
  <div className="bg-dark-secondary rounded-lg border border-dark-border p-3 text-center">
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-text-muted uppercase">{label}</p>
  </div>
)

/** Inline SG bar */
const SGBar = ({ label, value }) => {
  const color = value == null ? 'text-text-muted' : value > 0.5 ? 'text-emerald-400' : value > 0 ? 'text-text-primary' : value > -0.5 ? 'text-yellow-400' : 'text-red-400'
  const barColor = value == null ? '' : value >= 0 ? 'bg-emerald-400' : 'bg-red-400'
  const width = value != null ? Math.min(Math.abs(value) * 30, 50) : 0

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-dark-tertiary rounded-full relative">
        {value != null && (
          <div
            className={`absolute h-full rounded-full ${barColor}`}
            style={{
              left: value >= 0 ? '50%' : `${50 - width}%`,
              width: `${width}%`,
            }}
          />
        )}
        <div className="absolute left-1/2 top-0 w-px h-full bg-dark-border/20" />
      </div>
      <span className={`text-xs font-medium w-12 text-right ${color}`}>
        {value != null ? (value > 0 ? '+' : '') + value.toFixed(2) : '\u2014'}
      </span>
    </div>
  )
}

export default PlayerDrawer
