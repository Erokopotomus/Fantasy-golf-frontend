import { useMemo } from 'react'

// Color scale helpers (same thresholds as PlayerPool)
const getCpiColor = (value) => {
  if (value == null) return 'text-text-muted'
  if (value >= 1.5) return 'text-emerald-400'
  if (value >= 0.5) return 'text-green-400'
  if (value >= -0.3) return 'text-text-primary'
  if (value >= -1.0) return 'text-orange-400'
  return 'text-red-400'
}

const getSgColor = (value) => {
  if (value == null || value === 0) return 'text-text-muted'
  if (value >= 1.5) return 'text-emerald-400'
  if (value >= 0.5) return 'text-green-400'
  if (value >= 0) return 'text-text-primary'
  if (value >= -0.5) return 'text-orange-400'
  return 'text-red-400'
}

const BestAvailableStrip = ({ players, boardEntries = [], isUserTurn, onViewPlayer }) => {
  // Build board lookup
  const boardLookup = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    for (const e of boardEntries) {
      byId.set(e.playerId, e)
      if (e.player?.name) byName.set(e.player.name.toLowerCase(), e)
    }
    return { byId, byName }
  }, [boardEntries])

  const getBoardEntry = (player) => {
    return boardLookup.byId.get(player.id) || boardLookup.byName.get(player.name?.toLowerCase())
  }

  const hasBoard = boardEntries.length > 0

  // Sort: board rank first if board exists, else CPI desc -> SG Total desc -> OWGR asc
  const topPlayers = useMemo(() => {
    const available = players.filter(p => !p.drafted)

    const sorted = [...available].sort((a, b) => {
      if (hasBoard) {
        const aEntry = getBoardEntry(a)
        const bEntry = getBoardEntry(b)
        const aRank = aEntry?.rank ?? 9999
        const bRank = bEntry?.rank ?? 9999
        if (aRank !== bRank) return aRank - bRank
      }

      // CPI descending
      const aCpi = a.clutchMetrics?.cpi ?? -99
      const bCpi = b.clutchMetrics?.cpi ?? -99
      if (aCpi !== bCpi) return bCpi - aCpi

      // SG Total descending
      const aSg = a.sgTotal || 0
      const bSg = b.sgTotal || 0
      if (aSg !== bSg) return bSg - aSg

      // OWGR ascending
      const aOwgr = a.rank || a.owgrRank || 999
      const bOwgr = b.rank || b.owgrRank || 999
      return aOwgr - bOwgr
    })

    return sorted.slice(0, 5)
  }, [players, boardEntries, hasBoard])

  if (topPlayers.length === 0) return null

  return (
    <div className="shrink-0">
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b ${
        isUserTurn
          ? 'bg-gold/15 border-gold/30'
          : 'bg-[var(--surface)] border-[var(--card-border)]'
      }`}>
        <svg className={`w-3.5 h-3.5 ${isUserTurn ? 'text-gold' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${
          isUserTurn ? 'text-gold' : 'text-text-muted'
        }`}>
          {isUserTurn ? 'Recommended Picks' : 'Top Available'}
        </span>
      </div>

      {/* Scrollable cards */}
      <div className="flex gap-2 px-2 py-2 overflow-x-auto bg-[var(--surface)] rounded-b-lg border border-t-0 border-[var(--card-border)]">
        {topPlayers.map((player) => {
          const cpi = player.clutchMetrics?.cpi ?? null
          const sgTotal = player.sgTotal || 0
          const owgr = player.rank || player.owgrRank || null
          const boardEntry = hasBoard ? getBoardEntry(player) : null

          return (
            <button
              key={player.id}
              onClick={() => onViewPlayer?.(player)}
              className={`flex-shrink-0 w-[120px] rounded-lg p-2 border transition-colors text-left hover:bg-[var(--bg-alt)] ${
                isUserTurn
                  ? 'border-gold/30 hover:border-gold/60'
                  : 'border-[var(--card-border)] hover:border-text-muted'
              }`}
            >
              {/* Headshot or flag */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-[var(--bg-alt)] flex-shrink-0" />
                ) : (
                  <span className="text-sm flex-shrink-0">{player.countryFlag || '\uD83C\uDFF3\uFE0F'}</span>
                )}
                {boardEntry && (
                  <span className="text-[8px] font-mono text-gold/60">B{boardEntry.rank}</span>
                )}
              </div>

              {/* Player name */}
              <p className="text-xs font-medium text-text-primary truncate leading-tight">
                {player.name}
              </p>

              {/* Stat pills */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {cpi != null && (
                  <span className={`text-[9px] font-mono font-medium px-1 py-0.5 rounded bg-[var(--bg-alt)] ${getCpiColor(cpi)}`}>
                    CPI {cpi > 0 ? '+' : ''}{cpi.toFixed(1)}
                  </span>
                )}
                {sgTotal !== 0 && (
                  <span className={`text-[9px] font-mono font-medium px-1 py-0.5 rounded bg-[var(--bg-alt)] ${getSgColor(sgTotal)}`}>
                    SG {sgTotal > 0 ? '+' : ''}{sgTotal.toFixed(1)}
                  </span>
                )}
              </div>

              {/* OWGR rank */}
              {owgr && (
                <p className="text-[9px] text-text-muted mt-1 font-mono">
                  OWGR #{owgr}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BestAvailableStrip
