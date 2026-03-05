import Card from '../common/Card'

/**
 * Traditional golf scorecard notation:
 *   Eagle or better → double circle (two concentric rings)
 *   Birdie          → single circle
 *   Par             → plain number (no decoration)
 *   Bogey           → single square
 *   Double bogey+   → double square (two concentric boxes)
 */
const ScoreCell = ({ score, par }) => {
  if (score === null || score === undefined) {
    return <span className="text-text-muted">-</span>
  }

  const diff = score - par
  const numText = <span className="relative z-10">{score}</span>

  // Eagle or better — double circle
  if (diff <= -2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 relative">
        <span className="absolute inset-0 rounded-full border-2 border-crown" />
        <span className="absolute inset-[3px] rounded-full border-2 border-crown" />
        <span className="text-crown font-bold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Birdie — single circle
  if (diff === -1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 relative">
        <span className="absolute inset-0 rounded-full border-2 border-field" />
        <span className="text-field font-semibold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Par — plain number, no decoration
  if (diff === 0) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 text-text-primary text-[11px]">
        {numText}
      </span>
    )
  }

  // Bogey — single square
  if (diff === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 relative">
        <span className="absolute inset-0 rounded-sm border-2 border-live-red" />
        <span className="text-live-red font-semibold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Double bogey or worse — double square
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-sm border-2 border-live-red" />
      <span className="absolute inset-[3px] rounded-sm border-2 border-live-red" />
      <span className="text-live-red font-bold text-[11px]">{numText}</span>
    </span>
  )
}

