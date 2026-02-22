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

const TAG_CONFIG = {
  target:  { label: 'TGT', active: 'bg-emerald-500/25 text-emerald-400 border-emerald-500/40', inactive: 'border-emerald-500/15 text-emerald-500/30 hover:text-emerald-400/60 hover:border-emerald-500/30' },
  sleeper: { label: 'SLP', active: 'bg-gold/25 text-gold border-gold/40', inactive: 'border-gold/15 text-gold/30 hover:text-gold/60 hover:border-gold/30' },
  avoid:   { label: 'AVD', active: 'bg-red-500/25 text-red-400 border-red-500/40', inactive: 'border-red-500/15 text-red-500/30 hover:text-red-400/60 hover:border-red-500/30' },
}

export default function BoardEntryRow({ entry, index, sport, positionRank, onRemove, onClickNotes, onUpdateTags, isWatched, onToggleWatch }) {
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
  const activeTags = entry.tags || []

  const handleTagToggle = (tagName) => {
    if (!onUpdateTags) return
    // Mutually exclusive: if already active, remove it; otherwise set only this one
    if (activeTags.includes(tagName)) {
      onUpdateTags(entry.playerId, [])
    } else {
      onUpdateTags(entry.playerId, [tagName])
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--card-border)] transition-colors group
        ${isDragging ? 'bg-[var(--surface-alt)] shadow-lg' : 'bg-[var(--surface)] hover:bg-[var(--surface-alt)]'}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-text-primary/20 hover:text-text-primary/50 touch-none shrink-0"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>

      {/* Rank + Divergence */}
      <span className="w-8 text-center text-sm font-mono text-text-primary/40 shrink-0">{index + 1}</span>
      {entry.baselineRank != null && (() => {
        const delta = entry.baselineRank - (index + 1)
        if (Math.abs(delta) < 2) return null
        return (
          <span className={`text-[9px] font-mono font-bold shrink-0 ${delta > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {delta > 0 ? `\u2191${delta}` : `\u2193${Math.abs(delta)}`}
          </span>
        )
      })()}

      {/* Headshot */}
      <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] overflow-hidden shrink-0">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-xs font-bold">
            {player.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm text-text-primary font-medium truncate min-w-0 flex-1">{player.name || 'Unknown'}</span>

      {/* Tag pills */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
          const isActive = activeTags.includes(key)
          return (
            <button
              key={key}
              onClick={() => handleTagToggle(key)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all
                ${isActive ? cfg.active : `${cfg.inactive} opacity-0 group-hover:opacity-100`}`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Sport-specific stats */}
      {sport === 'nfl' ? (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {player.position && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${POSITION_COLORS[player.position] || 'bg-[var(--bg-alt)] text-text-primary/60'}`}>
              {player.position}{positionRank || ''}
            </span>
          )}
          {player.team && <span className="text-xs text-text-primary/40">{player.team}</span>}
          {player.fantasyPtsPerGame != null && (
            <span className="text-xs font-mono text-gold">{player.fantasyPtsPerGame} ppg</span>
          )}
          {player.fantasyPts != null && (
            <span className="text-[10px] font-mono text-text-primary/30">{player.fantasyPts} tot</span>
          )}
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {player.cpi != null && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${player.cpi >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              CPI {player.cpi > 0 ? '+' : ''}{player.cpi.toFixed(1)}
            </span>
          )}
          {player.formScore != null && (
            <span className="text-xs font-mono text-text-primary/50">Form {Math.round(player.formScore)}</span>
          )}
          {player.owgrRank && <span className="text-xs text-text-primary/40">#{player.owgrRank}</span>}
          {player.sgTotal != null && (
            <span className={`text-xs ${player.sgTotal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              SG {player.sgTotal > 0 ? '+' : ''}{player.sgTotal.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Watch star */}
      {onToggleWatch && (
        <button
          onClick={() => onToggleWatch(entry.playerId, sport)}
          className={`p-1 rounded transition-colors shrink-0 ${isWatched ? 'text-gold' : 'text-text-primary/15 hover:text-gold/50 opacity-0 group-hover:opacity-100'}`}
          title={isWatched ? 'Remove from watch list' : 'Add to watch list'}
        >
          <svg className="w-3.5 h-3.5" fill={isWatched ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}

      {/* Notes indicator */}
      <button
        onClick={() => onClickNotes(entry)}
        className={`p-1 rounded transition-colors shrink-0 ${entry.notes ? 'text-gold hover:text-gold/80' : 'text-text-primary/20 hover:text-text-primary/40 opacity-0 group-hover:opacity-100'}`}
        title={entry.notes ? 'Edit notes' : 'Add notes'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.playerId)}
        className="p-1 text-text-primary/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
