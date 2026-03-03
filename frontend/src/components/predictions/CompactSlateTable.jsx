import { useMemo } from 'react'
import PredictionCell from './PredictionCell'

/**
 * CompactSlateTable — Horizontal prediction table for the Prove It slate.
 *
 * Renders all prediction categories as columns in a single scrollable table
 * with sticky header and sticky player column. Each cell delegates to
 * PredictionCell for tap-cycling and visual state.
 *
 * Used inside WeeklySlate on the ProveIt page, replacing the per-category
 * card-based layout.
 */

// ─── Column definitions ──────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'winner',  label: 'Winner', shortLabel: 'W',   type: 'tournament_winner', columnType: 'winner' },
  { key: 'top_5',   label: 'Top 5',  shortLabel: 'T5',  type: 'top_5',             columnType: 'top' },
  { key: 'top_10',  label: 'Top 10', shortLabel: 'T10', type: 'top_10',            columnType: 'top' },
  { key: 'top_20',  label: 'Top 20', shortLabel: 'T20', type: 'top_20',            columnType: 'top' },
  { key: 'cut',     label: 'Cut Line', shortLabel: 'Cut', type: 'make_cut',        columnType: 'cut' },
  { key: 'sg',      label: 'SG Call', shortLabel: 'SG',  type: 'player_benchmark', columnType: 'sg' },
]

export default function CompactSlateTable({
  players,
  predictions,
  submitting,
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

      // Track the single winner pick
      if (pred.predictionType === 'tournament_winner') {
        winnerId = pred.subjectPlayerId
      }
    }

    return { predLookup: lookup, winnerPlayerId: winnerId }
  }, [predictions])

  if (!players || players.length === 0) {
    return null
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[520px]">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <thead className="sticky top-0 z-20">
          <tr>
            {/* Player column header — sticky left + top (corner cell gets highest z) */}
            <th
              className="sticky left-0 z-30 bg-[var(--surface)] text-left px-2 py-2 text-[10px] font-semibold text-text-primary/40 uppercase tracking-wider border-r border-[var(--card-border)]"
            >
              Player
            </th>

            {/* Prediction column headers */}
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className="px-1 py-2 text-center text-[10px] font-semibold text-text-primary/40 uppercase tracking-wider bg-[var(--surface)]"
                title={col.label}
              >
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
                    {/* Headshot or initial fallback */}
                    {player.headshotUrl ? (
                      <img
                        src={player.headshotUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-[10px] shrink-0">
                        {initial}
                      </div>
                    )}

                    {/* Name + rank */}
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

                {/* Prediction cells */}
                {COLUMNS.map(col => {
                  const predKey = `${player.id}_${col.type}`
                  const prediction = predLookup[predKey]

                  return (
                    <PredictionCell
                      key={col.key}
                      columnType={col.columnType}
                      prediction={prediction}
                      player={player}
                      disabled={submitting != null}
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
