// LocalStorage helpers for tracking pools the current browser has interacted with.
// Anonymous-friendly: no user account needed. Each browser remembers its own pools.

const COMMISH_KEY = 'clutch_pools_commish'
const ENTERED_KEY = 'clutch_pools_entered'

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // localStorage full or disabled — silent fail
  }
}

export function getCommishPools() {
  return readList(COMMISH_KEY)
}

export function getEnteredPools() {
  return readList(ENTERED_KEY)
}

export function rememberCommishPool({ slug, adminToken, name, tournamentName }) {
  const list = readList(COMMISH_KEY)
  // De-dupe on slug
  const filtered = list.filter(p => p.slug !== slug)
  filtered.unshift({ slug, adminToken, name, tournamentName, savedAt: new Date().toISOString() })
  writeList(COMMISH_KEY, filtered)
}

export function rememberEnteredPool({ slug, teamName, poolName, tournamentName }) {
  const list = readList(ENTERED_KEY)
  // De-dupe on (slug, teamName) since a single browser could enter multiple teams
  const filtered = list.filter(p => !(p.slug === slug && p.teamName === teamName))
  filtered.unshift({ slug, teamName, poolName, tournamentName, savedAt: new Date().toISOString() })
  writeList(ENTERED_KEY, filtered)
}

export function forgetCommishPool(slug) {
  writeList(COMMISH_KEY, readList(COMMISH_KEY).filter(p => p.slug !== slug))
}

export function forgetEnteredPool(slug, teamName) {
  writeList(ENTERED_KEY, readList(ENTERED_KEY).filter(p => !(p.slug === slug && p.teamName === teamName)))
}
