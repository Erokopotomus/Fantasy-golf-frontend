import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import api from '../services/api'

// ─── Tier helpers ───────────────────────────────────────────────────────────
const TIER_CONFIG = {
  rookie:    { color: 'text-white/60',   bg: 'bg-white/10',       label: 'Rookie' },
  contender: { color: 'text-blue-400',   bg: 'bg-blue-500/20',    label: 'Contender' },
  sharp:     { color: 'text-purple-400', bg: 'bg-purple-500/20',  label: 'Sharp' },
  expert:    { color: 'text-amber-400',  bg: 'bg-amber-500/20',   label: 'Expert' },
  elite:     { color: 'text-amber-300',  bg: 'bg-amber-500/30',   label: 'Elite' },
}

const TIER_THRESHOLDS = [
  { tier: 'contender', minPredictions: 10, minAccuracy: 0 },
  { tier: 'sharp',     minPredictions: 25, minAccuracy: 0.55 },
  { tier: 'expert',    minPredictions: 50, minAccuracy: 0.65 },
  { tier: 'elite',     minPredictions: 100, minAccuracy: 0.75 },
]

function getTierProgress(total, accuracy) {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = TIER_THRESHOLDS[i]
    if (total >= t.minPredictions && accuracy >= t.minAccuracy) continue
    // This is the next tier to reach
    const predPct = Math.min(100, (total / t.minPredictions) * 100)
    const accPct = t.minAccuracy > 0 ? Math.min(100, (accuracy / t.minAccuracy) * 100) : 100
    return { nextTier: t.tier, predPct, accPct, needed: t }
  }
  return null // Already elite
}

