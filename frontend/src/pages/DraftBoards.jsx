import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useDraftBoards from '../hooks/useDraftBoards'
import api from '../services/api'
import CaptureFormModal from '../components/lab/CaptureFormModal'
import LeagueCockpit from '../components/lab/LeagueCockpit'
import LabNeuralCluster from '../components/lab/LabNeuralCluster'

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
  if (board.isPublished) return { label: 'Published', color: 'text-text-primary/30', dot: 'bg-[var(--stone)]' }
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

// ── Component ────────────────────────────────────────────────────────────────

export default function DraftBoards() {
  const { boards, loading, error, createBoard, deleteBoard, refetch } = useDraftBoards()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Hub data
  const [leagues, setLeagues] = useState([])
  const [watchListEntries, setWatchListEntries] = useState([])
  const [recentCaptures, setRecentCaptures] = useState([])
  const [hubLoading, setHubLoading] = useState(true)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [cheatSheetMap, setCheatSheetMap] = useState({})
  const [weeklyIntel, setWeeklyIntel] = useState(null)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(1) // 1: name+sport+scoring, 2: league context, 3: start from
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('nfl')
  const [newScoring, setNewScoring] = useState('ppr')
  const [leagueType, setLeagueType] = useState(null)
  const [teamCount, setTeamCount] = useState(null)
  const [draftType, setDraftType] = useState(null)
  const [newLeagueId, setNewLeagueId] = useState(null)
  const [startFrom, setStartFrom] = useState('clutch')
  const [creating, setCreating] = useState(false)

  // Derive currentTournament for LeagueCockpit
  const currentTournament = weeklyIntel?.tournament ? {
    status: weeklyIntel.tournament.isLive ? 'IN_PROGRESS' : 'UPCOMING',
    name: weeklyIntel.tournament.name,
  } : undefined

  // Pre-fill create modal from URL params (league → Lab bridge)
  useEffect(() => {
    const sport = searchParams.get('sport')
    const leagueName = searchParams.get('leagueName')
    const urlLeagueId = searchParams.get('leagueId')
    if (!sport && !leagueName && !urlLeagueId) return

    if (sport) setNewSport(sport.toLowerCase() === 'nfl' ? 'nfl' : 'golf')
    if (leagueName) setNewName(`${leagueName} Draft Board`)
    if (urlLeagueId) setNewLeagueId(urlLeagueId)

    const tc = searchParams.get('teamCount')
    if (tc) setTeamCount(parseInt(tc, 10) || null)

    const dt = searchParams.get('draftType')
    if (dt) setDraftType(dt)

    const scoring = searchParams.get('scoring')
    if (scoring) setNewScoring(scoring)

    setShowCreate(true)
    setStep(1)
    // Clear params so they don't persist on reload
    setSearchParams({}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch leagues once
  useEffect(() => {
    api.getLeagues()
      .then(data => setLeagues(data.leagues || []))
      .catch(() => {})
  }, [])

  // Fetch hub data once boards are loaded
  useEffect(() => {
    if (loading) return
    if (boards.length === 0) { setHubLoading(false); return }
    let cancelled = false
    Promise.all([
      api.getWatchList().catch(() => ({ entries: [] })),
      api.getRecentCaptures(5).catch(() => ({ captures: [] })),
      api.getLabWeekly().catch(() => ({ week: null })),
    ]).then(([watchList, capturesRes, weeklyRes]) => {
      if (cancelled) return
      setWatchListEntries(watchList.entries || [])
      setRecentCaptures(capturesRes.captures || [])
      if (weeklyRes.week) setWeeklyIntel(weeklyRes.week)
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
    setNewLeagueId(null)
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
        leagueId: newLeagueId || undefined,
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
        <div className="text-center py-12">
          {/* Lab flask icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gold/20 to-orange/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary mb-2">Start your draft prep here.</h1>
          <p className="text-sm text-text-primary/40 max-w-md mx-auto mb-8">
            Build a draft board to rank players your way. When you join a league, link your board to get league-specific insights.
          </p>

          {/* 2 action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            <button
              onClick={openCreateModal}
              className="p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl hover:border-gold/30 transition-colors text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gold/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text-primary mb-0.5">Build a Board</p>
              <p className="text-[10px] text-text-primary/30">Rank players your way</p>
            </button>
            <Link
              to="/leagues"
              className="p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl hover:border-gold/30 transition-colors text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text-primary mb-0.5">Browse Leagues</p>
              <p className="text-[10px] text-text-primary/30">Find a league to join</p>
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
      newLeagueId, setNewLeagueId, leagues,
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

  // ── Section Renderers ────────────────────────────────────────────────────

  const renderMyBoards = () => (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">My Boards</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map(board => {
          const status = boardStatusCTA(board, cheatSheetMap[board.id])
          return (
            <Link
              key={board.id}
              to={status.link || `/lab/${board.id}`}
              className="block p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl hover:border-gold/30 hover:bg-[var(--surface-alt)] transition-all group"
            >
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
              <div className="flex flex-wrap gap-1.5 mb-3">
                {board.leagueName && (
                  <span className="px-1.5 py-0.5 bg-[var(--crown)]/10 rounded text-[10px] text-[var(--crown)] font-medium truncate max-w-[140px]">
                    {board.leagueName}
                  </span>
                )}
                {board.sport === 'nfl' && (
                  <span className="px-1.5 py-0.5 bg-[var(--bg-alt)] rounded text-[10px] text-text-primary/40">
                    {scoringLabel(board.scoringFormat)}
                  </span>
                )}
                {board.leagueType && (
                  <span className="px-1.5 py-0.5 bg-[var(--bg-alt)] rounded text-[10px] text-text-primary/40 capitalize">
                    {board.leagueType}
                  </span>
                )}
                {board.teamCount && (
                  <span className="px-1.5 py-0.5 bg-[var(--bg-alt)] rounded text-[10px] text-text-primary/40">
                    {board.teamCount}-team
                  </span>
                )}
                {board.draftType && (
                  <span className="px-1.5 py-0.5 bg-[var(--bg-alt)] rounded text-[10px] text-text-primary/40 capitalize">
                    {board.draftType}
                  </span>
                )}
              </div>
              {board.sport === 'nfl' && board.positionCoverage && (
                <div className="flex gap-1.5 mb-3">
                  {['QB', 'RB', 'WR', 'TE'].map(pos => {
                    const count = board.positionCoverage.positions[pos] || 0
                    return (
                      <span
                        key={pos}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          count > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--bg-alt)] text-text-primary/20'
                        }`}
                      >
                        {pos} {count}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-300/60 border border-purple-400/10">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Feeds Draft IQ
                </span>
              </div>
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
  )

  const renderWatchList = () => (
    !hubLoading && watchListEntries.length > 0 && (
      <div className="mb-6 p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Watch List</h3>
          <Link to="/lab/watch-list" className="text-[10px] text-gold hover:underline">View All</Link>
        </div>
        <div className="flex gap-3">
          {watchListEntries.slice(0, 3).map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-alt)] rounded-lg">
              {e.player?.headshotUrl && (
                <img src={e.player.headshotUrl} alt="" className="w-6 h-6 rounded-full bg-[var(--stone)]" />
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
    )
  )

  const renderCaptures = () => (
    <div className="mb-6 p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Recent Notes</h3>
        <Link to="/lab/captures" className="text-[10px] text-gold hover:underline">View All</Link>
      </div>
      {hubLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-7 bg-[var(--stone)] rounded animate-pulse" />)}
        </div>
      ) : recentCaptures.length === 0 ? (
        <p className="text-xs text-text-primary/25 py-3">No notes yet — jot down podcast takes and gut feelings.</p>
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
  )

  // ── Hero Banner ────────────────────────────────────────────────────────────
  const renderBanner = () => (
    <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-[var(--surface)] via-[var(--surface)] to-[var(--bg-alt)] border border-[var(--card-border)] shadow-card">
      <div className="flex items-center px-6 py-5 gap-4 sm:gap-6">
        {/* Neural Cluster — left accent */}
        <div className="flex-shrink-0 hidden sm:block">
          <LabNeuralCluster className="w-20 h-20 opacity-70" />
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-text-primary tracking-wide mb-1">THE LAB</h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-md">
            Your draft prep workbench. Build boards to rank players your way, capture notes and hot takes, then link everything to your leagues.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-gold text-slate text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Board
            </button>
            <button
              onClick={() => setShowCaptureModal(true)}
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-[var(--card-border)] rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
            >
              Quick Note
            </button>
          </div>
        </div>

        {/* Neural Cluster — larger on right */}
        <div className="flex-shrink-0 hidden md:block">
          <LabNeuralCluster className="w-32 h-32 opacity-80" />
        </div>
      </div>
    </div>
  )

  // ── Full Layout ────────────────────────────────────────────────────────────
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
          {/* Hero Banner */}
          {renderBanner()}

          {/* Split Layout: Boards left, Notes right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Left: Boards (3/5 width) */}
            <div className="lg:col-span-3">
              {renderMyBoards()}
            </div>

            {/* Right: Notes + Watch List (2/5 width) */}
            <div className="lg:col-span-2 space-y-6">
              {renderCaptures()}
              {renderWatchList()}
            </div>
          </div>

          {/* Leagues below */}
          <LeagueCockpit leagues={leagues} boards={boards} currentTournament={currentTournament} onBoardLinked={refetch} />
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
  newLeagueId, setNewLeagueId, leagues = [],
  startFrom, setStartFrom, startFromOptions, creating,
  onClose, onNext, onCreate,
}) {
  // Filter leagues matching selected sport
  const sportLeagues = leagues.filter(l => {
    const ls = (l.sport || l.sportRef?.slug || 'golf').toLowerCase()
    return ls === newSport
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-2xl"
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
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-gold' : 'bg-[var(--stone)]'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-gold' : 'bg-[var(--stone)]'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-gold' : 'bg-[var(--stone)]'}`} />
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
                className="w-full px-3 py-2 text-sm bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50"
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
                        : 'border-[var(--card-border)] bg-[var(--bg-alt)] text-text-primary/50 hover:text-text-primary/70'
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
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary outline-none focus:border-gold/50 cursor-pointer"
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

        {/* Step 2: League Context */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            {sportLeagues.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-primary/50 mb-2">Link to League</label>
                <select
                  value={newLeagueId || ''}
                  onChange={e => setNewLeagueId(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary outline-none focus:border-gold/50 cursor-pointer"
                >
                  <option value="">None (standalone board)</option>
                  {sportLeagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-text-primary/30 mt-1">Linking a board makes it show up on the league's cockpit card</p>
              </div>
            )}

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
                        : 'border-[var(--card-border)] bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
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
                        : 'border-[var(--card-border)] bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
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
                        : 'border-[var(--card-border)] bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
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
                      : 'border-[var(--card-border)] bg-[var(--bg-alt)]/50 hover:border-white/[0.12]'
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
