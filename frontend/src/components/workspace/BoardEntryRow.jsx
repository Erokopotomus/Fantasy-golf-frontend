import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const POSITION_COLORS = {
  QB: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  RB: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  WR: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  TE: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  K: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  DEF: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
}

const TAG_CONFIG = {
  target:  { label: 'TGT', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold', inactive: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400/70 hover:border-emerald-500/30' },
  sleeper: { label: 'SLP', active: 'bg-gold/20 text-gold border-gold/40 font-bold', inactive: 'bg-gold/5 border-gold/20 text-gold/50 hover:bg-gold/10 hover:text-gold/70 hover:border-gold/30' },
  avoid:   { label: 'AVD', active: 'bg-red-500/20 text-red-400 border-red-500/40 font-bold', inactive: 'bg-red-500/5 border-red-500/20 text-red-500/50 hover:bg-red-500/10 hover:text-red-400/70 hover:border-red-500/30' },
}

// Country to flag emoji helper
function countryFlag(country) {
  if (!country) return null
  const flags = {
    'United States': '\u{1F1FA}\u{1F1F8}', 'USA': '\u{1F1FA}\u{1F1F8}',
    'England': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    'Scotland': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    'Northern Ireland': '\u{1F3F4}\u{E0067}\u{E0062}\u{E006E}\u{E0069}\u{E0072}\u{E007F}',
    'Wales': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
    'Ireland': '\u{1F1EE}\u{1F1EA}', 'Australia': '\u{1F1E6}\u{1F1FA}',
    'Canada': '\u{1F1E8}\u{1F1E6}', 'South Korea': '\u{1F1F0}\u{1F1F7}', 'Korea': '\u{1F1F0}\u{1F1F7}',
    'Japan': '\u{1F1EF}\u{1F1F5}', 'Spain': '\u{1F1EA}\u{1F1F8}',
    'Sweden': '\u{1F1F8}\u{1F1EA}', 'Norway': '\u{1F1F3}\u{1F1F4}',
    'South Africa': '\u{1F1FF}\u{1F1E6}', 'Mexico': '\u{1F1F2}\u{1F1FD}',
    'Colombia': '\u{1F1E8}\u{1F1F4}', 'Germany': '\u{1F1E9}\u{1F1EA}',
    'France': '\u{1F1EB}\u{1F1F7}', 'Italy': '\u{1F1EE}\u{1F1F9}',
    'Thailand': '\u{1F1F9}\u{1F1ED}', 'China': '\u{1F1E8}\u{1F1F3}',
    'India': '\u{1F1EE}\u{1F1F3}', 'Chile': '\u{1F1E8}\u{1F1F1}',
    'Argentina': '\u{1F1E6}\u{1F1F7}', 'Denmark': '\u{1F1E9}\u{1F1F0}',
    'Belgium': '\u{1F1E7}\u{1F1EA}', 'Netherlands': '\u{1F1F3}\u{1F1F1}',
    'Austria': '\u{1F1E6}\u{1F1F9}', 'Finland': '\u{1F1EB}\u{1F1EE}',
    'New Zealand': '\u{1F1F3}\u{1F1FF}', 'Chinese Taipei': '\u{1F1F9}\u{1F1FC}',
    'Taiwan': '\u{1F1F9}\u{1F1FC}', 'Philippines': '\u{1F1F5}\u{1F1ED}',
    'Zimbabwe': '\u{1F1FF}\u{1F1FC}', 'Venezuela': '\u{1F1FB}\u{1F1EA}',
    'Paraguay': '\u{1F1F5}\u{1F1FE}', 'Puerto Rico': '\u{1F1F5}\u{1F1F7}',
  }
  return flags[country] || null
}

function AuctionInput({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const parsed = parseInt(draft, 10)
    onChange(isNaN(parsed) ? null : parsed)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true) }}
        className="w-12 text-right text-[11px] font-mono text-text-primary/30 hover:text-gold transition-colors shrink-0"
        title="Set auction value"
      >
        {value != null ? `$${value}` : '$\u2014'}
      </button>
    )
  }

  return (
    <div className="flex items-center w-12 shrink-0">
      <span className="text-[11px] font-mono text-gold">$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-9 bg-transparent border-b border-gold/40 text-[11px] font-mono text-gold text-right outline-none"
      />
    </div>
  )
}

