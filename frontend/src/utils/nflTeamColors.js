/**
 * NFL team primary colors — used by Lab → Prep surfaces for tile washes,
 * abbreviation accents, and screenshot-shareable card identity.
 *
 * Keyed by team abbreviation (matches `NflTeam.abbreviation`).
 */
export const TEAM_COLORS = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC:  '#E31837',
  LA:  '#003594', LAC: '#0080C6', LAR: '#003594', LV:  '#000000',
  MIA: '#008E97', MIN: '#4F2683', NE:  '#002244', NO:  '#D3BC8D',
  NYG: '#0B2265', NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612',
  SEA: '#002244', SF:  '#AA0000', TB:  '#D50A0A', TEN: '#0C2340',
  WAS: '#5A1414',
}

/**
 * Convert a #RRGGBB hex string to an `rgba(r,g,b,a)` value.
 * Falls back to a neutral slate when given a malformed input so callers
 * never need to defend against missing/invalid hex codes.
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== '#') return `rgba(30,42,58,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Lookup helper — returns a team's primary color or a neutral slate fallback
 * so tile rendering never short-circuits on an unknown abbreviation.
 */
export function getTeamColor(abbr) {
  return TEAM_COLORS[abbr] ?? '#1E2A3A'
}
