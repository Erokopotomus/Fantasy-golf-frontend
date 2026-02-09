import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useManagerProfile from '../hooks/useManagerProfile'
import Card from '../components/common/Card'
import ClutchRatingGauge from '../components/common/ClutchRatingGauge'
import api from '../services/api'
import ShareButton from '../components/share/ShareButton'
import RatingCard from '../components/share/cards/RatingCard'
import BadgeCard from '../components/share/cards/BadgeCard'

const TIER_COLORS = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
}

const TIER_BG = {
  BRONZE: 'bg-amber-900/20',
  SILVER: 'bg-gray-400/20',
  GOLD: 'bg-yellow-500/20',
  PLATINUM: 'bg-purple-300/20',
}

const CATEGORY_LABELS = {
  SEASON: 'Season',
  DRAFT: 'Draft',
  LINEUP: 'Lineup',
  SOCIAL: 'Social',
  MILESTONE: 'Milestone',
}

const CATEGORY_ICONS = {
  SEASON: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  DRAFT: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  LINEUP: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  SOCIAL: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  MILESTONE: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
}

const SOCIAL_ICONS = {
  twitter: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  podcast: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.25 8.25 0 005.58 2.17v-3.44a4.85 4.85 0 01-3.77-1.47V6.69h3.77z" />
    </svg>
  ),
  website: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
}

