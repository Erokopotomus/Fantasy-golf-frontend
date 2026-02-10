import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const POSITION_COLORS = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-green-500/20 text-green-400',
  TE: 'bg-orange-500/20 text-orange-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-yellow-500/20 text-yellow-400',
}

export default function BoardEntryRow({ entry, index, sport, onRemove, onClickNotes }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.playerId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const player = entry.player || {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] transition-colors group
        ${isDragging ? 'bg-dark-secondary/80 shadow-lg' : 'bg-dark-secondary/40 hover:bg-dark-secondary/80'}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 touch-none shrink-0"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>

      {/* Rank */}
      <span className="w-8 text-center text-sm font-mono text-white/40 shrink-0">{index + 1}</span>

      {/* Headshot */}
      <div className="w-8 h-8 rounded-full bg-dark-primary overflow-hidden shrink-0">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold">
            {player.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm text-white font-medium truncate min-w-0 flex-1">{player.name || 'Unknown'}</span>

      {/* Sport-specific stats */}
      {sport === 'nfl' ? (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {player.position && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${POSITION_COLORS[player.position] || 'bg-white/10 text-white/60'}`}>
              {player.position}
            </span>
          )}
          {player.team && <span className="text-xs text-white/40">{player.team}</span>}
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {player.owgrRank && <span className="text-xs text-white/40">#{player.owgrRank}</span>}
          {player.sgTotal != null && (
            <span className={`text-xs ${player.sgTotal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              SG {player.sgTotal > 0 ? '+' : ''}{player.sgTotal.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Notes indicator */}
      <button
        onClick={() => onClickNotes(entry)}
        className={`p-1 rounded transition-colors shrink-0 ${entry.notes ? 'text-gold hover:text-gold/80' : 'text-white/20 hover:text-white/40 opacity-0 group-hover:opacity-100'}`}
        title={entry.notes ? 'Edit notes' : 'Add notes'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.playerId)}
        className="p-1 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
