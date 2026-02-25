import { useState, Fragment, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import useDraftBoardEditor from '../hooks/useDraftBoardEditor'
import useWatchList from '../hooks/useWatchList'
import useBoardReadiness from '../hooks/useBoardReadiness'
import api from '../services/api'
import BoardHeader from '../components/workspace/BoardHeader'
import BoardEntryRow from '../components/workspace/BoardEntryRow'
import TierBreak from '../components/workspace/TierBreak'
import PlayerSearchPanel from '../components/workspace/PlayerSearchPanel'
import PlayerNoteEditor from '../components/workspace/PlayerNoteEditor'
import DivergenceSummary from '../components/workspace/DivergenceSummary'
import BoardTimeline from '../components/workspace/BoardTimeline'
import BoardWelcomeCard from '../components/workspace/BoardWelcomeCard'
import BoardProgressTracker from '../components/workspace/BoardProgressTracker'
import BoardInsightsPanel from '../components/workspace/BoardInsightsPanel'
import PlayerDrawer from '../components/players/PlayerDrawer'

// ── Reason Chip Definitions ──────────────────────────────────────────────────

const REASON_CHIPS = [
  { id: 'schedule_upgrade', label: 'Schedule \u2191', category: 'positive' },
  { id: 'volume_increase', label: 'Volume \u2191', category: 'positive' },
  { id: 'less_competition', label: 'Less Competition', category: 'positive' },
  { id: 'contract_year', label: 'Contract Year', category: 'positive' },
  { id: 'oline_upgrade', label: 'O-Line \u2191', category: 'positive' },
  { id: 'target_share_up', label: 'Target Share \u2191', category: 'positive' },
  { id: 'breakout', label: 'Breakout', category: 'positive' },
  { id: 'game_script_up', label: 'Game Script \u2191', category: 'positive' },
  { id: 'age_decline', label: 'Age Decline', category: 'negative' },
  { id: 'injury_risk', label: 'Injury Risk', category: 'negative' },
  { id: 'more_competition', label: 'More Competition', category: 'negative' },
  { id: 'schedule_downgrade', label: 'Schedule \u2193', category: 'negative' },
  { id: 'oline_downgrade', label: 'O-Line \u2193', category: 'negative' },
  { id: 'regression', label: 'Regression', category: 'negative' },
  { id: 'scheme_downgrade', label: 'Scheme \u2193', category: 'negative' },
  { id: 'gut_feel', label: 'Gut Feel', category: 'source' },
  { id: 'podcast_show', label: 'Podcast/Show', category: 'source' },
  { id: 'article', label: 'Article', category: 'source' },
  { id: 'game_film', label: 'Game Film', category: 'source' },
  { id: 'stat_model', label: 'Stat Model', category: 'source' },
]

const CHIP_STYLES = {
  positive: { active: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40', inactive: 'border-emerald-200 dark:border-emerald-500/20 text-emerald-600/40 dark:text-emerald-500/40 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400' },
  negative: { active: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40', inactive: 'border-red-200 dark:border-red-500/20 text-red-600/40 dark:text-red-500/40 hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400' },
  source:   { active: 'bg-[var(--bg-alt)] text-[var(--text-1)]/80 border-[var(--stone)]/60', inactive: 'border-[var(--stone)]/40 text-[var(--text-1)]/30 hover:border-[var(--stone)]/60 hover:text-[var(--text-1)]/50' },
}

// ── Filter Bars ──────────────────────────────────────────────────────────────

function TagFilterBar({ entries, activeFilter, onFilterChange }) {
  const counts = { target: 0, sleeper: 0, avoid: 0, untagged: 0 }
  for (const e of entries) {
    const tags = e.tags || []
    if (tags.includes('target')) counts.target++
    else if (tags.includes('sleeper')) counts.sleeper++
    else if (tags.includes('avoid')) counts.avoid++
    else counts.untagged++
  }

  const filters = [
    { key: 'all', label: 'All', count: entries.length, style: 'text-[var(--text-1)]/60 border-[var(--stone)]/40 hover:border-[var(--stone)]/60' },
    { key: 'target', label: 'Targets', count: counts.target, style: 'text-emerald-600/70 dark:text-emerald-400/70 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40' },
    { key: 'sleeper', label: 'Sleepers', count: counts.sleeper, style: 'text-amber-600/70 dark:text-gold/70 border-amber-200 dark:border-gold/20 hover:border-amber-300 dark:hover:border-gold/40' },
    { key: 'avoid', label: 'Avoids', count: counts.avoid, style: 'text-red-600/70 dark:text-red-400/70 border-red-200 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40' },
    { key: 'untagged', label: 'Untagged', count: counts.untagged, style: 'text-[var(--text-1)]/40 border-[var(--stone)]/40 hover:border-[var(--stone)]/60' },
  ]

  const activeStyles = {
    all: 'bg-[var(--stone)]/30 dark:bg-[var(--stone)] text-[var(--text-1)] border-[var(--stone)]/60 dark:border-white/25',
    target: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40',
    sleeper: 'bg-amber-100 dark:bg-gold/15 text-amber-700 dark:text-gold border-amber-300 dark:border-gold/40',
    avoid: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40',
    untagged: 'bg-[var(--stone)]/30 dark:bg-[var(--stone)] text-[var(--text-1)]/60 border-[var(--stone)]/60 dark:border-stone/50',
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-all whitespace-nowrap
            ${activeFilter === f.key ? activeStyles[f.key] : f.style}`}
        >
          {f.label} ({f.count})
        </button>
      ))}
    </div>
  )
}

const NFL_POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

function PositionTabBar({ activePos, onPosChange, entries }) {
  const counts = {}
  for (const e of entries) {
    const pos = e.player?.position
    if (pos) counts[pos] = (counts[pos] || 0) + 1
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
      {NFL_POSITIONS.map(pos => {
        const isActive = activePos === pos
        const count = pos === 'All' ? entries.length : (counts[pos] || 0)
        if (pos !== 'All' && count === 0) return null
        return (
          <button
            key={pos}
            onClick={() => onPosChange(pos)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap
              ${isActive ? 'bg-gold/15 text-gold border border-gold/30' : 'text-text-primary/40 border border-transparent hover:text-text-primary/60'}`}
          >
            {pos} {count > 0 && `(${count})`}
          </button>
        )
      })}
    </div>
  )
}

