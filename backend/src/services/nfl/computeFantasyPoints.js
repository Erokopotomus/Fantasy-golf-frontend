/**
 * Compute Half-PPR fantasy points from a single nflverse weekly stat row.
 * Returns a number (possibly negative due to interceptions/fumbles).
 *
 * Half PPR scoring:
 *   Pass: 0.04/yd, 4/TD, -2/INT
 *   Rush: 0.1/yd, 6/TD, -2/fumble lost
 *   Rec:  0.1/yd, 6/TD, 0.5/reception
 */
function computeHalfPpr(row) {
  const num = (v) => (v == null || v === '' ? 0 : Number(v))

  // Handle both legacy (passing_yards) and new (pass_yards) column names.
  const passYds = num(row.passing_yards ?? row.pass_yards)
  const passTd  = num(row.passing_tds ?? row.pass_tds)
  const passInt = num(row.passing_interceptions ?? row.interceptions)
  const rushYds = num(row.rushing_yards ?? row.rush_yards)
  const rushTd  = num(row.rushing_tds ?? row.rush_tds)
  const recYds  = num(row.receiving_yards ?? row.rec_yards)
  const recTd   = num(row.receiving_tds ?? row.rec_tds)
  const rec     = num(row.receptions)
  const fumLost = num(row.rushing_fumbles_lost ?? row.receiving_fumbles_lost ?? row.fumbles_lost)

  return (
    passYds * 0.04 + passTd * 4 - passInt * 2 +
    rushYds * 0.10 + rushTd * 6 - fumLost * 2 +
    recYds * 0.10 + recTd * 6 + rec * 0.5
  )
}

module.exports = { computeHalfPpr }
