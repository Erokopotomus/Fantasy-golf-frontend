import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import TournamentHeader from '../components/tournament/TournamentHeader'
import TournamentLeaderboard from '../components/tournament/TournamentLeaderboard'
import LiveScoreIndicator from '../components/tournament/LiveScoreIndicator'
import useTournamentScoring from '../hooks/useTournamentScoring'
import { useLeagues } from '../hooks/useLeagues'
import api from '../services/api'

/** Floating player odds card shown in sidebar when a player is expanded */
const PlayerOddsCard = ({ player, onClose }) => {
  if (!player) return null

  const formatScore = (s) => {
    if (s == null) return '–'
    const n = parseInt(s)
    return n > 0 ? `+${n}` : n === 0 ? 'E' : `${n}`
  }

  const probs = player.probabilities
  const hasProbabilities = probs && (probs.win != null || probs.top5 != null)

  const ProbBar = ({ label, value, color }) => {
    if (value == null) return null
    const pct = value * 100
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">{label}</span>
          <span className="text-white font-semibold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-dark-primary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-dark-secondary overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-900/20 to-dark-secondary border-b border-dark-border">
        <div className="flex items-center gap-3">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-lg">
              {player.countryFlag || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-white">{player.name}</p>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span>{player.position}</span>
              <span>|</span>
              <span className={`font-semibold ${parseInt(player.score) < 0 ? 'text-emerald-400' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-white'}`}>
                {formatScore(player.score)}
              </span>
              {player.thru && <span>| Thru {player.thru === 'F' || player.thru === 18 ? 'F' : player.thru}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-white transition-colors p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Odds */}
      {hasProbabilities ? (
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Live Odds</p>
          <ProbBar label="Win" value={probs.win} color="bg-yellow-500" />
          <ProbBar label="Top 5" value={probs.top5} color="bg-accent-green" />
          <ProbBar label="Top 10" value={probs.top10} color="bg-blue-500" />
          <ProbBar label="Top 20" value={probs.top20} color="bg-purple-500" />
          <ProbBar label="Make Cut" value={probs.makeCut} color="bg-teal-500" />
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-text-muted text-xs">
          No live odds available
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-px bg-dark-border border-t border-dark-border">
        <div className="bg-dark-secondary px-3 py-2 text-center">
          <p className="text-xs font-semibold text-white">{player.eagles || 0}</p>
          <p className="text-[10px] text-text-muted">Eagles</p>
        </div>
        <div className="bg-dark-secondary px-3 py-2 text-center">
          <p className="text-xs font-semibold text-emerald-400">{player.birdies || 0}</p>
          <p className="text-[10px] text-text-muted">Birdies</p>
        </div>
        <div className="bg-dark-secondary px-3 py-2 text-center">
          <p className="text-xs font-semibold text-red-400">{player.bogeys || 0}</p>
          <p className="text-[10px] text-text-muted">Bogeys</p>
        </div>
      </div>
    </div>
  )
}

const TournamentScoring = () => {
  const { tournamentId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const leagueId = searchParams.get('league')

  const { tournament, leaderboard, isLive, myPlayers, loading, error, refetch } = useTournamentScoring(tournamentId, leagueId)
  const { leagues } = useLeagues()
  const myPlayerIds = myPlayers?.map(p => p.id) || []
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  // When a player is expanded in the leaderboard, show their odds card
  const handlePlayerExpand = (player) => {
    setSelectedPlayer(player)
  }

  const handleLeagueChange = (newLeagueId) => {
    if (newLeagueId) {
      navigate(`/tournaments/${tournamentId}?league=${newLeagueId}`, { replace: true })
    } else {
      navigate(`/tournaments/${tournamentId}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading tournament data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tournament Header — full width */}
      <TournamentHeader tournament={tournament} leaderboard={leaderboard} />

      {/* Ticker: live status + refresh */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <LiveScoreIndicator isLive={isLive} />
          {isLive && (
            <span className="text-xs text-text-muted flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto-updating every 60s
            </span>
          )}
        </div>
        <button
          onClick={refetch}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden border-b border-dark-border">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'leaderboard'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-text-muted'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('myTeam')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'myTeam'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-text-muted'
          }`}
        >
          My Team ({myPlayers.length})
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard — 2 col on desktop, tab on mobile */}
        <div className={`lg:col-span-2 space-y-4 ${activeTab !== 'leaderboard' ? 'hidden lg:block' : ''}`}>
          <TournamentLeaderboard
            leaderboard={leaderboard}
            cut={tournament?.cut}
            myPlayerIds={myPlayerIds}
            tournamentId={tournamentId}
            onPlayerExpand={handlePlayerExpand}
            timezone={tournament?.timezone}
          />
        </div>

        {/* Sidebar */}
        <div className={`space-y-4 ${activeTab !== 'myTeam' ? 'hidden lg:block' : ''}`}>
          {/* Floating player odds card */}
          <PlayerOddsCard
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />

          {/* My Team — with league dropdown */}
          <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
            {/* Header with league selector */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-900/20 to-dark-secondary border-b border-dark-border">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-base font-bold text-white whitespace-nowrap">My Team</h3>
                {leagues && leagues.length > 0 && (
                  <select
                    value={leagueId || ''}
                    onChange={(e) => handleLeagueChange(e.target.value || null)}
                    className="bg-dark-tertiary border border-dark-border rounded-lg text-xs text-text-secondary px-2 py-1 focus:outline-none focus:border-emerald-500/50 cursor-pointer min-w-0 truncate"
                  >
                    <option value="">No League</option>
                    {leagues.map(league => (
                      <option key={league.id} value={league.id}>{league.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {leagueId && (
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-text-muted uppercase tracking-wide">Fantasy Pts</span>
                  <p className="text-xl font-bold text-emerald-400 leading-tight">
                    {myPlayers.reduce((sum, p) => sum + (p.fantasyPoints || 0), 0)}
                  </p>
                </div>
              )}
            </div>

            {/* Player list */}
            {leagueId ? (
              <div className="divide-y divide-dark-border/30">
                {myPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-dark-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {player.headshotUrl ? (
                        <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-lg">
                          {player.countryFlag || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-white">{player.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <span>{player.position}</span>
                          <span className="text-text-muted/50">|</span>
                          <span>{player.thru === 'F' || player.thru === 18 ? 'Final' : player.thru > 0 ? `Thru ${player.thru}` : '–'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${parseInt(player.score) < 0 ? 'text-emerald-400' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-white'}`}>
                        {player.score != null ? (parseInt(player.score) > 0 ? `+${player.score}` : parseInt(player.score) === 0 ? 'E' : player.score) : '–'}
                      </p>
                      <p className="text-[11px] text-emerald-400 font-medium">
                        {player.fantasyPoints || 0} pts
                      </p>
                    </div>
                  </div>
                ))}
                {myPlayers.length === 0 && (
                  <div className="text-center py-10 text-text-muted">
                    <svg className="w-10 h-10 mx-auto mb-3 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="font-medium">No players rostered</p>
                    <p className="text-xs mt-1">Set your lineup before the tournament</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p className="text-sm">Select a league to view your roster</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TournamentScoring