// ── Reason Chip Row ──────────────────────────────────────────────────────────

function ReasonChipRow({ movedEntry, existingChips, onUpdateChips, onDismiss }) {
  const [selectedChips, setSelectedChips] = useState(existingChips || [])

  const handleChipToggle = (chipId) => {
    setSelectedChips(prev => {
      const next = prev.includes(chipId) ? prev.filter(c => c !== chipId) : [...prev, chipId]
      onUpdateChips(movedEntry.playerId, next)
      return next
    })
  }

  const delta = movedEntry.delta
  const direction = delta > 0 ? `\u2191${delta}` : `\u2193${Math.abs(delta)}`

  return (
    <div className="px-3 py-2.5 bg-[var(--bg-alt)] border-b border-[var(--card-border)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-text-primary/50">
          Moved <span className="text-text-primary font-medium">{movedEntry.playerName}</span>{' '}
          <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>{direction} spots</span>.{' '}
          Why? <span className="text-text-primary/25">(optional)</span>
        </p>
        <button
          onClick={onDismiss}
          className="px-2 py-0.5 rounded text-[10px] font-semibold text-text-primary/40 hover:text-text-primary/70 border border-[var(--card-border)] hover:border-[var(--stone)]/50 transition-colors"
        >
          Done
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REASON_CHIPS.map(chip => {
          const isActive = selectedChips.includes(chip.id)
          const styles = CHIP_STYLES[chip.category]
          return (
            <button
              key={chip.id}
              onClick={() => handleChipToggle(chip.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all
                ${isActive ? styles.active : styles.inactive}`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Sortable Column Header ───────────────────────────────────────────────────

function SortHeader({ label, sortKey: key, currentKey, dir, onSort, className = '', tip }) {
  const isActive = currentKey === key
  const [showTip, setShowTip] = useState(false)
  const tipTimer = useRef(null)

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        onClick={() => onSort(key)}
        onMouseEnter={() => { tipTimer.current = setTimeout(() => setShowTip(true), 500) }}
        onMouseLeave={() => { clearTimeout(tipTimer.current); setShowTip(false) }}
        className={`text-[9px] font-semibold uppercase tracking-wider transition-colors w-full text-center
          ${isActive ? 'text-gold' : 'text-text-primary/25 hover:text-text-primary/50'}`}
      >
        {label}
        {isActive && (
          <span className="ml-0.5 text-[7px]">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </button>
      {showTip && tip && (
        <div className="absolute z-50 top-full mt-1.5 left-1/2 -translate-x-1/2 w-48 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--card-border)] shadow-xl pointer-events-none">
          <p className="text-[10px] text-text-primary/60 leading-snug whitespace-normal">{tip}</p>
        </div>
      )}
    </div>
  )
}

// ── Main Editor ──────────────────────────────────────────────────────────────

export default function DraftBoardEditor() {
  const { boardId } = useParams()
  const {
    board, entries, loading, error,
    moveEntry, addPlayer, removePlayer,
    updateNotes, updateTags, updateReasonChips, updateAuctionValue,
    insertTierBreak, removeTierBreak,
    updateBoardMeta, isSaving, lastSaved,
    movedEntry, clearMovedEntry,
  } = useDraftBoardEditor(boardId)

  const { isWatched, toggleWatch } = useWatchList()
  const { readiness } = useBoardReadiness(boardId)

  const [noteEntry, setNoteEntry] = useState(null)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)
  const [mobileTab, setMobileTab] = useState('rankings')
  const [tagFilter, setTagFilter] = useState('all')
  const [posFilter, setPosFilter] = useState('All')
  const [showDivergence, setShowDivergence] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [sortKey, setSortKey] = useState('rank') // rank | auctionValue | cpi | owgrRank | sgTotal | sgOffTee | sgApproach | sgPutting
  const [sortDir, setSortDir] = useState('asc') // asc | desc
  const [coachingCard, setCoachingCard] = useState(null)
  const [leagueStatusMap, setLeagueStatusMap] = useState({}) // playerId → [{ leagueName, status }]
  const [welcomeDismissed, setWelcomeDismissed] = useState(() =>
    !!localStorage.getItem(`lab-welcome-dismissed-${boardId}`)
  )

  // Draggable divider state
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem(`lab-divider-${boardId}`)
    return saved ? Number(saved) : 60
  })
  const isDraggingDivider = useRef(false)
  const dividerContainerRef = useRef(null)

  // Fetch league roster map for availability badges
  useEffect(() => {
    if (!board?.sport) return
    api.getRosterMap(board.sport).then(res => {
      if (!res.leagues) return
      const map = {}
      for (const league of res.leagues) {
        for (const pid of league.yourPlayerIds) {
          if (!map[pid]) map[pid] = []
          map[pid].push({ leagueName: league.name, leagueId: league.id, status: 'yours' })
        }
        for (const pid of league.takenPlayerIds) {
          if (!map[pid]) map[pid] = []
          map[pid].push({ leagueName: league.name, leagueId: league.id, status: 'taken' })
        }
      }
      setLeagueStatusMap(map)
    }).catch(() => {})
  }, [board?.sport])

  // Handle ?addPlayer=<id> query param from Hub-to-Lab bridge
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const playerIdToAdd = searchParams.get('addPlayer')
    if (playerIdToAdd && !loading && board) {
      addPlayer(playerIdToAdd).catch(() => {})
      // Remove query param so it doesn't re-trigger
      searchParams.delete('addPlayer')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, loading, board, addPlayer])

  // AI Coach: fetch coaching card on major moves
  const fetchCoachingCard = useCallback((triggerAction, context) => {
    if (!boardId) return
    api.getBoardCoach(boardId, triggerAction, { ...context, sport: board?.sport || 'nfl' })
      .then(res => {
        if (res.card?.cardTitle) {
          setCoachingCard(res.card)
          setTimeout(() => setCoachingCard(null), 15000)
        }
      })
      .catch(() => {})
  }, [boardId, board?.sport])

  // Trigger coaching card when a big move happens
  const prevEntriesLenRef = useRef(entries.length)
  useEffect(() => {
    if (!board || entries.length === 0) return
    const diff = Math.abs(entries.length - prevEntriesLenRef.current)
    if (diff > 0 && prevEntriesLenRef.current > 0) {
      fetchCoachingCard(diff > 3 ? 'BULK_CHANGE' : 'ENTRY_ADD', { entryCount: entries.length })
    }
    prevEntriesLenRef.current = entries.length
  }, [entries.length, board, fetchCoachingCard])

  // ── AI Trigger Types ──────────────────────────────────────────────────
  const firedTriggers = useRef(new Set())
  const triggerDebounce = useRef(null)

  const fireTrigger = useCallback((type, context) => {
    if (firedTriggers.current.has(type)) return
    firedTriggers.current.add(type)
    if (triggerDebounce.current) clearTimeout(triggerDebounce.current)
    triggerDebounce.current = setTimeout(() => {
      fetchCoachingCard(type, context)
    }, 1500)
  }, [fetchCoachingCard])

  // Watch for tag milestones, divergence thresholds, chip patterns, position imbalance
  const prevTagCount = useRef(0)
  useEffect(() => {
    if (!board || entries.length === 0) return

    // TAG_MILESTONE: 3rd, 5th, or 10th tag
    const tagCount = entries.filter(e => e.tags && e.tags.length > 0).length
    if (tagCount !== prevTagCount.current) {
      if ([3, 5, 10].includes(tagCount) && tagCount > prevTagCount.current) {
        const lastTagged = entries.find(e => e.tags?.length > 0)
        fireTrigger('TAG_MILESTONE', { tagType: lastTagged?.tags?.[0], tagCount })
      }
      prevTagCount.current = tagCount
    }

    // DIVERGENCE_THRESHOLD: any player moved 10+ spots from baseline
    for (const entry of entries) {
      if (entry.baselineRank != null) {
        const idx = entries.indexOf(entry)
        const delta = entry.baselineRank - (idx + 1)
        if (Math.abs(delta) >= 10) {
          const key = `DIVERGENCE_THRESHOLD_${entry.playerId}`
          if (!firedTriggers.current.has(key)) {
            firedTriggers.current.add(key)
            fireTrigger('DIVERGENCE_THRESHOLD', { playerName: entry.player?.name, delta })
            break
          }
        }
      }
    }

    // REASON_CHIP_PATTERN: same chip used 3+ times
    const chipCounts = {}
    for (const entry of entries) {
      for (const chip of (entry.reasonChips || [])) {
        chipCounts[chip] = (chipCounts[chip] || 0) + 1
      }
    }
    for (const [chip, count] of Object.entries(chipCounts)) {
      if (count >= 3) {
        fireTrigger('REASON_CHIP_PATTERN', { chip, chipCount: count })
        break
      }
    }

    // POSITION_IMBALANCE: NFL top-20 missing a starting position
    if (board.sport === 'nfl') {
      const top20 = entries.slice(0, 20)
      const positionsInTop20 = new Set(top20.map(e => e.player?.position).filter(Boolean))
      for (const pos of ['QB', 'RB', 'WR', 'TE']) {
        if (!positionsInTop20.has(pos)) {
          fireTrigger('POSITION_IMBALANCE', { missingPosition: pos })
          break
        }
      }
    }
  }, [entries, board, fireTrigger])

  // Draggable divider mouse handlers
  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    isDraggingDivider.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e) => {
      if (!isDraggingDivider.current || !dividerContainerRef.current) return
      const rect = dividerContainerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(80, Math.max(30, pct)))
    }

    const handleMouseUp = () => {
      isDraggingDivider.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      setLeftWidth(w => {
        localStorage.setItem(`lab-divider-${boardId}`, String(Math.round(w)))
        return w
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [boardId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = entries.findIndex(e => e.playerId === active.id)
    const toIndex = entries.findIndex(e => e.playerId === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      moveEntry(fromIndex, toIndex)
    }
  }, [entries, moveEntry])

  const [newlyAddedId, setNewlyAddedId] = useState(null)

  const handleAddPlayer = useCallback(async (playerId) => {
    try {
      await addPlayer(playerId)
      setNewlyAddedId(playerId)
      // Switch to rankings tab on mobile so user sees the new entry
      setMobileTab('rankings')
      // Clear highlight after animation
      setTimeout(() => setNewlyAddedId(null), 2000)
      // Scroll to bottom of rankings to show new entry
      requestAnimationFrame(() => {
        const container = document.querySelector('[data-rankings-list]')
        if (container) container.scrollTop = container.scrollHeight
      })
    } catch (err) {}
  }, [addPlayer])

  const handleDelete = useCallback(async () => {
    await api.deleteDraftBoard(boardId)
  }, [boardId])

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <a href="/lab" className="text-gold text-sm hover:underline">Back to The Lab</a>
        </div>
      </div>
    )
  }

  const existingPlayerIds = entries.map(e => e.playerId)
  const isNfl = board?.sport === 'nfl'

  // Compute position rank for each entry
  const positionRankMap = {}
  const posRankCounter = {}
  for (const entry of entries) {
    const pos = entry.player?.position
    if (pos) {
      posRankCounter[pos] = (posRankCounter[pos] || 0) + 1
      positionRankMap[entry.playerId] = posRankCounter[pos]
    }
  }

  // Apply filters: tag filter + position filter
  let filteredEntries = entries
  if (tagFilter !== 'all') {
    filteredEntries = filteredEntries.filter(e => {
      const tags = e.tags || []
      if (tagFilter === 'untagged') return tags.length === 0
      return tags.includes(tagFilter)
    })
  }
  if (posFilter !== 'All' && isNfl) {
    filteredEntries = filteredEntries.filter(e => e.player?.position === posFilter)
  }

  // Apply sorting (only when not sorting by rank, which is the default order)
  if (sortKey !== 'rank') {
    const sorted = [...filteredEntries]
    sorted.sort((a, b) => {
      let aVal, bVal
      if (sortKey === 'auctionValue') {
        aVal = a.auctionValue ?? -1
        bVal = b.auctionValue ?? -1
      } else if (sortKey === 'owgrRank') {
        // Lower rank = better, so nulls go to bottom
        aVal = a.player?.owgrRank ?? 9999
        bVal = b.player?.owgrRank ?? 9999
        // For OWGR, ascending means best first (lowest number)
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      } else {
        aVal = a.player?.[sortKey] ?? -999
        bVal = b.player?.[sortKey] ?? -999
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    filteredEntries = sorted
  }

  const hasBaselines = entries.some(e => e.baselineRank != null)

  const handleSort = (key) => {
    if (sortKey === key) {
      // Toggle direction, or reset to rank if already toggled both ways
      if (sortDir === 'desc') {
        setSortKey('rank')
        setSortDir('asc')
      } else {
        setSortDir('desc')
      }
    } else {
      setSortKey(key)
      // Default: descending for stats (higher = better), ascending for rank/OWGR
      setSortDir(key === 'owgrRank' ? 'asc' : 'desc')
    }
  }

  // Determine if right panel should show insights vs search
  const allPlayersLoaded = entries.length > 0 && !isNfl // Only for golf boards for now

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <BoardHeader
        board={board}
        entryCount={entries.length}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onUpdateMeta={updateBoardMeta}
        onDelete={handleDelete}
      />

      {entries.length > 0 && (
        <BoardProgressTracker
          entries={entries}
          cheatSheetGenerated={readiness?.cheatSheetGenerated}
        />
      )}

      {/* Mobile tab toggle */}
      <div className="md:hidden flex border-b border-[var(--card-border)]">
        <button
          onClick={() => setMobileTab('rankings')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'rankings' ? 'text-gold border-b-2 border-gold' : 'text-text-primary/40'
          }`}
        >
          Rankings ({entries.length})
        </button>
        <button
          onClick={() => setMobileTab('search')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'search' ? 'text-gold border-b-2 border-gold' : 'text-text-primary/40'
          }`}
        >
          Add Players
        </button>
        <button
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'timeline' ? 'text-gold border-b-2 border-gold' : 'text-text-primary/40'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* Two-panel layout */}
      <div ref={dividerContainerRef} className="flex-1 flex overflow-hidden">
        {/* Left: Rankings */}
        <div
          data-rankings-list
          className={`md:block md:flex-none overflow-y-auto ${mobileTab !== 'rankings' ? 'hidden' : 'flex-1'}`}
          style={{ width: leftWidth + '%' }}
        >
          {/* Filter bars */}
          {entries.length > 0 && (
            <div className="border-b border-[var(--card-border)]">
              <TagFilterBar entries={entries} activeFilter={tagFilter} onFilterChange={setTagFilter} />
              {isNfl && (
                <PositionTabBar activePos={posFilter} onPosChange={setPosFilter} entries={entries} />
              )}
            </div>
          )}

          {/* Welcome card (first visit only) */}
          {!welcomeDismissed && entries.length > 0 && (
            <BoardWelcomeCard
              boardId={boardId}
              sport={board?.sport}
              movedEntry={movedEntry}
              onDismiss={() => setWelcomeDismissed(true)}
            />
          )}

          {/* Divergence summary */}
          {hasBaselines && showDivergence && tagFilter === 'all' && posFilter === 'All' && (
            <div className="relative">
              <DivergenceSummary entries={entries} />
              <button
                onClick={() => setShowDivergence(false)}
                className="absolute top-3 right-4 text-text-primary/20 hover:text-text-primary/50 text-xs"
                title="Hide"
              >
                {'\u2715'}
              </button>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-12 h-12 text-text-primary/10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-text-primary/40 mb-1">No players ranked yet</p>
              <p className="text-xs text-text-primary/25">Search and add players from the right panel</p>
              <button
                onClick={() => setMobileTab('search')}
                className="md:hidden mt-4 px-4 py-2 text-xs font-semibold bg-gold/10 text-gold rounded-lg"
              >
                Add Players
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <p className="text-sm text-text-primary/40 mb-1">No players match this filter</p>
              <button
                onClick={() => { setTagFilter('all'); setPosFilter('All') }}
                className="mt-2 text-xs text-gold hover:underline"
              >
                Show all players
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredEntries.map(e => e.playerId)} strategy={verticalListSortingStrategy}>
                {/* Sortable column header row for golf boards */}
                {!isNfl && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border-b border-[var(--card-border)] bg-[var(--surface)] sticky top-0 z-10">
                    <span className="w-4 shrink-0" />
                    <SortHeader label="#" sortKey="rank" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-8 text-center" tip="Board ranking position" />
                    <SortHeader label="$" sortKey="auctionValue" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-12 text-center" tip="Auction draft value" />
                    <span className="w-8 shrink-0" />
                    <span className="flex-1 text-[9px] font-semibold uppercase tracking-wider text-text-primary/25">Player</span>
                    <span className="w-[104px] text-center text-[9px] font-semibold uppercase tracking-wider text-text-primary/25 shrink-0">Tags</span>
                    <SortHeader label="CPI" sortKey="cpi" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-14 text-center" tip="Clutch Performance Index: proprietary composite of form, consistency, and clutch play (-3.0 to +3.0)" />
                    <SortHeader label="OWGR" sortKey="owgrRank" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-11 text-center" tip="Official World Golf Ranking position" />
                    <SortHeader label="SG Tot" sortKey="sgTotal" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-11 text-center" tip="Strokes Gained: Total \u2014 overall strokes better/worse than field average per round" />
                    <SortHeader label="OTT" sortKey="sgOffTee" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-11 text-center" tip="Strokes Gained: Off the Tee \u2014 driving distance + accuracy vs field" />
                    <SortHeader label="APP" sortKey="sgApproach" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-11 text-center" tip="Strokes Gained: Approach \u2014 iron play accuracy into greens vs field" />
                    <SortHeader label="Putt" sortKey="sgPutting" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="w-11 text-center" tip="Strokes Gained: Putting \u2014 putting performance vs field from all distances" />
                    <span className="w-[72px] shrink-0" />
                  </div>
                )}
                {filteredEntries.map((entry, i) => {
                  const originalIndex = entries.findIndex(e => e.playerId === entry.playerId)
                  const prevOriginal = originalIndex > 0 ? entries[originalIndex - 1] : null
                  const noFilters = tagFilter === 'all' && posFilter === 'All'
                  const showTierBreak = noFilters && originalIndex > 0 && entry.tier != null && prevOriginal?.tier != null && entry.tier !== prevOriginal.tier

                  return (
                    <Fragment key={entry.playerId}>
                      {showTierBreak && (
                        <TierBreak tier={entry.tier} onRemove={() => removeTierBreak(originalIndex)} />
                      )}
                      <BoardEntryRow
                        entry={entry}
                        index={originalIndex}
                        sport={board?.sport}
                        positionRank={positionRankMap[entry.playerId]}
                        leagueStatus={leagueStatusMap[entry.playerId]}
                        onRemove={removePlayer}
                        onClickNotes={(e) => setNoteEntry(e)}
                        onUpdateTags={updateTags}
                        onClickPlayer={(pid) => setDrawerPlayerId(pid)}
                        onUpdateAuctionValue={updateAuctionValue}
                        isWatched={isWatched(entry.playerId)}
                        onToggleWatch={toggleWatch}
                        isNewlyAdded={newlyAddedId === entry.playerId}
                      />
                      {movedEntry && movedEntry.playerId === entry.playerId && movedEntry.delta !== 0 && (
                        <ReasonChipRow
                          movedEntry={movedEntry}
                          existingChips={entry.reasonChips || []}
                          onUpdateChips={updateReasonChips}
                          onDismiss={clearMovedEntry}
                        />
                      )}
                      {noFilters && i < filteredEntries.length - 1 && (
                        <div className="relative h-0 group/tier">
                          <button
                            onClick={() => insertTierBreak(originalIndex)}
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold/25 bg-transparent rounded-full border border-transparent transition-all hover:text-gold/70 hover:bg-gold/10 hover:border-gold/20 group-hover/tier:text-gold/70 group-hover/tier:bg-gold/10 group-hover/tier:border-gold/20"
                          >
                            + Tier
                          </button>
                        </div>
                      )}
                    </Fragment>
                  )
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Resize handle (desktop only) */}
        <div
          className="hidden md:flex items-center justify-center w-1.5 cursor-col-resize group/divider hover:bg-gold/10 transition-colors shrink-0"
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-0.5 h-8 rounded-full bg-[var(--card-border)] group-hover/divider:bg-gold/40 transition-colors" />
        </div>

        {/* Right: Player Search + Board Insights (golf) */}
        <div
          className={`md:flex md:flex-col md:flex-none border-l border-[var(--card-border)] bg-[var(--surface)] ${mobileTab === 'search' ? 'flex flex-col flex-1' : mobileTab === 'timeline' ? 'hidden md:flex md:flex-col' : 'hidden'}`}
          style={{ width: (100 - leftWidth) + '%' }}
        >
          {allPlayersLoaded ? (
            <>
              <PlayerSearchPanel
                sport={board?.sport || 'nfl'}
                onAdd={handleAddPlayer}
                existingPlayerIds={existingPlayerIds}
                entryCount={entries.length}
                compact
              />
              <div className="flex-1 overflow-y-auto border-t border-[var(--card-border)]">
                <BoardInsightsPanel
                  entries={entries}
                  sport={board?.sport}
                  onClickPlayer={(pid) => setDrawerPlayerId(pid)}
                />
              </div>
            </>
          ) : (
            <PlayerSearchPanel
              sport={board?.sport || 'nfl'}
              onAdd={handleAddPlayer}
              existingPlayerIds={existingPlayerIds}
              entryCount={entries.length}
            />
          )}
        </div>

        {/* Timeline panel (mobile only — on desktop it's a modal/overlay) */}
        {mobileTab === 'timeline' && (
          <div className="flex-1 md:hidden overflow-y-auto p-4">
            <BoardTimeline boardId={boardId} />
          </div>
        )}
      </div>

      {/* Desktop Timeline button */}
      <button
        onClick={() => setShowTimeline(true)}
        className="hidden md:flex fixed bottom-6 left-6 z-30 items-center gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-xs text-text-primary/40 hover:text-gold hover:border-gold/30 transition-colors shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Timeline
      </button>

      {/* Timeline modal (desktop) */}
      {showTimeline && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4" onClick={() => setShowTimeline(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg max-h-[80vh] bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary">Board Timeline</h2>
              <button onClick={() => setShowTimeline(false)} className="text-text-primary/30 hover:text-text-primary/60">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <BoardTimeline boardId={boardId} />
            </div>
          </div>
        </div>
      )}

      {/* Notes editor modal */}
      {noteEntry && (
        <PlayerNoteEditor
          entry={noteEntry}
          onSave={updateNotes}
          onClose={() => setNoteEntry(null)}
        />
      )}

      {/* AI Coaching Card */}
      {coachingCard && (
        <div className="fixed bottom-6 right-6 z-40 max-w-xs w-full">
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-semibold text-purple-300">Clutch Coach</span>
              </div>
              <button onClick={() => setCoachingCard(null)} className="text-text-primary/30 hover:text-text-primary/60">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h4 className="text-sm font-semibold text-text-primary mb-1">{coachingCard.cardTitle}</h4>
            <p className="text-xs text-text-primary/60 leading-relaxed">{coachingCard.cardBody}</p>
            {coachingCard.actionSuggestion && (
              <p className="text-xs text-gold mt-2">{coachingCard.actionSuggestion}</p>
            )}
          </div>
        </div>
      )}

      {/* Player Drawer */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        isNfl={isNfl}
      />
    </div>
  )
}
