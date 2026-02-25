import { useMemo } from 'react'
import Card from '../common/Card'
import SgRadarChart from '../players/SgRadarChart'

const PlayerStats = ({ player, clutchMetrics, selectedYear, performances }) => {
  if (!player) return null

  const { stats } = player

  const formatSG = (value) => {
    if (typeof value !== 'number') return '\u2014'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2)}`
  }

  const getSGColor = (value) => {
    if (typeof value !== 'number') return 'text-text-muted'
    if (value > 0.5) return 'text-gold'
    if (value > 0) return 'text-green-400'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const sgStats = stats ? [
    { label: 'Total', value: stats.sgTotal, color: 'text-gold' },
    { label: 'Off the Tee', value: stats.sgOffTee },
    { label: 'Approach', value: stats.sgApproach },
    { label: 'Around Green', value: stats.sgAroundGreen },
    { label: 'Putting', value: stats.sgPutting },
  ] : []

  const seasonStats = [
    { label: 'Events', value: player.events || 0 },
    { label: 'Wins', value: player.wins || 0 },
    { label: 'Top 5s', value: player.top5s || 0 },
    { label: 'Top 10s', value: player.top10s || 0 },
    { label: 'Cuts Made', value: player.cutsMade || 0 },
    ...(player.earnings > 0 ? [{ label: 'Earnings', value: `$${(player.earnings / 1e6).toFixed(2)}M` }] : []),
  ]

  const hasSeasonData = player.events > 0

  const formatRankValue = (val) => val != null ? `#${val}` : '\u2014'

  // Compute season SG averages from performances for radar chart
  const currentYear = typeof selectedYear === 'number' ? selectedYear : new Date().getFullYear()
  const seasonSgAvg = useMemo(() => {
    const perfs = (performances || []).filter(p => {
      if (p.sgTotal == null) return false
      const date = p.tournament?.startDate
      if (!date) return true
      return new Date(date).getFullYear() === currentYear
    })
    if (perfs.length === 0) return null
    const avg = (key) => {
      const vals = perfs.filter(p => p[key] != null).map(p => p[key])
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    return {
      sgTotal: avg('sgTotal'),
      sgOffTee: avg('sgOffTee'),
      sgApproach: avg('sgApproach'),
      sgAroundGreen: avg('sgAroundGreen'),
      sgPutting: avg('sgPutting'),
      events: perfs.length,
    }
  }, [performances, currentYear])

  // Radar chart: career vs season
  const hasCareerSg = player.sgTotal != null || stats?.sgTotal != null
  const radarPlayers = useMemo(() => {
    const career = {
      id: 'career',
      label: 'Career',
      sgTotal: player.sgTotal ?? stats?.sgTotal,
      sgOffTee: player.sgOffTee ?? stats?.sgOffTee,
      sgApproach: player.sgApproach ?? stats?.sgApproach,
      sgAroundGreen: player.sgAroundGreen ?? stats?.sgAroundGreen,
      sgPutting: player.sgPutting ?? stats?.sgPutting,
    }
    if (!seasonSgAvg || seasonSgAvg.sgTotal == null) return [career]
    const season = {
      id: 'season',
      label: `${currentYear} Season`,
      events: seasonSgAvg.events,
      ...seasonSgAvg,
    }
    return [career, season]
  }, [player, stats, seasonSgAvg, currentYear])

  // Clutch metric helpers
  const getCPIColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v > 1.5) return 'text-gold'
    if (v > 0.5) return 'text-green-400'
    if (v > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }
  const getFormColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v >= 80) return 'text-orange'
    if (v >= 60) return 'text-yellow-400'
    if (v >= 40) return 'text-blue-400'
    return 'text-blue-300'
  }
  const getFormLabel = (v) => {
    if (v == null) return '\u2014'
    if (v >= 80) return 'Hot'
    if (v >= 60) return 'Warm'
    if (v >= 40) return 'Cool'
    return 'Cold'
  }
  const getPressureColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v > 0.5) return 'text-gold'
    if (v > -0.5) return 'text-text-secondary'
    return 'text-red-400'
  }
  const getPressureLabel = (v) => {
    if (v == null) return '\u2014'
    if (v > 0.5) return 'Clutch'
    if (v > -0.5) return 'Steady'
    return 'Fades'
  }
  const getFitColor = (v) => {
    if (v == null) return 'text-text-muted'
    if (v >= 85) return 'text-gold'
    if (v >= 70) return 'text-green-400'
    if (v >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }
  const getFitLabel = (v) => {
    if (v == null) return null
    if (v >= 85) return 'Elite Fit'
    if (v >= 70) return 'Strong Fit'
    if (v >= 50) return 'Neutral'
    return 'Poor Fit'
  }

  const hasClutchMetrics = clutchMetrics && (clutchMetrics.cpi != null || clutchMetrics.formScore != null || clutchMetrics.pressureScore != null)

  return (
    <div className="space-y-4">
      {/* Clutch Scores */}
      {hasClutchMetrics && (
        <Card>
          <h4 className="text-sm font-semibold text-text-muted mb-3">Clutch Scores</h4>
          <div className="space-y-3">
            {clutchMetrics.cpi != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">CPI</span>
                  <span className="text-text-muted text-xs ml-1">(Performance Index)</span>
                </div>
                <span className={`font-mono font-bold text-lg ${getCPIColor(clutchMetrics.cpi)}`}>
                  {clutchMetrics.cpi > 0 ? '+' : ''}{clutchMetrics.cpi.toFixed(2)}
                </span>
              </div>
            )}
            {clutchMetrics.formScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Form</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getFormColor(clutchMetrics.formScore)} bg-[var(--bg-alt)]`}>
                    {getFormLabel(clutchMetrics.formScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getFormColor(clutchMetrics.formScore)}`}>
                  {Math.round(clutchMetrics.formScore)}
                </span>
              </div>
            )}
            {clutchMetrics.pressureScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Pressure</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getPressureColor(clutchMetrics.pressureScore)} bg-[var(--bg-alt)]`}>
                    {getPressureLabel(clutchMetrics.pressureScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getPressureColor(clutchMetrics.pressureScore)}`}>
                  {clutchMetrics.pressureScore > 0 ? '+' : ''}{clutchMetrics.pressureScore.toFixed(2)}
                </span>
              </div>
            )}
            {clutchMetrics.courseFitScore != null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-text-secondary text-sm">Course Fit</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${getFitColor(clutchMetrics.courseFitScore)} bg-[var(--bg-alt)]`}>
                    {getFitLabel(clutchMetrics.courseFitScore)}
                  </span>
                </div>
                <span className={`font-mono font-bold text-lg ${getFitColor(clutchMetrics.courseFitScore)}`}>
                  {Math.round(clutchMetrics.courseFitScore)}
                </span>
              </div>
            )}
          </div>
          {clutchMetrics.computedAt && (
            <p className="text-[10px] text-text-muted mt-3 text-right">
              Updated {new Date(clutchMetrics.computedAt).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      {/* SG DNA Radar Chart */}
      {hasCareerSg && (
        <Card>
          <h4 className="text-sm font-semibold text-text-muted mb-3">Strokes Gained DNA</h4>
          <SgRadarChart players={radarPlayers} size={280} />
          {/* SG stat rows below radar */}
          {stats && (
            <div className="space-y-2 mt-4 pt-3 border-t border-[var(--card-border)]">
              {sgStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">{stat.label}</span>
                  <span className={`font-semibold ${stat.color || getSGColor(stat.value)}`}>
                    {formatSG(stat.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Season Stats */}
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">
          {selectedYear === 'all' ? 'All Time Stats' : `${selectedYear || new Date().getFullYear()} Stats`}
        </h4>
        {hasSeasonData ? (
          <div className="grid grid-cols-2 gap-3">
            {seasonStats.map((stat) => (
              <div key={stat.label} className="bg-[var(--bg-alt)] rounded-lg p-3 text-center">
                <p className="text-lg font-bold font-display text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No season data available</p>
        )}
      </Card>

      {/* Rankings */}
      <Card>
        <h4 className="text-sm font-semibold text-text-muted mb-3">Rankings</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">OWGR</span>
            <span className="font-semibold text-text-primary">{formatRankValue(player.owgrRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Rank</span>
            <span className="font-semibold text-text-primary">{formatRankValue(player.datagolfRank)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">DataGolf Skill</span>
            <span className="font-semibold text-gold">
              {player.datagolfSkill != null ? player.datagolfSkill.toFixed(2) : '\u2014'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PlayerStats
