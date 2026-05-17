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
}

function chipsForSport(sport) {
  return [...REASON_CHIPS.shared, ...(REASON_CHIPS[sport] || [])]
}

function sanitizeChips(chips, sport) {
  if (!Array.isArray(chips) || chips.length === 0) return null
  const allowed = new Set(chipsForSport(sport))
  const cleaned = [...new Set(chips.filter(c => allowed.has(c)))]
  return cleaned.length > 0 ? cleaned : null
}

module.exports = { REASON_CHIPS, chipsForSport, sanitizeChips }
