import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/**
 * Compact dashboard widget showing prediction streak and open calls.
 * Links to Prove It hub for deeper engagement.
 */
export default function PredictionWidget() {
  const [reputation, setReputation] = useState(null)
  const [recentPredictions, setRecentPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getMyReputation().catch(() => null),
      api.getMyPredictions({ sport: 'golf', limit: 10 }).catch(() => ({ predictions: [] })),
    ])
      .then(([rep, preds]) => {
        setReputation(rep)
        setRecentPredictions(preds.predictions || [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-[var(--stone)] rounded w-24 mb-3" />
        <div className="h-8 bg-[var(--stone)] rounded w-full" />
      </div>
    )
  }

  // Compute weekly stats from recent predictions
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekPredictions = recentPredictions.filter(p => new Date(p.createdAt) >= weekStart)
  const weekCorrect = weekPredictions.filter(p => p.outcome === 'CORRECT').length
  const weekResolved = weekPredictions.filter(p => p.outcome !== 'PENDING').length

  const allTimeRep = reputation?.find?.(r => r.sport === 'golf') || reputation?.[0] || null
  const streak = allTimeRep?.streakCurrent || 0
  const tier = allTimeRep?.tier || 'rookie'
  const accuracy = allTimeRep?.accuracyRate ? Math.round(allTimeRep.accuracyRate * 100) : 0
  const total = allTimeRep?.totalPredictions || 0

  const tierColors = {
    rookie: 'text-text-primary/60',
    contender: 'text-blue-400',
    sharp: 'text-purple-400',
    expert: 'text-amber-400',
    elite: 'text-amber-300',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary/80">Prove It</h3>
        <span className={`text-xs font-mono capitalize ${tierColors[tier] || 'text-text-primary/60'}`}>
          {tier}
        </span>
      </div>

      {total === 0 ? (
        /* First-time user — CTA to make first call */
        <div className="text-center py-2">
          <p className="text-text-primary/50 text-sm mb-3">Make your first performance call</p>
          <Link
            to="/prove-it"
            className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-text-primary text-sm font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-text-primary">{accuracy}%</div>
              <div className="text-xs text-text-primary/40">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-text-primary">{streak}</div>
              <div className="text-xs text-text-primary/40">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-text-primary">{total}</div>
              <div className="text-xs text-text-primary/40">Calls</div>
            </div>
          </div>

          {/* Weekly mini-summary */}
          {weekResolved > 0 && (
            <div className="text-center text-xs text-text-primary/50 mb-3">
              This week: <span className="text-text-primary font-mono">{weekCorrect}/{weekResolved}</span>
            </div>
          )}

          {/* CTA */}
          <Link
            to="/prove-it"
            className="block w-full py-2 text-center rounded-lg bg-[var(--bg-alt)] border border-[var(--card-border)] text-amber-400 text-sm font-medium hover:bg-[var(--stone)] transition-colors"
          >
            Make Calls
          </Link>
        </>
      )}
    </div>
  )
}
