import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import HeadToHead from '../components/predictions/HeadToHead'
import BackYourCall from '../components/predictions/BackYourCall'
import ShareButton from '../components/share/ShareButton'
import PicksResultCard from '../components/share/cards/PicksResultCard'
import StreakCard from '../components/share/cards/StreakCard'

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
  const [showBackingFor, setShowBackingFor] = useState(null)
  const [backingData, setBackingData] = useState({})

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
      setShowBackingFor(player.id)
      track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: 'player_benchmark', direction, context: 'prove_it_slate' })
      onPredictionMade?.()
    } catch (err) {
      console.error('Prediction failed:', err)
    } finally {
      setSubmitting(null)
    }
  }

  const handleBackingUpdate = async (playerId) => {
    const prediction = myPredictions[playerId]
    const data = backingData[playerId]
    if (!prediction?.id || !data) return
    try {
      await api.updatePrediction(prediction.id, data)
    } catch {}
    setShowBackingFor(null)
    setBackingData(prev => { const n = { ...prev }; delete n[playerId]; return n })
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
            <div key={player.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="p-3 flex items-center gap-3">
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

              {/* Back your call — appears after submission */}
              {showBackingFor === player.id && existing?.outcome === 'PENDING' && (
                <div className="px-3 pb-3">
                  <BackYourCall
                    sport="golf"
                    compact
                    onChange={data => setBackingData(prev => ({ ...prev, [player.id]: data }))}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleBackingUpdate(player.id)}
                      className="px-3 py-1 rounded text-[10px] font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowBackingFor(null); setBackingData(prev => { const n = { ...prev }; delete n[player.id]; return n }) }}
                      className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
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
  const { user } = useAuth()
  const [reputation, setReputation] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [nflRecord, setNflRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, correct, incorrect, pending
  const [sportFilter, setSportFilter] = useState('all') // all, golf, nfl

  useEffect(() => {
    Promise.all([
      api.getMyReputation().catch(() => null),
      api.getMyPredictions({ limit: 200 }).catch(() => ({ predictions: [] })),
      api.getNflPickRecord().catch(() => null),
    ])
      .then(([rep, preds, nfl]) => {
        setReputation(rep)
        setPredictions(preds.predictions || [])
        setNflRecord(nfl)
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

  // Pick the reputation based on sport filter
  const repSport = sportFilter === 'nfl' ? 'nfl' : sportFilter === 'golf' ? 'golf' : null
  const rep = repSport
    ? (reputation?.find?.(r => r.sport === repSport) || null)
    : (reputation?.find?.(r => r.sport === 'all') || reputation?.[0] || null)
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
    if (sportFilter === 'golf' && p.sport !== 'golf') return false
    if (sportFilter === 'nfl' && p.sport !== 'nfl') return false
    if (filter === 'all') return true
    if (filter === 'pending') return p.outcome === 'PENDING'
    if (filter === 'correct') return p.outcome === 'CORRECT'
    if (filter === 'incorrect') return p.outcome === 'INCORRECT'
    return true
  })

  return (
    <div className="space-y-4">
      {/* Sport filter */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {['all', 'nfl', 'golf'].map(s => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              sportFilter === s ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {s === 'all' ? 'All Sports' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* NFL Quick Record (when NFL filter active) */}
      {sportFilter === 'nfl' && nflRecord && nflRecord.record?.total > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xl font-mono font-bold text-white">{nflRecord.record.winLoss}</div>
              <div className="text-xs text-white/40">NFL Record</div>
            </div>
            {nflRecord.streak > 0 && (
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                W{nflRecord.streak}
              </span>
            )}
          </div>
          {nflRecord.clutchRating != null && (
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-amber-400">{Math.round(nflRecord.clutchRating)}</div>
              <div className="text-xs text-white/40">Clutch Rating</div>
            </div>
          )}
        </div>
      )}

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

        {/* Share buttons */}
        {total > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
            <ShareButton
              CardComponent={PicksResultCard}
              cardProps={{
                correct,
                total,
                percentile: rep?.percentileRank,
                sport: sportFilter !== 'all' ? sportFilter : null,
                username: user?.username,
              }}
              label="Share Record"
            />
            {streak >= 5 && (
              <ShareButton
                CardComponent={StreakCard}
                cardProps={{
                  streakLength: streak,
                  type: 'correct',
                  userName: user?.name,
                  username: user?.username,
                }}
                label="Share Streak"
              />
            )}
          </div>
        )}

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
                    {p.sport === 'nfl' ? (
                      <>
                        {p.predictionData?.description || p.predictionData?.playerName || 'Unknown'}{' '}
                        <span className={`font-mono font-bold ${p.predictionData?.direction === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {p.predictionData?.direction?.toUpperCase()}
                        </span>
                        {' '}
                        <span className="text-white/40 font-mono">{p.predictionData?.lineValue}</span>
                      </>
                    ) : (
                      <>
                        {p.predictionData?.playerName || 'Unknown'}{' '}
                        <span className={`font-mono font-bold ${p.predictionData?.direction === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {p.predictionData?.direction?.toUpperCase()}
                        </span>
                        {' '}
                        <span className="text-white/40 font-mono">
                          {p.predictionData?.benchmarkValue > 0 ? '+' : ''}{p.predictionData?.benchmarkValue}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-white/30 font-mono flex items-center gap-2">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {sportFilter === 'all' && (
                      <span className="px-1 py-0.5 rounded bg-white/5 text-[10px] uppercase">{p.sport}</span>
                    )}
                    {p.confidenceLevel && (
                      <span className="px-1 py-0.5 rounded bg-gold/10 text-gold/60 text-[9px]">
                        {['', 'Low', 'Lean', 'Conf', 'Strong', 'Lock'][p.confidenceLevel]}
                      </span>
                    )}
                  </div>
                  {p.thesis && (
                    <p className="text-[11px] text-white/30 italic mt-0.5 line-clamp-2">
                      "{p.thesis}"
                    </p>
                  )}
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
  const [board, setBoard] = useState('overall') // overall, hot, consistent
  const [timeframe, setTimeframe] = useState('weekly')
  const [sortBy, setSortBy] = useState('accuracy')
  const [minCalls, setMinCalls] = useState(3)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const params = { sport: 'golf', limit: 50 }

    if (board === 'hot') {
      params.timeframe = '7d'
      params.period = '7d'
      params.sortBy = 'accuracy'
    } else if (board === 'consistent') {
      params.timeframe = 'all'
      params.sortBy = 'clutchRating'
      params.minCalls = 50
    } else {
      params.timeframe = timeframe
      params.sortBy = sortBy
      params.minCalls = minCalls
    }

    api.getPredictionLeaderboard(params)
      .then(res => setLeaderboard(res.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [board, timeframe, sortBy, minCalls])

  const BOARDS = [
    { id: 'overall', label: 'Overall' },
    { id: 'hot', label: 'Hot Right Now' },
    { id: 'consistent', label: 'Most Consistent' },
  ]

  const TIMEFRAMES = [
    { id: 'weekly', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All Time' },
  ]

  const SORT_OPTIONS = [
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'clutchRating', label: 'Clutch Rating' },
  ]

  return (
    <div>
      {/* Board tabs */}
      <div className="flex gap-2 mb-4">
        {BOARDS.map(b => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              board === b.id
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Filters (only for Overall) */}
      {board === 'overall' && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Timeframe */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  timeframe === tf.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Sort by */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  sortBy === s.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Min calls slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Min calls:</span>
            <input
              type="range"
              min={1}
              max={50}
              value={minCalls}
              onChange={e => setMinCalls(parseInt(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="text-xs font-mono text-white/60 w-6">{minCalls}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">&#127942;</div>
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
            <div className="col-span-4">User</div>
            <div className="col-span-2 text-center">Rating</div>
            <div className="col-span-2 text-right">Accuracy</div>
            <div className="col-span-1 text-right">Calls</div>
            <div className="col-span-2 text-right">Streak</div>
          </div>

          {/* Rows */}
          {leaderboard.map((entry, i) => {
            const tierCfg = TIER_CONFIG[entry.tier || entry.clutchTier] || TIER_CONFIG.rookie
            const accuracyVal = entry.accuracyRate != null
              ? Math.round(entry.accuracyRate * 100)
              : entry.accuracy != null
                ? (entry.accuracy < 1 ? Math.round(entry.accuracy * 100) : Math.round(entry.accuracy))
                : 0
            const clutchRating = entry.clutchRating
            const totalCalls = entry.totalPredictions ?? entry.totalGradedCalls ?? entry.total ?? 0
            const streak = entry.streakCurrent ?? entry.streak ?? 0

            return (
              <Link
                key={entry.userId || i}
                to={`/manager/${entry.userId}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                <div className="col-span-1 text-white/60 font-mono text-sm flex items-center">{i + 1}</div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs shrink-0">
                      {(entry.name || entry.userName || '?').charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-white truncate">{entry.name || entry.userName || 'Anonymous'}</span>
                  {Array.isArray(entry.pinnedBadges) && entry.pinnedBadges.length > 0 && (
                    <span className="flex items-center gap-0.5 ml-1 shrink-0">
                      {entry.pinnedBadges.slice(0, 3).map((badge, bi) => (
                        <span key={bi} className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono leading-none" title={badge.replace(/_/g, ' ')}>
                          {badge === 'hot_streak_5' || badge === 'hot_streak_10' ? '🔥' : badge === 'sharpshooter' ? '🎯' : badge === 'clutch_caller' ? '⚡' : badge === 'iron_will' ? '🛡' : badge === 'volume_king' ? '👑' : '🏆'}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  {clutchRating != null ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-mono font-bold ${
                        clutchRating >= 90 ? 'text-amber-400' :
                        clutchRating >= 70 ? 'text-emerald-400' :
                        clutchRating >= 50 ? 'text-amber-500' :
                        'text-gray-400'
                      }`}>
                        {Math.round(clutchRating)}
                      </span>
                      {(entry.trend || entry.clutchTrend) === 'up' && (
                        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 2L10 7H2L6 2Z" fill="#6ABF8A" /></svg>
                      )}
                      {(entry.trend || entry.clutchTrend) === 'down' && (
                        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 10L2 5H10L6 10Z" fill="#EF4444" /></svg>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-white/20 font-mono">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-white flex items-center justify-end">
                  {accuracyVal}%
                </div>
                <div className="col-span-1 text-right text-sm font-mono text-white/60 flex items-center justify-end">
                  {totalCalls}
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-white/60 flex items-center justify-end">
                  {streak}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Social icon map (compact) ──────────────────────────────────────────────
const SOCIAL_ICON_MAP = {
  twitter: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  youtube: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  podcast: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  instagram: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.25 8.25 0 005.58 2.17v-3.44a4.85 4.85 0 01-3.77-1.47V6.69h3.77z" />
    </svg>
  ),
  website: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
}

// ─── Tab: Analysts ──────────────────────────────────────────────────────────
function Analysts() {
  const [topPredictors, setTopPredictors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    api.getPredictionLeaderboard({ sport: 'golf', timeframe: 'all', limit: 30, include: 'profile' })
      .then(res => setTopPredictors(res.leaderboard || []))
      .catch(() => setTopPredictors([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (topPredictors.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">&#128269;</div>
        <h3 className="text-lg font-semibold text-white mb-2">No Analysts Yet</h3>
        <p className="text-white/50 text-sm">
          Top performers will appear here as the community grows.
        </p>
      </div>
    )
  }

  const filtered = searchQuery
    ? topPredictors.filter(a =>
        (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topPredictors

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search analysts..."
          className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((analyst, i) => {
          const tierCfg = TIER_CONFIG[analyst.tier || analyst.clutchTier] || TIER_CONFIG.rookie
          const accuracy = (analyst.accuracyRate != null ? analyst.accuracyRate : analyst.accuracy) || 0
          const accuracyPct = accuracy > 1 ? accuracy : Math.round(accuracy * 100)
          const total = analyst.totalPredictions ?? analyst.total ?? 0
          const socialLinks = analyst.socialLinks || {}
          const hasSocial = Object.values(socialLinks).some(v => v)
          const profileUrl = analyst.username ? `/u/${analyst.username}` : `/manager/${analyst.userId}`

          return (
            <Link
              key={analyst.userId || i}
              to={profileUrl}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                {analyst.avatar ? (
                  <img src={analyst.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30">
                    {(analyst.name || '?').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {analyst.name || 'Anonymous'}
                  </div>
                  {analyst.username && (
                    <div className="text-xs text-white/30 font-mono">@{analyst.username}</div>
                  )}
                  {analyst.tagline && (
                    <div className="text-xs text-white/40 truncate mt-0.5">{analyst.tagline}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {analyst.clutchRating != null && (
                    <div className="text-lg font-mono font-bold text-accent-gold">{Math.round(analyst.clutchRating)}</div>
                  )}
                  {analyst.clutchRating == null && (
                    <div className="text-lg font-mono font-bold text-white">{accuracyPct}%</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${tierCfg.bg} ${tierCfg.color}`}>
                  {tierCfg.label}
                </span>
                <span className="text-[10px] text-white/40 font-mono">{accuracyPct}%</span>
                <span className="text-white/20">·</span>
                <span className="text-[10px] text-white/40 font-mono">{total} calls</span>
                {hasSocial && (
                  <>
                    <span className="text-white/20">·</span>
                    <div className="flex items-center gap-1">
                      {Object.entries(socialLinks).map(([key, url]) => {
                        if (!url || !SOCIAL_ICON_MAP[key]) return null
                        return (
                          <span key={key} className="text-white/30">
                            {SOCIAL_ICON_MAP[key]}
                          </span>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── NFL Props Tab ──────────────────────────────────────────────────────────

const REASON_CHIPS = ['Matchup', 'Weather', 'Gut feel', 'Volume', 'Game script', 'Data model']
const nflPosColors = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-emerald-500/20 text-emerald-400',
  TE: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-orange-400',
}

function NflWeeklyProps({ onPredictionMade }) {
  const [season] = useState(2024)
  const [week, setWeek] = useState(5)
  const [props, setProps] = useState({ playerProps: [], gameProps: [] })
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState({})
  const [showReasonFor, setShowReasonFor] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [propsData, recordData] = await Promise.all([
        api.getNflProps(season, week),
        api.getNflPickRecord().catch(() => null),
      ])
      setProps(propsData)
      setRecord(recordData)
    } catch {
      setProps({ playerProps: [], gameProps: [] })
    } finally {
      setLoading(false)
    }
  }, [season, week])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePick = async (propId, direction) => {
    setSubmitting(prev => ({ ...prev, [propId]: true }))
    try {
      await api.submitNflPick(propId, direction)
      setShowReasonFor(propId)
      setTimeout(() => setShowReasonFor(prev => prev === propId ? null : prev), 5000)
      fetchData()
      onPredictionMade?.()
    } catch (err) {
      console.error('Pick failed:', err.message)
    } finally {
      setSubmitting(prev => ({ ...prev, [propId]: false }))
    }
  }

  const handleReasonChip = async (propId, chip, thesis) => {
    try {
      const prop = [...props.playerProps, ...props.gameProps].find(p => p.id === propId)
      const direction = prop?.userPick?.predictionData?.direction
      if (chip && direction) {
        await api.submitNflPick(propId, direction, chip)
      }
      // If thesis provided, update the prediction directly
      if (thesis && prop?.userPick?.id) {
        await api.updatePrediction(prop.userPick.id, { thesis })
      }
      if (chip) setShowReasonFor(null)
    } catch {}
  }

  const totalProps = props.playerProps.length + props.gameProps.length
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Week selector + record */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week <= 1}
              className="p-1.5 rounded bg-white/10 text-white/60 hover:text-white disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-white font-semibold">NFL Week {week}</h3>
              <p className="text-white/40 text-xs">{totalProps} prop{totalProps !== 1 ? 's' : ''} available</p>
            </div>
            <button onClick={() => setWeek(w => Math.min(18, w + 1))} disabled={week >= 18}
              className="p-1.5 rounded bg-white/10 text-white/60 hover:text-white disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {record && record.record.total > 0 && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-lg font-mono font-bold text-white">{record.record.winLoss}</div>
                <div className="text-xs text-white/40">Record</div>
              </div>
              {record.record.accuracy && (
                <div>
                  <div className="text-lg font-mono font-bold text-emerald-400">
                    {(parseFloat(record.record.accuracy) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-white/40">Accuracy</div>
                </div>
              )}
              {record.streak > 0 && (
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  W{record.streak}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player Props */}
      {props.playerProps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Player Props</h3>
          <div className="space-y-2">
            {props.playerProps.map(prop => (
              <NflPropCard key={prop.id} prop={prop} onPick={handlePick} onReasonChip={handleReasonChip}
                submitting={submitting[prop.id]} showReason={showReasonFor === prop.id} />
            ))}
          </div>
        </div>
      )}

      {/* Game Props */}
      {props.gameProps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Game Props</h3>
          <div className="space-y-2">
            {props.gameProps.map(prop => (
              <NflPropCard key={prop.id} prop={prop} onPick={handlePick} onReasonChip={handleReasonChip}
                submitting={submitting[prop.id]} showReason={showReasonFor === prop.id} />
            ))}
          </div>
        </div>
      )}

      {totalProps === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏈</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Props for Week {week}</h3>
          <p className="text-white/50 text-sm">Props are generated from player performance data. Try a different week.</p>
        </div>
      )}

      {/* All weeks */}
      <div className="mt-6">
        <div className="flex flex-wrap gap-1.5">
          {weeks.map(w => (
            <button key={w} onClick={() => setWeek(w)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                w === week ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}>{w}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NflPropCard({ prop, onPick, onReasonChip, submitting, showReason }) {
  const userPick = prop.userPick
  const userDirection = userPick?.predictionData?.direction
  const isResolved = prop.resolvedAt != null
  const isLocked = prop.locksAt && new Date(prop.locksAt) <= new Date()

  return (
    <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-3 ${
      userPick?.outcome === 'CORRECT' ? 'border-emerald-500/30' :
      userPick?.outcome === 'INCORRECT' ? 'border-rose-500/30' :
      userDirection ? 'border-white/20' : 'border-white/10'
    }`}>
      <div className="flex items-center gap-3">
        {prop.player?.nflPosition && (
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center flex-shrink-0 ${
            nflPosColors[prop.player.nflPosition] || 'bg-white/10 text-white/40'
          }`}>{prop.player.nflPosition}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{prop.description}</p>
          {prop.player?.nflTeamAbbr && <p className="text-[10px] text-white/40">{prop.player.nflTeamAbbr}</p>}
        </div>
        <div className="text-center mx-2">
          <p className="text-[10px] text-white/40 uppercase">O/U</p>
          <p className="text-sm font-bold font-mono text-white">{prop.lineValue}</p>
        </div>

        {isResolved ? (
          <div className="flex items-center gap-2">
            {prop.actualValue != null && <span className="text-xs font-mono text-white/40">Actual: {prop.actualValue}</span>}
            {userDirection && (
              <span className={`text-sm font-bold ${
                userPick?.outcome === 'CORRECT' ? 'text-emerald-400' :
                userPick?.outcome === 'INCORRECT' ? 'text-rose-400' : 'text-yellow-400'
              }`}>{userPick?.outcome === 'CORRECT' ? '✓' : userPick?.outcome === 'INCORRECT' ? '✗' : '—'}</span>
            )}
          </div>
        ) : isLocked ? (
          <div className="flex items-center gap-1.5">
            {userDirection && (
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                userDirection === 'over' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>{userDirection.toUpperCase()}</span>
            )}
            <span className="text-[10px] text-white/30">Locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={() => onPick(prop.id, 'over')} disabled={submitting}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                userDirection === 'over' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30'
              } disabled:opacity-50`}>Over</button>
            <button onClick={() => onPick(prop.id, 'under')} disabled={submitting}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                userDirection === 'under' ? 'bg-rose-500 text-white' : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/30'
              } disabled:opacity-50`}>Under</button>
          </div>
        )}
      </div>

      {showReason && !isLocked && !isResolved && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-[10px] text-white/30 mb-1.5">Why? (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {REASON_CHIPS.map(chip => (
              <button key={chip} onClick={() => onReasonChip(prop.id, chip)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  userPick?.predictionData?.reasonChip === chip
                    ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/5 text-white/30 hover:text-white/60'
                }`}>{chip}</button>
            ))}
          </div>
          {/* Thesis input for deeper reasoning */}
          <input
            type="text"
            maxLength={280}
            placeholder="Quick thesis... (optional)"
            className="w-full mt-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 placeholder-white/15 focus:outline-none focus:border-gold/30"
            onBlur={e => {
              if (e.target.value.trim()) {
                onReasonChip?.(prop.id, null, e.target.value.trim())
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                onReasonChip?.(prop.id, null, e.target.value.trim())
                e.target.blur()
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main ProveIt Hub ───────────────────────────────────────────────────────
const TABS = [
  { id: 'nfl', label: 'NFL Props' },
  { id: 'slate', label: 'Golf Slate' },
  { id: 'record', label: 'My Track Record' },
  { id: 'leaderboard', label: 'Leaderboards' },
  { id: 'compare', label: 'Compare' },
  { id: 'analysts', label: 'Analysts' },
]

export default function ProveIt() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const targetParam = searchParams.get('target')
  const [activeTab, setActiveTab] = useState(tabParam || 'nfl')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

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
      {activeTab === 'nfl' && <NflWeeklyProps key={refreshKey} onPredictionMade={handlePredictionMade} />}
      {activeTab === 'slate' && <WeeklySlate key={refreshKey} onPredictionMade={handlePredictionMade} />}
      {activeTab === 'record' && <TrackRecord key={refreshKey} />}
      {activeTab === 'leaderboard' && <Leaderboards />}
      {activeTab === 'compare' && <HeadToHead initialTarget={targetParam || 'consensus'} />}
      {activeTab === 'analysts' && <Analysts />}
    </div>
  )
}
