import { useState, useRef, useCallback } from 'react'
import api from '../../services/api'

/**
 * Traditional golf scorecard notation:
 *   Eagle or better → double circle
 *   Birdie          → single circle
 *   Par             → plain number
 *   Bogey           → single square
 *   Double bogey+   → double square
 */
const ScoreCell = ({ score, par }) => {
  if (score == null) return <span className="text-text-muted">-</span>
  const diff = score - par
  if (diff <= -2) return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-full border-2 border-yellow-400" />
      <span className="absolute inset-[3px] rounded-full border-2 border-yellow-400" />
      <span className="text-yellow-400 font-bold text-[11px] relative z-10">{score}</span>
    </span>
  )
  if (diff === -1) return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-full border-2 border-emerald-400" />
      <span className="text-emerald-400 font-semibold text-[11px] relative z-10">{score}</span>
    </span>
  )
  if (diff === 0) return <span className="inline-flex items-center justify-center w-7 h-7 text-white text-[11px]">{score}</span>
  if (diff === 1) return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-sm border-2 border-red-400" />
      <span className="text-red-400 font-semibold text-[11px] relative z-10">{score}</span>
    </span>
  )
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-sm border-2 border-red-500" />
      <span className="absolute inset-[3px] rounded-sm border-2 border-red-500" />
      <span className="text-red-500 font-bold text-[11px] relative z-10">{score}</span>
    </span>
  )
}

