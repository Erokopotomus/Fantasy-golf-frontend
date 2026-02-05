import { useState } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const PlayerDetailModal = ({ player, onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!isOpen || !player) return null

  const formatStat = (value, prefix = '') => {
    if (value === undefined || value === null) return '—'
    if (prefix === '+') return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
    return value.toFixed(2)
  }

  const getStatColor = (value) => {
    if (value === undefined || value === null) return 'text-text-muted'
    if (value > 0.5) return 'text-accent-green'
    if (value > 0) return 'text-white'
    if (value > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'strokes-gained', label: 'Strokes Gained' },
    { id: 'history', label: 'History' },
    { id: 'insights', label: 'AI Insights' },
  ]

  // Mock course history data
  const courseHistory = [
    { course: 'TPC Sawgrass', events: 5, avgFinish: 'T12', bestFinish: '3rd', avgScore: 70.2 },
    { course: 'Augusta National', events: 4, avgFinish: 'T18', bestFinish: 'T5', avgScore: 71.5 },
    { course: 'Bay Hill Club', events: 6, avgFinish: 'T8', bestFinish: '1st', avgScore: 69.8 },
    { course: 'Valhalla GC', events: 2, avgFinish: 'T22', bestFinish: 'T15', avgScore: 71.2 },
  ]

  // Mock AI insights
  const aiInsights = [
    { type: 'positive', text: `${player.name} has been trending upward, with top-10 finishes in 3 of the last 5 events.` },
    { type: 'neutral', text: `Strong approach play (SG: Approach ${formatStat(player.stats?.sgApproach, '+')}) suggests good performance on courses with demanding approach shots.` },
    { type: 'positive', text: `Course history at TPC Sawgrass is favorable with an average finish of T12 in 5 appearances.` },
    { type: 'warning', text: `Putting has been slightly below average recently. Monitor performance on fast greens.` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-secondary border border-dark-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-up shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-dark-primary rounded-full flex items-center justify-center text-4xl shadow-lg">
              {player.countryFlag}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{player.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-text-secondary">#{player.rank} World Ranking</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary">{player.country}</span>
                {player.owned && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded font-medium">
                      On Your Roster
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-white hover:bg-dark-tertiary rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent-green border-b-2 border-accent-green bg-dark-tertiary/30'
                  : 'text-text-secondary hover:text-white hover:bg-dark-tertiary/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-220px)] p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className={`text-2xl font-bold ${getStatColor(player.stats?.sgTotal)}`}>
                    {formatStat(player.stats?.sgTotal, '+')}
                  </p>
                  <p className="text-text-muted text-sm mt-1">SG: Total</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    {player.stats?.drivingDistance?.toFixed(0) || '—'}
                  </p>
                  <p className="text-text-muted text-sm mt-1">Driving (yds)</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    {player.stats?.gir?.toFixed(1) || '—'}%
                  </p>
                  <p className="text-text-muted text-sm mt-1">GIR %</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    {player.stats?.scoringAvg?.toFixed(1) || '—'}
                  </p>
                  <p className="text-text-muted text-sm mt-1">Scoring Avg</p>
                </div>
              </div>

              {/* Recent Form */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Recent Form</h3>
                <div className="flex flex-wrap gap-2">
                  {player.recentForm?.map((result, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        result === '1st' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        result === '2nd' || result === '3rd' ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                        result.startsWith('T') && parseInt(result.slice(1)) <= 10 ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' :
                        'bg-dark-tertiary text-text-secondary border border-dark-border'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Tournament Status */}
              {player.tournamentStatus && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Current Tournament</h3>
                  <Card className="bg-dark-primary">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-text-muted text-sm">Position</p>
                        <p className={`text-2xl font-bold ${
                          player.tournamentStatus.position === '1st' ? 'text-yellow-400' :
                          player.tournamentStatus.position.startsWith('T') && parseInt(player.tournamentStatus.position.slice(1)) <= 10 ? 'text-accent-green' :
                          'text-white'
                        }`}>
                          {player.tournamentStatus.position}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-text-muted text-sm">Score</p>
                        <p className={`text-2xl font-bold ${
                          player.tournamentStatus.score < 0 ? 'text-accent-green' :
                          player.tournamentStatus.score > 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          {player.tournamentStatus.score > 0 ? '+' : ''}{player.tournamentStatus.score}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-muted text-sm">Thru</p>
                        <p className="text-2xl font-bold text-white">{player.tournamentStatus.thru}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Basic Stats */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Performance Stats</h3>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-accent-green text-sm hover:underline"
                  >
                    {showAdvanced ? 'Show Less' : 'Show More'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-dark-primary rounded-lg p-3">
                    <p className="text-white font-medium">{player.stats?.drivingDistance?.toFixed(1)}</p>
                    <p className="text-text-muted text-xs">Driving Distance</p>
                  </div>
                  <div className="bg-dark-primary rounded-lg p-3">
                    <p className="text-white font-medium">{player.stats?.drivingAccuracy?.toFixed(1)}%</p>
                    <p className="text-text-muted text-xs">Driving Accuracy</p>
                  </div>
                  <div className="bg-dark-primary rounded-lg p-3">
                    <p className="text-white font-medium">{player.stats?.gir?.toFixed(1)}%</p>
                    <p className="text-text-muted text-xs">Greens in Regulation</p>
                  </div>
                  {showAdvanced && (
                    <>
                      <div className="bg-dark-primary rounded-lg p-3">
                        <p className="text-white font-medium">{player.stats?.scoringAvg?.toFixed(2)}</p>
                        <p className="text-text-muted text-xs">Scoring Average</p>
                      </div>
                      <div className="bg-dark-primary rounded-lg p-3">
                        <p className="text-white font-medium">68.2%</p>
                        <p className="text-text-muted text-xs">Sand Save %</p>
                      </div>
                      <div className="bg-dark-primary rounded-lg p-3">
                        <p className="text-white font-medium">1.72</p>
                        <p className="text-text-muted text-xs">Putts per GIR</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Strokes Gained Tab */}
          {activeTab === 'strokes-gained' && (
            <div className="space-y-6">
              <p className="text-text-secondary text-sm">
                Strokes Gained measures a player's performance relative to the field average.
                Positive values indicate better than average performance.
              </p>

              {/* SG Breakdown */}
              <div className="space-y-4">
                {[
                  { label: 'SG: Total', value: player.stats?.sgTotal, desc: 'Overall performance vs field' },
                  { label: 'SG: Off-the-Tee', value: player.stats?.sgOffTee, desc: 'Tee shot performance' },
                  { label: 'SG: Approach', value: player.stats?.sgApproach, desc: 'Approach shot quality' },
                  { label: 'SG: Around-the-Green', value: player.stats?.sgAroundGreen, desc: 'Short game proficiency' },
                  { label: 'SG: Putting', value: player.stats?.sgPutting, desc: 'Putting efficiency' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-dark-primary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-medium">{stat.label}</p>
                        <p className="text-text-muted text-xs">{stat.desc}</p>
                      </div>
                      <p className={`text-2xl font-bold ${getStatColor(stat.value)}`}>
                        {formatStat(stat.value, '+')}
                      </p>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          stat.value > 0 ? 'bg-accent-green' : 'bg-red-400'
                        }`}
                        style={{
                          width: `${Math.min(Math.abs((stat.value || 0) * 20) + 50, 100)}%`,
                          marginLeft: stat.value < 0 ? `${50 - Math.min(Math.abs(stat.value * 20), 50)}%` : '50%',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* SG Tee-to-Green */}
              <Card className="bg-dark-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">SG: Tee-to-Green</p>
                    <p className="text-text-muted text-xs">Combined non-putting performance</p>
                  </div>
                  <p className={`text-2xl font-bold ${getStatColor(
                    (player.stats?.sgOffTee || 0) + (player.stats?.sgApproach || 0) + (player.stats?.sgAroundGreen || 0)
                  )}`}>
                    {formatStat(
                      (player.stats?.sgOffTee || 0) + (player.stats?.sgApproach || 0) + (player.stats?.sgAroundGreen || 0),
                      '+'
                    )}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Course History</h3>
                <div className="space-y-3">
                  {courseHistory.map((course, idx) => (
                    <div key={idx} className="bg-dark-primary rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium">{course.course}</p>
                        <span className="text-text-muted text-xs">{course.events} events</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-text-muted">Avg Finish</p>
                          <p className="text-white font-medium">{course.avgFinish}</p>
                        </div>
                        <div>
                          <p className="text-text-muted">Best Finish</p>
                          <p className={`font-medium ${
                            course.bestFinish === '1st' ? 'text-yellow-400' : 'text-accent-green'
                          }`}>
                            {course.bestFinish}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted">Avg Score</p>
                          <p className="text-white font-medium">{course.avgScore}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tournament Results */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Recent Tournament Results</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Arnold Palmer Invitational', finish: player.recentForm?.[0] || 'T12', purse: '+$250,000' },
                    { name: 'The Genesis Invitational', finish: player.recentForm?.[1] || 'T8', purse: '+$180,000' },
                    { name: 'WM Phoenix Open', finish: player.recentForm?.[2] || 'T5', purse: '+$320,000' },
                    { name: 'AT&T Pebble Beach Pro-Am', finish: player.recentForm?.[3] || 'T15', purse: '+$95,000' },
                    { name: 'Farmers Insurance Open', finish: player.recentForm?.[4] || 'T22', purse: '+$62,000' },
                  ].map((tournament, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-dark-primary rounded-lg">
                      <span className="text-text-secondary">{tournament.name}</span>
                      <div className="flex items-center gap-4">
                        <span className={`font-medium ${
                          tournament.finish === '1st' ? 'text-yellow-400' :
                          tournament.finish.startsWith('T') && parseInt(tournament.finish.slice(1)) <= 10 ? 'text-accent-green' :
                          'text-white'
                        }`}>
                          {tournament.finish}
                        </span>
                        <span className="text-accent-green text-sm">{tournament.purse}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-accent-green/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                  <p className="text-text-muted text-xs">Powered by predictive analytics</p>
                </div>
              </div>

              <div className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      insight.type === 'positive' ? 'bg-accent-green/10 border-accent-green/30' :
                      insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-dark-primary border-dark-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        insight.type === 'positive' ? 'bg-accent-green/20' :
                        insight.type === 'warning' ? 'bg-yellow-500/20' :
                        'bg-dark-tertiary'
                      }`}>
                        {insight.type === 'positive' && (
                          <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {insight.type === 'warning' && (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {insight.type === 'neutral' && (
                          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-sm ${
                        insight.type === 'positive' ? 'text-accent-green' :
                        insight.type === 'warning' ? 'text-yellow-400' :
                        'text-text-secondary'
                      }`}>
                        {insight.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Recommendation */}
              <Card className="bg-gradient-to-r from-accent-green/20 to-dark-primary border-accent-green/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Recommendation</p>
                    <p className="text-accent-green text-sm">
                      {player.stats?.sgTotal > 1 ? 'Strong start candidate for upcoming events' :
                       player.stats?.sgTotal > 0 ? 'Solid roster option with consistent performance' :
                       'Consider monitoring before adding to active lineup'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-border bg-dark-tertiary/30">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!player.owned && (
            <Button>Add to Watchlist</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerDetailModal
