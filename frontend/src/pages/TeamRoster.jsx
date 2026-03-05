import { useState, useCallback, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useLineup } from '../hooks/useLineup'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PlayerDrawer from '../components/players/PlayerDrawer'
import LineupOptimizer from '../components/roster/LineupOptimizer'
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
  const [selectedTeamId, setSelectedTeamId] = useState(null)
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
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-field uppercase tracking-wider">Starters</h2>
            <span className="text-xs text-text-muted">(0 / {emptyMaxActive})</span>
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
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Bench</h2>
              <span className="text-xs text-text-muted">(0 / {benchSlots})</span>
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
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-live-red uppercase tracking-wider">Injured Reserve</h2>
              <span className="text-xs text-text-muted">(0 / {emptyIrSlots})</span>
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
    <div className="max-w-4xl mx-auto">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-1"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {league?.name}
          </Link>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            {viewingOwnTeam ? 'My Team' : (viewedTeam?.name || viewedTeam?.user?.name || 'Team Roster')}
          </h1>
          <p className="text-text-muted text-sm">
            {roster.length} / {rosterSize} players
            {!viewingOwnTeam && <span className="ml-2 text-text-muted/60">(read-only)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {viewingOwnTeam && (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/leagues/${leagueId}/waivers`)}>
                Free Agents
              </Button>
              {isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={cancelEditing}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveLineup} loading={lineupLoading}>
                    {saved ? 'Saved!' : 'Save Lineup'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowOptimizer(!showOptimizer)}
                    disabled={isLineupsLocked}
                  >
                    {showOptimizer ? 'Hide' : 'Optimize'}
                  </Button>
                  <Button size="sm" onClick={startEditing} disabled={isLineupsLocked}>Edit Lineup</Button>
                </>
              )}
            </>
          )}
        </div>
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

      {/* Golf Schedule Summary */}
      {scheduleSummary && (
        <div className="mb-4 p-3 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-field">⛳ This Week:</span>
              <span className="text-xs text-text-primary font-semibold">{scheduleSummary.tournament.shortName || scheduleSummary.tournament.name}</span>
            </div>
            {scheduleSummary.announced ? (
              <span className="text-xs font-mono text-field">
                {scheduleSummary.confirmed}/{scheduleSummary.total} players confirmed
              </span>
            ) : (
              <span className="text-xs text-text-muted/60">Field expected Tuesday evening</span>
            )}
          </div>
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
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-field uppercase tracking-wider">Active Lineup</h2>
          <span className="text-xs text-text-muted">({roster.filter(p => activeSet.has(p.id)).length} / {maxActive})</span>
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
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Bench</h2>
          <span className="text-xs text-text-muted">({roster.filter(p => !activeSet.has(p.id) && !irSet.has(p.id)).length})</span>
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
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-live-red uppercase tracking-wider">Injured Reserve</h2>
            <span className="text-xs text-text-muted">({roster.filter(p => irSet.has(p.id)).length} / {irSlots})</span>
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
  )
}

/** Individual player row */
const PlayerRow = ({ player, isActive, isEditing, isDragging, isLocked = false, canActivate = true, onToggle, onDragStart, onDragEnd, onDrop, onClick, isIR = false, onToggleIR, canIR, irSlots = 0, keepersEnabled = false, onToggleKeeper, maxKeepers = 0, currentKeeperCount = 0, isNfl = false, scheduleBadge = null, readOnly = false, onQuickToggle, maxActive = 4, activeCount = 0 }) => {
  return (
    <div
      draggable={isEditing && !readOnly}
      onDragStart={isEditing && !readOnly ? (e) => onDragStart(e) : undefined}
      onDragEnd={isEditing && !readOnly ? onDragEnd : undefined}
      onClick={isEditing && !readOnly ? (e) => { e.stopPropagation(); onToggle() } : onClick}
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
        <img src={player.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[var(--stone)] flex items-center justify-center text-lg flex-shrink-0">
          {player.countryFlag || '?'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-semibold text-sm truncate">{player.name}</span>
          {isActive && !isEditing && (
            <span className="text-[10px] font-medium text-field bg-field-bright/10 px-1.5 rounded">ACTIVE</span>
          )}
          {isIR && !isEditing && (
            <span className="text-[10px] font-medium text-live-red bg-live-red/10 px-1.5 rounded">IR</span>
          )}
          {player.isKeeper && (
            <span className="text-[10px] font-medium text-crown bg-crown/10 px-1.5 rounded">
              K{player.keeperCost != null ? ` $${player.keeperCost}` : ''}{player.keeperYearsKept > 1 ? ` Yr ${player.keeperYearsKept}` : ''}
            </span>
          )}
          {scheduleBadge && !isEditing && scheduleBadge.tournaments && (
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
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {isNfl ? (
            <>
              {player.nflPosition && <span className="font-semibold text-text-secondary">{player.nflPosition}</span>}
              {player.nflTeam && <span>{player.nflTeam}</span>}
            </>
          ) : (
            <>
              {player.owgrRank && <span>#{player.owgrRank}</span>}
              {player.primaryTour && <span>{player.primaryTour}</span>}
              {player.sgTotal != null && <span>SG: {player.sgTotal.toFixed(1)}</span>}
            </>
          )}
          {player.acquiredVia && (
            <span className="text-text-muted/60">{player.acquiredVia.toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      {!isNfl && (
        <div className="hidden sm:flex items-center gap-4 text-xs text-text-secondary">
          {player.wins > 0 && <span>{player.wins}W</span>}
          {player.top5s > 0 && <span>{player.top5s} T5</span>}
          {player.top10s > 0 && <span>{player.top10s} T10</span>}
        </div>
      )}

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
    </div>
  )
}

export default TeamRoster
