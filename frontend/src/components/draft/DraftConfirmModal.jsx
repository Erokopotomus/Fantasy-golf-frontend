import { useState, useEffect } from 'react'

const DraftConfirmModal = ({ isOpen, player, currentPick, onConfirm, onCancel, isLoading }) => {
  if (!isOpen || !player) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-lg shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gold/20 to-gold/10 border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="text-xl font-bold font-display text-text-primary">
            Draft Player?
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Player Card */}
          <div className="flex items-start gap-4 p-4 bg-[var(--bg)] rounded-lg border border-[var(--card-border)]">
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt={player.name}
                className="w-16 h-16 rounded-lg object-cover bg-[var(--bg-alt)] flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center flex-shrink-0 text-3xl">
                {player.countryFlag || '🏌️'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary text-lg truncate">
                {player.name}
              </h3>
              <p className="text-text-secondary text-sm">
                Rank #{player.rank || player.owgrRank || '—'}
              </p>
              {player.primaryTour && (
                <span className={`inline-block mt-2 text-[9px] px-2 py-1 rounded font-medium ${
                  player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                  player.primaryTour === 'LIV' ? 'bg-live-red/20 text-live-red' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {player.primaryTour}
                </span>
              )}
            </div>
          </div>

          {/* Pick Info */}
          {currentPick && (
            <div className="text-center py-3 px-4 bg-[var(--bg)] rounded-lg border border-gold/20">
              <p className="text-text-secondary text-sm">
                Round <span className="font-semibold text-gold">{currentPick.round}</span>, Pick #{<span className="font-semibold text-gold">{currentPick.pick}</span>)
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 bg-[var(--bg)] border-t border-[var(--card-border)]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[var(--card-border)] rounded-lg text-text-primary font-medium hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gold text-text-primary rounded-lg font-semibold hover:bg-gold/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-text-primary/30 border-t-text-primary rounded-full animate-spin" />
            )}
            {isLoading ? 'Drafting...' : 'Confirm Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DraftConfirmModal
