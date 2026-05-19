const { randomUUID } = require('crypto')

function genId() {
  return 'c' + randomUUID().replace(/-/g, '').slice(0, 24)
}

function sqlVal(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return `'${String(v).replace(/'/g, "''")}'`
}

const TEAM_ALIASES = {
  OAK: 'LV', SD: 'LAC', STL: 'LA', JAC: 'JAX',
}

function normalizeTeamAbbr(abbr) {
  if (!abbr) return null
  const u = String(abbr).toUpperCase().trim()
  return TEAM_ALIASES[u] || u
}

function mapPosition(raw) {
  if (!raw) return null
  const upper = String(raw).toUpperCase()
  if (['QB', 'RB', 'FB', 'WR', 'TE', 'K', 'P'].includes(upper)) {
    return upper === 'FB' ? 'RB' : upper
  }
  return null
}

module.exports = { genId, sqlVal, normalizeTeamAbbr, mapPosition }
