// Owner identity claim modal — opens when an authenticated user clicks "Claim Your Spot"
// on the public vault landing page. Lists unclaimed canonical owners, user picks one.

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function ClaimModal({
  isOpen,
  onClose,
  inviteCode,
  ownerStats = [],
  leagueId,
  memberParam,
}) {
  const [selectedName, setSelectedName] = useState(memberParam || null)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  // Filter to only unclaimed owners
  const unclaimedOwners = useMemo(() =>
    ownerStats.filter(o => !o.ownerUserId),
    [ownerStats]
  )

  // Pre-select memberParam if it matches an unclaimed owner
  const effectiveSelected = useMemo(() => {
    if (selectedName && unclaimedOwners.some(o => o.name === selectedName)) return selectedName
    return null
  }, [selectedName, unclaimedOwners])

  const handleClaim = useCallback(async () => {
    if (!effectiveSelected) return
    setClaiming(true)
    setError(null)
    try {
      const result = await api.claimVaultOwner(inviteCode, effectiveSelected)
      setSuccess(true)
      // Brief success animation, then navigate
      setTimeout(() => {
        navigate(`/leagues/${result.leagueId || leagueId}/vault`, { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to claim owner')
    } finally {
      setClaiming(false)
    }
  }, [effectiveSelected, inviteCode, leagueId, navigate])

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @keyframes claimFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes claimSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes claimSuccess {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(5,7,6,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'claimFadeIn 0.25s ease',
        }}
      >
        {/* Panel */}
        <div
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-dark-border"
          style={{
            background: '#0E100F',
            animation: success ? 'claimSuccess 0.4s ease' : 'claimSlideUp 0.3s ease',
          }}
        >
          {/* Gold glow bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }}
          />

          <div className="p-6 sm:p-7">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-white p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {success ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-lg font-display font-bold text-accent-gold mb-1">
                  Welcome to the Vault
                </h2>
                <p className="text-xs font-mono text-text-muted">
                  Redirecting to your league history...
                </p>
              </div>
            ) : (
              /* Selection state */
              <>
                <div className="text-center mb-5">
                  <h2 className="text-lg font-display font-bold text-accent-gold mb-1">
                    Claim Your Spot
                  </h2>
                  <p className="text-xs font-mono text-text-muted leading-relaxed">
                    Which owner are you? Select your name to link your history.
                  </p>
                </div>

                {unclaimedOwners.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs font-mono text-text-muted">
                      All owners have been claimed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 mb-5">
                    {unclaimedOwners.map((owner, idx) => {
                      const globalRank = ownerStats.findIndex(o => o.name === owner.name) + 1
                      const isSelected = effectiveSelected === owner.name
                      const winPctStr = owner.winPct != null
                        ? `${(owner.winPct * 100).toFixed(1)}%`
                        : '—'

                      return (
                        <button
                          key={owner.name}
                          onClick={() => setSelectedName(owner.name)}
                          className="w-full flex items-center gap-3 py-3 px-3.5 rounded-xl transition-all duration-200 text-left"
                          style={{
                            background: isSelected ? `${owner.color}0C` : 'transparent',
                            border: `1.5px solid ${isSelected ? `${owner.color}40` : '#1C1F1D'}`,
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-base font-display font-bold flex-shrink-0"
                            style={{
                              background: `${owner.color}15`,
                              border: `2px solid ${isSelected ? owner.color : `${owner.color}50`}`,
                              color: owner.color,
                            }}
                          >
                            {owner.name[0]}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm font-display font-bold truncate"
                                style={{ color: isSelected ? owner.color : '#E8E0D0' }}
                              >
                                {owner.name}
                              </span>
                              {!owner.isActive && (
                                <span className="text-[8px] font-mono text-text-muted bg-dark-tertiary px-1 py-0.5 rounded flex-shrink-0">
                                  FORMER
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5">
                              #{globalRank} · {owner.totalWins}-{owner.totalLosses} · {winPctStr} · {owner.seasonCount} season{owner.seasonCount !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Selection indicator */}
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                            style={{
                              borderColor: isSelected ? owner.color : '#2A2D2B',
                              background: isSelected ? owner.color : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-dark-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {error && (
                  <p className="text-[10px] font-mono text-red-400 mb-3 text-center">{error}</p>
                )}

                <button
                  onClick={handleClaim}
                  disabled={!effectiveSelected || claiming}
                  className="w-full py-3 rounded-xl text-sm font-display font-bold transition-all duration-200"
                  style={{
                    background: effectiveSelected
                      ? 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)'
                      : '#1A1D1B',
                    color: effectiveSelected ? '#0A0908' : '#5A5347',
                    opacity: claiming ? 0.6 : 1,
                    cursor: effectiveSelected && !claiming ? 'pointer' : 'default',
                  }}
                >
                  {claiming ? 'Claiming...' : `Claim as ${effectiveSelected || '...'}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
