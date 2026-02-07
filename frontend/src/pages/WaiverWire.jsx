import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWaivers } from '../hooks/useWaivers'
import { useRoster } from '../hooks/useRoster'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PlayerDrawer from '../components/players/PlayerDrawer'
import { track, Events } from '../services/analytics'

const WaiverWire = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)

  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id
  const waiverType = league?.settings?.waiverType || 'none'

  const {
    availablePlayers, loading, claimLoading, error,
    search, setSearch, tour, setTour,
    claimPlayer, refetch,
    // Waiver-specific
    submitClaim, cancelClaim, updateClaim,
    pendingClaims, recentResults, budget,
    isWaiverMode,
  } = useWaivers(leagueId, teamId, waiverType)

  const { roster: rawRoster, refetch: refetchRoster } = useRoster(teamId)

  const roster = (rawRoster || []).map(e => ({
    id: e.player?.id || e.playerId,
    name: e.player?.name || 'Unknown',
    countryFlag: e.player?.countryFlag || '',
  }))

  const [claimTarget, setClaimTarget] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [bidAmount, setBidAmount] = useState(0)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)
  const [activeTab, setActiveTab] = useState('players') // players | claims | results

  const rosterSize = league?.settings?.rosterSize || 6
  const isRosterFull = roster.length >= rosterSize

  // Instant add (non-waiver mode)
  const handleClaim = async () => {
    if (!claimTarget) return
    try {
      if (isWaiverMode) {
        await submitClaim(claimTarget.id, bidAmount, dropTarget?.id || null)
        track(Events.FREE_AGENT_PICKUP, { leagueId, playerId: claimTarget.id, playerName: claimTarget.name, bidAmount, waiverType })
      } else {
        await claimPlayer(claimTarget.id, dropTarget?.id || null)
        track(Events.FREE_AGENT_PICKUP, { leagueId, playerId: claimTarget.id, playerName: claimTarget.name, droppedPlayerId: dropTarget?.id })
        await refetchRoster()
      }
      setClaimTarget(null)
      setDropTarget(null)
      setBidAmount(0)
    } catch {
      // handled by hook
    }
  }

  const handleAddFromDrawer = (player) => {
    setDrawerPlayerId(null)
    setClaimTarget(player)
    setDropTarget(null)
    setBidAmount(0)
  }

  const tours = ['All', 'PGA', 'LIV', 'DP World']

  const isDraftLocked = league && (league.status === 'DRAFT_PENDING' || league.status === 'DRAFTING')

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            {isWaiverMode ? 'Waiver Wire' : 'Free Agents'}
          </h1>
          {isWaiverMode && budget && (
            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-sm font-semibold rounded-full">
              ${budget.remaining} / ${budget.total}
            </span>
          )}
          {isWaiverMode && (
            <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-xs font-medium rounded">
              {waiverType === 'faab' ? 'FAAB' : 'Rolling'}
            </span>
          )}
        </div>
        <p className="text-text-muted text-sm">{league?.name} — {availablePlayers.length} available players</p>
      </div>

      {/* Pre-draft lock banner */}
      {isDraftLocked && (
        <div className="mb-4 p-4 bg-dark-secondary border border-dark-border rounded-lg text-center">
          <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-white font-semibold mb-1">Free Agency Locked</h3>
          <p className="text-text-muted text-sm">
            Player pickups are unavailable until the league draft is complete.
            {league.status === 'DRAFT_PENDING' ? ' The draft hasn\'t started yet.' : ' The draft is in progress.'}
          </p>
        </div>
      )}

      {/* Tab bar for waiver mode */}
      {isWaiverMode && (
        <div className="flex gap-1 mb-4 bg-dark-secondary rounded-lg p-1">
          {[
            { key: 'players', label: 'Available Players' },
            { key: 'claims', label: `Pending Claims${pendingClaims.length > 0 ? ` (${pendingClaims.length})` : ''}` },
            { key: 'results', label: 'Recent Results' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-dark-tertiary text-white'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: Available Players */}
      {(activeTab === 'players' || !isWaiverMode) && (
        <>
          {/* Search + Filters */}
          <div className={`flex flex-col sm:flex-row gap-3 mb-4 ${isDraftLocked ? 'opacity-50 pointer-events-none' : ''}`}>
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
              Roster full ({roster.length}/{rosterSize}). You must drop a player to {isWaiverMode ? 'submit a claim' : 'add a new one'}.
            </div>
          )}

          {/* Waiver processing info */}
          {isWaiverMode && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-sm text-blue-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {waiverType === 'faab'
                ? 'Place bids on players. Claims process every Wednesday at 12 PM ET. Highest bid wins.'
                : 'Submit claims on players. Claims process every Wednesday at 12 PM ET.'}
            </div>
          )}

          {/* Player list */}
          <div className={`rounded-xl border border-dark-border bg-dark-secondary overflow-hidden ${isDraftLocked ? 'opacity-50 pointer-events-none' : ''}`}>
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
                        setBidAmount(0)
                      }}
                    >
                      {isWaiverMode ? (waiverType === 'faab' ? 'Bid' : 'Claim') : (isRosterFull ? 'Swap' : 'Add')}
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
        </>
      )}

      {/* Tab: Pending Claims */}
      {activeTab === 'claims' && isWaiverMode && (
        <div className="space-y-3">
          {pendingClaims.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-text-muted">No pending claims</p>
              <p className="text-text-muted text-sm mt-1">Search for players and place bids to add them.</p>
            </Card>
          ) : (
            pendingClaims.map((claim, index) => (
              <div
                key={claim.id}
                className="bg-dark-secondary border border-dark-border rounded-lg p-4 flex items-center gap-4"
              >
                <span className="text-text-muted text-sm font-mono w-6 text-center">{index + 1}</span>
                {claim.player?.headshotUrl ? (
                  <img src={claim.player.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center text-lg flex-shrink-0">?</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{claim.player?.name || 'Unknown'}</p>
                  <p className="text-text-muted text-xs">
                    {claim.player?.primaryTour || ''}
                    {claim.player?.owgrRank ? ` · #${claim.player.owgrRank}` : ''}
                  </p>
                </div>
                {waiverType === 'faab' && (
                  <span className="text-emerald-400 font-semibold text-sm">${claim.bidAmount}</span>
                )}
                <button
                  onClick={() => cancelClaim(claim.id)}
                  className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                  title="Cancel claim"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Recent Results */}
      {activeTab === 'results' && isWaiverMode && (
        <div className="space-y-2">
          {recentResults.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-text-muted">No waiver results yet</p>
              <p className="text-text-muted text-sm mt-1">Results will appear after claims are processed.</p>
            </Card>
          ) : (
            recentResults.map(claim => (
              <div
                key={claim.id}
                className="bg-dark-secondary border border-dark-border rounded-lg p-3 flex items-center gap-3"
              >
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  claim.status === 'WON' ? 'bg-emerald-500/15 text-emerald-400' :
                  claim.status === 'LOST' ? 'bg-red-500/15 text-red-400' :
                  'bg-yellow-500/15 text-yellow-400'
                }`}>
                  {claim.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{claim.player?.name || 'Unknown'}</p>
                  {claim.notes && (
                    <p className="text-text-muted text-xs">{claim.notes}</p>
                  )}
                </div>
                {claim.bidAmount > 0 && (
                  <span className="text-text-secondary text-sm">${claim.bidAmount}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Claim/Bid modal */}
      {claimTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {isWaiverMode
                ? (waiverType === 'faab' ? 'Place Bid' : 'Submit Claim')
                : (isRosterFull ? 'Swap Player' : 'Add Player')}
            </h3>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                {claimTarget.headshotUrl ? (
                  <img src={claimTarget.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-dark-tertiary" />
                ) : (
                  <span className="text-2xl">{claimTarget.countryFlag}</span>
                )}
                <div>
                  <p className="text-white font-semibold">{claimTarget.name}</p>
                  <p className="text-text-muted text-sm">
                    {claimTarget.owgrRank ? `#${claimTarget.owgrRank}` : ''} {claimTarget.primaryTour || ''}
                    {claimTarget.sgTotal != null ? ` · SG: ${claimTarget.sgTotal.toFixed(1)}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* FAAB bid amount */}
            {waiverType === 'faab' && (
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">
                  Bid Amount
                  {budget && (
                    <span className="text-text-muted ml-1">(${budget.remaining} remaining)</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    max={budget?.remaining || 100}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                {/* Quick bid buttons */}
                <div className="flex gap-2 mt-2">
                  {[0, 1, 5, 10, 25].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBidAmount(amt)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        bidAmount === amt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-dark-tertiary text-text-muted hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Drop player selection */}
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
                onClick={() => { setClaimTarget(null); setDropTarget(null); setBidAmount(0) }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleClaim}
                loading={claimLoading}
                disabled={isRosterFull && !dropTarget}
              >
                {isWaiverMode
                  ? (waiverType === 'faab' ? `Place $${bidAmount} Bid` : 'Submit Claim')
                  : (isRosterFull ? 'Swap' : 'Add to Roster')}
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
