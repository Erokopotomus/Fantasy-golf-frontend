import { useState, useMemo, useCallback } from 'react'
import Button from '../common/Button'
import Card from '../common/Card'

// Color scale helper for stats — green (elite) to red (poor)
// Provides both text color and background pill styling
const getStatColor = (value, thresholds) => {
  if (value == null) return { text: 'text-text-muted', pill: '' }
  if (value >= thresholds[0]) return { text: 'text-emerald-400', pill: 'bg-emerald-500/15' } // elite
  if (value >= thresholds[1]) return { text: 'text-green-400', pill: 'bg-green-500/10' }     // good
  if (value >= thresholds[2]) return { text: 'text-text-primary', pill: '' }                 // average
  if (value >= thresholds[3]) return { text: 'text-orange-400', pill: 'bg-orange-500/10' }   // below avg
  return { text: 'text-red-400', pill: 'bg-red-500/15' }                                     // poor
}

// CPI thresholds: [-3.0 to +3.0]
const CPI_THRESHOLDS = [1.5, 0.5, -0.3, -1.0]

// SG Total thresholds
const SG_THRESHOLDS = [1.5, 0.5, 0, -0.5]

const TOUR_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'PGA', label: 'PGA' },
  { key: 'LIV', label: 'LIV' },
  { key: 'DP World', label: 'DP World' },
]

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
  const [tourFilter, setTourFilter] = useState('all')

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

    // Tour filter
    if (tourFilter !== 'all') {
      result = result.filter(p => p.primaryTour === tourFilter)
    }

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
  }, [players, search, sortBy, sortDir, getBoardEntry, tourFilter])

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
  // Desktop: show all columns (added Evts column)
  // Action column widened from 44px → 56px to prevent Draft button + bookmark overlap
  const gridCols = hasBoard
    ? 'grid-cols-[26px_26px_1fr_36px_40px_56px] sm:grid-cols-[26px_26px_1fr_36px_40px_30px_30px_30px_30px_46px_38px_56px]'
    : 'grid-cols-[26px_1fr_36px_40px_56px] sm:grid-cols-[26px_1fr_36px_40px_30px_30px_30px_30px_46px_38px_56px]'

  return (
    <Card className="h-full flex flex-col" padding="none">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-sm font-semibold font-display text-text-primary">Available Players</h3>
        <span className="text-text-muted text-xs">
          {filteredPlayers.length} available
        </span>
      </div>

      {/* Tour Filter Pills */}
      <div className="flex items-center gap-1 px-3 pb-1.5">
        {TOUR_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTourFilter(tf.key)}
            className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-colors ${
              tourFilter === tf.key
                ? 'bg-gold text-[var(--bg)] shadow-sm'
                : 'bg-[var(--bg-alt)] text-text-muted hover:text-text-primary hover:bg-[var(--card-border)]'
            }`}
          >
            {tf.label}
          </button>
        ))}
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
            <button onClick={() => handleSort('rank')} className="text-left hover:text-text-primary transition-colors" title="OWGR — Official World Golf Ranking">
              Rk <SortIcon field="rank" />
            </button>
            {hasBoard && (
              <button onClick={() => handleSort('boardRank')} className="text-center hover:text-text-primary transition-colors" title="Board Rank — Your personal ranking from The Lab draft board">
                Bd <SortIcon field="boardRank" />
              </button>
            )}
            <button onClick={() => handleSort('name')} className="text-left hover:text-text-primary transition-colors" title="Player name and tour">
              Player <SortIcon field="name" />
            </button>
            <button onClick={() => handleSort('cpi')} className="text-right hover:text-text-primary transition-colors" title="Clutch Performance Index — Proprietary rating from -3.0 to +3.0 blending form, pressure, and consistency">
              CPI <SortIcon field="cpi" />
            </button>
            <button onClick={() => handleSort('sgTotal')} className="text-right hover:text-text-primary transition-colors" title="Strokes Gained Total — Average strokes gained per round vs field. Higher is better.">
              SG <SortIcon field="sgTotal" />
            </button>
            <button onClick={() => handleSort('top5')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top 5 finishes this season">
              T5 <SortIcon field="top5" />
            </button>
            <button onClick={() => handleSort('top10')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top 10 finishes this season">
              T10 <SortIcon field="top10" />
            </button>
            <button onClick={() => handleSort('top25')} className="hidden sm:block text-right hover:text-text-primary transition-colors" title="Top 25 finishes this season">
              T25 <SortIcon field="top25" />
            </button>
            <button onClick={() => handleSort('cuts')} className="hidden sm:block text-center hover:text-text-primary transition-colors" title="Cuts Made / Events Entered this season">
              MC <SortIcon field="cuts" />
            </button>
            <span className="hidden sm:block text-center" title="Recent tournament finishes — Gold=Win, Yellow=Top 5, Green=Top 15, Gray=Other, Red=Cut">Form</span>
            <span className="hidden sm:block text-right" title="Events played last season (prior year)">Evts</span>
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
                  {/* TODO: player.inNextField not yet populated from backend — show indicator when available */}
                  {player.inNextField && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-field" title="In next tournament field" />
                  )}
                  {boardEntry?.tags?.[0] && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      boardEntry.tags[0] === 'target' ? 'bg-field' :
                      boardEntry.tags[0] === 'sleeper' ? 'bg-gold' : 'bg-live-red'
                    }`} />
                  )}
                </div>
              </div>
              {(() => {
                const cpi = player.clutchMetrics?.cpi ?? null
                const colors = getStatColor(cpi, CPI_THRESHOLDS)
                return (
                  <span className={`text-xs text-right font-medium tabular-nums px-1 py-0.5 rounded ${colors.text} ${colors.pill}`}>
                    {cpi != null
                      ? `${cpi > 0 ? '+' : ''}${cpi.toFixed(1)}`
                      : '\u2014'}
                  </span>
                )
              })()}
              {(() => {
                const colors = getStatColor(sgTotal || null, SG_THRESHOLDS)
                return (
                  <span className={`text-xs text-center font-medium tabular-nums px-1 py-0.5 rounded ${colors.text} ${colors.pill}`}>
                    {sgTotal !== 0 ? (sgTotal > 0 ? '+' : '') + sgTotal.toFixed(2) : '\u2014'}
                  </span>
                )
              })()}
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
              <span className="hidden sm:block text-xs text-right text-text-muted tabular-nums">
                {player.events || '\u2014'}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                {isUserTurn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectPlayer(player) }}
                    className="px-2 py-1 bg-gold text-text-primary text-[10px] rounded font-semibold hover:bg-gold/80 transition-colors whitespace-nowrap"
                  >
                    {draftType === 'auction' ? 'Nom' : 'Draft'}
                  </button>
                )}
                {!inQueue && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToQueue(player) }}
                    className="p-1 rounded text-text-muted hover:text-orange transition-colors flex-shrink-0"
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
