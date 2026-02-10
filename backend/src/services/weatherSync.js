/**
 * Weather Sync Orchestrator
 *
 * Finds upcoming/in-progress tournaments with course coordinates,
 * fetches forecasts from Open-Meteo, and upserts Weather records.
 */

const { getTournamentForecast } = require('./weatherService')

async function syncTournamentWeather(prisma) {
  console.log('[WeatherSync] Starting weather sync...')

  // Find tournaments that need weather data
  const tournaments = await prisma.tournament.findMany({
    where: {
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
      course: {
        latitude: { not: null },
        longitude: { not: null },
      },
    },
    include: {
      course: {
        select: { id: true, latitude: true, longitude: true, name: true },
      },
    },
    orderBy: { startDate: 'asc' },
    take: 3, // Don't fetch for every upcoming tournament, just the next few
  })

  if (tournaments.length === 0) {
    console.log('[WeatherSync] No tournaments with course coordinates found')
    return { synced: 0 }
  }

  let synced = 0

  for (const tournament of tournaments) {
    const { course } = tournament
    if (!course?.latitude || !course?.longitude) continue

    // Check if forecast is within range (Open-Meteo supports ~16 days out)
    const start = new Date(tournament.startDate)
    const end = new Date(tournament.endDate)
    const now = new Date()
    const daysUntilStart = Math.floor((start - now) / 86400000)

    if (daysUntilStart > 16) {
      console.log(`[WeatherSync] ${tournament.name}: ${daysUntilStart} days out — too far for forecast`)
      continue
    }

    try {
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]

      const forecast = await getTournamentForecast(
        course.latitude,
        course.longitude,
        startStr,
        endStr
      )

      if (!forecast.days || forecast.days.length === 0) {
        console.log(`[WeatherSync] ${tournament.name}: No forecast data returned`)
        continue
      }

      // Upsert weather records — one per round/day
      for (let i = 0; i < forecast.days.length; i++) {
        const day = forecast.days[i]
        const roundNumber = i + 1

        // Use a deterministic lookup — find existing by tournament + round
        const existing = await prisma.weather.findFirst({
          where: {
            tournamentId: tournament.id,
            round: roundNumber,
          },
        })

        const weatherData = {
          tournamentId: tournament.id,
          courseId: course.id,
          timestamp: new Date(day.date),
          round: roundNumber,
          temperature: day.tempHigh,
          feelsLike: day.tempLow, // Using low temp as secondary reference
          windSpeed: day.windSpeed,
          windGust: day.windGust,
          windDirection: day.windDirection,
          precipitation: day.precipitation,
          conditions: day.conditions,
          difficultyImpact: day.difficultyImpact,
          hourlyData: day.hourly?.length ? day.hourly : undefined,
        }

        if (existing) {
          await prisma.weather.update({
            where: { id: existing.id },
            data: weatherData,
          })
        } else {
          await prisma.weather.create({ data: weatherData })
        }
      }

      synced++
      console.log(`[WeatherSync] ${tournament.name}: ${forecast.days.length} days synced`)
    } catch (err) {
      console.error(`[WeatherSync] ${tournament.name}: Error — ${err.message}`)
    }
  }

  console.log(`[WeatherSync] Done: ${synced} tournaments synced`)
  return { synced }
}

module.exports = { syncTournamentWeather }
