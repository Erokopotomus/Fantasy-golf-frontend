import { useParams, Link } from 'react-router-dom'
import { useWaivers } from '../hooks/useWaivers'
import { useRoster } from '../hooks/useRoster'
import { usePlayerDetail } from '../hooks/usePlayerDetail'
import Card from '../components/common/Card'
import WaiverWireList from '../components/roster/WaiverWireList'
import PlayerDetailModal from '../components/players/PlayerDetailModal'

const WaiverWire = () => {
  const { leagueId } = useParams()
  const { availablePlayers, loading, claimLoading, error, claimPlayer } = useWaivers(leagueId)
  const { roster, refetch: refetchRoster } = useRoster(leagueId)
  const { selectedPlayer, isModalOpen, openPlayerDetail, closePlayerDetail } = usePlayerDetail()

  const handleClaim = async (playerId, dropPlayerId) => {
    try {
      await claimPlayer(playerId, dropPlayerId)
      await refetchRoster()
    } catch (err) {
      // Error handled by hook
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading waiver wire...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Waivers</h2>
              <p className="text-text-secondary mb-6">{error}</p>
              <Link to="/dashboard" className="text-accent-green hover:underline">
                Return to Dashboard
              </Link>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to={`/leagues/${leagueId}/roster`}
              className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Roster
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Waiver Wire</h1>
            <p className="text-text-secondary mt-1">
              Claim available players to add to your roster
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-6 bg-dark-primary border-accent-blue/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Waiver Priority</h3>
                <p className="text-text-muted text-sm">
                  Claims process in priority order. Your current position: #3.
                  Waiver period ends Thursday at 12:00 PM ET.
                </p>
              </div>
            </div>
          </Card>

          {/* Waiver Wire List */}
          <WaiverWireList
            players={availablePlayers}
            roster={roster}
            onClaim={handleClaim}
            loading={claimLoading}
            onViewPlayer={openPlayerDetail}
          />
        </div>
      </main>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={closePlayerDetail}
      />
    </div>
  )
}

export default WaiverWire
