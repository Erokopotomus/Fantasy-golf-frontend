import { useState } from 'react'

const BuyBackModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [confirmed, setConfirmed] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-dark-secondary rounded-xl p-6 max-w-md w-full border border-yellow-500/50">
        {/* Warning icon */}
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold font-display text-text-primary text-center mb-2">
          {confirmed ? 'Confirm Buy-Back' : 'Use Your Buy-Back?'}
        </h2>

        {!confirmed ? (
          <>
            <p className="text-text-secondary text-center mb-6">
              You only get <span className="text-yellow-400 font-semibold">one buy-back</span> per season. Are you sure you want to use it now?
            </p>

            <div className="bg-dark-tertiary rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-text-secondary mb-2">Things to consider:</h4>
              <ul className="text-xs text-text-muted space-y-1">
                <li>- You'll re-enter with your current point total</li>
                <li>- You can still be eliminated again</li>
                <li>- No more buy-backs will be available</li>
                <li>- Strategic timing can be crucial</li>
              </ul>
            </div>
          </>
        ) : (
          <p className="text-text-secondary text-center mb-6">
            Click confirm to use your buy-back and re-enter the competition.
            <span className="block text-yellow-400 font-semibold mt-2">This action cannot be undone.</span>
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 bg-dark-tertiary text-text-primary font-medium rounded-lg hover:bg-dark-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2 font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              confirmed
                ? 'bg-gold text-text-primary hover:bg-gold/90'
                : 'bg-yellow-500 text-slate hover:bg-yellow-400'
            }`}
          >
            {loading ? 'Processing...' : confirmed ? 'Confirm' : 'Use Buy-Back'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuyBackModal
