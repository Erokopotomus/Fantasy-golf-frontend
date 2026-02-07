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
        <span className="absolute inset-0 rounded-full border-2 border-yellow-400" />
        <span className="absolute inset-[3px] rounded-full border-2 border-yellow-400" />
        <span className="text-yellow-400 font-bold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Birdie — single circle
  if (diff === -1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 relative">
        <span className="absolute inset-0 rounded-full border-2 border-emerald-400" />
        <span className="text-emerald-400 font-semibold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Par — plain number, no decoration
  if (diff === 0) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 text-white text-[11px]">
        {numText}
      </span>
    )
  }

  // Bogey — single square
  if (diff === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 relative">
        <span className="absolute inset-0 rounded-sm border-2 border-red-400" />
        <span className="text-red-400 font-semibold text-[11px]">{numText}</span>
      </span>
    )
  }

  // Double bogey or worse — double square
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 relative">
      <span className="absolute inset-0 rounded-sm border-2 border-red-500" />
      <span className="absolute inset-[3px] rounded-sm border-2 border-red-500" />
      <span className="text-red-500 font-bold text-[11px]">{numText}</span>
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

  return (
    <Card className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Player Header */}
      <div className="flex items-center gap-3 mb-4">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-dark-tertiary" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-dark-tertiary flex items-center justify-center text-2xl">
            {player.countryFlag}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-bold font-display text-white">{player.name}</h3>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>
              Pos: <span className="text-white font-semibold">{player.position}</span>
            </span>
            <span>
              Total: <span className={`font-semibold ${parseInt(player.score) < 0 ? 'text-emerald-400' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-white'}`}>
                {formatScore(player.score)}
              </span>
            </span>
            <span>
              Today: <span className={`font-semibold ${parseInt(player.today) < 0 ? 'text-emerald-400' : parseInt(player.today) > 0 ? 'text-red-400' : 'text-white'}`}>
                {formatScore(player.today)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Fantasy Points Breakdown */}
      {(player.fantasyPoints != null || breakdown) && (
        <div className="mb-4 p-3 rounded-lg bg-dark-tertiary/60 border border-dark-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Fantasy Points</span>
            <span className="text-lg font-bold font-display text-emerald-400">{player.fantasyPoints || 0}</span>
          </div>
          {breakdown && (
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {breakdown.position != null && (
                <div className="flex justify-between px-2 py-1 rounded bg-dark-secondary/60">
                  <span className="text-text-muted">Position</span>
                  <span className="text-emerald-400 font-medium">+{breakdown.position}</span>
                </div>
              )}
              {breakdown.holeScoring != null && (
                <div className="flex justify-between px-2 py-1 rounded bg-dark-secondary/60">
                  <span className="text-text-muted">Hole Scoring</span>
                  <span className={`font-medium ${breakdown.holeScoring >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {breakdown.holeScoring >= 0 ? '+' : ''}{breakdown.holeScoring}
                  </span>
                </div>
              )}
              {breakdown.bonuses != null && breakdown.bonuses > 0 && (
                <div className="flex justify-between px-2 py-1 rounded bg-dark-secondary/60">
                  <span className="text-text-muted">Bonuses</span>
                  <span className="text-yellow-400 font-medium">+{breakdown.bonuses}</span>
                </div>
              )}
              {breakdown.strokesGained != null && breakdown.strokesGained > 0 && (
                <div className="flex justify-between px-2 py-1 rounded bg-dark-secondary/60">
                  <span className="text-text-muted">Strokes Gained</span>
                  <span className="text-blue-400 font-medium">+{breakdown.strokesGained}</span>
                </div>
              )}
            </div>
          )}
          {/* Stat line */}
          <div className="flex gap-3 mt-2 text-[11px] text-text-muted">
            {player.eagles > 0 && <span><span className="text-yellow-400">{player.eagles}</span> Eagles</span>}
            {player.birdies > 0 && <span><span className="text-emerald-400">{player.birdies}</span> Birdies</span>}
            {player.bogeys > 0 && <span><span className="text-red-400">{player.bogeys}</span> Bogeys</span>}
          </div>
        </div>
      )}

      {/* Scorecard */}
      <div className="overflow-x-auto">
        {/* Front 9 */}
        <table className="w-full mb-3 text-xs">
          <thead>
            <tr className="text-text-muted">
              <th className="p-1.5 text-left bg-dark-tertiary rounded-tl text-[10px] uppercase tracking-wide">Hole</th>
              {front9.map(h => (
                <th key={h.hole} className="p-1.5 text-center bg-dark-tertiary w-8 text-[10px]">{h.hole}</th>
              ))}
              <th className="p-1.5 text-center bg-dark-tertiary rounded-tr font-bold text-[10px]">Out</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-text-secondary">
              <td className="p-1.5 text-left bg-dark-secondary text-[10px]">Par</td>
              {front9.map(h => (
                <td key={h.hole} className="p-1.5 text-center bg-dark-secondary text-[10px]">{h.par}</td>
              ))}
              <td className="p-1.5 text-center bg-dark-secondary font-bold text-[10px]">{front9Par}</td>
            </tr>
            <tr>
              <td className="p-1.5 text-left bg-dark-tertiary/50 text-white font-medium text-[10px]">Score</td>
              {front9.map(h => (
                <td key={h.hole} className="p-0.5 text-center bg-dark-tertiary/30">
                  <ScoreCell score={h.score} par={h.par} />
                </td>
              ))}
              <td className="p-1.5 text-center bg-dark-tertiary/50 font-bold text-white text-[11px]">
                {front9.some(h => h.score !== null) ? front9Score : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Back 9 */}
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted">
              <th className="p-1.5 text-left bg-dark-tertiary rounded-tl text-[10px] uppercase tracking-wide">Hole</th>
              {back9.map(h => (
                <th key={h.hole} className="p-1.5 text-center bg-dark-tertiary w-8 text-[10px]">{h.hole}</th>
              ))}
              <th className="p-1.5 text-center bg-dark-tertiary font-bold text-[10px]">In</th>
              <th className="p-1.5 text-center bg-dark-tertiary rounded-tr font-bold text-[10px]">Tot</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-text-secondary">
              <td className="p-1.5 text-left bg-dark-secondary text-[10px]">Par</td>
              {back9.map(h => (
                <td key={h.hole} className="p-1.5 text-center bg-dark-secondary text-[10px]">{h.par}</td>
              ))}
              <td className="p-1.5 text-center bg-dark-secondary font-bold text-[10px]">{back9Par}</td>
              <td className="p-1.5 text-center bg-dark-secondary font-bold text-[10px]">{front9Par + back9Par}</td>
            </tr>
            <tr>
              <td className="p-1.5 text-left bg-dark-tertiary/50 text-white font-medium text-[10px]">Score</td>
              {back9.map(h => (
                <td key={h.hole} className="p-0.5 text-center bg-dark-tertiary/30">
                  <ScoreCell score={h.score} par={h.par} />
                </td>
              ))}
              <td className="p-1.5 text-center bg-dark-tertiary/50 font-bold text-white text-[11px]">
                {back9.some(h => h.score !== null) ? back9Score : '-'}
              </td>
              <td className="p-1.5 text-center bg-dark-tertiary/50 font-bold text-white text-[11px]">
                {(front9.some(h => h.score !== null) || back9.some(h => h.score !== null))
                  ? front9Score + back9Score
                  : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend — matches traditional scorecard notation */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-dark-border text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 relative">
            <span className="absolute inset-0 rounded-full border-[1.5px] border-yellow-400" />
            <span className="absolute inset-[2px] rounded-full border-[1.5px] border-yellow-400" />
          </span>
          <span className="text-text-secondary">Eagle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 relative">
            <span className="absolute inset-0 rounded-full border-[1.5px] border-emerald-400" />
          </span>
          <span className="text-text-secondary">Birdie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 text-text-muted text-[9px]">—</span>
          <span className="text-text-secondary">Par</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 relative">
            <span className="absolute inset-0 rounded-sm border-[1.5px] border-red-400" />
          </span>
          <span className="text-text-secondary">Bogey</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 relative">
            <span className="absolute inset-0 rounded-sm border-[1.5px] border-red-500" />
            <span className="absolute inset-[2px] rounded-sm border-[1.5px] border-red-500" />
          </span>
          <span className="text-text-secondary">Double+</span>
        </div>
      </div>
    </Card>
  )
}

export default PlayerScoreCard
