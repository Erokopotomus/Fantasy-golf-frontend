import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'

const NFL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function PlayerSearchPanel({ sport, onAdd, existingPlayerIds = [] }) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
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

  const filteredPlayers = players.filter(p => !existingSet.has(p.id))

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[var(--card-border)] space-y-2">
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
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-text-primary/30 text-sm">
            {search ? 'No players found' : 'All players on board'}
          </div>
        ) : (
          filteredPlayers.map(player => (
            <div
              key={player.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-alt)] transition-colors group"
            >
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
                    <>#{player.owgrRank || '—'} {player.sgTotal != null && `· SG ${player.sgTotal > 0 ? '+' : ''}${Number(player.sgTotal).toFixed(1)}`}</>
                  )}
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={() => onAdd(player.id)}
                className="px-2 py-1 text-[10px] font-bold uppercase bg-gold/10 text-gold rounded hover:bg-gold/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                Add
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
