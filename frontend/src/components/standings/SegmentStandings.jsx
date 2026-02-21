import { useState, useEffect } from 'react'
import Card from '../common/Card'
import api from '../../services/api'

const SEGMENT_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
]

const SEGMENT_LABELS = ['Q1', 'Q2', 'Q3', 'Q4']

const SegmentStandings = ({ leagueId }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overall')

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    api.getSegmentStandings(leagueId)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [leagueId])

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      </Card>
    )
  }

  if (!data || !data.segments || data.segments.length === 0) return null

  const tabs = [
    { id: 'overall', label: 'Overall' },
    ...data.segments.map((seg, i) => ({
      id: `seg-${seg.segmentNumber}`,
      label: SEGMENT_LABELS[i] || `S${seg.segmentNumber}`,
    })),
  ]

  // Build overall standings with bonus column
  const overallStandings = (() => {
    if (!data.segments[0]?.standings) return []
    const teamMap = new Map()
    for (const seg of data.segments) {
      for (const s of seg.standings) {
        if (!teamMap.has(s.teamId)) {
          teamMap.set(s.teamId, {
            teamId: s.teamId,
            teamName: s.teamName,
            userName: s.userName,
            userAvatar: s.userAvatar,
            totalPoints: 0,
            bonus: 0,
            segmentWins: 0,
          })
        }
        const entry = teamMap.get(s.teamId)
        entry.totalPoints += s.segmentPoints
      }
    }
    // Add bonus for segment wins
    for (const seg of data.segments) {
      if (seg.bonusAwarded && seg.standings[0]) {
        const entry = teamMap.get(seg.standings[0].teamId)
        if (entry) {
          entry.bonus += data.segmentBonus
          entry.segmentWins++
        }
      }
    }
    const arr = Array.from(teamMap.values())
    arr.sort((a, b) => (b.totalPoints + b.bonus) - (a.totalPoints + a.bonus))
    arr.forEach((s, i) => { s.rank = i + 1 })
    return arr
  })()

  const activeSeg = data.segments.find(s => activeTab === `seg-${s.segmentNumber}`)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-text-primary">Segment Standings</h3>
        <span className="text-xs text-text-muted font-mono">
          +{data.segmentBonus} pts per segment win
        </span>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.id
          const color = i === 0 ? null : SEGMENT_COLORS[(i - 1) % SEGMENT_COLORS.length]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? (color ? color.badge : 'bg-gold/20 text-gold')
                  : 'text-text-muted hover:text-text-primary hover:bg-dark-tertiary'
              }`}
            >
              {tab.label}
              {/* Active segment indicator */}
              {i > 0 && data.segments[i - 1]?.isActive && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              )}
            </button>
          )
        })}
      </div>

      {/* Overall Tab */}
      {activeTab === 'overall' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-dark-border">
                <th className="text-left pb-2 pr-2">#</th>
                <th className="text-left pb-2">Team</th>
                <th className="text-right pb-2">Points</th>
                <th className="text-right pb-2">Bonus</th>
                <th className="text-right pb-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {overallStandings.map((s) => (
                <tr key={s.teamId} className="border-b border-dark-border/50">
                  <td className="py-2 pr-2 font-mono text-text-muted">{s.rank}</td>
                  <td className="py-2">
                    <span className="text-text-primary font-medium">{s.teamName}</span>
                    {s.userName && (
                      <span className="text-text-muted text-xs ml-2">{s.userName}</span>
                    )}
                    {s.segmentWins > 0 && (
                      <span className="ml-2 text-amber-400 text-xs" title={`${s.segmentWins} segment win${s.segmentWins !== 1 ? 's' : ''}`}>
                        {'\uD83C\uDFC6'.repeat(s.segmentWins)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono text-text-secondary">{s.totalPoints.toFixed(1)}</td>
                  <td className="py-2 text-right font-mono text-gold">{s.bonus > 0 ? `+${s.bonus}` : '-'}</td>
                  <td className="py-2 text-right font-mono font-semibold text-text-primary">
                    {(s.totalPoints + s.bonus).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Segment Tab */}
      {activeSeg && (() => {
        const segIdx = activeSeg.segmentNumber - 1
        const color = SEGMENT_COLORS[segIdx % SEGMENT_COLORS.length]
        return (
          <div>
            <div className="flex items-center gap-3 mb-3 text-xs text-text-muted">
              <span>Weeks {activeSeg.startWeekNumber}–{activeSeg.endWeekNumber}</span>
              <span>{activeSeg.completedWeeks}/{activeSeg.weekCount} completed</span>
              {activeSeg.isActive && (
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  In Progress
                </span>
              )}
              {activeSeg.isComplete && (
                <span className="text-text-secondary">Complete</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-dark-border">
                    <th className="text-left pb-2 pr-2">#</th>
                    <th className="text-left pb-2">Team</th>
                    <th className="text-right pb-2">Points</th>
                    <th className="text-right pb-2">Best Week</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSeg.standings.map((s, i) => {
                    const isWinner = i === 0 && activeSeg.bonusAwarded
                    return (
                      <tr
                        key={s.teamId}
                        className={`border-b border-dark-border/50 ${isWinner ? color.bg : ''}`}
                      >
                        <td className="py-2 pr-2 font-mono text-text-muted">{s.rank}</td>
                        <td className="py-2">
                          <span className={`font-medium ${isWinner ? color.text : 'text-text-primary'}`}>
                            {s.teamName}
                          </span>
                          {s.userName && (
                            <span className="text-text-muted text-xs ml-2">{s.userName}</span>
                          )}
                          {isWinner && (
                            <span className="ml-2 text-amber-400 text-xs" title="Segment winner">{'\uD83C\uDFC6'}</span>
                          )}
                        </td>
                        <td className={`py-2 text-right font-mono ${isWinner ? color.text + ' font-semibold' : 'text-text-secondary'}`}>
                          {s.segmentPoints.toFixed(1)}
                        </td>
                        <td className="py-2 text-right font-mono text-text-muted">
                          {s.bestWeek > 0 ? s.bestWeek.toFixed(1) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </Card>
  )
}

export default SegmentStandings
