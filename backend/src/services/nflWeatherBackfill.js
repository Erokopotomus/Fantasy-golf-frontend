/**
 * nflWeatherBackfill.js — Backfill historical weather for NFL games
 *
 * Uses Open-Meteo's free historical archive API (archive.open-meteo.com).
 * Looks up stadium coordinates, skips dome games, fetches weather for
 * outdoor/retractable-roof games.
 *
 * Functions:
 *   backfillNflWeather(prisma, opts) — Fetch and store weather for games missing it
 */

const { WMO_CODES } = require('./weatherService')
const { Prisma } = require('@prisma/client')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── NFL Stadium Coordinates ─────────────────────────────────────────────────

const NFL_STADIUMS = {
  // Current stadiums
  'Arrowhead Stadium':           { lat: 39.0489, lon: -94.4839, roof: 'outdoors' },
  'GEHA Field at Arrowhead Stadium': { lat: 39.0489, lon: -94.4839, roof: 'outdoors' },
  'Allegiant Stadium':           { lat: 36.0908, lon: -115.1833, roof: 'dome' },
  'AT&T Stadium':                { lat: 32.7473, lon: -97.0945, roof: 'retractable' },
  'Bank of America Stadium':     { lat: 35.2258, lon: -80.8528, roof: 'outdoors' },
  'Bills Stadium':               { lat: 42.7738, lon: -78.7870, roof: 'outdoors' },
  'Highmark Stadium':            { lat: 42.7738, lon: -78.7870, roof: 'outdoors' },
  'New Era Field':               { lat: 42.7738, lon: -78.7870, roof: 'outdoors' },
  'Caesars Superdome':           { lat: 29.9511, lon: -90.0812, roof: 'dome' },
  'Mercedes-Benz Superdome':     { lat: 29.9511, lon: -90.0812, roof: 'dome' },
  'CenturyLink Field':           { lat: 47.5952, lon: -122.3316, roof: 'outdoors' },
  'Lumen Field':                 { lat: 47.5952, lon: -122.3316, roof: 'outdoors' },
  'Cleveland Browns Stadium':    { lat: 41.5061, lon: -81.6995, roof: 'outdoors' },
  'FirstEnergy Stadium':         { lat: 41.5061, lon: -81.6995, roof: 'outdoors' },
  'Huntington Bank Field':       { lat: 41.5061, lon: -81.6995, roof: 'outdoors' },
  'Empower Field at Mile High':  { lat: 39.7439, lon: -105.0201, roof: 'outdoors' },
  'Broncos Stadium at Mile High':{ lat: 39.7439, lon: -105.0201, roof: 'outdoors' },
  'EverBank Stadium':            { lat: 30.3239, lon: -81.6373, roof: 'outdoors' },
  'TIAA Bank Field':             { lat: 30.3239, lon: -81.6373, roof: 'outdoors' },
  'FedExField':                  { lat: 38.9076, lon: -76.8645, roof: 'outdoors' },
  'Northwest Stadium':           { lat: 38.9076, lon: -76.8645, roof: 'outdoors' },
  'Ford Field':                  { lat: 42.3400, lon: -83.0456, roof: 'dome' },
  'Gillette Stadium':            { lat: 42.0909, lon: -71.2643, roof: 'outdoors' },
  'Hard Rock Stadium':           { lat: 25.9580, lon: -80.2389, roof: 'outdoors' },
  'Heinz Field':                 { lat: 40.4468, lon: -80.0158, roof: 'outdoors' },
  'Acrisure Stadium':            { lat: 40.4468, lon: -80.0158, roof: 'outdoors' },
  'Lambeau Field':               { lat: 44.5013, lon: -88.0622, roof: 'outdoors' },
  'Lincoln Financial Field':     { lat: 39.9008, lon: -75.1675, roof: 'outdoors' },
  'Lucas Oil Stadium':           { lat: 39.7601, lon: -86.1639, roof: 'retractable' },
  'M&T Bank Stadium':            { lat: 39.2780, lon: -76.6227, roof: 'outdoors' },
  'Mercedes-Benz Stadium':       { lat: 33.7554, lon: -84.4010, roof: 'retractable' },
  'MetLife Stadium':             { lat: 40.8135, lon: -74.0745, roof: 'outdoors' },
  'Nissan Stadium':              { lat: 36.1665, lon: -86.7713, roof: 'outdoors' },
  'NRG Stadium':                 { lat: 29.6847, lon: -95.4107, roof: 'retractable' },
  'Paul Brown Stadium':          { lat: 39.0955, lon: -84.5161, roof: 'outdoors' },
  'Paycor Stadium':              { lat: 39.0955, lon: -84.5161, roof: 'outdoors' },
  'Raymond James Stadium':       { lat: 27.9759, lon: -82.5033, roof: 'outdoors' },
  'SoFi Stadium':                { lat: 33.9535, lon: -118.3392, roof: 'dome' },
  'Soldier Field':               { lat: 41.8623, lon: -87.6167, roof: 'outdoors' },
  'State Farm Stadium':          { lat: 33.5276, lon: -112.2626, roof: 'retractable' },
  'U.S. Bank Stadium':           { lat: 44.9736, lon: -93.2575, roof: 'dome' },

  // International venues
  'Tottenham Hotspur Stadium':   { lat: 51.6043, lon: -0.0663, roof: 'outdoors' },
  'Wembley Stadium':             { lat: 51.5560, lon: -0.2795, roof: 'outdoors' },
  'Estadio Azteca':              { lat: 19.3029, lon: -99.1505, roof: 'outdoors' },
  'Allianz Arena':               { lat: 48.2188, lon: 11.6247, roof: 'outdoors' },
  'Deutsche Bank Park':          { lat: 50.0685, lon: 8.6455, roof: 'outdoors' },

  // Historical / renamed
  'Oakland Coliseum':            { lat: 37.7516, lon: -122.2005, roof: 'outdoors' },
  'Oakland-Alameda County Coliseum': { lat: 37.7516, lon: -122.2005, roof: 'outdoors' },
  'RingCentral Coliseum':        { lat: 37.7516, lon: -122.2005, roof: 'outdoors' },
  'StubHub Center':              { lat: 33.8644, lon: -118.2611, roof: 'outdoors' },
  'Dignity Health Sports Park':  { lat: 33.8644, lon: -118.2611, roof: 'outdoors' },
  'Los Angeles Memorial Coliseum': { lat: 34.0141, lon: -118.2879, roof: 'outdoors' },
  'FedEx Field':                 { lat: 38.9076, lon: -76.8645, roof: 'outdoors' },
  "Levi's Stadium":              { lat: 37.4033, lon: -121.9694, roof: 'outdoors' },
  'Levis Stadium':               { lat: 37.4033, lon: -121.9694, roof: 'outdoors' },

  // Special / neutral site
  'Tom Benson Hall of Fame Stadium': { lat: 40.8200, lon: -81.3985, roof: 'outdoors' },
  'Camping World Stadium':       { lat: 28.5392, lon: -81.4029, roof: 'outdoors' },
}

