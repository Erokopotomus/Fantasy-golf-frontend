import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeagues } from '../hooks/useLeagues'
import { usePlayers } from '../hooks/usePlayers'
import useOneAndDone from '../hooks/useOneAndDone'
import { useNotifications } from '../context/NotificationContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import TierDisplay from '../components/one-and-done/TierDisplay'
import PlayerPicker from '../components/one-and-done/PlayerPicker'
import PickHistory from '../components/one-and-done/PickHistory'
import UsedPlayersGrid from '../components/one-and-done/UsedPlayersGrid'
import OADStandings from '../components/standings/OADStandings'

const PickCenter = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const { players } = usePlayers()
  const {
    userPicks,
    tiers,
    currentTournament,
    leaderboard,
    loading,
    error,
    pickLoading,
    makePick,
    isPlayerUsed,
    totalPoints,
    hasCurrentPick,
  } = useOneAndDone(leagueId, user?.id)
  const { notify } = useNotifications()

  const [activeTab, setActiveTab] = useState('pick')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [confirmPick, setConfirmPick] = useState(false)

  const league = leagues?.find(l => l.id === leagueId)

  // Reset selected player when tab changes
  useEffect(() => {
    setSelectedPlayer(null)
    setConfirmPick(false)
  }, [activeTab])

  if (leaguesLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
            Back to League
          </Link>
        </div>
      </div>
    )
  }

  if (!league || league.format !== 'one-and-done') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold text-white mb-2">Not a One & Done League</h2>
          <p className="text-text-secondary mb-6">
            The Pick Center is only available for One & Done format leagues.
          </p>
          <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
            Back to League
          </Link>
        </Card>
      </div>
    )
  }

  const handleSelectPlayer = (player) => {
    // Add tier info to player
    const playerTier = tiers.find((t, i) => {
      const prevMax = i > 0 ? tiers[i - 1].maxRank : 0
      return t.maxRank === null || (player.rank > prevMax && player.rank <= t.maxRank)
    }) || tiers[tiers.length - 1]

    setSelectedPlayer({ ...player, tier: { ...playerTier, index: tiers.indexOf(playerTier) } })
    setConfirmPick(false)
  }

  const handleConfirmPick = async () => {
    if (!confirmPick) {
      setConfirmPick(true)
      return
    }

    if (!selectedPlayer || !currentTournament) return

    try {
      await makePick(selectedPlayer.id, currentTournament)
      notify.success('Pick Submitted!', `You picked ${selectedPlayer.name} for this tournament.`)
      setSelectedPlayer(null)
      setConfirmPick(false)
    } catch (err) {
      notify.error('Pick Failed', err.message)
    }
  }

  const tabs = [
    { id: 'pick', label: 'Make Pick' },
    { id: 'history', label: 'My Picks' },
    { id: 'used', label: 'Used Players' },
    { id: 'standings', label: 'Standings' },
  ]

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
          Back to {league.name}
        </Link>
        <h1 className="text-2xl font-bold text-white">Pick Center</h1>
        <p className="text-text-secondary">Pick one player per tournament - use them wisely!</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-muted mb-1">Total Points</p>
          <p className="text-2xl font-bold text-accent-green">{totalPoints}</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Picks Made</p>
          <p className="text-2xl font-bold text-white">{userPicks.picks?.length || 0}</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Players Used</p>
          <p className="text-2xl font-bold text-white">{userPicks.usedPlayers?.length || 0}</p>
        </Card>

        <Card className={hasCurrentPick ? 'border border-accent-green/50' : 'border border-yellow-500/50'}>
          <p className="text-xs text-text-muted mb-1">This Week</p>
          <p className={`text-lg font-bold ${hasCurrentPick ? 'text-accent-green' : 'text-yellow-400'}`}>
            {hasCurrentPick ? 'Pick Locked' : 'Pick Needed'}
          </p>
        </Card>
      </div>

      {/* Tier Display */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Point Multipliers</h3>
        <TierDisplay tiers={tiers} currentPlayerRank={selectedPlayer?.rank} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-green text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Make Pick Tab */}
      {activeTab === 'pick' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PlayerPicker
              players={players}
              usedPlayers={userPicks.usedPlayers}
              tiers={tiers}
              onSelectPlayer={handleSelectPlayer}
              loading={pickLoading}
              selectedPlayer={selectedPlayer}
            />
          </div>

          <div>
            {selectedPlayer ? (
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Confirm Pick</h3>

                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-dark-tertiary flex items-center justify-center mx-auto mb-4 text-4xl">
                    {selectedPlayer.countryFlag || '🏌️'}
                  </div>
                  <h4 className="text-xl font-bold text-white">{selectedPlayer.name}</h4>
                  <p className="text-text-muted">World Rank #{selectedPlayer.rank}</p>
                </div>

                <div className="bg-dark-tertiary rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted">Tier</span>
                    <span className="font-semibold text-white">Tier {selectedPlayer.tier?.tier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Multiplier</span>
                    <span className="font-bold text-accent-green">{selectedPlayer.tier?.multiplier}x</span>
                  </div>
                </div>

                {confirmPick && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-400 text-center">
                      Once confirmed, you cannot use {selectedPlayer.name} again this season!
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleConfirmPick}
                  loading={pickLoading}
                  fullWidth
                  className={confirmPick ? 'bg-accent-green hover:bg-accent-green/90' : ''}
                >
                  {confirmPick ? 'Confirm Pick' : 'Lock In Pick'}
                </Button>

                {confirmPick && (
                  <button
                    onClick={() => setConfirmPick(false)}
                    className="w-full mt-2 py-2 text-text-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-dark-tertiary flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <h4 className="text-white font-medium mb-2">Select a Player</h4>
                  <p className="text-sm text-text-muted">
                    Choose a golfer from the list to make your pick for this tournament.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <PickHistory picks={userPicks.picks} tiers={tiers} />
      )}

      {/* Used Players Tab */}
      {activeTab === 'used' && (
        <UsedPlayersGrid
          usedPlayers={userPicks.usedPlayers}
          picks={userPicks.picks}
          allPlayers={players}
        />
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <OADStandings standings={leaderboard} currentUserId={user?.id} />
      )}
    </div>
  )
}

export default PickCenter
