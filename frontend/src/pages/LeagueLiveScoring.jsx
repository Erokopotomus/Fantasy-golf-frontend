import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import useLeagueLiveScoring from '../hooks/useLeagueLiveScoring'
import { flattenEntry } from '../hooks/useTournamentScoring'
import { useLeague } from '../hooks/useLeague'
import Card from '../components/common/Card'
import TournamentLeaderboard from '../components/tournament/TournamentLeaderboard'
import TournamentHeader from '../components/tournament/TournamentHeader'
import NflWeeklyScoring from '../components/nfl/NflWeeklyScoring'
import { formatDate } from '../utils/dateUtils'
import api from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────

const formatToPar = (toPar) => {
  if (toPar == null) return '–'
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

const toParColor = (toPar) => {
  if (toPar == null) return 'text-text-muted'
  if (toPar < 0) return 'text-field'
  if (toPar > 0) return 'text-live-red'
  return 'text-text-primary'
}

const positionColor = (pos, status) => {
  if (status === 'CUT' || status === 'WD' || status === 'DQ') return 'text-live-red'
  if (pos == null) return 'text-text-muted'
  if (pos <= 10) return 'text-field'
  if (pos <= 25) return 'text-text-primary'
  return 'text-text-secondary'
}

const formatPosition = (pos, status) => {
  if (status === 'CUT') return 'CUT'
  if (status === 'WD') return 'WD'
  if (status === 'DQ') return 'DQ'
  if (status === 'DNS') return 'DNS'
  if (pos == null) return '–'
  return pos
}

// ── UserTeamWidget ───────────────────────────────────────────────

const StarterRow = ({ player }) => (
  <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg bg-[var(--surface)]">
    {/* Headshot */}
    <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] flex-shrink-0 overflow-hidden">
      {player.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-semibold">
          {player.playerName?.charAt(0) || '?'}
        </div>
      )}
    </div>
    {/* Name + Position */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary truncate">{player.playerName}</p>
      <div className="flex items-center gap-2 text-[10px] text-text-muted">
        <span className={positionColor(player.position, player.status)}>
          {formatPosition(player.position, player.status)}
        </span>
        <span className={toParColor(player.totalToPar)}>{formatToPar(player.totalToPar)}</span>
        <span>{player.thru ?? '–'} holes</span>
      </div>
    </div>
    {/* Fantasy points */}
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-bold text-field">{player.fantasyPoints?.toFixed(1) || '0.0'}</p>
    </div>
  </div>
)

const BreakdownLine = ({ player }) => {
  const parts = []
  if (player.positionPoints != null) parts.push(`pos: ${player.positionPoints.toFixed(1)}`)
  if (player.holesPoints != null) parts.push(`holes: ${player.holesPoints.toFixed(1)}`)
  if (player.bonusPoints != null && player.bonusPoints > 0) parts.push(`bonus: ${player.bonusPoints.toFixed(1)}`)
  if (parts.length === 0) return null
  return <p className="text-[10px] text-text-muted px-2 -mt-1 mb-1">{parts.join(' | ')}</p>
}

