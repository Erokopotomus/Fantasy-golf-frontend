import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeagues } from '../hooks/useLeagues'
import { useLeagueFormat } from '../hooks/useLeagueFormat'
import StandingsTable from '../components/standings/StandingsTable'
import WeeklyBreakdown from '../components/standings/WeeklyBreakdown'
import H2HStandings from '../components/standings/H2HStandings'
import RotoStandings from '../components/standings/RotoStandings'
import SurvivorStandings from '../components/standings/SurvivorStandings'
import OADStandings from '../components/standings/OADStandings'
import Card from '../components/common/Card'
import useStandings from '../hooks/useStandings'
import useMatchups from '../hooks/useMatchups'
import useRotoCategories from '../hooks/useRotoCategories'
import useSurvivor from '../hooks/useSurvivor'

const Standings = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const league = leagues?.find(l => l.id === leagueId)
  const { format, isHeadToHead, isRoto, isSurvivor, isOneAndDone, isFullLeague } = useLeagueFormat(league)

  const { standings, weeklyResults, loading, error, refetch } = useStandings(leagueId)
  const { schedule, calculateStandings } = useMatchups(leagueId)
  const { standings: rotoStandings } = useRotoCategories(leagueId)
  const { survivorData } = useSurvivor(leagueId)

  if (loading || leaguesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
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
              className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate league stats
  const leaderPoints = standings[0]?.totalPoints || 0
  const userTeam = standings.find(t => t.userId === user?.id)
  const pointsBehind = userTeam ? leaderPoints - userTeam.totalPoints : 0
  const avgPointsPerWeek = weeklyResults.length > 0
    ? standings.reduce((sum, t) => sum + t.totalPoints, 0) / standings.length / weeklyResults.length
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>
        <h1 className="text-2xl font-bold text-white">{format?.name || 'League'} Standings</h1>
        <p className="text-text-secondary">Season performance and rankings</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-muted mb-1">Your Rank</p>
          <p className="text-2xl font-bold text-white">
            {userTeam ? `#${userTeam.rank}` : '-'}
          </p>
          <p className="text-xs text-text-secondary">of {standings.length} teams</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Your Points</p>
          <p className="text-2xl font-bold text-accent-green">
            {userTeam?.totalPoints?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-text-secondary">total fantasy points</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Points Behind</p>
          <p className={`text-2xl font-bold ${pointsBehind > 0 ? 'text-red-400' : 'text-accent-green'}`}>
            {pointsBehind > 0 ? `-${pointsBehind}` : userTeam?.rank === 1 ? '👑 Leader' : '-'}
          </p>
          <p className="text-xs text-text-secondary">from 1st place</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Tournaments</p>
          <p className="text-2xl font-bold text-white">
            {weeklyResults.length}
          </p>
          <p className="text-xs text-text-secondary">completed</p>
        </Card>
      </div>

      {/* Main Content Grid - Format-Aware */}
      {isHeadToHead && (
        <div className="space-y-6">
          <H2HStandings standings={league?.standings || []} currentUserId={user?.id} />
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Tournament Results</h3>
            <WeeklyBreakdown results={weeklyResults} currentUserId={user?.id} />
          </Card>
        </div>
      )}

      {isRoto && (
        <div className="space-y-6">
          <RotoStandings standings={rotoStandings} currentUserId={user?.id} />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/categories`}
              className="text-accent-green hover:underline"
            >
              View Full Category Breakdown
            </Link>
          </div>
        </div>
      )}

      {isSurvivor && (
        <div className="space-y-6">
          <SurvivorStandings
            standings={league?.standings || []}
            survivorData={survivorData}
            currentUserId={user?.id}
          />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/survivor`}
              className="text-accent-green hover:underline"
            >
              View Survivor Board
            </Link>
          </div>
        </div>
      )}

      {isOneAndDone && (
        <div className="space-y-6">
          <OADStandings standings={league?.standings || []} currentUserId={user?.id} />
          <div className="text-center">
            <Link
              to={`/leagues/${leagueId}/picks`}
              className="text-accent-green hover:underline"
            >
              Go to Pick Center
            </Link>
          </div>
        </div>
      )}

      {isFullLeague && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Standings Table - 2 columns */}
          <div className="lg:col-span-2">
            <StandingsTable standings={standings} currentUserId={user?.id} />
          </div>

          {/* Weekly Results - 1 column */}
          <div>
            <WeeklyBreakdown results={weeklyResults} currentUserId={user?.id} />
          </div>
        </div>
      )}

      {/* Fallback for unknown format */}
      {!isHeadToHead && !isRoto && !isSurvivor && !isOneAndDone && !isFullLeague && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StandingsTable standings={standings} currentUserId={user?.id} />
          </div>
          <div>
            <WeeklyBreakdown results={weeklyResults} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Standings
