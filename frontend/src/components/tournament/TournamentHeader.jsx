import { Link } from 'react-router-dom'

const getDnaLabel = (val) => {
  if (val == null) return null
  if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bar: 'bg-gold' }
  if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bar: 'bg-white/30' }
  return { text: 'Low', color: 'text-text-muted', bar: 'bg-white/10' }
}

const TournamentHeader = ({ tournament, leaderboard = [] }) => {
  if (!tournament) return null

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPurse = (purse) => {
    if (!purse) return null
    const num = typeof purse === 'string' ? parseInt(purse.replace(/[^0-9]/g, '')) : purse
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num}`
  }

  const isLive = tournament.status === 'IN_PROGRESS' || tournament.status === 'live'
  const isCompleted = tournament.status === 'COMPLETED' || tournament.status === 'completed'
  const isUpcoming = tournament.status === 'UPCOMING' || tournament.status === 'upcoming'

  // Derive quick stats from leaderboard
  const cutPlayers = leaderboard.filter(p => p.status === 'CUT')
  const leader = leaderboard[0]

  // Course DNA for UPCOMING tournaments
  const course = tournament.course && typeof tournament.course === 'object' ? tournament.course : null
  const dnaCategories = (isUpcoming && course) ? [
    { label: 'Driving', key: 'OTT', value: course.drivingImportance },
    { label: 'Approach', key: 'APP', value: course.approachImportance },
    { label: 'Short Game', key: 'ARG', value: course.aroundGreenImportance },
    { label: 'Putting', key: 'PUT', value: course.puttingImportance },
  ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) })) : []

  const premiumSkills = dnaCategories.filter(d => d.value >= 0.27).sort((a, b) => b.value - a.value)
  const courseSummary = premiumSkills.length > 0
    ? `Rewards ${premiumSkills.map(s => s.label.toLowerCase()).join(' & ')}`
    : null

  return (
    <div className="relative overflow-hidden rounded-xl border border-dark-border bg-dark-secondary">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 via-dark-secondary to-dark-secondary" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-secondary via-transparent to-transparent" />

      <div className="relative p-5">
        <div className="flex gap-6">
          {/* Left side — tournament info */}
          <div className="flex-1 min-w-0">
            {/* Top row: Status + Tour */}
            <div className="flex items-center gap-3 mb-3">
              {isLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Live
                </span>
              )}
              {isCompleted && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Final
                </span>
              )}
              {isUpcoming && (
                <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Upcoming
                </span>
              )}
              {tournament.tour && (
                <span className="px-2 py-0.5 rounded bg-dark-tertiary text-text-muted text-xs font-medium">
                  {tournament.tour}
                </span>
              )}
            </div>

            {/* Tournament name + course */}
            <h1 className="text-2xl font-bold font-display text-white mb-1 tracking-tight">{tournament.name}</h1>
            <div className="text-text-secondary text-sm mb-4">
              {course ? (
                <span>
                  <Link
                    to={`/courses/${course.id}`}
                    className="hover:text-gold transition-colors"
                  >
                    {course.nickname || course.name}
                  </Link>
                  {(course.city || course.state) && (
                    <span className="text-text-muted ml-1.5">
                      — {[course.city, course.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </span>
              ) : tournament.location ? (
                <span>{tournament.location}</span>
              ) : null}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Dates</span>
                <p className="text-white font-medium">
                  {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
                </p>
              </div>

              {tournament.purse && (
                <div>
                  <span className="text-text-muted text-xs uppercase tracking-wide">Purse</span>
                  <p className="text-white font-medium">{formatPurse(tournament.purse)}</p>
                </div>
              )}

              {leaderboard.length > 0 && (
                <div>
                  <span className="text-text-muted text-xs uppercase tracking-wide">Field</span>
                  <p className="text-white font-medium">
                    {leaderboard.length} players{cutPlayers.length > 0 ? ` (${cutPlayers.length} cut)` : ''}
                  </p>
                </div>
              )}

              {course && isUpcoming && (
                <>
                  {course.par && (
                    <div>
                      <span className="text-text-muted text-xs uppercase tracking-wide">Par</span>
                      <p className="text-white font-medium font-mono">{course.par}</p>
                    </div>
                  )}
                  {course.yardage && (
                    <div>
                      <span className="text-text-muted text-xs uppercase tracking-wide">Yards</span>
                      <p className="text-white font-medium font-mono">{course.yardage?.toLocaleString()}</p>
                    </div>
                  )}
                </>
              )}

              {leader && (isCompleted || isLive) && (
                <div className="ml-auto text-right">
                  <span className="text-text-muted text-xs uppercase tracking-wide">
                    {isCompleted ? 'Winner' : 'Leader'}
                  </span>
                  <p className="text-white font-medium flex items-center gap-1.5 justify-end">
                    {isCompleted && <span className="text-yellow-400">&#127942;</span>}
                    <span className="text-lg">{leader.countryFlag}</span>
                    {leader.name}
                    <span className={`ml-1 font-bold ${leader.score < 0 ? 'text-emerald-400' : leader.score > 0 ? 'text-red-400' : 'text-white'}`}>
                      {leader.score > 0 ? `+${leader.score}` : leader.score === 0 ? 'E' : leader.score}
                    </span>
                  </p>
                </div>
              )}

              {/* Round indicators (non-upcoming) */}
              {!isUpcoming && !leader && (
                <div className="ml-auto flex items-center gap-1">
                  {[1, 2, 3, 4].map(r => {
                    const isCurrent = tournament.currentRound === r && isLive
                    const isPast = isCompleted || (tournament.currentRound && r < tournament.currentRound)
                    return (
                      <div
                        key={r}
                        className={`
                          w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${isCurrent ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50' : ''}
                          ${isPast ? 'bg-dark-tertiary text-emerald-400' : ''}
                          ${!isCurrent && !isPast ? 'bg-dark-tertiary/50 text-text-muted' : ''}
                        `}
                      >
                        R{r}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right side — Course DNA panel (UPCOMING only) */}
          {isUpcoming && dnaCategories.length > 0 && (
            <div className="hidden md:flex flex-col w-56 flex-shrink-0 rounded-lg bg-dark-primary/60 border border-dark-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">What Wins Here</span>
                <Link
                  to={`/courses/${course.id}`}
                  className="text-[9px] text-gold hover:text-gold/80 transition-colors font-medium"
                >
                  Profile →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 flex-1">
                {dnaCategories.map((cat) => {
                  const barPct = Math.min(100, Math.max(20, ((cat.value - 0.15) / 0.25) * 80 + 20))
                  return (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-text-secondary font-medium">{cat.label}</span>
                        <span className={`text-[9px] font-mono font-bold ${cat.rating.color}`}>
                          {cat.rating.text}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cat.rating.bar} transition-all`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {courseSummary && (
                <p className="text-[10px] text-emerald-400/80 font-medium mt-3 pt-3 border-t border-dark-border/50">
                  {courseSummary}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TournamentHeader
