import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { formatDateRange } from '../utils/dateUtils'
import { computePowerScore } from '../utils/clutchMetrics'
import SgRadarChart from '../components/players/SgRadarChart'

const TournamentRecap = () => {
  const { tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getTournament(tournamentId).catch(() => ({ tournament: null })),
      api.getTournamentLeaderboard(tournamentId).catch(() => ({ leaderboard: [] })),
    ]).then(([tData, lbData]) => {
      setTournament(tData?.tournament || null)
      setLeaderboard(lbData?.leaderboard || [])
    }).finally(() => setLoading(false))
  }, [tournamentId])

  // Power-rank the full field
  const { powerRanked, winner, actualTop10, clutchTop10, matches, metricCards, bestCalls, worstCalls } = useMemo(() => {
    if (!leaderboard.length) return { powerRanked: [], winner: null, actualTop10: [], clutchTop10: [], matches: 0, metricCards: [], bestCalls: [], worstCalls: [] }

    // Compute power scores
    const ranked = leaderboard
      .map(e => ({ ...e, _powerScore: computePowerScore(e) }))
      .filter(e => e._powerScore != null)
      .sort((a, b) => b._powerScore - a._powerScore)
      .map((e, i) => ({ ...e, _powerRank: i + 1 }))

    const w = leaderboard.find(e => e.position === 1) || leaderboard[0]

    // Actual top 10 by position
    const aTop10 = leaderboard.filter(e => e.position && e.position <= 10).slice(0, 10)
    const aTop10Ids = new Set(aTop10.map(e => e.player?.id))

    // Clutch top 10 by power rank
    const cTop10 = ranked.slice(0, 10)
    const cTop10Ids = new Set(cTop10.map(e => e.player?.id))

    // Matches
    const m = [...aTop10Ids].filter(id => cTop10Ids.has(id)).length

    // Metric report cards
    const metrics = [
      { key: 'cpi', label: 'CPI', getter: e => e.clutchMetrics?.cpi },
      { key: 'formScore', label: 'Form', getter: e => e.clutchMetrics?.formScore },
      { key: 'courseFitScore', label: 'Course Fit', getter: e => e.clutchMetrics?.courseFitScore },
    ]
    const fieldWithPos = leaderboard.filter(e => e.position && e.position > 0)
    const fieldAvgFinish = fieldWithPos.length > 0 ? fieldWithPos.reduce((s, e) => s + e.position, 0) / fieldWithPos.length : 0
    const mc = metrics.map(({ key, label, getter }) => {
      const withMetric = leaderboard.filter(e => getter(e) != null && e.position > 0)
      if (withMetric.length < 10) return null
      const top10 = [...withMetric].sort((a, b) => (getter(b) || 0) - (getter(a) || 0)).slice(0, 10)
      const avgFinish = top10.reduce((s, e) => s + e.position, 0) / top10.length
      return { key, label, avgFinish: Math.round(avgFinish), fieldAvg: Math.round(fieldAvgFinish), beat: avgFinish < fieldAvgFinish }
    }).filter(Boolean)

    // Best & worst calls (delta = powerRank - actualPosition)
    const withBoth = ranked.filter(e => e.position && e.position > 0)
    const deltas = withBoth.map(e => ({
      ...e,
      _delta: e._powerRank - e.position, // negative = predicted high, finished low
    }))
    const best = [...deltas].sort((a, b) => a._delta - b._delta).slice(0, 3) // biggest negative = predicted low, finished high
    const worst = [...deltas].sort((a, b) => b._delta - a._delta).slice(0, 3) // biggest positive = predicted high, finished low

    return { powerRanked: ranked, winner: w, actualTop10: aTop10, clutchTop10: cTop10, matches: m, metricCards: mc, bestCalls: best, worstCalls: worst }
  }, [leaderboard])

  if (loading) {
    return (
      <div className="min-h-screen pt-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-48 bg-[var(--stone)] rounded-xl animate-pulse mb-6" />
          <div className="h-32 bg-[var(--stone)] rounded-xl animate-pulse mb-6" />
          <div className="h-32 bg-[var(--stone)] rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen pt-12 px-4 text-center">
        <p className="text-text-muted">Tournament not found.</p>
        <Link to="/golf" className="text-emerald-400 text-sm mt-2 inline-block">Back to Golf Hub</Link>
      </div>
    )
  }

  const formatToPar = (val) => {
    if (val == null) return '—'
    return val > 0 ? `+${val}` : val === 0 ? 'E' : `${val}`
  }

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Winner Spotlight */}
          <div className="mb-8 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--card-border)] bg-gradient-to-r from-gold/5 to-transparent">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Tournament Recap</p>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-text-primary mt-1">{tournament.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-text-muted font-mono">
                {tournament.course && <span>{tournament.course.nickname || tournament.course.name}</span>}
                <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
              </div>
            </div>

            {winner && (
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex flex-col items-center text-center sm:text-left sm:items-start gap-2 flex-1">
                    <p className="text-[10px] font-mono text-gold uppercase tracking-wider font-bold">Champion</p>
                    <div className="flex items-center gap-4">
                      {winner.player?.headshotUrl ? (
                        <img src={winner.player.headshotUrl} alt="" className="w-16 h-16 rounded-full object-cover bg-[var(--stone)] border-2 border-gold/30" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[var(--stone)] flex items-center justify-center text-2xl border-2 border-gold/30">
                          {winner.player?.countryFlag || '?'}
                        </div>
                      )}
                      <div>
                        <Link to={`/players/${winner.player?.id}`} className="text-lg font-display font-bold text-text-primary hover:text-gold transition-colors">
                          {winner.player?.name}
                        </Link>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`font-mono text-sm font-bold ${(winner.totalToPar ?? 0) < 0 ? 'text-emerald-400' : 'text-text-secondary'}`}>
                            {formatToPar(winner.totalToPar)}
                          </span>
                          {winner.totalScore && (
                            <span className="font-mono text-xs text-text-muted">({winner.totalScore})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Winner SG Radar */}
                  {(winner.sgTotal != null || winner.sgOffTee != null) && (
                    <div className="shrink-0">
                      <SgRadarChart
                        players={[{
                          id: winner.player?.id,
                          name: winner.player?.name,
                          sgTotal: winner.sgTotal,
                          sgOffTee: winner.sgOffTee,
                          sgApproach: winner.sgApproach,
                          sgAroundGreen: winner.sgAroundGreen,
                          sgPutting: winner.sgPutting,
                        }]}
                        size={200}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Our Predictions vs Reality */}
          {clutchTop10.length > 0 && actualTop10.length > 0 && (
            <div className="mb-8 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--card-border)]">
                <h2 className="text-sm font-bold text-text-primary">Our Top 10 vs Reality</h2>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {matches} of 10 predicted players finished in the actual top 10
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--card-border)]">
                {/* Clutch Top 10 */}
                <div className="p-4">
                  <p className="text-[10px] font-mono text-gold uppercase tracking-wider font-bold mb-3">Clutch Power Rank</p>
                  <div className="space-y-1.5">
                    {clutchTop10.map((entry, i) => {
                      const inActual = actualTop10.some(a => a.player?.id === entry.player?.id)
                      return (
                        <div key={entry.player?.id || i} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-text-muted w-4">{i + 1}.</span>
                          {entry.player?.headshotUrl ? (
                            <img src={entry.player.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-[var(--stone)]" />
                          ) : (
                            <span className="text-xs w-5 text-center">{entry.player?.countryFlag || '?'}</span>
                          )}
                          <span className="text-xs text-text-primary truncate flex-1">{entry.player?.name}</span>
                          {inActual && (
                            <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Actual Top 10 */}
                <div className="p-4">
                  <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold mb-3">Actual Results</p>
                  <div className="space-y-1.5">
                    {actualTop10.map((entry, i) => {
                      const inClutch = clutchTop10.some(c => c.player?.id === entry.player?.id)
                      return (
                        <div key={entry.player?.id || i} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-text-muted w-4">
                            {entry.positionTied ? `T${entry.position}` : entry.position}
                          </span>
                          {entry.player?.headshotUrl ? (
                            <img src={entry.player.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-[var(--stone)]" />
                          ) : (
                            <span className="text-xs w-5 text-center">{entry.player?.countryFlag || '?'}</span>
                          )}
                          <span className="text-xs text-text-primary truncate flex-1">{entry.player?.name}</span>
                          {inClutch && (
                            <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metric Report Cards */}
          {metricCards.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-text-primary mb-3">Metric Report Card</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {metricCards.map(card => (
                  <div key={card.key} className={`rounded-xl border bg-[var(--surface)] shadow-card p-4 ${card.beat ? 'border-emerald-500/20' : 'border-red-400/20'}`}>
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">{card.label}</p>
                    <div className="flex items-end gap-2">
                      <span className={`text-2xl font-display font-bold ${card.beat ? 'text-emerald-400' : 'text-red-400'}`}>
                        {card.avgFinish}<span className="text-xs text-text-muted font-normal">th</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">
                      Top 10 by {card.label} avg finish vs field avg of {card.fieldAvg}th
                    </p>
                    <div className="mt-2 h-1.5 bg-[var(--stone)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${card.beat ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.max(10, Math.min(100, (1 - card.avgFinish / card.fieldAvg) * 100 + 50))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best & Worst Calls */}
          {(bestCalls.length > 0 || worstCalls.length > 0) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {/* Best calls — predicted low rank, finished high position */}
              {bestCalls.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-[var(--surface)] shadow-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--card-border)] bg-gradient-to-r from-emerald-500/5 to-transparent">
                    <h3 className="text-sm font-bold text-emerald-400">Best Calls</h3>
                    <p className="text-[10px] text-text-muted">Underrated by our rankings, outperformed on course</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {bestCalls.map((entry, i) => (
                      <div key={entry.player?.id || i} className="flex items-center gap-3">
                        {entry.player?.headshotUrl ? (
                          <img src={entry.player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--stone)]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--stone)] flex items-center justify-center text-sm">
                            {entry.player?.countryFlag || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{entry.player?.name}</p>
                          <p className="text-[10px] text-text-muted">
                            Ranked #{entry._powerRank} → Finished {entry.positionTied ? 'T' : ''}{entry.position}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                          +{Math.abs(entry._delta)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Worst calls — predicted high rank, finished low */}
              {worstCalls.length > 0 && (
                <div className="rounded-xl border border-red-400/20 bg-[var(--surface)] shadow-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--card-border)] bg-gradient-to-r from-red-500/5 to-transparent">
                    <h3 className="text-sm font-bold text-red-400">Missed Calls</h3>
                    <p className="text-[10px] text-text-muted">Overrated by our rankings, underperformed on course</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {worstCalls.map((entry, i) => (
                      <div key={entry.player?.id || i} className="flex items-center gap-3">
                        {entry.player?.headshotUrl ? (
                          <img src={entry.player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--stone)]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--stone)] flex items-center justify-center text-sm">
                            {entry.player?.countryFlag || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{entry.player?.name}</p>
                          <p className="text-[10px] text-text-muted">
                            Ranked #{entry._powerRank} → Finished {entry.positionTied ? 'T' : ''}{entry.position}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-red-400 shrink-0">
                          -{Math.abs(entry._delta)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
            <Link to="/golf" className="text-sm text-text-muted hover:text-text-primary transition-colors">
              ← Back to Golf Hub
            </Link>
            <Link to={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              View Full Leaderboard →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default TournamentRecap
