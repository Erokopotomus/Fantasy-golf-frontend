import { useState, useEffect } from 'react'
import api from '../../services/api'

const SPORT_BADGE = {
  nfl: 'bg-blue-500/20 text-blue-400',
  golf: 'bg-emerald-500/20 text-emerald-400',
}

export default function AddToBoardModal({ playerId, playerName, sport, onClose }) {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null) // boardId being added to
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [boardPlayerMap, setBoardPlayerMap] = useState({}) // boardId -> Set of playerIds

  useEffect(() => {
    api.getDraftBoards()
      .then(data => {
        const list = data.boards || []
        setBoards(list)
        // Load entries for each board to check duplicates
        Promise.all(
          list.map(b =>
            api.getDraftBoard(b.id)
              .then(d => [b.id, new Set((d.board?.entries || d.entries || []).map(e => e.playerId))])
              .catch(() => [b.id, new Set()])
          )
        ).then(pairs => {
          setBoardPlayerMap(Object.fromEntries(pairs))
        })
      })
      .catch(() => setBoards([]))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (boardId) => {
    setAdding(boardId)
    setError(null)
    setSuccess(null)
    try {
      await api.addDraftBoardEntry(boardId, playerId)
      setSuccess(boardId)
      setBoardPlayerMap(prev => ({
        ...prev,
        [boardId]: new Set([...(prev[boardId] || []), playerId]),
      }))
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setError(err.message || 'Failed to add player')
    } finally {
      setAdding(null)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const data = await api.createDraftBoard({
        name: newName.trim(),
        sport: sport || 'golf',
        scoringFormat: sport === 'nfl' ? 'ppr' : 'standard',
        boardType: 'overall',
      })
      const board = data.board
      await api.addDraftBoardEntry(board.id, playerId)
      setSuccess(board.id)
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setError(err.message || 'Failed to create board')
    } finally {
      setCreating(false)
    }
  }

  const alreadyOnBoard = (boardId) => boardPlayerMap[boardId]?.has(playerId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-dark-secondary border border-white/10 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Add to Board</h2>
            <p className="text-white/40 text-sm mt-0.5">{playerName}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No boards yet. Create one below.</p>
          ) : (
            <div className="space-y-2">
              {boards.map(board => {
                const onBoard = alreadyOnBoard(board.id)
                const isAdding = adding === board.id
                const isSuccess = success === board.id
                return (
                  <div
                    key={board.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${SPORT_BADGE[board.sport] || SPORT_BADGE.golf}`}>
                        {board.sport}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{board.name}</p>
                        <p className="text-[11px] text-white/30 font-mono">{board.playerCount} player{board.playerCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {isSuccess ? (
                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Added
                      </span>
                    ) : onBoard ? (
                      <span className="text-white/20 text-xs font-mono">On board</span>
                    ) : (
                      <button
                        onClick={() => handleAdd(board.id)}
                        disabled={isAdding}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-gold/15 text-gold hover:bg-gold/25 transition-colors disabled:opacity-50"
                      >
                        {isAdding ? 'Adding...' : 'Add'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create new board */}
        <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
          {error && (
            <p className="text-red-400 text-xs mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
              placeholder="New board name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newName.trim() || creating}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-gold to-orange text-white disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {creating ? '...' : 'Create + Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