const SOCIAL_LABELS = {
  twitter: 'X / Twitter',
  youtube: 'YouTube',
  podcast: 'Podcast',
  website: 'Website',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

const StatBox = ({ label, value, color = 'text-white' }) => (
  <div className="bg-dark-primary rounded-lg p-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-text-muted text-sm">{label}</p>
  </div>
)

const ComponentBar = ({ label, value, max = 100 }) => {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-white font-mono">{value != null ? Math.round(value) : '—'}</span>
      </div>
      <div className="h-1.5 bg-dark-primary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-gold rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const AchievementBadge = ({ achievement, editing, isPinned, onTogglePin }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const tierColor = TIER_COLORS[achievement.tier] || '#666'
  const unlocked = achievement.unlocked
  const badgeSlug = achievement.slug || achievement.name?.toLowerCase().replace(/\s+/g, '_')

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`rounded-xl p-3 text-center transition-all ${
          unlocked
            ? `${TIER_BG[achievement.tier]} border-2`
            : 'bg-dark-primary border border-dark-border opacity-40 grayscale'
        }`}
        style={unlocked ? { borderColor: tierColor } : undefined}
      >
        <div className="text-2xl mb-1">{achievement.icon || '?'}</div>
        <p className="text-xs font-medium text-white truncate">{achievement.name}</p>
        <p className="text-[10px] text-text-muted mt-0.5 capitalize">{achievement.tier?.toLowerCase()}</p>
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </div>
        )}
        {/* Pin indicator */}
        {isPinned && !editing && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2l1.5 4.5H16l-3.5 2.5L14 13.5 10 11l-4 2.5 1.5-4.5L4 6.5h4.5z" />
            </svg>
          </div>
        )}
        {/* Edit mode pin/unpin button */}
        {editing && unlocked && onTogglePin && (
          <button
            onClick={() => onTogglePin(badgeSlug)}
            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${
              isPinned ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'
            }`}
            title={isPinned ? 'Unpin badge' : 'Pin badge (max 3)'}
          >
            📌
          </button>
        )}
        {/* Share badge icon */}
        {unlocked && !editing && (
          <div className="absolute -bottom-1 -right-1">
            <ShareButton
              CardComponent={BadgeCard}
              cardProps={{
                badgeName: badgeSlug,
                tier: achievement.tier?.toLowerCase(),
                description: achievement.description,
              }}
              label=""
            />
          </div>
        )}
      </div>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 pointer-events-none">
          <div className="rounded-lg p-3 shadow-2xl border-2" style={{ background: 'linear-gradient(135deg, #FFD700, #F5A623)', borderColor: '#B8860B' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>{achievement.name}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#2d2000' }}>{achievement.description}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span
                className="w-2 h-2 rounded-full border"
                style={{ backgroundColor: tierColor, borderColor: '#1a1a1a' }}
              />
              <span className="text-[10px] font-bold capitalize" style={{ color: '#2d2000' }}>{achievement.tier?.toLowerCase()}</span>
            </div>
          </div>
          <div className="w-2 h-2 border-r-2 border-b-2 rotate-45 mx-auto -mt-1" style={{ backgroundColor: '#F5A623', borderColor: '#B8860B' }} />
        </div>
      )}
    </div>
  )
}

const ManagerProfile = () => {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const { user, profile, bySport, achievements, achievementStats, reputation, clutchRating, loading, error, refetch } = useManagerProfile(userId)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editSocial, setEditSocial] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [shareToast, setShareToast] = useState(false)
  const [pinnedBadges, setPinnedBadges] = useState(user?.pinnedBadges || [])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link to="/profile" className="inline-flex items-center text-text-secondary hover:text-white mb-4">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>
          <Card>
            <p className="text-red-400 text-center">{error}</p>
          </Card>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const p = profile || {}
  const hasStats = p.totalLeagues > 0 || p.totalSeasons > 0

  // Group achievements by category
  const achievementsByCategory = {}
  for (const a of achievements) {
    if (!achievementsByCategory[a.category]) achievementsByCategory[a.category] = []
    achievementsByCategory[a.category].push(a)
  }

  const formatPct = (val) => val != null ? `${(val * 100).toFixed(1)}%` : '0%'
  const formatNum = (val) => val != null ? Number(val).toLocaleString() : '0'
  const formatDecimal = (val) => val != null ? Number(val).toFixed(1) : '-'

  const socialLinks = user?.socialLinks || {}
  const hasSocial = Object.values(socialLinks).some(v => v)

  const startEdit = () => {
    setEditBio(user?.bio || '')
    setEditTagline(user?.tagline || '')
    setEditUsername(user?.username || '')
    setEditSocial(user?.socialLinks || {})
    setSaveError(null)
    setEditing(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await api.updateProfile({
        bio: editBio,
        tagline: editTagline,
        username: editUsername || null,
        socialLinks: editSocial,
      })
      setEditing(false)
      refetch()
    } catch (err) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const shareProfile = () => {
    const url = `${window.location.origin}/u/${user?.username}`
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2000)
    })
  }

  const togglePinnedBadge = async (badgeName) => {
    const current = Array.isArray(pinnedBadges) ? [...pinnedBadges] : []
    let updated
    if (current.includes(badgeName)) {
      updated = current.filter(b => b !== badgeName)
    } else {
      if (current.length >= 3) return // Max 3
      updated = [...current, badgeName]
    }
    setPinnedBadges(updated)
    try {
      await api.updatePinnedBadges(updated)
    } catch (err) {
      console.error('Pin badge failed:', err)
      setPinnedBadges(current) // revert
    }
  }

  // Sync pinnedBadges when user data loads
  const effectivePinnedBadges = Array.isArray(pinnedBadges) && pinnedBadges.length > 0
    ? pinnedBadges
    : (Array.isArray(user?.pinnedBadges) ? user.pinnedBadges : [])

  return (
    <div className="min-h-screen bg-dark-primary">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link to="/profile" className="inline-flex items-center text-text-secondary hover:text-white mb-6 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isOwnProfile ? 'Back to Profile' : 'Back'}
        </Link>

        {/* Header with Clutch Rating */}
        <Card className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center text-white text-2xl font-bold font-display shadow-button shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Name + bio */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-display text-white truncate">{user?.name || 'Manager'}</h1>
                {effectivePinnedBadges.length > 0 && (
                  <span className="flex items-center gap-1 ml-1">
                    {effectivePinnedBadges.slice(0, 3).map((badge, i) => (
                      <span key={i} className="text-sm" title={badge.replace(/_/g, ' ')}>
                        {badge === 'hot_streak_5' || badge === 'hot_streak_10' ? '🔥' : badge === 'sharpshooter' ? '🎯' : badge === 'clutch_caller' ? '⚡' : badge === 'iron_will' ? '🛡' : badge === 'volume_king' ? '👑' : '🏆'}
                      </span>
                    ))}
                  </span>
                )}
                {isOwnProfile && !editing && (
                  <button
                    onClick={startEdit}
                    className="text-text-secondary hover:text-white transition-colors"
                    title="Edit profile"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {isOwnProfile && !editing && user?.username && (
                  <button
                    onClick={shareProfile}
                    className="text-text-secondary hover:text-accent-gold transition-colors ml-1"
                    title="Share profile"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                )}
                {clutchRating && clutchRating.overallRating != null && !editing && (
                  <ShareButton
                    CardComponent={RatingCard}
                    cardProps={{
                      rating: clutchRating.overallRating,
                      tier: clutchRating.tier,
                      trend: clutchRating.trend,
                      components: {
                        accuracy: clutchRating.accuracyComponent,
                        consistency: clutchRating.consistencyComponent,
                        volume: clutchRating.volumeComponent,
                        breadth: clutchRating.breadthComponent,
                      },
                      userName: user?.name,
                      username: user?.username,
                    }}
                    label="Share"
                  />
                )}
                {shareToast && (
                  <span className="text-xs text-green-400 font-mono animate-pulse">Link copied!</span>
                )}
              </div>
              {!editing && user?.username && (
                <div className="flex items-center gap-3">
                  <Link to={`/u/${user.username}`} className="text-text-muted text-sm font-mono hover:text-accent-gold transition-colors">
                    @{user.username}
                  </Link>
                  {!isOwnProfile && (
                    <Link
                      to={`/prove-it?tab=compare&target=${userId}`}
                      className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 font-medium transition-colors"
                    >
                      Compare
                    </Link>
                  )}
                </div>
              )}
              {memberSince && <p className="text-text-muted text-sm">Member since {memberSince}</p>}

              {/* Tagline */}
              {!editing && user?.tagline && (
                <p className="text-text-secondary text-sm mt-1 italic">{user.tagline}</p>
              )}

              {/* Bio */}
              {!editing && user?.bio && (
                <p className="text-text-secondary text-sm mt-2">{user.bio}</p>
              )}

              {/* Social links */}
              {!editing && hasSocial && (
                <div className="flex items-center gap-3 mt-2">
                  {Object.entries(socialLinks).map(([key, url]) => {
                    if (!url) return null
                    return (
                      <a
                        key={key}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-secondary hover:text-white transition-colors"
                        title={key.charAt(0).toUpperCase() + key.slice(1)}
                      >
                        {SOCIAL_ICONS[key] || key}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Clutch Rating Gauge */}
            {clutchRating && clutchRating.overallRating != null && (
              <ClutchRatingGauge
                rating={clutchRating.overallRating}
                tier={clutchRating.tier}
                trend={clutchRating.trend}
                size="lg"
              />
            )}
          </div>

          {/* Edit form */}
          {editing && (
            <div className="border-t border-dark-border pt-4 space-y-3">
              {saveError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {saveError}
                </div>
              )}
              <div>
                <label className="text-xs text-text-secondary font-mono block mb-1">Username</label>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-sm font-mono">@</span>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                    className="flex-1 bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-white text-sm font-mono"
                    placeholder="your-username"
                  />
                </div>
                {editUsername && (
                  <p className="text-[10px] text-text-muted font-mono mt-1">
                    clutchfantasysports.com/u/{editUsername}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-text-secondary font-mono block mb-1">Tagline (280 chars)</label>
                <input
                  type="text"
                  value={editTagline}
                  onChange={e => setEditTagline(e.target.value.slice(0, 280))}
                  className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Your one-liner..."
                />
                <span className="text-[10px] text-text-muted font-mono">{editTagline.length}/280</span>
              </div>
              <div>
                <label className="text-xs text-text-secondary font-mono block mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value.slice(0, 2000))}
                  rows={3}
                  className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-white text-sm resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['twitter', 'youtube', 'podcast', 'website', 'instagram', 'tiktok'].map(key => (
                  <div key={key}>
                    <label className="text-xs text-text-secondary font-mono block mb-1">{SOCIAL_LABELS[key] || key}</label>
                    <input
                      type="text"
                      value={editSocial[key] || ''}
                      onChange={e => setEditSocial(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
                      placeholder={`https://...`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-gold text-white rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <StatBox label="Leagues" value={formatNum(p.totalLeagues)} />
            <StatBox label="Wins" value={formatNum(p.wins)} color="text-yellow-400" />
            <StatBox label="Championships" value={formatNum(p.championships)} color="text-gold" />
            <StatBox label="Win %" value={formatPct(p.winPct)} />
          </div>
        </Card>

        {/* Clutch Rating Breakdown */}
        {clutchRating && clutchRating.overallRating != null && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold font-display text-white">Clutch Rating Breakdown</h2>
              <ShareButton
                CardComponent={RatingCard}
                cardProps={{
                  rating: clutchRating.overallRating,
                  tier: clutchRating.tier,
                  trend: clutchRating.trend,
                  components: {
                    accuracy: clutchRating.accuracyComponent,
                    consistency: clutchRating.consistencyComponent,
                    volume: clutchRating.volumeComponent,
                    breadth: clutchRating.breadthComponent,
                  },
                  userName: user?.name,
                  username: user?.username,
                }}
                label="Share"
              />
            </div>
            <div className="space-y-3">
              <ComponentBar label="Accuracy (40%)" value={clutchRating.accuracyComponent} />
              <ComponentBar label="Consistency (25%)" value={clutchRating.consistencyComponent} />
              <ComponentBar label="Volume (20%)" value={clutchRating.volumeComponent} />
              <ComponentBar label="Breadth (15%)" value={clutchRating.breadthComponent} />
            </div>
            <p className="text-xs text-text-muted mt-3 font-mono">
              Based on {clutchRating.totalGradedCalls || 0} graded calls
              {clutchRating.updatedAt && ` · Updated ${new Date(clutchRating.updatedAt).toLocaleDateString()}`}
            </p>
          </Card>
        )}

        {/* Prediction Reputation */}
        {reputation && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold font-display text-white">Prove It Track Record</h2>
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded capitalize ${
                reputation.tier === 'elite' ? 'bg-purple-500/20 text-purple-400' :
                reputation.tier === 'expert' ? 'bg-accent-gold/20 text-accent-gold' :
                reputation.tier === 'sharp' ? 'bg-blue-500/20 text-blue-400' :
                reputation.tier === 'contender' ? 'bg-green-500/20 text-green-400' :
                'bg-dark-tertiary text-text-secondary'
              }`}>
                {reputation.tier}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatBox label="Accuracy" value={`${(reputation.accuracyRate * 100).toFixed(1)}%`} color="text-green-400" />
              <StatBox label="Total Calls" value={formatNum(reputation.totalPredictions)} />
              <StatBox label="Correct" value={formatNum(reputation.correctPredictions)} color="text-accent-gold" />
              <StatBox label="Streak" value={reputation.streakCurrent > 0 ? `${reputation.streakCurrent}` : '0'} color="text-orange-400" />
            </div>

            {/* Tier progress */}
            {reputation.tier !== 'elite' && reputation.totalPredictions > 0 && (() => {
              const tiers = ['rookie', 'contender', 'sharp', 'expert', 'elite']
              const currentIdx = tiers.indexOf(reputation.tier)
              const nextTier = tiers[currentIdx + 1]
              const thresholds = { contender: { min: 10, acc: 0 }, sharp: { min: 20, acc: 0.55 }, expert: { min: 50, acc: 0.65 }, elite: { min: 100, acc: 0.75 } }
              const next = thresholds[nextTier]
              if (!next) return null
              const predPct = Math.min(1, reputation.totalPredictions / next.min)
              const accPct = next.acc > 0 ? Math.min(1, reputation.accuracyRate / next.acc) : 1
              const progress = Math.min(predPct, accPct)
              return (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-secondary font-mono">Progress to {nextTier}</span>
                    <span className="text-text-secondary font-mono">{(progress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-primary rounded-full overflow-hidden">
                    <div className="h-full bg-accent-gold rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              )
            })()}

            {/* Prediction badges */}
            {reputation.badges?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-dark-tertiary">
                <p className="text-xs text-text-secondary font-mono uppercase tracking-wider mb-2">Badges</p>
                <div className="flex flex-wrap gap-2">
                  {reputation.badges.map((badge, i) => {
                    const badgeName = typeof badge === 'string' ? badge : badge?.type || badge?.name || ''
                    return (
                      <span key={i} className="text-xs font-mono px-2 py-1 rounded-lg bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                        {badgeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Best streak */}
            {reputation.streakBest > 0 && (
              <div className="mt-3 text-xs text-text-secondary font-mono">
                Best streak: {reputation.streakBest} correct in a row
              </div>
            )}
          </Card>
        )}

        {!hasStats && achievements.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">&#127942;</div>
            <h2 className="text-xl font-bold font-display text-white mb-2">
              {isOwnProfile ? 'Your Manager Journey Starts Here' : 'No Stats Yet'}
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {isOwnProfile
                ? 'Join a league and complete a season to start building your manager profile and unlocking achievements.'
                : 'This manager hasn\'t completed any seasons yet.'}
            </p>
            {isOwnProfile && (
              <Link
                to="/leagues"
                className="inline-flex items-center px-6 py-3 bg-gold text-white rounded-lg font-medium hover:bg-gold/90 transition-colors"
              >
                Browse Leagues
              </Link>
            )}
          </Card>
        ) : (
          /* Main Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Lifetime Stats */}
              <Card>
                <h2 className="text-lg font-semibold font-display text-white mb-4">Lifetime Stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox label="Leagues" value={formatNum(p.totalLeagues)} />
                  <StatBox label="Seasons" value={formatNum(p.totalSeasons)} />
                  <StatBox label="Championships" value={formatNum(p.championships)} color="text-gold" />
                  <StatBox label="Wins" value={formatNum(p.wins)} color="text-yellow-400" />
                  <StatBox label="Losses" value={formatNum(p.losses)} color="text-red-400" />
                  <StatBox label="Win %" value={formatPct(p.winPct)} />
                  <StatBox label="Avg Finish" value={formatDecimal(p.avgFinish)} />
                  <StatBox label="Best Finish" value={p.bestFinish != null ? `#${p.bestFinish}` : '-'} color="text-gold" />
                  <StatBox label="Total Points" value={formatNum(p.totalPoints)} />
                  <StatBox label="Draft Efficiency" value={p.draftEfficiency != null ? formatDecimal(p.draftEfficiency) : '-'} />
                </div>
              </Card>

              {/* Per-Sport Breakdown */}
              {bySport.length > 0 && (
                <Card>
                  <h2 className="text-lg font-semibold font-display text-white mb-4">By Sport</h2>
                  <div className="space-y-4">
                    {bySport.map((sp) => (
                      <div key={sp.id} className="bg-dark-primary rounded-lg p-4">
                        <h3 className="text-white font-medium mb-2">{sp.sport?.name || 'Unknown'}</h3>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="text-white font-semibold">{formatNum(sp.wins)}</p>
                            <p className="text-text-muted">Wins</p>
                          </div>
                          <div>
                            <p className="text-white font-semibold">{formatNum(sp.championships)}</p>
                            <p className="text-text-muted">Titles</p>
                          </div>
                          <div>
                            <p className="text-white font-semibold">{formatPct(sp.winPct)}</p>
                            <p className="text-text-muted">Win %</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column — Achievements */}
            <div>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold font-display text-white">Achievements</h2>
                  {achievementStats && (
                    <span className="text-sm text-text-secondary">
                      {achievementStats.unlocked}/{achievementStats.total}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {achievementStats && achievementStats.total > 0 && (
                  <div className="mb-6">
                    <div className="h-2 bg-dark-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all"
                        style={{ width: `${(achievementStats.unlocked / achievementStats.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-text-muted text-xs mt-1">
                      {achievementStats.unlocked === 0
                        ? 'Complete seasons to start unlocking achievements'
                        : `${((achievementStats.unlocked / achievementStats.total) * 100).toFixed(0)}% complete`}
                    </p>
                  </div>
                )}

                {/* Achievement Categories */}
                {Object.entries(achievementsByCategory).map(([category, items]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-text-secondary">{CATEGORY_ICONS[category]}</span>
                      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {items.map((a) => {
                        const badgeSlug = a.slug || a.name?.toLowerCase().replace(/\s+/g, '_')
                        return (
                          <AchievementBadge
                            key={a.id}
                            achievement={a}
                            editing={editing}
                            isPinned={effectivePinnedBadges.includes(badgeSlug)}
                            onTogglePin={isOwnProfile ? togglePinnedBadge : undefined}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}

                {achievements.length === 0 && (
                  <p className="text-text-muted text-center py-4">No achievements defined yet.</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerProfile
