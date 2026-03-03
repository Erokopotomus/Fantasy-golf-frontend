import { useMemo } from 'react'
import PredictionCell from './PredictionCell'

/**
 * CompactSlateTable — Horizontal prediction table for the Prove It slate.
 *
 * Columns: Player | CPI | Fit | Winner | Top 5/10/20 | Cut | SG O/U
 * CPI and Fit are read-only data columns. Prediction columns use dual-button cells.
 */

// ─── Column definitions ──────────────────────────────────────────────────────
const PRED_COLUMNS = [
  { key: 'winner',  label: 'Winner', shortLabel: 'W',   type: 'tournament_winner', columnType: 'winner' },
  { key: 'top_5',   label: 'Top 5',  shortLabel: 'T5',  type: 'top_5',             columnType: 'top' },
  { key: 'top_10',  label: 'Top 10', shortLabel: 'T10', type: 'top_10',            columnType: 'top' },
  { key: 'top_20',  label: 'Top 20', shortLabel: 'T20', type: 'top_20',            columnType: 'top' },
  { key: 'cut',     label: 'Cut',    shortLabel: 'Cut', type: 'make_cut',          columnType: 'cut' },
  { key: 'sg',      label: 'SG O/U', shortLabel: 'SG',  type: 'player_benchmark',  columnType: 'sg' },
]

// Color helpers for CPI and Fit
function cpiColor(v) {
  if (v == null) return 'text-text-primary/25'
  if (v >= 1.5) return 'text-field'
  if (v >= 0.5) return 'text-field/70'
  if (v > -0.5) return 'text-text-primary/50'
  if (v > -1.5) return 'text-live-red/70'
  return 'text-live-red'
}

function fitColor(v) {
  if (v == null) return 'text-text-primary/25'
  if (v >= 80) return 'text-field'
  if (v >= 60) return 'text-field/70'
  if (v >= 40) return 'text-text-primary/50'
  return 'text-live-red/70'
}

export default function CompactSlateTable({
  players,
  predictions,
  inflight,
  onCellTap,
  onPlayerClick,
}) {
  // ─── Build prediction lookup: key = "${playerId}_${predType}" ────────────
  const { predLookup, winnerPlayerId } = useMemo(() => {
    const lookup = {}
    let winnerId = null

    for (const pred of predictions) {
      const key = `${pred.subjectPlayerId}_${pred.predictionType}`
      lookup[key] = pred

      if (pred.predictionType === 'tournament_winner') {
        winnerId = pred.subjectPlayerId
      }
    }

    return { predLookup: lookup, winnerPlayerId: winnerId }
  }, [predictions])

  if (!players || players.length === 0) {
    return null
  }

  const thBase = 'px-1 py-2 text-center text-[10px] font-semibold text-text-primary/40 uppercase tracking-wider bg-[var(--surface)]'

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[620px]">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <thead className="sticky top-0 z-20">
          <tr>
            {/* Player column header */}
            <th className="sticky left-0 z-30 bg-[var(--surface)] text-left px-2 py-2 text-[10px] font-semibold text-text-primary/40 uppercase tracking-wider border-r border-[var(--card-border)]">
              Player
            </th>

            {/* Data columns */}
            <th className={thBase} title="Clutch Performance Index">CPI</th>
            <th className={thBase} title="Course Fit Score">Fit</th>

            {/* Prediction column headers */}
            {PRED_COLUMNS.map(col => (
              <th key={col.key} className={thBase} title={col.label}>
                <span className="sm:hidden">{col.shortLabel}</span>
                <span className="hidden sm:inline">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <tbody>
          {players.map(player => {
            const lastName = player.name?.split(' ').pop() || player.name || '?'
            const initial = player.name?.charAt(0) || '?'
            const sgBenchmark = Math.round((player.sgTotal || 0) * 10) / 10
            const cpi = player.cpi
            const fit = player.courseFitScore

            return (
              <tr
                key={player.id}
                className="group border-b border-[var(--card-border)] hover:bg-[var(--bg-alt)] h-[42px]"
              >
                {/* Player column — sticky left */}
                <td className="sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--bg-alt)] transition-colors px-2 py-1 border-r border-[var(--card-border)]">
                  <button
                    type="button"
                    onClick={() => onPlayerClick?.(player)}
                    className="group/player flex items-center gap-2 min-w-0 max-w-[140px]"
                  >
                    {player.headshotUrl ? (
                      <img src={player.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-[10px] shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <div className="text-xs text-text-primary font-medium truncate group-hover/player:text-blaze transition-colors">
                        {lastName}
                      </div>
                      {player.rank && (
                        <div className="text-[10px] font-mono text-text-primary/30">
                          #{player.rank}
                        </div>
                      )}
                    </div>
                  </button>
                </td>

                {/* CPI column */}
                <td className="px-1 py-0.5 text-center">
                  <span className={`text-[11px] font-mono font-medium ${cpiColor(cpi)}`}>
                    {cpi != null ? (cpi > 0 ? '+' : '') + Number(cpi).toFixed(1) : '\u2014'}
                  </span>
                </td>

                {/* Fit column */}
                <td className="px-1 py-0.5 text-center">
                  <span className={`text-[11px] font-mono font-medium ${fitColor(fit)}`}>
                    {fit != null ? Math.round(fit) : '\u2014'}
                  </span>
                </td>

                {/* Prediction cells */}
                {PRED_COLUMNS.map(col => {
                  const predKey = `${player.id}_${col.type}`
                  const prediction = predLookup[predKey]

                  return (
                    <PredictionCell
                      key={col.key}
                      columnType={col.columnType}
                      prediction={prediction}
                      player={player}
                      disabled={inflight?.has(predKey)}
                      onTap={(direction) => onCellTap?.(player, col.type, direction)}
                      benchmarkValue={col.columnType === 'sg' ? sgBenchmark : undefined}
                      isWinnerSelected={col.columnType === 'winner' && winnerPlayerId === player.id}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
