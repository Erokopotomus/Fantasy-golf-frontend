import { useMemo } from 'react'

const POS_COLORS = {
  QB: '#3B82F6',   // blue
  RB: '#10B981',   // emerald
  WR: '#D4930D',   // gold
  TE: '#8B5CF6',   // purple
  K: '#F97316',    // orange
  DST: '#EF4444',  // red
  FLEX: '#6B7280', // gray
}

const COMPARE_COLORS = ['#D4930D', '#10B981', '#3B82F6', '#8B5CF6', '#F97316']

function getPositionGroup(position) {
  const p = (position || '').trim().toUpperCase()
  if (!p) return null // no position data — don't default to FLEX
  if (['DEF', 'DST', 'D/ST'].includes(p)) return 'DST'
  if (['W/R/T', 'W/R', 'FLEX', 'FLX'].includes(p)) return 'FLEX'
  if (['QB', 'RB', 'WR', 'TE', 'K'].includes(p)) return p
  // Basketball / other sports
  if (['G', 'F', 'C', 'PG', 'SG', 'SF', 'PF'].includes(p)) return p
  return null
}

// Build maps for a given season's teams to resolve pick owners to canonical names
function buildOwnerMaps(teams, aliasMap = {}) {
  const rosterMap = {}    // rosterId → canonical name
  const teamKeyMap = {}   // teamKey → canonical name
  const rawToCanonical = {} // raw/alias name → canonical name (case-insensitive)
  const canonicalNames = [] // all canonical names for fuzzy matching

  // First, incorporate the vault's alias map (team names, raw names → canonical)
  for (const [raw, canonical] of Object.entries(aliasMap)) {
    rawToCanonical[raw.toLowerCase()] = canonical
  }

  for (let i = 0; i < teams.length; i++) {
    const t = teams[i]
    const canonical = t.ownerName || t.teamName
    rosterMap[i + 1] = canonical
    canonicalNames.push(canonical)
    if (t.teamKey) teamKeyMap[t.teamKey] = canonical
    // Map raw import names and team names to canonical
    if (t.rawOwnerName) rawToCanonical[t.rawOwnerName.toLowerCase()] = canonical
    if (t.teamName) rawToCanonical[t.teamName.toLowerCase()] = canonical
    rawToCanonical[canonical.toLowerCase()] = canonical
  }
  return { rosterMap, teamKeyMap, rawToCanonical, canonicalNames }
}

function resolveOwnerFromPick(pick, maps) {
  const { rosterMap, teamKeyMap, rawToCanonical, canonicalNames } = maps
  // Try structural IDs first (most reliable — maps to canonical)
  if (pick.teamKey && teamKeyMap[pick.teamKey]) return teamKeyMap[pick.teamKey]
  if (pick.rosterId != null && rosterMap[pick.rosterId]) return rosterMap[pick.rosterId]
  // Fall back to name matching — canonicalize raw names
  if (pick.ownerName) {
    const raw = pick.ownerName.toLowerCase()
    const canonical = rawToCanonical[raw]
    if (canonical) return canonical
    // Fuzzy fallback: match raw pick name to canonical team names
    const rawTrimmed = raw.trim()
    if (rawTrimmed.length >= 3) {
      // 1. Exact prefix: "Spencer" matches "Spencer H", "Nick" matches "Nick Trow"
      const prefixMatch = canonicalNames.find(c => c.toLowerCase().startsWith(rawTrimmed))
      if (prefixMatch) return prefixMatch
      // 2. Canonical starts with raw first word
      const firstWord = rawTrimmed.split(/\s+/)[0]
      if (firstWord.length >= 3) {
        const wordMatch = canonicalNames.find(c => c.toLowerCase().startsWith(firstWord))
        if (wordMatch) return wordMatch
      }
      // 3. Shared prefix (3+ chars): "Jake" matches "Jakob" (share "jak"), "Mason" matches "Mase R" (share "mas")
      const match3 = canonicalNames.find(c => {
        const cl = c.toLowerCase()
        const shared = Math.min(rawTrimmed.length, cl.length)
        let common = 0
        for (let i = 0; i < shared; i++) {
          if (rawTrimmed[i] === cl[i]) common++
          else break
        }
        return common >= 3
      })
      if (match3) return match3
    }
    return pick.ownerName // unmatched raw name as last resort
  }
  return null
}

