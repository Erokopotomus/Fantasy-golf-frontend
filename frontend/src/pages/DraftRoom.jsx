import { useState, useCallback, useRef, useEffect } from 'react'
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
  const [sideTab, setSideTab] = useState('queue')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const { selectedPlayer: detailPlayer, isModalOpen, openPlayerDetail, closePlayerDetail } = usePlayerDetail()

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      sender: 'You',
      text: chatInput.trim(),
      isUser: true,
    }])
    setChatInput('')
    // TODO: emit via socket for live draft
  }, [chatInput])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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

  const [hasPassed, setHasPassed] = useState(false)

  // Reset pass state when a new nomination starts
  useEffect(() => {
    if (currentBid?.playerId) {
      setHasPassed(false)
    }
  }, [currentBid?.playerId])

  const handlePass = useCallback(() => {
    setHasPassed(true)
  }, [])

  const isCommissioner = league?.ownerId === user?.id

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
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
              <h2 className="text-xl font-bold font-display text-white mb-2">Error Loading Draft</h2>
              <p className="text-text-secondary mb-6">{error}</p>
              <Link
                to="/dashboard"
                className="text-gold hover:underline"
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
                    ? 'text-gold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {tab === 'draft' ? 'Draft' : 'Dashboard'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
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
          <div className="h-[45%] flex flex-col min-h-0 border-b-2 border-gold/30 p-2">
            {draft?.type === 'auction' ? (
              <BidPanel
                currentBid={currentBid}
                userBudget={userBudget}
                isUserTurn={isUserTurn}
                isNominating={isNominating}
                hasPassed={hasPassed}
                onBid={handleBid}
                onPass={handlePass}
                onNominate={handleNominate}
                selectedPlayer={selectedPlayer}
                teams={teams}
                userTeamId={draft?.userTeamId}
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
            {/* Right: Queue / Chat */}
            <div className="lg:w-[40%] flex flex-col min-h-0">
              {/* Side Panel Tabs */}
              <div className="flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
                {[
                  { key: 'queue', label: `Queue (${queue.length})` },
                  { key: 'chat', label: 'Chat' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSideTab(tab.key)}
                    className={`flex-1 px-3 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-colors ${
                      sideTab === tab.key
                        ? 'text-gold border-b-2 border-gold'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                {sideTab === 'queue' ? (
                  <div className="h-full overflow-auto p-2">
                    <DraftQueue
                      queue={queue}
                      onRemove={removeFromQueue}
                      onReorder={reorderQueue}
                      onSelect={handleSelectPlayer}
                      isUserTurn={isUserTurn}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-text-muted text-sm">No messages yet</p>
                          <p className="text-text-muted text-xs mt-1">Chat with your league during the draft</p>
                        </div>
                      ) : (
                        chatMessages.map(msg => (
                          <div key={msg.id}>
                            <div className={`flex gap-2 ${msg.isUser ? 'justify-end' : ''}`}>
                              <div className="max-w-[85%]">
                                {!msg.isUser && (
                                  <p className="text-[10px] text-text-muted mb-0.5 font-medium">{msg.sender}</p>
                                )}
                                <div className={`px-2.5 py-1.5 rounded-lg text-sm ${
                                  msg.isUser
                                    ? 'bg-gold/20 text-white rounded-br-sm'
                                    : 'bg-dark-primary text-text-secondary rounded-bl-sm'
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSendChat() }}
                      className="flex-shrink-0 p-2 border-t border-dark-border"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-1.5 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="px-3 py-1.5 bg-gold text-white rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gold/80 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
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
