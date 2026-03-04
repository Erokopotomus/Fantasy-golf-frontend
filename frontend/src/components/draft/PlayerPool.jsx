import { useState, useMemo, useCallback } from 'react'
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
  boardEntries = [],
}) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')

  const hasBoard = boardEntries.length > 0

  // Build board lookup (byId + byName)
  const boardLookup = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    for (const e of boardEntries) {
      byId.set(e.playerId, e)
      if (e.player?.name) byName.set(e.player.name.toLowerCase(), e)
    }
    return { byId, byName }
  }, [boardEntries])

  const getBoardEntry = useCallback((player) => {
    return boardLookup.byId.get(player.id) || boardLookup.byName.get(player.name?.toLowerCase())
  }, [boardLookup])

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
        case 'cpi':
          aVal = a.clutchMetrics?.cpi ?? -99
          bVal = b.clutchMetrics?.cpi ?? -99
          break
        case 'sgTotal':
          aVal = a.sgTotal || 0
          bVal = b.sgTotal || 0
          break
        case 'top5':
          aVal = a.top5s || 0
          bVal = b.top5s || 0
          break
        case 'top10':
          aVal = a.top10s || 0
          bVal = b.top10s || 0
          break
        case 'top25':
          aVal = a.top25s || 0
          bVal = b.top25s || 0
          break
        case 'cuts':
          aVal = a.cutsMade || 0
          bVal = b.cutsMade || 0
          break
        case 'boardRank':
          aVal = getBoardEntry(a)?.rank ?? 9999
          bVal = getBoardEntry(b)?.rank ?? 9999
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
  }, [players, search, sortBy, sortDir, getBoardEntry])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'sgTotal' || field === 'top5' || field === 'top10' || field === 'top25' || field === 'cuts' || field === 'cpi' ? 'desc' : 'asc')
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

  // Mobile: hide T5/T10/T25/MC/Form — show Rk, (Bd), Player, CPI, SG, actions
  // Desktop: show all columns
  const gridCols = hasBoard
    ? 'grid-cols-[26px_26px_1fr_36px_40px_44px] sm:grid-cols-[26px_26px_1fr_36px_40px_30px_30px_30px_46px_38px_44px]'
    : 'grid-cols-[26px_1fr_36px_40px_44px] sm:grid-cols-[26px_1fr_36px_40px_30px_30px_30px_46px_38px_44px]'

  return (
    <Card className="h-full flex flex-col" padding="none">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-sm font-semibold font-display text-text-primary">Available Players</h3>
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
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary text-sm focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--card-border)]">
          <div className={`grid ${gridCols} px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide`}>
            <button onClick={() => handleSort('rank')} className="text-left hover:text-text-primary transition-colors" title="Official World Golf Ranking">
              Rk <SortIcon field="rank" />
            </button>
            {hasBoard && (
              <button onClick={() => handleSort('boardRank')} className="text-center hover:text-text-primary transition-colors" title="Your board rank">
                Bd <SortIcon field="boardRank" />
              </button>
            )}
            <button onClick={() => handleSort('name')} className="text-left hover:text-text-primary transition-colors">
              Player <SortIcon field="name" />
            </button>
            <button onClick={() => handleSort('cpi')} className="text-right hover:text-text-primary transition-colors" title="Clutch Performance Index — proprietary rating from -3.0 to +3.0">
              CPI <SortIcon field="cpi" />
            </button>
            <button onClick={() => handleSort('sgTotal')} className="text-right hover:text-text-primary transition-colors" title="Strokes Gained: Total per round vs. field average">
              SG <SortIcon field="sgTotal" />
            </button>
            <button onClick={() => handleSort('top5')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top-5 finishes this season">
              T5 <SortIcon field="top5" />
            </button>
            <button onClick={() => handleSort('top10')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top-10 finishes this season">
              T10 <SortIcon field="top10" />
            </button>
            <button onClick={() => handleSort('top25')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top-25 finishes this season">
              T25 <SortIcon field="top25" />
            </button>
            <button onClick={() => handleSort('cuts')} className="hidden sm:block text-center hover:text-text-primary transition-colors" title="Cuts made / events entered">
              MC <SortIcon field="cuts" />
            </button>
            <span className="hidden sm:block text-center" title="Last 4 tournament finishes (most recent first)">Form</span>
            <div />
          </div>
        </div>

        {/* Player Rows */}
        {filteredPlayers.map((player) => {
          const inQueue = isInQueue(player.id)
          const sgTotal = player.sgTotal || 0
          const boardEntry = hasBoard ? getBoardEntry(player) : null

          return (
            <div
              key={player.id}
              className={`grid ${gridCols} px-3 py-2 border-b border-[var(--card-border)] items-center transition-colors cursor-pointer hover:bg-[var(--surface-alt)] ${
                inQueue ? 'bg-orange/5' : ''
              }`}
              onClick={() => onViewPlayer?.(player)}
            >
              <span className="text-text-muted text-xs">{player.rank || player.owgrRank || '—'}</span>
              {hasBoard && (
                <span className="text-[9px] text-gold/50 font-mono text-center">
                  {boardEntry ? `B${boardEntry.rank}` : ''}
                </span>
              )}
              <div className="flex items-center gap-2 min-w-0">
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-[var(--bg-alt)] flex-shrink-0" />
                ) : (
                  <span className="text-sm flex-shrink-0">{player.countryFlag || '\uD83C\uDFF3\uFE0F'}</span>
                )}
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-text-primary text-sm truncate">{player.name}</span>
                  {player.primaryTour && (
                    <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${
                      player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                      player.primaryTour === 'LIV' ? 'bg-live-red/20 text-live-red' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{player.primaryTour}</span>
                  )}
                  {boardEntry?.tags?.[0] && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      boardEntry.tags[0] === 'target' ? 'bg-field' :
                      boardEntry.tags[0] === 'sleeper' ? 'bg-gold' : 'bg-live-red'
                    }`} />
                  )}
                </div>
              </div>
              <span className={`text-xs text-right font-medium tabular-nums ${
                (player.clutchMetrics?.cpi ?? 0) > 1.5 ? 'text-gold' :
                (player.clutchMetrics?.cpi ?? 0) > 0.5 ? 'text-field' :
                (player.clutchMetrics?.cpi ?? 0) > -0.5 ? 'text-crown' :
                player.clutchMetrics?.cpi != null ? 'text-live-red' : 'text-text-muted'
              }`}>
                {player.clutchMetrics?.cpi != null
                  ? `${player.clutchMetrics.cpi > 0 ? '+' : ''}${player.clutchMetrics.cpi.toFixed(1)}`
                  : '\u2014'}
              </span>
              <span className={`text-xs text-right font-medium tabular-nums ${
                sgTotal >= 1 ? 'text-gold' : sgTotal > 0 ? 'text-text-primary' : 'text-live-red'
              }`}>
                {sgTotal !== 0 ? (sgTotal > 0 ? '+' : '') + sgTotal.toFixed(2) : '\u2014'}
              </span>
              <span className="hidden sm:block text-xs text-right text-text-secondary tabular-nums">
                {player.top5s || '\u2014'}
              </span>
              <span className="hidden sm:block text-xs text-right text-text-secondary tabular-nums">
                {player.top10s || '\u2014'}
              </span>
              <span className="hidden sm:block text-xs text-right text-text-secondary tabular-nums">
                {player.top25s || '\u2014'}
              </span>
              <span className="hidden sm:block text-xs text-center text-text-muted tabular-nums">
                {player.cutsMade || 0}/{player.events || 0}
              </span>
              <div className="hidden sm:flex items-center justify-center gap-1">
                {(player.recentForm || []).slice(0, 4).map((f, i) => {
                  const pos = parseInt(String(f).replace('T', ''))
                  return (
                    <span key={i} className={`w-2 h-2 rounded-full ${
                      f === '1' ? 'bg-crown' :
                      f === 'CUT' ? 'bg-live-red' :
                      pos <= 5 ? 'bg-gold' :
                      pos <= 15 ? 'bg-field/60' :
                      'bg-[var(--card-border)]'
                    }`} title={String(f)} />
                  )
                })}
              </div>
              <div className="flex items-center justify-end gap-1">
                {isUserTurn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectPlayer(player) }}
                    className="px-2 py-1 bg-gold text-text-primary text-[10px] rounded font-semibold hover:bg-gold/80 transition-colors"
                  >
                    {draftType === 'auction' ? 'Nom' : 'Draft'}
                  </button>
                )}
                {!inQueue && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToQueue(player) }}
                    className="p-1 rounded text-text-muted hover:text-orange transition-colors"
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
