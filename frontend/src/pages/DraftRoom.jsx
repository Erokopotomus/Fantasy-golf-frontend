import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DraftProvider } from '../context/DraftContext'
import { useAuth } from '../context/AuthContext'
import { useDraft } from '../hooks/useDraft'
import { usePlayerDetail } from '../hooks/usePlayerDetail'
import DraftHeader from '../components/draft/DraftHeader'
import PlayerPool from '../components/draft/PlayerPool'
import DraftQueue from '../components/draft/DraftQueue'
import DraftBoard from '../components/draft/DraftBoard'
import DraftDashboard from '../components/draft/DraftDashboard'
import BidPanel from '../components/draft/BidPanel'
import PickAnnouncement from '../components/draft/PickAnnouncement'
import PlayerDetailModal from '../components/players/PlayerDetailModal'
import Card from '../components/common/Card'

const DraftRoomContent = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const {
    draft,
    league,
    players,
    picks,
    queue,
    currentPick,
    currentBid,
    userBudget,
    isUserTurn,
    isPaused,
    loading,
    error,
    recentPick,
    makePick,
    nominatePlayer,
    placeBid,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    pauseDraft,
    resumeDraft,
    startDraft,
    handleTimeout,
    getAvailablePlayers,
  } = useDraft(leagueId)

  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isNominating, setIsNominating] = useState(false)
  const [activeTab, setActiveTab] = useState('draft')
  const { selectedPlayer: detailPlayer, isModalOpen, openPlayerDetail, closePlayerDetail } = usePlayerDetail()

  const handleSelectPlayer = useCallback(async (player) => {
    if (draft?.type === 'auction') {
      setSelectedPlayer(player)
      setIsNominating(true)
    } else {
      try {
        await makePick(player.id)
      } catch (err) {
        // Error handled by hook
      }
    }
  }, [draft?.type, makePick])

  const handleNominate = useCallback(async (playerId, startingBid) => {
    try {
      await nominatePlayer(playerId, startingBid)
      setIsNominating(false)
      setSelectedPlayer(null)
    } catch (err) {
      // Error handled by hook
    }
  }, [nominatePlayer])

  const handleBid = useCallback(async (amount) => {
    try {
      await placeBid(amount)
    } catch (err) {
      // Error handled by hook
    }
  }, [placeBid])

  const handlePass = useCallback(() => {
    // In a real app, this would send a pass action to the server
    console.log('Passed on bid')
  }, [])

  const isCommissioner = league?.ownerId === user?.id

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading draft room...</p>
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
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Draft</h2>
              <p className="text-text-secondary mb-6">{error}</p>
              <Link
                to="/dashboard"
                className="text-accent-green hover:underline"
              >
                Return to Dashboard
              </Link>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  const availablePlayers = getAvailablePlayers()
  const teams = draft?.teams || []
  const rosterSize = league?.settings?.rosterSize || 6

  return (
    <div className="h-screen bg-dark-primary flex flex-col overflow-hidden">
      <DraftHeader
        league={league}
        draft={draft}
        currentPick={currentPick}
        isUserTurn={isUserTurn}
        isPaused={isPaused}
        isCommissioner={isCommissioner}
        onPause={pauseDraft}
        onResume={resumeDraft}
        onStart={startDraft}
        onTimeout={handleTimeout}
      />

      {/* Tab Bar */}
      <div className="bg-dark-secondary border-b border-dark-border flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {['draft', 'dashboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab
                    ? 'text-accent-green'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {tab === 'draft' ? 'Draft' : 'Dashboard'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-3">
          <DraftDashboard
            picks={picks}
            teams={teams}
            players={players}
            rosterSize={rosterSize}
            draft={draft}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: Draft Board (full width) */}
          <div className="h-[45%] flex flex-col min-h-0 border-b-2 border-accent-green/30 p-2">
            {draft?.type === 'auction' ? (
              <BidPanel
                currentBid={currentBid}
                userBudget={userBudget}
                isUserTurn={isUserTurn}
                isNominating={isNominating}
                onBid={handleBid}
                onPass={handlePass}
                onNominate={handleNominate}
                selectedPlayer={selectedPlayer}
              />
            ) : (
              <DraftBoard
                picks={picks}
                teams={teams}
                rosterSize={rosterSize}
                currentPick={currentPick}
                userTeamId={draft?.userTeamId}
                onViewPlayer={openPlayerDetail}
                players={players}
              />
            )}
          </div>

          {/* Bottom: Player Pool + Queue */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Left: Player Pool */}
            <div className="flex-1 lg:w-[60%] lg:border-r lg:border-dark-border min-h-0">
              <PlayerPool
                players={availablePlayers}
                onSelectPlayer={handleSelectPlayer}
                onAddToQueue={addToQueue}
                isUserTurn={isUserTurn}
                queue={queue}
                draftType={draft?.type}
                onViewPlayer={openPlayerDetail}
              />
            </div>
            {/* Right: Queue */}
            <div className="lg:w-[40%] flex flex-col min-h-0 overflow-auto p-2">
              <DraftQueue
                queue={queue}
                onRemove={removeFromQueue}
                onReorder={reorderQueue}
                onSelect={handleSelectPlayer}
                isUserTurn={isUserTurn}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full Width Draft Board for Auction */}
      {draft?.type === 'auction' && activeTab === 'draft' && (
        <div className="p-4">
          <DraftBoard
            picks={picks}
            teams={teams}
            rosterSize={rosterSize}
            currentPick={currentPick}
            userTeamId={draft?.userTeamId}
            onViewPlayer={openPlayerDetail}
            players={players}
          />
        </div>
      )}

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={detailPlayer}
        isOpen={isModalOpen}
        onClose={closePlayerDetail}
      />

      {/* Pick Announcement */}
      <PickAnnouncement
        pick={recentPick}
        isUserPick={recentPick?.teamId === draft?.userTeamId}
      />
    </div>
  )
}

const DraftRoom = () => {
  return (
    <DraftProvider>
      <DraftRoomContent />
    </DraftProvider>
  )
}

export default DraftRoom
