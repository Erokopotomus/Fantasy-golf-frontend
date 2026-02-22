/**
 * Build a Lab URL with league settings as query params.
 * Used by PhaseActionRow and Dashboard to bridge leagues → Lab.
 */
export function buildLabUrl(league) {
  const params = new URLSearchParams()
  params.set('sport', (league.sport || 'GOLF').toLowerCase())
  if (league.maxTeams) params.set('teamCount', String(league.maxTeams))
  if (league.draftType) params.set('draftType', league.draftType.toLowerCase())
  if (league.settings?.scoringType) params.set('scoring', league.settings.scoringType)
  if (league.name) params.set('leagueName', league.name)
  return `/lab?${params.toString()}`
}
