import { useState, useEffect } from 'react'
import { track, Events } from '../../services/analytics'
import api from '../../services/api'
import WeightedConsensusBar from './WeightedConsensusBar'

/**
 * Sidebar card for tournament pages showing open Performance Calls.
 * Shows top players in the field with quick OVER/UNDER benchmark predictions.
 */
export default function EventPredictionSlate({ eventId, leaderboard = [], tournamentStatus }) {
  const [myPredictions, setMyPredictions] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showThesisFor, setShowThesisFor] = useState(null)

  // Top players from the leaderboard as prediction targets
  const targets = leaderboard
    .filter(p => p.sgTotal != null || p.fantasyPoints != null)
    .slice(0, expanded ? 20 : 5)
    .map(p => ({
      id: p.id || p.playerId,
      name: p.name || p.playerName,
      sgTotal: p.sgTotal ?? p.sgTotalLive,
      headshotUrl: p.headshotUrl,
      position: p.position,
    }))

  useEffect(() => {
    if (!eventId) return
    api.getMyPredictions({ sport: 'golf', limit: 100 })
      .then(res => {
        const map = {}
        for (const p of (res.predictions || [])) {
          if (p.eventId === eventId && p.predictionType === 'player_benchmark') {
            map[p.subjectPlayerId] = p
          }
        }
        setMyPredictions(map)
      })
      .catch(() => {})
  }, [eventId])

  const handleSubmit = async (playerId, playerName, direction, benchmarkValue) => {
    if (submitting) return
    setSubmitting(playerId)

    try {
      const res = await api.submitPrediction({
        sport: 'golf',
        predictionType: 'player_benchmark',
        category: 'tournament',
        eventId,
        subjectPlayerId: playerId,
        predictionData: {
          playerName,
          metric: 'sgTotal',
          benchmarkValue,
          direction,
          confidence: 'medium',
        },
        isPublic: true,
      })
      setMyPredictions(prev => ({ ...prev, [playerId]: res.prediction || res }))
      setShowThesisFor(playerId)
      track(Events.PREDICTION_SUBMITTED, {
        sport: 'golf',
        type: 'player_benchmark',
        direction,
        playerId,
        context: 'event_slate',
      })
    } catch (err) {
      console.error('Prediction failed:', err)
    } finally {
      setSubmitting(null)
    }
  }

  const isLocked = tournamentStatus === 'IN_PROGRESS' || tournamentStatus === 'COMPLETED'

  if (!eventId || targets.length === 0) return null

  const madeCount = Object.keys(myPredictions).length
  const totalTargets = leaderboard.filter(p => p.sgTotal != null || p.fantasyPoints != null).length

  return (
    <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary/80">This Week's Calls</h3>
        {madeCount > 0 && (
          <span className="text-xs font-mono text-amber-400">{madeCount} made</span>
        )}
      </div>

      <p className="text-text-primary/40 text-xs mb-3">
        {isLocked
          ? 'Predictions locked — tournament in progress'
          : 'Will they finish above or below their SG benchmark?'}
      </p>

      <div className="space-y-2">
        {targets.map(player => {
          const existing = myPredictions[player.id]
          const benchmarkValue = player.sgTotal != null
            ? Math.round(player.sgTotal * 10) / 10
            : 0

          return (
            <div key={player.id}>
              <div className="flex items-center gap-2 py-1.5">
                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {player.headshotUrl && (
                      <img src={player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    )}
                    <span className="text-sm text-text-primary truncate">{player.name}</span>
                  </div>
                </div>

                {/* Benchmark */}
                <span className="text-xs font-mono text-text-primary/50 w-12 text-right">
                  {benchmarkValue > 0 ? '+' : ''}{benchmarkValue}
                </span>

                {/* Buttons or status */}
                {existing ? (
                  <div className="flex items-center gap-1 w-20 justify-end">
                    <span className={`text-xs font-mono font-bold ${existing.predictionData?.direction === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {existing.predictionData?.direction?.toUpperCase()}
                    </span>
                    {existing.outcome && existing.outcome !== 'PENDING' && (
                      <span className={`text-xs ${existing.outcome === 'CORRECT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {existing.outcome === 'CORRECT' ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                ) : isLocked ? (
                  <div className="w-20 text-right">
                    <span className="text-xs text-text-primary/30">Locked</span>
                  </div>
                ) : (
                  <div className="flex gap-1 w-20 justify-end">
                    <button
                      onClick={() => handleSubmit(player.id, player.name, 'over', benchmarkValue)}
                      disabled={submitting === player.id}
                      className="px-2 py-1 text-xs rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      O
                    </button>
                    <button
                      onClick={() => handleSubmit(player.id, player.name, 'under', benchmarkValue)}
                      disabled={submitting === player.id}
                      className="px-2 py-1 text-xs rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                    >
                      U
                    </button>
                  </div>
                )}
              </div>

              {/* Quick thesis input after pick */}
              {showThesisFor === player.id && existing?.outcome === 'PENDING' && (
                <div className="pb-1">
                  <input
                    type="text"
                    maxLength={280}
                    placeholder="Quick reason? (optional)"
                    className="w-full bg-dark-tertiary/[0.04] border border-[var(--card-border)] rounded px-2 py-1 text-[10px] text-text-primary/60 placeholder-white/15 focus:outline-none focus:border-gold/30"
                    autoFocus
                    onBlur={e => {
                      if (e.target.value.trim() && existing?.id) {
                        api.updatePrediction(existing.id, { thesis: e.target.value.trim() }).catch(() => {})
                      }
                      setShowThesisFor(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.target.blur()
                      if (e.key === 'Escape') { setShowThesisFor(null) }
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalTargets > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${totalTargets} players`}
        </button>
      )}

      {/* Show weighted consensus for the first predicted player */}
      {madeCount > 0 && (() => {
        const firstPredicted = Object.keys(myPredictions)[0]
        if (!firstPredicted) return null
        return (
          <WeightedConsensusBar
            eventId={eventId}
            playerId={firstPredicted}
            type="player_benchmark"
            className="mt-3"
          />
        )
      })()}
    </div>
  )
}
