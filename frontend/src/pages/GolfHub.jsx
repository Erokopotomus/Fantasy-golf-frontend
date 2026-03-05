import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FeedList from '../components/feed/FeedList'
import { formatDate, formatDateRange, formatPurse } from '../utils/dateUtils'
import { computePowerScore } from '../utils/clutchMetrics'
import TournamentHeader from '../components/tournament/TournamentHeader'

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
    label: 'Season Race',
    href: '/season-race',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  },
  {
    label: 'Compare',
    href: '/golf/compare',
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
  const [lastWeekTournament, setLastWeekTournament] = useState(null)
  const [lastWeekTop5, setLastWeekTop5] = useState([])

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
    if (!heroTournament?.id || (heroTournament.status !== 'UPCOMING' && heroTournament.status !== 'IN_PROGRESS')) return
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

  // Fetch last week's completed tournament
  useEffect(() => {
    api.getTournaments({ status: 'COMPLETED', limit: 1 })
      .then(async (data) => {
        const t = (data.tournaments || [])[0]
        if (!t) return
        setLastWeekTournament(t)
        const lbData = await api.getTournamentLeaderboard(t.id).catch(() => ({ leaderboard: [] }))
        const lb = lbData?.leaderboard || []
        setLastWeekTop5(lb.filter(e => e.position && e.position <= 5).slice(0, 5))
      })
      .catch(() => {})
  }, [])

  // Trending players derived from heroIntel leaderboard
  const trendingPlayers = useMemo(() => {
    const lb = heroIntel?.leaderboard || []
    if (!lb.some(p => p.clutchMetrics?.formScore != null)) return null
    const hotForm = [...lb]
      .filter(p => p.clutchMetrics?.formScore != null)
      .sort((a, b) => (b.clutchMetrics.formScore || 0) - (a.clutchMetrics.formScore || 0))
      .slice(0, 5)
    const bestFit = [...lb]
      .filter(p => p.clutchMetrics?.courseFitScore != null)
      .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
      .slice(0, 5)
    return (hotForm.length > 0 || bestFit.length > 0) ? { hotForm, bestFit } : null
  }, [heroIntel])

  // Upcoming schedule (exclude the hero AND any IN_PROGRESS tournaments)
  const upcomingSchedule = useMemo(() => {
    return tournaments
      .filter(t => t.id !== heroTournament?.id && t.status !== 'IN_PROGRESS')
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
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-field-bright/20 flex items-center justify-center">
                <span className="text-lg">⛳</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text-primary tracking-tight">
                Golf
              </h1>
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl">
              Schedule, field updates, and roster planning — your PGA command center.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-8">
            {quickLinks.map(link => (
              <Link
                key={link.label}
                to={link.href}
                className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-3 sm:p-4 flex flex-col items-center gap-1.5 hover:bg-[var(--surface-alt)] hover:border-field-bright/30 transition-all group shadow-card"
              >
                <div className="text-text-primary/40 group-hover:text-field transition-colors">
                  {link.icon}
                </div>
                <span className="text-text-primary text-[10px] sm:text-xs font-semibold">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* This Week — Unified Tournament Section */}
          {tournamentsLoading ? (
            <div className="mb-8 h-36 bg-[var(--stone)] rounded-xl animate-pulse" />
          ) : heroTournament ? (
            <div className="mb-8 space-y-3">
              {/* Reuse TournamentHeader — has Field Strength, Forecast, and Course DNA panels */}
              <TournamentHeader
                tournament={{
                  ...heroTournament,
                  course: heroIntel?.course || heroTournament.course,
                }}
                leaderboard={heroIntel?.leaderboard || heroTournament.field || []}
              />

              {/* Quick action links */}
              <div className="flex flex-wrap items-center gap-2">
                {heroTournament.status === 'UPCOMING' && (
                  <Link
                    to={`/tournaments/${heroTournament.id}/preview`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/15 hover:border-gold/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Preview Field
                  </Link>
                )}
                <Link
                  to={`/scout/golf/${heroTournament.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-400/20 rounded-lg hover:bg-purple-500/15 hover:border-purple-400/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Scout Report
                </Link>
                <Link
                  to={`/tournaments/${heroTournament.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-field bg-field-bright/10 border border-field-bright/20 rounded-lg hover:bg-field-bright/15 hover:border-field-bright/30 transition-colors"
                >
                  Full Field
                </Link>
              </div>
            </div>
          ) : null}


          {/* Trending Players — Form + Course Fit */}
          {trendingPlayers && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4">Trending This Week</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Hottest Form */}
                {trendingPlayers.hotForm.length > 0 && (
                  <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[var(--card-border)] bg-gradient-to-r from-orange-500/5 to-transparent">
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                        <span className="text-blaze">Hottest Form</span>
                      </h3>
                    </div>
                    <div className="p-3 space-y-1">
                      {trendingPlayers.hotForm.map((entry, i) => (
                        <Link
                          key={entry.player?.id || i}
                          to={`/players/${entry.player?.id}`}
                          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--surface-alt)] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-mono text-text-muted w-4">{i + 1}.</span>
                            {entry.player?.headshotUrl ? (
                              <img src={entry.player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-[var(--stone)]" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[var(--stone)] flex items-center justify-center text-xs">
                                {entry.player?.countryFlag || '?'}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-text-primary truncate">{entry.player?.name || entry.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`font-mono text-xs font-bold ${
                              entry.clutchMetrics.formScore >= 80 ? 'text-blaze' : 'text-text-secondary'
                            }`}>
                              {Math.round(entry.clutchMetrics.formScore)}
                            </span>
                            {entry.clutchMetrics.formScore >= 80 && (
                              <span className="text-[10px]" title="On fire">
                                <svg className="w-3.5 h-3.5 text-blaze" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Best Course Fits */}
                {trendingPlayers.bestFit.length > 0 && (
                  <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[var(--card-border)] bg-gradient-to-r from-gold/5 to-transparent">
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                        <span className="text-gold">Best Course Fits</span>
                      </h3>
                    </div>
                    <div className="p-3 space-y-1">
                      {trendingPlayers.bestFit.map((entry, i) => {
                        const fit = entry.clutchMetrics.courseFitScore
                        const fitLabel = fit >= 85 ? 'Elite Fit' : fit >= 75 ? 'Strong Fit' : 'Neutral'
                        const fitColor = fit >= 85 ? 'text-gold' : fit >= 75 ? 'text-crown' : 'text-text-muted'
                        return (
                          <Link
                            key={entry.player?.id || i}
                            to={`/players/${entry.player?.id}`}
                            className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--surface-alt)] transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[10px] font-mono text-text-muted w-4">{i + 1}.</span>
                              {entry.player?.headshotUrl ? (
                                <img src={entry.player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-[var(--stone)]" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[var(--stone)] flex items-center justify-center text-xs">
                                  {entry.player?.countryFlag || '?'}
                                </div>
                              )}
                              <span className="text-xs font-semibold text-text-primary truncate">{entry.player?.name || entry.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-mono text-xs font-bold ${fitColor}`}>
                                {Math.round(fit)}
                              </span>
                              <span className={`text-[9px] font-medium ${fitColor}`}>{fitLabel}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Upcoming Schedule */}
          {upcomingSchedule.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4">Upcoming Schedule</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingSchedule.map(t => {
                  const fieldAnnounced = t.fieldSize > 0 || t.field?.length > 0
                  const rosterInField = rosterPlayers.filter(rp =>
                    (t.field || []).some(fp => fp.playerId === rp.id)
                  )
                  const hasImage = !!t.course?.imageUrl
                  return (
                    <Link
                      key={t.id}
                      to={`/tournaments/${t.id}`}
                      className={`rounded-xl overflow-hidden relative border border-[var(--card-border)] hover:border-field-bright/20 transition-all group shadow-card ${hasImage ? '' : 'bg-[var(--surface)] hover:bg-[var(--surface-alt)]'}`}
                    >
                      {hasImage && (
                        <>
                          <img src={t.course.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/60 to-black/40" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        </>
                      )}
                      <div className="relative p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-sm font-display font-semibold transition-colors ${hasImage ? 'text-white group-hover:text-emerald-300' : 'text-text-primary group-hover:text-field'}`}>
                                {t.shortName || t.name}
                              </h3>
                              <EventBadge tournament={t} />
                            </div>
                            {t.course && (
                              <p className={`text-xs mt-0.5 ${hasImage ? 'text-gold drop-shadow-sm' : 'text-text-muted'}`}>{t.course.nickname || t.course.name}</p>
                            )}
                            <p className={`text-xs mt-1 font-mono ${hasImage ? 'text-white/60' : 'text-text-muted'}`}>{formatDateRange(t.startDate, t.endDate)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {t.purse && <span className={`text-xs font-mono ${hasImage ? 'text-white/60' : 'text-text-muted'}`}>{formatPurse(t.purse)}</span>}
                            <div className="mt-1">
                              {fieldAnnounced ? (
                                <span className="text-[10px] font-mono text-field/80">{t.fieldSize || t.field?.length} in field</span>
                              ) : (
                                <span className={`text-[10px] font-mono ${hasImage ? 'text-white/40' : 'text-text-muted/50'}`}>Field TBD</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Roster indicator */}
                        {rosterInField.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-field-bright inline-block" />
                            <span className="text-[10px] text-field/80">
                              {rosterInField.length} roster player{rosterInField.length !== 1 ? 's' : ''} confirmed
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 4: Roster Status (auth-gated, golf league only) */}
          {user && rosterCheck && heroTournament && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4">
                Roster Check — {heroTournament.shortName || heroTournament.name}
              </h2>
              <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-5">
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
                        <span className="w-3 h-3 rounded-full bg-field-bright inline-block" />
                        <span className="text-sm font-semibold text-text-primary">
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
                        <p className="text-xs font-semibold text-field uppercase tracking-wider mb-2">Playing</p>
                        {rosterCheck.playing.length > 0 ? (
                          <div className="space-y-1.5">
                            {rosterCheck.playing.map(p => (
                              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-2 text-sm text-text-primary hover:text-field transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-field-bright shrink-0" />
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
                              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--stone)] shrink-0" />
                                {p.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-field/60">Full roster confirmed!</p>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    {leagues.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center gap-4 text-xs">
                        <Link to={`/leagues/${leagues[0].id}/roster`} className="text-field hover:text-emerald-300 transition-colors">
                          Full Roster →
                        </Link>
                        <Link to={`/leagues/${leagues[0].id}/waivers`} className="text-text-muted hover:text-text-primary transition-colors">
                          Waiver Wire →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Last Week's Results */}
          {lastWeekTournament && lastWeekTop5.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4">Last Week's Results</h2>
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--card-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{lastWeekTournament.name}</h3>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">
                        {formatDateRange(lastWeekTournament.startDate, lastWeekTournament.endDate)}
                        {lastWeekTournament.course && ` — ${lastWeekTournament.course.nickname || lastWeekTournament.course.name}`}
                      </p>
                    </div>
                    <Link
                      to={`/tournaments/${lastWeekTournament.id}/recap`}
                      className="text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
                    >
                      View Full Recap →
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-[var(--card-border)]">
                  {lastWeekTop5.map((entry, i) => (
                    <div key={entry.player?.id || i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                        entry.position === 1
                          ? 'bg-gold/20 text-gold'
                          : 'bg-[var(--stone)] text-text-muted'
                      }`}>
                        {entry.positionTied ? `T${entry.position}` : entry.position}
                      </span>
                      {entry.player?.headshotUrl ? (
                        <img src={entry.player.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-[var(--stone)] shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--stone)] flex items-center justify-center text-xs shrink-0">
                          {entry.player?.countryFlag || '?'}
                        </div>
                      )}
                      <Link to={`/players/${entry.player?.id}`} className="text-xs font-semibold text-text-primary hover:text-gold transition-colors truncate min-w-0 flex-1">
                        {entry.player?.name}
                      </Link>
                      <span className={`font-mono text-xs font-bold shrink-0 ${
                        (entry.totalToPar ?? 0) < 0 ? 'text-field' : (entry.totalToPar ?? 0) === 0 ? 'text-text-secondary' : 'text-live-red'
                      }`}>
                        {entry.totalToPar != null ? (entry.totalToPar > 0 ? `+${entry.totalToPar}` : entry.totalToPar === 0 ? 'E' : entry.totalToPar) : '—'}
                      </span>
                      {entry.sgTotal != null && (
                        <span className={`font-mono text-[10px] shrink-0 ${entry.sgTotal > 0 ? 'text-field' : 'text-live-red'}`}>
                          SG {entry.sgTotal > 0 ? '+' : ''}{entry.sgTotal.toFixed(1)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Feed */}
          <div>
            <h2 className="text-lg font-display font-bold text-text-primary mb-4">Latest</h2>
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
