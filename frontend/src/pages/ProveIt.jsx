import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import HeadToHead from '../components/predictions/HeadToHead'
import CompactSlateTable from '../components/predictions/CompactSlateTable'
import ShareButton from '../components/share/ShareButton'
import PicksResultCard from '../components/share/cards/PicksResultCard'
import StreakCard from '../components/share/cards/StreakCard'
import PlayerDrawer from '../components/players/PlayerDrawer'
import NeuralCluster from '../components/common/NeuralCluster'

// ─── Tier helpers ───────────────────────────────────────────────────────────
const TIER_CONFIG = {
  rookie:    { color: 'text-text-primary/60',   bg: 'bg-[var(--bg-alt)]',        label: 'Rookie' },
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
  const [allPredictions, setAllPredictions] = useState([])
  const [inflight, setInflight] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [currentTournament, setCurrentTournament] = useState(null)
  const [drawerPlayer, setDrawerPlayer] = useState(null)
  const [h2hPlayerA, setH2hPlayerA] = useState(null)
  const [h2hPlayerB, setH2hPlayerB] = useState(null)
  const [showMyCalls, setShowMyCalls] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const tourneyRes = await api.getCurrentTournament().catch(() => null)
        const tournament = tourneyRes?.tournament || tourneyRes
        setCurrentTournament(tournament)

        if (!tournament?.id) {
          setLoading(false)
          return
        }

        const lbRes = await api.getTournamentLeaderboard(tournament.id, { limit: 50 }).catch(() => ({ leaderboard: [] }))
        const targets = (lbRes.leaderboard || [])
          .filter(p => p.sgTotal != null || p.seasonSgTotal != null)
          .map(p => ({
            id: p.player?.id || p.id || p.playerId,
            name: p.player?.name || p.name || p.playerName,
            sgTotal: p.sgTotal ?? p.seasonSgTotal,
            isSeasonAvg: p.sgTotal == null && p.seasonSgTotal != null,
            headshotUrl: p.player?.headshotUrl || p.headshotUrl,
            position: p.position,
            rank: p.player?.owgrRank || p.owgrRank || p.rank,
            cpi: p.clutchMetrics?.cpi ?? null,
            formScore: p.clutchMetrics?.formScore ?? null,
          }))
        targets.sort((a, b) => {
          const aRank = a.rank || 9999
          const bRank = b.rank || 9999
          if (aRank !== bRank) return aRank - bRank
          return (b.sgTotal || 0) - (a.sgTotal || 0)
        })
        setSlate(targets)

        // Get all user predictions for this event (all types)
        const predRes = await api.getMyPredictions({ sport: 'golf', limit: 200 }).catch(() => ({ predictions: [] }))
        const eventPreds = (predRes.predictions || []).filter(p => p.eventId === tournament.id)
        setAllPredictions(eventPreds)
      } catch (err) {
        console.error('Failed to load slate:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Helper: add a key to inflight Set ──
  const addInflight = (key) => setInflight(prev => new Set(prev).add(key))
  const removeInflight = (key) => setInflight(prev => { const s = new Set(prev); s.delete(key); return s })

  // ── Helper: submit a single prediction with optimistic state ──
  const submitSingle = async (player, predictionType, direction, extraData = {}) => {
    const submitKey = `${player.id}_${predictionType}`
    const existingPred = allPredictions.find(
      p => p.subjectPlayerId === player.id && p.predictionType === predictionType
    )

    // Save snapshot for rollback
    const snapshot = [...allPredictions]
    addInflight(submitKey)

    try {
      if (direction === null && existingPred) {
        // Optimistic clear
        setAllPredictions(prev => prev.filter(p => p.id !== existingPred.id))
        await api.deletePrediction(existingPred.id)
        track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction, action: 'clear', context: 'prove_it_table' })
      } else if (existingPred && direction !== null) {
        // Optimistic update
        const updatedData = { ...existingPred.predictionData, direction }
        setAllPredictions(prev => prev.map(p =>
          p.id === existingPred.id ? { ...p, predictionData: updatedData } : p
        ))
        await api.updatePrediction(existingPred.id, { predictionData: updatedData })
        track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction, action: 'update', context: 'prove_it_table' })
      } else if (direction !== null) {
        // Optimistic create — add a temp prediction so UI reflects immediately
        const predictionData = { playerName: player.name, ...extraData }
        if (predictionType === 'player_benchmark') {
          predictionData.metric = 'sgTotal'
          predictionData.benchmarkValue = Math.round((player.sgTotal || 0) * 10) / 10
          predictionData.direction = direction
          predictionData.confidence = 'medium'
        } else {
          predictionData.direction = direction
        }

        const tempId = `temp_${submitKey}_${Date.now()}`
        setAllPredictions(prev => [...prev, {
          id: tempId,
          subjectPlayerId: player.id,
          predictionType,
          predictionData,
          eventId: currentTournament.id,
        }])

        const res = await api.submitPrediction({
          sport: 'golf',
          predictionType,
          category: 'tournament',
          eventId: currentTournament.id,
          subjectPlayerId: player.id,
          predictionData,
          isPublic: true,
        })

        // Replace temp with real prediction
        const real = res.prediction || res
        setAllPredictions(prev => prev.map(p => p.id === tempId ? real : p))
        onPredictionMade?.()
        track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction, action: 'new', context: 'prove_it_table' })
      }
    } catch (err) {
      console.error('Prediction failed:', err)
      // Revert to snapshot on error
      setAllPredictions(snapshot)
    } finally {
      removeInflight(submitKey)
    }
  }

  // ── Winner cascade: auto-fill Top 5/10/20 = Yes, Make Cut = Make ──
  const CASCADE_TYPES = [
    { type: 'top_5', direction: 'yes' },
    { type: 'top_10', direction: 'yes' },
    { type: 'top_20', direction: 'yes' },
    { type: 'make_cut', direction: 'make' },
  ]

  const clearCascadeForPlayer = async (playerId) => {
    const toDelete = allPredictions.filter(
      p => p.subjectPlayerId === playerId && CASCADE_TYPES.some(c => c.type === p.predictionType)
    )
    if (toDelete.length === 0) return
    // Optimistic remove
    const deleteIds = new Set(toDelete.map(p => p.id))
    setAllPredictions(prev => prev.filter(p => !deleteIds.has(p.id)))
    await Promise.all(toDelete.map(p => api.deletePrediction(p.id).catch(() => {})))
  }

  const createCascadeForPlayer = async (player) => {
    const promises = CASCADE_TYPES.map(({ type, direction }) => {
      const existing = allPredictions.find(
        p => p.subjectPlayerId === player.id && p.predictionType === type
      )
      if (existing && existing.predictionData?.direction === direction) return null // already correct
      return submitSingle(player, type, direction)
    })
    await Promise.all(promises.filter(Boolean))
  }

  const handleCellTap = async (player, predictionType, direction, extraData = {}) => {
    if (!currentTournament) return
    const submitKey = `${player.id}_${predictionType}`
    if (inflight.has(submitKey)) return

    // ── Tournament Winner: single-pick + cascade ──
    if (predictionType === 'tournament_winner') {
      const prevWinner = allPredictions.find(p => p.predictionType === 'tournament_winner')
      const isSamePlayer = prevWinner && prevWinner.subjectPlayerId === player.id

      if (isSamePlayer) {
        // Clear winner + cascade
        addInflight(submitKey)
        const snapshot = [...allPredictions]
        try {
          setAllPredictions(prev => prev.filter(p => p.id !== prevWinner.id))
          await api.deletePrediction(prevWinner.id)
          await clearCascadeForPlayer(player.id)
          track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction: null, action: 'clear', context: 'prove_it_table' })
        } catch (err) {
          console.error('Winner clear failed:', err)
          setAllPredictions(snapshot)
        } finally {
          removeInflight(submitKey)
        }
        return
      }

      // Switch or new winner
      addInflight(submitKey)
      const snapshot = [...allPredictions]
      try {
        // Delete previous winner + its cascade
        if (prevWinner) {
          setAllPredictions(prev => prev.filter(p => p.id !== prevWinner.id))
          await api.deletePrediction(prevWinner.id)
          await clearCascadeForPlayer(prevWinner.subjectPlayerId)
        }

        // Create new winner
        const res = await api.submitPrediction({
          sport: 'golf',
          predictionType,
          category: 'tournament',
          eventId: currentTournament.id,
          subjectPlayerId: player.id,
          predictionData: { playerName: player.name },
          isPublic: true,
        })
        setAllPredictions(prev => [
          ...prev.filter(p => p.id !== prevWinner?.id),
          res.prediction || res
        ])
        onPredictionMade?.()
        track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction: 'pick', action: 'new', context: 'prove_it_table' })

        // Auto-cascade: Top 5/10/20 = Yes, Make Cut = Make
        await createCascadeForPlayer(player)
      } catch (err) {
        console.error('Winner submit failed:', err)
        setAllPredictions(snapshot)
      } finally {
        removeInflight(submitKey)
      }
      return
    }

    // ── Round Leader: single-pick, mirrors winner logic (no cascade) ──
    if (predictionType === 'round_leader') {
      const prevLeader = allPredictions.find(p => p.predictionType === 'round_leader')
      const isSamePlayer = prevLeader && prevLeader.subjectPlayerId === player.id

      addInflight(submitKey)
      const snapshot = [...allPredictions]
      try {
        if (isSamePlayer) {
          setAllPredictions(prev => prev.filter(p => p.id !== prevLeader.id))
          await api.deletePrediction(prevLeader.id)
          track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction: null, action: 'clear', context: 'prove_it_table' })
        } else {
          if (prevLeader) {
            setAllPredictions(prev => prev.filter(p => p.id !== prevLeader.id))
            await api.deletePrediction(prevLeader.id)
          }
          const res = await api.submitPrediction({
            sport: 'golf',
            predictionType,
            category: 'tournament',
            eventId: currentTournament.id,
            subjectPlayerId: player.id,
            predictionData: { playerName: player.name },
            isPublic: true,
          })
          setAllPredictions(prev => [
            ...prev.filter(p => p.id !== prevLeader?.id),
            res.prediction || res
          ])
          onPredictionMade?.()
          track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction: 'pick', action: 'new', context: 'prove_it_table' })
        }
      } catch (err) {
        console.error('Leader submit failed:', err)
        setAllPredictions(snapshot)
      } finally {
        removeInflight(submitKey)
      }
      return
    }

    // ── Generic flow (top, cut, sg, h2h): optimistic single submit ──
    await submitSingle(player, predictionType, direction, extraData)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-[var(--stone)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!currentTournament || slate.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">⛳</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Active Tournament</h3>
        <p className="text-text-primary/50 text-sm">
          Performance calls will be available when the next tournament field is set.
        </p>
      </div>
    )
  }

  const madeCount = allPredictions.length
  const filteredSlate = showMyCalls
    ? slate.filter(p => allPredictions.some(pred => pred.subjectPlayerId === p.id))
    : slate

  return (
    <div>
      {/* Coach engagement banner */}
      <div className="bg-gradient-to-r from-purple-500/10 via-[var(--crown)]/10 to-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <NeuralCluster size="sm" intensity="active" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              {madeCount === 0
                ? 'Make your first call — your AI coach is watching.'
                : madeCount < 5
                  ? `${madeCount} calls in. Keep going — your coach is learning your tendencies.`
                  : `${madeCount} calls locked in. Your coach is building your profile.`
              }
            </p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              The more calls you make, the better your AI coach understands your instincts.
            </p>
          </div>
        </div>
      </div>

      {/* Tournament header */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-text-primary font-semibold">{currentTournament.name}</h3>
            <p className="text-text-primary/40 text-sm mt-0.5">
              Tap any cell to make your call. Tap again to change it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMyCalls(!showMyCalls)}
              className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                showMyCalls ? 'bg-crown/20 text-crown' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {showMyCalls ? 'My Calls' : 'All'}
            </button>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-amber-400">{madeCount}</div>
              <div className="text-xs text-text-primary/40">total calls</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact prediction table */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl overflow-hidden mb-4">
        <CompactSlateTable
          players={filteredSlate}
          predictions={allPredictions}
          inflight={inflight}
          onCellTap={handleCellTap}
          onPlayerClick={setDrawerPlayer}
        />
      </div>

      {/* R1 Leader — compact grid below table */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 mb-4">
        <h4 className="text-xs font-bold text-text-primary/50 uppercase tracking-wider mb-3">
          Round 1 Leader — Who leads after day one?
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
          {filteredSlate.slice(0, 12).map(player => {
            const pred = allPredictions.find(p => p.subjectPlayerId === player.id && p.predictionType === 'round_leader')
            const isSelected = !!pred
            return (
              <button
                key={player.id}
                onClick={() => handleCellTap(player, 'round_leader', isSelected ? null : 'pick')}
                disabled={inflight.has(`${player.id}_round_leader`)}
                className={`flex items-center gap-1.5 p-2 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-crown/15 border border-crown/30 text-crown'
                    : 'bg-[var(--bg-alt)] border border-transparent text-text-primary/60 hover:text-text-primary'
                } disabled:opacity-50`}
              >
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--stone)] text-[8px] flex items-center justify-center shrink-0">
                    {(player.name || '?').charAt(0)}
                  </div>
                )}
                <span className="truncate font-medium">{player.name?.split(' ').pop()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Head to Head */}
      <div>
        {/* Build Your Own H2H */}
        <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Build Your Matchup</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Player A */}
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Player A</label>
              <select
                value={h2hPlayerA?.id || ''}
                onChange={e => setH2hPlayerA(slate.find(p => p.id === e.target.value) || null)}
                className="w-full bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-2 py-2 text-sm text-text-primary"
              >
                <option value="">Select...</option>
                {slate.filter(p => p.id !== h2hPlayerB?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* Player B */}
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Player B</label>
              <select
                value={h2hPlayerB?.id || ''}
                onChange={e => setH2hPlayerB(slate.find(p => p.id === e.target.value) || null)}
                className="w-full bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-2 py-2 text-sm text-text-primary"
              >
                <option value="">Select...</option>
                {slate.filter(p => p.id !== h2hPlayerA?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {h2hPlayerA && h2hPlayerB && (
            <div className="flex gap-2">
              {(() => {
                const key = `${h2hPlayerA.id}_${h2hPlayerB.id}`
                const existing = allPredictions.find(
                  p => p.predictionType === 'head_to_head' &&
                    p.subjectPlayerId === h2hPlayerA.id &&
                    p.predictionData?.opponentPlayerId === h2hPlayerB.id
                )
                if (existing) {
                  return <span className="text-xs font-bold text-crown px-3 py-1.5 rounded-lg bg-crown/10 border border-crown/20">Called</span>
                }
                return (
                  <>
                    <button
                      onClick={() => handleCellTap(h2hPlayerA, 'head_to_head', 'playerA', {
                        opponentPlayerId: h2hPlayerB.id,
                        opponentPlayerName: h2hPlayerB.name
                      })}
                      disabled={inflight.size > 0}
                      className="flex-1 py-2 text-xs rounded-lg bg-field-bright/20 border border-field-bright/30 text-field font-bold hover:bg-field-bright/30 transition-colors disabled:opacity-50"
                    >
                      {h2hPlayerA.name?.split(' ').pop()}
                    </button>
                    <button
                      onClick={() => handleCellTap(h2hPlayerB, 'head_to_head', 'playerB', {
                        opponentPlayerId: h2hPlayerA.id,
                        opponentPlayerName: h2hPlayerA.name
                      })}
                      disabled={inflight.size > 0}
                      className="flex-1 py-2 text-xs rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                    >
                      {h2hPlayerB.name?.split(' ').pop()}
                    </button>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Pre-built matchups: top 5 vs the field */}
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Suggested Matchups</h4>
        <div className="space-y-2">
          {slate.slice(0, 5).map((playerA, i) => {
            const playerB = slate[slate.length - 1 - i] || slate[i + 5]
            if (!playerB || playerA.id === playerB.id) return null
            const key = `${playerA.id}_${playerB.id}`
            const existing = allPredictions.find(
              p => p.predictionType === 'head_to_head' &&
                p.subjectPlayerId === playerA.id &&
                p.predictionData?.opponentPlayerId === playerB.id
            )
            return (
              <div key={key} className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => setDrawerPlayer(playerA)}>
                    {playerA.headshotUrl ? <img src={playerA.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-xs">{playerA.name?.charAt(0)}</div>}
                    <span className="text-sm font-medium text-text-primary truncate">{playerA.name}</span>
                  </div>
                  <span className="text-xs text-text-muted font-mono shrink-0">vs</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end cursor-pointer" onClick={() => setDrawerPlayer(playerB)}>
                    <span className="text-sm font-medium text-text-primary truncate text-right">{playerB.name}</span>
                    {playerB.headshotUrl ? <img src={playerB.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-xs">{playerB.name?.charAt(0)}</div>}
                  </div>
                </div>
                {existing ? (
                  <div className="text-center">
                    <span className="text-xs font-bold text-crown">Called</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCellTap(playerA, 'head_to_head', 'playerA', {
                        opponentPlayerId: playerB.id,
                        opponentPlayerName: playerB.name
                      })}
                      disabled={inflight.size > 0}
                      className="flex-1 py-1.5 text-[10px] rounded-lg bg-field-bright/20 border border-field-bright/30 text-field font-bold hover:bg-field-bright/30 transition-colors disabled:opacity-50"
                    >
                      {playerA.name?.split(' ').pop()}
                    </button>
                    <button
                      onClick={() => handleCellTap(playerB, 'head_to_head', 'playerB', {
                        opponentPlayerId: playerA.id,
                        opponentPlayerName: playerA.name
                      })}
                      disabled={inflight.size > 0}
                      className="flex-1 py-1.5 text-[10px] rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                    >
                      {playerB.name?.split(' ').pop()}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Player Drawer */}
      <PlayerDrawer
        playerId={drawerPlayer?.id}
        isOpen={!!drawerPlayer}
        onClose={() => setDrawerPlayer(null)}
      />
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
  const [typeFilter, setTypeFilter] = useState('all') // all, game_winner, player, bold
  const [expandedWeeks, setExpandedWeeks] = useState({})

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
        <div className="h-32 bg-[var(--stone)] rounded-xl animate-pulse" />
        <div className="h-64 bg-[var(--stone)] rounded-xl animate-pulse" />
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
    if (filter === 'pending' && p.outcome !== 'PENDING') return false
    if (filter === 'correct' && p.outcome !== 'CORRECT') return false
    if (filter === 'incorrect' && p.outcome !== 'INCORRECT') return false
    // Type filter (NFL-specific)
    if (typeFilter !== 'all') {
      const pType = p.predictionType || p.predictionData?.type || ''
      const desc = (p.predictionData?.description || '').toLowerCase()
      if (typeFilter === 'game_winner' && pType !== 'nfl_game' && !desc.includes('winner') && !desc.includes(' vs ') && !desc.includes(' @ ')) return false
      if (typeFilter === 'player' && pType !== 'nfl_prop' && pType !== 'player_benchmark' && !p.predictionData?.playerName) return false
      if (typeFilter === 'bold' && p.confidenceLevel < 4) return false
    }
    return true
  })

  // Group NFL predictions by week (derived from createdAt date)
  const nflWeekGroups = sportFilter === 'nfl' ? (() => {
    const groups = {}
    filtered.forEach(p => {
      const weekNum = p.predictionData?.week || p.predictionData?.weekNumber || null
      const key = weekNum ? `Week ${weekNum}` : new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!groups[key]) groups[key] = { label: key, weekNum, predictions: [], correct: 0, total: 0 }
      groups[key].predictions.push(p)
      groups[key].total++
      if (p.outcome === 'CORRECT') groups[key].correct++
    })
    return Object.values(groups).sort((a, b) => (b.weekNum || 0) - (a.weekNum || 0))
  })() : null

  return (
    <div className="space-y-4">
      {/* Sport filter */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 w-fit">
        {['all', 'nfl', 'golf'].map(s => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              sportFilter === s ? 'bg-[var(--bg-alt)] text-text-primary' : 'text-text-primary/40 hover:text-text-primary/60'
            }`}
          >
            {s === 'all' ? 'All Sports' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Type filter (NFL-specific) */}
      {sportFilter === 'nfl' && (
        <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 w-fit">
          {[
            { id: 'all', label: 'All' },
            { id: 'game_winner', label: 'Game Winner' },
            { id: 'player', label: 'Player Calls' },
            { id: 'bold', label: 'Bold Calls' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                typeFilter === t.id ? 'bg-[var(--bg-alt)] text-text-primary' : 'text-text-primary/40 hover:text-text-primary/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* NFL Quick Record (when NFL filter active) */}
      {sportFilter === 'nfl' && nflRecord && nflRecord.record?.total > 0 && (
        <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xl font-mono font-bold text-text-primary">{nflRecord.record.winLoss}</div>
              <div className="text-xs text-text-primary/40">NFL Record</div>
            </div>
            {nflRecord.streak > 0 && (
              <span className="px-2 py-1 rounded bg-field-bright/20 text-field text-xs font-bold font-mono">
                W{nflRecord.streak}
              </span>
            )}
          </div>
          {nflRecord.clutchRating != null && (
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-amber-400">{Math.round(nflRecord.clutchRating)}</div>
              <div className="text-xs text-text-primary/40">Clutch Rating</div>
            </div>
          )}
        </div>
      )}

      {/* Stats overview */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-5">
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
            <div className="text-2xl font-mono font-bold text-text-primary">{accuracy}%</div>
            <div className="text-xs text-text-primary/40">Accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-text-primary">{total}</div>
            <div className="text-xs text-text-primary/40">Total Calls</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-text-primary">{streak}</div>
            <div className="text-xs text-text-primary/40">Current Streak</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-text-primary">{bestStreak}</div>
            <div className="text-xs text-text-primary/40">Best Streak</div>
          </div>
        </div>

        {/* Share buttons */}
        {total > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--card-border)]">
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
          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between text-xs text-text-primary/50 mb-2">
              <span>Progress to {TIER_CONFIG[progress.nextTier]?.label}</span>
              <span className="font-mono">
                {total}/{progress.needed.minPredictions} calls
                {progress.needed.minAccuracy > 0 && ` · ${accuracy}%/${Math.round(progress.needed.minAccuracy * 100)}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--stone)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(progress.predPct, progress.accPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Prediction history */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-text-primary/80 flex-1">History</h3>
          <div className="flex gap-1">
            {['all', 'correct', 'incorrect', 'pending'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === f ? 'bg-[var(--bg-alt)] text-text-primary' : 'text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-text-primary/40 text-sm text-center py-6">
            {total === 0 ? 'No calls yet. Head to the slate to make your first!' : 'No matching calls.'}
          </p>
        ) : nflWeekGroups ? (
          /* NFL week-grouped view */
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {nflWeekGroups.map((group, gi) => {
              const isExpanded = gi === 0 || expandedWeeks[group.label]
              const groupAccuracy = group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0
              return (
                <div key={group.label}>
                  <button
                    onClick={() => setExpandedWeeks(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                    className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--bg-alt)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`w-3.5 h-3.5 text-text-primary/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-semibold text-text-primary">{group.label}</span>
                      <span className="text-xs text-text-primary/40 font-mono">{group.total} call{group.total !== 1 ? 's' : ''}</span>
                    </div>
                    {group.correct > 0 && (
                      <span className={`text-xs font-mono font-bold ${groupAccuracy >= 60 ? 'text-field' : groupAccuracy >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {groupAccuracy}%
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 pl-2 mt-1">
                      {group.predictions.map(p => (
                        <PredictionRow key={p.id} p={p} sportFilter={sportFilter} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Standard flat view */
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(p => (
              <PredictionRow key={p.id} p={p} sportFilter={sportFilter} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Shared prediction row used in both flat and grouped views */
function PredictionRow({ p, sportFilter }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[var(--card-border)] last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        p.outcome === 'CORRECT' ? 'bg-field-bright/20 text-field' :
        p.outcome === 'INCORRECT' ? 'bg-rose-500/20 text-rose-400' :
        p.outcome === 'VOIDED' ? 'bg-[var(--bg-alt)] text-text-primary/30' :
        'bg-amber-500/20 text-amber-400'
      }`}>
        {p.outcome === 'CORRECT' ? '✓' : p.outcome === 'INCORRECT' ? '✗' : p.outcome === 'VOIDED' ? '—' : '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">
          {p.sport === 'nfl' ? (
            <>
              {p.predictionData?.description || p.predictionData?.playerName || 'Unknown'}{' '}
              <span className={`font-mono font-bold ${p.predictionData?.direction === 'over' ? 'text-field' : 'text-rose-400'}`}>
                {p.predictionData?.direction?.toUpperCase()}
              </span>
              {' '}
              <span className="text-text-primary/40 font-mono">{p.predictionData?.lineValue}</span>
            </>
          ) : (
            <>
              {p.predictionData?.playerName || 'Unknown'}{' '}
              <span className={`font-mono font-bold ${p.predictionData?.direction === 'over' ? 'text-field' : 'text-rose-400'}`}>
                {p.predictionData?.direction?.toUpperCase()}
              </span>
              {' '}
              <span className="text-text-primary/40 font-mono">
                {p.predictionData?.benchmarkValue > 0 ? '+' : ''}{p.predictionData?.benchmarkValue}
              </span>
            </>
          )}
        </div>
        <div className="text-xs text-text-primary/30 font-mono flex items-center gap-2">
          {new Date(p.createdAt).toLocaleDateString()}
          {sportFilter === 'all' && (
            <span className="px-1 py-0.5 rounded bg-[var(--bg-alt)] text-[10px] uppercase">{p.sport}</span>
          )}
          {p.confidenceLevel && (
            <span className="px-1 py-0.5 rounded bg-gold/10 text-gold/60 text-[9px]">
              {['', 'Low', 'Lean', 'Conf', 'Strong', 'Lock'][p.confidenceLevel]}
            </span>
          )}
        </div>
        {p.thesis && (
          <p className="text-[11px] text-text-primary/30 italic mt-0.5 line-clamp-2">
            "{p.thesis}"
          </p>
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
                : 'bg-[var(--surface)] text-text-primary/40 hover:text-text-primary/60'
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
          <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  timeframe === tf.id ? 'bg-[var(--bg-alt)] text-text-primary' : 'text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Sort by */}
          <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  sortBy === s.id ? 'bg-[var(--bg-alt)] text-text-primary' : 'text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Min calls slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-primary/40">Min calls:</span>
            <input
              type="range"
              min={1}
              max={50}
              value={minCalls}
              onChange={e => setMinCalls(parseInt(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="text-xs font-mono text-text-primary/60 w-6">{minCalls}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-[var(--stone)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">&#127942;</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Rankings Yet</h3>
          <p className="text-text-primary/50 text-sm">
            Make performance calls to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-[var(--card-border)] text-xs text-text-primary/40">
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
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--surface-alt)] transition-colors"
              >
                <div className="col-span-1 text-text-primary/60 font-mono text-sm flex items-center">{i + 1}</div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-xs shrink-0">
                      {(entry.name || entry.userName || '?').charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-text-primary truncate">{entry.name || entry.userName || 'Anonymous'}</span>
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
                        clutchRating >= 70 ? 'text-field' :
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
                    <span className="text-xs text-text-primary/20 font-mono">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-text-primary flex items-center justify-end">
                  {accuracyVal}%
                </div>
                <div className="col-span-1 text-right text-sm font-mono text-text-primary/60 flex items-center justify-end">
                  {totalCalls}
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-text-primary/60 flex items-center justify-end">
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
          <div key={i} className="h-32 bg-[var(--stone)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (topPredictors.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">&#128269;</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Analysts Yet</h3>
        <p className="text-text-primary/50 text-sm">
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
          className="w-full sm:w-64 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-500/50"
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
              className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 hover:bg-[var(--surface-alt)] transition-colors"
            >
              <div className="flex items-center gap-3">
                {analyst.avatar ? (
                  <img src={analyst.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30">
                    {(analyst.name || '?').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">
                    {analyst.name || 'Anonymous'}
                  </div>
                  {analyst.username && (
                    <div className="text-xs text-text-primary/30 font-mono">@{analyst.username}</div>
                  )}
                  {analyst.tagline && (
                    <div className="text-xs text-text-primary/40 truncate mt-0.5">{analyst.tagline}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {analyst.clutchRating != null && (
                    <div className="text-lg font-mono font-bold text-accent-gold">{Math.round(analyst.clutchRating)}</div>
                  )}
                  {analyst.clutchRating == null && (
                    <div className="text-lg font-mono font-bold text-text-primary">{accuracyPct}%</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${tierCfg.bg} ${tierCfg.color}`}>
                  {tierCfg.label}
                </span>
                <span className="text-[10px] text-text-primary/40 font-mono">{accuracyPct}%</span>
                <span className="text-text-primary/20">·</span>
                <span className="text-[10px] text-text-primary/40 font-mono">{total} calls</span>
                {hasSocial && (
                  <>
                    <span className="text-text-primary/20">·</span>
                    <div className="flex items-center gap-1">
                      {Object.entries(socialLinks).map(([key, url]) => {
                        if (!url || !SOCIAL_ICON_MAP[key]) return null
                        return (
                          <span key={key} className="text-text-primary/30">
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

// ─── NFL Predictions Tab ────────────────────────────────────────────────────

const REASON_CHIPS = ['Matchup', 'Weather', 'Gut feel', 'Volume', 'Game script', 'Data model']
const nflPosColors = {
  QB: 'bg-live-red/20 text-live-red',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-field-bright/20 text-field',
  TE: 'bg-crown/20 text-crown',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-blaze',
}

function NflWeeklyProps({ onPredictionMade }) {
  const [season] = useState(2024)
  const [week, setWeek] = useState(5)
  const [props, setProps] = useState({ playerProps: [], gameProps: [] })
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState({})
  const [showReasonFor, setShowReasonFor] = useState(null)
  const [predCoaching, setPredCoaching] = useState(null)

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

  // AI Coach: fetch prediction calibration context
  useEffect(() => {
    api.getPredictionContext({ sport: 'nfl', predictionType: 'nfl_prop' })
      .then(res => {
        if (res.context?.calibrationNote) setPredCoaching(res.context)
      })
      .catch(() => {})
  }, [])

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
          <div key={i} className="h-16 bg-[var(--stone)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Week selector + record */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week <= 1}
              className="p-1.5 rounded bg-[var(--bg-alt)] text-text-primary/60 hover:text-text-primary disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-text-primary font-semibold">NFL Week {week}</h3>
              <p className="text-text-primary/40 text-xs">{totalProps} prediction{totalProps !== 1 ? 's' : ''} available</p>
            </div>
            <button onClick={() => setWeek(w => Math.min(18, w + 1))} disabled={week >= 18}
              className="p-1.5 rounded bg-[var(--bg-alt)] text-text-primary/60 hover:text-text-primary disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {record && record.record.total > 0 && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-lg font-mono font-bold text-text-primary">{record.record.winLoss}</div>
                <div className="text-xs text-text-primary/40">Record</div>
              </div>
              {record.record.accuracy && (
                <div>
                  <div className="text-lg font-mono font-bold text-field">
                    {(parseFloat(record.record.accuracy) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-primary/40">Accuracy</div>
                </div>
              )}
              {record.streak > 0 && (
                <span className="px-2 py-1 rounded bg-field-bright/20 text-field text-xs font-bold font-mono">
                  W{record.streak}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Coach Calibration Note */}
      {predCoaching && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-purple-500/10 border border-purple-400/20 rounded-xl">
          <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-300 font-semibold mb-0.5">Clutch Coach</p>
            <p className="text-xs text-text-primary/60 leading-relaxed">{predCoaching.calibrationNote}</p>
          </div>
          <button onClick={() => setPredCoaching(null)} className="text-text-primary/30 hover:text-text-primary/60 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Player Benchmarks */}
      {props.playerProps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-text-primary/50 uppercase tracking-wider mb-3">Player Benchmarks</h3>
          <div className="space-y-2">
            {props.playerProps.map(prop => (
              <NflPropCard key={prop.id} prop={prop} onPick={handlePick} onReasonChip={handleReasonChip}
                submitting={submitting[prop.id]} showReason={showReasonFor === prop.id} />
            ))}
          </div>
        </div>
      )}

      {/* Game Predictions */}
      {props.gameProps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-text-primary/50 uppercase tracking-wider mb-3">Game Predictions</h3>
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
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Predictions for Week {week}</h3>
          <p className="text-text-primary/50 text-sm">Predictions are generated from player performance data. Try a different week.</p>
        </div>
      )}

      {/* All weeks */}
      <div className="mt-6">
        <div className="flex flex-wrap gap-1.5">
          {weeks.map(w => (
            <button key={w} onClick={() => setWeek(w)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                w === week ? 'bg-field-bright text-text-primary' : 'bg-[var(--surface)] text-text-primary/40 hover:text-text-primary/60'
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
    <div className={`bg-[var(--surface)] shadow-card border rounded-xl p-3 ${
      userPick?.outcome === 'CORRECT' ? 'border-field-bright/30' :
      userPick?.outcome === 'INCORRECT' ? 'border-rose-500/30' :
      userDirection ? 'border-[var(--card-border)]' : 'border-[var(--card-border)]'
    }`}>
      <div className="flex items-center gap-3">
        {prop.player?.nflPosition && (
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center flex-shrink-0 ${
            nflPosColors[prop.player.nflPosition] || 'bg-[var(--bg-alt)] text-text-primary/40'
          }`}>{prop.player.nflPosition}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{prop.description}</p>
          {prop.player?.nflTeamAbbr && <p className="text-[10px] text-text-primary/40">{prop.player.nflTeamAbbr}</p>}
        </div>
        <div className="text-center mx-2">
          <p className="text-[10px] text-text-primary/40 uppercase">Benchmark</p>
          <p className="text-sm font-bold font-mono text-text-primary">{prop.lineValue}</p>
        </div>

        {isResolved ? (
          <div className="flex items-center gap-2">
            {prop.actualValue != null && <span className="text-xs font-mono text-text-primary/40">Actual: {prop.actualValue}</span>}
            {userDirection && (
              <span className={`text-sm font-bold ${
                userPick?.outcome === 'CORRECT' ? 'text-field' :
                userPick?.outcome === 'INCORRECT' ? 'text-rose-400' : 'text-crown'
              }`}>{userPick?.outcome === 'CORRECT' ? '✓' : userPick?.outcome === 'INCORRECT' ? '✗' : '—'}</span>
            )}
          </div>
        ) : isLocked ? (
          <div className="flex items-center gap-1.5">
            {userDirection && (
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                userDirection === 'over' ? 'bg-field-bright/20 text-field' : 'bg-rose-500/20 text-rose-400'
              }`}>{userDirection.toUpperCase()}</span>
            )}
            <span className="text-[10px] text-text-primary/30">Locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={() => onPick(prop.id, 'over')} disabled={submitting}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                userDirection === 'over' ? 'bg-field-bright text-text-primary' : 'bg-field-bright/15 text-field hover:bg-field-bright/30'
              } disabled:opacity-50`}>Over</button>
            <button onClick={() => onPick(prop.id, 'under')} disabled={submitting}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                userDirection === 'under' ? 'bg-rose-500 text-text-primary' : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/30'
              } disabled:opacity-50`}>Under</button>
          </div>
        )}
      </div>

      {showReason && !isLocked && !isResolved && (
        <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-text-primary/30 mb-1.5">Why? (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {REASON_CHIPS.map(chip => (
              <button key={chip} onClick={() => onReasonChip(prop.id, chip)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  userPick?.predictionData?.reasonChip === chip
                    ? 'bg-field-bright/30 text-field' : 'bg-[var(--surface)] text-text-primary/30 hover:text-text-primary/60'
                }`}>{chip}</button>
            ))}
          </div>
          {/* Thesis input for deeper reasoning */}
          <input
            type="text"
            maxLength={280}
            placeholder="Quick thesis... (optional)"
            className="w-full mt-2 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-[11px] text-text-primary/70 placeholder-white/15 focus:outline-none focus:border-gold/30"
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
  { id: 'slate', label: 'Golf Slate' },
  { id: 'nfl', label: 'NFL Predictions' },
  { id: 'record', label: 'My Track Record' },
  { id: 'leaderboard', label: 'Leaderboards' },
  { id: 'compare', label: 'Compare' },
  { id: 'analysts', label: 'Analysts' },
]

export default function ProveIt() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const targetParam = searchParams.get('target')
  const [activeTab, setActiveTab] = useState(tabParam || 'slate')
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
        <h1 className="text-2xl font-bold text-text-primary">Prove It</h1>
        <p className="text-text-primary/50 text-sm mt-1">
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
                : 'text-text-primary/40 hover:text-text-primary/60 hover:bg-[var(--surface-alt)]'
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
