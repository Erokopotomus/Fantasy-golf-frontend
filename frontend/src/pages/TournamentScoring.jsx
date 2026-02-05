import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import TournamentHeader from '../components/tournament/TournamentHeader'
import TournamentLeaderboard from '../components/tournament/TournamentLeaderboard'
import MyPlayersPanel from '../components/tournament/MyPlayersPanel'
import PlayerScoreCard from '../components/tournament/PlayerScoreCard'
import LiveScoreIndicator from '../components/tournament/LiveScoreIndicator'
import useTournamentScoring from '../hooks/useTournamentScoring'
import useLiveScoring from '../hooks/useLiveScoring'

const TournamentScoring = () => {
  const { tournamentId } = useParams()
  const [searchParams] = useSearchParams()
  const leagueId = searchParams.get('league')

  const { tournament, leaderboard: initialLeaderboard, myPlayers, loading, error, refetch } = useTournamentScoring(tournamentId, leagueId)
  const myPlayerIds = myPlayers?.map(p => p.id) || []
  const { leaderboard, recentChanges, isLive, toggleLive } = useLiveScoring(initialLeaderboard, myPlayerIds, !loading)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showMyPlayers, setShowMyPlayers] = useState(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading tournament data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Tournament Header with Live Indicator */}
      <div className="flex items-start justify-between gap-4">
        <TournamentHeader tournament={tournament} />
        <LiveScoreIndicator isLive={isLive} onToggle={toggleLive} />
      </div>

      {/* Mobile Toggle for My Players */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowMyPlayers(!showMyPlayers)}
          className="w-full flex items-center justify-between p-4 bg-dark-secondary rounded-lg border border-dark-border"
        >
          <span className="font-medium text-white">My Players ({myPlayers.length})</span>
          <svg
            className={`w-5 h-5 text-text-secondary transition-transform ${showMyPlayers ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showMyPlayers && (
          <div className="mt-4">
            <MyPlayersPanel
              players={myPlayers}
              onSelectPlayer={setSelectedPlayer}
              selectedPlayerId={selectedPlayer?.id}
            />
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard - takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <TournamentLeaderboard
            leaderboard={leaderboard}
            cut={tournament?.cut}
            onSelectPlayer={setSelectedPlayer}
            myPlayerIds={myPlayerIds}
            recentChanges={recentChanges}
          />
        </div>

        {/* Sidebar - My Players (desktop) and Selected Player Card */}
        <div className="space-y-6">
          {/* My Players - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <MyPlayersPanel
              players={myPlayers}
              onSelectPlayer={setSelectedPlayer}
              selectedPlayerId={selectedPlayer?.id}
            />
          </div>

          {/* Selected Player Scorecard */}
          {selectedPlayer && (
            <PlayerScoreCard
              player={selectedPlayer}
              onClose={() => setSelectedPlayer(null)}
            />
          )}
        </div>
      </div>

      {/* Live status indicator */}
      <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
        {isLive ? (
          <>
            <svg className="w-4 h-4 animate-spin text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Live scoring active</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Live scoring paused</span>
          </>
        )}
        <button
          onClick={refetch}
          className="ml-2 text-accent-green hover:underline"
        >
          Refresh Now
        </button>
      </div>
    </div>
  )
}

export default TournamentScoring
