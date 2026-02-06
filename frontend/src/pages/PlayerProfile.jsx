import { useParams, Link } from 'react-router-dom'
import PlayerHeader from '../components/player/PlayerHeader'
import PlayerStats from '../components/player/PlayerStats'
import PlayerPredictions from '../components/player/PlayerPredictions'
import PlayerProjection from '../components/player/PlayerProjection'
import PlayerFormChart from '../components/player/PlayerFormChart'
import PlayerCourseHistory from '../components/player/PlayerCourseHistory'
import usePlayerProfile from '../hooks/usePlayerProfile'

const PlayerProfile = () => {
  const { playerId } = useParams()
  const {
    player,
    projection,
    predictions,
    liveScore,
    courseHistory,
    tournamentHistory,
    loading,
    error
  } = usePlayerProfile(playerId)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading player profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Player not found'}</p>
            <Link
              to="/players"
              className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 transition-colors"
            >
              Back to Players
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Link */}
      <Link
        to="/players"
        className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-4"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Players
      </Link>

      {/* Player Header */}
      <div className="mb-6">
        <PlayerHeader
          player={player}
          isOwned={player.owned}
          isOnMyTeam={player.owned}
          onAddToRoster={() => {}}
          onProposeTrade={() => {}}
        />
      </div>

      {/* Main Content — 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PlayerStats player={player} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PlayerPredictions predictions={predictions} liveScore={liveScore} />
          <PlayerProjection projection={projection} />
          <PlayerFormChart
            recentForm={player.recentForm}
            tournamentHistory={tournamentHistory}
          />
          <PlayerCourseHistory courseHistory={courseHistory} />
        </div>
      </div>
    </div>
  )
}

export default PlayerProfile
