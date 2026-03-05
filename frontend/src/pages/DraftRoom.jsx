import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
import DraftCompletionOverlay from '../components/draft/DraftCompletionOverlay'
import DraftConfirmModal from '../components/draft/DraftConfirmModal'
import BestAvailableStrip from '../components/draft/BestAvailableStrip'
import PlayerDetailModal from '../components/players/PlayerDetailModal'
import Card from '../components/common/Card'
import useDraftSounds from '../hooks/useDraftSounds'
import api from '../services/api'
import socketService from '../services/socket'

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
    pickError,
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
    undoPick,
    handleTimeout,
    getAvailablePlayers,
  } = useDraft(leagueId)

  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isNominating, setIsNominating] = useState(false)
  const [activeTab, setActiveTab] = useState('draft')
  const [sideTab, setSideTab] = useState('queue')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [confirmingPick, setConfirmingPick] = useState(null)
  const [isConfirmingDraft, setIsConfirmingDraft] = useState(false)
  const [visiblePickError, setVisiblePickError] = useState(null)
  const chatEndRef = useRef(null)
  const { selectedPlayer: detailPlayer, isModalOpen, openPlayerDetail, closePlayerDetail } = usePlayerDetail()
  const { soundEnabled, toggleSound, initSounds, playPick, playYourTurn, playUpNext, playTimerWarning, playDraftStart, playBid, playDraftComplete } = useDraftSounds()

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handler = () => { initSounds(); document.removeEventListener('click', handler) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [initSounds])

  // Show pick error as toast and auto-dismiss after 4 seconds
  useEffect(() => {
    if (pickError) {
      setVisiblePickError(pickError)
      const timer = setTimeout(() => {
        setVisiblePickError(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [pickError])

  // U16: Detect when user is ONE pick away from their turn
  const isUserUpNext = useMemo(() => {
    if (!draft || !draft.draftOrder?.length || !draft.userTeamId || draft.status !== 'IN_PROGRESS') return false
    if (isUserTurn) return false
    const totalTeams = draft.draftOrder.length
    const totalPicks = totalTeams * (draft.totalRounds || 6)
    const nextPickNumber = picks.length + 2
    if (nextPickNumber > totalPicks) return false
    const nextRound = Math.floor((nextPickNumber - 1) / totalTeams) + 1
    const nextPickInRound = (nextPickNumber - 1) % totalTeams
    const isEvenRound = nextRound % 2 === 0
    const nextPosition = isEvenRound ? totalTeams - nextPickInRound : nextPickInRound + 1
    const nextOrder = draft.draftOrder.find(o => o.position === nextPosition)
    return nextOrder?.teamId === draft.userTeamId
  }, [draft, picks.length, isUserTurn])

  // Sound: up-next notification (softer tone when user is one pick away)
  const prevIsUpNext = useRef(false)
  useEffect(() => {
    if (isUserUpNext && !prevIsUpNext.current) playUpNext()
    prevIsUpNext.current = isUserUpNext
  }, [isUserUpNext, playUpNext])

  // Sound: your turn notification
  const prevIsUserTurn = useRef(false)
  useEffect(() => {
    if (isUserTurn && !prevIsUserTurn.current) playYourTurn()
    prevIsUserTurn.current = isUserTurn
  }, [isUserTurn, playYourTurn])

  // Browser tab title when it's your turn
  useEffect(() => {
    if (isUserTurn && draft?.status === 'IN_PROGRESS') {
      document.title = '🟡 YOUR TURN — Clutch Draft'
    } else if (draft?.status === 'IN_PROGRESS') {
      document.title = `${currentPick?.teamName || 'Draft'} — Clutch Draft`
    } else {
      document.title = 'Clutch Fantasy Sports'
    }
    return () => { document.title = 'Clutch Fantasy Sports' }
  }, [isUserTurn, draft?.status, currentPick?.teamName])

  // Sound: pick made
  const prevPickCount = useRef(0)
  useEffect(() => {
    if (picks.length > prevPickCount.current && prevPickCount.current > 0) playPick()
    prevPickCount.current = picks.length
  }, [picks.length, playPick])

  // Sound: draft started
  const prevDraftStatus = useRef(null)
  useEffect(() => {
    if (prevDraftStatus.current === 'SCHEDULED' && draft?.status === 'IN_PROGRESS') playDraftStart()
    if (prevDraftStatus.current === 'IN_PROGRESS' && draft?.status === 'COMPLETED') playDraftComplete()
    prevDraftStatus.current = draft?.status
  }, [draft?.status, playDraftStart, playDraftComplete])

  // Draft completion celebration overlay
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false)
  const prevDraftStatusRef = useRef(null)
  const completionShownRef = useRef(false)

  // Detect live IN_PROGRESS -> COMPLETED transition (not page refresh of completed draft)
  useEffect(() => {
    const currentStatus = draft?.status
    const prevStatus = prevDraftStatusRef.current

    if (
      prevStatus &&
      prevStatus !== 'COMPLETED' &&
      currentStatus === 'COMPLETED' &&
      !completionShownRef.current
    ) {
      completionShownRef.current = true
      setShowCompletionOverlay(true)
    }

    prevDraftStatusRef.current = currentStatus
  }, [draft?.status])

  // Desktop detection for conditional inline styles
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Resizable divider between board and player panel
  const [boardPct, setBoardPct] = useState(() => {
    const saved = localStorage.getItem('clutch-draft-board-pct')
    return saved ? Number(saved) : 35 // Default 35% board, 65% players
  })
  const isDragging = useRef(false)
  const containerRef = useRef(null)

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const y = ev.clientY - rect.top
      const pct = Math.max(15, Math.min(75, (y / rect.height) * 100))
      setBoardPct(pct)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // Persist preference
      setBoardPct(prev => { localStorage.setItem('clutch-draft-board-pct', prev); return prev })
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  // Horizontal resizer between player pool and queue/chat
  const [playerPct, setPlayerPct] = useState(() => {
    const saved = localStorage.getItem('clutch-draft-player-pct')
    return saved ? Number(saved) : 60
  })
  const isHDragging = useRef(false)
  const bottomRef = useRef(null)

  const handleHDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    isHDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev) => {
      if (!isHDragging.current || !bottomRef.current) return
      const rect = bottomRef.current.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const pct = Math.max(30, Math.min(85, (x / rect.width) * 100))
      setPlayerPct(pct)
    }
    const onMouseUp = () => {
      isHDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setPlayerPct(prev => { localStorage.setItem('clutch-draft-player-pct', prev); return prev })
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  // Touch support for mobile
  const handleDividerTouchStart = useCallback((e) => {
    isDragging.current = true
    const onTouchMove = (ev) => {
      if (!isDragging.current || !containerRef.current) return
      const touch = ev.touches[0]
      const rect = containerRef.current.getBoundingClientRect()
      const y = touch.clientY - rect.top
      const pct = Math.max(15, Math.min(75, (y / rect.height) * 100))
      setBoardPct(pct)
    }
    const onTouchEnd = () => {
      isDragging.current = false
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      setBoardPct(prev => { localStorage.setItem('clutch-draft-board-pct', prev); return prev })
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }, [])

  // Board integration
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState(null)
  const [boardEntries, setBoardEntries] = useState([])

  // Fetch user's boards on mount
  useEffect(() => {
    api.getDraftBoards().then(res => {
      const allBoards = res.boards || []
      setBoards(allBoards)
      // Auto-select if only one board
      if (allBoards.length === 1) {
        setSelectedBoardId(allBoards[0].id)
      }
    }).catch(() => {})
  }, [])

  // Fetch board entries when a board is selected
  useEffect(() => {
    if (!selectedBoardId) { setBoardEntries([]); return }
    api.getDraftBoard(selectedBoardId).then(res => {
      setBoardEntries(res.board?.entries || [])
    }).catch(() => setBoardEntries([]))
  }, [selectedBoardId])

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    const msgId = `msg-${Date.now()}-${user?.id || 'local'}`
    setChatMessages(prev => [...prev, {
      id: msgId,
      sender: 'You',
      senderId: user?.id,
      text: chatInput.trim(),
      isUser: true,
    }])
    socketService.sendDraftChat(
      draft?.id,
      chatInput.trim(),
      user?.name || 'Anonymous',
      user?.id
    )
    setChatInput('')
  }, [chatInput, draft?.id, user?.id, user?.name])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Load persisted chat history on mount
  useEffect(() => {
    if (!draft?.id) return
    api.getDraftChat(draft.id).then(data => {
      if (data.messages && data.messages.length > 0) {
        setChatMessages(data.messages.map(msg => ({
          id: msg.id,
          sender: msg.userName,
          senderId: msg.userId,
          text: msg.message,
          isUser: msg.userId === user?.id,
        })))
      }
    }).catch(() => {})
  }, [draft?.id, user?.id])

  // Listen for incoming draft chat messages from other participants
  useEffect(() => {
    if (!draft?.id) return
    const unsub = socketService.onDraftChat((data) => {
      // Skip messages from this user — already added optimistically
      if (data.senderId === user?.id) return
      setChatMessages(prev => [...prev, {
        id: data.id,
        sender: data.sender,
        senderId: data.senderId,
        text: data.message,
        isUser: false,
      }])
    })
    return unsub
  }, [draft?.id, user?.id])

  // Draft lobby presence — track who's connected
  const [connectedUserIds, setConnectedUserIds] = useState([])

  useEffect(() => {
    if (!draft?.id) return
    const unsub = socketService.onDraftPresence((data) => {
      setConnectedUserIds(data.connectedUserIds || [])
    })
    return unsub
  }, [draft?.id])

  const handleSelectPlayer = useCallback((player) => {
    if (draft?.type === 'auction') {
      setSelectedPlayer(player)
      setIsNominating(true)
    } else {
      // Show confirmation modal for snake/straight drafts
      setConfirmingPick(player)
    }
  }, [draft?.type])

  const handleConfirmDraft = useCallback(async () => {
    if (!confirmingPick) return
    setIsConfirmingDraft(true)
    try {
      await makePick(confirmingPick.id)
      setConfirmingPick(null)
    } catch (err) {
      // Error is displayed in pickError state and shown as toast
    } finally {
      setIsConfirmingDraft(false)
    }
  }, [confirmingPick, makePick])

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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading draft room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-live-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-live-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-display text-text-primary mb-2">Error Loading Draft</h2>
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

  // Compute next team for between-picks experience (U05)
  // Using IIFE instead of useMemo since this is after early returns
  const nextTeamName = (() => {
    if (!draft?.draftOrder?.length) return null
    const totalTeams = draft.draftOrder.length
    const totalPicks = totalTeams * (draft.totalRounds || rosterSize)
    const nextPickNumber = picks.length + 2 // one after the current pick
    if (nextPickNumber > totalPicks) return null

    const round = Math.floor((nextPickNumber - 1) / totalTeams) + 1
    const pickInRound = (nextPickNumber - 1) % totalTeams
    const isEvenRound = round % 2 === 0
    const nextPosition = isEvenRound ? totalTeams - pickInRound : pickInRound + 1
    const nextOrder = draft.draftOrder.find(o => o.position === nextPosition)
    const nextTeam = draft.teams?.find(t => t.id === nextOrder?.teamId)
    return nextTeam?.name || null
  })()

  return (
    <div className="h-screen bg-[var(--bg)] flex flex-col overflow-hidden max-w-[1600px] mx-auto w-full">
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
        onUndoPick={undoPick}
        picksCount={picks.length}
      />

      {/* Tab Bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--card-border)] flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex gap-1">
            {['draft', 'dashboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab
                    ? 'text-gold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab === 'draft' ? 'Draft' : 'Dashboard'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg hover:bg-[var(--bg-alt)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            aria-label={soundEnabled ? 'Mute draft sounds' : 'Enable draft sounds'}
          >
            {soundEnabled ? (
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
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
            onViewPlayer={openPlayerDetail}
          />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Top: Draft Board — resizable via drag divider */}
          <div style={{ height: `${boardPct}%` }} className="flex flex-col min-h-0 p-2 shrink-0">
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
                connectedUserIds={connectedUserIds}
                draftOrder={draft?.draftOrder}
              />
            )}
          </div>

          {/* Resizable drag divider */}
          <div
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerTouchStart}
            className="shrink-0 h-2 cursor-row-resize flex items-center justify-center group hover:bg-gold/10 active:bg-gold/20 transition-colors border-y border-[var(--card-border)]"
            title="Drag to resize"
          >
            <div className="w-10 h-0.5 rounded-full bg-[var(--card-border)] group-hover:bg-gold group-active:bg-gold transition-colors" />
          </div>

          {/* Bottom: Player Pool + Queue */}
          <div ref={bottomRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Left: Player Pool — resizable width */}
            <div className="flex-[2] lg:flex-none lg:shrink-0 min-h-0 flex flex-col" style={isDesktop ? { width: `${playerPct}%` } : undefined}>
              {/* Between-Picks Experience (U05) — shown when not user's turn and draft is in progress */}
              {draft?.status === 'IN_PROGRESS' && !isUserTurn && !currentPick?.complete && (
                <div className="shrink-0 px-3 py-2 bg-[var(--surface)] border-b border-[var(--card-border)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
                      <span className="text-xs font-semibold text-text-primary truncate">
                        On the clock: {currentPick?.teamName || 'Waiting...'}
                      </span>
                    </div>
                    {nextTeamName && (
                      <span className="text-[10px] text-text-muted shrink-0">
                        Up next: <span className="text-text-secondary font-medium">{nextTeamName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5 italic">Research your next pick while you wait</p>
                </div>
              )}

              {/* Best Available Recommendation Strip (U01) */}
              {draft?.status === 'IN_PROGRESS' && !currentPick?.complete && (
                <div className="shrink-0 px-2 pt-1.5">
                  <BestAvailableStrip
                    players={availablePlayers}
                    boardEntries={boardEntries}
                    isUserTurn={isUserTurn}
                    onViewPlayer={openPlayerDetail}
                  />
                </div>
              )}

              {/* Board selector */}
              {boards.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--card-border)] bg-[var(--surface)] shrink-0">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Board:</span>
                  <select
                    value={selectedBoardId || ''}
                    onChange={e => setSelectedBoardId(e.target.value || null)}
                    className="text-xs bg-[var(--bg-alt)] border border-[var(--card-border)] rounded px-2 py-1 text-text-primary focus:border-gold focus:outline-none"
                  >
                    <option value="">None</option>
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <PlayerPool
                  players={availablePlayers}
                  onSelectPlayer={handleSelectPlayer}
                  onAddToQueue={addToQueue}
                  isUserTurn={isUserTurn}
                  queue={queue}
                  draftType={draft?.type}
                  onViewPlayer={openPlayerDetail}
                  boardEntries={boardEntries}
                />
              </div>
            </div>
            {/* Horizontal drag divider (desktop only) */}
            <div
              onMouseDown={handleHDividerMouseDown}
              className="hidden lg:flex shrink-0 w-2 cursor-col-resize items-center justify-center group hover:bg-gold/10 active:bg-gold/20 transition-colors border-x border-[var(--card-border)]"
              title="Drag to resize"
            >
              <div className="h-10 w-0.5 rounded-full bg-[var(--card-border)] group-hover:bg-gold group-active:bg-gold transition-colors" />
            </div>
            {/* Right: Queue / Chat — constrained on mobile */}
            <div className="flex-1 max-h-[30%] lg:max-h-none flex flex-col min-h-0">
              {/* Side Panel Tabs */}
              <div className="flex border-b border-[var(--card-border)] bg-[var(--surface)] flex-shrink-0">
                {[
                  { key: 'queue', label: `Queue (${queue.length})` },
                  { key: 'feed', label: `Feed (${picks.length})` },
                  { key: 'chat', label: 'Chat' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSideTab(tab.key)}
                    className={`flex-1 px-3 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-colors ${
                      sideTab === tab.key
                        ? 'text-gold border-b-2 border-gold'
                        : 'text-text-secondary hover:text-text-primary'
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
                ) : sideTab === 'feed' ? (
                  <div className="h-full overflow-auto p-2 space-y-1">
                    {picks.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-text-muted text-sm">No picks yet</p>
                        <p className="text-text-muted text-xs mt-1">Picks will appear here as they're made</p>
                      </div>
                    ) : (
                      [...picks].reverse().map((pick, i) => {
                        const isUserPick = pick.teamId === draft?.userTeamId
                        return (
                          <div
                            key={pick.id || i}
                            className={`px-2 py-1.5 rounded text-xs border border-[var(--card-border)] transition-colors ${
                              isUserPick
                                ? 'bg-gold/10 border-gold/30'
                                : 'bg-[var(--bg-alt)] hover:bg-[var(--card-bg)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-text-muted">
                                R{pick.round}.{pick.pickNumber}
                              </span>
                              <span className={`font-medium ${isUserPick ? 'text-gold' : 'text-text-primary'}`}>
                                {pick.teamName}
                              </span>
                              <span className="text-text-muted">→</span>
                              <span className="text-text-primary truncate flex-1">{pick.playerName}</span>
                              {pick.playerRank && (
                                <span className="text-text-muted text-[10px] whitespace-nowrap">
                                  #{pick.playerRank}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
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
                                    ? 'bg-gold/20 text-text-primary rounded-br-sm'
                                    : 'bg-[var(--bg)] text-text-secondary rounded-bl-sm'
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
                      className="flex-shrink-0 p-2 border-t border-[var(--card-border)]"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg text-text-primary text-sm focus:border-gold focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="px-3 py-1.5 bg-gold text-text-primary rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gold/80 transition-colors"
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
            draftOrder={draft?.draftOrder}
          />
        </div>
      )}

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={detailPlayer ? {
          ...detailPlayer,
          stats: detailPlayer.stats || {
            sgTotal: detailPlayer.sgTotal,
            sgOffTee: detailPlayer.sgOffTee,
            sgApproach: detailPlayer.sgApproach,
            sgAroundGreen: detailPlayer.sgAroundGreen,
            sgPutting: detailPlayer.sgPutting,
            drivingDistance: detailPlayer.drivingDistance,
            drivingAccuracy: detailPlayer.drivingAccuracy,
            gir: detailPlayer.gir,
            scoringAvg: detailPlayer.scoringAvg,
          },
        } : null}
        isOpen={isModalOpen}
        onClose={closePlayerDetail}
        isDraftContext={true}
        onAddToQueue={addToQueue}
        onDraft={isUserTurn ? handleSelectPlayer : undefined}
      />

      {/* Draft Confirmation Modal */}
      <DraftConfirmModal
        isOpen={!!confirmingPick}
        player={confirmingPick}
        currentPick={currentPick}
        onConfirm={handleConfirmDraft}
        onCancel={() => setConfirmingPick(null)}
        isLoading={isConfirmingDraft}
      />

      {/* Pick Error Toast */}
      {visiblePickError && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-live-red/95 backdrop-blur-sm text-white rounded-lg px-5 py-3 shadow-lg flex items-start gap-3 max-w-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium">{visiblePickError}</p>
            </div>
            <button
              onClick={() => setVisiblePickError(null)}
              className="text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Pick Announcement */}
      <PickAnnouncement
        pick={recentPick}
        isUserPick={recentPick?.teamId === draft?.userTeamId}
      />

      {/* Draft Completion Celebration */}
      <DraftCompletionOverlay
        draftId={draft?.id}
        leagueId={league?.id || leagueId}
        leagueName={league?.name}
        visible={showCompletionOverlay}
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
