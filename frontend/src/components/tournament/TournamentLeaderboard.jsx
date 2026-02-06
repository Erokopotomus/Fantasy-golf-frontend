import { useState } from 'react'

const TournamentLeaderboard = ({ leaderboard, cut, onSelectPlayer, myPlayerIds = [], recentChanges = {} }) => {
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [showRounds, setShowRounds] = useState(false)

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

  // Group into active and cut
  const activePlayers = leaderboard.filter(p => p.status !== 'CUT')
  const cutPlayers = leaderboard.filter(p => p.status === 'CUT')

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
            onSelectPlayer?.(player)
            setExpandedPlayer(isExpanded ? null : player.id)
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
          <div className={`text-center text-sm font-semibold ${getScoreColor(player.today)}`}>
            {player.thru === 'F' || player.thru === 18 ? '–' : formatScore(player.today)}
          </div>

          {/* Thru */}
          {!showRounds && (
            <div className="text-center text-xs text-text-muted">
              {player.thru === 'F' || player.thru === 18 ? (
                <span className="text-text-secondary font-medium">F</span>
              ) : player.thru || '–'}
            </div>
          )}

          {/* Total */}
          <div className={`text-center text-sm font-bold ${getScoreColor(player.score)}`}>
            {formatScore(player.score)}
          </div>

          {/* Fantasy Points */}
          <div className="text-right">
            <span className={`
              text-sm font-bold px-2 py-0.5 rounded
              ${player.fantasyPoints > 50 ? 'text-emerald-400 bg-emerald-500/10' :
                player.fantasyPoints > 20 ? 'text-emerald-300' :
                player.fantasyPoints > 0 ? 'text-text-secondary' :
                'text-red-400'}
            `}>
              {player.fantasyPoints != null ? player.fantasyPoints : '–'}
            </span>
          </div>
        </div>

        {/* Expanded breakdown */}
        {isExpanded && player.breakdown && (
          <div className="px-4 py-3 bg-dark-tertiary/50 border-t border-dark-border/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {player.breakdown.position != null && (
                <div className="flex justify-between bg-dark-secondary/50 rounded px-2 py-1.5">
                  <span className="text-text-muted">Position</span>
                  <span className={player.breakdown.position > 0 ? 'text-emerald-400 font-semibold' : 'text-text-secondary'}>
                    +{player.breakdown.position}
                  </span>
                </div>
              )}
              {player.breakdown.holeScoring != null && (
                <div className="flex justify-between bg-dark-secondary/50 rounded px-2 py-1.5">
                  <span className="text-text-muted">Holes</span>
                  <span className={`font-semibold ${player.breakdown.holeScoring >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {player.breakdown.holeScoring >= 0 ? '+' : ''}{player.breakdown.holeScoring}
                  </span>
                </div>
              )}
              {player.breakdown.bonuses != null && player.breakdown.bonuses > 0 && (
                <div className="flex justify-between bg-dark-secondary/50 rounded px-2 py-1.5">
                  <span className="text-text-muted">Bonuses</span>
                  <span className="text-yellow-400 font-semibold">+{player.breakdown.bonuses}</span>
                </div>
              )}
              {player.breakdown.strokesGained != null && player.breakdown.strokesGained > 0 && (
                <div className="flex justify-between bg-dark-secondary/50 rounded px-2 py-1.5">
                  <span className="text-text-muted">SG</span>
                  <span className="text-blue-400 font-semibold">+{player.breakdown.strokesGained}</span>
                </div>
              )}
            </div>
            {/* Round scores in expanded view */}
            {player.rounds && (
              <div className="flex gap-4 mt-2 text-xs">
                {['R1', 'R2', 'R3', 'R4'].map((label, i) => {
                  const val = player.rounds[`r${i + 1}`]
                  return val != null ? (
                    <span key={label} className="text-text-muted">
                      {label}: <span className="text-white font-medium">{val}</span>
                    </span>
                  ) : null
                })}
                {player.totalScore && (
                  <span className="text-text-muted">
                    Total: <span className="text-white font-medium">{player.totalScore}</span>
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
          <button
            onClick={() => setShowRounds(!showRounds)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              showRounds ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-tertiary text-text-muted hover:text-white'
            }`}
          >
            {showRounds ? 'Rounds' : 'Rounds'}
          </button>
          <span className="text-xs text-text-muted">{leaderboard.length} players</span>
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
        <div className="text-right">FPts</div>
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