const UserTeamWidget = ({ userTeam }) => {
  const [benchOpen, setBenchOpen] = useState(false)

  if (!userTeam) {
    return (
      <Card className="text-center py-8">
        <svg className="w-10 h-10 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm text-text-muted">You don't have a team in this league.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header: rank + points */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold font-display ${
          userTeam.rank === 1 ? 'bg-crown/15 text-crown' :
          userTeam.rank === 2 ? 'bg-gray-300/10 text-gray-400 dark:text-gray-300' :
          userTeam.rank === 3 ? 'bg-amber-600/10 text-amber-500' :
          'bg-[var(--bg-alt)] text-text-secondary'
        }`}>
          #{userTeam.rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold font-display text-text-primary truncate">{userTeam.teamName}</h3>
          <p className="text-xs text-text-muted">{userTeam.starters.length} starters, {userTeam.bench.length} bench</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display text-field">{userTeam.totalPoints.toFixed(1)}</p>
          <p className="text-[10px] text-text-muted">fantasy pts</p>
        </div>
      </div>

      {/* Optimal alert */}
      {userTeam.optimalPoints > userTeam.totalPoints && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-crown/10 border border-crown/20">
          <svg className="w-4 h-4 text-crown flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-xs text-crown">
            Optimal lineup: <span className="font-bold">{userTeam.optimalPoints.toFixed(1)}</span> pts
            <span className="text-crown/70"> (+{(userTeam.optimalPoints - userTeam.totalPoints).toFixed(1)} on bench)</span>
          </p>
        </div>
      )}

      {/* Starters */}
      <div className="space-y-1">
        {userTeam.starters.map((p) => (
          <div key={p.playerId}>
            <StarterRow player={p} />
            <BreakdownLine player={p} />
          </div>
        ))}
      </div>

      {/* Bench */}
      {userTeam.bench.length > 0 && (
        <div>
          <button
            onClick={() => setBenchOpen(!benchOpen)}
            className="flex items-center gap-2 w-full py-1.5 group"
          >
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Bench</span>
            <div className="flex-1 border-t border-[var(--card-border)]/30" />
            <span className="text-xs text-text-muted">{userTeam.benchPoints.toFixed(1)} pts</span>
            <svg className={`w-3.5 h-3.5 text-text-muted transition-transform ${benchOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {benchOpen && (
            <div className="space-y-1 mt-1">
              {userTeam.bench.map((p) => (
                <div key={p.playerId} className="opacity-50">
                  <StarterRow player={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── LeagueMiniStandings ──────────────────────────────────────────

const LeagueMiniStandings = ({ teams, userTeam }) => {
  const [expandedTeamId, setExpandedTeamId] = useState(null)

  if (teams.length === 0) {
    return <p className="text-center text-text-muted py-4 text-sm">No teams have rostered players yet.</p>
  }

  return (
    <div className="space-y-1">
      {teams.map((team) => {
        const isUser = team.userId === userTeam?.userId
        const isExpanded = expandedTeamId === team.teamId

        return (
          <div key={team.teamId}>
            <div
              onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                isUser
                  ? 'bg-field-bright/10 border border-field-bright/20'
                  : 'hover:bg-[var(--surface-alt)]'
              }`}
            >
              {/* Rank */}
              <span className={`text-sm font-bold w-6 text-center ${
                team.rank === 1 ? 'text-crown' :
                team.rank === 2 ? 'text-gray-400 dark:text-gray-300' :
                team.rank === 3 ? 'text-amber-500' :
                'text-text-muted'
              }`}>
                {team.rank}
              </span>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isUser ? 'text-field' : 'text-text-primary'}`}>
                  {team.teamName}
                  {isUser && <span className="text-field/60 ml-1 text-xs">You</span>}
                </p>
              </div>
              {/* Points */}
              <span className="text-sm font-bold font-display text-text-primary">{team.totalPoints.toFixed(1)}</span>
              <svg className={`w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded roster */}
            {isExpanded && (
              <div className="ml-8 mr-2 mt-1 mb-2 space-y-0.5">
                {team.starters.map((p) => (
                  <div key={p.playerId} className="flex items-center gap-2 py-1 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[var(--bg-alt)] flex-shrink-0 overflow-hidden">
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-text-muted">
                          {p.playerName?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-text-primary truncate">{p.playerName}</span>
                    <span className={`${positionColor(p.position, p.status)} text-[10px]`}>
                      {formatPosition(p.position, p.status)}
                    </span>
                    <span className="font-bold text-field w-10 text-right">{p.fantasyPoints?.toFixed(1) || '0.0'}</span>
                  </div>
                ))}
                {team.bench.length > 0 && (
                  <div className="border-t border-[var(--card-border)]/30 pt-1 mt-1">
                    {team.bench.map((p) => (
                      <div key={p.playerId} className="flex items-center gap-2 py-0.5 text-xs opacity-50">
                        <div className="w-5 h-5" />
                        <span className="flex-1 text-text-secondary truncate">{p.playerName}</span>
                        <span className="text-text-muted w-10 text-right">{p.fantasyPoints?.toFixed(1) || '0.0'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

const LeagueLiveScoring = () => {
  const { leagueId } = useParams()
  const { league: leagueData } = useLeague(leagueId)
  const isNfl = (leagueData?.sport || 'GOLF').toUpperCase() === 'NFL'

  if (isNfl) {
    return <NflWeeklyScoring leagueId={leagueId} />
  }

  return <GolfLiveScoring leagueId={leagueId} />
}

const GolfLiveScoring = ({ leagueId }) => {
  const { tournament, isLive, teams, userTeam, loading, error } = useLeagueLiveScoring(leagueId)
  const navigate = useNavigate()
  const [mobileTab, setMobileTab] = useState('leaderboard')
  const [leaderboard, setLeaderboard] = useState([])
  const [lbLoading, setLbLoading] = useState(true)
  const [fullTournament, setFullTournament] = useState(null)
  const [nextTournament, setNextTournament] = useState(null)
  const pollRef = useRef(null)

  // Fetch full tournament data (with course object for TournamentHeader)
  useEffect(() => {
    if (!tournament?.id) return
    api.getTournament(tournament.id)
      .then(data => setFullTournament(data?.tournament || data))
      .catch(() => {})
  }, [tournament?.id])

  // Fetch next tournament when current is COMPLETED
  useEffect(() => {
    if (!tournament || tournament.status !== 'COMPLETED') {
      setNextTournament(null)
      return
    }
    api.getCurrentTournament()
      .then(data => {
        const next = data?.tournament || data
        if (next && next.id !== tournament.id) setNextTournament(next)
      })
      .catch(() => {})
  }, [tournament?.id, tournament?.status])

  // Fetch leaderboard data independently
  const fetchLeaderboard = useCallback(async (tournamentId) => {
    if (!tournamentId) return
    try {
      const data = await api.getTournamentLeaderboard(tournamentId)
      const raw = data?.leaderboard || []
      setLeaderboard(raw.map(flattenEntry))
    } catch (err) {
      console.warn('Leaderboard fetch failed:', err.message)
    } finally {
      setLbLoading(false)
    }
  }, [])

  // Fetch + poll leaderboard when tournament is available
  useEffect(() => {
    if (!tournament?.id) return
    setLbLoading(true)
    fetchLeaderboard(tournament.id)

    // Poll every 60s when live
    if (pollRef.current) clearInterval(pollRef.current)
    if (isLive) {
      pollRef.current = setInterval(() => fetchLeaderboard(tournament.id), 60000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [tournament?.id, isLive, fetchLeaderboard])

  // Derive myPlayerIds from user's full roster
  const myPlayerIds = userTeam
    ? [...(userTeam.starters || []), ...(userTeam.bench || [])].map(p => p.playerId)
    : []

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading scoring...</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">Error</h2>
            <p className="text-text-secondary mb-4">{error}</p>
            <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to League</Link>
          </Card>
        </div>
      </div>
    )
  }

  // ── No tournament ──
  if (!tournament) {
    return (
      <div className="min-h-screen pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link to={`/leagues/${leagueId}`} className="inline-flex items-center text-text-secondary hover:text-text-primary mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>
          <Card className="text-center py-12">
            <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">No Tournament in Progress</h2>
            <p className="text-text-secondary">Check back when the next tournament begins.</p>
          </Card>
        </div>
      </div>
    )
  }

  // ── Sidebar content (used for both desktop + mobile Fantasy tab) ──
  const sidebarContent = (
    <div className="space-y-6">
      {/* Your Team */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Your Team</h3>
        <UserTeamWidget userTeam={userTeam} />
      </div>

      {/* League Standings */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">League Standings</h3>
        <LeagueMiniStandings teams={teams} userTeam={userTeam} />
      </div>
    </div>
  )

  // ── Leaderboard content ──
  const leaderboardContent = lbLoading ? (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-field-bright/30 border-t-field-bright rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-muted">Loading leaderboard...</p>
      </div>
    </div>
  ) : (
    <TournamentLeaderboard
      leaderboard={leaderboard}
      myPlayerIds={myPlayerIds}
      tournamentId={tournament.id}
      currentRound={tournament.currentRound}
      onPlayerClick={!isLive ? (player) => { navigate(`/players/${player.id}`); return true } : undefined}
    />
  )

  // Merge slim tournament with full data for TournamentHeader
  const headerTournament = fullTournament || tournament

  return (
    <div className="min-h-screen">
      <main className="pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back to league */}
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>

          {/* Rich Tournament Header */}
          <div className="mb-6">
            <TournamentHeader tournament={headerTournament} leaderboard={leaderboard} />
          </div>

          {/* Next Up card — shown when tournament is FINAL */}
          {nextTournament && tournament.status === 'COMPLETED' && (
            <Link
              to={`/tournaments/${nextTournament.id}/preview`}
              className="block rounded-xl border border-gold/20 bg-gradient-to-r from-gold/[0.06] to-transparent p-4 mb-6 hover:border-gold/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gold">Next Up</p>
                  <p className="text-base font-display font-semibold text-text-primary mt-0.5">{nextTournament.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDate(nextTournament.startDate)} – {formatDate(nextTournament.endDate)}
                  </p>
                </div>
                <span className="text-xs text-gold group-hover:text-gold/80 transition-colors font-medium shrink-0 ml-4">
                  Preview →
                </span>
              </div>
            </Link>
          )}

          {/* Mobile tab bar */}
          <div className="lg:hidden flex border-b border-[var(--card-border)] mb-4">
            <button
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                mobileTab === 'leaderboard' ? 'text-field border-b-2 border-field' : 'text-text-muted'
              }`}
              onClick={() => setMobileTab('leaderboard')}
            >
              Leaderboard
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                mobileTab === 'fantasy' ? 'text-field border-b-2 border-field' : 'text-text-muted'
              }`}
              onClick={() => setMobileTab('fantasy')}
            >
              Fantasy
            </button>
          </div>

          {/* Desktop: 3/5 leaderboard + 2/5 sidebar */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-6">
            <div className="col-span-3">
              {leaderboardContent}
            </div>
            <div className="col-span-2">
              {sidebarContent}
            </div>
          </div>

          {/* Mobile: tabbed */}
          <div className="lg:hidden">
            {mobileTab === 'leaderboard' && leaderboardContent}
            {mobileTab === 'fantasy' && sidebarContent}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeagueLiveScoring
