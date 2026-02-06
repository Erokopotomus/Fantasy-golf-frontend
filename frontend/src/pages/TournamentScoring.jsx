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
  const [activeTab, setActiveTab] = useState('leaderboard') // leaderboard | myTeam

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
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
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tournament Header — full width */}
      <TournamentHeader tournament={tournament} leaderboard={leaderboard} />

      {/* Ticker: live status + controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <LiveScoreIndicator isLive={isLive} onToggle={toggleLive} />
          {isLive && (
            <span className="text-xs text-text-muted flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto-updating
            </span>
          )}
        </div>
        <button
          onClick={refetch}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden border-b border-dark-border">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'leaderboard'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-text-muted'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('myTeam')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'myTeam'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-text-muted'
          }`}
        >
          My Team ({myPlayers.length})
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard — 2 col on desktop, tab on mobile */}
        <div className={`lg:col-span-2 space-y-4 ${activeTab !== 'leaderboard' ? 'hidden lg:block' : ''}`}>
          <TournamentLeaderboard
            leaderboard={leaderboard}
            cut={tournament?.cut}
            onSelectPlayer={setSelectedPlayer}
            myPlayerIds={myPlayerIds}
            recentChanges={recentChanges}
          />
        </div>

        {/* Sidebar */}
        <div className={`space-y-4 ${activeTab !== 'myTeam' ? 'hidden lg:block' : ''}`}>
          <MyPlayersPanel
            players={myPlayers}
            onSelectPlayer={setSelectedPlayer}
            selectedPlayerId={selectedPlayer?.id}
          />

          {/* Selected Player Scorecard */}
          {selectedPlayer && (
            <PlayerScoreCard
              player={selectedPlayer}
              onClose={() => setSelectedPlayer(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default TournamentScoring
