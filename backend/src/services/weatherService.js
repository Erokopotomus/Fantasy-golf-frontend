/**
 * Open-Meteo Weather Service
 *
 * Free weather API — no auth required, 10K calls/day.
 * Provides daily + hourly forecasts and historical normals.
 */

const WMO_CODES = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Severe Thunderstorm',
}

/**
 * Fetch tournament forecast from Open-Meteo
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
async function getTournamentForecast(lat, lon, startDate, endDate) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,weathercode`
    + `&hourly=temperature_2m,windspeed_10m,windgusts_10m,winddirection_10m,precipitation,precipitation_probability,weathercode`
    + `&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
    + `&start_date=${startDate}&end_date=${endDate}`
    + `&timezone=auto`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.daily?.time) {
    return { days: [] }
  }

  // Group hourly data by date, filtered to golf hours (6 AM – 7 PM)
  const hourlyByDate = {}
  if (data.hourly?.time) {
    for (let h = 0; h < data.hourly.time.length; h++) {
      const dt = new Date(data.hourly.time[h])
      const dateStr = data.hourly.time[h].substring(0, 10) // YYYY-MM-DD
      const hour = dt.getHours()
      if (hour < 6 || hour > 19) continue // 6 AM – 7 PM only
      if (!hourlyByDate[dateStr]) hourlyByDate[dateStr] = []
      hourlyByDate[dateStr].push({
        hour,
        temp: Math.round(data.hourly.temperature_2m[h]),
        windSpeed: Math.round(data.hourly.windspeed_10m[h]),
        windGust: Math.round(data.hourly.windgusts_10m[h]),
        windDir: degreesToDirection(data.hourly.winddirection_10m[h]),
        precip: +(data.hourly.precipitation[h] || 0).toFixed(2),
        precipChance: data.hourly.precipitation_probability?.[h] ?? null,
        weatherCode: data.hourly.weathercode[h],
      })
    }
  }

  const days = data.daily.time.map((date, i) => ({
    date,
    tempHigh: data.daily.temperature_2m_max[i],
    tempLow: data.daily.temperature_2m_min[i],
    precipitation: data.daily.precipitation_sum[i],
    windSpeed: data.daily.windspeed_10m_max[i],
    windGust: data.daily.windgusts_10m_max[i],
    windDirection: degreesToDirection(data.daily.winddirection_10m_dominant[i]),
    weatherCode: data.daily.weathercode[i],
    conditions: WMO_CODES[data.daily.weathercode[i]] || 'Unknown',
    difficultyImpact: computeDifficultyImpact({
      windSpeed: data.daily.windspeed_10m_max[i],
      windGust: data.daily.windgusts_10m_max[i],
      precipitation: data.daily.precipitation_sum[i],
      tempHigh: data.daily.temperature_2m_max[i],
      tempLow: data.daily.temperature_2m_min[i],
    }),
    hourly: hourlyByDate[date] || [],
  }))

  return { days, timezone: data.timezone }
}

/**
 * Compute difficulty impact score (0-1)
 * Higher = tougher conditions for golf
 */
function computeDifficultyImpact(data) {
  let score = 0

  // Wind: >15mph starts affecting play, >20mph significant
  if (data.windSpeed > 20) score += 0.3
  else if (data.windSpeed > 15) score += 0.15

  // Gusts: >25mph causes problems, >30mph major factor
  if (data.windGust > 30) score += 0.2
  else if (data.windGust > 25) score += 0.1

  // Rain: any significant precipitation affects play
  if (data.precipitation > 0.5) score += 0.3
  else if (data.precipitation > 0.2) score += 0.15
  else if (data.precipitation > 0.05) score += 0.05

  // Extreme temps (under 50F or over 95F)
  if (data.tempLow < 45 || data.tempHigh > 95) score += 0.1
  else if (data.tempLow < 50 || data.tempHigh > 90) score += 0.05

  return Math.min(score, 1.0)
}

function degreesToDirection(degrees) {
  if (degrees == null) return null
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(degrees / 22.5) % 16
  return dirs[idx]
}

/**
 * Get difficulty label from impact score
 */
function getDifficultyLabel(impact) {
  if (impact >= 0.6) return 'Brutal'
  if (impact >= 0.4) return 'Windy'
  if (impact >= 0.2) return 'Breezy'
  return 'Calm'
}

/**
 * Fetch historical weather from Open-Meteo archive API.
 * Same structure as getTournamentForecast but uses archive.open-meteo.com
 * for dates in the past (forecast API only covers ~16 days ahead).
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} date - YYYY-MM-DD (single day)
 * @returns {{ temp, wind, windGust, humidity, condition }}
 */
async function getHistoricalWeather(lat, lon, date) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
    + `&start_date=${date}&end_date=${date}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max,weathercode`
    + `&hourly=temperature_2m,windspeed_10m,windgusts_10m,relative_humidity_2m,precipitation,weathercode`
    + `&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
    + `&timezone=auto`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Open-Meteo archive API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.daily?.time || data.daily.time.length === 0) {
    return null
  }

  return {
    date,
    tempHigh: data.daily.temperature_2m_max[0],
    tempLow: data.daily.temperature_2m_min[0],
    precipitation: data.daily.precipitation_sum[0],
    windSpeed: data.daily.windspeed_10m_max[0],
    windGust: data.daily.windgusts_10m_max[0],
    weatherCode: data.daily.weathercode[0],
    conditions: WMO_CODES[data.daily.weathercode[0]] || 'Unknown',
    difficultyImpact: computeDifficultyImpact({
      windSpeed: data.daily.windspeed_10m_max[0],
      windGust: data.daily.windgusts_10m_max[0],
      precipitation: data.daily.precipitation_sum[0],
      tempHigh: data.daily.temperature_2m_max[0],
      tempLow: data.daily.temperature_2m_min[0],
    }),
  }
}

module.exports = {
  getTournamentForecast,
  getHistoricalWeather,
  computeDifficultyImpact,
  getDifficultyLabel,
  WMO_CODES,
}
