import { useState, useMemo } from 'react'
import Button from '../common/Button'
import Card from '../common/Card'

const PlayerPool = ({
  players,
  onSelectPlayer,
  onAddToQueue,
  isUserTurn,
  queue,
  draftType,
  onViewPlayer,
}) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')

  const filteredPlayers = useMemo(() => {
    let result = players.filter(p => !p.drafted)

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.country || '').toLowerCase().includes(searchLower)
      )
    }

    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'sgTotal':
          aVal = a.sgTotal || 0
          bVal = b.sgTotal || 0
          break
        case 'top10':
          aVal = a.events > 0 ? (a.top10s || 0) / a.events : 0
          bVal = b.events > 0 ? (b.top10s || 0) / b.events : 0
          break
        default:
          aVal = a.rank || a.owgrRank || 999
          bVal = b.rank || b.owgrRank || 999
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [players, search, sortBy, sortDir])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'sgTotal' || field === 'top10' ? 'desc' : 'asc')
    }
  }

  const isInQueue = (playerId) => queue.some(p => p.id === playerId)

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null
    return (
      <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    )
  }

  return (
    <Card className="h-full flex flex-col" padding="none">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-sm font-semibold text-white">Available Players</h3>
        <span className="text-text-muted text-xs">
          {filteredPlayers.length} available
        </span>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-accent-green focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Header */}
        <div className="sticky top-0 bg-dark-secondary z-10 border-b border-dark-border">
          <div className="grid grid-cols-[30px_1fr_44px_36px_30px_44px_48px] px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
            <button onClick={() => handleSort('rank')} className="text-left hover:text-white transition-colors">
              Rk <SortIcon field="rank" />
            </button>
            <button onClick={() => handleSort('name')} className="text-left hover:text-white transition-colors">
              Player <SortIcon field="name" />
            </button>
            <button onClick={() => handleSort('sgTotal')} className="text-right hover:text-white transition-colors">
              SG <SortIcon field="sgTotal" />
            </button>
            <button onClick={() => handleSort('top10')} className="text-right hover:text-white transition-colors">
              T10 <SortIcon field="top10" />
            </button>
            <span className="text-center">Evt</span>
            <span className="text-center">Form</span>
            <div />
          </div>
        </div>

        {/* Player Rows */}
        {filteredPlayers.map((player) => {
          const inQueue = isInQueue(player.id)
          const sgTotal = player.sgTotal || 0
          const top10Pct = player.events > 0 ? Math.round((player.top10s || 0) / player.events * 100) : 0

          return (
            <div
              key={player.id}
              className={`grid grid-cols-[30px_1fr_44px_36px_30px_44px_48px] px-3 py-2 border-b border-dark-border/30 items-center transition-colors cursor-pointer hover:bg-dark-tertiary/50 ${
                inQueue ? 'bg-accent-blue/5' : ''
              }`}
              onClick={() => onViewPlayer?.(player)}
            >
              <span className="text-text-muted text-xs">{player.rank || player.owgrRank || '—'}</span>
              <div className="flex items-center gap-2 min-w-0">
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                ) : (
                  <span className="text-sm flex-shrink-0">{player.countryFlag || '🏳️'}</span>
                )}
                <div className="min-w-0">
                  <span className="text-white text-sm truncate block">{player.name}</span>
                  {player.primaryTour && (
                    <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                      player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                      player.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{player.primaryTour}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs text-right font-medium tabular-nums ${
                sgTotal >= 1 ? 'text-accent-green' : sgTotal > 0 ? 'text-white' : 'text-red-400'
              }`}>
                {sgTotal !== 0 ? (sgTotal > 0 ? '+' : '') + sgTotal.toFixed(2) : '—'}
              </span>
              <span className="text-xs text-right text-text-secondary tabular-nums">
                {top10Pct > 0 ? `${top10Pct}%` : '—'}
              </span>
              <span className="text-xs text-center text-text-muted tabular-nums">
                {player.events || '—'}
              </span>
              <div className="flex items-center justify-center gap-1">
                {(player.recentForm || []).slice(0, 4).map((f, i) => {
                  const pos = parseInt(String(f).replace('T', ''))
                  return (
                    <span key={i} className={`w-2 h-2 rounded-full ${
                      f === '1' ? 'bg-yellow-400' :
                      f === 'CUT' ? 'bg-red-400' :
                      pos <= 5 ? 'bg-accent-green' :
                      pos <= 15 ? 'bg-emerald-400/60' :
                      'bg-text-muted/30'
                    }`} title={String(f)} />
                  )
                })}
              </div>
              <div className="flex items-center justify-end gap-1">
                {isUserTurn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectPlayer(player) }}
                    className="px-2 py-1 bg-accent-green text-white text-[10px] rounded font-semibold hover:bg-accent-green/80 transition-colors"
                  >
                    {draftType === 'auction' ? 'Nom' : 'Draft'}
                  </button>
                )}
                {!inQueue && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToQueue(player) }}
                    className="p-1 rounded text-text-muted hover:text-accent-blue transition-colors"
                    title="Add to queue"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            {search ? 'No players match your search' : 'No players available'}
          </div>
        )}
      </div>
    </Card>
  )
}

export default PlayerPool
