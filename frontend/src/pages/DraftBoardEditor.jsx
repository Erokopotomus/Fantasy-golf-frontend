import { useState, Fragment, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import useDraftBoardEditor from '../hooks/useDraftBoardEditor'
import api from '../services/api'
import BoardHeader from '../components/workspace/BoardHeader'
import BoardEntryRow from '../components/workspace/BoardEntryRow'
import TierBreak from '../components/workspace/TierBreak'
import PlayerSearchPanel from '../components/workspace/PlayerSearchPanel'
import PlayerNoteEditor from '../components/workspace/PlayerNoteEditor'

export default function DraftBoardEditor() {
  const { boardId } = useParams()
  const {
    board, entries, loading, error,
    moveEntry, addPlayer, removePlayer,
    updateNotes, insertTierBreak, removeTierBreak,
    updateBoardMeta, isSaving, lastSaved,
  } = useDraftBoardEditor(boardId)

  const [noteEntry, setNoteEntry] = useState(null)
  const [mobileTab, setMobileTab] = useState('rankings') // rankings | search

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
    try {
      await addPlayer(playerId)
    } catch (err) {
      // already handled in hook
    }
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
          <a href="/workspace" className="text-gold text-sm hover:underline">Back to Workspace</a>
        </div>
      </div>
    )
  }

  const existingPlayerIds = entries.map(e => e.playerId)

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
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Rankings */}
        <div className={`flex-1 md:w-[60%] md:block overflow-y-auto ${mobileTab !== 'rankings' ? 'hidden' : ''}`}>
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
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={entries.map(e => e.playerId)} strategy={verticalListSortingStrategy}>
                {entries.map((entry, i) => (
                  <Fragment key={entry.playerId}>
                    {/* Tier break */}
                    {i > 0 && entry.tier != null && entries[i - 1].tier != null && entry.tier !== entries[i - 1].tier && (
                      <TierBreak tier={entry.tier} onRemove={() => removeTierBreak(i)} />
                    )}
                    <BoardEntryRow
                      entry={entry}
                      index={i}
                      sport={board?.sport}
                      onRemove={removePlayer}
                      onClickNotes={(e) => setNoteEntry(e)}
                    />
                    {/* Insert tier break button — shows on hover between rows */}
                    {i < entries.length - 1 && (
                      <div className="relative h-0 group/tier">
                        <button
                          onClick={() => insertTierBreak(i)}
                          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold/0 bg-gold/0 rounded-full border border-gold/0 transition-all group-hover/tier:text-gold/70 group-hover/tier:bg-gold/10 group-hover/tier:border-gold/20"
                        >
                          + Tier
                        </button>
                      </div>
                    )}
                  </Fragment>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right: Player Search */}
        <div className={`md:w-[40%] md:block md:border-l border-white/[0.06] bg-dark-secondary/30 ${mobileTab !== 'search' ? 'hidden' : 'flex-1'}`}>
          <PlayerSearchPanel
            sport={board?.sport || 'nfl'}
            onAdd={handleAddPlayer}
            existingPlayerIds={existingPlayerIds}
          />
        </div>
      </div>

      {/* Notes editor modal */}
      {noteEntry && (
        <PlayerNoteEditor
          entry={noteEntry}
          onSave={updateNotes}
          onClose={() => setNoteEntry(null)}
        />
      )}
    </div>
  )
}
