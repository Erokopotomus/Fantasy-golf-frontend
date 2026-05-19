import { TEAM_COLORS } from '../../utils/nflTeamColors'

const BLAZE = '#F06820'

export function teamPrimary(abbr) {
  if (!abbr) return BLAZE
  return TEAM_COLORS[abbr] ?? BLAZE
}

export function teamSecondary(abbr) {
  // Secondary colors not in TEAM_COLORS yet — return primary darkened by 20%.
  // When backend NflTeam.secondaryColor is wired through, swap to that.
  const primary = teamPrimary(abbr)
  return darken(primary, 0.2)
}

export function teamBlend(abbrs) {
  if (!abbrs || abbrs.length === 0) return BLAZE
  if (abbrs.length === 1) return teamPrimary(abbrs[0])
  const rgbs = abbrs.map(a => hexToRgb(teamPrimary(a)))
  const r = Math.round(rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length)
  const g = Math.round(rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length)
  const b = Math.round(rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length)
  return rgbToHex(r, g, b)
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount)),
  )
}
