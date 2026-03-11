import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useLineup } from '../hooks/useLineup'
import { useLeague } from '../hooks/useLeague'
import { useLeagueLiveScoring } from '../hooks/useLeagueLiveScoring'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PlayerDrawer from '../components/players/PlayerDrawer'
import LineupOptimizer from '../components/roster/LineupOptimizer'
import RosterSidebar from '../components/roster/RosterSidebar'
import { track, Events } from '../services/analytics'
import api from '../services/api'
import { formatDateTimeET } from '../utils/dateUtils'

/**
 * Normalize a roster entry from the API into a flat player object
 */
function flattenRosterEntry(entry, isNfl = false) {
  const p = entry.player || {}
  const base = {
    id: p.id || entry.playerId,
    entryId: entry.id,
    name: p.name || 'Unknown',
    headshotUrl: p.headshotUrl || null,
    rosterPosition: entry.rosterStatus || entry.position, // ACTIVE, BENCH, or IR
    acquiredVia: entry.acquiredVia,
    acquiredAt: entry.acquiredAt,
    isKeeper: entry.isKeeper || false,
    keeperCost: entry.keeperCost,
    keeperYearsKept: entry.keeperYearsKept || 0,
  }
  if (isNfl) {
    return { ...base, nflPosition: p.nflPosition, nflTeam: p.nflTeamAbbr, countryFlag: '' }
  }
  const fs = entry.fantasyStats || {}
  return {
    ...base,
    countryFlag: p.countryFlag || '',
    country: p.country || '',
    owgrRank: p.owgrRank,
    primaryTour: p.primaryTour,
    sgTotal: p.sgTotal,
    sgPutting: p.sgPutting,
    sgApproach: p.sgApproach,
    sgOffTee: p.sgOffTee,
    wins: p.wins,
    top5s: p.top5s,
    top10s: p.top10s,
    // Fantasy stats from backend enrichment
    seasonPts: fs.seasonPts ?? null,
    avgPts: fs.avgPts ?? null,
    eventsPlayed: fs.eventsPlayed ?? 0,
    last3: fs.last3 || [],
    courseHistory: fs.courseHistory || null,
  }
}

