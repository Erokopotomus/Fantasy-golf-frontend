import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useDraftBoards from '../hooks/useDraftBoards'
import api from '../services/api'
import CaptureFormModal from '../components/lab/CaptureFormModal'
import LabRatingCard from '../components/lab/LabRatingCard'

// ── Constants ──────────────────────────────────────────────────────────────────

const SPORT_OPTIONS = [
  { value: 'nfl', label: 'NFL', icon: '🏈' },
  { value: 'golf', label: 'Golf', icon: '⛳' },
]

const SCORING_OPTIONS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
]

const LEAGUE_TYPE_OPTIONS = [
  { value: 'redraft', label: 'Redraft' },
  { value: 'keeper', label: 'Keeper' },
  { value: 'dynasty', label: 'Dynasty' },
  { value: 'bestball', label: 'Best Ball' },
]

const TEAM_COUNT_OPTIONS = [8, 10, 12, 14]

const DRAFT_TYPE_OPTIONS = [
  { value: 'snake', label: 'Snake' },
  { value: 'auction', label: 'Auction' },
  { value: 'linear', label: 'Linear' },
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function boardStatusCTA(board, cheatSheetId) {
  if (board.isPublished) return { label: 'Published', color: 'text-text-primary/30', dot: 'bg-dark-tertiary/20' }
  if (board.playerCount === 0) return { label: 'Start Ranking →', color: 'text-gold', dot: null }
  if (cheatSheetId) return { label: 'View Cheat Sheet', color: 'text-emerald-400', dot: 'bg-emerald-400', link: `/lab/cheatsheet/${cheatSheetId}` }
  if (board.sport === 'nfl' && board.positionCoverage && board.positionCoverage.covered >= board.positionCoverage.total) {
    return { label: 'Generate Cheat Sheet →', color: 'text-gold', dot: 'bg-emerald-400', generateSheet: true }
  }
  return { label: 'Continue', color: 'text-gold/70', dot: 'bg-gold/50' }
}

function scoringLabel(fmt) {
  if (fmt === 'ppr') return 'PPR'
  if (fmt === 'half_ppr') return 'Half PPR'
  if (fmt === 'standard') return 'Std'
  return fmt
}

// ── Action Description for Journal ───────────────────────────────────────────

function activityDescription(a) {
  const name = a.details?.playerName || 'Player'
  switch (a.action) {
    case 'player_moved': {
      const delta = a.details?.delta
      return `Moved ${name} ${delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`}`
    }
    case 'player_added': return `Added ${name}`
    case 'player_removed': return `Removed ${name}`
    case 'player_tagged': return `Tagged ${name}`
    case 'note_added': return `Note on ${name}`
    case 'board_created': return `Created board`
    default: return a.action
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DraftBoards() {
  const { boards, loading, error, createBoard, deleteBoard } = useDraftBoards()
  const navigate = useNavigate()

  // Hub data
  const [journalEntries, setJournalEntries] = useState([])
  const [watchListEntries, setWatchListEntries] = useState([])
  const [recentCaptures, setRecentCaptures] = useState([])
  const [dynamicInsight, setDynamicInsight] = useState(null)
  const [insightDismissed, setInsightDismissed] = useState(false)
  const [aiInsights, setAiInsights] = useState([])
  const [aiDismissed, setAiDismissed] = useState(new Set())
  const [hubLoading, setHubLoading] = useState(true)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [cheatSheetMap, setCheatSheetMap] = useState({}) // boardId → sheetId
  const [aiReports, setAiReports] = useState([])
  const [generatingReport, setGeneratingReport] = useState(null)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(1) // 1: name+sport+scoring, 2: league context, 3: start from
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('nfl')
  const [newScoring, setNewScoring] = useState('ppr')
  const [leagueType, setLeagueType] = useState(null)
  const [teamCount, setTeamCount] = useState(null)
  const [draftType, setDraftType] = useState(null)
  const [startFrom, setStartFrom] = useState('clutch')
  const [creating, setCreating] = useState(false)

  // Fetch hub data once boards are loaded
  useEffect(() => {
    if (loading) return
    if (boards.length === 0) { setHubLoading(false); return }
    let cancelled = false
    Promise.all([
      api.getDecisionJournal({ limit: 5 }).catch(() => ({ activities: [] })),
      api.getWatchList().catch(() => ({ entries: [] })),
      api.getRecentCaptures(5).catch(() => ({ captures: [] })),
      api.getLabInsight().catch(() => ({ insight: null })),
      api.getAiInsights().catch(() => ({ insights: [] })),
      api.getAiReports().catch(() => ({ reports: [] })),
    ]).then(([journal, watchList, capturesRes, insightRes, aiRes, reportsRes]) => {
      if (cancelled) return
      setJournalEntries(journal.activities || [])
      setWatchListEntries(watchList.entries || [])
      setRecentCaptures(capturesRes.captures || [])
      if (insightRes.insight) setDynamicInsight(insightRes.insight)
      setAiInsights((aiRes.insights || []).slice(0, 3))
      setAiReports((reportsRes.reports || []).slice(0, 3))
      setHubLoading(false)
    })
    // Check for cheat sheets per board
    for (const board of boards) {
      api.getCheatSheetByBoard(board.id).then(res => {
        if (res.sheet && !cancelled) {
          setCheatSheetMap(prev => ({ ...prev, [board.id]: res.sheet.id }))
        }
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [loading, boards.length])

  const openCreateModal = () => {
    setShowCreate(true)
    setStep(1)
    setNewName('')
    setNewSport('nfl')
    setNewScoring('ppr')
    setLeagueType(null)
    setTeamCount(null)
    setDraftType(null)
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
        leagueType: leagueType || undefined,
        teamCount: teamCount || undefined,
        draftType: draftType || undefined,
      })
      setShowCreate(false)
      if (board?.id) navigate(`/lab/${board.id}`)
    } catch (err) {
      console.error('Create board failed:', err)
    } finally {
      setCreating(false)
    }
  }

  const startFromOptions = START_FROM_OPTIONS[newSport] || START_FROM_OPTIONS.nfl

  // ── Empty State ──────────────────────────────────────────────────────────
  if (!loading && !error && boards.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          {/* Lab flask icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gold/20 to-orange/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary mb-2">Welcome to The Lab</h1>
          <p className="text-sm text-text-primary/40 max-w-md mx-auto mb-8">
            Build custom draft boards, rank players your way, track your decisions, and develop a draft thesis that gives you an edge.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-gold text-slate text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Board
            </button>
            <Link
              to="/mock-draft"
              className="px-6 py-3 border border-stone/30 text-text-primary/50 text-sm font-medium rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
            >
              Or start with a Mock Draft
            </Link>
          </div>
        </div>

        {/* Create modal */}
        {showCreate && <CreateModal {...createModalProps()} />}
      </div>
    )
  }

  // Helper to build create modal props
  function createModalProps() {
    return {
      step, setStep, newName, setNewName, newSport, setNewSport, newScoring, setNewScoring,
      leagueType, setLeagueType, teamCount, setTeamCount, draftType, setDraftType,
      startFrom, setStartFrom, startFromOptions, creating,
      onClose: () => setShowCreate(false), onNext: handleNext, onCreate: handleCreate,
    }
  }

  // ── Cheat sheet generation handler ──────────────────────────────────────
  const handleGenerateCheatSheet = async (boardId) => {
    try {
      const res = await api.generateCheatSheet(boardId)
      if (res.sheet?.id) {
        setCheatSheetMap(prev => ({ ...prev, [boardId]: res.sheet.id }))
        navigate(`/lab/cheatsheet/${res.sheet.id}`)
      }
    } catch (err) {
      console.error('Generate cheat sheet failed:', err)
    }
  }

  // ── Full Hub Layout ──────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
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

      {!loading && !error && (
        <>
          {/* 1. Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary tracking-wide">THE LAB</h1>
              <p className="text-sm text-text-primary/40 mt-0.5">Where your draft thesis takes shape.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-gold text-slate text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Board
            </button>
          </div>

          {/* 2. AI Insight Bar (dynamic from backend) */}
          {dynamicInsight && !insightDismissed && (
            <div className="mb-6 p-3.5 bg-gradient-to-r from-gold/[0.07] to-orange/[0.04] border border-gold/15 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <p className="text-sm text-text-primary/60 flex-1">{dynamicInsight.text}</p>
              <button
                onClick={() => { setInsightDismissed(true); api.dismissLabInsight().catch(() => {}) }}
                className="text-text-primary/20 hover:text-text-primary/50 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* 2b. AI Coach Insights (from Claude) */}
          {aiInsights.filter(i => !aiDismissed.has(i.id)).length > 0 && (
            <div className="mb-6 space-y-2">
              {aiInsights.filter(i => !aiDismissed.has(i.id)).map(insight => (
                <div key={insight.id} className="p-3 bg-gradient-to-r from-purple-500/[0.06] to-gold/[0.04] border border-purple-400/15 rounded-xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-300/80 mb-0.5">{insight.title}</p>
                    <p className="text-xs text-text-primary/50 leading-relaxed">{insight.body}</p>
                  </div>
                  <button
                    onClick={() => { setAiDismissed(prev => new Set([...prev, insight.id])); api.dismissAiInsight(insight.id).catch(() => {}) }}
                    className="text-text-primary/20 hover:text-text-primary/50 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 2c. Lab ↔ Rating Bridge Card */}
          <div className="mb-6">
            <LabRatingCard />
          </div>

          {/* 3. Two-column: Readiness Tracker + Recent Captures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Draft Readiness Tracker */}
            <div className="p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">Draft Readiness</h3>
              <div className="space-y-2">
                {boards.slice(0, 5).map(board => {
                  const status = boardStatusCTA(board)
                  return (
                    <Link
                      key={board.id}
                      to={`/lab/${board.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-tertiary/[0.02] hover:bg-dark-tertiary/[0.05] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot || 'bg-transparent'}`} />
                        <span className="text-sm text-text-primary truncate group-hover:text-gold transition-colors">{board.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          board.sport === 'nfl' ? 'bg-orange/20 text-orange' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {board.sport}
                        </span>
                      </div>
                      <span className={`text-[11px] font-medium ${status.color}`}>{status.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Recent Captures */}
            <div className="p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Recent Captures</h3>
                <Link to="/lab/captures" className="text-[10px] text-gold hover:underline">View All</Link>
              </div>
              {hubLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-7 bg-dark-tertiary/[0.03] rounded animate-pulse" />)}
                </div>
              ) : recentCaptures.length === 0 ? (
                <p className="text-xs text-text-primary/25 py-3">No captures yet — jot down podcast takes and gut feelings.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentCaptures.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-start justify-between text-xs py-1 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary/50 truncate">{c.content}</p>
                        {c.players && c.players.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {c.players.slice(0, 3).map(lp => (
                              <span key={lp.id} className="px-1 py-0.5 rounded text-[9px] bg-gold/10 text-gold/60">
                                {lp.player?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.sentiment === 'bullish' && <span className="text-emerald-400 text-[10px]">↑</span>}
                        {c.sentiment === 'bearish' && <span className="text-red-400 text-[10px]">↓</span>}
                        <span className="text-text-primary/20">{relativeTime(c.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowCaptureModal(true)}
                className="mt-3 w-full py-1.5 text-xs text-gold/50 hover:text-gold border border-gold/10 hover:border-gold/30 rounded-lg transition-colors"
              >
                + Quick Note
              </button>
            </div>
          </div>

          {/* 4. My Boards — Enhanced Cards */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">My Boards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map(board => {
                const status = boardStatusCTA(board, cheatSheetMap[board.id])
                return (
                  <Link
                    key={board.id}
                    to={status.link || `/lab/${board.id}`}
                    className="block p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl hover:border-gold/30 hover:bg-dark-secondary/80 transition-all group"
                  >
                    {/* Top row: Name + sport badge */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-gold transition-colors truncate">
                        {board.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ml-2 ${
                        board.sport === 'nfl' ? 'bg-orange/20 text-orange' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {board.sport}
                      </span>
                    </div>

                    {/* League context pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {board.sport === 'nfl' && (
                        <span className="px-1.5 py-0.5 bg-dark-tertiary/[0.04] rounded text-[10px] text-text-primary/40">
                          {scoringLabel(board.scoringFormat)}
                        </span>
                      )}
                      {board.leagueType && (
                        <span className="px-1.5 py-0.5 bg-dark-tertiary/[0.04] rounded text-[10px] text-text-primary/40 capitalize">
                          {board.leagueType}
                        </span>
                      )}
                      {board.teamCount && (
                        <span className="px-1.5 py-0.5 bg-dark-tertiary/[0.04] rounded text-[10px] text-text-primary/40">
                          {board.teamCount}-team
                        </span>
                      )}
                      {board.draftType && (
                        <span className="px-1.5 py-0.5 bg-dark-tertiary/[0.04] rounded text-[10px] text-text-primary/40 capitalize">
                          {board.draftType}
                        </span>
                      )}
                    </div>

                    {/* Position coverage for NFL */}
                    {board.sport === 'nfl' && board.positionCoverage && (
                      <div className="flex gap-1.5 mb-3">
                        {['QB', 'RB', 'WR', 'TE'].map(pos => {
                          const count = board.positionCoverage.positions[pos] || 0
                          return (
                            <span
                              key={pos}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                count > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-tertiary/[0.03] text-text-primary/20'
                              }`}
                            >
                              {pos} {count}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Rating connection badge */}
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-300/60 border border-purple-400/10">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Feeds Draft IQ
                      </span>
                    </div>

                    {/* Bottom row: count + time + status */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 text-text-primary/30">
                        <span>{board.playerCount} player{board.playerCount !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{relativeTime(board.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {status.dot && <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />}
                        {status.generateSheet ? (
                          <span
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerateCheatSheet(board.id) }}
                            className={`font-medium cursor-pointer ${status.color}`}
                          >
                            {status.label}
                          </span>
                        ) : (
                          <span className={`font-medium ${status.color}`}>{status.label}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 5. Watch List Summary */}
          {!hubLoading && watchListEntries.length > 0 && (
            <div className="mb-6 p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Watch List</h3>
                <Link to="/lab/watch-list" className="text-[10px] text-gold hover:underline">View All</Link>
              </div>
              <div className="flex gap-3">
                {watchListEntries.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-dark-tertiary/[0.03] rounded-lg">
                    {e.player?.headshotUrl && (
                      <img src={e.player.headshotUrl} alt="" className="w-6 h-6 rounded-full bg-dark-tertiary/5" />
                    )}
                    <span className="text-xs text-text-primary/70">{e.player?.name || 'Unknown'}</span>
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
                      e.sport === 'nfl' ? 'bg-orange/20 text-orange' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {e.sport}
                    </span>
                  </div>
                ))}
                {watchListEntries.length > 3 && (
                  <Link to="/lab/watch-list" className="flex items-center px-3 py-2 text-xs text-text-primary/30 hover:text-gold transition-colors">
                    +{watchListEntries.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 6. Decision Journal Summary */}
          {!hubLoading && journalEntries.length > 0 && (
            <div className="p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Decision Journal</h3>
                <Link to="/lab/journal" className="text-[10px] text-gold hover:underline">View All</Link>
              </div>
              <div className="space-y-1.5">
                {journalEntries.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="text-text-primary/50">{activityDescription(a)}</span>
                    <span className="text-text-primary/20 shrink-0 ml-2">{relativeTime(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Coaching Reports */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/[0.04] to-gold/[0.03] border border-purple-400/10 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300/60">Coaching Reports</h3>
              </div>
            </div>

            {/* Generate buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {['pre_draft', 'mid_season', 'post_season'].map(type => {
                const labels = { pre_draft: 'Pre-Draft', mid_season: 'Mid-Season', post_season: 'Season Retro' }
                return (
                  <button
                    key={type}
                    disabled={!!generatingReport}
                    onClick={async () => {
                      setGeneratingReport(type)
                      try {
                        const fn = type === 'pre_draft' ? api.generatePreDraftReport
                          : type === 'mid_season' ? api.generateMidSeasonReport
                          : api.generatePostSeasonReport
                        const res = await fn('nfl')
                        if (res.report?.id) {
                          navigate(`/coach/${res.report.id}`)
                        }
                      } catch {}
                      setGeneratingReport(null)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-300 border border-purple-400/20 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                  >
                    {generatingReport === type ? 'Generating...' : `Generate ${labels[type]}`}
                  </button>
                )
              })}
            </div>

            {/* Previous reports */}
            {aiReports.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-text-primary/25 uppercase tracking-wider">Previous Reports</p>
                {aiReports.map(r => (
                  <Link
                    key={r.id}
                    to={`/coach/${r.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-tertiary/[0.02] hover:bg-dark-tertiary/[0.05] transition-colors group text-xs"
                  >
                    <span className="text-text-primary/60 group-hover:text-gold transition-colors">
                      {r.reportType === 'pre_draft' ? 'Pre-Draft' : r.reportType === 'mid_season' ? 'Mid-Season' : r.reportType === 'post_season' ? 'Season Retro' : 'Scout'}
                      {r.sport && <span className="text-text-primary/30 ml-1">({r.sport.toUpperCase()})</span>}
                    </span>
                    <span className="text-text-primary/20">{new Date(r.generatedAt).toLocaleDateString()}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Sim link */}
            <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
              <Link to="/sim" className="flex items-center gap-2 text-xs text-gold hover:text-gold/80 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Clutch Sim — Head-to-Head Matchup Simulator
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Create modal */}
      {showCreate && <CreateModal {...createModalProps()} />}

      {/* Capture modal */}
      {showCaptureModal && (
        <CaptureFormModal
          onClose={() => setShowCaptureModal(false)}
          onSuccess={() => {
            api.getRecentCaptures(5).then(res => setRecentCaptures(res.captures || [])).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

// ── Create Modal Component ───────────────────────────────────────────────────

function CreateModal({
  step, setStep, newName, setNewName, newSport, setNewSport, newScoring, setNewScoring,
  leagueType, setLeagueType, teamCount, setTeamCount, draftType, setDraftType,
  startFrom, setStartFrom, startFromOptions, creating,
  onClose, onNext, onCreate,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-dark-secondary border border-[var(--card-border)] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {step === 1 ? 'New Draft Board' : step === 2 ? 'League Context' : 'Choose Starting Point'}
            </h2>
            {step === 2 && (
              <p className="text-xs text-text-primary/40 mt-0.5">Optional — helps tailor your board experience</p>
            )}
            {step === 3 && (
              <p className="text-xs text-text-primary/40 mt-0.5">You'll customize from here — this is just your starting position</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-gold' : 'bg-dark-tertiary/10'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-gold' : 'bg-dark-tertiary/10'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-gold' : 'bg-dark-tertiary/10'}`} />
          </div>
        </div>

        {/* Step 1: Name + Sport + Scoring */}
        {step === 1 && (
          <form onSubmit={onNext} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-primary/50 mb-1.5">Board Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., 2026 NFL Big Board"
                className="w-full px-3 py-2 text-sm bg-dark-primary border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary/50 mb-1.5">Sport</label>
              <div className="flex gap-2">
                {SPORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setNewSport(opt.value)
                      setStartFrom('clutch')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                      newSport === opt.value
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-[var(--card-border)] bg-dark-primary text-text-primary/50 hover:text-text-primary/70'
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
                <label className="block text-xs font-medium text-text-primary/50 mb-1.5">Scoring Format</label>
                <select
                  value={newScoring}
                  onChange={e => setNewScoring(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dark-primary border border-[var(--card-border)] rounded-lg text-text-primary outline-none focus:border-gold/50 cursor-pointer"
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
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-primary/50 hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-5 py-2 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: League Context (NEW) */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-primary/50 mb-2">League Type</label>
              <div className="flex flex-wrap gap-2">
                {LEAGUE_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLeagueType(leagueType === opt.value ? null : opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      leagueType === opt.value
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-[var(--card-border)] bg-dark-primary text-text-primary/40 hover:text-text-primary/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary/50 mb-2">Team Count</label>
              <div className="flex gap-2">
                {TEAM_COUNT_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTeamCount(teamCount === n ? null : n)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      teamCount === n
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-[var(--card-border)] bg-dark-primary text-text-primary/40 hover:text-text-primary/60'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary/50 mb-2">Draft Type</label>
              <div className="flex gap-2">
                {DRAFT_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftType(draftType === opt.value ? null : opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      draftType === opt.value
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-[var(--card-border)] bg-dark-primary text-text-primary/40 hover:text-text-primary/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-text-primary/50 hover:text-text-primary transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-text-primary/40 hover:text-text-primary/60 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-1.5"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Start From */}
        {step === 3 && (
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
                      : 'border-[var(--card-border)] bg-dark-primary/50 hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      startFrom === opt.value ? 'border-gold' : 'border-stone/50'
                    }`}>
                      {startFrom === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-gold" />
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${startFrom === opt.value ? 'text-gold' : 'text-text-primary'}`}>
                      {opt.label}
                    </span>
                    {opt.recommended && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-gold/20 text-gold rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-primary/40 ml-6">{opt.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-text-primary/50 hover:text-text-primary transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={onCreate}
                disabled={creating}
                className="px-5 py-2 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
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
  )
}