export function useDraftIntelligence(history, aliasMap = {}, resolvedPositions = {}) {
  const allDraftData = useMemo(() => {
    if (!history?.seasons) return null
    const result = {}
    for (const [year, teams] of Object.entries(history.seasons)) {
      const teamWithDraft = teams.find(t => t.draftData?.picks?.length > 0)
      if (!teamWithDraft?.draftData) continue
      const draft = teamWithDraft.draftData
      const maps = buildOwnerMaps(teams, aliasMap)
      const flatPicks = (draft.picks || []).map(pick => {
        // Use pick's position, or look up from resolved positions cache
        const pos = pick.position || (pick.playerName && resolvedPositions[pick.playerName]) || null
        return {
          ...pick,
          ownerName: resolveOwnerFromPick(pick, maps),
          positionGroup: getPositionGroup(pos),
          cost: pick.amount || pick.cost || 0,
        }
      })
      result[year] = {
        type: draft.type || 'snake',
        rounds: draft.rounds,
        picks: flatPicks,
        teams,
      }
    }
    return Object.keys(result).length > 0 ? result : null
  }, [history, aliasMap, resolvedPositions])

  const getSeasonSummary = useMemo(() => {
    if (!allDraftData) return () => null
    return (year) => {
      const data = allDraftData[year]
      if (!data) return null
      const { type, picks, teams } = data
      const isAuction = type === 'auction'

      // Spend by position (auction) — skip picks without position data
      const spendByPosition = {}
      const picksByPosition = {}
      let totalSpend = 0
      let picksWithPosition = 0
      let spendWithPosition = 0
      for (const pick of picks) {
        totalSpend += pick.cost
        const pos = pick.positionGroup
        if (!pos) continue // skip picks without position data
        if (!spendByPosition[pos]) spendByPosition[pos] = 0
        if (!picksByPosition[pos]) picksByPosition[pos] = 0
        spendByPosition[pos] += pick.cost
        picksByPosition[pos]++
        picksWithPosition++
        spendWithPosition += pick.cost
      }

      // Owner spending
      const ownerMap = {}
      for (const pick of picks) {
        const owner = pick.ownerName || 'Unknown'
        if (!ownerMap[owner]) ownerMap[owner] = { totalSpent: 0, picks: [], keepers: 0 }
        ownerMap[owner].totalSpent += pick.cost
        ownerMap[owner].picks.push(pick)
        if (pick.isKeeper) ownerMap[owner].keepers++
      }
      const ownerSpending = Object.entries(ownerMap)
        .map(([name, data]) => ({
          name,
          totalSpent: data.totalSpent,
          avgCost: data.picks.length > 0 ? data.totalSpent / data.picks.length : 0,
          mostExpensive: data.picks.reduce((max, p) => p.cost > (max?.cost || 0) ? p : max, null),
          pickCount: data.picks.length,
          keepers: data.keepers,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)

      // Value leaders — top 5 most expensive
      const sortedByCost = [...picks].sort((a, b) => b.cost - a.cost)
      const mostExpensive = sortedByCost.slice(0, 5)

      // Keeper steals (biggest discount)
      const keeperSteals = picks
        .filter(p => p.isKeeper && p.cost > 0 && p.keeperPrice != null)
        .map(p => ({ ...p, discount: p.cost - (p.keeperPrice || 0) }))
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 5)

      // Snake-specific: early picks and late round steals
      const earlyPicks = !isAuction
        ? [...picks].filter(p => p.round <= 2).sort((a, b) => a.round - b.round || a.pick - b.pick).slice(0, 10)
        : []
      const lateRoundPicks = !isAuction
        ? [...picks].filter(p => p.round >= (data.rounds || 10) - 2).sort((a, b) => a.round - b.round || a.pick - b.pick)
        : []

      return {
        type,
        totalPicks: picks.length,
        totalSpend,
        spendByPosition,
        spendWithPosition,
        picksByPosition,
        picksWithPosition,
        ownerSpending,
        mostExpensive,
        keeperSteals,
        earlyPicks,
        lateRoundPicks,
        hasPositionData: picksWithPosition > 0,
      }
    }
  }, [allDraftData])

  const getTrends = useMemo(() => {
    if (!allDraftData) return () => null
    return () => {
      const years = Object.keys(allDraftData).sort()
      if (years.length < 3) return null

      const positionTrends = years.map(year => {
        const { picks, type } = allDraftData[year]
        const isAuction = type === 'auction'
        const posCounts = {}
        const posSpend = {}
        let totalSpend = 0
        let totalWithPos = 0
        for (const pick of picks) {
          const pos = pick.positionGroup
          if (!pos) continue // skip picks without position data
          if (!posCounts[pos]) posCounts[pos] = 0
          if (!posSpend[pos]) posSpend[pos] = 0
          posCounts[pos]++
          posSpend[pos] += pick.cost
          totalSpend += pick.cost
          totalWithPos++
        }
        // Normalize to percentages
        const breakdown = {}
        const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'FLEX']
        for (const pos of allPositions) {
          if (isAuction && totalSpend > 0) {
            breakdown[pos] = ((posSpend[pos] || 0) / totalSpend * 100)
          } else {
            breakdown[pos] = totalWithPos > 0 ? ((posCounts[pos] || 0) / totalWithPos * 100) : 0
          }
        }
        return { year, breakdown, isAuction, hasPositionData: totalWithPos > 0 }
      })
      // Only return trends if at least some years have position data
      if (!positionTrends.some(t => t.hasPositionData)) return null

      return { positionTrends, years }
    }
  }, [allDraftData])

  const getOwnerProfile = useMemo(() => {
    if (!allDraftData) return () => null
    return (ownerName) => {
      if (!ownerName) return null

      // Build alias set from seasons
      const ownerAliases = new Set([ownerName])
      if (history?.seasons) {
        for (const teams of Object.values(history.seasons)) {
          const team = teams.find(t => (t.ownerName || t.teamName) === ownerName)
          if (team?.rawOwnerName) ownerAliases.add(team.rawOwnerName)
        }
      }

      let careerSpend = 0
      let totalPicks = 0
      let totalKeepers = 0
      const positionCounts = {}
      const playerSet = new Set()
      const playerKeeperCounts = {} // playerName → count kept
      let biggestPick = null
      const yearData = []

      for (const [year, data] of Object.entries(allDraftData)) {
        const { picks, type, teams } = data
        // Build roster map for this year
        const rosterMap = {}
        for (let i = 0; i < teams.length; i++) {
          rosterMap[i + 1] = teams[i].ownerName || teams[i].teamName
        }

        const myPicks = picks.filter(pick => {
          if (pick.ownerName && ownerAliases.has(pick.ownerName)) return true
          if (pick.rosterId != null && rosterMap[pick.rosterId] === ownerName) return true
          return false
        })

        if (myPicks.length === 0) continue

        let yearSpend = 0
        for (const pick of myPicks) {
          yearSpend += pick.cost
          totalPicks++
          const pos = pick.positionGroup
          if (pos) {
            if (!positionCounts[pos]) positionCounts[pos] = 0
            positionCounts[pos]++
          }
          if (pick.playerName) playerSet.add(pick.playerName)
          if (pick.isKeeper && pick.playerName) {
            playerKeeperCounts[pick.playerName] = (playerKeeperCounts[pick.playerName] || 0) + 1
            totalKeepers++
          }
          if (!biggestPick || pick.cost > biggestPick.cost) {
            biggestPick = { ...pick, year }
          }
        }
        careerSpend += yearSpend

        // Get season result for spend vs results
        const teamEntry = teams.find(t => (t.ownerName || t.teamName) === ownerName)
        yearData.push({
          year: parseInt(year),
          spent: yearSpend,
          pickCount: myPicks.length,
          keepers: myPicks.filter(p => p.isKeeper).length,
          draftType: type,
          finalStanding: teamEntry?.finalStanding,
          wins: teamEntry?.wins || 0,
          losses: teamEntry?.losses || 0,
          ties: teamEntry?.ties || 0,
          playoffResult: teamEntry?.playoffResult,
        })
      }

      if (totalPicks === 0) return null

      // Most drafted position
      const mostDraftedPosition = Object.entries(positionCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null

      // Most kept player
      const mostKeptPlayer = Object.entries(playerKeeperCounts)
        .sort(([, a], [, b]) => b - a)[0]

      // Position breakdown as percentages (based on picks that have position data)
      const positionBreakdown = {}
      const totalWithPosition = Object.values(positionCounts).reduce((a, b) => a + b, 0)
      const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'FLEX']
      for (const pos of allPositions) {
        positionBreakdown[pos] = totalWithPosition > 0 ? ((positionCounts[pos] || 0) / totalWithPosition * 100) : 0
      }

      return {
        careerSpend,
        avgPickCost: totalPicks > 0 ? careerSpend / totalPicks : 0,
        totalPicks,
        totalKeepers,
        uniquePlayers: playerSet.size,
        mostDraftedPosition,
        positionBreakdown,
        positionCounts,
        signaturePicks: {
          biggestPick,
          mostKeptPlayer: mostKeptPlayer ? { name: mostKeptPlayer[0], count: mostKeptPlayer[1] } : null,
          favoritePosition: mostDraftedPosition,
        },
        spendVsResults: yearData.sort((a, b) => b.year - a.year),
      }
    }
  }, [allDraftData, history])

  const getH2HComparison = useMemo(() => {
    if (!allDraftData) return () => null
    return (ownerA, ownerB) => {
      if (!ownerA || !ownerB) return null
      const profileA = getOwnerProfile(ownerA)
      const profileB = getOwnerProfile(ownerB)
      if (!profileA || !profileB) return null

      // Stats comparison
      const stats = {
        a: {
          name: ownerA,
          careerSpend: profileA.careerSpend,
          avgPickCost: profileA.avgPickCost,
          totalKeepers: profileA.totalKeepers,
          totalPicks: profileA.totalPicks,
          seasons: profileA.spendVsResults.length,
        },
        b: {
          name: ownerB,
          careerSpend: profileB.careerSpend,
          avgPickCost: profileB.avgPickCost,
          totalKeepers: profileB.totalKeepers,
          totalPicks: profileB.totalPicks,
          seasons: profileB.spendVsResults.length,
        },
      }

      // Position bars
      const positionBars = {
        a: profileA.positionBreakdown,
        b: profileB.positionBreakdown,
      }

      // Radar chart data — 5 axes: QB%, RB%, WR%, TE%, Keeper Usage
      // Normalize each to 0-100
      const maxKeeperRate = Math.max(
        profileA.totalPicks > 0 ? (profileA.totalKeepers / profileA.totalPicks * 100) : 0,
        profileB.totalPicks > 0 ? (profileB.totalKeepers / profileB.totalPicks * 100) : 0,
        1
      )
      const radarData = [
        {
          name: ownerA,
          qb: profileA.positionBreakdown.QB || 0,
          rb: profileA.positionBreakdown.RB || 0,
          wr: profileA.positionBreakdown.WR || 0,
          te: profileA.positionBreakdown.TE || 0,
          keepers: profileA.totalPicks > 0 ? (profileA.totalKeepers / profileA.totalPicks * 100) / maxKeeperRate * 100 : 0,
        },
        {
          name: ownerB,
          qb: profileB.positionBreakdown.QB || 0,
          rb: profileB.positionBreakdown.RB || 0,
          wr: profileB.positionBreakdown.WR || 0,
          te: profileB.positionBreakdown.TE || 0,
          keepers: profileB.totalPicks > 0 ? (profileB.totalKeepers / profileB.totalPicks * 100) / maxKeeperRate * 100 : 0,
        },
      ]

      // Common picks — players both have drafted
      const getPlayerYears = (ownerName) => {
        const playerMap = {} // playerName → [{ year, cost }]
        const ownerAliases = new Set([ownerName])
        if (history?.seasons) {
          for (const teams of Object.values(history.seasons)) {
            const team = teams.find(t => (t.ownerName || t.teamName) === ownerName)
            if (team?.rawOwnerName) ownerAliases.add(team.rawOwnerName)
          }
        }
        for (const [year, data] of Object.entries(allDraftData)) {
          const { picks, teams } = data
          const rosterMap = {}
          for (let i = 0; i < teams.length; i++) {
            rosterMap[i + 1] = teams[i].ownerName || teams[i].teamName
          }
          for (const pick of picks) {
            const resolved = pick.ownerName && ownerAliases.has(pick.ownerName)
              ? true
              : (pick.rosterId != null && rosterMap[pick.rosterId] === ownerName)
            if (resolved && pick.playerName) {
              if (!playerMap[pick.playerName]) playerMap[pick.playerName] = []
              playerMap[pick.playerName].push({ year, cost: pick.cost, position: pick.positionGroup })
            }
          }
        }
        return playerMap
      }

      const playersA = getPlayerYears(ownerA)
      const playersB = getPlayerYears(ownerB)
      const commonPicks = []
      for (const [player, yearsA] of Object.entries(playersA)) {
        if (playersB[player]) {
          commonPicks.push({
            player,
            position: yearsA[0]?.position || playersB[player][0]?.position || '',
            ownerA: yearsA,
            ownerB: playersB[player],
          })
        }
      }
      commonPicks.sort((a, b) => {
        const maxCostA = Math.max(...a.ownerA.map(y => y.cost), ...a.ownerB.map(y => y.cost))
        const maxCostB = Math.max(...b.ownerA.map(y => y.cost), ...b.ownerB.map(y => y.cost))
        return maxCostB - maxCostA
      })

      return { stats, positionBars, radarData, commonPicks }
    }
  }, [allDraftData, history, getOwnerProfile])

  const draftYears = useMemo(() => {
    return allDraftData ? Object.keys(allDraftData).sort((a, b) => b - a) : []
  }, [allDraftData])

  const owners = useMemo(() => {
    if (!allDraftData) return []
    const nameSet = new Set()
    for (const data of Object.values(allDraftData)) {
      for (const pick of data.picks) {
        if (pick.ownerName) nameSet.add(pick.ownerName)
      }
    }
    return Array.from(nameSet).sort()
  }, [allDraftData])

  return {
    getSeasonSummary,
    getOwnerProfile,
    getH2HComparison,
    getTrends,
    draftYears,
    owners,
    hasDraftData: allDraftData !== null,
    POS_COLORS,
    COMPARE_COLORS,
  }
}
