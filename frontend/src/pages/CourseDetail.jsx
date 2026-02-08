import { useParams, Link } from 'react-router-dom'
import useCourse from '../hooks/useCourse'
import Card from '../components/common/Card'

const CourseDetail = () => {
  const { courseId } = useParams()
  const { course, loading, error } = useCourse(courseId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <p className="text-red-400">{error || 'Course not found'}</p>
          <Link to="/" className="text-gold hover:underline mt-2 inline-block">Back to Dashboard</Link>
        </Card>
      </div>
    )
  }

  const formatPurse = (purse) => {
    if (!purse) return null
    const num = typeof purse === 'string' ? parseInt(purse.replace(/[^0-9]/g, '')) : purse
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            Live
          </span>
        )
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold uppercase">Final</span>
      default:
        return <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-mono font-bold uppercase">Upcoming</span>
    }
  }

  // Importance weights for Course DNA
  const dnaCategories = [
    { label: 'Driving', value: course.drivingImportance },
    { label: 'Approach', value: course.approachImportance },
    { label: 'Around Green', value: course.aroundGreenImportance },
    { label: 'Putting', value: course.puttingImportance },
  ].filter(d => d.value != null)

  const getScoreColor = (avgToPar) => {
    if (avgToPar == null) return 'text-text-muted'
    if (avgToPar <= -2) return 'text-gold'
    if (avgToPar <= -0.5) return 'text-green-400'
    if (avgToPar <= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-dark-border bg-dark-secondary">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-dark-secondary to-dark-secondary" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-secondary via-transparent to-transparent" />

        <div className="relative p-6">
          <h1 className="text-3xl font-bold font-display text-white mb-1 tracking-tight">
            {course.name}
          </h1>
          {course.nickname && course.nickname !== course.name && (
            <p className="text-gold text-sm font-medium mb-2">"{course.nickname}"</p>
          )}
          {(course.city || course.state || course.country) && (
            <p className="text-text-secondary text-sm mb-5">
              {[course.city, course.state, course.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Specs row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {course.par && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Par</span>
                <p className="text-white font-mono font-bold">{course.par}</p>
              </div>
            )}
            {course.yardage && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Yardage</span>
                <p className="text-white font-mono font-bold">{course.yardage.toLocaleString()}</p>
              </div>
            )}
            {course.grassType && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Grass</span>
                <p className="text-white font-mono font-bold">{course.grassType}</p>
              </div>
            )}
            {course.architect && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Architect</span>
                <p className="text-white font-medium">{course.architect}</p>
              </div>
            )}
            {course.yearBuilt && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Year Built</span>
                <p className="text-white font-mono font-bold">{course.yearBuilt}</p>
              </div>
            )}
            {course.elevation && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">Elevation</span>
                <p className="text-white font-mono font-bold">{course.elevation.toLocaleString()} ft</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Course DNA Card */}
          {dnaCategories.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-dark-border">
                <h4 className="text-sm font-semibold text-text-muted">Course DNA</h4>
              </div>
              <div className="p-4 space-y-3">
                {dnaCategories.map((cat) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text-secondary text-sm">{cat.label}</span>
                      <span className="text-white font-mono text-sm font-bold">
                        {(cat.value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-orange-500"
                        style={{ width: `${Math.min(cat.value * 100 / 40 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top Performers Card */}
          {course.playerHistory && course.playerHistory.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-dark-border">
                <h4 className="text-sm font-semibold text-text-muted">Top Performers</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-tertiary">
                    <tr className="text-xs text-text-muted">
                      <th className="p-3 text-left">Player</th>
                      <th className="p-3 text-center">Rnds</th>
                      <th className="p-3 text-center">Avg</th>
                      <th className="p-3 text-center">Best</th>
                      <th className="p-3 text-right">W</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.playerHistory.map((ph) => (
                      <tr key={ph.id} className="border-b border-dark-border/50 hover:bg-dark-tertiary/50">
                        <td className="p-3">
                          <Link
                            to={`/players/${ph.player.id}`}
                            className="flex items-center gap-2 hover:text-gold transition-colors"
                          >
                            {ph.player.countryFlag && (
                              <span className="text-sm">{ph.player.countryFlag}</span>
                            )}
                            <span className="text-white font-medium text-xs">{ph.player.name}</span>
                          </Link>
                        </td>
                        <td className="p-3 text-center text-text-secondary font-mono">{ph.rounds}</td>
                        <td className={`p-3 text-center font-mono font-bold ${getScoreColor(ph.avgToPar)}`}>
                          {ph.avgToPar != null ? (ph.avgToPar > 0 ? `+${ph.avgToPar.toFixed(1)}` : ph.avgToPar.toFixed(1)) : '-'}
                        </td>
                        <td className="p-3 text-center text-gold font-mono">{ph.bestFinish || '-'}</td>
                        <td className="p-3 text-right">
                          {ph.wins > 0 ? (
                            <span className="text-yellow-400 font-mono font-bold">{ph.wins}</span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column — Tournament History */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="p-4 border-b border-dark-border">
              <h4 className="text-sm font-semibold text-text-muted">Tournament History</h4>
            </div>

            {course.tournaments && course.tournaments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-tertiary">
                    <tr className="text-xs text-text-muted">
                      <th className="p-3 text-left">Event</th>
                      <th className="p-3 text-center">Dates</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Purse</th>
                      <th className="p-3 text-right">Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.tournaments.map((t) => (
                      <tr key={t.id} className="border-b border-dark-border/50 hover:bg-dark-tertiary/50">
                        <td className="p-3">
                          <Link
                            to={`/tournaments/${t.id}`}
                            className="text-white font-medium hover:text-gold transition-colors"
                          >
                            {t.name}
                          </Link>
                          {(t.isMajor || t.isSignature) && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${t.isMajor ? 'bg-gold/20 text-gold' : 'bg-blue-500/15 text-blue-400'}`}>
                              {t.isMajor ? 'Major' : 'Signature'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-text-secondary text-xs">
                          {formatDate(t.startDate)} – {formatDate(t.endDate)}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(t.status)}</td>
                        <td className="p-3 text-center text-text-secondary font-mono">
                          {t.purse ? formatPurse(t.purse) : '-'}
                        </td>
                        <td className="p-3 text-right text-text-secondary font-mono">
                          {t.fieldSize || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted">
                No tournament history available yet.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Footer attribution */}
      <p className="text-center text-text-muted text-xs py-4">
        Course data curated by Clutch. Course fit analysis powered by Clutch proprietary metrics.
      </p>
    </div>
  )
}

export default CourseDetail
