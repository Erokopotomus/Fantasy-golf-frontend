import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'

const NFL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

// Find where a player would slot into the board based on OWGR/SG
function suggestPosition(player, entries, sport) {
  if (!entries || entries.length === 0) return 1

  if (sport === 'golf') {
    // Try OWGR first — find position where this player's OWGR fits
    const owgr = player.owgrRank
    if (owgr) {
      for (let i = 0; i < entries.length; i++) {
        const entryOwgr = entries[i].player?.owgrRank
        if (entryOwgr && owgr < entryOwgr) return i + 1
      }
    }
    // Fallback to SG Total
    const sg = player.sgTotal
    if (sg != null) {
      for (let i = 0; i < entries.length; i++) {
        const entrySg = entries[i].player?.sgTotal
        if (entrySg != null && sg > entrySg) return i + 1
      }
    }
  } else {
    // NFL: use fantasy points per game
    const ppg = player.fantasyPtsPerGame || player.fantasyPtsPpr
    if (ppg) {
      for (let i = 0; i < entries.length; i++) {
        const entryPpg = entries[i].player?.fantasyPtsPerGame || entries[i].player?.fantasyPtsPpr
        if (entryPpg != null && ppg > entryPpg) return i + 1
      }
    }
  }

  // Default: end of board
  return entries.length + 1
}

export default function PlayerSearchPanel({ sport, onAdd, existingPlayerIds = [], compact = false, entryCount = 0, entries = [] }) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingPlayerId, setAddingPlayerId] = useState(null) // which player has position picker open
  const [insertPos, setInsertPos] = useState('')
  const insertInputRef = useRef(null)
  const debounceRef = useRef(null)
  const existingSet = new Set(existingPlayerIds)

  const fetchPlayers = useCallback(async (query, pos) => {
    setLoading(true)
    try {
      if (sport === 'nfl') {
        const opts = { limit: 50, sortBy: 'fantasyPtsPpr', sortOrder: 'desc' }
        if (query) opts.search = query
        if (pos) opts.position = pos
        const data = await api.getNflPlayers(opts)
        setPlayers(data.players || [])
      } else {
        const opts = { limit: 50 }
        if (query) opts.search = query
        const data = await api.getPlayers(opts)
        setPlayers(data.players || data || [])
      }
    } catch (err) {
      console.error('Player search failed:', err)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [sport])

  // Initial load
  useEffect(() => { fetchPlayers('', null) }, [fetchPlayers])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPlayers(search, position)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, position, fetchPlayers])

  // Focus the position input when picker opens
  useEffect(() => {
    if (addingPlayerId && insertInputRef.current) {
      insertInputRef.current.focus()
      insertInputRef.current.select()
    }
  }, [addingPlayerId])

  const handleAddClick = (player) => {
    if (entryCount === 0) {
      // Empty board, just add
      onAdd(player.id, 1)
      return
    }
    const suggested = suggestPosition(player, entries, sport)
    setAddingPlayerId(player.id)
    setInsertPos(String(suggested))
  }

  const confirmAdd = (playerId) => {
    const pos = parseInt(insertPos, 10)
    const targetPos = (isNaN(pos) || pos < 1) ? entryCount + 1 : Math.min(pos, entryCount + 1)
    onAdd(playerId, targetPos)
    setAddingPlayerId(null)
    setInsertPos('')
  }

  const cancelAdd = () => {
    setAddingPlayerId(null)
    setInsertPos('')
  }

  const filteredPlayers = players.filter(p => !existingSet.has(p.id))

  return (
    <div className={`flex flex-col ${compact ? '' : 'h-full'}`}>
      {/* Search */}
      <div className={`p-3 ${compact ? '' : 'border-b border-[var(--card-border)]'} space-y-2`}>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50"
          />
        </div>

        {/* Position filter pills (NFL only) */}
        {sport === 'nfl' && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setPosition(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                !position ? 'bg-gold/20 text-gold' : 'bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
              }`}
            >
              All
            </button>
            {NFL_POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setPosition(position === pos ? null : pos)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  position === pos ? 'bg-gold/20 text-gold' : 'bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player list */}
      <div className={`${compact ? 'max-h-48' : 'flex-1'} overflow-y-auto`}>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          compact ? (
            search ? (
              <p className="text-text-primary/30 text-xs text-center py-3">No players found</p>
            ) : null
          ) : (
            <div className="text-center py-12 px-6">
              {search ? (
                <p className="text-text-primary/30 text-sm">No players found</p>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-3)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-[var(--text-2)] mb-1">Board is fully loaded</p>
                  <p className="text-xs text-[var(--text-3)]">
                    All top players are on your board. Search by name to find and add anyone else.
                  </p>
                </>
              )}
            </div>
          )
        ) : (
          filteredPlayers.map(player => {
            const isPickerOpen = addingPlayerId === player.id
            const suggested = entryCount > 0 ? suggestPosition(player, entries, sport) : 1

            return (
              <div key={player.id}>
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-alt)] transition-colors">
                  {/* Headshot */}
                  <div className="w-7 h-7 rounded-full bg-[var(--bg-alt)] overflow-hidden shrink-0">
                    {player.headshotUrl ? (
                      <img src={player.headshotUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-[10px] font-bold">
                        {player.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{player.name}</div>
                    <div className="text-[11px] text-text-primary/40">
                      {sport === 'nfl' ? (
                        <>{player.nflPosition || player.position} {player.nflTeamAbbr || player.team && `· ${player.nflTeamAbbr || player.team}`}</>
                      ) : (
                        <>#{player.owgrRank || '\u2014'} {player.sgTotal != null && `· SG ${player.sgTotal > 0 ? '+' : ''}${Number(player.sgTotal).toFixed(1)}`}</>
                      )}
                    </div>
                  </div>

                  {/* Add button */}
                  {isPickerOpen ? (
                    <button
                      onClick={cancelAdd}
                      className="px-2 py-1 text-[10px] font-bold uppercase text-text-primary/30 hover:text-text-primary/50 transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddClick(player)}
                      className="px-2 py-1 text-[10px] font-bold uppercase bg-gold/10 text-gold rounded hover:bg-gold/20 transition-colors shrink-0"
                      title={entryCount > 0 ? `Suggested: #${suggested}` : 'Add to board'}
                    >
                      Add {entryCount > 0 ? `~#${suggested}` : ''}
                    </button>
                  )}
                </div>

                {/* Inline position picker */}
                {isPickerOpen && (
                  <div className="flex items-center gap-2 px-3 pb-2 pl-12">
                    <span className="text-[10px] text-text-primary/40">Insert at #</span>
                    <input
                      ref={insertInputRef}
                      type="text"
                      inputMode="numeric"
                      value={insertPos}
                      onChange={e => setInsertPos(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmAdd(player.id)
                        if (e.key === 'Escape') cancelAdd()
                      }}
                      className="w-12 px-1.5 py-0.5 text-xs font-mono text-gold bg-gold/5 border border-gold/30 rounded text-center outline-none focus:border-gold/60"
                    />
                    <button
                      onClick={() => confirmAdd(player.id)}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase bg-gold text-[var(--bg)] rounded hover:bg-gold/90 transition-colors"
                    >
                      Go
                    </button>
                    <span className="text-[9px] text-text-primary/20">of {entryCount + 1}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
