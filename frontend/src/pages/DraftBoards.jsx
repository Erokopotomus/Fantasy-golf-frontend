import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const START_FROM_OPTIONS = {
  nfl: [
    {
      value: 'clutch',
      label: 'Clutch Rankings',
      recommended: true,
      description: 'Blended projections + ADP from our data pipeline. Auto-updates weekly. Your starting point — customize from here.',
    },
    {
      value: 'adp',
      label: 'ADP (Average Draft Position)',
      description: 'Based on thousands of real mock drafts. Pure consensus draft position.',
    },
    {
      value: 'previous',
      label: 'My Previous Board',
      description: 'Copy your most recent NFL board. Carry over rankings, tiers, and notes.',
    },
    {
      value: 'scratch',
      label: 'Start from Scratch',
      description: 'Empty board. Build your own rankings from zero.',
    },
  ],
  golf: [
    {
      value: 'clutch',
      label: 'Clutch Rankings',
      recommended: true,
      description: 'DataGolf skill estimates + Clutch metrics (CPI, Form Score). The smart default.',
    },
    {
      value: 'previous',
      label: 'My Previous Board',
      description: 'Copy your most recent golf board.',
    },
    {
      value: 'scratch',
      label: 'Start from Scratch',
      description: 'Empty board. Rank players yourself.',
    },
  ],
}

export default function DraftBoards() {
  const { boards, loading, error, createBoard, deleteBoard } = useDraftBoards()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(1) // 1: name+sport, 2: start from
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('nfl')
  const [newScoring, setNewScoring] = useState('ppr')
  const [startFrom, setStartFrom] = useState('clutch')
  const [creating, setCreating] = useState(false)

  const openCreateModal = () => {
    setShowCreate(true)
    setStep(1)
    setNewName('')
    setNewSport('nfl')
    setNewScoring('ppr')
    setStartFrom('clutch')
  }

  const handleNext = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setStep(2)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const board = await createBoard({
        name: newName.trim(),
        sport: newSport,
        scoringFormat: newSport === 'nfl' ? newScoring : 'overall',
        startFrom,
      })
      setShowCreate(false)
      // Navigate to the new board
      if (board?.id) navigate(`/workspace/${board.id}`)
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

  const startFromOptions = START_FROM_OPTIONS[newSport] || START_FROM_OPTIONS.nfl

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Workspace</h1>
          <p className="text-sm text-white/40 mt-1">Personal draft boards, rankings & scouting notes</p>
        </div>
        <button
          onClick={openCreateModal}
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
            onClick={openCreateModal}
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
            className="relative w-full max-w-lg bg-dark-secondary border border-white/[0.08] rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {step === 1 ? 'New Draft Board' : 'Choose Starting Point'}
                </h2>
                {step === 2 && (
                  <p className="text-xs text-white/40 mt-0.5">You'll customize from here — this is just your starting position</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-gold' : 'bg-white/10'}`} />
              </div>
            </div>

            {/* Step 1: Name + Sport + Scoring */}
            {step === 1 && (
              <form onSubmit={handleNext} className="p-5 space-y-4">
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

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Sport</label>
                  <div className="flex gap-2">
                    {SPORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setNewSport(opt.value)
                          setStartFrom('clutch') // reset startFrom when sport changes
                        }}
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
                    disabled={!newName.trim()}
                    className="px-5 py-2 text-sm font-semibold bg-gold text-dark-primary rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Start From */}
            {step === 2 && (
              <div className="p-5">
                <div className="space-y-2 mb-5">
                  {startFromOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStartFrom(opt.value)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                        startFrom === opt.value
                          ? 'border-gold/50 bg-gold/[0.07]'
                          : 'border-white/[0.06] bg-dark-primary/50 hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          startFrom === opt.value ? 'border-gold' : 'border-white/20'
                        }`}>
                          {startFrom === opt.value && (
                            <div className="w-2 h-2 rounded-full bg-gold" />
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${startFrom === opt.value ? 'text-gold' : 'text-white'}`}>
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-gold/20 text-gold rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 ml-6">{opt.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-5 py-2 text-sm font-semibold bg-gold text-dark-primary rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Board'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
