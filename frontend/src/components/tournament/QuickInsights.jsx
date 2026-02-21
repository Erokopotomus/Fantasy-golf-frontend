/**
 * QuickInsights — Sidebar card with field analysis highlights
 *
 * Shows: Best Course Fit, Hottest Form, Under the Radar, Course History Kings
 */

import { Link } from 'react-router-dom'

const InsightSection = ({ title, emoji, players }) => {
  if (!players || players.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
        {emoji} {title}
      </p>
      {players.map((p, i) => (
        <Link
          key={p.id || i}
          to={`/players/${p.id}`}
          className="flex items-center justify-between py-1 hover:bg-dark-tertiary/50 -mx-1 px-1 rounded transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-text-muted w-4">{i + 1}.</span>
            {p.headshotUrl ? (
              <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
            ) : (
              <span className="text-xs">{p.countryFlag || '?'}</span>
            )}
            <span className="text-xs font-medium text-text-primary truncate">{p.name}</span>
          </div>
          <span className="text-xs font-mono text-gold ml-2 flex-shrink-0">{p.value}</span>
        </Link>
      ))}
    </div>
  )
}

const QuickInsights = ({ leaderboard = [] }) => {
  if (leaderboard.length === 0) return null

  // Best Course Fit — Top 3 by courseFitScore
  const bestFit = leaderboard
    .filter(p => p.clutchMetrics?.courseFitScore != null)
    .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
    .slice(0, 3)
    .map(p => ({ ...p, value: `${Math.round(p.clutchMetrics.courseFitScore)}` }))

  // Hottest Form — Top 3 by formScore
  const hotForm = leaderboard
    .filter(p => p.clutchMetrics?.formScore != null && p.clutchMetrics.formScore >= 60)
    .sort((a, b) => (b.clutchMetrics.formScore || 0) - (a.clutchMetrics.formScore || 0))
    .slice(0, 3)
    .map(p => ({ ...p, value: `${Math.round(p.clutchMetrics.formScore)}` }))

  // Under the Radar — High course fit (70+) but OWGR 100+ (value plays)
  const underRadar = leaderboard
    .filter(p =>
      p.clutchMetrics?.courseFitScore >= 70 &&
      p.owgrRank != null && p.owgrRank >= 100
    )
    .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
    .slice(0, 3)
    .map(p => ({ ...p, value: `#${p.owgrRank}` }))

  // Course History Kings — Best avgToPar at this venue (min 8 rounds)
  const historyKings = leaderboard
    .filter(p => p.courseHistory?.rounds >= 8 && p.courseHistory?.avgToPar != null)
    .sort((a, b) => (a.courseHistory.avgToPar || 0) - (b.courseHistory.avgToPar || 0))
    .slice(0, 3)
    .map(p => {
      const avg = p.courseHistory.avgToPar
      return { ...p, value: avg > 0 ? `+${avg.toFixed(1)}` : avg === 0 ? 'E' : avg.toFixed(1) }
    })

  const hasInsights = bestFit.length > 0 || hotForm.length > 0 || underRadar.length > 0 || historyKings.length > 0
  if (!hasInsights) return null

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border bg-gradient-to-r from-gold/5 to-transparent">
        <h3 className="text-sm font-bold text-text-primary">Quick Insights</h3>
      </div>
      <div className="p-4 space-y-4">
        <InsightSection title="Best Course Fit" emoji="🎯" players={bestFit} />
        <InsightSection title="Hottest Form" emoji="🔥" players={hotForm} />
        <InsightSection title="Under the Radar" emoji="👀" players={underRadar} />
        <InsightSection title="Course History Kings" emoji="👑" players={historyKings} />
      </div>
    </div>
  )
}

export default QuickInsights
