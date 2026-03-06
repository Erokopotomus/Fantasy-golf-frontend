import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLeagueLiveScoring } from '../../hooks/useLeagueLiveScoring'
import api from '../../services/api'

const LiveScoringWidget = ({ leagueId, tournament: currentTournament }) => {
  const navigate = useNavigate()
  const { tournament, isLive, teams, userTeam, loading, error } = useLeagueLiveScoring(leagueId)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [scorecardData, setScorecardData] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [selectedRound, setSelectedRound] = useState(null)
  const [drawerWidth, setDrawerWidth] = useState(420)
  const [leftDrawerWidth, setLeftDrawerWidth] = useState(420)
  const isResizing = useRef(false)
  const isLeftResizing = useRef(false)

  // Close drawers on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedTeam(null)
        setSelectedPlayer(null)
      }
    }
    if (selectedTeam || selectedPlayer) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedTeam, selectedPlayer])

  // Fetch scorecard when player is selected
  const openPlayerScorecard = useCallback(async (player) => {
    if (!tournament?.id || !player.playerId) return
    setSelectedPlayer(player)
    setScorecardLoading(true)
    setScorecardData(null)
    setSelectedRound(null)
    try {
      const data = await api.getPlayerScorecard(tournament.id, player.playerId)
      const scorecards = data.scorecards || {}
      setScorecardData(scorecards)
      // Default to latest round with data
      const availableRounds = Object.keys(scorecards).map(Number).filter(r => scorecards[r]?.length > 0).sort((a, b) => a - b)
      if (availableRounds.length > 0) {
        setSelectedRound(availableRounds[availableRounds.length - 1])
      }
    } catch (err) {
      console.error('Failed to fetch scorecard:', err)
      setScorecardData({})
    } finally {
      setScorecardLoading(false)
    }
  }, [tournament?.id])

  // Derive fresh player data from the live-polled teams array
  // so the drawer header stats update when the 60s poll refreshes
  const freshPlayerData = useMemo(() => {
    if (!selectedPlayer?.playerId) return selectedPlayer
    for (const team of teams) {
      const allPlayers = [...(team.starters || []), ...(team.bench || [])]
      for (const p of allPlayers) {
        if (p.playerId === selectedPlayer.playerId) return p
      }
    }
    return selectedPlayer
  }, [selectedPlayer, teams])

  // Re-fetch scorecard when player progresses (thru changes)
  const previousThruRef = useRef(null)
  useEffect(() => {
    if (!selectedPlayer?.playerId || !freshPlayerData?.thru) return
    // On first open, set the ref without re-fetching (openPlayerScorecard already fetched)
    if (previousThruRef.current === null) {
      previousThruRef.current = freshPlayerData.thru
      return
    }
    // Only re-fetch when thru actually changes
    if (freshPlayerData.thru !== previousThruRef.current) {
      previousThruRef.current = freshPlayerData.thru
      // Re-fetch scorecard silently (don't clear existing data to avoid flash)
      const refetchScorecard = async () => {
        try {
          const data = await api.getPlayerScorecard(tournament.id, freshPlayerData.playerId)
          const scorecards = data.scorecards || {}
          setScorecardData(scorecards)
          const availableRounds = Object.keys(scorecards).map(Number).filter(r => scorecards[r]?.length > 0).sort((a, b) => a - b)
          if (availableRounds.length > 0) {
            setSelectedRound(availableRounds[availableRounds.length - 1])
          }
        } catch (err) {
          console.error('Failed to re-fetch scorecard:', err)
        }
      }
      refetchScorecard()
    }
  }, [freshPlayerData?.thru, freshPlayerData?.playerId, selectedPlayer?.playerId, tournament?.id])

  // Reset previousThruRef when drawer closes
  useEffect(() => {
    if (!selectedPlayer) {
      previousThruRef.current = null
    }
  }, [selectedPlayer])

  // Drawer resize handlers
  const startResize = useCallback((e) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = drawerWidth
    const onMouseMove = (e) => {
      if (!isResizing.current) return
      const newWidth = Math.max(320, Math.min(700, startWidth - (e.clientX - startX)))
      setDrawerWidth(newWidth)
    }
    const onMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [drawerWidth])

  // Left drawer resize — dragging the right edge rightward = wider
  const startLeftResize = useCallback((e) => {
    e.preventDefault()
    isLeftResizing.current = true
    const startX = e.clientX
    const startWidth = leftDrawerWidth
    const onMouseMove = (e) => {
      if (!isLeftResizing.current) return
      const newWidth = Math.max(360, Math.min(700, startWidth + (e.clientX - startX)))
      setLeftDrawerWidth(newWidth)
    }
    const onMouseUp = () => {
      isLeftResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftDrawerWidth])

  // Don't render if there's no tournament data and we're done loading
  if (!loading && (!tournament || error)) return null

  // Loading skeleton
  if (loading) {
    return (
      <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/90 dark:backdrop-blur-md shadow-lg dark:shadow-2xl">
        <div className="animate-pulse px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-100 dark:bg-white/[0.06] rounded w-64" />
            <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 dark:bg-white/[0.06] rounded" />
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isFinal = tournament.status === 'COMPLETED'

  // Decide how many teams to show in the leaderboard
  const leaderboardTeams = teams.length <= 8
    ? teams
    : (() => {
        const top5 = teams.slice(0, 5)
        // If user's team isn't in top 5, append it
        if (userTeam && userTeam.rank > 5) {
          top5.push(userTeam)
        }
        return top5
      })()

  // All starters sorted by fantasy points
  const topStarters = userTeam?.starters
    ? [...userTeam.starters].sort((a, b) => b.fantasyPoints - a.fantasyPoints)
    : []

  const formatToPar = (toPar) => {
    if (toPar === null || toPar === undefined) return '–'
    if (toPar === 0) return 'E'
    return toPar > 0 ? `+${toPar}` : `${toPar}`
  }

  const toParColor = (toPar) => {
    if (toPar === null || toPar === undefined || toPar === 0) return 'text-gray-500 dark:text-white/60'
    return toPar < 0 ? 'text-field dark:text-field-bright' : 'text-live-red'
  }

  const formatPosition = (pos) => {
    if (!pos) return '–'
    return pos
  }

  const formatThru = (thru) => {
    if (thru === null || thru === undefined) return '–'
    if (thru === 'CUT' || thru === 'WD' || thru === 'DQ') return thru
    if (thru === 18 || thru === 'F') return 'F'
    return thru
  }

  const isOnCourse = (thru) => {
    if (thru === null || thru === undefined) return false
    if (typeof thru === 'number') return thru > 0 && thru < 18
    return false
  }

  // Compute points behind leader for user's team
  const leaderPoints = teams.length > 0 ? teams[0].totalPoints : 0
  const userPointsBehind = userTeam ? leaderPoints - userTeam.totalPoints : 0

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/90 dark:backdrop-blur-md shadow-lg dark:shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-transparent bg-gradient-to-r from-field/5 via-transparent to-crown/5">
        <div className="flex items-center gap-2 min-w-0">
          {isLive && (
            <span className="w-2 h-2 bg-field-bright rounded-full animate-pulse flex-shrink-0" />
          )}
          <h3 className="text-sm font-display font-bold text-gray-900 dark:text-white truncate">
            {tournament.name}
            {tournament.currentRound && (
              <span className="text-gray-500 dark:text-white/60 font-body font-normal"> &middot; Round {tournament.currentRound}</span>
            )}
          </h3>
          {isLive && (
            <span className="px-1.5 py-0.5 bg-field-bright/25 text-field-bright text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
              Live
            </span>
          )}
          {isFinal && (
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider rounded flex-shrink-0">
              Final
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/leagues/${leagueId}/scoring`)}
          className="text-sm font-display font-semibold text-blaze hover:text-blaze/70 dark:text-crown dark:hover:text-crown/80 transition-colors flex items-center gap-1 flex-shrink-0 ml-3"
        >
          Full Scoring
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Your Team */}
          {userTeam ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40 mb-2">Your Team</p>
              {/* Rank + Points */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-display font-bold text-gray-900 dark:text-white">
                  #{userTeam.rank}
                </span>
                <span className="text-gray-400 dark:text-white/40 text-sm">of {teams.length}</span>
                <span className="text-gray-300 dark:text-white/20 mx-1">&mdash;</span>
                <span className="text-3xl font-display font-bold text-blaze dark:text-crown">
                  {userTeam.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-gray-400 dark:text-white/40 text-sm">pts</span>
              </div>

              {/* Top Starters */}
              {topStarters.length > 0 && (
                <div className="space-y-1.5">
                  {/* Column headers */}
                  <div className="flex items-center justify-between px-3 pb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-1.5" />
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium">Player</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium w-8 text-center">Pos</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium w-8 text-center">Score</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium w-6 text-center">Thru</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium w-12 text-right">Pts</span>
                    </div>
                  </div>

                  {topStarters.map((player) => {
                    const isPlaying = isOnCourse(player.thru)
                    const isUnderPar = player.totalToPar != null && player.totalToPar < 0
                    return (
                      <div
                        key={player.playerId}
                        onClick={() => openPlayerScorecard(player)}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors border cursor-pointer ${
                          isUnderPar
                            ? 'bg-field/5 border-field/15 hover:bg-field/10 dark:bg-field/5 dark:border-field/15 dark:hover:bg-field/10'
                            : player.totalToPar > 0
                              ? 'bg-live-red/[0.03] border-live-red/10 hover:bg-live-red/[0.06] dark:bg-live-red/[0.04] dark:border-live-red/10 dark:hover:bg-live-red/[0.08]'
                              : 'bg-gray-50 border-gray-100 hover:bg-gray-100 dark:bg-white/[0.04] dark:border-white/[0.06] dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlaying ? 'bg-field-bright animate-pulse' : player.thru === 18 || player.thru === 'F' ? 'bg-gray-400 dark:bg-white/30' : 'bg-gray-300 dark:bg-white/20'}`} />
                          <span className="text-sm text-gray-900 dark:text-white/90 font-medium truncate">
                            {player.playerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs font-mono text-gray-400 dark:text-white/30 w-8 text-center">
                            {formatPosition(player.position)}
                          </span>
                          <span className={`text-xs font-mono font-semibold w-8 text-center ${toParColor(player.totalToPar)}`}>
                            {formatToPar(player.totalToPar)}
                          </span>
                          <span className="text-xs font-mono text-gray-400 dark:text-white/30 w-6 text-center">
                            {formatThru(player.thru)}
                          </span>
                          <span className="text-sm font-mono font-bold text-blaze dark:text-crown w-12 text-right">
                            {player.fantasyPoints.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Bottom hint */}
                  <p className="text-[10px] text-gray-300 dark:text-white/20 mt-2 px-3">
                    &#8593; Click any player for scorecard
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* No team — user hasn't drafted */
            <div className="flex items-center justify-center py-6 text-gray-400 dark:text-white/40 text-sm">
              <p>No team yet — draft to see your scores here</p>
            </div>
          )}

          {/* Right: League Leaderboard */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40 mb-2">League</p>

            {/* Points behind indicator */}
            {userTeam && userTeam.rank > 1 && (
              <div className="mb-3 px-1">
                <p className="text-[10px] text-gray-400 dark:text-white/40 mb-1">
                  {userPointsBehind.toFixed(1)} pts behind 1st
                </p>
                <div className="w-full bg-gray-100 dark:bg-white/[0.06] h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blaze/60 dark:bg-crown/60 h-1 rounded-full transition-all"
                    style={{ width: `${Math.max(5, Math.min(100, ((userTeam.totalPoints / leaderPoints) * 100)))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {leaderboardTeams.map((team, idx) => {
                const isUser = userTeam && team.userId === userTeam.userId
                // Show separator before user's row if they're not contiguous with top block
                const showGap = userTeam && team.rank > 5 && idx === leaderboardTeams.length - 1 && teams.length > 8

                return (
                  <div key={team.teamId || team.userId}>
                    {showGap && (
                      <div className="flex items-center gap-2 py-0.5 px-2">
                        <span className="text-gray-300 dark:text-white/20 text-xs">···</span>
                      </div>
                    )}
                    <div
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                        isUser
                          ? 'bg-blaze/5 border border-blaze/20 dark:bg-crown/10 dark:border-crown/25'
                          : 'bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-xs font-mono font-bold w-5 ${
                          team.rank === 1 ? 'text-crown' :
                          team.rank === 2 ? 'text-gray-400' :
                          team.rank === 3 ? 'text-amber-500' : 'text-gray-300 dark:text-white/30'
                        }`}>
                          {team.rank}.
                        </span>
                        <span
                          className={`text-sm truncate cursor-pointer hover:underline ${isUser ? 'text-blaze dark:text-crown font-semibold' : 'text-gray-800 dark:text-white/80'}`}
                          onClick={() => setSelectedTeam(team)}
                        >
                          {team.teamName || team.userName || 'Team'}
                        </span>
                        {isUser && (
                          <span className="bg-blaze/15 text-blaze dark:bg-crown/20 dark:text-crown text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-mono font-semibold flex-shrink-0 ml-2 ${
                        isUser ? 'text-blaze dark:text-crown' : 'text-gray-900 dark:text-white/90'
                      }`}>
                        {team.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — subtle update indicator */}
      {isLive && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-gray-300 dark:text-white/20 text-right">Updates every 60s</p>
        </div>
      )}

      {/* Player Scorecard Drawer — slides in from LEFT */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
          onClick={() => setSelectedPlayer(null)}
        />
      )}
      <div
        className={`fixed left-0 top-0 h-full max-w-[85vw] z-50 overflow-y-auto transition-transform duration-300 bg-white shadow-xl dark:bg-slate-900 dark:shadow-2xl border-r border-gray-200 dark:border-white/10 ${
          selectedPlayer ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${leftDrawerWidth}px` }}
      >
        {/* Resize handle — right edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blaze/20 dark:hover:bg-crown/20 transition-colors z-20"
          onMouseDown={startLeftResize}
        />
        {selectedPlayer && (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isOnCourse(freshPlayerData.thru) ? 'bg-field-bright animate-pulse' : freshPlayerData.thru === 18 || freshPlayerData.thru === 'F' ? 'bg-gray-400 dark:bg-white/30' : 'bg-gray-300 dark:bg-white/20'
                }`} />
                <h3 className="text-sm font-display font-bold text-gray-900 dark:text-white truncate">
                  {selectedPlayer.playerName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
                aria-label="Close scorecard"
              >
                <svg className="w-5 h-5 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Player stats strip — uses freshPlayerData so stats update with live poll */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-4">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/40">Pos</p>
                <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{formatPosition(freshPlayerData.position)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/40">Score</p>
                <p className={`text-sm font-mono font-bold ${toParColor(freshPlayerData.totalToPar)}`}>{formatToPar(freshPlayerData.totalToPar)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/40">Thru</p>
                <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{formatThru(freshPlayerData.thru)}</p>
              </div>
              <div className="text-center ml-auto">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/40">Fantasy Pts</p>
                <p className="text-lg font-mono font-bold text-blaze dark:text-crown">{freshPlayerData.fantasyPoints?.toFixed(1)}</p>
              </div>
            </div>

            {/* Scorecard */}
            <div className="px-4 py-3">
              {scorecardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blaze/30 dark:border-crown/30 border-t-blaze dark:border-t-crown rounded-full animate-spin" />
                </div>
              ) : scorecardData && Object.keys(scorecardData).length > 0 ? (
                (() => {
                  // Determine available rounds (only those with hole data)
                  const availableRounds = Object.keys(scorecardData).map(Number).filter(r => scorecardData[r]?.length > 0).sort((a, b) => a - b)
                  const activeRound = selectedRound && availableRounds.includes(selectedRound) ? selectedRound : availableRounds[availableRounds.length - 1]
                  const holeData = scorecardData[activeRound] || []

                  // Default 18-hole pars — merge API data into template
                  const defaultPars = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]
                  const holeDataMap = {}
                  if (holeData.length > 0) {
                    for (const h of holeData) holeDataMap[h.hole] = h
                  }
                  const holes = defaultPars.map((defPar, i) => {
                    const holeNum = i + 1
                    return holeDataMap[holeNum] || { hole: holeNum, par: defPar, score: null }
                  })
                  const front9 = holes.slice(0, 9)
                  const back9 = holes.slice(9, 18)
                  const front9Par = front9.reduce((s, h) => s + h.par, 0)
                  const back9Par = back9.reduce((s, h) => s + h.par, 0)
                  const front9Played = front9.filter(h => h.score != null)
                  const back9Played = back9.filter(h => h.score != null)
                  const front9Score = front9Played.length > 0 ? front9Played.reduce((s, h) => s + h.score, 0) : null
                  const back9Score = back9Played.length > 0 ? back9Played.reduce((s, h) => s + h.score, 0) : null
                  const totalScore = front9Score != null || back9Score != null ? (front9Score || 0) + (back9Score || 0) : null

                  // Inline renderScoreCell matching TournamentLeaderboard
                  const renderScoreCell = (score, par) => {
                    if (score == null) {
                      return <div className="w-7 h-7 rounded-md border border-dashed border-gray-300 dark:border-slate-600 mx-auto" />
                    }
                    const diff = score - par
                    if (diff <= -2) {
                      return <div className="w-7 h-7 rounded-full bg-crown text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
                    }
                    if (diff === -1) {
                      return <div className="w-7 h-7 rounded-full bg-blaze text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
                    }
                    if (diff === 0) {
                      return <div className="text-xs text-gray-500 dark:text-slate-400 text-center">{score}</div>
                    }
                    if (diff === 1) {
                      return <div className="w-7 h-7 rounded-sm bg-live-red/80 text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
                    }
                    return <div className="w-7 h-7 rounded-sm bg-live-red text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
                  }

                  // Color-code summary scores
                  const getSummaryColor = (score, par) => {
                    if (score == null) return 'text-gray-400 dark:text-slate-500'
                    if (score < par) return 'text-field'
                    if (score > par) return 'text-live-red'
                    return 'text-gray-500 dark:text-slate-400'
                  }

                  return (
                    <div>
                      {/* Round toggle pills */}
                      {availableRounds.length > 1 && (
                        <div className="flex gap-2 mb-4">
                          {availableRounds.map(r => (
                            <button
                              key={r}
                              onClick={() => setSelectedRound(r)}
                              className={`px-3 py-1 rounded-full text-xs font-mono font-medium cursor-pointer transition-colors ${
                                r === activeRound
                                  ? 'bg-blaze text-white'
                                  : 'bg-[var(--bg)] text-text-secondary border border-[var(--card-border)] hover:border-gray-400 dark:hover:border-slate-500'
                              }`}
                            >
                              R{r}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Front 9 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1 h-4 bg-blaze rounded-full" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Front 9</span>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-[auto_repeat(9,1fr)_auto] gap-x-1 gap-y-1 items-center min-w-[340px]">
                          {/* Row 1 — Hole numbers */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">#</div>
                          {front9.map((h, i) => (
                            <div key={i} className="text-xs font-bold text-gray-600 dark:text-slate-300 text-center">{i + 1}</div>
                          ))}
                          <div className="text-xs font-bold text-gray-600 dark:text-slate-300 text-center">Out</div>

                          {/* Row 2 — Par */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Par</div>
                          {front9.map((h, i) => (
                            <div key={i} className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center">{h.par}</div>
                          ))}
                          <div className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center font-bold">{front9Par}</div>

                          {/* Row 3 — Scores */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Scr</div>
                          {front9.map((h, i) => (
                            <div key={i}>
                              {renderScoreCell(h.score, h.par)}
                            </div>
                          ))}
                          <div className={`text-sm font-bold font-mono text-center ${getSummaryColor(front9Score, front9Par)}`}>
                            {front9Score != null ? front9Score : '\u2013'}
                          </div>
                        </div>
                      </div>

                      {/* Back 9 */}
                      <div className="flex items-center gap-2 mb-2 mt-4">
                        <span className="w-1 h-4 bg-field rounded-full" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Back 9</span>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-[auto_repeat(9,1fr)_auto] gap-x-1 gap-y-1 items-center min-w-[340px]">
                          {/* Row 1 — Hole numbers */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">#</div>
                          {back9.map((h, i) => (
                            <div key={i} className="text-xs font-bold text-gray-600 dark:text-slate-300 text-center">{i + 10}</div>
                          ))}
                          <div className="text-xs font-bold text-gray-600 dark:text-slate-300 text-center">In</div>

                          {/* Row 2 — Par */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Par</div>
                          {back9.map((h, i) => (
                            <div key={i} className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center">{h.par}</div>
                          ))}
                          <div className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center font-bold">{back9Par}</div>

                          {/* Row 3 — Scores */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Scr</div>
                          {back9.map((h, i) => (
                            <div key={i}>
                              {renderScoreCell(h.score, h.par)}
                            </div>
                          ))}
                          <div className={`text-sm font-bold font-mono text-center ${getSummaryColor(back9Score, back9Par)}`}>
                            {back9Score != null ? back9Score : '\u2013'}
                          </div>
                        </div>
                      </div>

                      {/* FRONT / BACK / TOTAL summary chips */}
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex-1 rounded px-2 py-1 text-center bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                          <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mr-1">FRONT</span>
                          <span className={`text-xs font-bold font-mono ${front9Score != null ? 'text-gray-700 dark:text-slate-200' : 'text-gray-300 dark:text-slate-600'}`}>
                            {front9Score != null ? front9Score : '\u2013'}
                          </span>
                        </div>
                        <div className="flex-1 rounded px-2 py-1 text-center bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                          <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mr-1">BACK</span>
                          <span className={`text-xs font-bold font-mono ${back9Score != null ? 'text-gray-700 dark:text-slate-200' : 'text-gray-300 dark:text-slate-600'}`}>
                            {back9Score != null ? back9Score : '\u2013'}
                          </span>
                        </div>
                        <div className="flex-1 rounded px-2 py-1 text-center bg-field/5 border border-field/20 dark:bg-field/10 dark:border-field/30">
                          <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mr-1">TOTAL</span>
                          <span className={`text-sm font-bold font-mono ${getSummaryColor(totalScore, front9Par + back9Par)}`}>
                            {totalScore != null ? totalScore : '\u2013'}
                          </span>
                        </div>
                      </div>

                      {/* Inline legend */}
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blaze inline-block" />
                          <span className="text-gray-500 dark:text-slate-400">Birdie</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-crown inline-block" />
                          <span className="text-gray-500 dark:text-slate-400">Eagle</span>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-white/40">
                  {freshPlayerData.thru === 0 || freshPlayerData.thru === null || freshPlayerData.thru === undefined ? (
                    <>
                      <svg className="w-8 h-8 mb-2 text-gray-300 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium">Not yet teed off</p>
                      <p className="text-xs text-gray-300 dark:text-white/20 mt-1">Scorecard will appear once play begins</p>
                    </>
                  ) : (
                    <p className="text-sm">Scorecard not available</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer — link to full scoring page */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06]">
              <Link
                to={`/leagues/${leagueId}/scoring`}
                className="flex items-center justify-center gap-1 text-sm font-display font-semibold text-blaze dark:text-crown hover:text-blaze-hot dark:hover:text-crown/80 transition-colors"
                onClick={() => setSelectedPlayer(null)}
              >
                Full Leaderboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Team Roster Drawer — slides in from RIGHT */}
      {/* Backdrop */}
      {selectedTeam && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
          onClick={() => setSelectedTeam(null)}
        />
      )}
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full max-w-[85vw] z-50 overflow-y-auto transition-transform duration-300 bg-white shadow-xl dark:bg-slate-900 dark:shadow-2xl border-l border-gray-200 dark:border-white/10 ${
          selectedTeam ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* Resize handle — left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blaze/20 dark:hover:bg-crown/20 transition-colors z-20"
          onMouseDown={startResize}
        />
        {selectedTeam && (() => {
          const drawerStarters = selectedTeam.starters
            ? [...selectedTeam.starters].sort((a, b) => b.fantasyPoints - a.fantasyPoints)
            : null
          const drawerBench = selectedTeam.bench
            ? [...selectedTeam.bench].sort((a, b) => b.fantasyPoints - a.fantasyPoints)
            : null
          const hasRoster = drawerStarters && drawerStarters.length > 0

          return (
            <>
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    selectedTeam.rank === 1 ? 'bg-crown/20 text-crown' :
                    selectedTeam.rank === 2 ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                    selectedTeam.rank === 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' :
                    'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-white/40'
                  }`}>
                    #{selectedTeam.rank}
                  </span>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white truncate">
                    {selectedTeam.teamName || selectedTeam.userName || 'Team'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
                  aria-label="Close drawer"
                >
                  <svg className="w-5 h-5 text-slate-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Total Points */}
              <div className="px-4 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-1">Total Points</p>
                <span className="text-2xl font-bold font-mono text-blaze dark:text-crown">
                  {selectedTeam.totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </div>

              {/* Roster List */}
              <div className="px-4 py-3">
                {hasRoster ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-2">
                      Starters ({drawerStarters.length})
                    </p>
                    <div className="space-y-1.5 mb-4">
                      {drawerStarters.map((player) => {
                        const pUnderPar = player.totalToPar != null && player.totalToPar < 0
                        const pOverPar = player.totalToPar != null && player.totalToPar > 0
                        return (
                        <div
                          key={player.playerId}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${
                            pUnderPar
                              ? 'bg-field/5 border-field/15 dark:bg-field/5 dark:border-field/15'
                              : pOverPar
                                ? 'bg-live-red/[0.03] border-live-red/10 dark:bg-live-red/[0.04] dark:border-live-red/10'
                                : 'bg-slate-50 border-slate-100 dark:bg-white/[0.04] dark:border-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              player.status === 'CUT' || player.status === 'WD' || player.status === 'DQ'
                                ? 'bg-live-red'
                                : player.thru === 18 || player.thru === 'F'
                                  ? 'bg-slate-300 dark:bg-white/20'
                                  : 'bg-field-bright'
                            }`} />
                            <span className="text-sm text-slate-800 dark:text-white/90 font-medium truncate">
                              {player.playerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                            <span className="text-xs font-mono text-slate-400 dark:text-white/30 w-8 text-center">
                              {formatPosition(player.position)}
                            </span>
                            <span className={`text-xs font-mono w-8 text-center ${toParColor(player.totalToPar)}`}>
                              {formatToPar(player.totalToPar)}
                            </span>
                            <span className="text-xs font-mono text-slate-400 dark:text-white/30 w-6 text-center">
                              {formatThru(player.thru)}
                            </span>
                            <span className="text-sm font-mono font-semibold text-blaze dark:text-crown w-12 text-right">
                              {player.fantasyPoints.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        )
                      })}
                    </div>

                    {/* Bench */}
                    {drawerBench && drawerBench.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-2">
                          Bench ({drawerBench.length})
                        </p>
                        <div className="space-y-1.5 mb-4">
                          {drawerBench.map((player) => (
                            <div
                              key={player.playerId}
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/60 dark:bg-white/[0.02] transition-colors opacity-70"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  player.status === 'CUT' || player.status === 'WD' || player.status === 'DQ'
                                    ? 'bg-live-red'
                                    : player.thru === 18 || player.thru === 'F'
                                      ? 'bg-slate-300 dark:bg-white/20'
                                      : 'bg-field-bright'
                                }`} />
                                <span className="text-sm text-slate-600 dark:text-white/60 font-medium truncate">
                                  {player.playerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                                <span className="text-xs font-mono text-slate-400 dark:text-white/30 w-8 text-center">
                                  {formatPosition(player.position)}
                                </span>
                                <span className={`text-xs font-mono w-8 text-center ${toParColor(player.totalToPar)}`}>
                                  {formatToPar(player.totalToPar)}
                                </span>
                                <span className="text-xs font-mono text-slate-400 dark:text-white/30 w-6 text-center">
                                  {formatThru(player.thru)}
                                </span>
                                <span className="text-sm font-mono font-semibold text-slate-500 dark:text-white/40 w-12 text-right">
                                  {player.fantasyPoints.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-slate-400 dark:text-white/40 text-sm">
                    <p>Roster details not available</p>
                  </div>
                )}
              </div>

              {/* Footer link */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                <Link
                  to={`/leagues/${leagueId}/scoring`}
                  className="flex items-center justify-center gap-1 text-sm font-display font-semibold text-blaze dark:text-crown hover:text-blaze-hot dark:hover:text-crown/80 transition-colors"
                  onClick={() => setSelectedTeam(null)}
                >
                  Go to Full Scoring
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default LiveScoringWidget
