import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

/**
 * Flatten API leaderboard entry — same pattern as useTournamentScoring.
 */
function flattenEntry(entry) {
  const player = entry.player || {}
  return {
    id: player.id,
    name: player.name,
    country: player.country,
    countryFlag: player.countryFlag,
    headshotUrl: player.headshotUrl,
    owgrRank: player.owgrRank,
    primaryTour: player.primaryTour,
    position: entry.positionTied ? `T${entry.position}` : entry.position,
    score: entry.totalToPar,
    today: entry.today,
    thru: entry.thru,
    status: entry.status,
    fantasyPoints: entry.fantasyPoints,
    clutchMetrics: entry.clutchMetrics ?? null,
    courseHistory: entry.courseHistory ?? null,
  }
}

export const useTournamentPreview = (tournamentId) => {
  const [tournament, setTournament] = useState(null)
  const [course, setCourse] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [weather, setWeather] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPreview = useCallback(async () => {
    if (!tournamentId) return

    try {
      setError(null)

      // Phase 1: fetch tournament, leaderboard, and weather in parallel
      const [tournamentRes, leaderboardRes, weatherRes] = await Promise.all([
        api.getTournament(tournamentId),
        api.getTournamentLeaderboard(tournamentId).catch(() => ({ leaderboard: [] })),
        api.getTournamentWeather(tournamentId).catch(() => ({ weather: [] })),
      ])

      const tournamentData = tournamentRes?.tournament || null
      setTournament(tournamentData)
      setLeaderboard((leaderboardRes?.leaderboard || []).map(flattenEntry))
      setWeather(weatherRes?.weather || [])

      // Phase 2: fetch course (needs courseId from tournament)
      const courseId = tournamentData?.courseId || tournamentData?.course?.id
      if (courseId) {
        try {
          const courseRes = await api.getCourse(courseId)
          setCourse(courseRes?.course || courseRes || null)
        } catch {
          setCourse(tournamentData?.course || null)
        }
      } else {
        setCourse(tournamentData?.course || null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    if (tournamentId) {
      setLoading(true)
      fetchPreview()
    }
  }, [tournamentId, fetchPreview])

  return { tournament, course, leaderboard, weather, loading, error }
}

export default useTournamentPreview