const TeamRoster = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)

  const isNflLeague = (league?.sport || 'GOLF').toUpperCase() === 'NFL'

  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id

  // P02: Team selector for viewing other teams' rosters
  const [searchParams] = useSearchParams()
  const memberParam = searchParams.get('member')
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  // Auto-select team when ?member=userId is in the URL
  useEffect(() => {
    if (memberParam && league?.teams) {
      const targetTeam = league.teams.find(t => t.userId === memberParam)
      if (targetTeam && targetTeam.id !== teamId) {
        setSelectedTeamId(targetTeam.id)
      }
    }
  }, [memberParam, league?.teams, teamId])

  const viewingOwnTeam = !selectedTeamId || selectedTeamId === teamId
  const activeTeamId = viewingOwnTeam ? teamId : selectedTeamId

  const { roster: rawRoster, loading: rosterLoading, error: rosterError, dropPlayer, refetch } = useRoster(activeTeamId)
  const { saveLineup, loading: lineupLoading, saved } = useLineup(teamId)

  const roster = rawRoster.map(e => flattenRosterEntry(e, isNflLeague))
  const activePlayers = roster.filter(p => p.rosterPosition === 'ACTIVE')

  // Find the team object for the currently viewed team
  const viewedTeam = league?.teams?.find(t => t.id === activeTeamId)

  // Golf schedule awareness — fetch upcoming fields
  const [scheduleData, setScheduleData] = useState(null)
  useEffect(() => {
    if (isNflLeague || !league) return
    api.getUpcomingTournamentsWithFields()
      .then(data => setScheduleData(data.tournaments || []))
      .catch(() => setScheduleData(null))
  }, [isNflLeague, league])

  // Live scoring integration
  const { tournament: liveTournament, isLive, teams: liveTeams, userTeam: liveUserTeam, loading: liveLoading } = useLeagueLiveScoring(leagueId)

  // Build a lookup map: playerId → live scoring data
  const liveDataByPlayerId = useMemo(() => {
    if (!liveUserTeam) return {}
    const map = {}
    const allPlayers = [...(liveUserTeam.starters || []), ...(liveUserTeam.bench || [])]
    for (const p of allPlayers) {
      if (p.playerId) map[p.playerId] = p
    }
    return map
  }, [liveUserTeam])

  const [isEditing, setIsEditing] = useState(false)
  const [pendingActive, setPendingActive] = useState(null)
  const [pendingIR, setPendingIR] = useState(null)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [draggedPlayerId, setDraggedPlayerId] = useState(null)
  const [dragOverZone, setDragOverZone] = useState(null) // 'active' | 'bench' | 'ir' | null

  // Lineup lock state
  const [lockInfo, setLockInfo] = useState(null)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!leagueId || !league) return // wait for league to load
    if (isNflLeague) { setLockInfo(null); return } // NFL doesn't use golf lock
    api.getCurrentWeek(leagueId)
      .then(data => setLockInfo(data))
      .catch(() => setLockInfo(null))
  }, [leagueId, league, isNflLeague])

  // Countdown timer to lock time
  useEffect(() => {
    if (!lockInfo?.lockTime || lockInfo.isLocked) {
      setCountdown('')
      return
    }
    const tick = () => {
      const diff = new Date(lockInfo.lockTime).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('')
        setLockInfo(prev => prev ? { ...prev, isLocked: true } : null)
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lockInfo?.lockTime, lockInfo?.isLocked])

  const isLineupsLocked = lockInfo?.isLocked || false

  const defaultMaxActive = league?.settings?.maxActiveLineup || 4
  const maxActive = lockInfo?.effectiveStarterCount || defaultMaxActive
  const rosterSize = league?.settings?.rosterSize || 6
  const irSlots = league?.settings?.irSlots || 0
  const hasStarterOverride = maxActive < defaultMaxActive

  const irPlayers = roster.filter(p => p.rosterPosition === 'IR')

  const startEditing = () => {
    setPendingActive(new Set(activePlayers.map(p => p.id)))
    setPendingIR(new Set(irPlayers.map(p => p.id)))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setPendingActive(null)
    setPendingIR(null)
    setIsEditing(false)
  }

  const togglePlayer = (playerId) => {
    setPendingActive(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < maxActive) {
        // Remove from IR if moving to active
        setPendingIR(irSet => {
          const n = new Set(irSet)
          n.delete(playerId)
          return n
        })
        next.add(playerId)
      }
      return next
    })
  }

  const toggleIR = (playerId) => {
    setPendingIR(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < irSlots) {
        // Remove from active if moving to IR
        setPendingActive(activeSet => {
          const n = new Set(activeSet)
          n.delete(playerId)
          return n
        })
        next.add(playerId)
      }
      return next
    })
  }

  const handleSaveLineup = async () => {
    if (!pendingActive) return
    try {
      await saveLineup([...pendingActive], [...(pendingIR || [])])
      track(Events.LINEUP_SAVED, { leagueId, activeCount: pendingActive.size, maxActive })
      await refetch()
      setIsEditing(false)
      setPendingActive(null)
      setPendingIR(null)
    } catch {
      // error handled by hook
    }
  }

  const handleDrop = useCallback(async (playerIdOrObj) => {
    const pid = typeof playerIdOrObj === 'string' ? playerIdOrObj : playerIdOrObj?.id
    const player = roster.find(p => p.id === pid)
    if (!player) return
    if (!window.confirm(`Drop ${player.name}? They'll become a free agent.`)) return
    try {
      await dropPlayer(player.id)
      track(Events.PLAYER_DROPPED, { leagueId, playerId: player.id, playerName: player.name })
      await refetch()
    } catch {
      // error handled by hook
    }
  }, [roster, dropPlayer, refetch])

  // Keeper league support
  const keeperSettings = league?.settings?.keeperSettings
  const keepersEnabled = keeperSettings?.enabled || false
  const maxKeepers = keeperSettings?.maxKeepers || 3
  const currentKeeperCount = roster.filter(p => p.isKeeper).length

  const handleToggleKeeper = useCallback(async (player) => {
    if (!teamId) return
    try {
      if (player.isKeeper) {
        await api.undesignateKeeper(teamId, player.id)
      } else {
        await api.designateKeeper(teamId, player.id)
      }
      await refetch()
    } catch (err) {
      console.error('Keeper toggle failed:', err.message)
    }
  }, [teamId, refetch])

  // B08: Quick toggle a player between ACTIVE and BENCH (single-player API call)
  const handleQuickToggle = useCallback(async (player) => {
    if (!teamId || !viewingOwnTeam) return
    const newPosition = player.rosterPosition === 'ACTIVE' ? 'BENCH' : 'ACTIVE'
    // Don't allow activating beyond max
    if (newPosition === 'ACTIVE' && activePlayers.length >= maxActive) return
    try {
      await api.updateRosterPosition(teamId, player.id, newPosition)
      await refetch()
    } catch (err) {
      console.error('Quick toggle failed:', err.message)
    }
  }, [teamId, viewingOwnTeam, activePlayers.length, maxActive, refetch])

  // Compute schedule dots for each golf roster player (next 5 events)
  const getScheduleBadge = (playerId) => {
    if (isNflLeague || !scheduleData || scheduleData.length === 0) return null
    return { tournaments: scheduleData.slice(0, 5), playerId }
  }

  // Schedule summary for header
  const scheduleSummary = (() => {
    if (isNflLeague || !scheduleData || scheduleData.length === 0 || roster.length === 0) return null
    const thisWeek = scheduleData[0]
    if (!thisWeek) return null
    const fieldIds = new Set((thisWeek.field || []).map(p => p.playerId))
    const confirmed = roster.filter(p => fieldIds.has(p.id)).length
    const announced = thisWeek.fieldSize > 0 || thisWeek.field?.length > 0
    return { tournament: thisWeek, confirmed, total: roster.length, announced }
  })()

  const getActiveSet = () => {
    if (pendingActive) return pendingActive
    return new Set(activePlayers.map(p => p.id))
  }

  const getIRSet = () => {
    if (pendingIR) return pendingIR
    return new Set(irPlayers.map(p => p.id))
  }

  // Build roster context for the drawer
  const getDrawerRosterContext = () => {
    const player = roster.find(p => p.id === drawerPlayerId)
    if (!player) return null
    return {
      isOnRoster: true,
      position: player.rosterPosition,
      ...(viewingOwnTeam ? { onDrop: (pid) => handleDrop(pid) } : {}),
    }
  }

  const handleDragStart = (e, playerId) => {
    setDraggedPlayerId(playerId)
    e.dataTransfer.setData('text/plain', playerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedPlayerId(null)
    setDragOverZone(null)
  }

  const handleDragOver = (e, zone) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZone(zone)
  }

  const handleDragLeave = (e, zone) => {
    // Only clear if we're actually leaving the zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverZone(prev => prev === zone ? null : prev)
    }
  }

  const handleDropToZone = (e, zone) => {
    e.preventDefault()
    const playerId = e.dataTransfer.getData('text/plain')
    setDragOverZone(null)
    setDraggedPlayerId(null)
    if (!playerId || !pendingActive) return

    if (zone === 'active' && !pendingActive.has(playerId)) {
      if (pendingActive.size < maxActive) {
        setPendingActive(prev => new Set([...prev, playerId]))
        setPendingIR(prev => { const n = new Set(prev); n.delete(playerId); return n })
      }
    } else if (zone === 'ir' && pendingIR && !pendingIR.has(playerId)) {
      if (pendingIR.size < irSlots) {
        setPendingIR(prev => new Set([...prev, playerId]))
        setPendingActive(prev => { const n = new Set(prev); n.delete(playerId); return n })
      }
    } else if (zone === 'bench') {
      setPendingActive(prev => { const n = new Set(prev); n.delete(playerId); return n })
      setPendingIR(prev => { const n = new Set(prev); n.delete(playerId); return n })
    }
  }

  const handlePlayerClick = (player) => {
    if (isEditing) return // Don't open drawer while editing lineup
    setDrawerPlayerId(player.id)
  }

  if (leagueLoading || (activeTeamId && rosterLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-field-bright/30 border-t-field-bright rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading roster...</p>
        </div>
      </div>
    )
  }

  if (viewingOwnTeam && (!userTeam || roster.length === 0)) {
    const emptyMaxActive = league?.settings?.maxActiveLineup || 4
    const emptyRosterSize = league?.settings?.rosterSize || 6
    const emptyIrSlots = league?.settings?.irSlots || 0
    const benchSlots = emptyRosterSize - emptyMaxActive

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>
          <h1 className="text-2xl font-bold font-display text-text-primary">My Team</h1>
          <p className="text-text-secondary">{league?.name}</p>
        </div>

        {/* Team Identity Card */}
        <Card className="mb-6">
          <div className="flex items-center gap-4 p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--stone)] flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
              {userTeam?.avatarUrl ? (
                <img src={userTeam.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : userTeam?.avatar ? (
                <span>{userTeam.avatar}</span>
              ) : (
                <span className="text-text-muted text-2xl">?</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold font-display text-text-primary truncate">
                {userTeam?.name || 'My Team'}
              </h2>
              <p className="text-text-muted text-sm">{league?.name}</p>
              <p className="text-text-secondary text-sm font-mono mt-0.5">
                {userTeam?.wins || 0}-{userTeam?.losses || 0}-{userTeam?.ties || 0}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/leagues/${leagueId}/team-settings`)}
            >
              Edit Team
            </Button>
          </div>
        </Card>

        {/* Roster Skeleton — Starters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-field-bright/40">
            <h2 className="text-base font-bold text-field uppercase tracking-wider">Starters</h2>
            <span className="text-sm font-mono text-text-muted">0 / {emptyMaxActive}</span>
          </div>
          <div className="space-y-2">
            {Array.from({ length: emptyMaxActive }, (_, i) => (
              <div
                key={`starter-${i}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface)]"
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--card-border)] flex items-center justify-center flex-shrink-0">
                  <span className="text-text-muted/30 text-sm font-bold">{isNflLeague ? i + 1 : `G${i + 1}`}</span>
                </div>
                <span className="text-text-muted/40 text-sm">Empty starter slot</span>
              </div>
            ))}
          </div>
        </div>

        {/* Roster Skeleton — Bench */}
        {benchSlots > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-[var(--card-border)]">
              <h2 className="text-base font-bold text-text-muted uppercase tracking-wider">Bench</h2>
              <span className="text-sm font-mono text-text-muted">0 / {benchSlots}</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: benchSlots }, (_, i) => (
                <div
                  key={`bench-${i}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface)]"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--card-border)] flex items-center justify-center flex-shrink-0">
                    <span className="text-text-muted/30 text-sm font-bold">BN</span>
                  </div>
                  <span className="text-text-muted/40 text-sm">Empty bench slot</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roster Skeleton — IR */}
        {emptyIrSlots > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-live-red/30">
              <h2 className="text-base font-bold text-live-red uppercase tracking-wider">Injured Reserve</h2>
              <span className="text-sm font-mono text-text-muted">0 / {emptyIrSlots}</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: emptyIrSlots }, (_, i) => (
                <div
                  key={`ir-${i}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface)]"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-live-red/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-live-red/30 text-sm font-bold">IR</span>
                  </div>
                  <span className="text-text-muted/40 text-sm">Empty IR slot</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate(`/leagues/${leagueId}/waivers`)}>
            Browse Free Agents
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/leagues/${leagueId}`)}>
            Back to League
          </Button>
        </div>
      </div>
    )
  }

  if (rosterError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold font-display text-text-primary mb-2">Error Loading Roster</h2>
          <p className="text-text-secondary mb-6">{rosterError}</p>
          <Link to={`/leagues/${leagueId}`} className="text-field hover:underline">
            Return to League
          </Link>
        </Card>
      </div>
    )
  }

  const activeSet = getActiveSet()
  const irSet = getIRSet()

  return (
    <div className="max-w-5xl mx-auto lg:flex lg:gap-6">
    <div className="flex-1 max-w-2xl">
      {/* P02: Team Selector */}
      {league?.teams?.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedTeamId || teamId || ''}
            onChange={(e) => {
              const val = e.target.value
              setSelectedTeamId(val === teamId ? null : val)
              setIsEditing(false)
              setPendingActive(null)
              setPendingIR(null)
            }}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-field-bright/50"
          >
            {league.teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.id === teamId ? `${t.name || t.user?.name || 'My Team'} (You)` : t.name || t.user?.name || 'Team'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scoreboard Header Card */}
      <div className="mb-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] backdrop-blur-md overflow-hidden shadow-sm">
        {/* Back link */}
        <div className="px-4 pt-3">
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {league?.name}
          </Link>
        </div>

        <div className="px-4 py-3">
          {/* Team identity row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[var(--stone)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {viewedTeam?.avatarUrl ? (
                <img src={viewedTeam.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : viewedTeam?.avatar ? (
                <span>{viewedTeam.avatar}</span>
              ) : (
                <span className="text-text-muted text-lg">?</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold font-display text-text-primary truncate">
                {viewingOwnTeam ? (viewedTeam?.name || 'My Team') : (viewedTeam?.name || viewedTeam?.user?.name || 'Team Roster')}
              </h1>
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <span className="font-mono">{viewedTeam?.wins || 0}W-{viewedTeam?.losses || 0}L-{viewedTeam?.ties || 0}T</span>
                <span>{roster.length}/{rosterSize} players</span>
                {!viewingOwnTeam && <span className="text-text-muted/60">(read-only)</span>}
                {!viewingOwnTeam && viewedTeam?.userId && (
                  <Link to={`/manager/${viewedTeam.userId}`} className="text-blaze hover:text-blaze-hot transition-colors">
                    View Profile
                  </Link>
                )}
              </div>
            </div>
            {/* Rank badge */}
            {isLive && liveUserTeam?.rank && (
              <div className="flex flex-col items-center flex-shrink-0">
                <span className="text-sm text-text-muted">Rank</span>
                <span className="text-lg font-bold font-mono text-text-primary">
                  {liveUserTeam.rank}<span className="text-xs text-text-muted font-normal">/{liveTeams.length}</span>
                </span>
              </div>
            )}
            {viewingOwnTeam && (
              <button
                onClick={() => navigate(`/leagues/${leagueId}/team-settings`)}
                className="p-2 rounded-lg hover:bg-[var(--stone)] transition-colors flex-shrink-0 text-text-muted hover:text-text-primary"
                title="Team Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Live tournament context */}
          {isLive && liveUserTeam && liveTournament && !isEditing ? (
            <div className="rounded-lg bg-gradient-to-r from-field-bright/8 to-field/5 border border-field-bright/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live-red opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-live-red" />
                  </span>
                  <span className="text-sm font-semibold text-text-primary">{liveTournament.name}</span>
                  <span className="text-xs text-text-muted font-mono">R{liveTournament.currentRound || 1}</span>
                </div>
                <Link
                  to={`/leagues/${leagueId}/scoring`}
                  className="text-xs text-field hover:text-field-bright font-medium transition-colors"
                >
                  Full Scoring →
                </Link>
              </div>
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-3xl font-bold font-mono text-text-primary">{(liveUserTeam.totalPoints || 0).toFixed(1)}</span>
                  <span className="text-sm text-text-muted ml-1">pts</span>
                </div>
                <div className="flex flex-col gap-0.5 text-sm text-text-muted">
                  {liveUserTeam.benchPoints > 0 && (
                    <span>Bench: <span className="font-mono text-text-secondary">{liveUserTeam.benchPoints.toFixed(1)}</span></span>
                  )}
                  {liveUserTeam.optimalPoints > 0 && liveUserTeam.optimalPoints > liveUserTeam.totalPoints && (
                    <span>Optimal: <span className="font-mono text-text-secondary">{liveUserTeam.optimalPoints.toFixed(1)}</span></span>
                  )}
                </div>
              </div>
            </div>
          ) : scheduleSummary ? (
            /* Non-live: show next tournament context */
            <div className="rounded-lg bg-[var(--bg-alt)] border border-[var(--card-border)] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-field">Next:</span>
                  <span className="text-sm text-text-primary font-semibold">{scheduleSummary.tournament.shortName || scheduleSummary.tournament.name}</span>
                </div>
                {scheduleSummary.announced ? (
                  <span className="text-sm font-mono text-field">
                    {scheduleSummary.confirmed}/{scheduleSummary.total} in field
                  </span>
                ) : (
                  <span className="text-sm text-text-muted/60">Field TBD</span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Actions Pill Bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {viewingOwnTeam && (
          <>
            {isEditing ? (
              <>
                <button
                  onClick={cancelEditing}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-[var(--card-border)] bg-[var(--surface)] text-text-secondary hover:bg-[var(--stone)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLineup}
                  disabled={lineupLoading}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-field text-white hover:bg-field-bright transition-colors disabled:opacity-50"
                >
                  {saved ? 'Saved!' : lineupLoading ? 'Saving...' : 'Save Lineup'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  disabled={isLineupsLocked}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-field text-white hover:bg-field-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Lineup
                </button>
                <button
                  onClick={() => navigate(`/leagues/${leagueId}/waivers`)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-[var(--card-border)] bg-[var(--surface)] text-text-secondary hover:bg-[var(--stone)] transition-colors"
                >
                  Free Agents
                </button>
                <button
                  onClick={() => setShowOptimizer(!showOptimizer)}
                  disabled={isLineupsLocked}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-[var(--card-border)] bg-[var(--surface)] text-text-secondary hover:bg-[var(--stone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showOptimizer ? 'Hide Optimizer' : 'Optimize'}
                </button>
                {isLive && liveUserTeam && (
                  <Link
                    to={`/leagues/${leagueId}/scoring`}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-field-bright/30 bg-field-bright/5 text-field hover:bg-field-bright/10 transition-colors"
                  >
                    Full Scoring
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Lineup Lock Banner — B06: uses tournament start time from lockInfo (server-authoritative) */}
      {viewingOwnTeam && isLineupsLocked && (
        <div className="mb-4 p-4 bg-live-red/10 border border-live-red/30 rounded-lg flex items-center gap-3">
          <svg className="w-6 h-6 text-live-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-live-red font-semibold text-sm">Lineups Locked</p>
            <p className="text-live-red/70 text-xs">
              {lockInfo?.tournament?.name || lockInfo?.currentWeek?.name || scheduleData?.[0]?.name || (isNflLeague ? 'NFL week' : 'Tournament')} has started. Lineup changes are locked until this {isNflLeague ? 'week' : 'event'} ends.
            </p>
          </div>
        </div>
      )}
      {viewingOwnTeam && !isLineupsLocked && countdown && lockInfo?.lockTime && (
        <div className="mb-4 p-4 bg-crown/10 border border-crown/30 rounded-lg flex items-center gap-3">
          <svg className="w-6 h-6 text-crown flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-crown font-semibold text-sm">
              Lineups lock in {countdown}
            </p>
            <p className="text-crown/70 text-xs">
              {lockInfo.tournament?.name || lockInfo.currentWeek?.name || scheduleData?.[0]?.name || (isNflLeague ? 'NFL week' : 'Tournament')} starts {formatDateTimeET(lockInfo.lockTime)}
            </p>
          </div>
          <span className="font-mono text-crown text-lg font-bold">{countdown}</span>
        </div>
      )}

      {/* Reduced roster banner */}
      {viewingOwnTeam && hasStarterOverride && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
          <span className="text-amber-400 text-sm">
            Reduced roster this week — <span className="font-bold">{maxActive} starters</span> (normally {defaultMaxActive})
          </span>
        </div>
      )}

      {/* Lineup progress bar (editing mode) */}
      {viewingOwnTeam && isEditing && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--card-border)]">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">Active lineup — drag or tap players to move</span>
            <span className={`font-medium ${activeSet.size === maxActive ? 'text-field' : 'text-text-primary'}`}>
              {activeSet.size} / {maxActive}
            </span>
          </div>
          <div className="h-2 bg-[var(--stone)] rounded-full overflow-hidden">
            <div
              className="h-full bg-field-bright transition-all duration-300"
              style={{ width: `${(activeSet.size / maxActive) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Lineup Optimizer */}
      {viewingOwnTeam && showOptimizer && roster.length > 0 && (
        <div className="mb-6">
          <LineupOptimizer
            roster={roster}
            maxActive={maxActive}
            currentActiveIds={[...activeSet]}
            onApply={async (optimalIds) => {
              try {
                await saveLineup(optimalIds)
                await refetch()
                setShowOptimizer(false)
              } catch {
                // error handled by hook
              }
            }}
            onClose={() => setShowOptimizer(false)}
          />
        </div>
      )}

      {/* Keeper Counter */}
      {viewingOwnTeam && keepersEnabled && (
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-crown bg-crown/10 px-2 py-1 rounded">
            Keepers: {currentKeeperCount}/{maxKeepers}
          </span>
          {currentKeeperCount >= maxKeepers && (
            <span className="text-xs text-text-muted">All keeper slots filled</span>
          )}
        </div>
      )}

      {/* Active Lineup */}
      <div
        className={`mb-6 rounded-lg transition-all duration-200 ${
          isEditing && draggedPlayerId
            ? dragOverZone === 'active'
              ? 'ring-2 ring-field bg-field-bright/5 p-3'
              : 'ring-1 ring-dashed ring-[var(--card-border)] p-3'
            : ''
        }`}
        onDragOver={isEditing ? (e) => handleDragOver(e, 'active') : undefined}
        onDragLeave={isEditing ? (e) => handleDragLeave(e, 'active') : undefined}
        onDrop={isEditing ? (e) => handleDropToZone(e, 'active') : undefined}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-field-bright/40">
          <h2 className="text-base font-bold text-field uppercase tracking-wider">Active Lineup</h2>
          <span className="text-sm font-mono text-text-muted">{roster.filter(p => activeSet.has(p.id)).length} / {maxActive}</span>
        </div>
        <div className="space-y-2">
          {roster.filter(p => activeSet.has(p.id)).map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isActive={true}
              isEditing={isEditing}
              isDragging={draggedPlayerId === player.id}
              isLocked={isLineupsLocked}
              onToggle={() => togglePlayer(player.id)}
              onDragStart={(e) => handleDragStart(e, player.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(player)}
              onClick={() => handlePlayerClick(player)}
              keepersEnabled={keepersEnabled}
              onToggleKeeper={() => handleToggleKeeper(player)}
              maxKeepers={maxKeepers}
              currentKeeperCount={currentKeeperCount}
              isNfl={isNflLeague}
              scheduleBadge={getScheduleBadge(player.id)}
              readOnly={!viewingOwnTeam}
              onQuickToggle={() => handleQuickToggle(player)}
              maxActive={maxActive}
              activeCount={activePlayers.length}
              liveData={liveDataByPlayerId[player.id] || null}
              isLive={isLive}
              liveTournamentId={liveTournament?.id}
            />
          ))}
          {/* Empty slot placeholders */}
          {Array.from({ length: maxActive - roster.filter(p => activeSet.has(p.id)).length }, (_, i) => (
            <div
              key={`empty-${i}`}
              className={`flex items-center gap-3 p-3 rounded-lg border border-dashed transition-colors ${
                dragOverZone === 'active' ? 'border-field/60 bg-field-bright/5' : 'border-[var(--card-border)] bg-[var(--surface)]'
              }`}
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--card-border)] flex items-center justify-center flex-shrink-0">
                <span className="text-text-muted/30 text-sm font-bold">{isNflLeague ? roster.filter(p => activeSet.has(p.id)).length + i + 1 : `G${roster.filter(p => activeSet.has(p.id)).length + i + 1}`}</span>
              </div>
              <span className="text-text-muted/40 text-sm">
                {isEditing
                  ? (draggedPlayerId ? 'Drop here' : 'Drag or tap a player to fill')
                  : 'Empty starter slot'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bench */}
      <div
        className={`rounded-lg transition-all duration-200 ${
          isEditing && draggedPlayerId
            ? dragOverZone === 'bench'
              ? 'ring-2 ring-neutral-400 bg-neutral-500/5 p-3'
              : 'ring-1 ring-dashed ring-[var(--card-border)] p-3'
            : ''
        }`}
        onDragOver={isEditing ? (e) => handleDragOver(e, 'bench') : undefined}
        onDragLeave={isEditing ? (e) => handleDragLeave(e, 'bench') : undefined}
        onDrop={isEditing ? (e) => handleDropToZone(e, 'bench') : undefined}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-[var(--card-border)]">
          <h2 className="text-base font-bold text-text-muted uppercase tracking-wider">Bench</h2>
          <span className="text-sm font-mono text-text-muted">{roster.filter(p => !activeSet.has(p.id) && !irSet.has(p.id)).length}</span>
        </div>
        <div className="space-y-2">
          {roster.filter(p => !activeSet.has(p.id) && !irSet.has(p.id)).map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isActive={false}
              isEditing={isEditing}
              isDragging={draggedPlayerId === player.id}
              isLocked={isLineupsLocked}
              canActivate={activeSet.size < maxActive}
              onToggle={() => togglePlayer(player.id)}
              onDragStart={(e) => handleDragStart(e, player.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(player)}
              onClick={() => handlePlayerClick(player)}
              irSlots={irSlots}
              isIR={false}
              onToggleIR={irSlots > 0 ? () => toggleIR(player.id) : undefined}
              canIR={irSet.size < irSlots}
              keepersEnabled={keepersEnabled}
              onToggleKeeper={() => handleToggleKeeper(player)}
              maxKeepers={maxKeepers}
              currentKeeperCount={currentKeeperCount}
              isNfl={isNflLeague}
              scheduleBadge={getScheduleBadge(player.id)}
              readOnly={!viewingOwnTeam}
              onQuickToggle={() => handleQuickToggle(player)}
              maxActive={maxActive}
              activeCount={activePlayers.length}
              liveData={liveDataByPlayerId[player.id] || null}
              isLive={isLive}
              liveTournamentId={liveTournament?.id}
            />
          ))}
          {roster.filter(p => !activeSet.has(p.id) && !irSet.has(p.id)).length === 0 && (
            <div className={`text-center py-4 text-sm ${
              dragOverZone === 'bench' ? 'text-neutral-400' : 'text-text-muted'
            }`}>
              {draggedPlayerId ? 'Drop here to bench' : 'All players are active'}
            </div>
          )}
        </div>
      </div>

      {/* Injured Reserve */}
      {irSlots > 0 && (
        <div
          className={`mt-6 rounded-lg transition-all duration-200 ${
            isEditing && draggedPlayerId
              ? dragOverZone === 'ir'
                ? 'ring-2 ring-live-red bg-live-red/5 p-3'
                : 'ring-1 ring-dashed ring-[var(--card-border)] p-3'
              : ''
          }`}
          onDragOver={isEditing ? (e) => handleDragOver(e, 'ir') : undefined}
          onDragLeave={isEditing ? (e) => handleDragLeave(e, 'ir') : undefined}
          onDrop={isEditing ? (e) => handleDropToZone(e, 'ir') : undefined}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-live-red/30">
            <h2 className="text-base font-bold text-live-red uppercase tracking-wider">Injured Reserve</h2>
            <span className="text-sm font-mono text-text-muted">{roster.filter(p => irSet.has(p.id)).length} / {irSlots}</span>
          </div>
          <div className="space-y-2">
            {roster.filter(p => irSet.has(p.id)).map(player => (
              <PlayerRow
                key={player.id}
                player={player}
                isActive={false}
                isEditing={isEditing}
                isDragging={draggedPlayerId === player.id}
                isLocked={isLineupsLocked}
                onToggle={() => toggleIR(player.id)}
                onDragStart={(e) => handleDragStart(e, player.id)}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(player)}
                onClick={() => handlePlayerClick(player)}
                isIR={true}
                keepersEnabled={keepersEnabled}
                onToggleKeeper={() => handleToggleKeeper(player)}
                maxKeepers={maxKeepers}
                currentKeeperCount={currentKeeperCount}
                isNfl={isNflLeague}
                readOnly={!viewingOwnTeam}
                liveData={liveDataByPlayerId[player.id] || null}
                isLive={isLive}
              />
            ))}
            {/* Empty IR slot placeholders */}
            {Array.from({ length: irSlots - roster.filter(p => irSet.has(p.id)).length }, (_, i) => (
              <div
                key={`ir-empty-${i}`}
                className={`flex items-center gap-3 p-3 rounded-lg border border-dashed transition-colors ${
                  dragOverZone === 'ir' ? 'border-live-red/60 bg-live-red/5' : 'border-[var(--card-border)] bg-[var(--surface)]'
                }`}
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-live-red/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-live-red/30 text-sm font-bold">IR</span>
                </div>
                <span className="text-text-muted/40 text-sm">
                  {isEditing
                    ? (draggedPlayerId ? 'Drop here' : 'Drag or tap to place on IR')
                    : 'Empty IR slot'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Drawer */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        rosterContext={getDrawerRosterContext()}
        isNfl={isNflLeague}
      />
    </div>

    {/* Desktop sidebar */}
    <div className="hidden lg:block w-72 flex-shrink-0">
      <RosterSidebar
        liveTeams={liveTeams}
        liveUserTeam={liveUserTeam}
        liveTournament={liveTournament}
        isLive={isLive}
        leagueId={leagueId}
        userId={user?.id}
      />
    </div>
    </div>
  )
}

/** Helper: format score to par display */
const formatToPar = (score) => {
  if (score == null) return '—'
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : `${score}`
}

/** Helper: color class for score to par */
const toParColor = (score) => {
  if (score == null) return 'text-text-muted'
  if (score < 0) return 'text-field'
  if (score > 0) return 'text-live-red'
  return 'text-text-primary'
}

/** Helper: color class for position */
const positionColor = (pos) => {
  if (!pos) return 'text-text-muted'
  const num = parseInt(pos.toString().replace(/[^0-9]/g, ''))
  if (isNaN(num)) return 'text-text-muted'
  if (num <= 5) return 'text-field font-semibold'
  if (num <= 10) return 'text-field'
  if (num <= 20) return 'text-text-secondary'
  return 'text-text-muted'
}

/** Individual player row */
const PlayerRow = ({ player, isActive, isEditing, isDragging, isLocked = false, canActivate = true, onToggle, onDragStart, onDragEnd, onDrop, onClick, isIR = false, onToggleIR, canIR, irSlots = 0, keepersEnabled = false, onToggleKeeper, maxKeepers = 0, currentKeeperCount = 0, isNfl = false, scheduleBadge = null, readOnly = false, onQuickToggle, maxActive = 4, activeCount = 0, liveData = null, isLive = false, liveTournamentId = null }) => {
  const [showScorecard, setShowScorecard] = useState(false)
  const [scorecardData, setScorecardData] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)

  const hasLiveStats = isLive && liveData && !isEditing
  const isCutOrWd = liveData && (liveData.status === 'CUT' || liveData.status === 'WD' || liveData.status === 'DNS')
  const notInField = isLive && !liveData && !isNfl

  const handleRowClick = async () => {
    if (isEditing && !readOnly) {
      onToggle()
      return
    }
    // If live and player has live data, toggle scorecard
    if (hasLiveStats && liveData?.playerId) {
      if (showScorecard) {
        setShowScorecard(false)
        return
      }
      setShowScorecard(true)
      if (!scorecardData) {
        setScorecardLoading(true)
        try {
          const data = await api.getPlayerScorecard(liveTournamentId, liveData.playerId)
          setScorecardData(data.scorecards || {})
        } catch (err) {
          console.error('Failed to fetch scorecard:', err)
          setScorecardData({})
        } finally {
          setScorecardLoading(false)
        }
      }
    } else {
      onClick()
    }
  }

  const isBench = !isActive && !isIR

  return (
    <div className={isBench && !isEditing ? 'opacity-75' : ''}>
    <div
      draggable={isEditing && !readOnly}
      onDragStart={isEditing && !readOnly ? (e) => onDragStart(e) : undefined}
      onDragEnd={isEditing && !readOnly ? onDragEnd : undefined}
      onClick={isEditing && !readOnly ? (e) => { e.stopPropagation(); onToggle() } : handleRowClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all select-none
        ${isEditing && !readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:bg-[var(--surface-alt)]'}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isActive
          ? 'bg-[var(--surface)] border border-field-bright/30'
          : isIR
          ? 'bg-[var(--surface)] border border-live-red/30'
          : 'bg-[var(--surface)] border border-[var(--card-border)]'
        }
        ${showScorecard ? 'rounded-b-none border-b-0' : ''}
      `}
    >
      {/* Drag handle (edit mode) */}
      {isEditing && !readOnly && (
        <div className="flex flex-col items-center justify-center w-5 flex-shrink-0 text-text-muted/60">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="4" r="1.5" />
            <circle cx="13" cy="4" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="16" r="1.5" />
            <circle cx="13" cy="16" r="1.5" />
          </svg>
        </div>
      )}

      {/* Player info */}
      {player.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[var(--stone)] flex items-center justify-center text-xl flex-shrink-0">
          {player.countryFlag || '?'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-semibold text-base truncate">{player.name}</span>
          {isActive && !isEditing && !hasLiveStats && (
            <span className="text-[10px] font-medium text-field bg-field-bright/10 px-1.5 rounded">ACTIVE</span>
          )}
          {isIR && !isEditing && (
            <span className="text-[10px] font-medium text-live-red bg-live-red/10 px-1.5 rounded">IR</span>
          )}
          {isCutOrWd && (
            <span className="text-[10px] font-medium text-live-red bg-live-red/10 px-1.5 rounded">{liveData.status}</span>
          )}
          {notInField && (
            <span className="text-[10px] font-medium text-text-muted bg-[var(--stone)] px-1.5 rounded">NOT IN FIELD</span>
          )}
          {player.isKeeper && (
            <span className="text-[10px] font-medium text-crown bg-crown/10 px-1.5 rounded">
              K{player.keeperCost != null ? ` $${player.keeperCost}` : ''}{player.keeperYearsKept > 1 ? ` Yr ${player.keeperYearsKept}` : ''}
            </span>
          )}
          {scheduleBadge && !isEditing && !hasLiveStats && scheduleBadge.tournaments && (
            <div className="flex gap-0.5 items-center ml-1">
              {scheduleBadge.tournaments.map((t, i) => {
                const inField = t.field?.some(f => f.playerId === scheduleBadge.playerId)
                const fieldAnnounced = t.fieldSize > 0 || t.field?.length > 0
                return (
                  <div
                    key={t.id || i}
                    className={`w-2 h-2 rounded-full ${
                      inField ? 'bg-field-bright' : fieldAnnounced ? 'bg-[var(--stone)]' : 'border border-[var(--card-border)] bg-transparent'
                    }`}
                    title={`${t.shortName || t.name}: ${inField ? 'In Field' : fieldAnnounced ? 'Not in Field' : 'TBD'}`}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Live stats line (replaces static stats when live) */}
        {hasLiveStats && !isCutOrWd ? (
          <div className="flex items-center gap-3 text-sm mt-0.5">
            <span className={`font-mono font-semibold ${positionColor(liveData.position)}`}>
              {liveData.position || '—'}
            </span>
            <span className={`font-mono font-semibold ${toParColor(liveData.totalToPar)}`}>
              {formatToPar(liveData.totalToPar)}
            </span>
            <span className="text-text-muted font-mono">
              {liveData.thru === 18 || liveData.thru === 'F' ? 'F' : liveData.thru ? `thru ${liveData.thru}` : '—'}
            </span>
            {liveData.todayToPar != null && liveData.todayToPar !== liveData.totalToPar && (
              <span className={`font-mono text-[11px] ${toParColor(liveData.todayToPar)}`}>
                (today {formatToPar(liveData.todayToPar)})
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 text-sm text-text-muted">
            {isNfl ? (
              <div className="flex items-center gap-3">
                {player.nflPosition && <span className="font-semibold text-text-secondary">{player.nflPosition}</span>}
                {player.nflTeam && <span>{player.nflTeam}</span>}
              </div>
            ) : (() => {
              // Context-aware golf stats
              const thisWeekTourney = scheduleBadge?.tournaments?.[0]
              const fieldAnnounced = thisWeekTourney && (thisWeekTourney.fieldSize > 0 || thisWeekTourney.field?.length > 0)
              const playerInField = fieldAnnounced && thisWeekTourney.field?.some(f => f.playerId === player.id)

              const formatFinish = (f) => {
                if (f.status === 'CUT') return 'MC'
                if (f.status === 'WD') return 'WD'
                if (f.status === 'DQ') return 'DQ'
                return f.position ? `T${f.position}` : '–'
              }

              return (
                <>
                  {/* Line 1: Fantasy stats + field status */}
                  <div className="flex items-center gap-2.5">
                    {fieldAnnounced && (
                      playerInField
                        ? <span className="text-field font-medium text-xs">In field</span>
                        : <span className="text-text-muted/60 text-xs">Not in field</span>
                    )}
                    {player.seasonPts != null && player.seasonPts > 0 && (
                      <span className="font-mono text-text-secondary">
                        {player.seasonPts.toLocaleString()}<span className="text-text-muted text-xs"> pts</span>
                      </span>
                    )}
                    {player.avgPts != null && (
                      <span className="font-mono text-text-secondary">
                        {player.avgPts}<span className="text-text-muted text-xs"> avg</span>
                      </span>
                    )}
                    {player.last3?.length > 0 && (
                      <span className="font-mono text-xs">
                        {player.last3.map((f, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-text-muted/40 mx-0.5">·</span>}
                            <span className={
                              f.status === 'CUT' || f.status === 'WD' || f.status === 'DQ' ? 'text-red-400' :
                              f.position && f.position <= 10 ? 'text-field' :
                              f.position && f.position <= 25 ? 'text-text-secondary' : 'text-text-muted'
                            }>{formatFinish(f)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  {/* Line 2: Course history (if upcoming tournament) */}
                  {player.courseHistory && (
                    <div className="flex items-center gap-2 text-xs text-text-muted/70">
                      <span>Course: {player.courseHistory.starts} {player.courseHistory.starts === 1 ? 'start' : 'starts'}</span>
                      {player.courseHistory.avgFinish && <span>· Avg T{player.courseHistory.avgFinish}</span>}
                      {player.courseHistory.bestFinish && <span>· Best T{player.courseHistory.bestFinish}</span>}
                    </div>
                  )}
                  {!player.courseHistory && !fieldAnnounced && player.seasonPts === 0 && (
                    <div className="flex items-center gap-3">
                      {player.owgrRank && <span className="font-mono text-xs">#{player.owgrRank} OWGR</span>}
                      {player.sgTotal != null && <span className="font-mono text-xs">SG: {player.sgTotal > 0 ? '+' : ''}{player.sgTotal.toFixed(1)}</span>}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Third line: career stats removed per redesign — moved to PlayerDrawer */}
      </div>

      {/* IR toggle button in edit mode (for bench players) */}
      {isEditing && !readOnly && onToggleIR && !isActive && !isIR && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleIR() }}
          disabled={!canIR}
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
            canIR ? 'text-live-red bg-live-red/10 hover:bg-live-red/20' : 'text-text-muted/30 bg-[var(--stone)] cursor-not-allowed'
          }`}
        >
          IR
        </button>
      )}

      {/* Active/Bench/IR badge in edit mode */}
      {isEditing && !readOnly && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
          isActive ? 'text-field bg-field-bright/10' : isIR ? 'text-live-red bg-live-red/10' : 'text-text-muted bg-[var(--stone)]'
        }`}>
          {isActive ? 'ACTIVE' : isIR ? 'IR' : 'BENCH'}
        </span>
      )}

      {/* B08: Quick toggle button (non-editing mode, own team only) */}
      {!isEditing && !readOnly && !isLocked && !isIR && onQuickToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onQuickToggle() }}
          disabled={!isActive && activeCount >= maxActive}
          title={isActive ? 'Move to bench' : activeCount >= maxActive ? 'Active lineup full' : 'Move to active'}
          className={`text-[10px] font-medium px-2 py-1 rounded flex-shrink-0 transition-colors ${
            isActive
              ? 'text-text-muted bg-[var(--stone)] hover:bg-neutral-300 dark:hover:bg-neutral-600'
              : activeCount >= maxActive
                ? 'text-text-muted/30 bg-[var(--stone)] cursor-not-allowed'
                : 'text-field bg-field-bright/10 hover:bg-field-bright/20'
          }`}
        >
          {isActive ? 'Bench' : 'Start'}
        </button>
      )}

      {/* Chevron indicator for drill-in */}
      {!isEditing && (
        <svg className="w-4 h-4 text-text-muted/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}

      {/* Keeper toggle (non-editing mode, own team only) */}
      {!isEditing && !readOnly && keepersEnabled && onToggleKeeper && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleKeeper() }}
          disabled={!player.isKeeper && currentKeeperCount >= maxKeepers}
          className={`text-xs transition-colors px-2 py-1 ${
            player.isKeeper
              ? 'text-crown hover:text-yellow-300'
              : currentKeeperCount >= maxKeepers
                ? 'text-text-muted/30 cursor-not-allowed'
                : 'text-crown/60 hover:text-crown'
          }`}
        >
          {player.isKeeper ? 'Unkeep' : 'Keep'}
        </button>
      )}

      {/* Drop button (only in non-editing mode, own team only, hidden when locked) */}
      {!isEditing && !readOnly && !isLocked && (
        <button
          onClick={(e) => { e.stopPropagation(); onDrop() }}
          className="text-xs text-live-red/60 hover:text-live-red transition-colors px-2 py-1"
        >
          Drop
        </button>
      )}

      {/* Fantasy points badge (right side, when live) */}
      {hasLiveStats && !isCutOrWd && !isEditing && (
        <div className="flex-shrink-0 ml-auto pl-2">
          <span className="text-lg font-bold font-mono text-text-primary">{(liveData.fantasyPoints || 0).toFixed(1)} <span className="text-sm text-text-muted font-normal">pts</span></span>
        </div>
      )}
    </div>

    {/* Scorecard expansion panel — front 9 / back 9 grid */}
    {showScorecard && hasLiveStats && (
      <div className={`border border-t-0 rounded-b-lg bg-[var(--surface)] overflow-hidden ${
        isActive ? 'border-field-bright/30' : isIR ? 'border-live-red/30' : 'border-[var(--card-border)]'
      }`}>
        {scorecardLoading ? (
          <div className="p-4 text-center">
            <div className="w-6 h-6 border-2 border-field-bright/30 border-t-field-bright rounded-full animate-spin mx-auto" />
          </div>
        ) : scorecardData && Object.keys(scorecardData).length > 0 ? (
          <div className="p-3 space-y-3">
            {Object.entries(scorecardData).sort(([a], [b]) => Number(a) - Number(b)).map(([round, holes]) => {
              const sortedHoles = (Array.isArray(holes) ? holes : []).sort((a, b) => a.hole - b.hole)
              const front9 = sortedHoles.filter(h => h.hole <= 9)
              const back9 = sortedHoles.filter(h => h.hole > 9)
              const front9Score = front9.reduce((sum, h) => sum + ((h.score || 0) - (h.par || 0)), 0)
              const back9Score = back9.reduce((sum, h) => sum + ((h.score || 0) - (h.par || 0)), 0)
              const scoreBg = (diff) =>
                diff <= -2 ? 'bg-crown/20 text-crown' :
                diff === -1 ? 'bg-field-bright/20 text-field' :
                diff === 0 ? 'bg-[var(--stone)] text-text-primary' :
                diff === 1 ? 'bg-live-red/15 text-live-red' :
                diff >= 2 ? 'bg-live-red/30 text-live-red' :
                'bg-[var(--stone)] text-text-muted'

              return (
                <div key={round}>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">R{round}</div>
                  {/* Front 9 */}
                  <div className="mb-1">
                    <div className="grid grid-cols-10 gap-px text-center">
                      {/* Hole numbers */}
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <div key={`h${n}`} className="text-[9px] text-text-muted/60 font-mono pb-0.5">{n}</div>
                      ))}
                      <div className="text-[9px] text-text-muted/60 font-mono font-semibold pb-0.5">OUT</div>
                      {/* Scores */}
                      {[1,2,3,4,5,6,7,8,9].map(n => {
                        const h = front9.find(x => x.hole === n)
                        if (!h) return <div key={`s${n}`} className="w-full h-6 flex items-center justify-center rounded text-[11px] font-mono bg-[var(--stone)] text-text-muted/40">-</div>
                        const diff = h.score - h.par
                        return (
                          <div key={`s${n}`} className={`w-full h-6 flex items-center justify-center rounded text-[11px] font-mono font-medium ${scoreBg(diff)}`} title={`Hole ${h.hole} (Par ${h.par}): ${h.score}`}>
                            {h.score || '-'}
                          </div>
                        )
                      })}
                      <div className={`w-full h-6 flex items-center justify-center rounded text-[11px] font-mono font-bold ${front9.length > 0 ? (front9Score < 0 ? 'text-field' : front9Score > 0 ? 'text-live-red' : 'text-text-primary') : 'text-text-muted/40'}`}>
                        {front9.length > 0 ? formatToPar(front9Score) : '-'}
                      </div>
                    </div>
                  </div>
                  {/* Back 9 */}
                  <div>
                    <div className="grid grid-cols-10 gap-px text-center">
                      {[10,11,12,13,14,15,16,17,18].map(n => (
                        <div key={`h${n}`} className="text-[9px] text-text-muted/60 font-mono pb-0.5">{n}</div>
                      ))}
                      <div className="text-[9px] text-text-muted/60 font-mono font-semibold pb-0.5">IN</div>
                      {[10,11,12,13,14,15,16,17,18].map(n => {
                        const h = back9.find(x => x.hole === n)
                        if (!h) return <div key={`s${n}`} className="w-full h-6 flex items-center justify-center rounded text-[11px] font-mono bg-[var(--stone)] text-text-muted/40">-</div>
                        const diff = h.score - h.par
                        return (
                          <div key={`s${n}`} className={`w-full h-6 flex items-center justify-center rounded text-[11px] font-mono font-medium ${scoreBg(diff)}`} title={`Hole ${h.hole} (Par ${h.par}): ${h.score}`}>
                            {h.score || '-'}
                          </div>
                        )
                      })}
                      <div className={`w-full h-6 flex items-center justify-center rounded text-[11px] font-mono font-bold ${back9.length > 0 ? (back9Score < 0 ? 'text-field' : back9Score > 0 ? 'text-live-red' : 'text-text-primary') : 'text-text-muted/40'}`}>
                        {back9.length > 0 ? formatToPar(back9Score) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-3 text-center text-sm text-text-muted">Hole-by-hole data updates during play</div>
        )}
      </div>
    )}
    </div>
  )
}

export default TeamRoster
