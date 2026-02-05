import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DraftProvider } from '../context/DraftContext'
import { useDraft } from '../hooks/useDraft'
import { usePlayerDetail } from '../hooks/usePlayerDetail'
import DraftHeader from '../components/draft/DraftHeader'
import PlayerPool from '../components/draft/PlayerPool'
import DraftQueue from '../components/draft/DraftQueue'
import DraftBoard from '../components/draft/DraftBoard'
import BidPanel from '../components/draft/BidPanel'
import PickHistory from '../components/draft/PickHistory'
import PickAnnouncement from '../components/draft/PickAnnouncement'
import PlayerDetailModal from '../components/players/PlayerDetailModal'
import ChatPanel from '../components/chat/ChatPanel'
import Card from '../components/common/Card'

const DraftRoomContent = () => {
  const { leagueId } = useParams()
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
    startDraft,
    getAvailablePlayers,
  } = useDraft(leagueId)

  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isNominating, setIsNominating] = useState(false)
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

  const handleTimeout = useCallback(async () => {
    if (isUserTurn && queue.length > 0) {
      // Auto-pick from queue
      const topPick = queue[0]
      if (draft?.type === 'auction') {
        await nominatePlayer(topPick.id, 1)
      } else {
        await makePick(topPick.id)
      }
      removeFromQueue(topPick.id)
    }
  }, [isUserTurn, queue, draft?.type, nominatePlayer, makePick, removeFromQueue])

  const isCommissioner = league?.commissionerId === '1' // Mock check

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
    <div className="min-h-screen bg-dark-primary">
      <DraftHeader
        league={league}
        draft={draft}
        currentPick={currentPick}
        isUserTurn={isUserTurn}
        isPaused={isPaused}
        isCommissioner={isCommissioner}
        onPause={pauseDraft}
        onStart={startDraft}
        onTimeout={handleTimeout}
      />

      <main className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
            {/* Left Column - Player Pool */}
            <div className="lg:col-span-5">
              <div className="h-[600px]">
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
            </div>

            {/* Center Column - Draft Board or Bid Panel */}
            <div className="lg:col-span-4">
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
                />
              )}
            </div>

            {/* Right Column - Queue and History */}
            <div className="lg:col-span-3 space-y-4">
              <div className="h-[250px]">
                <DraftQueue
                  queue={queue}
                  onRemove={removeFromQueue}
                  onReorder={reorderQueue}
                  onSelect={handleSelectPlayer}
                  isUserTurn={isUserTurn}
                />
              </div>
              <PickHistory picks={picks} limit={4} />
              <ChatPanel
                leagueId={leagueId}
                leagueName={league?.name}
                memberCount={league?.memberCount}
                collapsible
                defaultCollapsed
              />
            </div>
          </div>

          {/* Full Width Draft Board for Auction */}
          {draft?.type === 'auction' && (
            <div className="mt-6">
              <DraftBoard
                picks={picks}
                teams={teams}
                rosterSize={rosterSize}
                currentPick={currentPick}
              />
            </div>
          )}
        </div>
      </main>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={detailPlayer}
        isOpen={isModalOpen}
        onClose={closePlayerDetail}
      />

      {/* Pick Announcement */}
      <PickAnnouncement
        pick={recentPick}
        isUserPick={recentPick?.teamId === 'team-1'}
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