// ─── Tab: This Week's Slate ─────────────────────────────────────────────────
function WeeklySlate({ onPredictionMade }) {
  const [slate, setSlate] = useState([])
  const [myPredictions, setMyPredictions] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTournament, setCurrentTournament] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // Get current tournament for event context
        const tourneyRes = await api.getCurrentTournament().catch(() => null)
        const tournament = tourneyRes?.tournament || tourneyRes
        setCurrentTournament(tournament)

        if (!tournament?.id) {
          setLoading(false)
          return
        }

        // Get tournament leaderboard as prediction targets
        const lbRes = await api.getTournamentLeaderboard(tournament.id, { limit: 50 }).catch(() => ({ leaderboard: [] }))
        const targets = (lbRes.leaderboard || [])
          .filter(p => p.sgTotal != null)
          .map(p => ({
            id: p.id || p.playerId,
            name: p.name || p.playerName,
            sgTotal: p.sgTotal,
            headshotUrl: p.headshotUrl,
            position: p.position,
            rank: p.owgrRank || p.rank,
          }))
        setSlate(targets)

        // Get user's existing predictions for this event
        const predRes = await api.getMyPredictions({ sport: 'golf', limit: 200 }).catch(() => ({ predictions: [] }))
        const map = {}
        for (const p of (predRes.predictions || [])) {
          if (p.eventId === tournament.id && p.predictionType === 'player_benchmark') {
            map[p.subjectPlayerId] = p
          }
        }
        setMyPredictions(map)
      } catch (err) {
        console.error('Failed to load slate:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (player, direction) => {
    if (submitting || !currentTournament) return
    setSubmitting(player.id)
    const benchmarkValue = Math.round(player.sgTotal * 10) / 10

    try {
      const res = await api.submitPrediction({
        sport: 'golf',
        predictionType: 'player_benchmark',
        category: 'tournament',
        eventId: currentTournament.id,
        subjectPlayerId: player.id,
        predictionData: {
          playerName: player.name,
          metric: 'sgTotal',
          benchmarkValue,
          direction,
          confidence: 'medium',
        },
        isPublic: true,
      })
      setMyPredictions(prev => ({ ...prev, [player.id]: res.prediction || res }))
      track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: 'player_benchmark', direction, context: 'prove_it_slate' })
      onPredictionMade?.()
    } catch (err) {
      console.error('Prediction failed:', err)
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!currentTournament || slate.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">⛳</div>
        <h3 className="text-lg font-semibold text-white mb-2">No Active Tournament</h3>
        <p className="text-white/50 text-sm">
          Performance calls will be available when the next tournament field is set.
        </p>
      </div>
    )
  }

  const madeCount = Object.keys(myPredictions).length
  const remaining = slate.length - madeCount

  return (
    <div>
      {/* Tournament header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">{currentTournament.name}</h3>
            <p className="text-white/40 text-sm mt-0.5">Player Benchmark Calls</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-amber-400">{madeCount}</div>
            <div className="text-xs text-white/40">{remaining} remaining</div>
          </div>
        </div>
      </div>

      {/* Prediction cards */}
      <div className="space-y-2">
        {slate.map(player => {
          const existing = myPredictions[player.id]
          const benchmarkValue = Math.round(player.sgTotal * 10) / 10

          return (
            <div key={player.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3">
              {/* Player info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-sm">
                    {player.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{player.name}</div>
                  {player.rank && (
                    <div className="text-xs text-white/40 font-mono">Rank #{player.rank}</div>
                  )}
                </div>
              </div>

              {/* Benchmark */}
              <div className="text-center px-2">
                <div className="text-xs text-white/40">SG</div>
                <div className="text-sm font-mono font-bold text-white">
                  {benchmarkValue > 0 ? '+' : ''}{benchmarkValue}
                </div>
              </div>

              {/* Buttons or status */}
              {existing ? (
                <div className="flex items-center gap-1.5 w-20 justify-end">
                  <span className={`text-sm font-mono font-bold ${existing.predictionData?.direction === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {existing.predictionData?.direction?.toUpperCase()}
                  </span>
                  {existing.outcome && existing.outcome !== 'PENDING' && (
                    <span className={`text-sm ${existing.outcome === 'CORRECT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {existing.outcome === 'CORRECT' ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 w-20 justify-end">
                  <button
                    onClick={() => handleSubmit(player, 'over')}
                    disabled={submitting === player.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    O
                  </button>
                  <button
                    onClick={() => handleSubmit(player, 'under')}
                    disabled={submitting === player.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                  >
                    U
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: My Track Record ───────────────────────────────────────────────────
function TrackRecord() {
  const [reputation, setReputation] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, correct, incorrect, pending

  useEffect(() => {
    Promise.all([
      api.getMyReputation().catch(() => null),
      api.getMyPredictions({ sport: 'golf', limit: 100 }).catch(() => ({ predictions: [] })),
    ])
      .then(([rep, preds]) => {
        setReputation(rep)
        setPredictions(preds.predictions || [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  const rep = reputation?.find?.(r => r.sport === 'golf') || reputation?.[0] || null
  const total = rep?.totalPredictions || 0
  const correct = rep?.correctPredictions || 0
  const accuracy = rep?.accuracyRate ? Math.round(rep.accuracyRate * 100) : 0
  const streak = rep?.streakCurrent || 0
  const bestStreak = rep?.streakBest || 0
  const tier = rep?.tier || 'rookie'
  const badges = rep?.badges || []
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.rookie
  const progress = getTierProgress(total, rep?.accuracyRate || 0)

  const filtered = predictions.filter(p => {
    if (filter === 'all') return true
    if (filter === 'pending') return p.outcome === 'PENDING'
    if (filter === 'correct') return p.outcome === 'CORRECT'
    if (filter === 'incorrect') return p.outcome === 'INCORRECT'
    return true
  })

  return (
    <div className="space-y-4">
      {/* Stats overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tierCfg.bg} ${tierCfg.color}`}>
            {tierCfg.label}
          </span>
          {badges.length > 0 && (
            <div className="flex gap-1">
              {badges.slice(0, 5).map((badge, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono">
                  {badge.type?.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-mono font-bold text-white">{accuracy}%</div>
            <div className="text-xs text-white/40">Accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white">{total}</div>
            <div className="text-xs text-white/40">Total Calls</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white">{streak}</div>
            <div className="text-xs text-white/40">Current Streak</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white">{bestStreak}</div>
            <div className="text-xs text-white/40">Best Streak</div>
          </div>
        </div>

        {/* Tier progress */}
        {progress && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>Progress to {TIER_CONFIG[progress.nextTier]?.label}</span>
              <span className="font-mono">
                {total}/{progress.needed.minPredictions} calls
                {progress.needed.minAccuracy > 0 && ` · ${accuracy}%/${Math.round(progress.needed.minAccuracy * 100)}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(progress.predPct, progress.accPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Prediction history */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-white/80 flex-1">History</h3>
          <div className="flex gap-1">
            {['all', 'correct', 'incorrect', 'pending'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === f ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">
            {total === 0 ? 'No calls yet. Head to the slate to make your first!' : 'No matching calls.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  p.outcome === 'CORRECT' ? 'bg-emerald-500/20 text-emerald-400' :
                  p.outcome === 'INCORRECT' ? 'bg-rose-500/20 text-rose-400' :
                  p.outcome === 'VOIDED' ? 'bg-white/10 text-white/30' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {p.outcome === 'CORRECT' ? '✓' : p.outcome === 'INCORRECT' ? '✗' : p.outcome === 'VOIDED' ? '—' : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {p.predictionData?.playerName || 'Unknown'}{' '}
                    <span className={`font-mono font-bold ${p.predictionData?.direction === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.predictionData?.direction?.toUpperCase()}
                    </span>
                    {' '}
                    <span className="text-white/40 font-mono">
                      {p.predictionData?.benchmarkValue > 0 ? '+' : ''}{p.predictionData?.benchmarkValue}
                    </span>
                  </div>
                  <div className="text-xs text-white/30 font-mono">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Leaderboards ──────────────────────────────────────────────────────
function Leaderboards() {
  const [leaderboard, setLeaderboard] = useState([])
  const [timeframe, setTimeframe] = useState('weekly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getPredictionLeaderboard({ sport: 'golf', timeframe, limit: 50 })
      .then(res => setLeaderboard(res.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [timeframe])

  return (
    <div>
      {/* Timeframe tabs */}
      <div className="flex gap-2 mb-4">
        {['weekly', 'all'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            {tf === 'weekly' ? 'This Week' : 'All Time'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Rankings Yet</h3>
          <p className="text-white/50 text-sm">
            Make performance calls to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/10 text-xs text-white/40">
            <div className="col-span-1">#</div>
            <div className="col-span-5">User</div>
            <div className="col-span-2 text-right">Accuracy</div>
            <div className="col-span-2 text-right">Calls</div>
            <div className="col-span-2 text-right">Streak</div>
          </div>

          {/* Rows */}
          {leaderboard.map((entry, i) => {
            const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.rookie
            return (
              <div key={entry.userId || i} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <div className="col-span-1 text-white/60 font-mono text-sm">{i + 1}</div>
                <div className="col-span-5 flex items-center gap-2">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs">
                      {(entry.name || entry.userName || '?').charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-white truncate">{entry.name || entry.userName || 'Anonymous'}</span>
                  <span className={`text-xs font-mono ${tierCfg.color}`}>{entry.tier}</span>
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-white">
                  {entry.accuracyRate != null ? Math.round(entry.accuracyRate * 100) : entry.accuracy ?? 0}%
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-white/60">
                  {entry.totalPredictions ?? entry.total ?? 0}
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-white/60">
                  {entry.streakCurrent ?? entry.streak ?? 0}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Analysts ──────────────────────────────────────────────────────────
function Analysts() {
  const [topPredictors, setTopPredictors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now, use the all-time leaderboard as the analyst list
    api.getPredictionLeaderboard({ sport: 'golf', timeframe: 'all', limit: 20 })
      .then(res => setTopPredictors(res.leaderboard || []))
      .catch(() => setTopPredictors([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (topPredictors.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔍</div>
        <h3 className="text-lg font-semibold text-white mb-2">No Analysts Yet</h3>
        <p className="text-white/50 text-sm">
          Top performers will appear here as the community grows.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {topPredictors.map((analyst, i) => {
        const tierCfg = TIER_CONFIG[analyst.tier] || TIER_CONFIG.rookie
        const accuracy = analyst.accuracyRate != null ? Math.round(analyst.accuracyRate * 100) : 0
        const total = analyst.totalPredictions ?? analyst.total ?? 0

        return (
          <Link
            key={analyst.userId || i}
            to={`/manager/${analyst.userId}`}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              {analyst.avatar ? (
                <img src={analyst.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30">
                  {(analyst.name || '?').charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {analyst.name || analyst.userName || 'Anonymous'}
                </div>
                <span className={`text-xs font-mono ${tierCfg.color}`}>{tierCfg.label}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-white">{accuracy}%</div>
                <div className="text-xs text-white/40">{total} calls</div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Main ProveIt Hub ───────────────────────────────────────────────────────
const TABS = [
  { id: 'slate', label: "This Week's Slate" },
  { id: 'record', label: 'My Track Record' },
  { id: 'leaderboard', label: 'Leaderboards' },
  { id: 'analysts', label: 'Analysts' },
]

export default function ProveIt() {
  const [activeTab, setActiveTab] = useState('slate')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    track(Events.PAGE_VIEWED, { path: '/prove-it', tab: activeTab })
  }, [activeTab])

  const handlePredictionMade = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Prove It</h1>
        <p className="text-white/50 text-sm mt-1">
          Make performance calls. Build your track record. Climb the leaderboard.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'slate' && <WeeklySlate key={refreshKey} onPredictionMade={handlePredictionMade} />}
      {activeTab === 'record' && <TrackRecord key={refreshKey} />}
      {activeTab === 'leaderboard' && <Leaderboards />}
      {activeTab === 'analysts' && <Analysts />}
    </div>
  )
}
