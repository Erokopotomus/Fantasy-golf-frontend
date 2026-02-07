import { useState, useCallback } from 'react'
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

/**
 * Normalize a roster entry from the API into a flat player object
 */
function flattenRosterEntry(entry) {
  const p = entry.player || {}
  return {
    id: p.id || entry.playerId,
    entryId: entry.id,
    name: p.name || 'Unknown',
    countryFlag: p.countryFlag || '',
    headshotUrl: p.headshotUrl || null,
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
    rosterPosition: entry.position, // ACTIVE or BENCH
    acquiredVia: entry.acquiredVia,
    acquiredAt: entry.acquiredAt,
  }
}

const TeamRoster = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)

  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id

  const { roster: rawRoster, loading: rosterLoading, error: rosterError, dropPlayer, refetch } = useRoster(teamId)
  const { saveLineup, loading: lineupLoading, saved } = useLineup(teamId)

  const roster = rawRoster.map(flattenRosterEntry)
  const activePlayers = roster.filter(p => p.rosterPosition === 'ACTIVE')

  const [isEditing, setIsEditing] = useState(false)
  const [pendingActive, setPendingActive] = useState(null)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [draggedPlayerId, setDraggedPlayerId] = useState(null)
  const [dragOverZone, setDragOverZone] = useState(null) // 'active' | 'bench' | null

  const maxActive = league?.settings?.maxActiveLineup || 4
  const rosterSize = league?.settings?.rosterSize || 6

  const startEditing = () => {
    setPendingActive(new Set(activePlayers.map(p => p.id)))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setPendingActive(null)
    setIsEditing(false)
  }

  const togglePlayer = (playerId) => {
    setPendingActive(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < maxActive) {
        next.add(playerId)
      }
      return next
    })
  }

  const handleSaveLineup = async () => {
    if (!pendingActive) return
    try {
      await saveLineup([...pendingActive])
      track(Events.LINEUP_SAVED, { leagueId, activeCount: pendingActive.size, maxActive })
      await refetch()
      setIsEditing(false)
      setPendingActive(null)
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

  const getActiveSet = () => {
    if (pendingActive) return pendingActive
    return new Set(activePlayers.map(p => p.id))
  }

  // Build roster context for the drawer
  const getDrawerRosterContext = () => {
    const player = roster.find(p => p.id === drawerPlayerId)
    if (!player) return null
    return {
      isOnRoster: true,
      position: player.rosterPosition,
      onDrop: (pid) => handleDrop(pid),
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
      }
    } else if (zone === 'bench' && pendingActive.has(playerId)) {
      setPendingActive(prev => {
        const next = new Set(prev)
        next.delete(playerId)
        return next
      })
    }
  }

  const handlePlayerClick = (player) => {
    if (isEditing) return // Don't open drawer while editing lineup
    setDrawerPlayerId(player.id)
  }

  if (leagueLoading || (teamId && rosterLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading roster...</p>
        </div>
      </div>
    )
  }

  if (!userTeam || roster.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>
          <h1 className="text-2xl font-bold font-display text-white">My Roster</h1>
          <p className="text-text-secondary">{league?.name}</p>
        </div>

        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-display text-white mb-2">Empty Roster</h2>
          <p className="text-text-secondary mb-6 max-w-sm mx-auto">
            Your roster is empty. Draft players or browse free agents to build your team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(`/leagues/${leagueId}/waivers`)}>
              Browse Free Agents
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/leagues/${leagueId}`)}>
              Back to League
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (rosterError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold font-display text-white mb-2">Error Loading Roster</h2>
          <p className="text-text-secondary mb-6">{rosterError}</p>
          <Link to={`/leagues/${leagueId}`} className="text-emerald-400 hover:underline">
            Return to League
          </Link>
        </Card>
      </div>
    )
  }

  const activeSet = getActiveSet()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-1"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {league?.name}
          </Link>
          <h1 className="text-2xl font-bold font-display text-white">My Roster</h1>
          <p className="text-text-muted text-sm">{roster.length} / {rosterSize} players</p>
        </div>
        <div className="flex gap-2">
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
              >
                {showOptimizer ? 'Hide' : 'Optimize'}
              </Button>
              <Button size="sm" onClick={startEditing}>Edit Lineup</Button>
            </>
          )}
        </div>
      </div>

      {/* Lineup progress bar (editing mode) */}
      {isEditing && (
        <div className="mb-4 p-3 rounded-lg bg-dark-secondary border border-dark-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">Active lineup — drag or tap players to move</span>
            <span className={`font-medium ${activeSet.size === maxActive ? 'text-emerald-400' : 'text-white'}`}>
              {activeSet.size} / {maxActive}
            </span>
          </div>
          <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(activeSet.size / maxActive) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Lineup Optimizer */}
      {showOptimizer && roster.length > 0 && (
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

      {/* Active Lineup */}
      <div
        className={`mb-6 rounded-lg transition-all duration-200 ${
          isEditing && draggedPlayerId
            ? dragOverZone === 'active'
              ? 'ring-2 ring-emerald-400 bg-emerald-500/5 p-3'
              : 'ring-1 ring-dashed ring-dark-border p-3'
            : ''
        }`}
        onDragOver={isEditing ? (e) => handleDragOver(e, 'active') : undefined}
        onDragLeave={isEditing ? (e) => handleDragLeave(e, 'active') : undefined}
        onDrop={isEditing ? (e) => handleDropToZone(e, 'active') : undefined}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Active Lineup</h2>
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
              onToggle={() => togglePlayer(player.id)}
              onDragStart={(e) => handleDragStart(e, player.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(player)}
              onClick={() => handlePlayerClick(player)}
            />
          ))}
          {/* Empty slot placeholders */}
          {Array.from({ length: maxActive - roster.filter(p => activeSet.has(p.id)).length }, (_, i) => (
            <div
              key={`empty-${i}`}
              className={`flex items-center gap-3 p-3 rounded-lg border border-dashed transition-colors ${
                dragOverZone === 'active' ? 'border-emerald-400/60 bg-emerald-500/5' : 'border-dark-border/60 bg-dark-secondary/30'
              }`}
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-dark-border/40 flex items-center justify-center flex-shrink-0">
                <span className="text-text-muted/30 text-sm font-bold">G{roster.filter(p => activeSet.has(p.id)).length + i + 1}</span>
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
              : 'ring-1 ring-dashed ring-dark-border p-3'
            : ''
        }`}
        onDragOver={isEditing ? (e) => handleDragOver(e, 'bench') : undefined}
        onDragLeave={isEditing ? (e) => handleDragLeave(e, 'bench') : undefined}
        onDrop={isEditing ? (e) => handleDropToZone(e, 'bench') : undefined}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Bench</h2>
          <span className="text-xs text-text-muted">({roster.filter(p => !activeSet.has(p.id)).length})</span>
        </div>
        <div className="space-y-2">
          {roster.filter(p => !activeSet.has(p.id)).map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isActive={false}
              isEditing={isEditing}
              isDragging={draggedPlayerId === player.id}
              canActivate={activeSet.size < maxActive}
              onToggle={() => togglePlayer(player.id)}
              onDragStart={(e) => handleDragStart(e, player.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(player)}
              onClick={() => handlePlayerClick(player)}
            />
          ))}
          {roster.filter(p => !activeSet.has(p.id)).length === 0 && (
            <div className={`text-center py-4 text-sm ${
              dragOverZone === 'bench' ? 'text-neutral-400' : 'text-text-muted'
            }`}>
              {draggedPlayerId ? 'Drop here to bench' : 'All players are active'}
            </div>
          )}
        </div>
      </div>

      {/* Player Drawer */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        rosterContext={getDrawerRosterContext()}
      />
    </div>
  )
}

