// Computes vault owner stats + league stats from raw league history data.
// Used by both the assignment wizard (Step 3 reveal) and the standalone vault page.
// Decoupled from useOwnerAssignment so it can work with data from useLeagueHistory too.

import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../services/api'

// ─── OWNER_COLORS (same as commonNames.js) ─────────────────────────────────
const OWNER_COLORS = [
  '#D4A853', '#6BCB77', '#4D96FF', '#FF6B6B', '#C084FC',
  '#FF9F43', '#54A0FF', '#EE5A6F', '#01CBC6', '#F368E0',
  '#FF6348', '#7BED9F', '#70A1FF', '#FFA502', '#A29BFE',
]

/**
 * Given an array of HistoricalSeason records + owner aliases,
 * compute ranked owner stats + league aggregate stats for the vault display.
 *
 * @param {Array} history - Array of HistoricalSeason records
 * @param {Array} aliases - Array of OwnerAlias records
 * @returns {Object} { ownerStats, leagueStats, hasLiveSeason }
 */
export function computeVaultStats(history, aliases) {
  if (!history || history.length === 0) {
    return { ownerStats: [], leagueStats: { totalSeasons: 0, totalOwners: 0, totalGames: 0, totalPoints: 0, totalTitles: 0 }, hasLiveSeason: false }
  }

  // Build alias map: rawName → canonicalName
  const aliasMap = new Map()
  const activeOwners = new Set()
  const ownerColorMap = new Map()
  let colorIdx = 0

  if (aliases && aliases.length > 0) {
    for (const a of aliases) {
      aliasMap.set(a.ownerName, a.canonicalName)
      if (a.isActive !== false) activeOwners.add(a.canonicalName)
      if (!ownerColorMap.has(a.canonicalName)) {
        ownerColorMap.set(a.canonicalName, OWNER_COLORS[colorIdx % OWNER_COLORS.length])
        colorIdx++
      }
    }
  }

  // Group records by canonical owner name
  const ownerMap = new Map() // canonicalName → { teams: [...], ... }

  for (const record of history) {
    const rawName = record.ownerName || record.teamName || 'Unknown'
    const canonical = aliasMap.get(rawName) || rawName

    if (!ownerMap.has(canonical)) {
      if (!ownerColorMap.has(canonical)) {
        ownerColorMap.set(canonical, OWNER_COLORS[colorIdx % OWNER_COLORS.length])
        colorIdx++
      }
      ownerMap.set(canonical, {
        name: canonical,
        color: ownerColorMap.get(canonical),
        isActive: activeOwners.size > 0 ? activeOwners.has(canonical) : true,
        teams: [],
      })
    }

    const w = record.wins || 0
    const l = record.losses || 0
    const t = record.ties || 0
    const pf = record.pointsFor ? parseFloat(record.pointsFor) : 0
    const pa = record.pointsAgainst ? parseFloat(record.pointsAgainst) : 0

    ownerMap.get(canonical).teams.push({
      seasonYear: record.seasonYear,
      rawName,
      teamName: record.teamName || rawName,
      record: `${w}-${l}${t ? `-${t}` : ''}`,
      wins: w,
      losses: l,
      ties: t,
      pointsFor: pf,
      pointsAgainst: pa,
      playoffResult: record.playoffResult,
      // inProgress detection: if this season is the current year and has a "live" or null playoffResult
      inProgress: false, // Will be set below
    })
  }

  // Detect current/live season (the most recent year)
  const allYears = history.map(h => h.seasonYear).filter(Boolean)
  const maxYear = allYears.length > 0 ? Math.max(...allYears) : null
  let hasLiveSeason = false

  // Mark in-progress teams for the latest season if no playoff result is set
  if (maxYear) {
    for (const [, ownerData] of ownerMap) {
      for (const team of ownerData.teams) {
        if (team.seasonYear === maxYear && !team.playoffResult) {
          team.inProgress = true
          hasLiveSeason = true
        }
      }
    }
  }

  // Compute per-owner stats
  const ownerStats = []
  for (const [, ownerData] of ownerMap) {
    const { name, color, isActive, teams } = ownerData
    const completedTeams = teams.filter(t => !t.inProgress)
    const currentTeam = teams.find(t => t.inProgress) || null

    const totalWins = completedTeams.reduce((s, t) => s + t.wins, 0)
    const totalLosses = completedTeams.reduce((s, t) => s + t.losses, 0)
    const totalTies = completedTeams.reduce((s, t) => s + t.ties, 0)
    const totalPF = completedTeams.reduce((s, t) => s + t.pointsFor, 0)
    const totalPA = completedTeams.reduce((s, t) => s + t.pointsAgainst, 0)
    const totalGames = totalWins + totalLosses
    const winPct = totalGames > 0 ? totalWins / totalGames : 0
    const championships = completedTeams.filter(t => t.playoffResult === 'champion')

    // Best season: highest win% among completed teams
    let bestSeason = null
    for (const t of completedTeams) {
      const games = t.wins + t.losses
      const pct = games > 0 ? t.wins / games : 0
      if (!bestSeason || pct > bestSeason.pct) {
        bestSeason = { team: t.rawName || t.teamName, season: t.seasonYear, pct }
      }
    }

    // Win% per completed season (chronological order for sparkline)
    const winPcts = [...completedTeams]
      .sort((a, b) => a.seasonYear - b.seasonYear)
      .map(t => {
        const games = t.wins + t.losses
        return games > 0 ? t.wins / games : 0
      })

    ownerStats.push({
      name,
      color,
      isActive,
      teams: [...teams].sort((a, b) => b.seasonYear - a.seasonYear),
      totalWins,
      totalLosses,
      totalTies,
      totalPF,
      totalPA,
      winPct,
      titles: championships.length,
      championships,
      seasonCount: completedTeams.length + (currentTeam ? 1 : 0),
      totalSeasons: completedTeams.length + (currentTeam ? 1 : 0),
      bestSeason,
      winPcts,
      currentSeason: currentTeam,
    })
  }

  // Sort by win%
  ownerStats.sort((a, b) => b.winPct - a.winPct)

  // League-level stats
  const totalSeasons = new Set(allYears).size
  const totalGames = Math.round(ownerStats.reduce((s, o) => s + o.totalWins + o.totalLosses, 0) / 2)
  const totalPoints = Math.round(ownerStats.reduce((s, o) => s + o.totalPF, 0))
  const totalTitles = ownerStats.reduce((s, o) => s + o.titles, 0)
  const leagueStats = {
    totalSeasons,
    totalOwners: ownerStats.length,
    totalGames,
    totalPoints,
    totalTitles,
  }

  return { ownerStats, leagueStats, hasLiveSeason }
}

/**
 * Hook version — fetches history + aliases and computes vault stats.
 * Used by the standalone vault page (VaultPage).
 */
export function useVaultStats(leagueId) {
  const [history, setHistory] = useState(null)
  const [aliases, setAliases] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!leagueId) return
    try {
      setLoading(true)
      const [historyData, aliasData] = await Promise.all([
        api.getLeagueHistory(leagueId),
        api.getOwnerAliases(leagueId),
      ])
      setHistory(historyData)
      setAliases(aliasData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { fetchData() }, [fetchData])

  const vaultData = useMemo(() => {
    if (!history) return { ownerStats: [], leagueStats: { totalSeasons: 0, totalOwners: 0, totalGames: 0, totalPoints: 0, totalTitles: 0 }, hasLiveSeason: false }
    return computeVaultStats(history, aliases)
  }, [history, aliases])

  return { ...vaultData, loading, error, refetch: fetchData }
}
