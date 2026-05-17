/**
 * Chopped format vocabulary — centralized so we can A/B test wording
 * without code changes. Import { CHOPPED_VOCAB } and use the keys.
 */
export const CHOPPED_VOCAB = {
  activeTeams: 'Survivors',
  eliminatedTeams: 'Chopped',
  actOfCutting: 'Chop',
  weeklyWorst: 'The Block',
  manualCut: 'Manual Chop',
  champion: 'Champion',
  chopVerb: 'Chop',
  choppedPastTense: 'Chopped',
  // Status text for Standings/Card displays
  statusAlive: 'Alive',
  statusChopped: 'Chopped',
  statusChampion: '🏆 Champion',
  // Section headers in ChopZone page
  survivorsHeader: 'Survivors',
  blockHeader: 'The Block',
  choppedHeader: 'Chopped',
  // Coach Briefing copy hooks
  pageTitle: 'Chop Zone',
  zoneCallout: (week) => `Chop Zone — Week ${week}`,
}
