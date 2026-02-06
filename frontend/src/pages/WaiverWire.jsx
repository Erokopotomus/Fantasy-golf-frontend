import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWaivers } from '../hooks/useWaivers'
import { useRoster } from '../hooks/useRoster'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PlayerDrawer from '../components/players/PlayerDrawer'

const WaiverWire = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)

  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id

  const {
    availablePlayers, loading, claimLoading, error,
    search, setSearch, tour, setTour,
    claimPlayer, refetch
  } = useWaivers(leagueId, teamId)

  const { roster: rawRoster, refetch: refetchRoster } = useRoster(teamId)

  const roster = (rawRoster || []).map(e => ({
    id: e.player?.id || e.playerId,
    name: e.player?.name || 'Unknown',
    countryFlag: e.player?.countryFlag || '',
  }))

  const [claimTarget, setClaimTarget] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)

  const rosterSize = league?.settings?.rosterSize || 6
  const isRosterFull = roster.length >= rosterSize

  const handleClaim = async () => {
    if (!claimTarget) return
    try {
      await claimPlayer(claimTarget.id, dropTarget?.id || null)
      await refetchRoster()
      setClaimTarget(null)
      setDropTarget(null)
    } catch {
      // handled by hook
    }
  }

  const handleAddFromDrawer = (player) => {
    setDrawerPlayerId(null)
    setClaimTarget(player)
    setDropTarget(null)
  }

  const tours = ['All', 'PGA', 'LIV', 'DP World']

  if (leagueLoading || (loading && availablePlayers.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading free agents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}/roster`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-1"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Roster
        </Link>
        <h1 className="text-2xl font-bold text-white">Free Agents</h1>
        <p className="text-text-muted text-sm">{league?.name} — {availablePlayers.length} available players</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-secondary border border-dark-border rounded-lg text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex gap-1">
          {tours.map(t => (
            <button
              key={t}
              onClick={() => setTour(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tour === t
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-dark-secondary text-text-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Roster fullness warning */}
      {isRosterFull && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-sm text-yellow-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Roster full ({roster.length}/{rosterSize}). You must drop a player to add a new one.
        </div>
      )}

      {/* Player list */}
      <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px_72px] gap-2 px-4 py-2.5 bg-dark-tertiary/80 text-[11px] text-text-muted uppercase tracking-wider font-medium">
          <div>Player</div>
          <div className="text-center">Rank</div>
          <div className="text-center">SG Total</div>
          <div></div>
        </div>

        <div className="max-h-[600px] overflow-y-auto divide-y divide-dark-border/30">
          {availablePlayers.map(player => (
            <div
              key={player.id}
              className="grid grid-cols-[1fr_80px_80px_72px] gap-2 items-center px-4 py-3 hover:bg-dark-tertiary/40 transition-colors cursor-pointer"
              onClick={() => setDrawerPlayerId(player.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {player.headshotUrl ? (
                  <img src={player.headshotUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-dark-tertiary flex items-center justify-center text-lg flex-shrink-0">
                    {player.countryFlag || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                  <p className="text-text-muted text-xs">
                    {player.primaryTour || ''}
                    {player.wins > 0 ? ` · ${player.wins}W` : ''}
                  </p>
                </div>
              </div>
              <div className="text-center text-sm text-text-secondary">
                {player.owgrRank ? `#${player.owgrRank}` : '\u2014'}
              </div>
              <div className="text-center text-sm text-text-secondary">
                {player.sgTotal != null ? player.sgTotal.toFixed(1) : '\u2014'}
              </div>
              <div className="text-right">
                <Button
                  size="sm"
                  variant={isRosterFull ? 'secondary' : 'primary'}
                  onClick={(e) => {
                    e.stopPropagation()
                    setClaimTarget(player)
                    setDropTarget(null)
                  }}
                >
                  {isRosterFull ? 'Swap' : 'Add'}
                </Button>
              </div>
            </div>
          ))}

          {availablePlayers.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              {search ? `No players matching "${search}"` : 'No available players'}
            </div>
          )}
        </div>
      </div>

      {/* Claim modal */}
      {claimTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {isRosterFull ? 'Swap Player' : 'Add Player'}
            </h3>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{claimTarget.countryFlag}</span>
                <div>
                  <p className="text-white font-semibold">{claimTarget.name}</p>
                  <p className="text-text-muted text-sm">
                    {claimTarget.owgrRank ? `#${claimTarget.owgrRank}` : ''} {claimTarget.primaryTour || ''}
                    {claimTarget.sgTotal != null ? ` · SG: ${claimTarget.sgTotal.toFixed(1)}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {isRosterFull && (
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">
                  Drop a player to make room:
                </label>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {roster.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setDropTarget(dropTarget?.id === p.id ? null : p)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-sm transition-colors ${
                        dropTarget?.id === p.id
                          ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                          : 'bg-dark-tertiary hover:bg-dark-border text-white'
                      }`}
                    >
                      <span>{p.countryFlag}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setClaimTarget(null); setDropTarget(null) }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleClaim}
                loading={claimLoading}
                disabled={isRosterFull && !dropTarget}
              >
                {isRosterFull ? 'Swap' : 'Add to Roster'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Player Drawer */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        rosterContext={{
          isOnRoster: false,
          onAdd: handleAddFromDrawer,
        }}
      />
    </div>
  )
}

export default WaiverWire
