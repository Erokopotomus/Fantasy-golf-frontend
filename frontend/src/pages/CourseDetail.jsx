import { useParams, Link } from 'react-router-dom'
import useCourse from '../hooks/useCourse'
import Card from '../components/common/Card'
import WeatherStrip from '../components/tournament/WeatherStrip'

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
  const getDnaLabel = (val) => {
    if (val == null) return null
    if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bar: 'bg-gold' }
    if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bar: 'bg-emerald-400' }
    if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bar: 'bg-white/30' }
    return { text: 'Low', color: 'text-text-muted', bar: 'bg-white/10' }
  }

  const dnaCategories = [
    { label: 'Driving', value: course.drivingImportance },
    { label: 'Approach', value: course.approachImportance },
    { label: 'Around Green', value: course.aroundGreenImportance },
    { label: 'Putting', value: course.puttingImportance },
  ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) }))

  const premiumSkills = dnaCategories.filter(d => d.value >= 0.27).sort((a, b) => b.value - a.value)
  const upcomingTournament = course.tournaments?.find(t => t.status === 'UPCOMING')

  // Build narrative about what kind of player wins here
  const buildNarrative = () => {
    if (premiumSkills.length === 0) return null
    const names = premiumSkills.map(s => s.label.toLowerCase())
    if (premiumSkills.length === 1) {
      return `This course heavily rewards ${names[0]}. Look for specialists who gain strokes in that area.`
    }
    if (premiumSkills.length === 2) {
      return `Winners here tend to excel at ${names[0]} and ${names[1]}. Players strong in both areas have a significant edge.`
    }
    return `A well-rounded course that demands ${names.join(', ')}. Versatile players with no major weaknesses thrive.`
  }

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

      {/* Hole-by-Hole Scorecard */}
      {course.holes && course.holes.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-dark-border">
            <h4 className="text-sm font-semibold text-text-muted">Hole-by-Hole Scorecard</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-border text-text-muted">
                  <th className="px-2 py-2 text-left font-medium">Hole</th>
                  {course.holes.filter(h => h.number <= 9).map(h => (
                    <th key={h.number} className="px-2 py-2 text-center font-mono font-medium">{h.number}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-mono font-bold text-text-secondary">Out</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dark-border/50">
                  <td className="px-2 py-2 text-text-muted font-medium">Par</td>
                  {course.holes.filter(h => h.number <= 9).map(h => (
                    <td key={h.number} className={`px-2 py-2 text-center font-mono font-bold ${
                      h.par === 3 ? 'text-emerald-400' : h.par === 5 ? 'text-gold' : 'text-white'
                    }`}>{h.par}</td>
                  ))}
                  <td className="px-2 py-2 text-center font-mono font-bold text-white">
                    {course.holes.filter(h => h.number <= 9).reduce((sum, h) => sum + h.par, 0)}
                  </td>
                </tr>
                {course.holes.some(h => h.yardage) && (
                  <tr className="border-b border-dark-border/50">
                    <td className="px-2 py-2 text-text-muted font-medium">Yds</td>
                    {course.holes.filter(h => h.number <= 9).map(h => (
                      <td key={h.number} className="px-2 py-2 text-center font-mono text-text-secondary">{h.yardage || '-'}</td>
                    ))}
                    <td className="px-2 py-2 text-center font-mono text-text-secondary">
                      {course.holes.filter(h => h.number <= 9 && h.yardage).reduce((sum, h) => sum + h.yardage, 0) || '-'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Back nine */}
            {course.holes.filter(h => h.number > 9).length > 0 && (
              <table className="w-full text-xs mt-0">
                <thead>
                  <tr className="border-b border-dark-border text-text-muted">
                    <th className="px-2 py-2 text-left font-medium">Hole</th>
                    {course.holes.filter(h => h.number > 9).map(h => (
                      <th key={h.number} className="px-2 py-2 text-center font-mono font-medium">{h.number}</th>
                    ))}
                    <th className="px-2 py-2 text-center font-mono font-bold text-text-secondary">In</th>
                    <th className="px-2 py-2 text-center font-mono font-bold text-gold">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dark-border/50">
                    <td className="px-2 py-2 text-text-muted font-medium">Par</td>
                    {course.holes.filter(h => h.number > 9).map(h => (
                      <td key={h.number} className={`px-2 py-2 text-center font-mono font-bold ${
                        h.par === 3 ? 'text-emerald-400' : h.par === 5 ? 'text-gold' : 'text-white'
                      }`}>{h.par}</td>
                    ))}
                    <td className="px-2 py-2 text-center font-mono font-bold text-white">
                      {course.holes.filter(h => h.number > 9).reduce((sum, h) => sum + h.par, 0)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-gold">
                      {course.holes.reduce((sum, h) => sum + h.par, 0)}
                    </td>
                  </tr>
                  {course.holes.some(h => h.yardage) && (
                    <tr className="border-b border-dark-border/50">
                      <td className="px-2 py-2 text-text-muted font-medium">Yds</td>
                      {course.holes.filter(h => h.number > 9).map(h => (
                        <td key={h.number} className="px-2 py-2 text-center font-mono text-text-secondary">{h.yardage || '-'}</td>
                      ))}
                      <td className="px-2 py-2 text-center font-mono text-text-secondary">
                        {course.holes.filter(h => h.number > 9 && h.yardage).reduce((sum, h) => sum + h.yardage, 0) || '-'}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-text-secondary">
                        {course.holes.filter(h => h.yardage).reduce((sum, h) => sum + h.yardage, 0) || '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Course Stats Banner */}
      {course.courseStats && (
        <div className="grid grid-cols-3 gap-4">
          {course.courseStats.avgWinningScore != null && (
            <Card>
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Avg Winning Score</p>
              <p className={`text-xl font-mono font-bold ${getScoreColor(course.courseStats.avgWinningScore)}`}>
                {course.courseStats.avgWinningScore > 0 ? '+' : ''}{course.courseStats.avgWinningScore.toFixed(1)}
              </p>
            </Card>
          )}
          {course.courseStats.avgCutLine != null && (
            <Card>
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Avg Cut Line</p>
              <p className="text-xl font-mono font-bold text-text-secondary">
                {course.courseStats.avgCutLine > 0 ? '+' : ''}{course.courseStats.avgCutLine.toFixed(1)}
              </p>
            </Card>
          )}
          <Card>
            <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Events Played</p>
            <p className="text-xl font-mono font-bold text-white">{course.courseStats.tournamentsPlayed}</p>
          </Card>
        </div>
      )}

      {/* What Wins Here — Full-width intelligence card */}
      {dnaCategories.length > 0 && (
        <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">What Wins Here</h4>
            {upcomingTournament && (
              <Link
                to={`/tournaments/${upcomingTournament.id}`}
                className="text-xs text-gold hover:text-gold/80 transition-colors font-medium"
              >
                View Field Fit for {upcomingTournament.name} →
              </Link>
            )}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {dnaCategories.map((cat) => {
                const barPct = Math.min(100, Math.max(20, ((cat.value - 0.15) / 0.25) * 80 + 20))
                return (
                  <div key={cat.label} className="rounded-lg bg-dark-primary/60 border border-dark-border/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-text-secondary font-medium">{cat.label}</span>
                      <span className={`text-[10px] font-mono font-bold ${cat.rating.color}`}>
                        {cat.rating.text}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${cat.rating.bar} transition-all`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">
                      {(cat.value * 100).toFixed(0)}% weight
                    </span>
                  </div>
                )
              })}
            </div>
            {buildNarrative() && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {buildNarrative()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Best Course Fits ─────────────────────────────────────────────── */}
      {course.topCourseFits && course.topCourseFits.length > 0 && (
        <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Best Course Fits</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Players whose skills best match this course's DNA</p>
            </div>
            {upcomingTournament && (
              <Link
                to={`/tournaments/${upcomingTournament.id}`}
                className="text-xs text-gold hover:text-gold/80 transition-colors font-medium"
              >
                Full Field →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-dark-border">
            {course.topCourseFits.map((p, i) => (
              <Link
                key={p.id}
                to={`/players/${p.id}`}
                className="bg-dark-secondary p-3 hover:bg-dark-tertiary/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xs font-mono text-text-muted w-4 flex-shrink-0">
                    {i + 1}.
                  </span>
                  {p.headshotUrl ? (
                    <img src={p.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-base flex-shrink-0">
                      {p.countryFlag || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-gold transition-colors truncate">
                      {p.name}
                    </p>
                    {p.owgr && (
                      <p className="text-[10px] text-text-muted font-mono">OWGR #{p.owgr}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-6">
                  <div>
                    <p className="text-[9px] text-text-muted uppercase">Fit</p>
                    <p className={`text-xs font-mono font-bold ${
                      p.courseFitScore >= 80 ? 'text-gold' : p.courseFitScore >= 60 ? 'text-yellow-400' : 'text-text-secondary'
                    }`}>
                      {Math.round(p.courseFitScore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-muted uppercase">CPI</p>
                    <p className={`text-xs font-mono font-bold ${
                      p.cpi > 1 ? 'text-emerald-400' : p.cpi > 0 ? 'text-green-400' : 'text-text-secondary'
                    }`}>
                      {p.cpi != null ? (p.cpi > 0 ? `+${p.cpi.toFixed(1)}` : p.cpi.toFixed(1)) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-muted uppercase">Form</p>
                    <p className={`text-xs font-mono font-bold ${
                      p.formScore >= 80 ? 'text-emerald-400' : p.formScore >= 60 ? 'text-green-400' : 'text-text-secondary'
                    }`}>
                      {p.formScore != null ? Math.round(p.formScore) : '-'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Weather + News side by side ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather */}
        <WeatherStrip
          weather={course.weather || []}
          tournamentStart={upcomingTournament?.startDate}
        />

        {/* News */}
        <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border">
            <h4 className="text-sm font-semibold text-text-muted">Latest News</h4>
          </div>
          {course.news && course.news.length > 0 ? (
            <div className="divide-y divide-dark-border/30">
              {course.news.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 p-3 hover:bg-dark-tertiary/50 transition-colors group"
                >
                  {article.imageUrl && (
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-16 h-12 rounded object-cover bg-dark-tertiary flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                      {article.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {article.byline && (
                        <span className="text-[10px] text-text-muted truncate">{article.byline}</span>
                      )}
                      <span className="text-[10px] text-text-muted">
                        {new Date(article.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted text-xs">
              No recent news for this event.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Top Historical Performers Card */}
          {course.playerHistory && course.playerHistory.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-dark-border">
                <h4 className="text-sm font-semibold text-text-muted">Course History Leaders</h4>
                <p className="text-[10px] text-text-muted mt-0.5">Best historical performers (min 4 rounds)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-tertiary">
                    <tr className="text-xs text-text-muted">
                      <th className="p-3 text-left">Player</th>
                      <th className="p-3 text-center">Rnds</th>
                      <th className="p-3 text-center">Avg</th>
                      <th className="p-3 text-center hidden sm:table-cell">SG</th>
                      <th className="p-3 text-center hidden sm:table-cell">Cut%</th>
                      <th className="p-3 text-center">Best</th>
                      <th className="p-3 text-right">W</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.playerHistory.map((ph) => {
                      const cutRate = ph.cuts > 0 ? ((ph.cutsMade / ph.cuts) * 100).toFixed(0) : null
                      return (
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
                          <td className={`p-3 text-center font-mono text-xs hidden sm:table-cell ${
                            ph.sgTotal > 0 ? 'text-emerald-400' : ph.sgTotal != null ? 'text-red-400' : 'text-text-muted'
                          }`}>
                            {ph.sgTotal != null ? (ph.sgTotal > 0 ? `+${ph.sgTotal.toFixed(1)}` : ph.sgTotal.toFixed(1)) : '-'}
                          </td>
                          <td className="p-3 text-center font-mono text-xs text-text-secondary hidden sm:table-cell">
                            {cutRate != null ? `${cutRate}%` : '-'}
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
                      )
                    })}
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
