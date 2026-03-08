import { useState, useRef, useCallback } from 'react'
import api from '../../services/api'

const TournamentLeaderboard = ({ leaderboard, cut, myPlayerIds = [], recentChanges = {}, tournamentId, onPlayerExpand, onPlayerClick, timezone, currentRound: tournamentRound }) => {
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [expandedRound, setExpandedRound] = useState(null) // which round tab is active
  const [showRounds, setShowRounds] = useState(false)
  const [search, setSearch] = useState('')

  // Cache of hole scores: { [playerId]: { [roundNumber]: [{ hole, par, score, toPar }] } }
  const holeScoresCache = useRef({})
  const [holeScores, setHoleScores] = useState({})
  const [loadingScorecard, setLoadingScorecard] = useState(false)

  /** Compute tournament-total eagles/birdies/bogeys from all rounds of hole data */
  const computeStatsFromHoles = (allRounds) => {
    let eagles = 0, birdies = 0, bogeys = 0
    if (!allRounds) return { eagles, birdies, bogeys }
    for (const roundNum of Object.keys(allRounds)) {
      const holes = allRounds[roundNum]
      if (!holes) continue
      for (const h of holes) {
        if (h.score == null || h.par == null) continue
        const diff = h.score - h.par
        if (diff <= -2) eagles++
        else if (diff === -1) birdies++
        else if (diff >= 1) bogeys++
      }
    }
    return { eagles, birdies, bogeys }
  }

  const fetchHoleScores = useCallback(async (playerId, playerObj, forceRefresh = false) => {
    if (!tournamentId) return
    // Use cache only if not forcing refresh and cache has data for current round
    const cached = holeScoresCache.current[playerId]
    const currentRd = playerObj?.currentRound || tournamentRound
    if (cached && !forceRefresh) {
      // Bust cache if player is mid-round but cache has no data for their current round
      const hasCurrentRound = currentRd && cached[currentRd]?.length > 0
      if (hasCurrentRound || !currentRd) {
        setHoleScores((prev) => ({ ...prev, [playerId]: cached }))
        if (playerObj) {
          const stats = computeStatsFromHoles(cached)
          onPlayerExpand?.({ ...playerObj, ...stats })
        }
        return
      }
    }
    setLoadingScorecard(true)
    try {
      const data = await api.getPlayerScorecard(tournamentId, playerId)
      const scorecards = data?.scorecards || {}
      holeScoresCache.current[playerId] = scorecards
      setHoleScores((prev) => ({ ...prev, [playerId]: scorecards }))
      if (playerObj) {
        const stats = computeStatsFromHoles(scorecards)
        onPlayerExpand?.({ ...playerObj, ...stats })
      }
    } catch (e) {
      console.warn('Failed to fetch scorecard:', e.message)
    } finally {
      setLoadingScorecard(false)
    }
  }, [tournamentId, tournamentRound, onPlayerExpand])

  /** Get short timezone abbreviation (e.g. "MST", "ET") from IANA zone */
  const getTimezoneAbbr = () => {
    if (!timezone) return 'ET'
    try {
      const abbr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value
      return abbr || 'ET'
    } catch { return 'ET' }
  }

  const formatTeeTime = (isoStr) => {
    if (!isoStr) return null
    const d = new Date(isoStr)
    if (timezone) {
      try {
        return d.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })
      } catch {}
    }
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  /** Get the tee time to show for a player */
  const getPlayerTeeTime = (player) => {
    if (!player.teeTimes) return null
    const effectiveRound = tournamentRound || player.currentRound || 1
    const playerRound = player.currentRound || 1

    // Player is mid-round in the current tournament round — no tee time needed
    if (playerRound === effectiveRound && typeof player.thru === 'number' && player.thru > 0 && player.thru < 18) return null

    // Player finished the current tournament round
    if (playerRound === effectiveRound && (player.thru === 'F' || player.thru === 18)) return null

    // Player hasn't started the tournament's current round (between rounds or pre-round)
    // Show the tee time for the tournament's current round
    const teeTime = player.teeTimes[effectiveRound]
    return teeTime ? formatTeeTime(teeTime) : null
  }

  const formatScore = (score) => {
    if (score == null || score === '' || isNaN(score)) return '\u2013'
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return `${num}`
  }

  const getScoreColor = (score) => {
    if (score == null || score === '') return 'text-text-secondary'
    const num = parseInt(score)
    if (num < 0) return 'text-field'
    if (num > 0) return 'text-live-red'
    return 'text-text-primary'
  }

  const getMedalStyle = (pos) => {
    const p = typeof pos === 'string' ? parseInt(pos) : pos
    if (p === 1) return { bg: 'bg-crown/15', text: 'text-crown', border: 'border-crown/30', icon: '&#127942;' }
    if (p === 2) return { bg: 'bg-gray-300/10', text: 'text-gray-400 dark:text-gray-300', border: 'border-gray-400/30', icon: '&#129352;' }
    if (p === 3) return { bg: 'bg-amber-600/10', text: 'text-amber-500', border: 'border-amber-600/30', icon: '&#129353;' }
    return null
  }

  const getPositionNum = (pos) => {
    if (typeof pos === 'number') return pos
    return parseInt(String(pos).replace(/[^0-9]/g, '')) || 999
  }

  const isCutPlayer = (player) => player.status === 'CUT'

  // Find cut line position
  const cutLineIndex = leaderboard.findIndex(p => p.status === 'CUT')

  // Filter by search, then group into active and cut
  const searchLower = search.toLowerCase().trim()
  const filtered = searchLower
    ? leaderboard.filter(p => p.name?.toLowerCase().includes(searchLower))
    : leaderboard
  const activePlayers = filtered.filter(p => p.status !== 'CUT')
  const cutPlayers = filtered.filter(p => p.status === 'CUT')

  /** Render a single score cell with filled shapes */
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

  /** Color-code a summary score */
  const getSummaryColor = (score, par) => {
    if (score == null) return 'text-gray-400 dark:text-slate-500'
    if (score < par) return 'text-field'
    if (score > par) return 'text-live-red'
    return 'text-gray-500 dark:text-slate-400'
  }

  const renderPlayer = (player, index, isCut = false) => {
    const isMyPlayer = myPlayerIds.includes(player.id)
    const recentChange = recentChanges[player.id]
    const hasRecentChange = recentChange && (Date.now() - recentChange.timestamp < 3000)
    const posNum = getPositionNum(player.position)
    const medal = !isCut ? getMedalStyle(posNum) : null
    const isExpanded = expandedPlayer === player.id

    const changeGlow = hasRecentChange
      ? recentChange.type === 'eagle' ? 'ring-1 ring-crown/40'
        : recentChange.type === 'birdie' ? 'ring-1 ring-field/30'
        : recentChange.type === 'bogey' || recentChange.type === 'double' ? 'ring-1 ring-live-red/30'
        : ''
      : ''

    return (
      <div key={player.id}>
        <div
          onClick={() => {
            if (onPlayerClick?.(player)) return
            if (isExpanded) {
              setExpandedPlayer(null)
              setExpandedRound(null)
              onPlayerExpand?.(null)
            } else {
              setExpandedPlayer(player.id)
              // Default to current round (the one being played), fallback to latest with data
              setExpandedRound(player.currentRound || player.rounds?.r4 != null && 4
                || player.rounds?.r3 != null && 3
                || player.rounds?.r2 != null && 2
                || player.rounds?.r1 != null && 1
                || 1)
              // Fetch hole scores — will call onPlayerExpand with enriched stats once loaded
              onPlayerExpand?.(player)
              fetchHoleScores(player.id, player)
            }
          }}
          className={`
            group grid items-center gap-2 px-3 py-2.5 cursor-pointer transition-all duration-200
            ${showRounds ? 'grid-cols-[40px_1fr_52px_52px_52px_52px_52px_56px_64px]' : 'grid-cols-[40px_1fr_56px_48px_56px_64px]'}
            ${isExpanded
              ? 'bg-field-bright/10 border-l-2 border-l-field-bright'
              : medal ? `${medal.bg} border-l-2 ${medal.border}` : 'border-l-2 border-transparent'}
            ${!isExpanded && isMyPlayer ? 'bg-field-bright/8 border-l-field' : ''}
            ${isCut ? 'opacity-50' : ''}
            ${hasRecentChange ? `bg-[var(--surface-alt)] ${changeGlow}` : ''}
            ${!isCut && !isExpanded ? 'hover:bg-[var(--surface-alt)]' : ''}
            ${index > 0 ? 'border-t border-[var(--card-border)]' : ''}
          `}
        >
          {/* Position */}
          <div className={`text-center font-bold text-sm ${medal ? medal.text : 'text-text-secondary'}`}>
            {isCut ? (
              <span className="text-live-red/70 text-xs font-medium">CUT</span>
            ) : (
              <div className="flex items-center justify-center gap-0.5">
                <span>{player.position}</span>
                {player.positionChange != null && player.positionChange !== 0 && (
                  <span className={`text-[10px] ${player.positionChange > 0 ? 'text-field' : 'text-live-red'}`}>
                    {player.positionChange > 0 ? '\u25B2' : '\u25BC'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Player */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Headshot or flag avatar */}
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover bg-[var(--stone)] flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg bg-[var(--stone)] ${player.headshotUrl ? 'hidden' : ''}`}
            >
              {player.countryFlag || '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-sm truncate ${isMyPlayer ? 'text-field' : 'text-text-primary'}`}>
                  {player.name}
                </span>
                {hasRecentChange && (
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse
                    ${recentChange.type === 'eagle' ? 'bg-crown/20 text-crown' : ''}
                    ${recentChange.type === 'birdie' ? 'bg-field-bright/20 text-field' : ''}
                    ${recentChange.type === 'bogey' ? 'bg-live-red/20 text-live-red' : ''}
                    ${recentChange.type === 'double' ? 'bg-live-red/20 text-live-red' : ''}
                  `}>
                    {recentChange.type === 'eagle' ? 'EAGLE' : recentChange.type === 'birdie' ? 'BIRDIE' : recentChange.type === 'bogey' ? 'BOGEY' : 'DBL'}
                  </span>
                )}
              </div>
              {/* Stat badges */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {isMyPlayer && (
                  <span className="text-[10px] font-medium text-field/80 bg-field-bright/10 px-1.5 rounded">MY TEAM</span>
                )}
                {player.eagles > 0 && (
                  <span className="text-[10px] text-crown/80">{player.eagles}E</span>
                )}
                {player.birdies > 0 && (
                  <span className="text-[10px] text-field/60">{player.birdies}B</span>
                )}
              </div>
            </div>
          </div>

          {/* Rounds (toggleable) */}
          {showRounds && (
            <>
              {[player.rounds?.r1, player.rounds?.r2, player.rounds?.r3, player.rounds?.r4].map((r, i) => (
                <div key={i} className="text-center text-xs text-text-secondary font-mono">
                  {r != null ? r : '\u2013'}
                </div>
              ))}
            </>
          )}

          {/* Today */}
          <div className={`text-center text-sm font-semibold ${getScoreColor(player.thru === 'F' || player.thru === 18 || player.thru > 0 ? player.today : null)}`}>
            {player.thru === 'F' || player.thru === 18 || player.thru > 0 ? formatScore(player.today) : '\u2013'}
          </div>

          {/* Thru */}
          {!showRounds && (
            <div className="text-center text-xs text-text-muted">
              {player.thru === 'F' || player.thru === 18 ? (
                <span className="text-text-secondary font-medium">F</span>
              ) : player.thru > 0 ? player.thru : '\u2013'}
            </div>
          )}

          {/* Total */}
          <div className={`text-center text-sm font-bold ${getScoreColor(player.score)}`}>
            {formatScore(player.score)}
          </div>

          {/* Tee Time */}
          <div className="text-center">
            {(() => {
              const teeTime = getPlayerTeeTime(player)
              return teeTime ? (
                <span className="text-xs text-text-muted font-medium">{teeTime}</span>
              ) : (
                <span className="text-xs text-text-muted">{'\u2013'}</span>
              )
            })()}
          </div>
        </div>

        {/* Expanded inline scorecard */}
        {isExpanded && (
          <div className="bg-gray-50 border-t border-gray-200 dark:bg-slate-900/95 dark:border-white/10 px-4 py-4">
            {/* Probability chips — ABOVE round tabs */}
            {player.probabilities && (
              <div className="flex gap-1 mb-2">
                {player.probabilities.win != null && (
                  <div className="flex-1 rounded px-1.5 py-1 text-center border border-blaze/50 bg-blaze/5 dark:border-blaze/40 dark:bg-blaze/10">
                    <span className="text-xs font-bold font-mono text-blaze">{(player.probabilities.win * 100).toFixed(1)}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium ml-1">WIN</span>
                  </div>
                )}
                {player.probabilities.top5 != null && (
                  <div className="flex-1 rounded px-1.5 py-1 text-center bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                    <span className="text-xs font-bold font-mono text-gray-700 dark:text-slate-200">{(player.probabilities.top5 * 100).toFixed(1)}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium ml-1">T5</span>
                  </div>
                )}
                {player.probabilities.top10 != null && (
                  <div className="flex-1 rounded px-1.5 py-1 text-center bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                    <span className="text-xs font-bold font-mono text-gray-700 dark:text-slate-200">{(player.probabilities.top10 * 100).toFixed(1)}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium ml-1">T10</span>
                  </div>
                )}
                {player.probabilities.makeCut != null && (
                  <div className="flex-1 rounded px-1.5 py-1 text-center bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                    <span className="text-xs font-bold font-mono text-gray-700 dark:text-slate-200">{(player.probabilities.makeCut * 100).toFixed(1)}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium ml-1">CUT</span>
                  </div>
                )}
              </div>
            )}

            {/* Round toggle pills + inline legend */}
            <div className="flex items-center gap-2 mt-3 mb-3">
              {[1, 2, 3, 4].filter(r => {
                // Only show pills for rounds that have data
                const hasRoundScore = player.rounds?.[`r${r}`] != null
                const hasHoleData = holeScores[player.id]?.[r]?.length > 0
                const isCurrentRound = r === player.currentRound
                return hasRoundScore || hasHoleData || isCurrentRound
              }).map(r => {
                const isActive = expandedRound === r
                return (
                  <button
                    key={r}
                    onClick={(e) => { e.stopPropagation(); setExpandedRound(r) }}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blaze text-white'
                        : 'bg-[var(--bg)] text-text-secondary border border-[var(--card-border)] hover:border-gray-400 dark:hover:border-slate-500'
                    }`}
                  >
                    R{r}
                  </button>
                )
              })}

              {/* Inline legend */}
              <div className="ml-auto flex items-center gap-3 text-xs">
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

            {/* Selected round scorecard */}
            {expandedRound && (
              <div>
                {loadingScorecard && !holeScores[player.id] && (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-400 dark:text-slate-500">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blaze" />
                    Loading scorecard...
                  </div>
                )}
                {(() => {
                  const roundScore = player.rounds?.[`r${expandedRound}`]
                  const isCurrent = expandedRound === player.currentRound
                  const isInProgress = isCurrent && !roundScore
                  const holeData = holeScores[player.id]?.[expandedRound]
                  const hasAnyScores = holeData && holeData.length > 0 && holeData.some(h => h.score != null)

                  // Show waiting message if current round selected but no hole data yet
                  if (isCurrent && !hasAnyScores && !loadingScorecard) {
                    return (
                      <div className="text-center py-4 text-xs text-gray-400 dark:text-slate-500">
                        <p>Hole-by-hole data updating shortly...</p>
                        <p className="mt-1 text-[10px]">Scores sync every few minutes during play</p>
                      </div>
                    )
                  }

                  // Course par layout — always build full 18-hole array, merging ESPN data with defaults
                  const defaultPars = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]
                  const holeDataMap = {}
                  if (holeData && holeData.length > 0) {
                    for (const h of holeData) holeDataMap[h.hole] = h
                  }
                  const holes = defaultPars.map((defPar, i) => {
                    const holeNum = i + 1
                    return holeDataMap[holeNum] || { hole: holeNum, par: defPar, score: null }
                  })
                  const front9 = holes.slice(0, 9)
                  const back9 = holes.slice(9, 18)
                  const front9Par = front9.reduce((s, h) => s + (h.par || defaultPars[h.hole - 1] || 4), 0)
                  const back9Par = back9.reduce((s, h) => s + (h.par || defaultPars[h.hole - 1] || 4), 0)
                  const hasScores = holeData && holeData.length > 0 && holeData.some(h => h.score != null)
                  const front9Played = front9.filter(h => h.score != null)
                  const back9Played = back9.filter(h => h.score != null)
                  const front9Score = front9Played.length > 0 ? front9Played.reduce((s, h) => s + h.score, 0) : null
                  const back9Score = back9Played.length > 0 ? back9Played.reduce((s, h) => s + h.score, 0) : null
                  const totalScore = roundScore || (front9Score != null && back9Score != null ? front9Score + back9Score : null)

                  return (
                    <>
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
                            <div key={i} className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center">{h.par || defaultPars[i]}</div>
                          ))}
                          <div className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center font-bold">{front9Par}</div>

                          {/* Row 3 — Scores */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Scr</div>
                          {front9.map((h, i) => (
                            <div key={i}>
                              {renderScoreCell(h.score, h.par || defaultPars[i])}
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
                            <div key={i} className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center">{h.par || defaultPars[i + 9]}</div>
                          ))}
                          <div className="text-xs text-gray-400 dark:text-slate-500 font-mono text-center font-bold">{back9Par}</div>

                          {/* Row 3 — Scores */}
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8">Scr</div>
                          {back9.map((h, i) => (
                            <div key={i}>
                              {renderScoreCell(h.score, h.par || defaultPars[i + 9])}
                            </div>
                          ))}
                          <div className={`text-sm font-bold font-mono text-center ${getSummaryColor(back9Score, back9Par)}`}>
                            {back9Score != null ? back9Score : '\u2013'}
                          </div>
                        </div>
                      </div>

                      {/* Summary row — inline compact */}
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
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
                          <span className="text-sm font-bold font-mono text-field">
                            {totalScore != null ? totalScore : '\u2013'}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] shadow-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--stone)] to-[var(--surface)] border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-text-primary tracking-tight">Leaderboard</h3>
          {cut != null && (
            <span className="text-xs text-live-red/80 bg-live-red/10 px-2 py-0.5 rounded-full font-medium">
              Cut {formatScore(cut)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-32 sm:w-40 pl-7 pr-2 py-1 text-xs rounded-full bg-[var(--bg-alt)] border border-[var(--card-border)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-field-bright/50 focus:border-field-bright/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowRounds(!showRounds)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              showRounds ? 'bg-field-bright/15 text-field' : 'bg-[var(--stone)] text-text-muted hover:text-text-primary'
            }`}
          >
            Rounds
          </button>
          <span className="text-xs text-text-muted">{filtered.length}{search ? `/${leaderboard.length}` : ''} players</span>
        </div>
      </div>

      {/* Column headers */}
      <div className={`
        grid items-center gap-2 px-3 py-2 bg-[var(--stone)] text-[11px] text-text-muted uppercase tracking-wider font-medium
        ${showRounds ? 'grid-cols-[40px_1fr_52px_52px_52px_52px_52px_56px_64px]' : 'grid-cols-[40px_1fr_56px_48px_56px_64px]'}
      `}>
        <div className="text-center">Pos</div>
        <div>Player</div>
        {showRounds && (
          <>
            <div className="text-center">R1</div>
            <div className="text-center">R2</div>
            <div className="text-center">R3</div>
            <div className="text-center">R4</div>
          </>
        )}
        <div className="text-center">Today</div>
        {!showRounds && <div className="text-center">Thru</div>}
        <div className="text-center">Total</div>
        <div className="text-center">Tee <span className="normal-case text-text-muted/60">{getTimezoneAbbr()}</span></div>
      </div>

      {/* Active players */}
      <div className="max-h-[600px] overflow-y-auto">
        {activePlayers.map((player, i) => renderPlayer(player, i))}

        {/* Cut line */}
        {cutPlayers.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-live-red/5 border-y border-live-red/20">
            <div className="flex-1 h-px bg-live-red/30" />
            <span className="text-xs font-bold text-live-red/80 uppercase tracking-widest">Projected Cut</span>
            <div className="flex-1 h-px bg-live-red/30" />
          </div>
        )}

        {/* Cut players */}
        {cutPlayers.map((player, i) => renderPlayer(player, i, true))}
      </div>
    </div>
  )
}

export default TournamentLeaderboard