const PlayerScoreCard = ({ player, onClose }) => {
  if (!player) return null

  const formatScore = (score) => {
    if (score == null) return '–'
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return `${score}`
  }

  // Generate mock hole data if not provided
  const holes = player.holes || Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    par: [3, 4, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4][i],
    score: player.thru === 'F' || (typeof player.thru === 'number' && i < player.thru)
      ? [3, 4, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4][i] + Math.floor(Math.random() * 3) - 1
      : null
  }))

  const front9 = holes.slice(0, 9)
  const back9 = holes.slice(9, 18)
  const front9Par = front9.reduce((sum, h) => sum + h.par, 0)
  const back9Par = back9.reduce((sum, h) => sum + h.par, 0)
  const front9Score = front9.filter(h => h.score !== null).reduce((sum, h) => sum + h.score, 0)
  const back9Score = back9.filter(h => h.score !== null).reduce((sum, h) => sum + h.score, 0)

  const breakdown = player.breakdown

  const isUnderPar = parseInt(player.score) < 0

  // Helper: color-code a summary total vs par
  const summaryScoreClass = (score, par) => {
    if (score < par) return 'text-field font-bold'
    if (score > par) return 'text-live-red font-bold'
    return 'text-text-primary font-bold'
  }

  return (
    <Card className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Player Header — green left-border accent if under par */}
      <div className={`flex items-center gap-3 mb-4 ${isUnderPar ? 'pl-3 border-l-[3px] border-field' : ''}`}>
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-[var(--stone)]" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--stone)] flex items-center justify-center text-2xl">
            {player.countryFlag}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-display text-text-primary">{player.name}</h3>
            {player.countryFlag && player.headshotUrl && (
              <span className="text-base" title="Country">{player.countryFlag}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>
              Pos: <span className="text-text-primary text-base font-bold">{player.position}</span>
            </span>
            <span>
              Total: <span className={`font-semibold ${parseInt(player.score) < 0 ? 'text-field' : parseInt(player.score) > 0 ? 'text-live-red' : 'text-text-primary'}`}>
                {formatScore(player.score)}
              </span>
            </span>
            <span>
              Today: <span className={`font-semibold ${parseInt(player.today) < 0 ? 'text-field' : parseInt(player.today) > 0 ? 'text-live-red' : 'text-text-primary'}`}>
                {formatScore(player.today)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Fantasy Points Breakdown */}
      {(player.fantasyPoints != null || breakdown) && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--bg-alt)] border border-[var(--card-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Fantasy Points</span>
            <span className="text-2xl font-bold font-display text-crown">{player.fantasyPoints || 0}</span>
          </div>
          {breakdown && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {breakdown.position != null && (
                <div className="flex justify-between px-3 py-1.5 rounded bg-[var(--surface)]">
                  <span className="text-text-muted">Position</span>
                  <span className="text-field font-medium">+{breakdown.position}</span>
                </div>
              )}
              {breakdown.holeScoring != null && (
                <div className="flex justify-between px-3 py-1.5 rounded bg-[var(--surface)]">
                  <span className="text-text-muted">Hole Scoring</span>
                  <span className={`font-medium ${breakdown.holeScoring >= 0 ? 'text-field' : 'text-live-red'}`}>
                    {breakdown.holeScoring >= 0 ? '+' : ''}{breakdown.holeScoring}
                  </span>
                </div>
              )}
              {breakdown.bonuses != null && breakdown.bonuses > 0 && (
                <div className="flex justify-between px-3 py-1.5 rounded bg-[var(--surface)]">
                  <span className="text-text-muted">Bonuses</span>
                  <span className="text-crown font-medium">+{breakdown.bonuses}</span>
                </div>
              )}
              {breakdown.strokesGained != null && breakdown.strokesGained > 0 && (
                <div className="flex justify-between px-3 py-1.5 rounded bg-[var(--surface)]">
                  <span className="text-text-muted">Strokes Gained</span>
                  <span className="text-blue-400 font-medium">+{breakdown.strokesGained}</span>
                </div>
              )}
            </div>
          )}
          {/* Stat line */}
          <div className="flex gap-3 mt-2 text-[11px] text-text-muted">
            {player.eagles > 0 && <span><span className="text-crown">{player.eagles}</span> Eagles</span>}
            {player.birdies > 0 && <span><span className="text-field">{player.birdies}</span> Birdies</span>}
            {player.bogeys > 0 && <span><span className="text-live-red">{player.bogeys}</span> Bogeys</span>}
          </div>
        </div>
      )}

      {/* Scorecard */}
      <div className="overflow-x-auto">
        {/* Front 9 Section Label */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1 h-3 bg-field rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Front 9</span>
        </div>

        {/* Front 9 */}
        <div className="rounded-lg overflow-hidden mb-4 border border-[var(--card-border)]/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white/70">
                <th className="p-1.5 text-left text-white/60 font-mono text-[11px]">Hole</th>
                {front9.map(h => (
                  <th key={h.hole} className="p-1.5 text-center w-8 text-white/60 font-mono text-[11px]">{h.hole}</th>
                ))}
                <th className="p-1.5 text-center text-white font-bold text-[11px]">Out</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100 dark:bg-slate-800/50 divide-x divide-[var(--card-border)]/30">
                <td className="p-1.5 text-left text-text-muted text-[10px] font-medium">Par</td>
                {front9.map(h => (
                  <td key={h.hole} className="p-1.5 text-center text-text-secondary font-mono text-[11px]">{h.par}</td>
                ))}
                <td className="p-1.5 text-center text-text-secondary font-mono text-[11px] font-bold">{front9Par}</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900/30 divide-x divide-[var(--card-border)]/30">
                <td className="p-1.5 text-left text-text-primary font-bold text-[10px]">Score</td>
                {front9.map(h => (
                  <td key={h.hole} className="p-0.5 text-center">
                    {h.score !== null && h.score !== undefined
                      ? <ScoreCell score={h.score} par={h.par} />
                      : <span className="text-text-muted/30">&middot;</span>
                    }
                  </td>
                ))}
                <td className={`p-1.5 text-center text-[11px] ${front9.some(h => h.score !== null) ? summaryScoreClass(front9Score, front9Par) : 'text-text-muted/30'}`}>
                  {front9.some(h => h.score !== null) ? front9Score : <span>&middot;</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Back 9 Section Label */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1 h-3 bg-field rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Back 9</span>
        </div>

        {/* Back 9 */}
        <div className="rounded-lg overflow-hidden border border-[var(--card-border)]/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white/70">
                <th className="p-1.5 text-left text-white/60 font-mono text-[11px]">Hole</th>
                {back9.map(h => (
                  <th key={h.hole} className="p-1.5 text-center w-8 text-white/60 font-mono text-[11px]">{h.hole}</th>
                ))}
                <th className="p-1.5 text-center text-white font-bold text-[11px]">In</th>
                <th className="p-1.5 text-center text-white font-bold text-[11px]">Tot</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100 dark:bg-slate-800/50 divide-x divide-[var(--card-border)]/30">
                <td className="p-1.5 text-left text-text-muted text-[10px] font-medium">Par</td>
                {back9.map(h => (
                  <td key={h.hole} className="p-1.5 text-center text-text-secondary font-mono text-[11px]">{h.par}</td>
                ))}
                <td className="p-1.5 text-center text-text-secondary font-mono text-[11px] font-bold">{back9Par}</td>
                <td className="p-1.5 text-center text-text-secondary font-mono text-[11px] font-bold">{front9Par + back9Par}</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900/30 divide-x divide-[var(--card-border)]/30">
                <td className="p-1.5 text-left text-text-primary font-bold text-[10px]">Score</td>
                {back9.map(h => (
                  <td key={h.hole} className="p-0.5 text-center">
                    {h.score !== null && h.score !== undefined
                      ? <ScoreCell score={h.score} par={h.par} />
                      : <span className="text-text-muted/30">&middot;</span>
                    }
                  </td>
                ))}
                <td className={`p-1.5 text-center text-[11px] ${back9.some(h => h.score !== null) ? summaryScoreClass(back9Score, back9Par) : 'text-text-muted/30'}`}>
                  {back9.some(h => h.score !== null) ? back9Score : <span>&middot;</span>}
                </td>
                <td className={`p-1.5 text-center text-[11px] ${(front9.some(h => h.score !== null) || back9.some(h => h.score !== null)) ? summaryScoreClass(front9Score + back9Score, front9Par + back9Par) : 'text-text-muted/30'}`}>
                  {(front9.some(h => h.score !== null) || back9.some(h => h.score !== null))
                    ? front9Score + back9Score
                    : <span>&middot;</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend — compact, matches traditional scorecard notation */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[var(--card-border)] text-[10px]">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 relative">
            <span className="absolute inset-0 rounded-full border-[1.5px] border-crown" />
            <span className="absolute inset-[2px] rounded-full border-[1.5px] border-crown" />
          </span>
          <span className="text-text-muted">Eagle</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 relative">
            <span className="absolute inset-0 rounded-full border-[1.5px] border-field" />
          </span>
          <span className="text-text-muted">Birdie</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 text-text-muted/40 text-[9px]">--</span>
          <span className="text-text-muted">Par</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 relative">
            <span className="absolute inset-0 rounded-sm border-[1.5px] border-live-red" />
          </span>
          <span className="text-text-muted">Bogey</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 relative">
            <span className="absolute inset-0 rounded-sm border-[1.5px] border-live-red" />
            <span className="absolute inset-[2px] rounded-sm border-[1.5px] border-live-red" />
          </span>
          <span className="text-text-muted">Dbl+</span>
        </div>
      </div>
    </Card>
  )
}

export default PlayerScoreCard
