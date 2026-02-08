/**
 * ESPN PGA Golf Scoreboard API Client
 *
 * Free public API — no auth required.
 * Base: https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard
 */

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN API error: ${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * Get the current/active tournament scoreboard.
 * Returns { leagues, season, day, events: [Event] }
 */
async function getScoreboard() {
  return fetchJSON(BASE_URL)
}

/**
 * Get a specific event by ESPN event ID.
 * Returns the Event object directly (no wrapper).
 */
async function getEvent(eventId) {
  return fetchJSON(`${BASE_URL}/${eventId}`)
}

/**
 * Get the season calendar (list of all events with IDs and dates).
 * Extracted from the leagues[0].calendar in the scoreboard response.
 */
async function getCalendar() {
  const data = await fetchJSON(BASE_URL)
  return data?.leagues?.[0]?.calendar || []
}

/**
 * Get competitors (players with hole-by-hole data) for a specific event.
 * @param {string} eventId - ESPN event ID
 * @returns {{ competitors: Array, status: Object, eventName: string }}
 */
async function getEventScorecard(eventId) {
  const data = await fetchJSON(`${BASE_URL}/${eventId}`)
  const competition = data?.competitions?.[0]
  if (!competition) return { competitors: [], status: null, eventName: data?.name }

  return {
    competitors: competition.competitors || [],
    status: competition.status,
    eventName: data?.name,
  }
}

/**
 * Get the current PGA leaderboard (richer than scoreboard — includes player IDs, positions, scores).
 * Returns the full leaderboard response.
 */
async function getLeaderboard() {
  return fetchJSON('https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard')
}

/**
 * Get a player's bio/profile from ESPN.
 * @param {string} espnId - ESPN athlete ID
 * @returns {{ name, birthDate, birthPlace, college, height, weight, headshot, turnedPro }}
 */
async function getPlayerBio(espnId) {
  return fetchJSON(`https://site.web.api.espn.com/apis/common/v3/sports/golf/pga/athletes/${espnId}`)
}

/**
 * Find the ESPN event ID for a tournament by matching name and dates.
 * @param {string} tournamentName - Our tournament name (e.g., "WM Phoenix Open")
 * @param {Date} startDate - Tournament start date
 * @returns {string|null} ESPN event ID or null
 */
async function findEventId(tournamentName, startDate) {
  const calendar = await getCalendar()
  if (!calendar.length) return null

  const nameNorm = normalizeName(tournamentName)
  const startMs = startDate.getTime()

  // Try exact name match first
  for (const evt of calendar) {
    if (normalizeName(evt.label) === nameNorm) return evt.id
  }

  // Fuzzy name match (contains)
  for (const evt of calendar) {
    const evtNorm = normalizeName(evt.label)
    if (evtNorm.includes(nameNorm) || nameNorm.includes(evtNorm)) return evt.id
  }

  // Date-based match (within 2 days of start)
  for (const evt of calendar) {
    const evtStart = new Date(evt.startDate).getTime()
    if (Math.abs(evtStart - startMs) < 2 * 24 * 60 * 60 * 1000) return evt.id
  }

  return null
}

/** Normalize tournament name for matching */
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/the\s+/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

module.exports = {
  getScoreboard,
  getEvent,
  getCalendar,
  getEventScorecard,
  getLeaderboard,
  getPlayerBio,
  findEventId,
}
