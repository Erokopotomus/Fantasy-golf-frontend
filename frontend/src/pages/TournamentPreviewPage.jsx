import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import useTournamentPreview from '../hooks/useTournamentPreview'
import {
  generateCourseNarrative,
  selectPlayersToWatch,
  generateStorylines,
} from '../utils/storylineGenerator'
import { formatDate, formatDateRange, formatPurse } from '../utils/dateUtils'

const getDnaLabel = (val) => {
  if (val == null) return null
  if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bar: 'bg-gold' }
  if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bar: 'bg-[var(--stone)]' }
  return { text: 'Low', color: 'text-text-muted', bar: 'bg-[var(--stone)]' }
}

const storyIcons = {
  trophy: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3h14l-1.405 7.026A5 5 0 0112.72 14H11.28a5 5 0 01-4.875-3.974L5 3zM12 14v4m-4 4h8m-4-4v4" />
    </svg>
  ),
  fire: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  history: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  wind: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8h13a4 4 0 100-4M3 16h9a4 4 0 010 4M3 12h18" />
    </svg>
  ),
  sun: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  cloud: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
}

// ── Section Components ────────────────────────────────────────────

const SectionHeader = ({ children, subtitle }) => (
  <div className="mb-5">
    <h2 className="text-xl sm:text-2xl font-display font-bold text-text-primary tracking-tight">
      {children}
    </h2>
    {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
  </div>
)

const StatPill = ({ label, value, color = 'text-text-primary' }) => (
  <div className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-center">
    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
  </div>
)

// ── Main Page ─────────────────────────────────────────────────────

const TournamentPreviewPage = () => {
  const { tournamentId } = useParams()
  const { tournament, course, leaderboard, weather, loading, error } = useTournamentPreview(tournamentId)

  const playersToWatch = useMemo(
    () => selectPlayersToWatch(leaderboard),
    [leaderboard]
  )

  const storylines = useMemo(
    () => generateStorylines(leaderboard, course, weather, tournament),
    [leaderboard, course, weather, tournament]
  )

  const courseNarrative = useMemo(
    () => generateCourseNarrative(course),
    [course]
  )

  const dnaCategories = useMemo(() => {
    if (!course) return []
    return [
      { label: 'Driving', value: course.drivingImportance },
      { label: 'Approach', value: course.approachImportance },
      { label: 'Around Green', value: course.aroundGreenImportance },
      { label: 'Putting', value: course.puttingImportance },
    ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) }))
  }, [course])

  const fieldStats = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return null
    return {
      total: leaderboard.length,
      top25: leaderboard.filter(p => p.owgrRank != null && p.owgrRank <= 25).length,
      top50: leaderboard.filter(p => p.owgrRank != null && p.owgrRank <= 50).length,
      top100: leaderboard.filter(p => p.owgrRank != null && p.owgrRank <= 100).length,
      notableNames: leaderboard
        .filter(p => p.owgrRank != null)
        .sort((a, b) => (a.owgrRank || 999) - (b.owgrRank || 999))
        .slice(0, 10),
    }
  }, [leaderboard])

  // ── Loading / Error states ──────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Loading tournament preview...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-400 mb-4">{error || 'Tournament not found'}</p>
          <Link to="/tournaments" className="text-gold hover:underline text-sm">
            Back to Tournaments
          </Link>
        </div>
      </div>
    )
  }

  const hasField = leaderboard.length > 0

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.06] via-transparent to-emerald-900/[0.06]" />
          <div className="relative p-6 sm:p-8">
            {/* Badge row */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/20 uppercase tracking-wider">
                This Week in Golf
              </span>
              {tournament.isMajor && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">MAJOR</span>
              )}
              {tournament.isSignature && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange/20 text-orange border border-orange/30">SIGNATURE</span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text-primary tracking-tight leading-tight">
              {tournament.name}
            </h1>

            {(course?.nickname || course?.name || tournament.course?.name) && (
              <p className="text-gold text-base sm:text-lg font-medium mt-2">
                {course?.nickname || course?.name || tournament.course?.name}
              </p>
            )}

            {(course?.city || course?.state) && (
              <p className="text-text-secondary text-sm mt-1">
                {[course.city, course.state, course.country].filter(Boolean).join(', ')}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-sm text-text-muted font-mono">
              <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
              {tournament.purse && <span>{formatPurse(tournament.purse)} purse</span>}
              {hasField && <span>{leaderboard.length}-player field</span>}
            </div>
          </div>
        </header>

        {/* ── 2. THE COURSE ────────────────────────────────────────── */}
        {course && (dnaCategories.length > 0 || course.par || course.yardage) && (
          <section>
            <SectionHeader subtitle={course.architect ? `Designed by ${course.architect}` : null}>
              The Course
            </SectionHeader>

            {/* DNA skill bars */}
            {dnaCategories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {dnaCategories.map((cat) => {
                  const barPct = Math.min(100, Math.max(20, ((cat.value - 0.15) / 0.25) * 80 + 20))
                  return (
                    <div key={cat.label} className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-secondary font-medium">{cat.label}</span>
                        <span className={`text-[10px] font-mono font-bold ${cat.rating.color}`}>
                          {cat.rating.text}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--stone)] overflow-hidden mb-1.5">
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
            )}

            {/* Narrative paragraph */}
            {courseNarrative && (
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-5">
                {courseNarrative}
              </p>
            )}

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {course.par && <StatPill label="Par" value={course.par} />}
              {course.yardage && <StatPill label="Yardage" value={course.yardage.toLocaleString()} />}
              {course.courseStats?.avgWinningScore != null && (
                <StatPill
                  label="Avg Winning Score"
                  value={course.courseStats.avgWinningScore > 0 ? `+${course.courseStats.avgWinningScore.toFixed(1)}` : course.courseStats.avgWinningScore.toFixed(1)}
                  color={course.courseStats.avgWinningScore <= -2 ? 'text-gold' : course.courseStats.avgWinningScore <= 0 ? 'text-green-400' : 'text-red-400'}
                />
              )}
              {course.courseStats?.avgCutLine != null && (
                <StatPill
                  label="Avg Cut Line"
                  value={course.courseStats.avgCutLine > 0 ? `+${course.courseStats.avgCutLine.toFixed(1)}` : course.courseStats.avgCutLine.toFixed(1)}
                />
              )}
              {course.grassType && <StatPill label="Grass" value={course.grassType} />}
              {course.yearBuilt && <StatPill label="Est." value={course.yearBuilt} />}
            </div>
          </section>
        )}

        {/* ── 3. PLAYERS TO WATCH ──────────────────────────────────── */}
        {playersToWatch.length > 0 ? (
          <section>
            <SectionHeader subtitle="Smart picks across course fit, form, history, and value">
              Players to Watch
            </SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playersToWatch.map((player) => (
                <Link
                  key={player.id}
                  to={`/players/${player.id}`}
                  className="group rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card hover:border-gold/30 transition-all overflow-hidden"
                >
                  <div className="p-4">
                    {/* Top row: photo + name + tag */}
                    <div className="flex items-start gap-3 mb-3">
                      {player.headshotUrl ? (
                        <img
                          src={player.headshotUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover bg-[var(--stone)] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--stone)] flex items-center justify-center text-xl flex-shrink-0">
                          {player.countryFlag || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors truncate">
                          {player.name}
                        </p>
                        {player.owgrRank && (
                          <p className="text-[10px] text-text-muted font-mono">OWGR #{player.owgrRank}</p>
                        )}
                        <span className={`inline-block mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${player.tagColor}`}>
                          {player.tag}
                        </span>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 mb-3">
                      {player.clutchMetrics?.courseFitScore != null && (
                        <div>
                          <p className="text-[9px] text-text-muted uppercase">Fit</p>
                          <p className={`text-xs font-mono font-bold ${
                            player.clutchMetrics.courseFitScore >= 80 ? 'text-gold' : player.clutchMetrics.courseFitScore >= 60 ? 'text-yellow-400' : 'text-text-secondary'
                          }`}>
                            {Math.round(player.clutchMetrics.courseFitScore)}
                          </p>
                        </div>
                      )}
                      {player.clutchMetrics?.formScore != null && (
                        <div>
                          <p className="text-[9px] text-text-muted uppercase">Form</p>
                          <p className={`text-xs font-mono font-bold ${
                            player.clutchMetrics.formScore >= 80 ? 'text-emerald-400' : player.clutchMetrics.formScore >= 60 ? 'text-green-400' : 'text-text-secondary'
                          }`}>
                            {Math.round(player.clutchMetrics.formScore)}
                          </p>
                        </div>
                      )}
                      {player.courseHistory?.avgToPar != null && (
                        <div>
                          <p className="text-[9px] text-text-muted uppercase">Course Avg</p>
                          <p className="text-xs font-mono font-bold text-text-secondary">
                            {player.courseHistory.avgToPar > 0 ? '+' : ''}{player.courseHistory.avgToPar.toFixed(1)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Narrative */}
                    {player.narrative && (
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                        {player.narrative}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : course?.topCourseFits?.length > 0 && (
          /* Fallback: no field yet — show course-level best fits */
          <section>
            <SectionHeader subtitle="Players whose skill profiles best match this course — field not yet announced">
              Best Course Fits
            </SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.topCourseFits.slice(0, 6).map((p, i) => (
                <Link
                  key={p.id}
                  to={`/players/${p.id}`}
                  className="group rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card hover:border-gold/30 transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--stone)] flex items-center justify-center text-xl flex-shrink-0">
                          {p.countryFlag || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-muted">{i + 1}.</span>
                          <p className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors truncate">
                            {p.name}
                          </p>
                        </div>
                        {p.owgr && (
                          <p className="text-[10px] text-text-muted font-mono">OWGR #{p.owgr}</p>
                        )}
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-gold/20 text-gold border-gold/30">
                          Best Fit
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] text-text-muted uppercase">Fit</p>
                        <p className={`text-xs font-mono font-bold ${
                          p.courseFitScore >= 80 ? 'text-gold' : p.courseFitScore >= 60 ? 'text-yellow-400' : 'text-text-secondary'
                        }`}>
                          {Math.round(p.courseFitScore)}
                        </p>
                      </div>
                      {p.formScore != null && (
                        <div>
                          <p className="text-[9px] text-text-muted uppercase">Form</p>
                          <p className={`text-xs font-mono font-bold ${
                            p.formScore >= 80 ? 'text-emerald-400' : p.formScore >= 60 ? 'text-green-400' : 'text-text-secondary'
                          }`}>
                            {Math.round(p.formScore)}
                          </p>
                        </div>
                      )}
                      {p.cpi != null && (
                        <div>
                          <p className="text-[9px] text-text-muted uppercase">CPI</p>
                          <p className={`text-xs font-mono font-bold ${
                            p.cpi > 1 ? 'text-emerald-400' : p.cpi > 0 ? 'text-green-400' : 'text-text-secondary'
                          }`}>
                            {p.cpi > 0 ? `+${p.cpi.toFixed(1)}` : p.cpi.toFixed(1)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. KEY STORYLINES ────────────────────────────────────── */}
        {storylines.length > 0 && (
          <section>
            <SectionHeader subtitle="Auto-generated narratives from this week's data">
              Key Storylines
            </SectionHeader>
            <div className="space-y-4">
              {storylines.map((story, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card p-5 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      {storyIcons[story.icon] || storyIcons.trophy}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-text-primary mb-1.5">{story.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{story.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 5. WEATHER OUTLOOK ───────────────────────────────────── */}
        {weather && weather.length > 0 && (
          <section>
            <SectionHeader>Weather Outlook</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {weather.slice(0, 4).map((day, i) => {
                const windColor = (day.windSpeed || 0) >= 20 ? 'text-red-400' : (day.windSpeed || 0) >= 15 ? 'text-orange-400' : 'text-text-secondary'
                const diffBadge = day.difficultyImpact != null ? (
                  day.difficultyImpact >= 0.6 ? { label: 'Brutal', cls: 'text-red-400 bg-red-500/15 border-red-500/25' } :
                  day.difficultyImpact >= 0.4 ? { label: 'Windy', cls: 'text-orange-400 bg-orange-500/15 border-orange-500/25' } :
                  day.difficultyImpact >= 0.2 ? { label: 'Breezy', cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' } :
                  { label: 'Calm', cls: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' }
                ) : null

                return (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card p-4 text-center"
                  >
                    <p className="text-[10px] font-mono text-text-muted uppercase mb-2">Round {day.round || i + 1}</p>
                    {day.temperature != null && (
                      <p className="text-2xl font-mono font-bold text-text-primary mb-1">{Math.round(day.temperature)}°</p>
                    )}
                    {day.windSpeed != null && (
                      <p className={`text-xs font-mono ${windColor} mb-2`}>{Math.round(day.windSpeed)} mph wind</p>
                    )}
                    {diffBadge && (
                      <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${diffBadge.cls}`}>
                        {diffBadge.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 6. FIELD SNAPSHOT ────────────────────────────────────── */}
        {hasField && fieldStats ? (
          <section>
            <SectionHeader>Field Snapshot</SectionHeader>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3 mb-5">
              <StatPill label="Total Field" value={fieldStats.total} />
              <StatPill label="Top 25" value={fieldStats.top25} color="text-gold" />
              <StatPill label="Top 50" value={fieldStats.top50} color="text-emerald-400" />
              <StatPill label="Top 100" value={fieldStats.top100} color="text-blue-400" />
            </div>

            {/* Notable names grid */}
            {fieldStats.notableNames.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {fieldStats.notableNames.map((player) => (
                  <Link
                    key={player.id}
                    to={`/players/${player.id}`}
                    className="group flex items-center gap-2.5 rounded-lg bg-[var(--surface)] border border-[var(--card-border)] p-2.5 hover:border-gold/30 transition-all"
                  >
                    {player.headshotUrl ? (
                      <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--stone)] flex items-center justify-center text-sm flex-shrink-0">
                        {player.countryFlag || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary group-hover:text-gold transition-colors truncate">
                        {player.name}
                      </p>
                      <p className="text-[10px] text-text-muted font-mono">#{player.owgrRank}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : course?.playerHistory?.length > 0 ? (
          /* Fallback: no field — show course history leaders */
          <section>
            <SectionHeader subtitle="Best historical performers at this venue — field not yet announced">
              Course History Leaders
            </SectionHeader>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--stone)]">
                    <tr className="text-xs text-text-muted">
                      <th className="p-3 text-left">Player</th>
                      <th className="p-3 text-center">Rounds</th>
                      <th className="p-3 text-center">Avg Score</th>
                      <th className="p-3 text-center hidden sm:table-cell">SG Total</th>
                      <th className="p-3 text-center">Best</th>
                      <th className="p-3 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.playerHistory.slice(0, 10).map((ph) => {
                      const avgColor = ph.avgToPar != null ? (ph.avgToPar <= -2 ? 'text-gold' : ph.avgToPar <= 0 ? 'text-green-400' : ph.avgToPar <= 1 ? 'text-yellow-400' : 'text-red-400') : 'text-text-muted'
                      return (
                        <tr key={ph.id} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-alt)]">
                          <td className="p-3">
                            <Link to={`/players/${ph.player.id}`} className="flex items-center gap-2 hover:text-gold transition-colors">
                              {ph.player.countryFlag && <span className="text-sm">{ph.player.countryFlag}</span>}
                              <span className="text-text-primary font-medium text-xs">{ph.player.name}</span>
                            </Link>
                          </td>
                          <td className="p-3 text-center text-text-secondary font-mono">{ph.rounds}</td>
                          <td className={`p-3 text-center font-mono font-bold ${avgColor}`}>
                            {ph.avgToPar != null ? (ph.avgToPar > 0 ? `+${ph.avgToPar.toFixed(1)}` : ph.avgToPar.toFixed(1)) : '-'}
                          </td>
                          <td className={`p-3 text-center font-mono text-xs hidden sm:table-cell ${
                            ph.sgTotal > 0 ? 'text-emerald-400' : ph.sgTotal != null ? 'text-red-400' : 'text-text-muted'
                          }`}>
                            {ph.sgTotal != null ? (ph.sgTotal > 0 ? `+${ph.sgTotal.toFixed(1)}` : ph.sgTotal.toFixed(1)) : '-'}
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
            </div>
          </section>
        ) : (
          <section>
            <SectionHeader>Field Snapshot</SectionHeader>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card p-8 text-center">
              <p className="text-text-muted text-sm">Field not yet announced. Check back Tuesday evening for the confirmed player list.</p>
            </div>
          </section>
        )}

        {/* ── 7. CTA ───────────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-4">
          <Link
            to={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-text-primary text-sm font-semibold transition-colors"
          >
            View Full Leaderboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          {(course?.id || tournament.courseId) && (
            <Link
              to={`/courses/${course?.id || tournament.courseId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 text-sm font-semibold transition-colors"
            >
              Explore Course Profile
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </section>

        {/* Footer */}
        <p className="text-center text-text-muted text-xs pb-4">
          Tournament preview auto-generated by Clutch from real-time field, course, and performance data.
        </p>
      </div>
    </div>
  )
}

export default TournamentPreviewPage
