/**
 * WeightedConsensusBar — Shows raw vs Clutch-Rating-weighted consensus
 *
 * Two bars: raw consensus % and Clutch-Rating-weighted %
 * Label: "8 of 10 top managers agree: OVER"
 */

import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function WeightedConsensusBar({ eventId, playerId, type = 'player_benchmark', className = '' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !playerId) {
      setLoading(false)
      return
    }

    api.getWeightedConsensus(eventId, playerId, type)
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [eventId, playerId, type])

  if (loading) {
    return <div className={`h-16 bg-[var(--stone)] rounded-lg animate-pulse ${className}`} />
  }

  if (!data || data.total === 0) return null

  const rawOver = data.rawConsensus?.over || 0
  const rawUnder = data.rawConsensus?.under || 0
  const weightedOver = data.weightedConsensus?.over || 0
  const weightedUnder = data.weightedConsensus?.under || 0

  return (
    <div className={`bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-lg p-3 ${className}`}>
      <div className="text-xs text-text-primary/40 font-mono uppercase tracking-wider mb-2">
        Community Consensus ({data.total} calls)
      </div>

      {/* Raw consensus bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-emerald-400 font-mono">OVER {rawOver}%</span>
          <span className="text-text-primary/30 text-[10px]">Raw</span>
          <span className="text-rose-400 font-mono">UNDER {rawUnder}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--stone)] overflow-hidden flex">
          <div
            className="h-full bg-emerald-500/60 transition-all"
            style={{ width: `${rawOver}%` }}
          />
          <div
            className="h-full bg-rose-500/60 transition-all"
            style={{ width: `${rawUnder}%` }}
          />
        </div>
      </div>

      {/* Weighted consensus bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-emerald-400 font-mono">OVER {weightedOver}%</span>
          <span className="text-amber-400 text-[10px]">Weighted</span>
          <span className="text-rose-400 font-mono">UNDER {weightedUnder}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--stone)] overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${weightedOver}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all"
            style={{ width: `${weightedUnder}%` }}
          />
        </div>
      </div>

      {/* Top manager agreement */}
      {data.topManagerAgreement && (
        <p className="text-xs text-amber-400/80 font-mono mt-1">
          {data.topManagerAgreement.label}
        </p>
      )}
    </div>
  )
}
