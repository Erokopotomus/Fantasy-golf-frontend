import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useManagerProfile from '../hooks/useManagerProfile'
import Card from '../components/common/Card'

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

const StatBox = ({ label, value, color = 'text-white' }) => (
  <div className="bg-dark-primary rounded-lg p-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-text-muted text-sm">{label}</p>
  </div>
)

const AchievementBadge = ({ achievement }) => {
  const tierColor = TIER_COLORS[achievement.tier] || '#666'
  const unlocked = achievement.unlocked

  return (
    <div
      className={`relative rounded-xl p-3 text-center transition-all ${
        unlocked
          ? `${TIER_BG[achievement.tier]} border-2`
          : 'bg-dark-primary border border-dark-border opacity-40 grayscale'
      }`}
      style={unlocked ? { borderColor: tierColor } : undefined}
      title={achievement.description}
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
    </div>
  )
}

const ManagerProfile = () => {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const { user, profile, bySport, achievements, achievementStats, loading, error } = useManagerProfile(userId)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
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

        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-button shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{user?.name || 'Manager'}</h1>
              {memberSince && <p className="text-text-muted text-sm">Member since {memberSince}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Leagues" value={formatNum(p.totalLeagues)} />
            <StatBox label="Wins" value={formatNum(p.wins)} color="text-yellow-400" />
            <StatBox label="Championships" value={formatNum(p.championships)} color="text-accent-green" />
            <StatBox label="Win %" value={formatPct(p.winPct)} />
          </div>
        </Card>

        {!hasStats && achievements.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">&#127942;</div>
            <h2 className="text-xl font-bold text-white mb-2">
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
                className="inline-flex items-center px-6 py-3 bg-accent-green text-white rounded-lg font-medium hover:bg-accent-green/90 transition-colors"
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
                <h2 className="text-lg font-semibold text-white mb-4">Lifetime Stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox label="Leagues" value={formatNum(p.totalLeagues)} />
                  <StatBox label="Seasons" value={formatNum(p.totalSeasons)} />
                  <StatBox label="Championships" value={formatNum(p.championships)} color="text-accent-green" />
                  <StatBox label="Wins" value={formatNum(p.wins)} color="text-yellow-400" />
                  <StatBox label="Losses" value={formatNum(p.losses)} color="text-red-400" />
                  <StatBox label="Win %" value={formatPct(p.winPct)} />
                  <StatBox label="Avg Finish" value={formatDecimal(p.avgFinish)} />
                  <StatBox label="Best Finish" value={p.bestFinish != null ? `#${p.bestFinish}` : '-'} color="text-accent-green" />
                  <StatBox label="Total Points" value={formatNum(p.totalPoints)} />
                  <StatBox label="Draft Efficiency" value={p.draftEfficiency != null ? formatDecimal(p.draftEfficiency) : '-'} />
                </div>
              </Card>

              {/* Per-Sport Breakdown */}
              {bySport.length > 0 && (
                <Card>
                  <h2 className="text-lg font-semibold text-white mb-4">By Sport</h2>
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
                  <h2 className="text-lg font-semibold text-white">Achievements</h2>
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
                        className="h-full bg-accent-green rounded-full transition-all"
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
                      {items.map((a) => (
                        <AchievementBadge key={a.id} achievement={a} />
                      ))}
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
