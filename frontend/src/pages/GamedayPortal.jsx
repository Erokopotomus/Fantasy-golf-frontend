import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../hooks/useLeague'
import useMatchups from '../hooks/useMatchups'
import api from '../services/api'
import Card from '../components/common/Card'

const posColors = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-emerald-500/20 text-emerald-400',
  TE: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-orange-400',
}

const formatStatLine = (sl) => {
  if (!sl) return null
  const parts = []
  if (sl.pass) parts.push(sl.pass)
  if (sl.rush) parts.push(sl.rush)
  if (sl.rec) parts.push(sl.rec)
  if (sl.kick) parts.push(sl.kick)
  if (sl.def) parts.push(sl.def)
  return parts.length > 0 ? parts.join(' | ') : null
}

const GamedayPortal = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)
  const { schedule, standings, loading: matchupsLoading } = useMatchups(leagueId)

  const [weekScores, setWeekScores] = useState(null)
  const [scoresLoading, setScoresLoading] = useState(true)

  // Compute the active/most-relevant week from schedule data
  const { activeWeek, lastCompletedWeek, currentWeekNum } = useMemo(() => {
    if (!schedule || schedule.length === 0) return {}

    // Active = has scores but not all complete (games in progress)
    const active = schedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const hasIncomplete = w.matchups.some(m => !m.completed)
      return hasScores && hasIncomplete
    })

    // Last completed
    const completed = schedule.filter(w => w.matchups.every(m => m.completed))
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null

    // Primary week: active game > last completed > first week
    const primary = active || lastCompleted || schedule[0]

    return {
      activeWeek: active,
      lastCompletedWeek: lastCompleted,
      currentWeekNum: primary?.week || 1,
    }
  }, [schedule])

  // Fetch player-level scores for the current week
  useEffect(() => {
    if (!leagueId || !currentWeekNum) return
    setScoresLoading(true)
    api.getNflWeeklyScores(leagueId, currentWeekNum)
      .then(data => setWeekScores(data))
      .catch(() => {})
      .finally(() => setScoresLoading(false))
  }, [leagueId, currentWeekNum])

  const loading = leagueLoading || matchupsLoading || scoresLoading

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
            <p className="text-text-secondary">Loading Gameday Portal...</p>
          </div>
        </div>
      </div>
    )
  }

  // Find user's matchup for this week
  const currentWeekSchedule = schedule?.find(w => w.week === currentWeekNum)
  const userMatchup = currentWeekSchedule?.matchups?.find(
    m => m.home === user?.id || m.away === user?.id
  )

  const isUserHome = userMatchup?.home === user?.id
  const opponentId = isUserHome ? userMatchup?.away : userMatchup?.home
  const userScore = isUserHome ? userMatchup?.homeScore : userMatchup?.awayScore
  const opponentScore = isUserHome ? userMatchup?.awayScore : userMatchup?.homeScore

  // Get team info from standings
  const teamLookup = standings.reduce((acc, team) => {
    acc[team.userId] = team
    return acc
  }, {})

  const userTeamInfo = teamLookup[user?.id]
  const opponentTeamInfo = teamLookup[opponentId]

  // Get player-level scores from weekly data
  const teamScoresMap = (weekScores?.teams || []).reduce((acc, t) => {
    acc[t.userId] = t
    return acc
  }, {})

  const userTeamScores = teamScoresMap[user?.id]
  const opponentTeamScores = teamScoresMap[opponentId]

  // Determine status
  const isLive = !!activeWeek && activeWeek.week === currentWeekNum
  const isComplete = currentWeekSchedule?.matchups?.every(m => m.completed)
  const statusLabel = isLive ? 'LIVE' : isComplete ? 'FINAL' : 'UPCOMING'
  const statusColor = isLive ? 'text-emerald-400' : isComplete ? 'text-text-muted' : 'text-yellow-400'
  const statusDot = isLive ? 'bg-emerald-400 animate-pulse' : isComplete ? 'bg-text-muted' : 'bg-yellow-400'

  // Sort players: starters first (by points desc), then bench
  const sortPlayers = (playerScores) => {
    if (!playerScores) return []
    const starters = playerScores.filter(p => p.position === 'ACTIVE').sort((a, b) => (b.points || 0) - (a.points || 0))
    const bench = playerScores.filter(p => p.position !== 'ACTIVE').sort((a, b) => (b.points || 0) - (a.points || 0))
    return [...starters, ...bench]
  }

  const userPlayers = sortPlayers(userTeamScores?.playerScores)
  const opponentPlayers = sortPlayers(opponentTeamScores?.playerScores)

  // Score bar width (for the visual bar)
  const totalPts = (userScore || 0) + (opponentScore || 0)
  const userBarPct = totalPts > 0 ? Math.max(10, Math.round(((userScore || 0) / totalPts) * 100)) : 50

  // Build live feed from both teams' scoring plays
  const buildLiveFeed = () => {
    const feed = []
    const allPlayers = [
      ...(userTeamScores?.playerScores || []).map(p => ({ ...p, side: 'you' })),
      ...(opponentTeamScores?.playerScores || []).map(p => ({ ...p, side: 'opponent' })),
    ]
    // Show players who scored points, sorted by points desc
    for (const p of allPlayers.filter(p => p.points > 0).sort((a, b) => b.points - a.points)) {
      feed.push({
        playerName: p.playerName,
        points: p.points,
        side: p.side,
        isBench: p.position !== 'ACTIVE',
      })
    }
    return feed.slice(0, 15)
  }

  const liveFeed = buildLiveFeed()

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Back link */}
      <Link
        to={`/leagues/${leagueId}`}
        className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-3 text-sm"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {league?.name || 'League'}
      </Link>

      {/* ── SCORE BAR (sticky on scroll) ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-dark-primary/95 backdrop-blur-sm border-b border-dark-border/50 mb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                {statusLabel} — Week {currentWeekNum}
              </span>
            </div>
          </div>

          {userMatchup ? (
            <div className="flex items-center gap-3">
              {/* User team */}
              <div className="flex-1 text-right">
                <p className="text-sm font-medium text-white truncate">
                  {userTeamInfo?.teamName || 'Your Team'}
                </p>
                <p className="text-xs text-text-muted">
                  {userTeamInfo?.wins || 0}-{userTeamInfo?.losses || 0}
                </p>
              </div>

              {/* Scores */}
              <div className="flex items-center gap-3 px-4">
                <span className="text-2xl font-bold font-mono text-white">
                  {(userScore || 0).toFixed(1)}
                </span>
                <span className="text-text-muted text-sm">vs</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {(opponentScore || 0).toFixed(1)}
                </span>
              </div>

              {/* Opponent team */}
              <div className="flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {opponentTeamInfo?.teamName || 'Opponent'}
                </p>
                <p className="text-xs text-text-muted">
                  {opponentTeamInfo?.wins || 0}-{opponentTeamInfo?.losses || 0}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-text-muted">No matchup found for this week</p>
          )}

          {/* Score bar visual */}
          {userMatchup && totalPts > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-dark-tertiary">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${userBarPct}%` }}
              />
              <div
                className="bg-red-500/70 transition-all duration-500"
                style={{ width: `${100 - userBarPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── SIDE-BY-SIDE ROSTERS (2 cols on desktop) ── */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* YOUR PLAYERS */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-display text-emerald-400 uppercase tracking-wider">Your Players</h3>
                <span className="text-lg font-bold font-mono text-white">
                  {(userTeamScores?.totalPoints || userScore || 0).toFixed(1)}
                </span>
              </div>
              <div className="space-y-1">
                {userPlayers.length > 0 ? userPlayers.map((p, i) => {
                  const isBench = p.position !== 'ACTIVE'
                  const statLine = formatStatLine(p.statLine)
                  return (
                    <div
                      key={p.playerId || i}
                      className={`py-1.5 px-2 rounded-lg ${
                        isBench ? 'opacity-40' : 'bg-dark-tertiary/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {p.nflPos && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center flex-shrink-0 ${posColors[p.nflPos] || 'bg-dark-tertiary text-text-muted'}`}>
                            {p.nflPos}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.playerName}</p>
                        </div>
                        <span className={`text-sm font-bold font-mono w-12 text-right ${
                          p.points > 15 ? 'text-emerald-400' :
                          p.points > 5 ? 'text-white' : 'text-text-muted'
                        }`}>
                          {(p.points || 0).toFixed(1)}
                        </span>
                      </div>
                      {statLine && (
                        <p className="text-[9px] text-text-muted mt-0.5 ml-8 truncate">{statLine}</p>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-text-muted text-sm py-4 text-center">No player scores yet</p>
                )}
              </div>
            </Card>

            {/* OPPONENT PLAYERS */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-display text-red-400/80 uppercase tracking-wider">Their Players</h3>
                <span className="text-lg font-bold font-mono text-white">
                  {(opponentTeamScores?.totalPoints || opponentScore || 0).toFixed(1)}
                </span>
              </div>
              <div className="space-y-1">
                {opponentPlayers.length > 0 ? opponentPlayers.map((p, i) => {
                  const isBench = p.position !== 'ACTIVE'
                  const statLine = formatStatLine(p.statLine)
                  return (
                    <div
                      key={p.playerId || i}
                      className={`py-1.5 px-2 rounded-lg ${
                        isBench ? 'opacity-40' : 'bg-dark-tertiary/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {p.nflPos && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-7 text-center flex-shrink-0 ${posColors[p.nflPos] || 'bg-dark-tertiary text-text-muted'}`}>
                            {p.nflPos}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.playerName}</p>
                        </div>
                        <span className={`text-sm font-bold font-mono w-12 text-right ${
                          p.points > 15 ? 'text-red-400' :
                          p.points > 5 ? 'text-white' : 'text-text-muted'
                        }`}>
                          {(p.points || 0).toFixed(1)}
                        </span>
                      </div>
                      {statLine && (
                        <p className="text-[9px] text-text-muted mt-0.5 ml-8 truncate">{statLine}</p>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-text-muted text-sm py-4 text-center">No player scores yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── RIGHT COLUMN: League Scoreboard + Live Feed ── */}
        <div className="space-y-4">

          {/* LEAGUE SCOREBOARD */}
          <Card>
            <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-3">League Scoreboard</h3>
            <div className="space-y-2">
              {currentWeekSchedule?.matchups?.map((m, i) => {
                const homeTeam = teamLookup[m.home]
                const awayTeam = teamLookup[m.away]
                const isUserMatchup = m.home === user?.id || m.away === user?.id
                const homeWon = m.completed && m.homeScore > m.awayScore
                const awayWon = m.completed && m.awayScore > m.homeScore

                return (
                  <div
                    key={i}
                    className={`p-2 rounded-lg text-sm ${
                      isUserMatchup ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-dark-tertiary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-right">
                        <span className={`truncate ${homeWon ? 'text-emerald-400 font-semibold' : 'text-white'}`}>
                          {homeTeam?.teamName?.split(' ').pop() || 'Home'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className={homeWon ? 'text-emerald-400 font-bold' : 'text-white'}>
                          {(m.homeScore || 0).toFixed(1)}
                        </span>
                        <span className="text-text-muted">-</span>
                        <span className={awayWon ? 'text-emerald-400 font-bold' : 'text-white'}>
                          {(m.awayScore || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className={`truncate ${awayWon ? 'text-emerald-400 font-semibold' : 'text-white'}`}>
                          {awayTeam?.teamName?.split(' ').pop() || 'Away'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!currentWeekSchedule?.matchups || currentWeekSchedule.matchups.length === 0) && (
                <p className="text-text-muted text-sm text-center py-4">No matchups this week</p>
              )}
            </div>
          </Card>

          {/* SCORING FEED */}
          <Card>
            <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-3">
              {isLive ? 'Live Feed' : 'Scoring Feed'}
            </h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {liveFeed.length > 0 ? liveFeed.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    entry.side === 'you' ? 'bg-emerald-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white flex-1 truncate">
                    {entry.playerName}
                    {entry.isBench && <span className="text-text-muted text-xs ml-1">(bench)</span>}
                  </span>
                  <span className={`font-mono font-bold text-xs ${
                    entry.side === 'you' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    +{entry.points.toFixed(1)}
                  </span>
                </div>
              )) : (
                <p className="text-text-muted text-sm text-center py-4">
                  No scoring activity yet
                </p>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-3 text-center">
              {isLive
                ? 'Updates during game windows'
                : 'Live feed activates during NFL game windows'
              }
            </p>
          </Card>

          {/* Week navigation */}
          <Card>
            <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-3">Week Scores</h3>
            <div className="flex flex-wrap gap-1.5">
              {schedule?.map(w => {
                const isActive = w.week === currentWeekNum
                const isScored = w.matchups?.some(m => m.homeScore > 0 || m.awayScore > 0)
                return (
                  <Link
                    key={w.week}
                    to={`/leagues/${leagueId}/scoring`}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-500 text-white'
                        : isScored
                        ? 'bg-dark-tertiary text-text-secondary hover:text-white'
                        : 'bg-dark-tertiary/50 text-text-muted'
                    }`}
                  >
                    {w.week}
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default GamedayPortal
