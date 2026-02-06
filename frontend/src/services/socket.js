import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

let socket = null

export const socketService = {
  connect() {
    if (socket?.connected) return socket

    const token = localStorage.getItem('clutch_token')

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })

    return socket
  },

  disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  },

  getSocket() {
    return socket
  },

  // Draft room methods
  joinDraft(draftId) {
    if (!socket?.connected) this.connect()
    socket?.emit('join-draft', draftId)
  },

  leaveDraft(draftId) {
    socket?.emit('leave-draft', draftId)
  },

  // Event listeners - return unsubscribe functions
  onDraftStarted(callback) {
    socket?.on('draft-started', callback)
    return () => socket?.off('draft-started', callback)
  },

  onDraftPick(callback) {
    socket?.on('draft-pick', callback)
    return () => socket?.off('draft-pick', callback)
  },

  onDraftPaused(callback) {
    socket?.on('draft-paused', callback)
    return () => socket?.off('draft-paused', callback)
  },

  onDraftResumed(callback) {
    socket?.on('draft-resumed', callback)
    return () => socket?.off('draft-resumed', callback)
  },

  onDraftCompleted(callback) {
    socket?.on('draft-completed', callback)
    return () => socket?.off('draft-completed', callback)
  },

  // Auction draft events
  onAuctionNomination(callback) {
    socket?.on('auction-nomination', callback)
    return () => socket?.off('auction-nomination', callback)
  },

  onAuctionBid(callback) {
    socket?.on('auction-bid', callback)
    return () => socket?.off('auction-bid', callback)
  },

  onAuctionWon(callback) {
    socket?.on('auction-won', callback)
    return () => socket?.off('auction-won', callback)
  },

  onAuctionNextNominator(callback) {
    socket?.on('auction-next-nominator', callback)
    return () => socket?.off('auction-next-nominator', callback)
  },

  // League room methods
  joinLeague(leagueId) {
    if (!socket?.connected) this.connect()
    socket?.emit('join-league', leagueId)
  },

  leaveLeague(leagueId) {
    socket?.emit('leave-league', leagueId)
  },

  // Chat methods
  sendChatMessage(leagueId, content) {
    socket?.emit('chat-message', { leagueId, content })
  },

  onNewMessage(callback) {
    socket?.on('new-message', callback)
    return () => socket?.off('new-message', callback)
  },
}

export default socketService