function SgCell({ value, label }) {
  if (value == null) return <span className="text-[10px] font-mono text-text-primary/15 w-11 text-center">{'\u2014'}</span>
  const color = value > 0.3 ? 'text-emerald-600 dark:text-emerald-400' : value > 0 ? 'text-emerald-600/60 dark:text-emerald-400/60' : value > -0.3 ? 'text-red-600/60 dark:text-red-400/60' : 'text-red-600 dark:text-red-400'
  return (
    <span className={`text-[10px] font-mono ${color} w-11 text-center`} title={`${label}: ${value > 0 ? '+' : ''}${value.toFixed(2)}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </span>
  )
}

export default function BoardEntryRow({ entry, index, sport, positionRank, leagueStatus, onRemove, onClickNotes, onUpdateTags, onClickPlayer, onUpdateAuctionValue, isWatched, onToggleWatch, isNewlyAdded, compareMode, isCompareSelected, onToggleCompare }) {
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
  const isGolf = sport === 'golf'

  const handleTagToggle = (tagName) => {
    if (!onUpdateTags) return
    if (activeTags.includes(tagName)) {
      onUpdateTags(entry.playerId, [])
    } else {
      onUpdateTags(entry.playerId, [tagName])
    }
  }

  const flag = isGolf ? countryFlag(player.country) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-player-id={entry.playerId}
      onClick={compareMode ? () => onToggleCompare?.(entry) : undefined}
      className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--card-border)] transition-colors group
        ${isDragging ? 'bg-[var(--surface-alt)] shadow-lg' : isCompareSelected ? 'bg-gold/5' : isNewlyAdded ? 'bg-gold/10 animate-pulse' : 'bg-[var(--surface)] hover:bg-[var(--surface-alt)]'}
        ${compareMode ? 'cursor-pointer' : ''}`}
    >
      {/* Compare checkbox */}
      {compareMode && (
        <div className="shrink-0 flex items-center justify-center w-5">
          <div className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center
            ${isCompareSelected ? 'bg-gold border-gold' : 'border-text-primary/20 hover:border-gold/50'}`}>
            {isCompareSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

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

      {/* Auction value */}
      {onUpdateAuctionValue && (
        <AuctionInput
          value={entry.auctionValue}
          onChange={(val) => onUpdateAuctionValue(entry.playerId, val)}
        />
      )}

      {/* Headshot + Country flag */}
      <div className="relative w-8 h-8 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] overflow-hidden">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-xs font-bold">
              {player.name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        {flag && (
          <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none" title={player.country}>
            {flag}
          </span>
        )}
      </div>

      {/* Name (clickable) + League status */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <button
          onClick={(e) => {
            if (compareMode) { e.stopPropagation(); onToggleCompare?.(entry); return }
            onClickPlayer?.(entry.playerId)
          }}
          className="text-sm text-text-primary font-medium truncate hover:underline cursor-pointer text-left"
        >
          {player.name || 'Unknown'}
        </button>
        {leagueStatus && leagueStatus.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {leagueStatus.slice(0, 1).map((ls, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider whitespace-nowrap ${
                  ls.status === 'yours'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400/60 border border-red-500/10'
                }`}
                title={ls.leagueName}
              >
                {ls.status === 'yours' ? 'Your Team' : 'Taken'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tag pills */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
          const isActive = activeTags.includes(key)
          return (
            <button
              key={key}
              onClick={() => handleTagToggle(key)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all
                ${isActive ? cfg.active : cfg.inactive}`}
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
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {player.cpi != null ? (
            <span className={`w-14 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold ${player.cpi >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {player.cpi > 0 ? '+' : ''}{player.cpi.toFixed(1)}
            </span>
          ) : (
            <span className="w-14 text-center text-[10px] font-mono text-text-primary/15">{'\u2014'}</span>
          )}
          <span className="w-11 text-center text-[10px] text-text-primary/50 font-mono">{player.owgrRank ? `#${player.owgrRank}` : '\u2014'}</span>
          <SgCell value={player.sgTotal} label="SG Total" />
          <SgCell value={player.sgOffTee} label="SG Off Tee" />
          <SgCell value={player.sgApproach} label="SG Approach" />
          <SgCell value={player.sgPutting} label="SG Putting" />
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
        className="p-1 text-text-primary/20 hover:text-red-400 transition-colors opacity-40 hover:opacity-100 shrink-0"
        title="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
