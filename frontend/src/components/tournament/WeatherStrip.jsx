/**
 * WeatherStrip — Tournament round weather with always-visible hourly detail
 *
 * Round tabs across the top — today's round auto-selected with gold highlight.
 * Full hourly breakdown always shown below for the selected round.
 * Wind sustained vs gusts, rain chance, and precipitation all easy to read.
 */

import { useState, useMemo } from 'react'

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
  return 'bg-dark-tertiary/5'
}

function getPrecipColor(chance) {
  if (chance >= 60) return 'text-blue-400'
  if (chance >= 30) return 'text-blue-400/70'
  return 'text-text-muted'
}

function formatHour(h) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

/** Figure out which round index is "today" or the nearest upcoming */
function getCurrentRoundIndex(weather) {
  const today = new Date().toISOString().split('T')[0]
  // Exact match first
  const todayIdx = weather.findIndex(d => {
    const ts = d.timestamp ? new Date(d.timestamp).toISOString().split('T')[0] : null
    return ts === today
  })
  if (todayIdx !== -1) return todayIdx
  // Nearest upcoming
  for (let i = 0; i < weather.length; i++) {
    const ts = weather[i].timestamp ? new Date(weather[i].timestamp).toISOString().split('T')[0] : null
    if (ts && ts > today) return i
  }
  return 0
}

/** Hourly detail — full width, comfortable sizing */
function HourlyDetail({ hourlyData, roundLabel }) {
  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-text-muted text-sm">
        Hourly data not available for {roundLabel}
      </div>
    )
  }

  // Find best/worst hours based on wind + precip
  let bestIdx = 0, worstIdx = 0
  let bestScore = Infinity, worstScore = -Infinity
  hourlyData.forEach((h, i) => {
    const score = h.windSpeed + (h.windGust || 0) * 0.3 + (h.precip * 50) + ((h.precipChance || 0) * 0.2)
    if (score < bestScore) { bestScore = score; bestIdx = i }
    if (score > worstScore) { worstScore = score; worstIdx = i }
  })
  const showBestWorst = bestScore !== worstScore

  // Max precip for bar scaling
  const maxPrecip = Math.max(...hourlyData.map(h => h.precip), 0.1)

  return (
    <div className="bg-dark-card/30">
      {/* Legend row */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{roundLabel} — Hour by Hour</span>
        {showBestWorst && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Best Window
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Toughest
            </span>
          </div>
        )}
      </div>

      {/* Row labels + scrollable hours */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="text-[10px] font-mono text-text-muted uppercase">
              <th className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1 text-left w-20 z-10">Time</th>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                return (
                  <th key={h.hour} className={`px-1 py-1 text-center min-w-[56px] ${isBest ? 'text-emerald-400' : isWorst ? 'text-red-400' : ''}`}>
                    {formatHour(h.hour)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Conditions row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Skies</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <span className="text-base">{WMO_ICONS[h.weatherCode] ?? '🌤'}</span>
                  </td>
                )
              })}
            </tr>

            {/* Temp row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Temp</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <span className="text-sm font-mono font-bold text-text-primary">{h.temp}°</span>
                  </td>
                )
              })}
            </tr>

            {/* Wind sustained row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Wind</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <span className={`text-sm font-mono font-bold ${getWindColor(h.windSpeed)}`}>
                      {h.windSpeed}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted ml-0.5">mph</span>
                  </td>
                )
              })}
            </tr>

            {/* Gusts row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Gusts</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                const hasGust = h.windGust && h.windGust > h.windSpeed + 2
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    {hasGust ? (
                      <>
                        <span className={`text-sm font-mono font-bold ${getWindColor(h.windGust)}`}>
                          {h.windGust}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted ml-0.5">mph</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-text-muted/30">—</span>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Wind direction row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Dir</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <span className="text-xs font-mono text-text-muted">{h.windDir || '—'}</span>
                  </td>
                )
              })}
            </tr>

            {/* Rain chance row */}
            <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-muted z-10">Rain %</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                const chance = h.precipChance ?? 0
                return (
                  <td key={h.hour} className={`px-1 py-1.5 text-center ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <span className={`text-sm font-mono font-bold ${getPrecipColor(chance)}`}>
                      {chance}%
                    </span>
                  </td>
                )
              })}
            </tr>

            {/* Rainfall amount row — only if any hour has rain */}
            {hourlyData.some(h => h.precip > 0) && <tr>
              <td className="sticky left-0 bg-dark-card/80 backdrop-blur-sm px-3 py-2 text-xs font-mono text-text-muted z-10">Rain</td>
              {hourlyData.map((h, i) => {
                const isBest = showBestWorst && i === bestIdx
                const isWorst = showBestWorst && i === worstIdx
                const precipHeight = maxPrecip > 0 ? Math.max((h.precip / maxPrecip) * 20, h.precip > 0 ? 3 : 0) : 0
                return (
                  <td key={h.hour} className={`px-1 py-2 ${isBest ? 'bg-emerald-500/8' : isWorst ? 'bg-red-500/8' : ''}`}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-5 h-5 flex items-end justify-center">
                        {precipHeight > 0 && (
                          <div
                            className="w-4 rounded-t bg-blue-400/50"
                            style={{ height: `${precipHeight}px` }}
                          />
                        )}
                      </div>
                      {h.precip > 0 && (
                        <span className="text-[10px] font-mono text-blue-400">{h.precip}"</span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const WeatherStrip = ({ weather = [], tournamentStart }) => {
  const defaultRound = useMemo(() => {
    if (!weather?.length) return 0
    return getCurrentRoundIndex(weather)
  }, [weather])

  const [selectedRound, setSelectedRound] = useState(defaultRound)

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

  const rounds = weather.slice(0, 4)
  const active = rounds[selectedRound] || rounds[0]

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-text-muted">Weather Forecast</h3>
      </div>

      {/* Round tabs — always visible, selected one highlighted */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-dark-border">
        {rounds.map((day, i) => {
          const weatherCode = guessWeatherCode(day.conditions)
          const icon = WMO_ICONS[weatherCode] || '🌤'
          const difficulty = getDifficultyLabel(day.difficultyImpact || 0)
          const windColor = getWindColor(day.windSpeed || 0)
          const isSelected = selectedRound === i

          return (
            <div
              key={i}
              className={`relative p-3 space-y-2 cursor-pointer transition-all
                ${isSelected
                  ? 'bg-dark-card/60 border-t-2 border-t-gold'
                  : 'bg-dark-secondary border-t-2 border-t-transparent hover:bg-dark-card/30'
                }
              `}
              onClick={() => setSelectedRound(i)}
            >
              {/* Round label */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold uppercase ${isSelected ? 'text-gold' : 'text-text-muted'}`}>
                  Round {day.round || i + 1}
                </span>
                <span className="text-lg">{icon}</span>
              </div>

              {/* Temp */}
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-text-primary">
                  {day.temperature != null ? `${Math.round(day.temperature)}°` : '--'}
                </span>
                {day.feelsLike != null && (
                  <span className="text-xs font-mono text-text-muted">
                    / {Math.round(day.feelsLike)}°
                  </span>
                )}
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

      {/* Hourly detail — always visible for selected round */}
      <HourlyDetail
        hourlyData={active.hourlyData}
        roundLabel={`Round ${active.round || selectedRound + 1}`}
      />
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
