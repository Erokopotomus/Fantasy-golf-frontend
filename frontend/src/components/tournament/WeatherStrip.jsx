/**
 * WeatherStrip — 4-column weather forecast for tournament rounds
 *
 * Shows temp, wind, precipitation, and difficulty for each round day.
 * Color-coded: green (calm) → yellow (moderate) → red (tough)
 */

const WMO_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌧', 55: '🌧',
  61: '🌦', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
}

function getDifficultyLabel(impact) {
  if (impact >= 0.6) return { label: 'Brutal', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' }
  if (impact >= 0.4) return { label: 'Windy', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' }
  if (impact >= 0.2) return { label: 'Breezy', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/25' }
  return { label: 'Calm', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' }
}

function getWindColor(speed) {
  if (speed >= 25) return 'text-red-400'
  if (speed >= 15) return 'text-orange-400'
  return 'text-text-secondary'
}

const WeatherStrip = ({ weather = [], tournamentStart }) => {
  if (!weather || weather.length === 0) {
    // Check if too far out
    if (tournamentStart) {
      const daysOut = Math.floor((new Date(tournamentStart) - new Date()) / 86400000)
      if (daysOut > 16) {
        return (
          <div className="rounded-xl border border-dark-border bg-dark-secondary p-4">
            <h3 className="text-sm font-semibold text-text-muted mb-2">Weather Forecast</h3>
            <p className="text-text-muted text-xs text-center py-3">
              Forecast available ~{daysOut - 14} days before the tournament
            </p>
          </div>
        )
      }
    }
    return null
  }

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-text-muted">Weather Forecast</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-dark-border">
        {weather.slice(0, 4).map((day, i) => {
          const weatherCode = guessWeatherCode(day.conditions)
          const icon = WMO_ICONS[weatherCode] || '🌤'
          const difficulty = getDifficultyLabel(day.difficultyImpact || 0)
          const windColor = getWindColor(day.windSpeed || 0)

          return (
            <div key={i} className="bg-dark-secondary p-3 space-y-2">
              {/* Round label */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-text-muted uppercase">
                  Round {day.round || i + 1}
                </span>
                <span className="text-lg">{icon}</span>
              </div>

              {/* Temp */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-mono font-bold text-white">
                    {day.temperature != null ? `${Math.round(day.temperature)}°` : '--'}
                  </span>
                  {day.feelsLike != null && (
                    <span className="text-xs font-mono text-text-muted">
                      / {Math.round(day.feelsLike)}°
                    </span>
                  )}
                </div>
              </div>

              {/* Wind */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className={`text-xs font-mono font-bold ${windColor}`}>
                    {day.windSpeed != null ? `${Math.round(day.windSpeed)} mph` : '--'}
                  </span>
                </div>
                {day.windGust != null && day.windGust > (day.windSpeed || 0) + 5 && (
                  <span className={`text-[10px] font-mono ${getWindColor(day.windGust)}`}>
                    Gusts {Math.round(day.windGust)} mph
                  </span>
                )}
                {day.windDirection && (
                  <span className="text-[10px] text-text-muted font-mono">{day.windDirection}</span>
                )}
              </div>

              {/* Precipitation */}
              {day.precipitation != null && day.precipitation > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-blue-400">💧</span>
                  <span className="text-xs font-mono text-blue-400">
                    {day.precipitation.toFixed(2)}"
                  </span>
                </div>
              )}

              {/* Difficulty badge */}
              <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${difficulty.bg} ${difficulty.color} ${difficulty.border}`}>
                {difficulty.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Map conditions text back to a WMO code for icon lookup */
function guessWeatherCode(conditions) {
  if (!conditions) return 1
  const c = conditions.toLowerCase()
  if (c.includes('thunder') || c.includes('storm')) return 95
  if (c.includes('heavy rain') || c.includes('heavy shower')) return 65
  if (c.includes('rain') || c.includes('shower')) return 63
  if (c.includes('drizzle')) return 53
  if (c.includes('snow')) return 73
  if (c.includes('fog')) return 45
  if (c.includes('overcast')) return 3
  if (c.includes('partly')) return 2
  if (c.includes('mainly') || c.includes('mostly')) return 1
  if (c.includes('clear') || c.includes('sunny')) return 0
  return 2
}

export default WeatherStrip
