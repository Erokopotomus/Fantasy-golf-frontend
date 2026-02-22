// Public vault invite landing page — no auth required.
// URL: /vault/invite/:inviteCode?member=OwnerName
// Shows league stats + all-time standings with optional personalized hero.
// CTA: Claim your spot (sign up / claim owner / view vault).

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { computeVaultStats } from '../hooks/useVaultStats'
import api from '../services/api'
import ClutchLogo from '../components/common/ClutchLogo'
import Sparkline from '../components/vault/Sparkline'
import StatGrid from '../components/vault/StatGrid'
import OwnerRow from '../components/vault/OwnerRow'
import OwnerDetailModal from '../components/vault/OwnerDetailModal'
import ClaimModal from '../components/vault/ClaimModal'
import RatingRing from '../components/vault/RatingRing'
import RatingTierBadge from '../components/vault/RatingTierBadge'

export default function VaultPublicLanding() {
  const { inviteCode } = useParams()
  const [searchParams] = useSearchParams()
  const memberParam = searchParams.get('member')
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [leagueData, setLeagueData] = useState(null)
  const [currentUserClaim, setCurrentUserClaim] = useState(null)

  // Modal state
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [showClaimModal, setShowClaimModal] = useState(false)

  // Fetch data
  useEffect(() => {
    if (!inviteCode) return
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getPublicVaultData(inviteCode)
        if (cancelled) return
        setLeagueData(data)
        setCurrentUserClaim(data.currentUserClaim || null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'League not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [inviteCode])

  // Compute vault stats from raw data
  const { ownerStats, leagueStats } = useMemo(() => {
    if (!leagueData?.seasons) return { ownerStats: [], leagueStats: {} }
    return computeVaultStats(leagueData.seasons, leagueData.aliases)
  }, [leagueData])

  // Ratings map from league data (if computed)
  const ratings = useMemo(() => leagueData?.ratings || {}, [leagueData])

  // Find the personalized member
  const memberOwner = useMemo(() => {
    if (!memberParam || !ownerStats.length) return null
    const decoded = decodeURIComponent(memberParam)
    return ownerStats.find(o => o.name.toLowerCase() === decoded.toLowerCase()) || null
  }, [memberParam, ownerStats])

  const memberRank = useMemo(() => {
    if (!memberOwner) return null
    return ownerStats.findIndex(o => o.name === memberOwner.name) + 1
  }, [memberOwner, ownerStats])

  // CTA logic
  const handleCTA = () => {
    if (!user) {
      // Not logged in → send to signup with return path
      navigate('/signup', {
        state: { from: { pathname: `/vault/invite/${inviteCode}${memberParam ? `?member=${encodeURIComponent(memberParam)}` : ''}` } },
      })
    } else if (currentUserClaim) {
      // Already claimed → go to vault
      navigate(`/leagues/${leagueData.league.id}/vault`)
    } else {
      // Logged in, not claimed → open claim modal
      setShowClaimModal(true)
    }
  }

  const ctaText = !user
    ? 'Claim Your Spot'
    : currentUserClaim
      ? 'View Your Full History'
      : 'Claim Your Spot'

  const ctaSubtext = !user
    ? 'Free account · Takes 30 seconds'
    : currentUserClaim
      ? `You're linked as ${currentUserClaim.canonicalName}`
      : 'Select your owner identity to link your history'

  // ─── Loading / Error States ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent-gold"
              style={{ animation: `vaultDotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <style>{`
          @keyframes vaultDotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-lg font-display font-bold text-text-primary mb-2">
            Vault Not Found
          </h1>
          <p className="text-xs font-mono text-text-muted mb-6">{error}</p>
          <Link
            to="/"
            className="text-xs font-mono text-accent-gold hover:text-accent-gold/80 transition-colors"
          >
            Go to Clutch →
          </Link>
        </div>
      </div>
    )
  }

  const league = leagueData?.league

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div
        className="border-b border-[var(--card-border)] px-4 sm:px-6 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #111413, #0E100F)' }}
      >
        <Link to="/" className="flex items-center gap-2">
          <ClutchLogo size={28} className="rounded-md" />
          <span className="text-base font-display font-extrabold text-accent-gold tracking-tight">
            CLUTCH
          </span>
        </Link>
        <div className="flex gap-2">
          {!user ? (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-md border border-[var(--card-border)] text-[11px] font-mono font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Log In
              </Link>
              <button
                onClick={handleCTA}
                className="px-3.5 py-1.5 rounded-md text-[11px] font-mono font-bold bg-accent-gold text-slate hover:bg-accent-gold/90 transition-colors"
              >
                Sign Up Free
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-text-muted">{user.name || user.email}</span>
              <div className="w-7 h-7 rounded-lg bg-accent-gold/15 border border-accent-gold/40 flex items-center justify-center text-xs font-display font-bold text-accent-gold">
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        {/* League hero */}
        <div className="text-center mb-8">
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">
            You've been invited to
          </div>
          <h1 className="text-2xl sm:text-[30px] font-display font-bold text-accent-gold mb-1.5">
            {league?.name || 'League Vault'}
          </h1>
          <div className="text-xs font-mono text-text-muted">
            {leagueStats.totalSeasons} season{leagueStats.totalSeasons !== 1 ? 's' : ''} · {leagueStats.totalOwners} owner{leagueStats.totalOwners !== 1 ? 's' : ''} · Est. {ownerStats.length > 0 ? Math.min(...ownerStats.flatMap(o => (o.teams || []).map(t => t.seasonYear)).filter(Boolean)) : '—'}
          </div>
        </div>

        {/* Personalized hero card */}
        {memberOwner && (
          <div
            className="relative rounded-2xl overflow-hidden mb-8"
            style={{
              background: `${memberOwner.color}06`,
              border: `1px solid ${memberOwner.color}20`,
            }}
          >
            {/* Top glow */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${memberOwner.color}, transparent)` }}
            />

            <div className="p-6 sm:p-8 text-center">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-xl mx-auto mb-3.5 flex items-center justify-center text-2xl font-display font-bold"
                style={{
                  background: `${memberOwner.color}18`,
                  border: `2px solid ${memberOwner.color}`,
                  color: memberOwner.color,
                }}
              >
                {memberOwner.name[0]}
              </div>

              <div
                className="text-xl sm:text-[22px] font-display font-bold mb-0.5"
                style={{ color: memberOwner.color }}
              >
                {memberOwner.name}
              </div>
              <div className="text-xs font-mono text-text-muted mb-5">
                #{memberRank} All-Time · {memberOwner.seasonCount} Season{memberOwner.seasonCount !== 1 ? 's' : ''}
              </div>

              {/* Stat row */}
              <div className="flex justify-center gap-7 sm:gap-10 mb-5">
                {[
                  { label: 'Record', value: `${memberOwner.totalWins}-${memberOwner.totalLosses}` },
                  { label: 'Win %', value: `${(memberOwner.winPct * 100).toFixed(1)}%` },
                  { label: 'Titles', value: memberOwner.titles > 0 ? `${memberOwner.titles}x 🏆` : '0' },
                  { label: 'Points For', value: memberOwner.totalPF.toLocaleString() },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-lg sm:text-xl font-mono font-bold text-text-primary">{s.value}</div>
                    <div className="text-[9px] font-mono text-text-muted uppercase tracking-wide mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Sparkline */}
              {memberOwner.winPcts && memberOwner.winPcts.length >= 2 && (
                <div className="max-w-[300px] mx-auto">
                  <Sparkline data={memberOwner.winPcts} color={memberOwner.color} width={280} height={36} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-mono text-text-muted/50">First Season</span>
                    <span className="text-[9px] font-mono text-text-muted/50">Latest</span>
                  </div>
                </div>
              )}

              {/* Clutch Rating display */}
              {ratings[memberOwner.name] && (
                <div className="flex items-center justify-center gap-3 mt-5 pt-5 border-t border-[var(--card-border)]">
                  <RatingRing
                    rating={ratings[memberOwner.name].overall}
                    confidence={ratings[memberOwner.name].confidence}
                    tier={ratings[memberOwner.name].tier}
                    size="md"
                    animate={false}
                  />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-mono font-bold text-text-primary">{ratings[memberOwner.name].overall}</span>
                      <RatingTierBadge tier={ratings[memberOwner.name].tier} size="sm" />
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">Clutch Rating</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* League stats bar */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Seasons', value: leagueStats.totalSeasons },
            { label: 'Owners', value: leagueStats.totalOwners },
            { label: 'Games', value: (leagueStats.totalGames || 0).toLocaleString() },
            { label: 'Total Points', value: (leagueStats.totalPoints || 0).toLocaleString() },
            { label: 'Titles', value: leagueStats.totalTitles },
          ].map(s => (
            <div key={s.label} className="text-center py-3 rounded-xl bg-[var(--surface)] border border-[var(--card-border)]">
              <div className="text-base sm:text-lg font-mono font-bold text-text-primary">{s.value}</div>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* All-Time Standings */}
        <div className="mb-8">
          <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-3">
            All-Time Standings
          </div>
          <div className="space-y-2">
            {ownerStats.map((owner, idx) => {
              const isHighlighted = memberOwner && owner.name === memberOwner.name
              return (
                <div
                  key={owner.name}
                  className="relative"
                  style={isHighlighted ? {
                    boxShadow: `0 0 0 1px ${memberOwner.color}25, 0 0 20px ${memberOwner.color}08`,
                    borderRadius: 12,
                  } : undefined}
                >
                  <OwnerRow
                    owner={owner}
                    rank={idx + 1}
                    isLeader={idx === 0}
                    onClick={() => setSelectedOwner({ owner, rank: idx + 1 })}
                    animate={false}
                    showCards={true}
                    rating={ratings[owner.name] || null}
                  />
                  {/* "You" badge for highlighted member */}
                  {isHighlighted && (
                    <div
                      className="absolute top-2 right-2 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        background: `${memberOwner.color}15`,
                        color: memberOwner.color,
                        border: `1px solid ${memberOwner.color}30`,
                      }}
                    >
                      ← You
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Blurred teaser sections */}
        <div className="relative mb-6">
          <div
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5"
            style={{ filter: 'blur(3px)', opacity: 0.5, pointerEvents: 'none' }}
          >
            <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Head-to-Head Records
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-[var(--stone)] rounded-lg h-14" />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
            <div className="text-sm font-display font-semibold text-accent-gold mb-1">
              Head-to-Head Records
            </div>
            <div className="text-[11px] font-mono text-text-muted">
              Claim your spot to unlock
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <div
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5"
            style={{ filter: 'blur(3px)', opacity: 0.5, pointerEvents: 'none' }}
          >
            <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Draft History & Analysis
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-[var(--stone)] rounded-lg h-10" />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
            <div className="text-sm font-display font-semibold text-accent-gold mb-1">
              Draft History & Analysis
            </div>
            <div className="text-[11px] font-mono text-text-muted">
              Claim your spot to unlock
            </div>
          </div>
        </div>

        {/* Clutch Rating blurred teaser */}
        <div className="relative mb-10">
          <div
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5"
            style={{ filter: 'blur(3px)', opacity: 0.5, pointerEvents: 'none' }}
          >
            <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Your Full Rating Breakdown
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-full bg-[var(--stone)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--stone)] rounded w-1/2" />
                <div className="h-2 bg-[var(--stone)] rounded w-3/4" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[var(--stone)] rounded" />
                  <div className="flex-1 h-2 bg-[var(--stone)] rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
            <div className="text-lg mb-1">⚡</div>
            <div className="text-sm font-display font-semibold text-accent-gold mb-1">
              Your Clutch Rating Breakdown
            </div>
            <div className="text-[11px] font-mono text-text-muted">
              Claim your spot to see your full rating
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleCTA}
            className="px-12 py-4 rounded-xl text-base font-display font-bold transition-all duration-300"
            style={{
              background: currentUserClaim
                ? 'rgba(107,203,119,0.12)'
                : 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)',
              color: currentUserClaim ? '#6BCB77' : '#0A0908',
              boxShadow: currentUserClaim ? 'none' : '0 6px 28px rgba(212,168,83,0.2)',
            }}
          >
            {ctaText}
          </button>
          <div className="text-[11px] font-mono text-text-muted/50 mt-2.5">
            {ctaSubtext}
          </div>
        </div>
      </div>

      {/* Owner detail modal */}
      {selectedOwner && (
        <OwnerDetailModal
          owner={selectedOwner.owner}
          rank={selectedOwner.rank}
          onClose={() => setSelectedOwner(null)}
          rating={ratings[selectedOwner.owner.name] || null}
        />
      )}

      {/* Claim modal */}
      {showClaimModal && (
        <ClaimModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          inviteCode={inviteCode}
          ownerStats={ownerStats}
          leagueId={league?.id}
          memberParam={memberParam}
        />
      )}
    </div>
  )
}
