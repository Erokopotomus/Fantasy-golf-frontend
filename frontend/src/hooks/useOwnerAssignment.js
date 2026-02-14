import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../services/api'
import { OWNER_COLORS, detectNames } from '../utils/commonNames'

// Format years into compact ranges: [2010,2011,2012,2015] → "2010-12, 2015"
export function formatYearRanges(years) {
  if (!years || years.length === 0) return ''
  const sorted = [...years].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? String(start) : `${start}-${String(end).slice(2)}`)
      start = end = sorted[i]
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${String(end).slice(2)}`)
  return ranges.join(', ')
}

export function useOwnerAssignment(leagueId) {
  // ─── Data Loading ──────────────────────────────────────────────────────────
  const [league, setLeague] = useState(null)
  const [history, setHistory] = useState(null)
  const [existingAliases, setExistingAliases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)

  // ─── Step Navigation ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ─── Step 1: Owners ────────────────────────────────────────────────────────
  // owners: Map<canonicalName, { name, color, isActive }>
  const [owners, setOwners] = useState(new Map())
  const [dismissedDetections, setDismissedDetections] = useState(new Set())

  // ─── Step 2: Assignments ───────────────────────────────────────────────────
  const [activeOwnerId, setActiveOwnerId] = useState(null)
  const [assignments, setAssignments] = useState(new Map()) // rawName → ownerCanonicalName
  const [undoStack, setUndoStack] = useState([])
  const [sortMode, setSortMode] = useState('season') // 'season' | 'alpha'
  const [seasonFilter, setSeasonFilter] = useState(null) // null = all
  const [infoBannerDismissed, setInfoBannerDismissed] = useState(false)
  const [claimingSet, setClaimingSet] = useState(new Set()) // rawNames currently animating out
  const [lastClaimedName, setLastClaimedName] = useState(null)

  // ─── Step 3: Save ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false)

  // ─── Load Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leagueId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [leagueRes, historyRes, aliasRes] = await Promise.all([
          api.getLeague(leagueId),
          api.getLeagueHistory(leagueId),
          api.getOwnerAliases(leagueId),
        ])
        if (cancelled) return
        setLeague(leagueRes.league || leagueRes)
        setHistory(historyRes)
        setExistingAliases(aliasRes.aliases || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load league data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [leagueId])

  // ─── Derived: Team Entries ─────────────────────────────────────────────────
  // Flatten history into team entries
  const teamEntries = useMemo(() => {
    if (!history?.seasons) return []
    const entries = []
    for (const [year, teams] of Object.entries(history.seasons)) {
      for (const t of (Array.isArray(teams) ? teams : [])) {
        const rawName = String(t.ownerName || t.teamName || '')
        if (!rawName) continue
        entries.push({
          rawName,
          teamName: String(t.teamName || ''),
          ownerName: String(t.ownerName || ''),
          seasonYear: parseInt(year),
          wins: Number(t.wins) || 0,
          losses: Number(t.losses) || 0,
          ties: Number(t.ties) || 0,
          pointsFor: Number(t.pointsFor) || 0,
          pointsAgainst: Number(t.pointsAgainst) || 0,
          playoffResult: t.playoffResult || null,
          id: t.id,
        })
      }
    }
    return entries.sort((a, b) => b.seasonYear - a.seasonYear)
  }, [history])

  // Unique raw names
  const uniqueRawNames = useMemo(() => {
    const set = new Set()
    for (const e of teamEntries) set.add(e.rawName)
    return set
  }, [teamEntries])

  // Map: rawName → [TeamEntry, ...] (sorted by year desc)
  const rawNameToEntries = useMemo(() => {
    const map = new Map()
    for (const e of teamEntries) {
      if (!map.has(e.rawName)) map.set(e.rawName, [])
      map.get(e.rawName).push(e)
    }
    return map
  }, [teamEntries])

  // Map: rawName → [year, ...] (sorted)
  const nameToYears = useMemo(() => {
    const map = {}
    for (const e of teamEntries) {
      if (!map[e.rawName]) map[e.rawName] = []
      if (!map[e.rawName].includes(e.seasonYear)) map[e.rawName].push(e.seasonYear)
    }
    for (const arr of Object.values(map)) arr.sort((a, b) => a - b)
    return map
  }, [teamEntries])

  // Auto-detected names
  const detectedNames = useMemo(() => {
    const rawNames = [...uniqueRawNames].filter(n => !dismissedDetections.has(n))
    return detectNames(rawNames, nameToYears)
  }, [uniqueRawNames, nameToYears, dismissedDetections])

  // Available years for filter pills
  const availableYears = useMemo(() => {
    const years = new Set()
    for (const e of teamEntries) years.add(e.seasonYear)
    return [...years].sort((a, b) => b - a) // newest first
  }, [teamEntries])

  // ─── Derived: Unclaimed ────────────────────────────────────────────────────

  // Raw names not yet assigned
  const unclaimedRawNames = useMemo(() =>
    [...uniqueRawNames].filter(n => !assignments.has(n)),
    [uniqueRawNames, assignments]
  )

  // Unclaimed entries for the grid (filtered + sorted, grouped by rawName)
  const unclaimedCards = useMemo(() => {
    // Get all unclaimed rawNames
    let names = [...uniqueRawNames].filter(n => !assignments.has(n) && !claimingSet.has(n))

    // Season filter
    if (seasonFilter !== null) {
      names = names.filter(n => {
        const entries = rawNameToEntries.get(n) || []
        return entries.some(e => e.seasonYear === seasonFilter)
      })
    }

    // Build card data per rawName
    const cards = names.map(rawName => {
      const entries = rawNameToEntries.get(rawName) || []
      const filteredEntries = seasonFilter !== null
        ? entries.filter(e => e.seasonYear === seasonFilter)
        : entries
      return {
        rawName,
        entries: filteredEntries,
        allEntries: entries,
        totalWins: entries.reduce((s, e) => s + e.wins, 0),
        totalLosses: entries.reduce((s, e) => s + e.losses, 0),
        totalPF: entries.reduce((s, e) => s + e.pointsFor, 0),
        hasChampionship: entries.some(e => e.playoffResult === 'champion'),
        years: (nameToYears[rawName] || []),
      }
    })

    // Sort
    if (sortMode === 'alpha') {
      cards.sort((a, b) => a.rawName.localeCompare(b.rawName))
    } else {
      // By season: newest first (most recent entry year)
      cards.sort((a, b) => {
        const aMax = Math.max(...a.years, 0)
        const bMax = Math.max(...b.years, 0)
        return bMax - aMax || a.rawName.localeCompare(b.rawName)
      })
    }

    return cards
  }, [uniqueRawNames, assignments, claimingSet, seasonFilter, rawNameToEntries, nameToYears, sortMode])

  // Cards currently in claiming animation
  const claimingCards = useMemo(() => {
    return [...claimingSet].map(rawName => {
      const entries = rawNameToEntries.get(rawName) || []
      return {
        rawName,
        entries,
        allEntries: entries,
        totalWins: entries.reduce((s, e) => s + e.wins, 0),
        totalLosses: entries.reduce((s, e) => s + e.losses, 0),
        totalPF: entries.reduce((s, e) => s + e.pointsFor, 0),
        hasChampionship: entries.some(e => e.playoffResult === 'champion'),
        years: (nameToYears[rawName] || []),
      }
    })
  }, [claimingSet, rawNameToEntries, nameToYears])

  // ─── Derived: Per-Owner Claimed ────────────────────────────────────────────

  const ownerClaimedEntries = useMemo(() => {
    const map = new Map()
    for (const [name] of owners) {
      map.set(name, [])
    }
    for (const [rawName, ownerName] of assignments) {
      if (!map.has(ownerName)) map.set(ownerName, [])
      const entries = rawNameToEntries.get(rawName) || []
      map.get(ownerName).push({ rawName, entries })
    }
    return map
  }, [owners, assignments, rawNameToEntries])

  // ─── Derived: Progress ─────────────────────────────────────────────────────

  const progress = useMemo(() => {
    const total = uniqueRawNames.size
    const claimed = assignments.size
    const perOwner = new Map()
    for (const [name] of owners) perOwner.set(name, 0)
    for (const [, ownerName] of assignments) {
      perOwner.set(ownerName, (perOwner.get(ownerName) || 0) + 1)
    }
    return { total, claimed, remaining: total - claimed, perOwner }
  }, [uniqueRawNames, assignments, owners])

  // ─── Derived: Step 3 Summaries ─────────────────────────────────────────────

  const ownerSummaries = useMemo(() => {
    const summaries = []
    for (const [name, data] of owners) {
      const claimed = ownerClaimedEntries.get(name) || []
      let totalSeasons = 0
      let totalWins = 0, totalLosses = 0, totalTies = 0
      let totalPF = 0, totalPA = 0
      const championships = []
      const teams = []

      for (const { rawName, entries } of claimed) {
        for (const e of entries) {
          totalSeasons++
          totalWins += e.wins
          totalLosses += e.losses
          totalTies += e.ties
          totalPF += e.pointsFor
          totalPA += e.pointsAgainst
          if (e.playoffResult === 'champion') championships.push(e.seasonYear)
          teams.push({ rawName, teamName: e.teamName, seasonYear: e.seasonYear, record: `${e.wins}-${e.losses}${e.ties ? `-${e.ties}` : ''}`, pointsFor: e.pointsFor, playoffResult: e.playoffResult })
        }
      }

      teams.sort((a, b) => b.seasonYear - a.seasonYear)

      summaries.push({
        name,
        color: data.color,
        isActive: data.isActive,
        totalSeasons,
        totalWins, totalLosses, totalTies,
        totalPF, totalPA,
        championships,
        teams,
        claimedRawNames: claimed.length,
      })
    }

    summaries.sort((a, b) => b.totalSeasons - a.totalSeasons)
    return summaries
  }, [owners, ownerClaimedEntries])

  // ─── Derived: Vault Reveal Stats ──────────────────────────────────────────

  // Owner stats for the vault reveal — sorted by all-time win%
  const vaultOwnerStats = useMemo(() => {
    return ownerSummaries.map(summary => {
      const totalGames = summary.totalWins + summary.totalLosses
      const winPct = totalGames > 0 ? summary.totalWins / totalGames : 0

      // Best season — highest win% among their assigned teams
      let bestSeason = null
      if (summary.teams.length > 0) {
        for (const t of summary.teams) {
          const [w, l] = t.record.split('-').map(Number)
          const pct = (w + l) > 0 ? w / (w + l) : 0
          if (!bestSeason || pct > bestSeason.pct) {
            bestSeason = { team: t.rawName || t.teamName, season: t.seasonYear, pct }
          }
        }
      }

      // Win% per season (chronological order for sparkline)
      const winPcts = [...summary.teams]
        .sort((a, b) => a.seasonYear - b.seasonYear)
        .map(t => {
          const [w, l] = t.record.split('-').map(Number)
          return (w + l) > 0 ? w / (w + l) : 0
        })

      return {
        ...summary,
        winPct,
        bestSeason,
        winPcts,
        titles: summary.championships.length,
        seasonCount: summary.totalSeasons,
      }
    }).sort((a, b) => b.winPct - a.winPct)
  }, [ownerSummaries])

  // Aggregate league-level stats for the vault reveal header
  const vaultLeagueStats = useMemo(() => {
    const totalSeasons = new Set(teamEntries.map(e => e.seasonYear)).size
    const totalGames = Math.round(
      ownerSummaries.reduce((s, o) => s + o.totalWins + o.totalLosses, 0) / 2
    )
    const totalPoints = Math.round(
      ownerSummaries.reduce((s, o) => s + o.totalPF, 0)
    )
    const totalTitles = ownerSummaries.reduce((s, o) => s + o.championships.length, 0)
    return { totalSeasons, totalOwners: owners.size, totalGames, totalPoints, totalTitles }
  }, [ownerSummaries, teamEntries, owners])

  // Unassigned entries for Step 3
  const unassignedEntries = useMemo(() => {
    return [...uniqueRawNames]
      .filter(n => !assignments.has(n))
      .map(rawName => {
        const entries = rawNameToEntries.get(rawName) || []
        return {
          rawName,
          entries,
          years: nameToYears[rawName] || [],
        }
      })
      .sort((a, b) => a.rawName.localeCompare(b.rawName))
  }, [uniqueRawNames, assignments, rawNameToEntries, nameToYears])

  // ─── Actions: Step 1 — Owners ──────────────────────────────────────────────

  const nextColorIndex = useMemo(() => owners.size, [owners.size])

  const addOwner = useCallback((name, isActive = true) => {
    if (!name?.trim()) return false
    const trimmed = name.trim()
    // Prevent duplicate (case-insensitive)
    for (const [existing] of owners) {
      if (existing.toLowerCase() === trimmed.toLowerCase()) return false
    }
    setOwners(prev => {
      const next = new Map(prev)
      next.set(trimmed, {
        name: trimmed,
        color: OWNER_COLORS[next.size % OWNER_COLORS.length],
        isActive,
      })
      return next
    })
    setHasChanges(true)
    return true
  }, [owners])

  const removeOwner = useCallback((name) => {
    setOwners(prev => {
      const next = new Map(prev)
      next.delete(name)
      return next
    })
    // Clear assignments for this owner
    setAssignments(prev => {
      const next = new Map(prev)
      for (const [rawName, ownerName] of prev) {
        if (ownerName === name) next.delete(rawName)
      }
      return next
    })
    if (activeOwnerId === name) setActiveOwnerId(null)
    setHasChanges(true)
  }, [activeOwnerId])

  const renameOwner = useCallback((oldName, newName) => {
    if (!newName?.trim() || newName.trim() === oldName) return false
    const trimmed = newName.trim()
    // Prevent duplicate
    for (const [existing] of owners) {
      if (existing.toLowerCase() === trimmed.toLowerCase() && existing !== oldName) return false
    }
    setOwners(prev => {
      const next = new Map()
      for (const [key, val] of prev) {
        if (key === oldName) {
          next.set(trimmed, { ...val, name: trimmed })
        } else {
          next.set(key, val)
        }
      }
      return next
    })
    // Update assignments
    setAssignments(prev => {
      const next = new Map()
      for (const [rawName, ownerName] of prev) {
        next.set(rawName, ownerName === oldName ? trimmed : ownerName)
      }
      return next
    })
    if (activeOwnerId === oldName) setActiveOwnerId(trimmed)
    setHasChanges(true)
    return true
  }, [owners, activeOwnerId])

  const toggleOwnerActive = useCallback((name) => {
    setOwners(prev => {
      const next = new Map(prev)
      const data = next.get(name)
      if (data) next.set(name, { ...data, isActive: !data.isActive })
      return next
    })
    setHasChanges(true)
  }, [])

  const dismissDetection = useCallback((name) => {
    setDismissedDetections(prev => new Set(prev).add(name))
  }, [])

  // ─── Actions: Step 2 — Assignments ─────────────────────────────────────────

  const claimForActiveOwner = useCallback((rawName) => {
    if (!activeOwnerId) return
    // Push undo state
    setUndoStack(prev => [...prev, new Map(assignments)])
    setAssignments(prev => new Map(prev).set(rawName, activeOwnerId))
    setLastClaimedName(rawName)
    setHasChanges(true)
    // Clear flash after 600ms
    setTimeout(() => setLastClaimedName(null), 600)
  }, [activeOwnerId, assignments])

  // Animated claim — adds to claimingSet, then after delay actually assigns
  const handleClaimAnimated = useCallback((rawName) => {
    if (!activeOwnerId) return
    setClaimingSet(prev => new Set(prev).add(rawName))
    setTimeout(() => {
      claimForActiveOwner(rawName)
      setClaimingSet(prev => {
        const next = new Set(prev)
        next.delete(rawName)
        return next
      })
    }, 300)
  }, [activeOwnerId, claimForActiveOwner])

  const unassignTeam = useCallback((rawName) => {
    setUndoStack(prev => [...prev, new Map(assignments)])
    setAssignments(prev => {
      const next = new Map(prev)
      next.delete(rawName)
      return next
    })
    setHasChanges(true)
  }, [assignments])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    setAssignments(undoStack[undoStack.length - 1])
    setUndoStack(prev => prev.slice(0, -1))
  }, [undoStack])

  // ─── Actions: Step 3 — Save ────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const aliases = []

      // Build alias for every assignment
      for (const [rawName, canonicalName] of assignments) {
        const ownerData = owners.get(canonicalName)
        const isActive = ownerData?.isActive !== false
        aliases.push({
          ownerName: rawName,
          canonicalName,
          isActive,
        })
      }

      // For inactive owners that might also be raw names (self-referencing)
      for (const [name, data] of owners) {
        if (!data.isActive) {
          // Ensure the canonical name itself is recorded as inactive if not already in aliases
          const alreadyHas = aliases.some(a => a.ownerName === name && a.canonicalName === name)
          if (!alreadyHas) {
            aliases.push({
              ownerName: name,
              canonicalName: name,
              isActive: false,
            })
          }
        }
      }

      await api.saveOwnerAliases(leagueId, aliases)
      setHasChanges(false)
      return true
    } catch (err) {
      setSaveError(err.message || 'Failed to save')
      return false
    } finally {
      setSaving(false)
    }
  }, [assignments, owners, leagueId])

  // ─── Initialize from Existing Aliases OR Auto-detect from Most Recent Season ──

  useEffect(() => {
    if (initialized || loading || !history) return

    // Case 1: Existing aliases — restore them
    if (existingAliases && existingAliases.length > 0) {
      const ownersMap = new Map()
      const assignMap = new Map()
      let ci = 0

      for (const alias of existingAliases) {
        if (!ownersMap.has(alias.canonicalName)) {
          ownersMap.set(alias.canonicalName, {
            name: alias.canonicalName,
            color: OWNER_COLORS[ci % OWNER_COLORS.length],
            isActive: alias.isActive !== false,
          })
          ci++
        }
        assignMap.set(alias.ownerName, alias.canonicalName)
        if (!assignMap.has(alias.canonicalName)) {
          assignMap.set(alias.canonicalName, alias.canonicalName)
        }
      }

      for (const rawName of uniqueRawNames) {
        if (ownersMap.has(rawName) && !assignMap.has(rawName)) {
          assignMap.set(rawName, rawName)
        }
      }

      setOwners(ownersMap)
      setAssignments(assignMap)
      // Stay on Step 1 so user can review/confirm owners before proceeding
      setInitialized(true)
      return
    }

    // Case 2: No existing aliases — auto-detect owners from most recent season
    // Pre-fill the owners list but stay on Step 1 for user confirmation
    if (teamEntries.length === 0) {
      setInitialized(true)
      return
    }

    // Find the most recent year
    const mostRecentYear = Math.max(...teamEntries.map(e => e.seasonYear))
    const mostRecentEntries = teamEntries.filter(e => e.seasonYear === mostRecentYear)

    // Create owners from most recent season's owner names
    const ownersMap = new Map()
    let ci = 0
    for (const entry of mostRecentEntries) {
      const name = entry.rawName
      if (!ownersMap.has(name)) {
        ownersMap.set(name, {
          name,
          color: OWNER_COLORS[ci % OWNER_COLORS.length],
          isActive: true,
        })
        ci++
      }
    }

    // Pre-assign team-seasons where the rawName exactly matches an owner
    const assignMap = new Map()
    for (const rawName of uniqueRawNames) {
      if (ownersMap.has(rawName)) {
        assignMap.set(rawName, rawName)
      }
    }

    setOwners(ownersMap)
    setAssignments(assignMap)

    // Stay on Step 1 so user can review the auto-detected owners
    setInitialized(true)
  }, [existingAliases, loading, history, initialized, uniqueRawNames, teamEntries])

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Data
    loading, error, league, history, teamEntries, nameToYears,
    inviteCode: league?.inviteCode || null,

    // Step navigation
    step, setStep,
    canProceedToStep2: owners.size > 0,

    // Step 1
    owners, detectedNames, uniqueRawNames, rawNameToEntries, availableYears,
    addOwner, removeOwner, renameOwner, toggleOwnerActive, dismissDetection,

    // Step 2
    activeOwnerId, setActiveOwnerId, assignments,
    unclaimedCards, claimingCards, ownerClaimedEntries,
    progress,
    sortMode, setSortMode, seasonFilter, setSeasonFilter,
    infoBannerDismissed, setInfoBannerDismissed,
    handleClaimAnimated, unassignTeam, undo,
    canUndo: undoStack.length > 0,
    lastClaimedName,

    // Step 3
    ownerSummaries, unassignedEntries,
    saving, saveError, save,

    // Vault reveal
    vaultOwnerStats, vaultLeagueStats,

    // Unsaved changes
    hasChanges,
  }
}