const TournamentLeaderboard = ({ leaderboard, cut, myPlayerIds = [], recentChanges = {}, tournamentId }) => {
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [expandedRound, setExpandedRound] = useState(null) // which round tab is active
  const [showRounds, setShowRounds] = useState(false)
  const [search, setSearch] = useState('')

  // Cache of hole scores: { [playerId]: { [roundNumber]: [{ hole, par, score, toPar }] } }
  const holeScoresCache = useRef({})
  const [holeScores, setHoleScores] = useState({})
  const [loadingScorecard, setLoadingScorecard] = useState(false)

  const fetchHoleScores = useCallback(async (playerId) => {
    if (!tournamentId || holeScoresCache.current[playerId]) {
      setHoleScores((prev) => ({ ...prev, [playerId]: holeScoresCache.current[playerId] || {} }))
      return
    }
    setLoadingScorecard(true)
    try {
      const data = await api.getPlayerScorecard(tournamentId, playerId)
      const scorecards = data?.scorecards || {}
      holeScoresCache.current[playerId] = scorecards
      setHoleScores((prev) => ({ ...prev, [playerId]: scorecards }))
    } catch (e) {
      console.warn('Failed to fetch scorecard:', e.message)
    } finally {
      setLoadingScorecard(false)
    }
  }, [tournamentId])

  const formatTeeTime = (isoStr) => {
    if (!isoStr) return null
    const d = new Date(isoStr)
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  /** Get the tee time to show for a player (current round only, only if not started) */
  const getPlayerTeeTime = (player) => {
    if (!player.teeTimes) return null
    const currentRound = player.currentRound || 1
    // Only show tee time if player hasn't started current round
    if (player.thru > 0 || player.thru === 'F' || player.thru === 18) return null
    const teeTime = player.teeTimes[currentRound]
    return teeTime ? formatTeeTime(teeTime) : null
  }

  const formatScore = (score) => {
    if (score == null || score === '' || isNaN(score)) return '–'
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return `${num}`
  }

  const getScoreColor = (score) => {
    if (score == null || score === '') return 'text-text-secondary'
    const num = parseInt(score)
    if (num < 0) return 'text-emerald-400'
    if (num > 0) return 'text-red-400'
    return 'text-white'
  }

  const getMedalStyle = (pos) => {
    const p = typeof pos === 'string' ? parseInt(pos) : pos
    if (p === 1) return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: '&#127942;' }
    if (p === 2) return { bg: 'bg-gray-300/10', text: 'text-gray-300', border: 'border-gray-400/30', icon: '&#129352;' }
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

  const renderPlayer = (player, index, isCut = false) => {
    const isMyPlayer = myPlayerIds.includes(player.id)
    const recentChange = recentChanges[player.id]
    const hasRecentChange = recentChange && (Date.now() - recentChange.timestamp < 3000)
    const posNum = getPositionNum(player.position)
    const medal = !isCut ? getMedalStyle(posNum) : null
    const isExpanded = expandedPlayer === player.id

    const changeGlow = hasRecentChange
      ? recentChange.type === 'eagle' ? 'ring-1 ring-yellow-400/40'
        : recentChange.type === 'birdie' ? 'ring-1 ring-emerald-400/30'
        : recentChange.type === 'bogey' || recentChange.type === 'double' ? 'ring-1 ring-red-400/30'
        : ''
      : ''

    return (
      <div key={player.id}>
        <div
          onClick={() => {
            if (isExpanded) {
              setExpandedPlayer(null)
              setExpandedRound(null)
            } else {
              setExpandedPlayer(player.id)
              // Default to current round (the one being played), fallback to latest with data
              setExpandedRound(player.currentRound || player.rounds?.r4 != null && 4
                || player.rounds?.r3 != null && 3
                || player.rounds?.r2 != null && 2
                || player.rounds?.r1 != null && 1
                || 1)
              // Fetch hole scores
              fetchHoleScores(player.id)
            }
          }}
          className={`
            group grid items-center gap-2 px-3 py-2.5 cursor-pointer transition-all duration-200
            ${showRounds ? 'grid-cols-[40px_1fr_52px_52px_52px_52px_52px_56px_64px]' : 'grid-cols-[40px_1fr_56px_48px_56px_64px]'}
            ${medal ? `${medal.bg} border-l-2 ${medal.border}` : 'border-l-2 border-transparent'}
            ${isMyPlayer ? 'bg-emerald-500/8 border-l-emerald-400' : ''}
            ${isCut ? 'opacity-50' : ''}
            ${hasRecentChange ? `bg-dark-tertiary/40 ${changeGlow}` : ''}
            ${!isCut ? 'hover:bg-dark-tertiary/60' : ''}
            ${index > 0 ? 'border-t border-dark-border/30' : ''}
          `}
        >
          {/* Position */}
          <div className={`text-center font-bold text-sm ${medal ? medal.text : 'text-text-secondary'}`}>
            {isCut ? (
              <span className="text-red-400/70 text-xs font-medium">CUT</span>
            ) : (
              <div className="flex items-center justify-center gap-0.5">
                <span>{player.position}</span>
                {player.positionChange != null && player.positionChange !== 0 && (
                  <span className={`text-[10px] ${player.positionChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                className="w-8 h-8 rounded-full object-cover bg-dark-tertiary flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg bg-dark-tertiary ${player.headshotUrl ? 'hidden' : ''}`}
            >
              {player.countryFlag || '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-sm truncate ${isMyPlayer ? 'text-emerald-400' : 'text-white'}`}>
                  {player.name}
                </span>
                {hasRecentChange && (
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse
                    ${recentChange.type === 'eagle' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                    ${recentChange.type === 'birdie' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    ${recentChange.type === 'bogey' ? 'bg-red-500/20 text-red-400' : ''}
                    ${recentChange.type === 'double' ? 'bg-red-500/20 text-red-400' : ''}
                  `}>
                    {recentChange.type === 'eagle' ? 'EAGLE' : recentChange.type === 'birdie' ? 'BIRDIE' : recentChange.type === 'bogey' ? 'BOGEY' : 'DBL'}
                  </span>
                )}
              </div>
              {/* Stat badges */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {isMyPlayer && (
                  <span className="text-[10px] font-medium text-emerald-400/80 bg-emerald-500/10 px-1.5 rounded">MY TEAM</span>
                )}
                {player.eagles > 0 && (
                  <span className="text-[10px] text-yellow-400/80">{player.eagles}E</span>
                )}
                {player.birdies > 0 && (
                  <span className="text-[10px] text-emerald-400/60">{player.birdies}B</span>
                )}
              </div>
            </div>
          </div>

          {/* Rounds (toggleable) */}
          {showRounds && (
            <>
              {[player.rounds?.r1, player.rounds?.r2, player.rounds?.r3, player.rounds?.r4].map((r, i) => (
                <div key={i} className="text-center text-xs text-text-secondary font-mono">
                  {r != null ? r : '–'}
                </div>
              ))}
            </>
          )}

          {/* Today */}
          <div className={`text-center text-sm font-semibold ${getScoreColor(player.thru > 0 ? player.today : null)}`}>
            {player.thru === 'F' || player.thru === 18 ? '–' : player.thru > 0 ? formatScore(player.today) : '–'}
          </div>

          {/* Thru */}
          {!showRounds && (
            <div className="text-center text-xs text-text-muted">
              {player.thru === 'F' || player.thru === 18 ? (
                <span className="text-text-secondary font-medium">F</span>
              ) : player.thru > 0 ? player.thru : '–'}
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
                <span className="text-xs text-text-muted">–</span>
              )
            })()}
          </div>
        </div>

        {/* Expanded inline scorecard */}
        {isExpanded && (
          <div className="bg-dark-tertiary/40 border-t border-dark-border/30">
            {/* Round tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2">
              {[1, 2, 3, 4].map(r => {
                const roundScore = player.rounds?.[`r${r}`]
                const hasScore = roundScore != null
                const isReachable = r <= (player.currentRound || 1) || hasScore
                const isActive = expandedRound === r
                const isCurrent = r === player.currentRound
                return (
                  <button
                    key={r}
                    onClick={(e) => { e.stopPropagation(); if (isReachable) setExpandedRound(r) }}
                    disabled={!isReachable}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${isActive
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                        : isReachable
                          ? 'bg-dark-secondary/60 text-text-secondary hover:text-white hover:bg-dark-secondary'
                          : 'bg-dark-secondary/30 text-text-muted/40 cursor-not-allowed'}
                    `}
                  >
                    R{r}
                    {hasScore && <span className="ml-1 opacity-70">({roundScore})</span>}
                    {isCurrent && !hasScore && <span className="ml-1 text-yellow-400/70">*</span>}
                  </button>
                )
              })}

              {/* Overall summary chip */}
              <div className="ml-auto flex items-center gap-3 text-xs">
                {player.score != null && (
                  <span className={`font-bold ${getScoreColor(player.score)}`}>
                    {formatScore(player.score)}
                  </span>
                )}
              </div>
            </div>

            {/* Selected round scorecard */}
            {expandedRound && (
              <div className="px-4 pb-3">
                {loadingScorecard && !holeScores[player.id] && (
                  <div className="flex items-center gap-2 py-2 text-xs text-text-muted">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500" />
                    Loading scorecard...
                  </div>
                )}
                {(() => {
                  const roundScore = player.rounds?.[`r${expandedRound}`]
                  const isCurrent = expandedRound === player.currentRound
                  const isInProgress = isCurrent && !roundScore
                  const holeData = holeScores[player.id]?.[expandedRound]

                  // Course par layout — use real data when available, default par-71
                  const defaultPars = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]
                  const holes = (holeData && holeData.length > 0) ? holeData : defaultPars.map((par, i) => ({ hole: i + 1, par, score: null }))
                  const front9 = holes.slice(0, 9)
                  const back9 = holes.slice(9, 18)
                  const front9Par = front9.reduce((s, h) => s + (h.par || defaultPars[h.hole - 1]), 0)
                  const back9Par = back9.reduce((s, h) => s + (h.par || defaultPars[h.hole - 1 + 9]), 0)
                  const hasScores = holeData && holeData.length > 0 && holeData.some(h => h.score != null)
                  const front9Score = hasScores ? front9.filter(h => h.score != null).reduce((s, h) => s + h.score, 0) : null
                  const back9Score = hasScores ? back9.filter(h => h.score != null).reduce((s, h) => s + h.score, 0) : null

                  return (
                    <>
                      {/* Round label + status */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">Round {expandedRound}</span>
                          {isInProgress && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                              {player.thru > 0 ? `Thru ${player.thru}` : 'Not started'}
                            </span>
                          )}
                          {roundScore && !isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80 font-medium">
                              Complete
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isInProgress && player.thru > 0 && (
                            <span className={`text-sm font-bold ${getScoreColor(player.today)}`}>{formatScore(player.today)}</span>
                          )}
                          {roundScore && (
                            <span className={`text-sm font-bold ${roundScore < front9Par + back9Par ? 'text-emerald-400' : roundScore > front9Par + back9Par ? 'text-red-400' : 'text-white'}`}>
                              {roundScore} ({roundScore - (front9Par + back9Par) > 0 ? '+' : ''}{roundScore - (front9Par + back9Par)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Front 9 scorecard */}
                      <div className="overflow-x-auto">
                        <table className="w-full mb-1.5 text-xs border-collapse">
                          <thead>
                            <tr>
                              <th className="p-1.5 text-left bg-dark-secondary/70 text-text-muted text-[10px] font-medium w-12 rounded-tl">Hole</th>
                              {front9.map((h, i) => (
                                <th key={i} className="p-1.5 text-center bg-dark-secondary/70 text-text-muted text-[10px] font-medium min-w-[28px]">{i + 1}</th>
                              ))}
                              <th className="p-1.5 text-center bg-dark-secondary/70 text-text-muted text-[10px] font-bold min-w-[32px] rounded-tr">Out</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-1.5 text-left bg-dark-secondary/30 text-text-muted text-[10px]">Par</td>
                              {front9.map((h, i) => (
                                <td key={i} className="p-1.5 text-center bg-dark-secondary/30 text-text-muted text-[10px]">{h.par || defaultPars[i]}</td>
                              ))}
                              <td className="p-1.5 text-center bg-dark-secondary/30 text-text-muted text-[10px] font-bold">{front9Par}</td>
                            </tr>
                            <tr className="border-t-2 border-emerald-500/30">
                              <td className="p-1.5 text-left bg-dark-secondary/60 text-emerald-400 text-[10px] font-bold">Score</td>
                              {front9.map((h, i) => (
                                <td key={i} className="p-0.5 text-center bg-dark-secondary/60">
                                  <ScoreCell score={h.score} par={h.par || defaultPars[i]} />
                                </td>
                              ))}
                              <td className="p-1.5 text-center bg-dark-secondary/60 font-bold text-white text-[11px]">
                                {front9Score != null ? front9Score : '–'}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Back 9 scorecard */}
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr>
                              <th className="p-1.5 text-left bg-dark-secondary/70 text-text-muted text-[10px] font-medium w-12 rounded-tl">Hole</th>
                              {back9.map((h, i) => (
                                <th key={i} className="p-1.5 text-center bg-dark-secondary/70 text-text-muted text-[10px] font-medium min-w-[28px]">{i + 10}</th>
                              ))}
                              <th className="p-1.5 text-center bg-dark-secondary/70 text-text-muted text-[10px] font-bold min-w-[32px]">In</th>
                              <th className="p-1.5 text-center bg-dark-secondary/70 text-text-muted text-[10px] font-bold min-w-[32px] rounded-tr">Tot</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-1.5 text-left bg-dark-secondary/30 text-text-muted text-[10px]">Par</td>
                              {back9.map((h, i) => (
                                <td key={i} className="p-1.5 text-center bg-dark-secondary/30 text-text-muted text-[10px]">{h.par || defaultPars[i + 9]}</td>
                              ))}
                              <td className="p-1.5 text-center bg-dark-secondary/30 text-text-muted text-[10px] font-bold">{back9Par}</td>
                              <td className="p-1.5 text-center bg-dark-secondary/30 text-text-muted text-[10px] font-bold">{front9Par + back9Par}</td>
                            </tr>
                            <tr className="border-t-2 border-emerald-500/30">
                              <td className="p-1.5 text-left bg-dark-secondary/60 text-emerald-400 text-[10px] font-bold">Score</td>
                              {back9.map((h, i) => (
                                <td key={i} className="p-0.5 text-center bg-dark-secondary/60">
                                  <ScoreCell score={h.score} par={h.par || defaultPars[i + 9]} />
                                </td>
                              ))}
                              <td className="p-1.5 text-center bg-dark-secondary/60 font-bold text-white text-[11px]">
                                {back9Score != null ? back9Score : '–'}
                              </td>
                              <td className="p-1.5 text-center bg-dark-secondary/60 font-bold text-white text-[11px]">
                                {roundScore || (front9Score != null && back9Score != null ? front9Score + back9Score : '–')}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Legend */}
                      {hasScores && (
                        <div className="flex items-center gap-3 mt-2 text-[9px] text-text-muted">
                          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full border-[1.5px] border-yellow-400" /> Eagle</div>
                          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full border-[1.5px] border-emerald-400" /> Birdie</div>
                          <div className="flex items-center gap-1"><span className="text-text-secondary text-[10px]">—</span> Par</div>
                          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-sm border-[1.5px] border-red-400" /> Bogey</div>
                          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-sm border-[1.5px] border-red-500" /> Dbl+</div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Stats row: probabilities */}
            {player.probabilities && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {player.probabilities.win != null && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
                    Win {(player.probabilities.win * 100).toFixed(1)}%
                  </span>
                )}
                {player.probabilities.top5 != null && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                    Top 5 {(player.probabilities.top5 * 100).toFixed(1)}%
                  </span>
                )}
                {player.probabilities.top10 != null && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                    Top 10 {(player.probabilities.top10 * 100).toFixed(1)}%
                  </span>
                )}
                {player.probabilities.makeCut != null && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-dark-secondary/80 text-text-secondary font-medium">
                    Cut {(player.probabilities.makeCut * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-dark-tertiary to-dark-secondary border-b border-dark-border">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-white tracking-tight">Leaderboard</h3>
          {cut != null && (
            <span className="text-xs text-red-400/80 bg-red-500/10 px-2 py-0.5 rounded-full font-medium">
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
              className="w-32 sm:w-40 pl-7 pr-2 py-1 text-xs rounded-full bg-dark-tertiary border border-dark-border text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
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
              showRounds ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-tertiary text-text-muted hover:text-white'
            }`}
          >
            Rounds
          </button>
          <span className="text-xs text-text-muted">{filtered.length}{search ? `/${leaderboard.length}` : ''} players</span>
        </div>
      </div>

      {/* Column headers */}
      <div className={`
        grid items-center gap-2 px-3 py-2 bg-dark-tertiary/80 text-[11px] text-text-muted uppercase tracking-wider font-medium
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
        <div className="text-center">Tee</div>
      </div>

      {/* Active players */}
      <div className="max-h-[600px] overflow-y-auto">
        {activePlayers.map((player, i) => renderPlayer(player, i))}

        {/* Cut line */}
        {cutPlayers.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-red-500/5 border-y border-red-500/20">
            <div className="flex-1 h-px bg-red-500/30" />
            <span className="text-xs font-bold text-red-400/80 uppercase tracking-widest">Projected Cut</span>
            <div className="flex-1 h-px bg-red-500/30" />
          </div>
        )}

        {/* Cut players */}
        {cutPlayers.map((player, i) => renderPlayer(player, i, true))}
      </div>
    </div>
  )
}

export default TournamentLeaderboard