// Fallback: team → default home stadium
const TEAM_DEFAULT_STADIUM = {
  ARI: 'State Farm Stadium',     ATL: 'Mercedes-Benz Stadium',
  BAL: 'M&T Bank Stadium',      BUF: 'Highmark Stadium',
  CAR: 'Bank of America Stadium', CHI: 'Soldier Field',
  CIN: 'Paycor Stadium',        CLE: 'Huntington Bank Field',
  DAL: 'AT&T Stadium',          DEN: 'Empower Field at Mile High',
  DET: 'Ford Field',            GB: 'Lambeau Field',
  HOU: 'NRG Stadium',           IND: 'Lucas Oil Stadium',
  JAX: 'EverBank Stadium',      KC: 'Arrowhead Stadium',
  LAC: 'SoFi Stadium',          LAR: 'SoFi Stadium',
  LV: 'Allegiant Stadium',      MIA: 'Hard Rock Stadium',
  MIN: 'U.S. Bank Stadium',     NE: 'Gillette Stadium',
  NO: 'Caesars Superdome',       NYG: 'MetLife Stadium',
  NYJ: 'MetLife Stadium',       PHI: 'Lincoln Financial Field',
  PIT: 'Acrisure Stadium',      SEA: 'Lumen Field',
  SF: 'Levi\'s Stadium',        TB: 'Raymond James Stadium',
  TEN: 'Nissan Stadium',        WAS: 'Northwest Stadium',
  // Historical
  OAK: 'Oakland Coliseum',      SD: 'StubHub Center',
  STL: 'Edward Jones Dome',
}

// ─── Open-Meteo Historical Archive ──────────────────────────────────────────

/**
 * Fetch historical weather from Open-Meteo archive API.
 * Returns { temp, wind, windGust, humidity, condition, precipChance }
 * for the specified date and approximate kickoff hour.
 */
