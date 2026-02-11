/**
 * Client-side fuzzy player name detection.
 * Takes note text + array of { id, name } from player cache.
 * Returns array of { id, name, autoDetected: true }.
 */
export function detectPlayers(text, playerList) {
  if (!text || !playerList || playerList.length === 0) return []

  const lowerText = text.toLowerCase()
  const matches = new Map() // playerId → player

  // Build lookup maps
  const fullNameMap = new Map() // "saquon barkley" → player
  const lastNameMap = new Map() // "barkley" → [player, ...]

  for (const p of playerList) {
    if (!p.name) continue
    const lower = p.name.toLowerCase().trim()
    fullNameMap.set(lower, p)

    const parts = lower.split(/\s+/)
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      if (!lastNameMap.has(lastName)) lastNameMap.set(lastName, [])
      lastNameMap.get(lastName).push(p)
    }
  }

  // 1. Full-name matches (case-insensitive substring)
  for (const [fullName, player] of fullNameMap) {
    if (lowerText.includes(fullName)) {
      matches.set(player.id, player)
    }
  }

  // 2. Last-name matches (only if unambiguous — single player with that last name)
  // Use word boundary matching to reduce false positives
  const words = lowerText.split(/[^a-z']+/).filter(w => w.length > 2)
  for (const word of words) {
    const candidates = lastNameMap.get(word)
    if (candidates && candidates.length === 1 && !matches.has(candidates[0].id)) {
      matches.set(candidates[0].id, candidates[0])
    }
  }

  return Array.from(matches.values()).map(p => ({
    id: p.id,
    name: p.name,
    autoDetected: true,
  }))
}
