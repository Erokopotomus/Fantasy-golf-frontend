import { useState } from 'react'

const KEY_FACTORS = [
  'MATCHUP', 'TRENDING_UP', 'TRENDING_DOWN', 'INJURY_RELATED', 'WEATHER',
  'COACHING_CHANGE', 'TARGET_SHARE', 'USAGE_INCREASE', 'REVENGE_GAME',
  'CONTRACT_YEAR', 'ROOKIE_BREAKOUT', 'AGING_DECLINE', 'SCHEDULE_SPOT',
  'DIVISIONAL_GAME', 'PRIME_TIME', 'GUT_FEELING', 'COMMUNITY_CONSENSUS',
  'CONTRARIAN', 'HISTORICAL_PATTERN', 'RECENT_FILM',
]

const FACTOR_LABELS = {
  MATCHUP: 'Matchup',
  TRENDING_UP: 'Trending Up',
  TRENDING_DOWN: 'Trending Down',
  INJURY_RELATED: 'Injury',
  WEATHER: 'Weather',
  COACHING_CHANGE: 'Coaching',
  TARGET_SHARE: 'Target Share',
  USAGE_INCREASE: 'Usage Up',
  REVENGE_GAME: 'Revenge Game',
  CONTRACT_YEAR: 'Contract Year',
  ROOKIE_BREAKOUT: 'Rookie Breakout',
  AGING_DECLINE: 'Aging/Decline',
  SCHEDULE_SPOT: 'Schedule Spot',
  DIVISIONAL_GAME: 'Divisional',
  PRIME_TIME: 'Prime Time',
  GUT_FEELING: 'Gut Feeling',
  COMMUNITY_CONSENSUS: 'Consensus',
  CONTRARIAN: 'Contrarian',
  HISTORICAL_PATTERN: 'History',
  RECENT_FILM: 'Recent Film',
}

const CONFIDENCE_LABELS = ['', 'Low', 'Lean', 'Confident', 'Strong', 'Lock']

export default function BackYourCall({ onChange, sport = 'golf', compact = false }) {
  const [expanded, setExpanded] = useState(false)
  const [thesis, setThesis] = useState('')
  const [confidenceLevel, setConfidenceLevel] = useState(null)
  const [selectedFactors, setSelectedFactors] = useState([])

  const notify = (t, c, f) => {
    onChange?.({
      thesis: t || null,
      confidenceLevel: c,
      keyFactors: f.length > 0 ? f : null,
    })
  }

  const toggleFactor = (factor) => {
    const next = selectedFactors.includes(factor)
      ? selectedFactors.filter(f => f !== factor)
      : [...selectedFactors, factor]
    setSelectedFactors(next)
    notify(thesis, confidenceLevel, next)
  }

  const handleThesisChange = (val) => {
    setThesis(val)
    notify(val, confidenceLevel, selectedFactors)
  }

  const handleConfidence = (val) => {
    const next = confidenceLevel === val ? null : val
    setConfidenceLevel(next)
    notify(thesis, next, selectedFactors)
  }

  // Sport-aware factor subset — show more relevant ones first
  const relevantFactors = sport === 'nfl'
    ? KEY_FACTORS.filter(f => !['WEATHER'].includes(f)) // weather shown separately for NFL
    : KEY_FACTORS.filter(f => !['TARGET_SHARE', 'USAGE_INCREASE', 'COACHING_CHANGE', 'DIVISIONAL_GAME', 'PRIME_TIME', 'REVENGE_GAME', 'CONTRACT_YEAR'].includes(f))

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mt-2 py-1.5 text-[11px] text-text-primary/30 hover:text-text-primary/50 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Back your call (optional)
      </button>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-stone/20 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-primary/40 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Back your call
        </span>
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setThesis('')
            setConfidenceLevel(null)
            setSelectedFactors([])
            notify('', null, [])
          }}
          className="text-[10px] text-text-primary/20 hover:text-text-primary/40 transition-colors"
        >
          collapse
        </button>
      </div>

      {/* Thesis */}
      <div>
        <textarea
          value={thesis}
          onChange={e => handleThesisChange(e.target.value.slice(0, 280))}
          placeholder="Why do you believe this? Optional but helps your future self..."
          rows={2}
          className="w-full bg-dark-tertiary/[0.04] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs text-text-primary/80 placeholder-text-muted focus:outline-none focus:border-gold/30 resize-none"
        />
        <div className="text-right text-[9px] text-text-primary/15 mt-0.5">{thesis.length}/280</div>
      </div>

      {/* Confidence */}
      <div>
        <div className="text-[10px] text-text-primary/30 mb-1.5">Confidence</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => handleConfidence(level)}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                confidenceLevel === level
                  ? level <= 2 ? 'bg-dark-tertiary/15 text-text-primary/70'
                    : level <= 3 ? 'bg-gold/20 text-gold'
                    : 'bg-gold/30 text-gold font-bold'
                  : 'bg-dark-tertiary/[0.04] text-text-primary/25 hover:text-text-primary/40'
              }`}
            >
              {CONFIDENCE_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      {/* Key Factors */}
      {!compact && (
        <div>
          <div className="text-[10px] text-text-primary/30 mb-1.5">Key factors</div>
          <div className="flex flex-wrap gap-1">
            {relevantFactors.map(factor => (
              <button
                key={factor}
                type="button"
                onClick={() => toggleFactor(factor)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  selectedFactors.includes(factor)
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-dark-tertiary/[0.04] text-text-primary/25 border border-transparent hover:text-text-primary/40'
                }`}
              >
                {FACTOR_LABELS[factor]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { KEY_FACTORS, FACTOR_LABELS, CONFIDENCE_LABELS }