async function getHistoricalGameWeather(lat, lon, date, kickoffHour = 13) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
    + `&start_date=${date}&end_date=${date}`
    + `&hourly=temperature_2m,windspeed_10m,windgusts_10m,relative_humidity_2m,precipitation,weathercode`
    + `&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
    + `&timezone=America/New_York`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Open-Meteo archive error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.hourly?.time || data.hourly.time.length === 0) {
    return null
  }

  // Find the hour closest to kickoff (games are typically 1pm, 4:25pm, or 8:20pm ET)
  // Use a 3-hour window around kickoff for averaging
  const startHour = Math.max(0, kickoffHour - 1)
  const endHour = Math.min(23, kickoffHour + 2)

  let tempSum = 0, windSum = 0, gustMax = 0, humSum = 0, precipSum = 0
  let worstCode = 0, count = 0

  for (let h = startHour; h <= endHour; h++) {
    if (h >= data.hourly.time.length) break
    const temp = data.hourly.temperature_2m[h]
    const wind = data.hourly.windspeed_10m[h]
    const gust = data.hourly.windgusts_10m?.[h]
    const hum = data.hourly.relative_humidity_2m?.[h]
    const precip = data.hourly.precipitation?.[h]
    const code = data.hourly.weathercode?.[h]

    if (temp != null) { tempSum += temp; count++ }
    if (wind != null) windSum += wind
    if (gust != null && gust > gustMax) gustMax = gust
    if (hum != null) humSum += hum
    if (precip != null) precipSum += precip
    if (code != null && code > worstCode) worstCode = code
  }

  if (count === 0) return null

  return {
    temp: Math.round(tempSum / count),
    wind: Math.round(windSum / count),
    windGust: Math.round(gustMax),
    humidity: Math.round(humSum / count),
    condition: WMO_CODES[worstCode] || null,
    precipChance: precipSum > 0 ? Math.min(100, Math.round(precipSum * 100)) : 0,
  }
}

// ─── Main Backfill Function ──────────────────────────────────────────────────

/**
 * Backfill weather for NFL games where weather is NULL and roof != 'dome'.
 */
async function backfillNflWeather(prisma, opts = {}) {
  const {
    seasons = [2019, 2020, 2021, 2022, 2023, 2024, 2025],
    force = false,
  } = opts

  console.log(`\n[nflWeather] Starting weather backfill for seasons: ${seasons.join(', ')}`)

  // Find games needing weather
  const whereClause = {
    season: { in: seasons },
    status: 'FINAL', // only completed games have reliable dates
  }
  if (!force) {
    whereClause.weather = { equals: Prisma.DbNull }
  }

  const games = await prisma.nflGame.findMany({
    where: whereClause,
    select: {
      id: true, season: true, week: true, venue: true, roof: true,
      kickoff: true,
      homeTeam: { select: { abbreviation: true } },
    },
    orderBy: [{ season: 'asc' }, { week: 'asc' }],
  })

  console.log(`[nflWeather] Found ${games.length} games to process`)

  let fetched = 0, skippedDome = 0, skippedNoVenue = 0, failed = 0

  for (let i = 0; i < games.length; i++) {
    const game = games[i]
    const progress = `[${i + 1}/${games.length}]`

    // Skip dome games
    const roof = (game.roof || '').toLowerCase()
    if (roof === 'dome') {
      skippedDome++
      continue
    }

    // Look up stadium coordinates
    const venue = game.venue || ''
    let stadium = NFL_STADIUMS[venue]

    // Fallback: try team's default stadium
    if (!stadium) {
      const teamDefault = TEAM_DEFAULT_STADIUM[game.homeTeam.abbreviation]
      if (teamDefault) stadium = NFL_STADIUMS[teamDefault]
    }

    if (!stadium) {
      skippedNoVenue++
      if (skippedNoVenue <= 10) {
        console.warn(`${progress} No coordinates for venue: "${venue}" (${game.homeTeam.abbreviation})`)
      }
      continue
    }

    // For retractable roofs, still fetch (some games are open)
    // For dome, we already skipped above

    // Extract date and approximate kickoff hour
    const kickoff = new Date(game.kickoff)
    const dateStr = kickoff.toISOString().substring(0, 10) // YYYY-MM-DD
    const kickoffHour = kickoff.getUTCHours() - 5 // Convert UTC to ET (approximate)

    try {
      const weather = await getHistoricalGameWeather(stadium.lat, stadium.lon, dateStr, Math.max(0, kickoffHour))

      if (weather) {
        await prisma.nflGame.update({
          where: { id: game.id },
          data: { weather },
        })
        fetched++
      } else {
        failed++
      }
    } catch (e) {
      failed++
      if (failed <= 5) {
        console.warn(`${progress} Weather fetch failed for ${game.season} week ${game.week}: ${e.message}`)
      }
    }

    // Rate limit: 200ms between requests (Open-Meteo allows ~300/min for free)
    await sleep(200)

    if ((i + 1) % 100 === 0 || i + 1 === games.length) {
      console.log(`${progress} Weather progress: ${fetched} fetched, ${skippedDome} dome, ${skippedNoVenue} no venue, ${failed} failed`)
    }
  }

  const result = {
    totalGames: games.length,
    fetched,
    skippedDome,
    skippedNoVenue,
    failed,
  }

  console.log(`\n[nflWeather] ═══ Weather Backfill Complete ═══`)
  console.log(`  Total processed: ${games.length}`)
  console.log(`  Weather fetched: ${fetched}`)
  console.log(`  Skipped (dome): ${skippedDome}`)
  console.log(`  Skipped (no venue): ${skippedNoVenue}`)
  console.log(`  Failed: ${failed}`)

  return result
}

module.exports = {
  backfillNflWeather,
  getHistoricalGameWeather,
  NFL_STADIUMS,
  TEAM_DEFAULT_STADIUM,
}
