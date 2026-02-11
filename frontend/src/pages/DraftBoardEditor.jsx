import { useState, Fragment, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import useDraftBoardEditor from '../hooks/useDraftBoardEditor'
import useWatchList from '../hooks/useWatchList'
import api from '../services/api'
import BoardHeader from '../components/workspace/BoardHeader'
import BoardEntryRow from '../components/workspace/BoardEntryRow'
import TierBreak from '../components/workspace/TierBreak'
import PlayerSearchPanel from '../components/workspace/PlayerSearchPanel'
import PlayerNoteEditor from '../components/workspace/PlayerNoteEditor'
import DivergenceSummary from '../components/workspace/DivergenceSummary'
import BoardTimeline from '../components/workspace/BoardTimeline'

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
  positive: { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', inactive: 'border-emerald-500/20 text-emerald-500/40 hover:border-emerald-500/40 hover:text-emerald-400' },
  negative: { active: 'bg-red-500/20 text-red-400 border-red-500/40', inactive: 'border-red-500/20 text-red-500/40 hover:border-red-500/40 hover:text-red-400' },
  source:   { active: 'bg-white/15 text-white/80 border-white/30', inactive: 'border-white/10 text-white/30 hover:border-white/25 hover:text-white/50' },
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
    { key: 'all', label: 'All', count: entries.length, style: 'text-white/60 border-white/10 hover:border-white/25' },
    { key: 'target', label: 'Targets', count: counts.target, style: 'text-emerald-400/70 border-emerald-500/20 hover:border-emerald-500/40' },
    { key: 'sleeper', label: 'Sleepers', count: counts.sleeper, style: 'text-gold/70 border-gold/20 hover:border-gold/40' },
    { key: 'avoid', label: 'Avoids', count: counts.avoid, style: 'text-red-400/70 border-red-500/20 hover:border-red-500/40' },
    { key: 'untagged', label: 'Untagged', count: counts.untagged, style: 'text-white/40 border-white/10 hover:border-white/20' },
  ]

  const activeStyles = {
    all: 'bg-white/10 text-white border-white/25',
    target: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    sleeper: 'bg-gold/15 text-gold border-gold/40',
    avoid: 'bg-red-500/15 text-red-400 border-red-500/40',
    untagged: 'bg-white/10 text-white/60 border-white/20',
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
              ${isActive ? 'bg-gold/15 text-gold border border-gold/30' : 'text-white/40 border border-transparent hover:text-white/60'}`}
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
  const dismissTimer = useRef(null)
  const [selectedChips, setSelectedChips] = useState(existingChips || [])

  useEffect(() => {
    dismissTimer.current = setTimeout(() => onDismiss(), 5000)
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [onDismiss])

  const handleChipToggle = (chipId) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => onDismiss(), 5000)

    setSelectedChips(prev => {
      const next = prev.includes(chipId) ? prev.filter(c => c !== chipId) : [...prev, chipId]
      onUpdateChips(movedEntry.playerId, next)
      return next
    })
  }

  const delta = movedEntry.delta
  const direction = delta > 0 ? `\u2191${delta}` : `\u2193${Math.abs(delta)}`

  return (
    <div className="px-3 py-2.5 bg-dark-primary/60 border-b border-white/[0.06]">
      <p className="text-[11px] text-white/50 mb-2">
        Moved <span className="text-white font-medium">{movedEntry.playerName}</span>{' '}
        <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>{direction} spots</span>.{' '}
        Why? <span className="text-white/25">(optional)</span>
      </p>
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

// ── Main Editor ──────────────────────────────────────────────────────────────

export default function DraftBoardEditor() {
  const { boardId } = useParams()
  const {
    board, entries, loading, error,
    moveEntry, addPlayer, removePlayer,
    updateNotes, updateTags, updateReasonChips,
    insertTierBreak, removeTierBreak,
    updateBoardMeta, isSaving, lastSaved,
    movedEntry, clearMovedEntry,
  } = useDraftBoardEditor(boardId)

  const { isWatched, toggleWatch } = useWatchList()

  const [noteEntry, setNoteEntry] = useState(null)
  const [mobileTab, setMobileTab] = useState('rankings')
  const [tagFilter, setTagFilter] = useState('all')
  const [posFilter, setPosFilter] = useState('All')
  const [showDivergence, setShowDivergence] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [coachingCard, setCoachingCard] = useState(null)

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

  const handleAddPlayer = useCallback(async (playerId) => {
    try { await addPlayer(playerId) } catch (err) {}
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

  const hasBaselines = entries.some(e => e.baselineRank != null)

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

      {/* Mobile tab toggle */}
      <div className="md:hidden flex border-b border-white/[0.06]">
        <button
          onClick={() => setMobileTab('rankings')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'rankings' ? 'text-gold border-b-2 border-gold' : 'text-white/40'
          }`}
        >
          Rankings ({entries.length})
        </button>
        <button
          onClick={() => setMobileTab('search')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'search' ? 'text-gold border-b-2 border-gold' : 'text-white/40'
          }`}
        >
          Add Players
        </button>
        <button
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-colors ${
            mobileTab === 'timeline' ? 'text-gold border-b-2 border-gold' : 'text-white/40'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Rankings */}
        <div className={`flex-1 md:w-[60%] md:block overflow-y-auto ${mobileTab !== 'rankings' ? 'hidden' : ''}`}>
          {/* Filter bars */}
          {entries.length > 0 && (
            <div className="border-b border-white/[0.06]">
              <TagFilterBar entries={entries} activeFilter={tagFilter} onFilterChange={setTagFilter} />
              {isNfl && (
                <PositionTabBar activePos={posFilter} onPosChange={setPosFilter} entries={entries} />
              )}
            </div>
          )}

          {/* Divergence summary */}
          {hasBaselines && showDivergence && tagFilter === 'all' && posFilter === 'All' && (
            <div className="relative">
              <DivergenceSummary entries={entries} />
              <button
                onClick={() => setShowDivergence(false)}
                className="absolute top-3 right-4 text-white/20 hover:text-white/50 text-xs"
                title="Hide"
              >
                {'\u2715'}
              </button>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-12 h-12 text-white/10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-white/40 mb-1">No players ranked yet</p>
              <p className="text-xs text-white/25">Search and add players from the right panel</p>
              <button
                onClick={() => setMobileTab('search')}
                className="md:hidden mt-4 px-4 py-2 text-xs font-semibold bg-gold/10 text-gold rounded-lg"
              >
                Add Players
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <p className="text-sm text-white/40 mb-1">No players match this filter</p>
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
                        onRemove={removePlayer}
                        onClickNotes={(e) => setNoteEntry(e)}
                        onUpdateTags={updateTags}
                        isWatched={isWatched(entry.playerId)}
                        onToggleWatch={toggleWatch}
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
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold/0 bg-gold/0 rounded-full border border-gold/0 transition-all group-hover/tier:text-gold/70 group-hover/tier:bg-gold/10 group-hover/tier:border-gold/20"
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

        {/* Right: Player Search */}
        <div className={`md:w-[40%] md:block md:border-l border-white/[0.06] bg-dark-secondary/30 ${mobileTab === 'search' ? 'flex-1' : mobileTab === 'timeline' ? 'hidden md:block' : 'hidden'}`}>
          <PlayerSearchPanel
            sport={board?.sport || 'nfl'}
            onAdd={handleAddPlayer}
            existingPlayerIds={existingPlayerIds}
          />
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
        className="hidden md:flex fixed bottom-6 left-6 z-30 items-center gap-2 px-3 py-2 bg-dark-secondary border border-white/10 rounded-lg text-xs text-white/40 hover:text-gold hover:border-gold/30 transition-colors shadow-lg"
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
            className="relative w-full max-w-lg max-h-[80vh] bg-dark-secondary border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Board Timeline</h2>
              <button onClick={() => setShowTimeline(false)} className="text-white/30 hover:text-white/60">
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
          <div className="bg-purple-500/10 border border-purple-400/20 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-semibold text-purple-300">Clutch Coach</span>
              </div>
              <button onClick={() => setCoachingCard(null)} className="text-white/30 hover:text-white/60">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">{coachingCard.cardTitle}</h4>
            <p className="text-xs text-white/60 leading-relaxed">{coachingCard.cardBody}</p>
            {coachingCard.actionSuggestion && (
              <p className="text-xs text-gold mt-2">{coachingCard.actionSuggestion}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
