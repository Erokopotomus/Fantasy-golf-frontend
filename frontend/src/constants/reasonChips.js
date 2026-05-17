/**
 * Shared "why did you do that" chip taxonomy.
 *
 * Used by every decision-capture surface (draft pick, lineup save,
 * waiver claim, trade proposal/response, naked drop, watchlist add/remove,
 * auction nomination). One source of truth — every chip the bias engine
 * ever sees comes from here.
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md §8.
 *
 * Validation rule: each reasonChips[] array on an event must be a subset
 * of chipsForSport(sport). Unknown chips are dropped server-side.
 */

export const REASON_CHIPS = {
  shared: [
    'Gut feel',
    'Hot streak',
    'Slumping',
    'News-driven',
    'Coach said',
    'Roster construction', // positional need, scarcity, balance
  ],
  golf: [
    'Course fit',
    'Recent form',
    'Major prep',
    'SG model',
    'Weather',
    'Field weakness', // weak field = more likely to contend
    'Cut probability',
  ],
  nfl: [
    'Matchup',
    'Volume',
    'Game script',
    'Weather',
    'Injury return',
    'Bye coverage',
    'Stack',        // QB + WR same team
    'Bring-back',   // correlation against opponent
  ],
  // Chopped-format elimination reason taxonomy. Standalone (not blended with
  // shared) — these tag a ChopEvent, not a player decision. Consumed by the
  // future ChopReasoning UI on CommishChopReview.
  chop: [
    'Lowest score',
    'Bye-week overload',
    'Injury cascade',
    'Auto-fallback',
    'Commish override',
  ],
}

export function chipsForSport(sport) {
  return [...REASON_CHIPS.shared, ...(REASON_CHIPS[sport] || [])]
}

// Chop chips are standalone — not blended with `shared`. They describe WHY a
// team was eliminated, not the manager's reasoning style.
export function chipsForChop() {
  return [...REASON_CHIPS.chop]
}

/**
 * Drop any chip not in the sport's allowed list.
 * Returns a deduped subset suitable for persistence.
 */
export function sanitizeChips(chips, sport) {
  if (!Array.isArray(chips) || chips.length === 0) return null
  const allowed = new Set(chipsForSport(sport))
  const cleaned = [...new Set(chips.filter(c => allowed.has(c)))]
  return cleaned.length > 0 ? cleaned : null
}

export function sanitizeChopChips(chips) {
  if (!Array.isArray(chips) || chips.length === 0) return null
  const allowed = new Set(REASON_CHIPS.chop)
  const cleaned = [...new Set(chips.filter(c => allowed.has(c)))]
  return cleaned.length > 0 ? cleaned : null
}
