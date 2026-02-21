// Expandable card for a single Clutch Rating V2 component
// Shows score bar, confidence, "what feeds this" bullets, "how to improve" action links

import { useState } from 'react'
import { Link } from 'react-router-dom'

const COMPONENT_META = {
  winRate: {
    label: 'Win Rate Intelligence',
    weight: '20%',
    icon: '📊',
    feedsFrom: [
      'Career and recent win percentage',
      'Points for vs. league average',
      'Playoff appearance rate',
    ],
    improve: [
      { text: 'Import league history', link: '/import' },
      { text: 'View League Vault', link: '/vault' },
    ],
    labConnection: null,
  },
  draftIQ: {
    label: 'Draft IQ',
    weight: '18%',
    icon: '🎯',
    feedsFrom: [
      'Draft grades from completed drafts',
      'Early-round hit rate',
      'Late-round steals found',
    ],
    improve: [
      { text: 'Build a draft board in The Lab', link: '/lab' },
      { text: 'Run a mock draft', link: '/mock-draft' },
    ],
    labConnection: 'Lab boards and mock drafts feed this score',
  },
  rosterMgmt: {
    label: 'Roster Management',
    weight: '18%',
    icon: '📋',
    feedsFrom: [
      'Optimal lineup percentage',
      'Bench efficiency (points left on bench)',
      'Weekly engagement and roster activity',
    ],
    improve: [
      { text: 'Set lineups in your leagues', link: '/leagues' },
      { text: 'Use Lab boards for roster planning', link: '/lab' },
    ],
    labConnection: 'Lab research improves lineup decisions',
  },
  predictions: {
    label: 'Prediction Accuracy',
    weight: '15%',
    icon: '🔮',
    feedsFrom: [
      'Recency-weighted accuracy (90-day decay)',
      'Performance across prediction categories',
      'Consistency of calls over time',
    ],
    improve: [
      { text: 'Make predictions in Prove It', link: '/prove-it' },
    ],
    labConnection: null,
  },
  tradeAcumen: {
    label: 'Trade Acumen',
    weight: '12%',
    icon: '🤝',
    feedsFrom: [
      'Trade win rate vs. league peers',
      'Trade volume and frequency',
      'Post-trade performance of acquired players',
    ],
    improve: [
      { text: 'Propose trades in your leagues', link: '/leagues' },
    ],
    labConnection: null,
    deferred: true,
  },
  championships: {
    label: 'Championship Pedigree',
    weight: '10%',
    icon: '🏆',
    feedsFrom: [
      'Championship title rate',
      'Playoff win percentage',
      'Runner-up bonus credit',
    ],
    improve: [
      { text: 'Import league history', link: '/import' },
    ],
    labConnection: null,
  },
  consistency: {
    label: 'Consistency',
    weight: '7%',
    icon: '📈',
    feedsFrom: [
      'Low variance in seasonal finishes',
      'Avoidance of long losing streaks',
      'Upward improvement trend over time',
    ],
    improve: [
      { text: 'Play 2+ seasons on Clutch', link: null },
    ],
    labConnection: null,
  },
}

export default function RatingComponentCard({ componentKey, componentData, ownerColor = '#E8B84D' }) {
  const [expanded, setExpanded] = useState(false)
  const meta = COMPONENT_META[componentKey]
  if (!meta) return null

  const isActive = componentData?.active
  const score = componentData?.score ?? 0
  const confidence = componentData?.confidence ?? 0

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        expanded ? 'border-white/[0.12] bg-dark-secondary/80' : 'border-[var(--card-border)] bg-dark-secondary/60'
      } ${meta.deferred && !isActive ? 'opacity-50' : ''}`}
    >
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-base shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{meta.label}</span>
              <span className="text-[10px] font-mono text-text-primary/30">{meta.weight}</span>
            </div>
            {isActive ? (
              <span className="text-sm font-mono font-bold text-text-primary">{score}</span>
            ) : (
              <span className="text-[10px] font-mono text-text-primary/30">
                {meta.deferred ? 'Coming Soon' : 'Locked'}
              </span>
            )}
          </div>
          {/* Score bar */}
          <div className="h-1.5 rounded-full bg-dark-tertiary/5 overflow-hidden">
            {isActive ? (
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${score}%`,
                  backgroundColor: ownerColor,
                  opacity: 0.6 + (confidence / 100) * 0.4,
                }}
              />
            ) : (
              <div
                className="h-full w-full opacity-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${ownerColor} 0px, ${ownerColor} 3px, transparent 3px, transparent 6px)`,
                }}
              />
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-text-primary/30 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--card-border)] pt-3">
          {/* Confidence indicator */}
          {isActive && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-primary/40">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 rounded-full bg-dark-tertiary/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      confidence >= 70 ? 'bg-green-400/60' : confidence >= 40 ? 'bg-yellow-400/60' : 'bg-dark-tertiary/20'
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="font-mono text-text-primary/30">{confidence}%</span>
              </div>
            </div>
          )}

          {/* What feeds this score */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-primary/25 mb-1.5">
              What feeds this score
            </p>
            <ul className="space-y-1">
              {meta.feedsFrom.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-primary/50">
                  <span className="text-text-primary/20 mt-0.5 shrink-0">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* How to improve */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-primary/25 mb-1.5">
              How to improve
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta.improve.map((action, i) =>
                action.link ? (
                  <Link
                    key={i}
                    to={action.link}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent-gold/10 text-accent-gold border border-accent-gold/15 hover:bg-accent-gold/20 transition-colors"
                  >
                    {action.text}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-dark-tertiary/[0.04] text-text-primary/40"
                  >
                    {action.text}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Lab connection callout */}
          {meta.labConnection && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/[0.06] border border-purple-400/10">
              <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span className="text-[11px] text-purple-300/70">{meta.labConnection}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
