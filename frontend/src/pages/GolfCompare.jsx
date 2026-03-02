import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import SgRadarChart from '../components/players/SgRadarChart'
import StatBar from '../components/players/StatBar'

const COLORS = ['#D4930D', '#10B981', '#3B82F6', '#8B5CF6', '#F97316']

const GolfCompare = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [players, setPlayers] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  // Load players from URL on mount
  useEffect(() => {
    const ids = searchParams.get('players')?.split(',').filter(Boolean) || []
    if (ids.length === 0) return
    Promise.all(ids.map(id => api.getPlayer(id).catch(() => null)))
      .then(results => {
        const loaded = results
          .filter(r => r?.player)
          .map(r => r.player)
        setPlayers(loaded)
      })
  }, []) // Only on mount

  // Update URL when players change
  useEffect(() => {
    if (players.length > 0) {
      setSearchParams({ players: players.map(p => p.id).join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [players, setSearchParams])

  // Debounced search
  const handleSearch = useCallback((value) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.getPlayers({ search: value, limit: 8 })
        const playerList = data.players || data || []
        // Filter out already-selected
        const selectedIds = new Set(players.map(p => p.id))
        setResults(playerList.filter(p => !selectedIds.has(p.id)))
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [players])

  const addPlayer = async (result) => {
    if (players.length >= 5) return
    if (players.find(p => p.id === result.id)) return
    setShowDropdown(false)
    setQuery('')
    setResults([])
    // Fetch full player data
    try {
      const data = await api.getPlayer(result.id)
      if (data?.player) {
        setPlayers(prev => [...prev, data.player])
      }
    } catch {
      // If full fetch fails, add the search result directly
      setPlayers(prev => [...prev, result])
    }
  }

  const removePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Comparison data
  const comparisonData = useMemo(() => {
    if (players.length < 2) return null
    const stats = ['sgTotal', 'sgOffTee', 'sgApproach', 'sgAroundGreen', 'sgPutting', 'owgrRank']
    const lowerIsBetter = new Set(['owgrRank'])
    const getStat = (p, stat) => p[stat] ?? p.stats?.[stat] ?? 0
    const comparison = {}
    stats.forEach(stat => {
      const values = players.map(p => getStat(p, stat))
      if (values.every(v => v === 0 || v == null)) return
      const max = Math.max(...values)
      const min = Math.min(...values)
      const range = max - min || 1
      comparison[stat] = players.map(p => {
        const value = getStat(p, stat)
        const percentile = lowerIsBetter.has(stat)
          ? ((max - value) / range) * 100
          : ((value - min) / range) * 100
        return {
          playerId: p.id,
          value,
          percentile: range === 0 ? 50 : percentile,
          isBest: lowerIsBetter.has(stat) ? value === min && value !== 0 : value === max && value !== 0,
        }
      })
    })
    return comparison
  }, [players])

  const statLabels = {
    sgTotal: 'SG: Total',
    sgOffTee: 'SG: Off the Tee',
    sgApproach: 'SG: Approach',
    sgAroundGreen: 'SG: Around Green',
    sgPutting: 'SG: Putting',
    owgrRank: 'OWGR',
  }

  const formatStatValue = (stat, value) => {
    if (stat === 'owgrRank') return value ? `#${value}` : '\u2014'
    return value ? (value > 0 ? '+' : '') + value.toFixed(2) : '\u2014'
  }

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Link to="/golf" className="text-text-muted hover:text-text-primary transition-colors text-sm">Golf</Link>
                  <span className="text-text-muted/30">/</span>
                  <h1 className="text-xl sm:text-2xl font-display font-bold text-text-primary">Compare Players</h1>
                </div>
                <p className="text-text-muted text-xs">Compare up to 5 players head to head. Share via URL.</p>
              </div>
              {players.length >= 2 && (
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/15 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {copied ? 'Copied!' : 'Share'}
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={players.length >= 5 ? 'Max 5 players' : 'Search for a player to add...'}
                disabled={players.length >= 5}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-gold/30 disabled:opacity-50"
              />
              {searching && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && results.length > 0 && (
              <div className="mt-1 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden z-20 relative">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addPlayer(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-alt)] transition-colors text-left"
                  >
                    {p.headshotUrl ? (
                      <img src={p.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-[var(--stone)]" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--stone)] flex items-center justify-center text-xs">
                        {p.countryFlag || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{p.name}</p>
                      <p className="text-[10px] text-text-muted">{p.country || ''}{p.owgrRank ? ` — OWGR #${p.owgrRank}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Player Chips */}
            {players.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {players.map((p, pi) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full bg-[var(--surface)] border border-[var(--card-border)]"
                    style={{ borderColor: COLORS[pi % COLORS.length] + '40' }}
                  >
                    {p.headshotUrl ? (
                      <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="text-[10px] w-5 h-5 rounded-full bg-[var(--stone)] flex items-center justify-center">{p.countryFlag || '?'}</span>
                    )}
                    <span className="text-xs font-medium text-text-primary">{p.name?.split(' ').pop()}</span>
                    <button onClick={() => removePlayer(p.id)} className="text-text-muted hover:text-live-red transition-colors ml-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty State */}
          {players.length < 2 && (
            <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-display font-bold text-text-primary mb-2">Head-to-Head Compare</h2>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                Search for 2-5 players above to compare their Strokes Gained profile, Clutch metrics, and season stats side by side. Share the URL with anyone.
              </p>
            </div>
          )}

          {/* Comparison Content */}
          {players.length >= 2 && (
            <div className="space-y-6">
              {/* SG Radar Chart */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-4">Strokes Gained DNA</h3>
                <SgRadarChart players={players} size={360} />
              </div>

              {/* Clutch Metrics Grid */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-4">Clutch Metrics</h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
                  {players.map((p, pi) => (
                    <div
                      key={p.id}
                      className="bg-[var(--bg-alt)] rounded-lg p-3 text-center"
                      style={{ borderTop: `3px solid ${COLORS[pi % COLORS.length]}` }}
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--surface)] overflow-hidden mx-auto mb-2">
                        {p.headshotUrl ? (
                          <img src={p.headshotUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-primary/20 text-sm font-bold">
                            {p.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-text-primary truncate">{p.name}</p>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-text-muted">CPI</span>
                          <span className={`text-xs font-mono font-bold ${(p.cpi || 0) >= 0 ? 'text-field' : 'text-live-red'}`}>
                            {p.cpi != null ? (p.cpi > 0 ? '+' : '') + p.cpi.toFixed(1) : '\u2014'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-text-muted">Form</span>
                          <span className="text-xs font-mono font-bold text-text-primary">
                            {p.formScore != null ? Math.round(p.formScore) : (p.stats?.formScore != null ? Math.round(p.stats.formScore) : '\u2014')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-text-muted">Pressure</span>
                          <span className="text-xs font-mono font-bold text-text-primary">
                            {p.pressureScore != null ? p.pressureScore.toFixed(1) : (p.stats?.pressureScore != null ? p.stats.pressureScore.toFixed(1) : '\u2014')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stat Comparison Bars */}
              {comparisonData && Object.keys(comparisonData).length > 0 && (
                <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-5">
                  <h3 className="text-sm font-bold text-text-primary mb-4">Stat Comparison</h3>
                  <div className="space-y-4">
                    {Object.entries(comparisonData).map(([stat, data]) => (
                      <div key={stat}>
                        <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">{statLabels[stat] || stat}</p>
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
                          {data.map((item) => {
                            const player = players.find(p => p.id === item.playerId)
                            return (
                              <div key={item.playerId}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] text-text-muted truncate">{player?.name?.split(' ').pop()}</span>
                                  <span className={`text-[10px] font-mono font-medium ${item.isBest ? 'text-gold' : 'text-text-primary'}`}>
                                    {formatStatValue(stat, item.value)}
                                  </span>
                                </div>
                                <StatBar value={item.percentile} maxValue={100} isBest={item.isBest} showValue={false} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Season Stats */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-4">Season Stats</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] text-text-muted">
                        <th className="text-left py-2 pr-3 font-medium">Stat</th>
                        {players.map((p, pi) => (
                          <th key={p.id} className="text-center py-2 px-2 font-medium" style={{ color: COLORS[pi % COLORS.length] }}>
                            {p.name?.split(' ').pop()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {[
                        { label: 'Events', getter: p => p.seasonStats?.events ?? p.stats?.events ?? '—' },
                        { label: 'Wins', getter: p => p.seasonStats?.wins ?? p.stats?.wins ?? '—' },
                        { label: 'Top 5s', getter: p => p.seasonStats?.top5s ?? p.stats?.top5s ?? '—' },
                        { label: 'Top 10s', getter: p => p.seasonStats?.top10s ?? p.stats?.top10s ?? '—' },
                        { label: 'Cuts Made', getter: p => p.seasonStats?.cutsMade ?? p.stats?.cutsMade ?? '—' },
                        { label: 'OWGR', getter: p => p.owgrRank ? `#${p.owgrRank}` : '—' },
                      ].map(row => (
                        <tr key={row.label}>
                          <td className="py-2 pr-3 text-text-muted font-medium">{row.label}</td>
                          {players.map(p => (
                            <td key={p.id} className="py-2 px-2 text-center font-mono text-text-primary">
                              {row.getter(p)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Form */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-4">Recent Form</h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
                  {players.map((p, pi) => {
                    const recent = p.recentResults || p.stats?.recentResults || []
                    return (
                      <div key={p.id}>
                        <p className="text-[10px] font-medium text-text-muted mb-2 truncate" style={{ color: COLORS[pi % COLORS.length] }}>
                          {p.name?.split(' ').pop()}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {recent.length > 0 ? recent.slice(0, 5).map((r, ri) => {
                            const pos = r.position || r.pos
                            const label = r.status === 'CUT' ? 'CUT' : pos ? (pos <= 5 ? `T${pos}` : `${pos}`) : '—'
                            const isGood = pos && pos <= 10
                            const isCut = r.status === 'CUT'
                            return (
                              <span key={ri} className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isCut ? 'bg-live-red/10 text-live-red' :
                                isGood ? 'bg-field-bright/10 text-field' :
                                'bg-[var(--stone)] text-text-muted'
                              }`}>
                                {label}
                              </span>
                            )
                          }) : (
                            <span className="text-[10px] text-text-muted">No recent data</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default GolfCompare
