import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeagues } from '../hooks/useLeagues'
import useSurvivor from '../hooks/useSurvivor'
import { useNotifications } from '../context/NotificationContext'
import Card from '../components/common/Card'
import SurvivorBoardComponent from '../components/survivor/SurvivorBoard'
import SurvivorStandings from '../components/standings/SurvivorStandings'
import EliminationAlert from '../components/survivor/EliminationAlert'
import BuyBackModal from '../components/survivor/BuyBackModal'

const SurvivorBoardPage = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const { survivorData, loading, error, useBuyBack, buyBackLoading, canUseBuyBack } = useSurvivor(leagueId)
  const { notify } = useNotifications()

  const [activeTab, setActiveTab] = useState('board')
  const [showBuyBackModal, setShowBuyBackModal] = useState(false)

  const league = leagues?.find(l => l.id === leagueId)

  if (leaguesLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading survivor data...</p>
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

  if (!league || league.format !== 'survivor') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold text-white mb-2">Not a Survivor League</h2>
          <p className="text-text-secondary mb-6">
            The Survivor Board is only available for Survivor format leagues.
          </p>
          <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
            Back to League
          </Link>
        </Card>
      </div>
    )
  }

  // Get standings from league
  const standings = league.standings || []

  // Check user's status
  const userTeam = standings.find(t => t.userId === user?.id)
  const isEliminated = userTeam?.status === 'eliminated'
  const userCanBuyBack = canUseBuyBack(user?.id, userTeam?.status)

  const handleBuyBack = async () => {
    try {
      await useBuyBack(user?.id)
      setShowBuyBackModal(false)
      notify.success('Buy-Back Used!', 'You have re-entered the competition.')
    } catch (err) {
      notify.error('Buy-Back Failed', err.message)
    }
  }

  const teamsAlive = standings.filter(t => t.status === 'alive' || t.status === 'buyback').length
  const teamsEliminated = standings.filter(t => t.status === 'eliminated').length

  const tabs = [
    { id: 'board', label: 'Survivor Board' },
    { id: 'standings', label: 'Standings' },
    { id: 'history', label: 'History' },
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
        <h1 className="text-2xl font-bold text-white">Survivor Board</h1>
        <p className="text-text-secondary">Last team standing wins!</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={userTeam?.status === 'alive' ? 'border border-accent-green/50' : userTeam?.status === 'eliminated' ? 'border border-red-400/50' : ''}>
          <p className="text-xs text-text-muted mb-1">Your Status</p>
          <p className={`text-2xl font-bold ${
            userTeam?.status === 'alive' ? 'text-accent-green' :
            userTeam?.status === 'buyback' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {userTeam?.status === 'alive' ? 'Alive' :
             userTeam?.status === 'buyback' ? 'Buyback' : 'Eliminated'}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Current Week</p>
          <p className="text-2xl font-bold text-white">{survivorData?.currentWeek || 1}</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Teams Remaining</p>
          <p className="text-2xl font-bold text-accent-green">{teamsAlive}</p>
          <p className="text-xs text-text-secondary">of {standings.length}</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Eliminated</p>
          <p className="text-2xl font-bold text-red-400">{teamsEliminated}</p>
          <p className="text-xs text-text-secondary">teams out</p>
        </Card>
      </div>

      {/* User Status Alert */}
      {isEliminated && (
        <Card className="mb-6 border border-red-400/50 bg-red-400/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">You've been eliminated</p>
                <p className="text-sm text-text-muted">
                  Eliminated in Week {userTeam?.eliminatedWeek}
                </p>
              </div>
            </div>
            {userCanBuyBack && (
              <button
                onClick={() => setShowBuyBackModal(true)}
                className="px-4 py-2 bg-yellow-500 text-dark-primary font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Use Buy-Back
              </button>
            )}
          </div>
        </Card>
      )}

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

      {/* Board Tab */}
      {activeTab === 'board' && (
        <SurvivorBoardComponent
          standings={standings}
          survivorData={survivorData}
          currentUserId={user?.id}
          onBuyBack={userCanBuyBack ? () => setShowBuyBackModal(true) : undefined}
        />
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <SurvivorStandings
          standings={standings}
          survivorData={survivorData}
          currentUserId={user?.id}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Elimination Timeline</h3>
          {survivorData?.eliminations?.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dark-border"></div>
              <div className="space-y-6">
                {survivorData.eliminations
                  .sort((a, b) => b.week - a.week)
                  .map((elimination, index) => (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 rounded-full bg-red-400 border-4 border-dark-secondary"></div>
                      <div className="bg-dark-tertiary rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">Week {elimination.week}</span>
                          <span className="text-xs text-text-muted">{elimination.points} pts</span>
                        </div>
                        <p className="text-text-secondary">
                          <span className="text-red-400 font-medium">{elimination.name}</span> was eliminated
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              No eliminations yet - everyone is still alive!
            </div>
          )}
        </Card>
      )}

      {/* Buy-Back Modal */}
      <BuyBackModal
        isOpen={showBuyBackModal}
        onClose={() => setShowBuyBackModal(false)}
        onConfirm={handleBuyBack}
        loading={buyBackLoading}
      />
    </div>
  )
}

export default SurvivorBoardPage
