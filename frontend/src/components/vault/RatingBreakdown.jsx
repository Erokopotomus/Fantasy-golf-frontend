// Horizontal bar chart showing each rating component's score
// Active components: filled bar + score. Inactive: lock + unlock text.

import { useState, useEffect } from 'react'

const COMPONENT_CONFIG = [
  { key: 'winRate', label: 'Win Rate Intelligence', unlockText: 'Import league history', icon: '📊' },
  { key: 'draftIQ', label: 'Draft IQ', unlockText: 'Complete a draft on Clutch', icon: '🎯' },
  { key: 'rosterMgmt', label: 'Roster Management', unlockText: 'Set lineups on Clutch', icon: '📋' },
  { key: 'predictions', label: 'Prediction Accuracy', unlockText: 'Make predictions in Prove It', icon: '🔮' },
  { key: 'tradeAcumen', label: 'Trade Acumen', unlockText: 'Coming in V2', icon: '🤝' },
  { key: 'championships', label: 'Championship Pedigree', unlockText: 'Import league history', icon: '🏆' },
  { key: 'consistency', label: 'Consistency', unlockText: 'Needs 2+ seasons of data', icon: '📈' },
]

export default function RatingBreakdown({ components, ownerColor = '#E8B84D', animate = false }) {
  const [visibleIndex, setVisibleIndex] = useState(animate ? -1 : COMPONENT_CONFIG.length)

  useEffect(() => {
    if (!animate) return
    const timers = COMPONENT_CONFIG.map((_, i) =>
      setTimeout(() => setVisibleIndex(i), 150 * (i + 1))
    )
    return () => timers.forEach(clearTimeout)
  }, [animate])

  if (!components) return null

  return (
    <div className="space-y-2.5">
      {COMPONENT_CONFIG.map(({ key, label, unlockText, icon }, i) => {
        const comp = components[key]
        const isActive = comp?.active
        const isVisible = i <= visibleIndex

        return (
          <div key={key} className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-text-primary/60 font-sans flex items-center gap-1.5">
                <span className="text-[10px]">{icon}</span>
                {label}
              </span>
              {isActive ? (
                <span className="text-xs font-mono font-semibold text-text-primary">{comp.score}</span>
              ) : (
                <span className="text-[10px] text-text-primary/30 flex items-center gap-1">
                  🔒 {unlockText}
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-[var(--stone)] overflow-hidden">
              {isActive ? (
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: isVisible ? `${comp.score}%` : '0%',
                    backgroundColor: ownerColor,
                    opacity: 0.6 + (comp.confidence / 100) * 0.4,
                  }}
                />
              ) : (
                <div className="h-full w-full opacity-10" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${ownerColor} 0px, ${ownerColor} 3px, transparent 3px, transparent 6px)` }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
