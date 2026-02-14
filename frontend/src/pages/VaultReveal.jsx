// VaultReveal — Standalone vault page with dual-mode support.
// First visit: loading screen → animated reveal → CTA to view full vault
// Returning visit: instant display with Active Only filter + live season indicators
//
// Mode detection: uses localStorage flag per league (hasSeenVaultReveal_{leagueId})
// The assignment wizard sets this flag after save completes.

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useVaultStats } from '../hooks/useVaultStats'
import VaultLoadingScreen from '../components/vault/VaultLoadingScreen'
import VaultRevealView from '../components/vault/VaultRevealView'
import VaultPersistent from '../components/vault/VaultPersistent'

const SEEN_KEY = (leagueId) => `hasSeenVaultReveal_${leagueId}`

export default function VaultReveal() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { ownerStats, leagueStats, hasLiveSeason, loading, error } = useVaultStats(leagueId)

  // Determine mode: first-visit (animated) vs returning (instant)
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    try {
      return !localStorage.getItem(SEEN_KEY(leagueId))
    } catch {
      return true
    }
  })

  // First-visit phase transitions: loading → reveal → cards visible
  const [phase, setPhase] = useState(isFirstVisit ? 'loading' : 'reveal')
  const [showCards, setShowCards] = useState(!isFirstVisit)

  useEffect(() => {
    if (!isFirstVisit) return
    const t1 = setTimeout(() => setPhase('reveal'), 2400)
    const t2 = setTimeout(() => setShowCards(true), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isFirstVisit])

  // Mark as seen after first reveal completes
  useEffect(() => {
    if (isFirstVisit && showCards) {
      try {
        localStorage.setItem(SEEN_KEY(leagueId), 'true')
      } catch { /* ignore storage errors */ }
    }
  }, [isFirstVisit, showCards, leagueId])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-mono text-text-muted">Loading vault data...</div>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-red-400 text-sm font-mono mb-4">Failed to load vault data</div>
        <p className="text-xs text-text-muted mb-6">{error}</p>
        <Link
          to={`/leagues/${leagueId}/vault`}
          className="text-xs font-mono text-accent-gold hover:underline"
        >
          &larr; Back to League Vault
        </Link>
      </div>
    )
  }

  // ── No data state ──
  if (!ownerStats || ownerStats.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-lg font-display font-bold text-text-primary mb-2">No Owner Data</div>
        <p className="text-sm font-mono text-text-muted mb-6">
          Complete the owner assignment process first to generate vault rankings.
        </p>
        <Link
          to={`/leagues/${leagueId}/vault/assign-owners`}
          className="text-xs font-mono text-accent-gold hover:underline"
        >
          Go to Owner Assignment &rarr;
        </Link>
      </div>
    )
  }

  // ── First Visit: Loading Phase ──
  if (isFirstVisit && phase === 'loading') {
    return <VaultLoadingScreen seasonCount={leagueStats.totalSeasons} />
  }

  // ── First Visit: Reveal Phase ──
  if (isFirstVisit) {
    return (
      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            to={`/leagues/${leagueId}/vault`}
            className="text-xs font-mono text-text-muted hover:text-accent-gold mb-5 flex items-center gap-1.5 transition-colors inline-flex"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League Vault
          </Link>

          <VaultRevealView
            ownerStats={ownerStats}
            leagueStats={leagueStats}
            showCards={showCards}
          >
            {/* Bottom CTA — view full vault */}
            <div className="text-xs font-mono text-text-muted mb-4 leading-relaxed">
              Your league history is now unified. Explore the full vault for<br className="hidden sm:block" />
              head-to-head records, season timelines, and more.
            </div>
            <Link
              to={`/leagues/${leagueId}/vault`}
              className="inline-block px-10 py-3.5 rounded-xl text-sm font-display font-bold tracking-wide transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)',
                color: '#0A0908',
                boxShadow: '0 6px 30px rgba(212,168,83,0.25)',
              }}
            >
              Explore Your League Vault
            </Link>
          </VaultRevealView>
        </div>
      </div>
    )
  }

  // ── Returning Visit: Instant Persistent Mode ──
  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          to={`/leagues/${leagueId}/vault`}
          className="text-xs font-mono text-text-muted hover:text-accent-gold mb-5 flex items-center gap-1.5 transition-colors inline-flex"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League Vault
        </Link>

        <VaultPersistent
          ownerStats={ownerStats}
          leagueStats={leagueStats}
          hasLiveSeason={hasLiveSeason}
        />
      </div>
    </div>
  )
}
