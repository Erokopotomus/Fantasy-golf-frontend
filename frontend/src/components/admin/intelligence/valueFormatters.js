// Compact one-line formatter for the `value` JSON column on a ManagerCharacteristic.
// Shape varies per characteristic type — this gives the Top Users table a single
// readable summary cell instead of dumping raw JSON. Add a case here when a new
// extractor lands.

export function formatValue(type, value) {
  if (value == null) return '—'
  try {
    switch (type) {
      case 'auction_spend_concentration':
        return value.avgTop3Pct != null
          ? `${Math.round(value.avgTop3Pct * 100)}% top-3`
          : '—'

      case 'faab_front_load_pct':
        return value.avgFrontLoadPct != null
          ? `${Math.round(value.avgFrontLoadPct * 100)}% early`
          : '—'

      case 'pick_reach_rate':
      case 'pick_steal_rate':
      case 'pick_par_rate':
      case 'pick_value_rate':
        return value.rate != null ? `${Math.round(value.rate * 100)}%` : '—'

      case 'r1_position_distribution': {
        // value is { QB: 0.7, RB: 0.3, ... } — surface the dominant position
        const entries = Object.entries(value).filter(([, v]) => typeof v === 'number')
        if (entries.length === 0) return '—'
        const [pos, pct] = entries.sort((a, b) => b[1] - a[1])[0]
        return `${Math.round(pct * 100)}% ${pos}`
      }

      case 'trade_frequency':
        return value.avgTradeZScore != null
          ? `z=${value.avgTradeZScore.toFixed(2)}`
          : '—'

      case 'roster_endowment_ratio':
        return value.avgEndowmentRatio != null
          ? `${Math.round(value.avgEndowmentRatio * 100)}% retained`
          : '—'

      case 'naked_drop_frequency':
        return value.avgNakedDropZScore != null
          ? `z=${value.avgNakedDropZScore.toFixed(2)}`
          : '—'

      case 'drop_lag_games':
        return value.avgLagGames != null ? `${value.avgLagGames.toFixed(1)} games` : '—'

      case 'finish_volatility':
        return value.stdDevRanks != null ? `σ=${value.stdDevRanks.toFixed(2)}` : '—'

      case 'championship_rate':
      case 'playoff_rate':
        return value.rate != null ? `${Math.round(value.rate * 100)}%` : '—'

      case 'career_trajectory_slope':
        return value.slope != null ? `slope=${value.slope.toFixed(2)}` : '—'

      case 'position_round_profile':
      case 'auction_overpay_rate':
      case 'auction_bargain_rate':
      case 'top_bid_rate':
      default:
        // Catch-all: trim the JSON to keep the cell narrow
        return truncate(JSON.stringify(value), 40)
    }
  } catch {
    return '—'
  }
}

function truncate(s, n) {
  if (!s) return '—'
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
