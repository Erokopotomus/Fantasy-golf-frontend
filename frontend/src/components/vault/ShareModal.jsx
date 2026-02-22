// Commissioner share interface — triggered post-save and from LeagueVault header.
// Copy-link sharing (generic + per-owner personalized), in-app notifications.
// Email sending deferred to Phase 2D.

import { useState, useCallback } from 'react'
import api from '../../services/api'
import RatingTierBadge from './RatingTierBadge'

export default function ShareModal({
  isOpen,
  onClose,
  leagueName,
  inviteCode,
  ownerStats = [],
  leagueStats = {},
  leagueId,
  ratings = {},
}) {
  const [copiedGeneric, setCopiedGeneric] = useState(false)
  const [copiedOwner, setCopiedOwner] = useState(null) // canonical name of last copied
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)
  const [notifyError, setNotifyError] = useState(null)

  if (!isOpen) return null

  const baseUrl = `${window.location.origin}/vault/invite/${inviteCode}`

  const copyToClipboard = useCallback(async (text, ownerName = null) => {
    try {
      await navigator.clipboard.writeText(text)
      if (ownerName) {
        setCopiedOwner(ownerName)
        setTimeout(() => setCopiedOwner(null), 2000)
      } else {
        setCopiedGeneric(true)
        setTimeout(() => setCopiedGeneric(false), 2000)
      }
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      if (ownerName) {
        setCopiedOwner(ownerName)
        setTimeout(() => setCopiedOwner(null), 2000)
      } else {
        setCopiedGeneric(true)
        setTimeout(() => setCopiedGeneric(false), 2000)
      }
    }
  }, [])

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: `${leagueName} — League Vault`,
        text: `Check out ${leagueName}'s all-time history on Clutch`,
        url: baseUrl,
      })
    } catch {
      // User cancelled — that's fine
    }
  }, [leagueName, baseUrl])

  const handleNotify = useCallback(async () => {
    setNotifying(true)
    setNotifyError(null)
    try {
      await api.sendVaultNotification(leagueId)
      setNotified(true)
    } catch (err) {
      setNotifyError(err.message || 'Failed to send notifications')
    } finally {
      setNotifying(false)
    }
  }, [leagueId])

  return (
    <>
      <style>{`
        @keyframes shareModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shareModalSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(5,7,6,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'shareModalFadeIn 0.25s ease',
        }}
      >
        {/* Panel */}
        <div
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--card-border)]"
          style={{
            background: '#0E100F',
            animation: 'shareModalSlideUp 0.3s ease',
          }}
        >
          {/* Gold glow bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }}
          />

          <div className="p-6 sm:p-7">
            {/* Success header */}
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🏆</div>
              <h2 className="text-xl sm:text-[22px] font-display font-bold text-accent-gold mb-1.5">
                League Vault Unlocked
              </h2>
              <p className="text-xs font-mono text-text-muted leading-relaxed">
                {leagueName}'s history is ready. Share it with your league.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Shareable link section */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-alt)] p-4 mb-5">
              <div className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-2.5">
                Shareable Link
              </div>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--bg-alt)] border border-[var(--card-border)] text-xs font-mono text-text-muted/60 truncate">
                  {baseUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(baseUrl)}
                  className="px-4 py-2.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 flex-shrink-0"
                  style={{
                    background: copiedGeneric ? 'rgba(107,203,119,0.12)' : '#1A1D1B',
                    color: copiedGeneric ? '#6BCB77' : '#D4A853',
                  }}
                >
                  {copiedGeneric ? '✓ Copied' : 'Copy Link'}
                </button>
                {typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="px-3 py-2.5 rounded-lg bg-[var(--bg-alt)] text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                    title="Share"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-[10px] font-mono text-text-muted/50 mt-2 leading-relaxed">
                Anyone with this link can view the league vault and claim their spot.
                Share in your group chat, text thread, or wherever your league lives.
              </p>
            </div>

            {/* Per-owner invite rows */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-alt)] p-4 mb-5">
              <div className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">
                Personalized Invites
              </div>
              <p className="text-[10px] font-mono text-text-muted/50 mb-3 leading-relaxed">
                Each link highlights the owner's stats when they open it.
              </p>
              <div className="space-y-1.5">
                {ownerStats.map((owner, idx) => {
                  const rank = idx + 1
                  const personalUrl = `${baseUrl}?member=${encodeURIComponent(owner.name)}`
                  const isCopied = copiedOwner === owner.name
                  const isClaimed = !!owner.ownerUserId

                  return (
                    <div
                      key={owner.name}
                      className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg"
                      style={{
                        background: isCopied ? 'rgba(107,203,119,0.04)' : 'transparent',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                        style={{
                          background: `${owner.color}15`,
                          border: `1.5px solid ${owner.color}50`,
                          color: owner.color,
                        }}
                      >
                        {owner.name[0]}
                      </div>

                      {/* Name + rank */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-display font-semibold text-text-primary truncate">
                            {owner.name}
                          </span>
                          {ratings[owner.name]?.tier && (
                            <RatingTierBadge tier={ratings[owner.name].tier} size="sm" />
                          )}
                          {isClaimed && (
                            <span className="text-[9px] font-mono text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded flex-shrink-0">
                              Claimed
                            </span>
                          )}
                          {!owner.isActive && (
                            <span className="text-[9px] font-mono text-text-muted bg-[var(--bg-alt)] px-1.5 py-0.5 rounded flex-shrink-0">
                              FORMER
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted">
                          #{rank} · {owner.totalWins}-{owner.totalLosses}
                        </div>
                      </div>

                      {/* Copy personalized link */}
                      <button
                        onClick={() => copyToClipboard(personalUrl, owner.name)}
                        className="px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-all duration-200 flex-shrink-0"
                        style={{
                          background: isCopied ? 'rgba(107,203,119,0.15)' : '#1A1D1B',
                          color: isCopied ? '#6BCB77' : '#D4A853',
                          border: `1px solid ${isCopied ? 'rgba(107,203,119,0.2)' : '#2A2D2B'}`,
                        }}
                      >
                        {isCopied ? '✓ Copied' : 'Copy Link'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notify league members button */}
            <button
              onClick={handleNotify}
              disabled={notifying || notified}
              className="w-full py-3 rounded-xl text-sm font-display font-bold transition-all duration-200"
              style={{
                background: notified
                  ? 'rgba(107,203,119,0.1)'
                  : 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)',
                color: notified ? '#6BCB77' : '#0A0908',
                opacity: notifying ? 0.6 : 1,
                cursor: notifying || notified ? 'default' : 'pointer',
              }}
            >
              {notifying
                ? 'Sending...'
                : notified
                  ? '✓ Notifications Sent'
                  : 'Notify League Members'}
            </button>
            {notifyError && (
              <p className="text-[10px] font-mono text-red-400 mt-1.5 text-center">{notifyError}</p>
            )}
            <p className="text-[10px] font-mono text-text-muted/40 mt-2 text-center leading-relaxed">
              {notified
                ? 'In-app notifications sent to all existing league members.'
                : 'Send an in-app notification to members already on Clutch.'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
