import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../hooks/useLeague'
import { useLeagueFormat } from '../hooks/useLeagueFormat'
import StandingsTable from '../components/standings/StandingsTable'
import WeeklyBreakdown from '../components/standings/WeeklyBreakdown'
import H2HStandings from '../components/standings/H2HStandings'
import RotoStandings from '../components/standings/RotoStandings'
import SurvivorStandings from '../components/standings/SurvivorStandings'
import OADStandings from '../components/standings/OADStandings'
import Card from '../components/common/Card'
import SegmentStandings from '../components/standings/SegmentStandings'
import LeagueChat from '../components/ai/LeagueChat'
import useStandings from '../hooks/useStandings'
import useMatchups from '../hooks/useMatchups'
import useRotoCategories from '../hooks/useRotoCategories'
import useSurvivor from '../hooks/useSurvivor'

const Standings = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)
  const { format, isHeadToHead, isRoto, isSurvivor, isOneAndDone, isFullLeague } = useLeagueFormat(league)
  const isNflLeague = (league?.sport || 'GOLF').toUpperCase() === 'NFL'

  const { standings, weeklyResults, loading, error, refetch } = useStandings(leagueId)
  const { schedule: matchupSchedule, standings: matchupStandings, divisionStandings } = useMatchups(leagueId)
  const { standings: rotoStandings } = useRotoCategories(leagueId)
  const { survivorData } = useSurvivor(leagueId)

  useEffect(() => {
    if (leagueId && !loading) {
      track(Events.STANDINGS_VIEWED, { leagueId, format })
    }
  }, [leagueId, loading])

  if (loading || leagueLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading standings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-emerald-500 text-text-primary rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Map standings data shape for StandingsTable
  // Backend: { teamId, teamName, userId, userName, userAvatar, totalPoints, rank, tournamentResults }
  // Component expects: { id, name, avatar, ownerName, userId, totalPoints, rank, wins, losses, ties, avgPoints, trend }
  const mappedStandings = standings.map(s => ({
    id: s.teamId,
    name: s.teamName,
    avatar: s.userAvatar || s.teamName?.[0] || '?',
    ownerName: s.userName,
    userId: s.userId,
    totalPoints: s.totalPoints,
    rank: s.rank,
    wins: s.wins || 0,
    losses: s.losses || 0,
    ties: s.ties || 0,
    avgPoints: weeklyResults.length > 0 ? Math.round((s.totalPoints / weeklyResults.length) * 10) / 10 : 0,
    trend: s.trend || 0,
  }))

  // Map weeklyResults for WeeklyBreakdown
  // Backend: { tournamentId, tournamentName, teams: [{ teamId, teamName, points }] }
  // Component expects: { tournamentId, tournamentName, dates, status, results: [{ userId, teamId, teamName, points }] }
  const mappedWeeklyResults = weeklyResults.map(w => ({
    tournamentId: w.tournamentId || w.fantasyWeekId,
    tournamentName: w.tournamentName || w.weekName || `Week ${w.weekNumber}`,
    status: 'completed',
    results: [...(w.teams || [])].sort((a, b) => b.points - a.points).map(t => {
      const standing = standings.find(s => s.teamId === t.teamId)
      return {
        userId: standing?.userId,
        teamId: t.teamId,
        teamName: t.teamName,
        points: t.points,
      }
    }),
  }))

  // Calculate league stats — prefer matchup standings for H2H (more reliable)
  const statSource = isHeadToHead && matchupStandings.length > 0
    ? [...matchupStandings].sort((a, b) => (b.pointsFor || 0) - (a.pointsFor || 0))
    : mappedStandings
  const userStat = isHeadToHead
    ? matchupStandings.find(t => t.userId === user?.id)
    : mappedStandings.find(t => t.userId === user?.id)
  const userPoints = isHeadToHead ? (userStat?.pointsFor || 0) : (userStat?.totalPoints || 0)
  const leaderPoints = isHeadToHead ? (statSource[0]?.pointsFor || 0) : (statSource[0]?.totalPoints || 0)
  const pointsBehind = leaderPoints - userPoints
  const userRank = isHeadToHead
    ? [...matchupStandings].sort((a, b) => (b.wins - a.wins) || (b.pointsFor - a.pointsFor)).findIndex(t => t.userId === user?.id) + 1
    : (userStat?.rank || 0)
  // Count completed weeks from schedule (matchups data)
  const completedWeekCount = isHeadToHead
    ? (matchupSchedule || []).filter(w => w.matchups?.every(m => m.completed)).length
    : weeklyResults.length

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {league?.name || 'League'}
        </Link>
        <h1 className="text-2xl font-bold font-display text-text-primary">{format?.name || 'League'} Standings</h1>
        <p className="text-text-secondary">Season performance and rankings</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-muted mb-1">Your Rank</p>
          <p className="text-2xl font-bold font-display text-text-primary">
            {userRank > 0 ? `#${userRank}` : '-'}
          </p>
          <p className="text-xs text-text-secondary">of {mappedStandings.length || matchupStandings.length} teams</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Your Points</p>
          <p className="text-2xl font-bold font-display text-emerald-400">
            {userPoints > 0 ? userPoints.toFixed(1) : 0}
          </p>
          <p className="text-xs text-text-secondary">total fantasy points</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Points Behind</p>
          <p className={`text-2xl font-bold ${pointsBehind > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {pointsBehind > 0 ? `-${pointsBehind.toFixed(1)}` : userRank === 1 ? 'Leader' : '-'}
          </p>
          <p className="text-xs text-text-secondary">from 1st place</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">{isNflLeague ? 'Weeks' : 'Tournaments'}</p>
          <p className="text-2xl font-bold font-display text-text-primary">
            {completedWeekCount}
          </p>
          <p className="text-xs text-text-secondary">completed</p>
        </Card>
      </div>

      {/* Main Content Grid - Format-Aware */}
      {isHeadToHead && (
        <div className="space-y-6">
          <H2HStandings standings={matchupStandings} currentUserId={user?.id} divisionStandings={divisionStandings} />
          <Card>
            <h3 className="text-lg font-semibold font-display text-text-primary mb-4">{isNflLeague ? 'Weekly Results' : 'Tournament Results'}</h3>
            <WeeklyBreakdown results={mappedWeeklyResults} currentUserId={user?.id} />
          </Card>
        </div>
      )}

      {isRoto && (
        <div className="space-y-6">
          <RotoStandings standings={rotoStandings} currentUserId={user?.id} />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/categories`}
              className="text-emerald-400 hover:underline"
            >
              View Full Category Breakdown
            </Link>
          </div>
        </div>
      )}

      {isSurvivor && (
        <div className="space-y-6">
          <SurvivorStandings
            standings={mappedStandings}
            survivorData={survivorData}
            currentUserId={user?.id}
          />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/survivor`}
              className="text-emerald-400 hover:underline"
            >
              View Survivor Board
            </Link>
          </div>
        </div>
      )}

      {isOneAndDone && (
        <div className="space-y-6">
          <OADStandings standings={mappedStandings} currentUserId={user?.id} />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/picks`}
              className="text-emerald-400 hover:underline"
            >
              Go to Pick Center
            </Link>
          </div>
        </div>
      )}

      {isFullLeague && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Standings Table - 2 columns */}
            <div className="lg:col-span-2">
              <StandingsTable standings={mappedStandings} currentUserId={user?.id} />
            </div>

            {/* Weekly Results - 1 column */}
            <div>
              <WeeklyBreakdown results={mappedWeeklyResults} currentUserId={user?.id} />
            </div>
          </div>

          {/* Segment Standings - only if segments configured */}
          {league?.settings?.segments > 1 && (
            <SegmentStandings leagueId={leagueId} />
          )}
          {league?.settings?.formatSettings?.segments > 1 && !league?.settings?.segments && (
            <SegmentStandings leagueId={leagueId} />
          )}
        </div>
      )}

      {/* Fallback for unknown format */}
      {!isHeadToHead && !isRoto && !isSurvivor && !isOneAndDone && !isFullLeague && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StandingsTable standings={mappedStandings} currentUserId={user?.id} />
          </div>
          <div>
            <WeeklyBreakdown results={mappedWeeklyResults} currentUserId={user?.id} />
          </div>
        </div>
      )}
      <LeagueChat leagueId={leagueId} pageContext="standings" />
    </div>
  )
}

export default Standings
