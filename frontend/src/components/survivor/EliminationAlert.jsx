import { useState, useEffect } from 'react'

const EliminationAlert = ({ isEliminated, eliminatedWeek, canBuyBack, onBuyBack, loading }) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isEliminated) {
      setShow(true)
    }
  }, [isEliminated])

  if (!show || !isEliminated) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[var(--surface)] rounded-xl p-6 max-w-md w-full border border-live-red/50 animate-in fade-in zoom-in duration-300">
        {/* Skull icon */}
        <div className="w-20 h-20 rounded-full bg-live-red/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-live-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold font-display text-text-primary text-center mb-2">You've Been Eliminated!</h2>
        <p className="text-text-secondary text-center mb-6">
          Your team had the lowest score in Week {eliminatedWeek} and has been eliminated from the survivor pool.
        </p>

        {canBuyBack && (
          <div className="bg-crown/10 border border-crown/30 rounded-lg p-4 mb-6">
            <h3 className="text-crown font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Buy-Back Available!
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              You have one chance to re-enter the competition. Use it wisely!
            </p>
            <button
              onClick={onBuyBack}
              disabled={loading}
              className="w-full py-2 bg-crown text-slate font-semibold rounded-lg hover:bg-crown transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Use Buy-Back'}
            </button>
          </div>
        )}

        {!canBuyBack && (
          <p className="text-center text-text-muted mb-6">
            Unfortunately, buy-backs are not available. Better luck next season!
          </p>
        )}

        <button
          onClick={() => setShow(false)}
          className="w-full py-2 bg-[var(--card-bg)] text-text-primary font-medium rounded-lg hover:bg-[var(--bg)] transition-colors"
        >
          {canBuyBack ? 'Maybe Later' : 'Close'}
        </button>
      </div>
    </div>
  )
}

export default EliminationAlert