/** Individual player row */
const PlayerRow = ({ player, isActive, isEditing, isDragging, canActivate = true, onToggle, onDragStart, onDragEnd, onDrop, onClick }) => {
  return (
    <div
      draggable={isEditing}
      onDragStart={isEditing ? (e) => onDragStart(e) : undefined}
      onDragEnd={isEditing ? onDragEnd : undefined}
      onClick={isEditing ? (e) => { e.stopPropagation(); onToggle() } : onClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all select-none
        ${isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:bg-dark-tertiary/60'}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isActive
          ? 'bg-dark-secondary border border-emerald-500/30'
          : 'bg-dark-secondary/50 border border-dark-border/50'
        }
      `}
    >
      {/* Drag handle (edit mode) */}
      {isEditing && (
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
        <img src={player.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center text-lg flex-shrink-0">
          {player.countryFlag || '?'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm truncate">{player.name}</span>
          {isActive && !isEditing && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 rounded">ACTIVE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {player.owgrRank && <span>#{player.owgrRank}</span>}
          {player.primaryTour && <span>{player.primaryTour}</span>}
          {player.sgTotal != null && <span>SG: {player.sgTotal.toFixed(1)}</span>}
          {player.acquiredVia && (
            <span className="text-text-muted/60">{player.acquiredVia.toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-text-secondary">
        {player.wins > 0 && <span>{player.wins}W</span>}
        {player.top5s > 0 && <span>{player.top5s} T5</span>}
        {player.top10s > 0 && <span>{player.top10s} T10</span>}
      </div>

      {/* Active/Bench badge in edit mode */}
      {isEditing && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
          isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-text-muted bg-dark-tertiary/50'
        }`}>
          {isActive ? 'ACTIVE' : 'BENCH'}
        </span>
      )}

      {/* Chevron indicator for drill-in */}
      {!isEditing && (
        <svg className="w-4 h-4 text-text-muted/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}

      {/* Drop button (only in non-editing mode) */}
      {!isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDrop() }}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1"
        >
          Drop
        </button>
      )}
    </div>
  )
}

export default TeamRoster
