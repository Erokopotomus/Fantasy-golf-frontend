import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCORING_OPTIONS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
]

export default function BoardHeader({ board, entryCount, isSaving, lastSaved, onUpdateMeta, onDelete }) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(board?.name || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleNameBlur = () => {
    setEditingName(false)
    if (nameValue.trim() && nameValue.trim() !== board?.name) {
      onUpdateMeta({ name: nameValue.trim() })
    }
  }

  const handleDelete = async () => {
    await onDelete()
    navigate('/lab')
  }

  const sportBadge = board?.sport === 'nfl'
    ? <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange/20 text-orange">NFL</span>
    : <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">Golf</span>

  const saveStatus = isSaving
    ? <span className="text-xs text-amber-400 animate-pulse">Saving...</span>
    : lastSaved
      ? <span className="text-xs text-white/30">Saved</span>
      : null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-dark-secondary/60">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => navigate('/lab')} className="text-white/40 hover:text-white transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleNameBlur() }}
            className="text-lg font-semibold bg-transparent border-b border-gold/50 text-white outline-none min-w-0"
          />
        ) : (
          <button
            onClick={() => { setNameValue(board?.name || ''); setEditingName(true) }}
            className="text-lg font-semibold text-white truncate hover:text-gold transition-colors"
          >
            {board?.name || 'Untitled Board'}
          </button>
        )}

        {sportBadge}

        <span className="text-xs text-white/30">{entryCount} player{entryCount !== 1 ? 's' : ''}</span>

        {saveStatus}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {board?.sport === 'nfl' && (
          <select
            value={board?.scoringFormat || 'ppr'}
            onChange={e => onUpdateMeta({ scoringFormat: e.target.value })}
            className="text-xs bg-dark-primary border border-white/[0.08] rounded px-2 py-1.5 text-white/70 outline-none cursor-pointer"
          >
            {SCORING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Delete?</span>
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-white/40 hover:text-white/60">No</button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded hover:bg-white/[0.04]"
            title="Delete board"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
