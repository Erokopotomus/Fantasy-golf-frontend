/**
 * WeatherStrip — 4-column weather forecast for tournament rounds
 *
 * Shows temp, wind, precipitation, and difficulty for each round day.
 * Color-coded: green (calm) → yellow (moderate) → red (tough)
 * Click a round to expand hourly breakdown (6 AM – 7 PM).
 */

import { useState } from 'react'

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

function getWindBg(speed) {
  if (speed >= 25) return 'bg-red-500/20'
  if (speed >= 15) return 'bg-orange-500/20'
  return ''
}

function formatHour(h) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

/** Hourly detail expansion for a round */
function HourlyDetail({ hourlyData }) {
  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-text-muted text-xs">
        Hourly data not available for this round
      </div>
    )
  }

  // Find best/worst hours based on wind + precip
  let bestIdx = 0, worstIdx = 0
  let bestScore = Infinity, worstScore = -Infinity
  hourlyData.forEach((h, i) => {
    const score = h.windSpeed + (h.precip * 50) // weight precip heavily
    if (score < bestScore) { bestScore = score; bestIdx = i }
    if (score > worstScore) { worstScore = score; worstIdx = i }
  })

  // Max precip for bar scaling
  const maxPrecip = Math.max(...hourlyData.map(h => h.precip), 0.1)

  return (
    <div className="border-t border-dark-border bg-dark-card/50">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Hourly Breakdown</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Best
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Worst
          </span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex min-w-max px-2 pb-3">
          {hourlyData.map((h, i) => {
            const icon = WMO_ICONS[h.weatherCode] ?? '🌤'
            const windColor = getWindColor(h.windSpeed)
            const windBg = getWindBg(h.windSpeed)
            const isBest = i === bestIdx && bestScore !== worstScore
            const isWorst = i === worstIdx && bestScore !== worstScore
            const precipHeight = maxPrecip > 0 ? Math.max((h.precip / maxPrecip) * 24, h.precip > 0 ? 3 : 0) : 0

            return (
              <div
                key={h.hour}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[48px] transition-colors
                  ${isBest ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : ''}
                  ${isWorst ? 'bg-red-500/10 ring-1 ring-red-500/30' : ''}
                `}
              >
                {/* Hour label */}
                <span className="text-[10px] font-mono text-text-muted font-bold">
                  {formatHour(h.hour)}
                </span>

                {/* Weather icon */}
                <span className="text-sm leading-none">{icon}</span>

                {/* Temp */}
                <span className="text-xs font-mono font-bold text-white">{h.temp}°</span>

                {/* Wind speed + gusts */}
                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-mono font-bold px-1 rounded ${windColor} ${windBg}`}>
                    {h.windSpeed} mph
                  </span>
                  {h.windGust > h.windSpeed + 3 && (
                    <span className={`text-[9px] font-mono ${getWindColor(h.windGust)}`}>
                      G {h.windGust}
                    </span>
                  )}
                </div>

                {/* Wind direction */}
                <span className="text-[9px] font-mono text-text-muted">{h.windDir || ''}</span>

                {/* Precip chance + amount */}
                <div className="flex flex-col items-center">
                  {h.precipChance != null && h.precipChance > 0 ? (
                    <span className={`text-[10px] font-mono font-bold ${h.precipChance >= 50 ? 'text-blue-400' : 'text-blue-400/60'}`}>
                      {h.precipChance}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted/40">0%</span>
                  )}
                  <div className="w-4 h-5 flex items-end justify-center">
                    {precipHeight > 0 && (
                      <div
                        className="w-3 rounded-t bg-blue-400/60"
                        style={{ height: `${precipHeight}px` }}
                        title={`${h.precip}"`}
                      />
                    )}
                  </div>
                  {h.precip > 0 && (
                    <span className="text-[9px] font-mono text-blue-400">{h.precip}"</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const WeatherStrip = ({ weather = [], tournamentStart }) => {
  const [expandedRound, setExpandedRound] = useState(null)

  if (!weather || weather.length === 0) {
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
    return (
      <div className="rounded-xl border border-dark-border bg-dark-secondary p-4">
        <h3 className="text-sm font-semibold text-text-muted mb-2">Weather Forecast</h3>
        <p className="text-text-muted text-xs text-center py-3">
          Weather data syncs automatically before the tournament. Check back soon.
        </p>
      </div>
    )
  }

  const hasAnyHourly = weather.some(d => d.hourlyData?.length > 0)
  const rounds = weather.slice(0, 4)

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted">Weather Forecast</h3>
        {hasAnyHourly && (
          <span className="text-[10px] text-text-muted font-mono">Tap round for hourly</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-dark-border">
        {rounds.map((day, i) => {
          const weatherCode = guessWeatherCode(day.conditions)
          const icon = WMO_ICONS[weatherCode] || '🌤'
          const difficulty = getDifficultyLabel(day.difficultyImpact || 0)
          const windColor = getWindColor(day.windSpeed || 0)
          const isExpanded = expandedRound === i
          const hasHourly = day.hourlyData?.length > 0

          return (
            <div
              key={i}
              className={`bg-dark-secondary p-3 space-y-2 transition-colors
                ${hasHourly ? 'cursor-pointer hover:bg-dark-card/50' : ''}
                ${isExpanded ? 'bg-dark-card/50 border-t-2 border-t-gold' : 'border-t-2 border-t-transparent'}
              `}
              onClick={() => hasHourly && setExpandedRound(isExpanded ? null : i)}
            >
              {/* Round label + chevron */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-text-muted uppercase">
                  Round {day.round || i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-lg">{icon}</span>
                  {hasHourly && (
                    <svg
                      className={`w-3 h-3 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
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

      {/* Hourly expansion — full width below the grid */}
      {expandedRound != null && rounds[expandedRound] && (
        <HourlyDetail hourlyData={rounds[expandedRound].hourlyData} />
      )}
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
