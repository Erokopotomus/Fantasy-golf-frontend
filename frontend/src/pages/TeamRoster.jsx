import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useLineup } from '../hooks/useLineup'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

/**
 * Normalize a roster entry from the API into a flat player object
 * API shape: { id: rosterEntryId, position, playerId, acquiredVia, player: { id, name, ... } }
 * Component shape: { id, name, countryFlag, owgrRank, sgTotal, position (ACTIVE/BENCH), ... }
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

  // Find user's team in this league
  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id

  const { roster: rawRoster, loading: rosterLoading, error: rosterError, dropPlayer, refetch } = useRoster(teamId)
  const { saveLineup, loading: lineupLoading, saved } = useLineup(teamId)

  // Normalize roster entries
  const roster = rawRoster.map(flattenRosterEntry)
  const activePlayers = roster.filter(p => p.rosterPosition === 'ACTIVE')
  const benchPlayers = roster.filter(p => p.rosterPosition !== 'ACTIVE')

  const [isEditing, setIsEditing] = useState(false)
  const [pendingActive, setPendingActive] = useState(null) // null = not editing

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
      await refetch()
      setIsEditing(false)
      setPendingActive(null)
    } catch {
      // error handled by hook
    }
  }

  const handleDrop = async (player) => {
    if (!window.confirm(`Drop ${player.name}? They'll become a free agent.`)) return
    try {
      await dropPlayer(player.id)
    } catch {
      // error handled by hook
    }
  }

  const getActiveSet = () => {
    if (pendingActive) return pendingActive
    return new Set(activePlayers.map(p => p.id))
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

  // Empty roster state
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
          <h1 className="text-2xl font-bold text-white">My Roster</h1>
          <p className="text-text-secondary">{league?.name}</p>
        </div>

        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Empty Roster</h2>
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
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Roster</h2>
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
          <h1 className="text-2xl font-bold text-white">My Roster</h1>
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
            <Button size="sm" onClick={startEditing}>Edit Lineup</Button>
          )}
        </div>
      </div>

      {/* Lineup progress bar (editing mode) */}
      {isEditing && (
        <div className="mb-4 p-3 rounded-lg bg-dark-secondary border border-dark-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">Active lineup</span>
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

      {/* Active Lineup */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Active Lineup</h2>
          <span className="text-xs text-text-muted">({activePlayers.length})</span>
        </div>
        <div className="space-y-2">
          {roster.filter(p => activeSet.has(p.id)).map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isActive={true}
              isEditing={isEditing}
              onToggle={() => togglePlayer(player.id)}
              onDrop={() => handleDrop(player)}
            />
          ))}
          {roster.filter(p => activeSet.has(p.id)).length === 0 && (
            <div className="text-center py-6 text-text-muted bg-dark-secondary rounded-lg border border-dashed border-dark-border">
              No active players — {isEditing ? 'tap players below to activate' : 'edit your lineup to set starters'}
            </div>
          )}
        </div>
      </div>

      {/* Bench */}
      <div>
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
              canActivate={activeSet.size < maxActive}
              onToggle={() => togglePlayer(player.id)}
              onDrop={() => handleDrop(player)}
            />
          ))}
          {roster.filter(p => !activeSet.has(p.id)).length === 0 && (
            <div className="text-center py-4 text-text-muted text-sm">
              All players are active
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Individual player row */
const PlayerRow = ({ player, isActive, isEditing, canActivate = true, onToggle, onDrop }) => {
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg transition-all
      ${isActive
        ? 'bg-dark-secondary border border-emerald-500/30'
        : 'bg-dark-secondary/50 border border-dark-border/50'
      }
    `}>
      {/* Edit toggle */}
      {isEditing && (
        <button
          onClick={onToggle}
          disabled={!isActive && !canActivate}
          className={`
            w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors
            ${isActive
              ? 'bg-emerald-500 text-white'
              : canActivate ? 'bg-dark-tertiary text-text-muted hover:bg-dark-border' : 'bg-dark-tertiary/50 text-text-muted/30 cursor-not-allowed'
            }
          `}
        >
          {isActive && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
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

      {/* Actions */}
      {!isEditing && (
        <button
          onClick={onDrop}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1"
        >
          Drop
        </button>
      )}
    </div>
  )
}

export default TeamRoster
