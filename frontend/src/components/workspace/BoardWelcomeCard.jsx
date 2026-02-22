import { useState, useEffect } from 'react'

export default function BoardWelcomeCard({ boardId, sport, movedEntry, onDismiss }) {
  const storageKey = `lab-welcome-dismissed-${boardId}`
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey))

  // Auto-dismiss on first player move
  useEffect(() => {
    if (movedEntry && visible) {
      dismiss()
    }
  }, [movedEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(storageKey, '1')
    onDismiss?.()
  }

  if (!visible) return null

  const rankingName = sport === 'golf' ? 'Clutch Golf Rankings' : 'Clutch NFL Rankings'

  return (
    <div className="mx-3 mt-3 mb-1 bg-[var(--surface-alt)] border border-[var(--card-border)] rounded-lg p-4 animate-fadeIn">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--crown)]/15 flex items-center justify-center">
          <svg className="w-4.5 h-4.5 text-[var(--crown)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-display font-bold text-[var(--text-1)] mb-1">Your Draft Board is Ready</h3>
          <p className="text-sm text-[var(--text-2)] leading-relaxed mb-3">
            200 players ranked by {rankingName}. This is your starting point — not the finish line.
          </p>
          <div className="space-y-1.5 mb-3">
            <p className="text-[11px] text-[var(--text-2)]"><span className="text-[var(--text-1)] font-medium">1.</span> Scroll through and drag players you disagree with</p>
            <p className="text-[11px] text-[var(--text-2)]"><span className="text-[var(--text-1)] font-medium">2.</span> Tag your conviction picks — TARGET / SLEEPER / AVOID</p>
            <p className="text-[11px] text-[var(--text-2)]"><span className="text-[var(--text-1)] font-medium">3.</span> Add notes on players you have strong takes on</p>
            <p className="text-[11px] text-[var(--text-2)]"><span className="text-[var(--text-1)] font-medium">4.</span> Generate your Cheat Sheet when ready</p>
          </div>
          <p className="text-[10px] text-[var(--text-3)] mb-3">The more you customize, the smarter your AI coaching gets.</p>
          <button
            onClick={dismiss}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--crown)]/10 text-[var(--crown)] hover:bg-[var(--crown)]/20 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}
