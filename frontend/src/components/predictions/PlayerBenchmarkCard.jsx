import { useState, useEffect } from 'react'
import { track, Events } from '../../services/analytics'
import api from '../../services/api'
import WeightedConsensusBar from './WeightedConsensusBar'

/**
 * Contextual "Player Benchmark" card shown on player profile pages.
 * Allows users to predict OVER/UNDER on a player's benchmark (e.g., SG Total, finish position).
 * Styled as a community poll, NOT a sportsbook card.
 */
export default function PlayerBenchmarkCard({ player, eventId, tournamentStatus, onPredictionMade }) {
  const [consensus, setConsensus] = useState(null)
  const [existingPrediction, setExistingPrediction] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showThesis, setShowThesis] = useState(false)
  const [error, setError] = useState(null)

  const benchmarkValue = player?.sgTotal != null
    ? Math.round(player.sgTotal * 10) / 10
    : null

  useEffect(() => {
    if (!eventId || !player?.id) return

    // Fetch community consensus
    api.getPredictionConsensus(eventId, player.id, 'player_benchmark')
      .then(setConsensus)
      .catch(() => {})

    // Check if user already predicted
    api.getMyPredictions({ sport: 'golf', limit: 100 })
      .then(res => {
        const existing = (res.predictions || []).find(
          p => p.eventId === eventId && p.subjectPlayerId === player.id && p.predictionType === 'player_benchmark'
        )
        if (existing) setExistingPrediction(existing)
      })
      .catch(() => {})
  }, [eventId, player?.id])

  const isLocked = tournamentStatus === 'IN_PROGRESS' || tournamentStatus === 'COMPLETED'

  if (benchmarkValue == null || !eventId) return null

  const handleSubmit = async (direction) => {
    if (submitting || existingPrediction) return
    setSubmitting(true)
    setError(null)

    try {
      const prediction = await api.submitPrediction({
        sport: 'golf',
        predictionType: 'player_benchmark',
        category: 'tournament',
        eventId,
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

      const pred = prediction.prediction || prediction
      setExistingPrediction(pred)
      setShowSuccess(true)
      setShowThesis(true)
      track(Events.PREDICTION_SUBMITTED, {
        sport: 'golf',
        type: 'player_benchmark',
        direction,
        playerId: player.id,
      })
      onPredictionMade?.()
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const overPct = consensus?.breakdown?.over ?? 50
  const underPct = consensus?.breakdown?.under ?? 50
  const totalVotes = consensus?.total || 0
  const userDirection = existingPrediction?.predictionData?.direction

  return (
    <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary/80">Player Benchmark</h3>
        {totalVotes > 0 && (
          <span className="text-xs text-text-primary/40 font-mono">{totalVotes} call{totalVotes !== 1 ? 's' : ''}</span>
        )}
      </div>

      <p className="text-text-primary/60 text-sm mb-3">
        Will <span className="text-text-primary font-medium">{player.name}</span> finish with SG Total above or below their benchmark?
      </p>

      {/* Benchmark value */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-text-primary/40 text-xs uppercase tracking-wider">SG Total</span>
        <span className="text-2xl font-mono font-bold text-amber-400">
          {benchmarkValue > 0 ? '+' : ''}{benchmarkValue}
        </span>
      </div>

      {/* Consensus bar */}
      {totalVotes > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-400 font-mono">{Math.round(overPct)}% Over</span>
            <span className="text-rose-400 font-mono">{Math.round(underPct)}% Under</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--stone)] overflow-hidden flex">
            <div
              className="bg-emerald-500/70 transition-all duration-500"
              style={{ width: `${overPct}%` }}
            />
            <div
              className="bg-rose-500/70 transition-all duration-500"
              style={{ width: `${underPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Buttons or result */}
      {showSuccess ? (
        <div className="text-center py-2">
          <span className="text-emerald-400 text-sm font-medium">Call submitted!</span>
        </div>
      ) : existingPrediction ? (
        <div className="text-center py-2">
          <span className="text-text-primary/60 text-sm">Your call: </span>
          <span className={`font-mono font-bold text-sm ${userDirection === 'over' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {userDirection?.toUpperCase()}
          </span>
          {existingPrediction.outcome && existingPrediction.outcome !== 'PENDING' && (
            <span className={`ml-2 text-xs font-mono ${existingPrediction.outcome === 'CORRECT' ? 'text-emerald-400' : existingPrediction.outcome === 'INCORRECT' ? 'text-rose-400' : 'text-text-primary/40'}`}>
              {existingPrediction.outcome === 'CORRECT' ? '✓' : existingPrediction.outcome === 'INCORRECT' ? '✗' : '—'}
            </span>
          )}
        </div>
      ) : isLocked ? (
        <div className="text-center py-2">
          <span className="text-text-primary/40 text-sm">Predictions locked — tournament in progress</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSubmit('over')}
            disabled={submitting}
            className="py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            {submitting ? '...' : 'Over'}
          </button>
          <button
            onClick={() => handleSubmit('under')}
            disabled={submitting}
            className="py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/30 transition-colors disabled:opacity-50"
          >
            {submitting ? '...' : 'Under'}
          </button>
        </div>
      )}

      {/* Post-submission thesis prompt */}
      {showThesis && existingPrediction?.outcome === 'PENDING' && (
        <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
          <input
            type="text"
            maxLength={280}
            placeholder="Why do you believe this? (optional)"
            className="w-full bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-text-primary/60 placeholder-white/15 focus:outline-none focus:border-gold/30"
            autoFocus
            onBlur={e => {
              if (e.target.value.trim() && existingPrediction?.id) {
                api.updatePrediction(existingPrediction.id, { thesis: e.target.value.trim() }).catch(() => {})
              }
              setShowThesis(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.target.blur()
              if (e.key === 'Escape') setShowThesis(false)
            }}
          />
        </div>
      )}

      {/* Show thesis on resolved predictions */}
      {existingPrediction?.thesis && existingPrediction?.outcome !== 'PENDING' && (
        <div className="mt-2 px-3 py-2 bg-[var(--bg-alt)] rounded-lg border border-[var(--card-border)]">
          <p className="text-[11px] text-text-primary/30 italic">
            <svg className="w-3 h-3 inline mr-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            "{existingPrediction.thesis}"
          </p>
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-xs mt-2 text-center">{error}</p>
      )}

      {/* Weighted consensus (only show when there are predictions) */}
      {totalVotes >= 3 && (
        <WeightedConsensusBar eventId={eventId} playerId={player.id} type="player_benchmark" className="mt-3" />
      )}
    </div>
  )
}
