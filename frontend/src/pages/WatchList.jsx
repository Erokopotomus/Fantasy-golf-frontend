import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function WatchList() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')

  useEffect(() => {
    api.getWatchList()
      .then(data => { setEntries(data.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleRemove = async (playerId) => {
    setEntries(prev => prev.filter(e => e.playerId !== playerId))
    try {
      await api.removeFromWatchList(playerId)
    } catch (err) {
      // Refetch on failure
      const data = await api.getWatchList()
      setEntries(data.entries || [])
    }
  }

  const filtered = sportFilter === 'all'
    ? entries
    : entries.filter(e => e.sport === sportFilter)

  const sportCounts = { nfl: 0, golf: 0 }
  entries.forEach(e => { if (sportCounts[e.sport] !== undefined) sportCounts[e.sport]++ })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Watch List</h1>
          <p className="text-xs text-text-primary/40 mt-0.5">{entries.length} players tracked</p>
        </div>
        <Link to="/lab" className="text-xs text-gold hover:underline">The Lab</Link>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: entries.length },
          { key: 'nfl', label: 'NFL', count: sportCounts.nfl },
          { key: 'golf', label: 'Golf', count: sportCounts.golf },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setSportFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${sportFilter === f.key ? 'bg-gold/15 text-gold border border-gold/30' : 'text-text-primary/40 border border-stone/30 hover:border-stone/50'}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-text-primary/10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm text-text-primary/40">No players on your watch list yet</p>
          <p className="text-xs text-text-primary/25 mt-1">Star players from their profile pages or board editor</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(entry => {
            const p = entry.player || {}
            const profileUrl = entry.sport === 'nfl' ? `/nfl/players/${entry.playerId}` : `/players/${entry.playerId}`
            return (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-secondary/40 hover:bg-dark-secondary/80 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-dark-primary overflow-hidden shrink-0">
                  {p.headshotUrl ? (
                    <img src={p.headshotUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-xs font-bold">
                      {p.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <Link to={profileUrl} className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary font-medium truncate block">{p.name || 'Unknown'}</span>
                  <span className="text-[10px] text-text-primary/40">
                    {p.position && `${p.position} `}{p.team && `${p.team} `}
                    {entry.sport === 'nfl' ? 'NFL' : 'Golf'}
                  </span>
                </Link>
                <span className="text-[10px] text-text-primary/20">{new Date(entry.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleRemove(entry.playerId)}
                  className="p-1 text-gold hover:text-gold/60 transition-colors shrink-0"
                  title="Remove from watch list"
                >
                  <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
