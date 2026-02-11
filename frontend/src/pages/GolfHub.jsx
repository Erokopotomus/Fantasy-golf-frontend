import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FeedList from '../components/feed/FeedList'
import WeatherStrip from '../components/tournament/WeatherStrip'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatDateRange = (start, end) => {
  if (!start) return ''
  const s = formatDate(start)
  const e = end ? formatDate(end) : ''
  return e ? `${s} – ${e}` : s
}

const formatPurse = (purse) => {
  if (!purse) return null
  const num = Number(purse)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num}`
}

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff > 0 ? diff : null
}

const EventBadge = ({ tournament }) => {
  if (tournament.isMajor) return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">MAJOR</span>
  if (tournament.isSignature) return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange/20 text-orange border border-orange/30">SIGNATURE</span>
  return null
}

const quickLinks = [
  {
    label: 'Players',
    href: '/players',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    label: 'Tournaments',
    href: '/tournaments',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'Leaderboard',
    href: '/tournaments',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'News',
    href: '/news',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
  },
]

const GolfHub = () => {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [tournaments, setTournaments] = useState([])
  const [tournamentsLoading, setTournamentsLoading] = useState(true)
  const [leagues, setLeagues] = useState([])
  const [rosterPlayers, setRosterPlayers] = useState([]) // [{id, name, leagueId, teamId}]
  const [heroIntel, setHeroIntel] = useState(null) // { weather, leaderboard, course }

  // Fetch tournaments with fields
  useEffect(() => {
    api.getUpcomingTournamentsWithFields()
      .then(data => setTournaments(data.tournaments || []))
      .catch(() => setTournaments([]))
      .finally(() => setTournamentsLoading(false))
  }, [])

  // Fetch feed
  useEffect(() => {
    api.getFeed('golf', { limit: 8 })
      .then(data => setCards(data.cards || []))
      .catch(() => setCards([]))
      .finally(() => setFeedLoading(false))
  }, [])

  // Fetch user's golf leagues + roster players (auth-gated)
  useEffect(() => {
    if (!user) return
    api.getLeagues()
      .then(async (data) => {
        const allLeagues = data.leagues || data || []
        // Golf leagues = those without NFL sport (sport slug 'golf' or no sportId with golf-like config)
        const golfLeagues = allLeagues.filter(l => {
          const slug = l.sport?.slug || l.sportSlug || ''
          return slug === 'golf' || slug === '' || !slug
        })
        setLeagues(golfLeagues)

        // For each golf league, find user's team and get roster
        const players = []
        for (const league of golfLeagues.slice(0, 3)) { // limit to 3 leagues
          const userTeam = league.teams?.find(t => t.userId === user.id)
          if (!userTeam) continue
          try {
            const teamData = await api.getTeam(userTeam.id)
            const roster = teamData.team?.rosterEntries || teamData.rosterEntries || []
            for (const entry of roster) {
              const p = entry.player || {}
              players.push({
                id: p.id || entry.playerId,
                name: p.name || 'Unknown',
                leagueId: league.id,
                leagueName: league.name,
                teamId: userTeam.id,
              })
            }
          } catch { /* skip */ }
        }
        setRosterPlayers(players)
      })
      .catch(() => { setLeagues([]); setRosterPlayers([]) })
  }, [user])

  // Derive hero tournament (first in-progress, or first upcoming)
  const heroTournament = useMemo(() => {
    const inProgress = tournaments.find(t => t.status === 'IN_PROGRESS')
    if (inProgress) return inProgress
    return tournaments.find(t => t.status === 'UPCOMING') || null
  }, [tournaments])

  // Fetch tournament intel (weather + field) for the hero tournament
  useEffect(() => {
    if (!heroTournament?.id || heroTournament.status !== 'UPCOMING') return
    Promise.all([
      api.getTournamentWeather(heroTournament.id).catch(() => ({ weather: [] })),
      api.getTournamentLeaderboard(heroTournament.id).catch(() => ({ leaderboard: [] })),
      api.getTournament(heroTournament.id).catch(() => ({ tournament: null })),
    ]).then(([weatherData, lbData, tData]) => {
      setHeroIntel({
        weather: weatherData?.weather || [],
        leaderboard: lbData?.leaderboard || [],
        course: tData?.tournament?.course || null,
      })
    })
  }, [heroTournament?.id, heroTournament?.status])

  // Upcoming schedule (exclude the hero)
  const upcomingSchedule = useMemo(() => {
    return tournaments
      .filter(t => t.id !== heroTournament?.id)
      .slice(0, 4)
  }, [tournaments, heroTournament])

  // Roster check: which of user's roster players are in the hero tournament's field
  const rosterCheck = useMemo(() => {
    if (!heroTournament || rosterPlayers.length === 0) return null
    const fieldSet = new Set((heroTournament.field || []).map(p => p.playerId))
    const fieldAnnounced = heroTournament.fieldSize > 0 || heroTournament.field?.length > 0
    const playing = rosterPlayers.filter(p => fieldSet.has(p.id))
    const notPlaying = rosterPlayers.filter(p => !fieldSet.has(p.id))
    return { playing, notPlaying, fieldAnnounced, total: rosterPlayers.length }
  }, [heroTournament, rosterPlayers])

  const isLive = heroTournament?.status === 'IN_PROGRESS'
  const days = heroTournament ? daysUntil(heroTournament.startDate) : null

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <span className="text-lg">⛳</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                Golf
              </h1>
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl">
              Schedule, field updates, and roster planning — your PGA command center.
            </p>
          </div>

          {/* Section 1: This Week Hero Card */}
          {tournamentsLoading ? (
            <div className="mb-8 h-36 bg-white/[0.04] rounded-xl animate-pulse" />
          ) : heroTournament ? (
            <Link
              to={`/tournaments/${heroTournament.id}`}
              className="block mb-8 rounded-xl border overflow-hidden transition-all hover:border-emerald-500/40 group"
              style={{ borderColor: isLive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255,255,255,0.08)' }}
            >
              <div className={`p-5 sm:p-6 ${isLive ? 'bg-rose/[0.04]' : 'bg-white/[0.03]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-rose bg-rose/10 px-2 py-0.5 rounded">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose" />
                          </span>
                          LIVE — Round {heroTournament.currentRound || '?'}
                        </span>
                      ) : days != null ? (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Starts in {days} day{days !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-text-muted bg-white/[0.06] px-2 py-0.5 rounded">UPCOMING</span>
                      )}
                      <EventBadge tournament={heroTournament} />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {heroTournament.name}
                    </h2>

                    {heroTournament.course && (
                      <p className="text-sm text-gold mt-1">
                        {heroTournament.course.nickname || heroTournament.course.name}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted font-mono">
                      <span>{formatDateRange(heroTournament.startDate, heroTournament.endDate)}</span>
                      {heroTournament.purse && <span>{formatPurse(heroTournament.purse)}</span>}
                      {heroTournament.fieldSize > 0 && <span>{heroTournament.fieldSize} players</span>}
                    </div>
                  </div>

                  <div className="shrink-0 text-right hidden sm:block">
                    <span className="text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      {isLive ? 'View Leaderboard' : 'View Details'} →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : null}

          {/* Tournament Preview Banner */}
          {heroTournament?.status === 'UPCOMING' && (
            <Link
              to={`/tournaments/${heroTournament.id}/preview`}
              className="block mb-8 rounded-xl border border-gold/20 bg-gradient-to-r from-gold/[0.08] via-gold/[0.03] to-transparent p-5 hover:border-gold/40 hover:from-gold/[0.12] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-display font-bold text-gold">This Week in Golf</p>
                    <p className="text-xs text-text-muted mt-0.5">Course DNA, players to watch, key storylines, weather outlook</p>
                  </div>
                </div>
                <span className="text-sm text-gold group-hover:text-gold/80 transition-colors font-semibold shrink-0 ml-4 flex items-center gap-1">
                  Read Preview
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          )}

          {/* AI Scout Report Banner */}
          {heroTournament && (
            <Link
              to={`/scout/golf/${heroTournament.id}`}
              className="block mb-4 rounded-xl border border-purple-400/20 bg-gradient-to-r from-purple-500/[0.06] to-gold/[0.03] p-4 hover:border-purple-400/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <p className="text-sm font-display font-bold text-purple-300">AI Scout Report</p>
                    <p className="text-[11px] text-white/40">Field analysis, value plays, course fit — powered by Clutch Scout</p>
                  </div>
                </div>
                <span className="text-xs text-purple-300 group-hover:text-purple-200 transition-colors font-semibold">View &rarr;</span>
              </div>
            </Link>
          )}

          {/* Section 1B: Tournament Intel Preview */}
          {heroTournament?.status === 'UPCOMING' && heroIntel && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-white">Tournament Intel</h2>
                <Link
                  to={`/tournaments/${heroTournament.id}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Full Field →
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Course DNA snapshot */}
                {heroIntel.course && (
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">What Wins Here</h3>
                      {heroIntel.course.id && (
                        <Link to={`/courses/${heroIntel.course.id}`} className="text-[10px] text-gold hover:text-gold/80 transition-colors">
                          Course Profile →
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-3">
                      {heroIntel.course.name}
                      {heroIntel.course.par && ` | Par ${heroIntel.course.par}`}
                      {heroIntel.course.yardage && ` | ${heroIntel.course.yardage.toLocaleString()} yds`}
                    </p>
                    {(() => {
                      const getDnaLabel = (val) => {
                        if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bar: 'bg-gold' }
                        if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bar: 'bg-emerald-400' }
                        if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bar: 'bg-white/30' }
                        return { text: 'Low', color: 'text-text-muted', bar: 'bg-white/10' }
                      }
                      const dna = [
                        { label: 'Driving', value: heroIntel.course.drivingImportance },
                        { label: 'Approach', value: heroIntel.course.approachImportance },
                        { label: 'Around Green', value: heroIntel.course.aroundGreenImportance },
                        { label: 'Putting', value: heroIntel.course.puttingImportance },
                      ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) }))
                      if (dna.length === 0) return <p className="text-xs text-text-muted">Course profile not yet available</p>
                      return (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {dna.map(cat => {
                            const barPct = Math.min(100, Math.max(20, ((cat.value - 0.15) / 0.25) * 80 + 20))
                            return (
                              <div key={cat.label}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-text-secondary text-[10px] font-medium">{cat.label}</span>
                                  <span className={`text-[9px] font-mono font-bold ${cat.rating.color}`}>{cat.rating.text}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className={`h-full rounded-full ${cat.rating.bar} transition-all`} style={{ width: `${barPct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Top Course Fits */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Top Course Fits</h3>
                  {(() => {
                    const fits = (heroIntel.leaderboard || [])
                      .filter(e => e.clutchMetrics?.courseFitScore != null)
                      .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
                      .slice(0, 5)
                    if (fits.length === 0) return <p className="text-xs text-text-muted">Course fit data not yet available</p>
                    return (
                      <div className="space-y-2">
                        {fits.map((e, i) => {
                          const p = e.player || e
                          const score = Math.round(e.clutchMetrics.courseFitScore)
                          return (
                            <Link key={p.id || i} to={`/players/${p.id}`} className="flex items-center justify-between hover:bg-white/[0.04] -mx-1 px-1 py-0.5 rounded transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-text-muted w-3">{i + 1}.</span>
                                <span className="text-xs font-medium text-white">{p.name}</span>
                              </div>
                              <span className={`text-xs font-mono font-bold ${score >= 80 ? 'text-gold' : score >= 60 ? 'text-yellow-400' : 'text-text-secondary'}`}>
                                {score}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Weather snapshot */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Weather Outlook</h3>
                  {heroIntel.weather && heroIntel.weather.length > 0 ? (
                    <div className="space-y-2">
                      {heroIntel.weather.slice(0, 4).map((day, i) => {
                        const windColor = (day.windSpeed || 0) >= 20 ? 'text-red-400' : (day.windSpeed || 0) >= 15 ? 'text-orange-400' : 'text-text-secondary'
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-text-muted uppercase">Rd {day.round || i + 1}</span>
                            <div className="flex items-center gap-3">
                              {day.temperature != null && (
                                <span className="text-xs font-mono text-white">{Math.round(day.temperature)}°</span>
                              )}
                              {day.windSpeed != null && (
                                <span className={`text-xs font-mono ${windColor}`}>{Math.round(day.windSpeed)} mph</span>
                              )}
                              {day.difficultyImpact != null && (
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                                  day.difficultyImpact >= 0.6 ? 'text-red-400 bg-red-500/15 border-red-500/25' :
                                  day.difficultyImpact >= 0.4 ? 'text-orange-400 bg-orange-500/15 border-orange-500/25' :
                                  day.difficultyImpact >= 0.2 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' :
                                  'text-emerald-400 bg-emerald-500/15 border-emerald-500/25'
                                }`}>
                                  {day.difficultyImpact >= 0.6 ? 'Brutal' : day.difficultyImpact >= 0.4 ? 'Windy' : day.difficultyImpact >= 0.2 ? 'Breezy' : 'Calm'}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">
                      {heroTournament?.startDate ? (() => {
                        const daysOut = Math.ceil((new Date(heroTournament.startDate) - new Date()) / 86400000)
                        return daysOut > 16 ? `Forecast available ~${daysOut - 14} days before` : 'No weather data yet'
                      })() : 'No weather data yet'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Quick Links */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-8">
            {quickLinks.map(link => (
              <Link
                key={link.label}
                to={link.href}
                className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-xl p-3 sm:p-4 flex flex-col items-center gap-1.5 hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all group"
              >
                <div className="text-white/40 group-hover:text-emerald-400 transition-colors">
                  {link.icon}
                </div>
                <span className="text-white text-[10px] sm:text-xs font-semibold">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Section 3: Upcoming Schedule */}
          {upcomingSchedule.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-white mb-4">Upcoming Schedule</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingSchedule.map(t => {
                  const fieldAnnounced = t.fieldSize > 0 || t.field?.length > 0
                  const rosterInField = rosterPlayers.filter(rp =>
                    (t.field || []).some(fp => fp.playerId === rp.id)
                  )
                  return (
                    <Link
                      key={t.id}
                      to={`/tournaments/${t.id}`}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.06] hover:border-emerald-500/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-display font-semibold text-white group-hover:text-emerald-400 transition-colors">
                              {t.shortName || t.name}
                            </h3>
                            <EventBadge tournament={t} />
                          </div>
                          {t.course && (
                            <p className="text-xs text-text-muted mt-0.5">{t.course.nickname || t.course.name}</p>
                          )}
                          <p className="text-xs text-text-muted mt-1 font-mono">{formatDateRange(t.startDate, t.endDate)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {t.purse && <span className="text-xs font-mono text-text-muted">{formatPurse(t.purse)}</span>}
                          <div className="mt-1">
                            {fieldAnnounced ? (
                              <span className="text-[10px] font-mono text-emerald-400/80">{t.fieldSize || t.field?.length} in field</span>
                            ) : (
                              <span className="text-[10px] font-mono text-text-muted/50">Field TBD</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Roster indicator */}
                      {rosterInField.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-[10px] text-emerald-400/80">
                            {rosterInField.length} roster player{rosterInField.length !== 1 ? 's' : ''} confirmed
                          </span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 4: Roster Status (auth-gated, golf league only) */}
          {user && rosterCheck && heroTournament && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-white mb-4">
                Roster Check — {heroTournament.shortName || heroTournament.name}
              </h2>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                {!rosterCheck.fieldAnnounced ? (
                  <div className="text-center py-4">
                    <p className="text-text-muted text-sm">Field not yet announced</p>
                    <p className="text-text-muted/60 text-xs mt-1">PGA Tour fields are typically published Tuesday evening</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-sm font-semibold text-white">
                          {rosterCheck.playing.length} of {rosterCheck.total} confirmed
                        </span>
                      </div>
                      {rosterCheck.notPlaying.length > 0 && (
                        <span className="text-xs text-text-muted">
                          ({rosterCheck.notPlaying.length} not in field)
                        </span>
                      )}
                    </div>

                    {/* Two columns */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Playing */}
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Playing</p>
                        {rosterCheck.playing.length > 0 ? (
                          <div className="space-y-1.5">
                            {rosterCheck.playing.map(p => (
                              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-2 text-sm text-white hover:text-emerald-400 transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {p.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted">None confirmed</p>
                        )}
                      </div>

                      {/* Not Playing / Unknown */}
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Not Playing</p>
                        {rosterCheck.notPlaying.length > 0 ? (
                          <div className="space-y-1.5">
                            {rosterCheck.notPlaying.map(p => (
                              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                {p.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-400/60">Full roster confirmed!</p>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    {leagues.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-4 text-xs">
                        <Link to={`/leagues/${leagues[0].id}/roster`} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                          Full Roster →
                        </Link>
                        <Link to={`/leagues/${leagues[0].id}/waivers`} className="text-text-muted hover:text-white transition-colors">
                          Waiver Wire →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Feed */}
          <div>
            <h2 className="text-lg font-display font-bold text-white mb-4">Latest</h2>
            <FeedList
              cards={cards}
              loading={feedLoading}
              emptyMessage="No golf updates yet. Check back when tournaments are in progress."
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default GolfHub
