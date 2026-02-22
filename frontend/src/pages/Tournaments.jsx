import { Link } from 'react-router-dom'
import useTournaments from '../hooks/useTournaments'
import Card from '../components/common/Card'
import { formatDate, formatDateRange, formatPurse } from '../utils/dateUtils'

const TourBadge = ({ tour }) => {
  if (!tour) return null
  const colors = {
    pga: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    'dp world': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    liv: 'bg-red-500/15 text-red-400 border-red-500/25',
    lpga: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
    korn: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  const key = tour.toLowerCase()
  const color = Object.entries(colors).find(([k]) => key.includes(k))?.[1] || 'bg-[var(--stone)] text-text-secondary border-[var(--card-border)]'
  const label = key.includes('pga') ? 'PGA Tour' : tour
  return (
    <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  )
}

const EventBadge = ({ tournament }) => {
  const isMajor = tournament.isMajor
  const isSignature = tournament.isSignature
  if (!isMajor && !isSignature) return null
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
      isMajor
        ? 'bg-gold/20 text-gold border border-gold/30'
        : 'bg-orange/20 text-orange border border-orange/30'
    }`}>
      {isMajor ? 'MAJOR' : 'SIGNATURE'}
    </span>
  )
}

const Tournaments = () => {
  const { tournaments, recentTournaments, loading, error } = useTournaments()

  const liveTournaments = tournaments.filter(t => t.status === 'IN_PROGRESS')
  const upcomingTournaments = tournaments
    .filter(t => t.status === 'UPCOMING')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--stone)] rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-[var(--stone)] rounded-card" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Card>
          <p className="text-red-400 text-center">Failed to load tournaments: {error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Tournaments</h1>
        <p className="text-text-muted text-sm mt-1">Schedule, live scoring, and results</p>
      </div>

      {/* Live Now */}
      {liveTournaments.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose" />
            </span>
            Live Now
          </h2>
          <div className="space-y-4">
            {liveTournaments.map(t => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="block">
                <Card hover className="border-rose/30 bg-rose/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-display font-bold text-text-primary">{t.name}</h3>
                        <TourBadge tour={t.tour} />
                        <EventBadge tournament={t} />
                      </div>
                      {(t.course?.name || t.courseName) && (
                        <Link
                          to={`/courses/${t.course?.id || t.courseId}`}
                          className="text-sm text-gold hover:text-gold/80 transition-colors mt-0.5 inline-block"
                          onClick={e => e.stopPropagation()}
                        >
                          {t.course?.nickname || t.course?.name || t.courseName}
                        </Link>
                      )}
                      <p className="text-xs text-text-muted mt-1 font-mono">
                        {formatDateRange(t.startDate, t.endDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {t.purse && (
                        <span className="text-sm font-mono text-text-secondary">{formatPurse(t.purse)}</span>
                      )}
                      <div className="mt-1">
                        <span className="text-xs font-mono text-rose bg-rose/10 px-2 py-0.5 rounded">IN PROGRESS</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Upcoming</h2>
        {upcomingTournaments.length === 0 ? (
          <Card>
            <p className="text-text-muted text-center text-sm">No upcoming tournaments scheduled</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingTournaments.map(t => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="block">
                <Card hover className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-display font-semibold text-text-primary">{t.name}</h3>
                        <TourBadge tour={t.tour} />
                        <EventBadge tournament={t} />
                      </div>
                      {(t.course?.name || t.courseName) && (
                        <Link
                          to={`/courses/${t.course?.id || t.courseId}`}
                          className="text-xs text-gold hover:text-gold/80 transition-colors mt-0.5 inline-block"
                          onClick={e => e.stopPropagation()}
                        >
                          {t.course?.nickname || t.course?.name || t.courseName}
                        </Link>
                      )}
                    </div>
                    {t.purse && (
                      <span className="text-xs font-mono text-text-muted shrink-0">{formatPurse(t.purse)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-text-muted font-mono">
                      {formatDateRange(t.startDate, t.endDate)}
                    </p>
                    <Link
                      to={`/tournaments/${t.id}/preview`}
                      className="text-[10px] font-medium text-gold hover:text-gold/80 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      Preview →
                    </Link>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      {recentTournaments.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Recent Results</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {recentTournaments.map(t => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="block">
                <Card hover className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-display font-semibold text-text-primary">{t.name}</h3>
                        <TourBadge tour={t.tour} />
                        <EventBadge tournament={t} />
                      </div>
                      {(t.course?.name || t.courseName) && (
                        <Link
                          to={`/courses/${t.course?.id || t.courseId}`}
                          className="text-xs text-gold hover:text-gold/80 transition-colors mt-0.5 inline-block"
                          onClick={e => e.stopPropagation()}
                        >
                          {t.course?.nickname || t.course?.name || t.courseName}
                        </Link>
                      )}
                    </div>
                    {t.purse && (
                      <span className="text-xs font-mono text-text-muted shrink-0">{formatPurse(t.purse)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-text-muted font-mono">
                      {formatDateRange(t.startDate, t.endDate)}
                    </p>
                    {t.winnerName && (
                      <span className="text-xs font-mono text-gold">
                        W: {t.winnerName}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Tournaments
