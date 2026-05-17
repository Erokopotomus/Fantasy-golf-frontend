/**
 * Backend mirror of frontend/src/constants/reasonChips.js.
 *
 * Server enforces the chip allow-list before persisting any
 * reasonChips[] array. If/when this drifts from the frontend
 * copy, the frontend is wrong — server is the source of truth
 * for what gets stored.
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md §8.
 */

const REASON_CHIPS = {
  shared: [
    'Gut feel',
    'Hot streak',
    'Slumping',
    'News-driven',
    'Coach said',
    'Roster construction',
  ],
  golf: [
    'Course fit',
    'Recent form',
    'Major prep',
    'SG model',
    'Weather',
    'Field weakness',
    'Cut probability',
  ],
  nfl: [
    'Matchup',
    'Volume',
    'Game script',
    'Weather',
    'Injury return',
    'Bye coverage',
    'Stack',
    'Bring-back',
  ],
  // Chopped-format elimination reason taxonomy. Standalone (not blended with
  // shared) — these tag a ChopEvent, not a player decision.
  chop: [
    'Lowest score',
    'Bye-week overload',
    'Injury cascade',
    'Auto-fallback',
    'Commish override',
  ],
}

function chipsForSport(sport) {
  return [...REASON_CHIPS.shared, ...(REASON_CHIPS[sport] || [])]
}

// Chop chips are standalone — not blended with `shared`. They describe WHY a
// team was eliminated, not the manager's reasoning style. Future ChopReasoning
// UI on CommishChopReview will consume this list directly.
function chipsForChop() {
  return [...REASON_CHIPS.chop]
}

function sanitizeChips(chips, sport) {
  if (!Array.isArray(chips) || chips.length === 0) return null
  const allowed = new Set(chipsForSport(sport))
  const cleaned = [...new Set(chips.filter(c => allowed.has(c)))]
  return cleaned.length > 0 ? cleaned : null
}

function sanitizeChopChips(chips) {
  if (!Array.isArray(chips) || chips.length === 0) return null
  const allowed = new Set(REASON_CHIPS.chop)
  const cleaned = [...new Set(chips.filter(c => allowed.has(c)))]
  return cleaned.length > 0 ? cleaned : null
}

module.exports = { REASON_CHIPS, chipsForSport, chipsForChop, sanitizeChips, sanitizeChopChips }
