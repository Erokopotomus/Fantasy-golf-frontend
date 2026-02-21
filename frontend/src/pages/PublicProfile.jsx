import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import usePublicProfile from '../hooks/usePublicProfile'
import Card from '../components/common/Card'
import ClutchRatingGauge from '../components/common/ClutchRatingGauge'

const TIER_COLORS = {
  rookie: 'bg-dark-tertiary/10 text-text-primary/60',
  contender: 'bg-green-500/20 text-green-400',
  sharp: 'bg-blue-500/20 text-blue-400',
  expert: 'bg-accent-gold/20 text-accent-gold',
  elite: 'bg-purple-500/20 text-purple-400',
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
  twitter: 'X',
  youtube: 'YouTube',
  podcast: 'Podcast',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
}

const OUTCOME_BADGE = {
  CORRECT: { label: 'Correct', class: 'bg-green-500/20 text-green-400' },
  INCORRECT: { label: 'Incorrect', class: 'bg-red-500/20 text-red-400' },
  PUSH: { label: 'Push', class: 'bg-yellow-500/20 text-yellow-400' },
  VOIDED: { label: 'Voided', class: 'bg-dark-tertiary/10 text-text-primary/40' },
}

const StatBox = ({ label, value, color = 'text-text-primary' }) => (
  <div className="bg-dark-primary rounded-lg p-3 text-center">
    <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    <p className="text-text-muted text-xs">{label}</p>
  </div>
)

export default function PublicProfile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const { user, reputations, clutchRating, managerStats, recentCalls, achievements, loading, error } = usePublicProfile(username)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">&#128683;</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Profile Not Found</h1>
          <p className="text-text-secondary mb-6">No user with the username "@{username}" exists.</p>
          <Link to="/" className="text-accent-gold hover:underline">Go to homepage</Link>
        </div>
      </div>
    )
  }

  const socialLinks = user.socialLinks || {}
  const hasSocial = Object.values(socialLinks).some(v => v)
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Primary reputation (golf or 'all')
  const primaryRep = reputations.find(r => r.sport === 'golf') || reputations.find(r => r.sport === 'all') || reputations[0]

  const agg = managerStats?.aggregate || {}
  const formatPct = (val) => val != null ? `${(val * 100).toFixed(1)}%` : '0%'

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header Card */}
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center text-text-primary text-2xl font-bold font-display shadow-button shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Name + details */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold font-display text-text-primary truncate">{user.name}</h1>
              <p className="text-text-muted text-sm font-mono">@{user.username}</p>
              {user.tagline && (
                <p className="text-text-secondary text-sm mt-1 italic">{user.tagline}</p>
              )}
              {user.bio && (
                <p className="text-text-secondary text-sm mt-2">{user.bio}</p>
              )}

              {/* Social icons */}
              {hasSocial && (
                <div className="flex items-center gap-3 mt-3">
                  {Object.entries(socialLinks).map(([key, url]) => {
                    if (!url) return null
                    return (
                      <a
                        key={key}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-secondary hover:text-text-primary transition-colors"
                        title={SOCIAL_LABELS[key] || key}
                      >
                        {SOCIAL_ICONS[key] || key}
                      </a>
                    )
                  })}
                </div>
              )}

              <p className="text-text-muted text-xs mt-2">Member since {memberSince}</p>
            </div>

            {/* Clutch Rating */}
            {clutchRating && clutchRating.overall != null && (
              <ClutchRatingGauge
                rating={clutchRating.overall}
                tier={clutchRating.tier}
                trend={clutchRating.trend}
                size="lg"
              />
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        {primaryRep && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <StatBox label="Accuracy" value={formatPct(primaryRep.accuracyRate)} color="text-green-400" />
            <StatBox label="Streak" value={primaryRep.streakCurrent || 0} color="text-orange-400" />
            <StatBox label="Total Calls" value={primaryRep.totalPredictions || 0} />
            <StatBox
              label="Tier"
              value={
                <span className={`text-xs px-2 py-0.5 rounded font-mono capitalize ${TIER_COLORS[primaryRep.tier] || TIER_COLORS.rookie}`}>
                  {primaryRep.tier}
                </span>
              }
            />
            <StatBox label="Championships" value={agg.championships || 0} color="text-gold" />
          </div>
        )}

        {/* Recent Calls */}
        {recentCalls.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Recent Calls</h2>
            <div className="space-y-2">
              {recentCalls.map(call => {
                const badge = OUTCOME_BADGE[call.outcome] || OUTCOME_BADGE.VOIDED
                const data = call.predictionData || {}
                const typeLabel = call.predictionType === 'player_benchmark' ? 'Benchmark'
                  : call.predictionType === 'performance_call' ? 'Performance Call'
                  : call.predictionType === 'weekly_winner' ? 'Weekly Winner'
                  : call.predictionType === 'bold_call' ? 'Bold Call'
                  : call.predictionType

                return (
                  <div key={call.id} className="flex items-center gap-3 bg-dark-primary rounded-lg p-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${badge.class}`}>
                      {badge.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {data.playerName && <span className="font-medium">{data.playerName}</span>}
                        {data.direction && <span className="text-text-secondary"> {data.direction.toUpperCase()}</span>}
                        {data.benchmark_value != null && <span className="text-text-muted font-mono"> {data.benchmark_value}</span>}
                      </p>
                      <p className="text-xs text-text-muted">
                        {typeLabel} · {call.sport.toUpperCase()}
                        {call.resolvedAt && ` · ${new Date(call.resolvedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* League Credentials */}
        {(agg.totalLeagues > 0 || agg.totalSeasons > 0) && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold font-display text-text-primary mb-4">League Credentials</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Leagues" value={agg.totalLeagues || 0} />
              <StatBox label="Championships" value={agg.championships || 0} color="text-gold" />
              <StatBox label="Win %" value={formatPct(agg.winPct)} />
              <StatBox label="Best Finish" value={agg.bestFinish != null ? `#${agg.bestFinish}` : '-'} color="text-gold" />
            </div>
          </Card>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Achievements</h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map(a => (
                <div
                  key={a.id}
                  className="bg-dark-primary rounded-lg px-3 py-2 text-center"
                  title={a.name}
                >
                  <span className="text-xl">{a.icon || '?'}</span>
                  <p className="text-xs text-text-primary mt-0.5">{a.name}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CTA for logged-out visitors */}
        {!currentUser && (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">Want to build your own track record?</p>
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-text-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Sign up to make your own calls
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
