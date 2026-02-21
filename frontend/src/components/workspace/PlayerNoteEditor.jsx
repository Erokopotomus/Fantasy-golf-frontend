import { useState, useEffect, useRef } from 'react'

export default function PlayerNoteEditor({ entry, onSave, onClose }) {
  const [notes, setNotes] = useState(entry?.notes || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    setNotes(entry?.notes || '')
    // Focus textarea after opening
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [entry])

  const handleSave = () => {
    onSave(entry.playerId, notes)
    onClose()
  }

  if (!entry) return null

  const player = entry.player || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-dark-secondary border border-[var(--card-border)] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)]">
          <div className="w-8 h-8 rounded-full bg-dark-primary overflow-hidden shrink-0">
            {player.headshotUrl ? (
              <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-xs font-bold">
                {player.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">{player.name}</div>
            <div className="text-[11px] text-text-primary/40">Rank #{entry.rank}</div>
          </div>
          <button onClick={onClose} className="p-1 text-text-primary/30 hover:text-text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notes textarea */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add scouting notes, sleeper take, injury concern..."
            rows={4}
            className="w-full bg-dark-primary border border-[var(--card-border)] rounded-lg p-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-gold/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-primary/50 hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
