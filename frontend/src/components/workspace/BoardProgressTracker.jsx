import { useState } from 'react'

const STEPS = [
  {
    key: 'rank',
    label: 'Rank',
    description: 'Move 5+ players from their baseline positions',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    key: 'tag',
    label: 'Tag',
    description: 'Tag 3+ players as Target, Sleeper, or Avoid',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    key: 'tier',
    label: 'Tier',
    description: 'Insert at least 1 tier break between groups',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Write a note on at least 1 player',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    key: 'sheet',
    label: 'Sheet',
    description: 'Generate your printable cheat sheet',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

function computeCompletion(entries, cheatSheetGenerated) {
  const completed = {}

  // Rank: 5+ players moved from baseline
  const movedCount = entries.filter(e => e.baselineRank != null && e.baselineRank !== (entries.indexOf(e) + 1)).length
  completed.rank = movedCount >= 5

  // Tag: 3+ players tagged
  const taggedCount = entries.filter(e => e.tags && e.tags.length > 0).length
  completed.tag = taggedCount >= 3

  // Tier: at least 1 custom tier break (more than just auto-assigned tiers)
  const tiers = new Set(entries.filter(e => e.tier != null).map(e => e.tier))
  completed.tier = tiers.size >= 2

  // Notes: 1+ note written
  completed.notes = entries.some(e => e.notes && e.notes.trim().length > 0)

  // Sheet: cheat sheet generated
  completed.sheet = !!cheatSheetGenerated

  return completed
}

export default function BoardProgressTracker({ entries, cheatSheetGenerated }) {
  const [expanded, setExpanded] = useState(false)
  const completed = computeCompletion(entries, cheatSheetGenerated)
  const completedCount = STEPS.filter(s => completed[s.key]).length

  // Find the next incomplete step for the nudge
  const nextStep = STEPS.find(s => !completed[s.key])

  return (
    <div className="px-4 py-2 border-b border-[var(--card-border)] bg-[var(--surface)]">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3"
      >
        <div className="flex items-center gap-1.5">
          {STEPS.map(step => (
            <div
              key={step.key}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                completed[step.key]
                  ? 'bg-[var(--crown)]'
                  : 'bg-[var(--stone)]'
              }`}
              title={`${step.label}: ${completed[step.key] ? 'Complete' : 'Incomplete'}`}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-[var(--text-2)]">
          {completedCount} of {STEPS.length}
        </span>
        {nextStep && !expanded && (
          <span className="text-[10px] text-[var(--text-3)] ml-auto">
            Next: {nextStep.label}
          </span>
        )}
        <svg
          className={`w-3 h-3 text-[var(--text-3)] ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 pb-1">
          {STEPS.map(step => (
            <div key={step.key} className="flex items-center gap-2">
              <div className={`shrink-0 ${completed[step.key] ? 'text-[var(--crown)]' : 'text-[var(--text-3)]'}`}>
                {step.icon}
              </div>
              <span className={`text-[11px] font-medium ${completed[step.key] ? 'text-[var(--text-1)] line-through opacity-50' : 'text-[var(--text-1)]'}`}>
                {step.label}
              </span>
              <span className={`text-[10px] ${completed[step.key] ? 'text-[var(--text-3)] line-through opacity-50' : 'text-[var(--text-3)]'}`}>
                — {step.description}
              </span>
              {completed[step.key] && (
                <svg className="w-3 h-3 text-[var(--crown)] ml-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
