import { useState } from 'react'
import { Link } from 'react-router-dom'
import useDraftBoards from '../hooks/useDraftBoards'

const SPORT_OPTIONS = [
  { value: 'nfl', label: 'NFL', icon: '🏈' },
  { value: 'golf', label: 'Golf', icon: '⛳' },
]

const SCORING_OPTIONS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
]

export default function DraftBoards() {
  const { boards, loading, error, createBoard, deleteBoard } = useDraftBoards()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('nfl')
  const [newScoring, setNewScoring] = useState('ppr')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createBoard({ name: newName.trim(), sport: newSport, scoringFormat: newScoring })
      setShowCreate(false)
      setNewName('')
      setNewSport('nfl')
      setNewScoring('ppr')
    } catch (err) {
      console.error('Create board failed:', err)
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Workspace</h1>
          <p className="text-sm text-white/40 mt-1">Personal draft boards, rankings & scouting notes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gold text-dark-primary text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Board
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-red-400 text-sm">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && boards.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No boards yet</h2>
          <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
            Create your first draft board to start ranking players, adding notes, and building your strategy.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-gold text-dark-primary text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors"
          >
            Create Your First Board
          </button>
        </div>
      )}

      {/* Board grid */}
      {!loading && boards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <Link
              key={board.id}
              to={`/workspace/${board.id}`}
              className="block p-4 bg-dark-secondary/60 border border-white/[0.06] rounded-xl hover:border-gold/30 hover:bg-dark-secondary/80 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-white group-hover:text-gold transition-colors truncate">
                  {board.name}
                </h3>
                {board.sport === 'nfl' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange/20 text-orange shrink-0 ml-2">NFL</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 shrink-0 ml-2">Golf</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                {board.sport === 'nfl' && (
                  <span className="px-1.5 py-0.5 bg-white/[0.04] rounded">
                    {board.scoringFormat === 'ppr' ? 'PPR' : board.scoringFormat === 'half_ppr' ? 'Half PPR' : 'Standard'}
                  </span>
                )}
                <span>{board.playerCount} player{board.playerCount !== 1 ? 's' : ''}</span>
                <span className="ml-auto">{formatDate(board.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-dark-secondary border border-white/[0.08] rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">New Draft Board</h2>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Board Name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., 2026 NFL Big Board"
                  className="w-full px-3 py-2 text-sm bg-dark-primary border border-white/[0.08] rounded-lg text-white placeholder-white/30 outline-none focus:border-gold/50"
                />
              </div>

              {/* Sport */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Sport</label>
                <div className="flex gap-2">
                  {SPORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewSport(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                        newSport === opt.value
                          ? 'border-gold/50 bg-gold/10 text-gold'
                          : 'border-white/[0.08] bg-dark-primary text-white/50 hover:text-white/70'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scoring format (NFL only) */}
              {newSport === 'nfl' && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Scoring Format</label>
                  <select
                    value={newScoring}
                    onChange={e => setNewScoring(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-dark-primary border border-white/[0.08] rounded-lg text-white outline-none focus:border-gold/50 cursor-pointer"
                  >
                    {SCORING_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || creating}
                  className="px-5 py-2 text-sm font-semibold bg-gold text-dark-primary rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
