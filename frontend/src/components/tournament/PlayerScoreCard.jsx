import Card from '../common/Card'

const PlayerScoreCard = ({ player, onClose }) => {
  if (!player) return null

  const getScoreStyle = (score, par) => {
    if (score === null || score === undefined) return 'bg-dark-tertiary text-text-muted'
    const diff = score - par
    if (diff <= -2) return 'bg-yellow-500 text-black font-bold' // Eagle or better
    if (diff === -1) return 'bg-red-500 text-white' // Birdie
    if (diff === 0) return 'bg-dark-tertiary text-white' // Par
    if (diff === 1) return 'bg-dark-secondary text-text-secondary' // Bogey
    return 'bg-dark-secondary text-red-400' // Double+
  }

  const getScoreLabel = (score, par) => {
    if (score === null || score === undefined) return '-'
    return score
  }

  const formatScore = (score) => {
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return score
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
      <div className="flex items-center gap-4 mb-6">
        <span className="text-3xl">{player.countryFlag}</span>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{player.name}</h3>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>Position: <span className="text-white font-semibold">{player.position}</span></span>
            <span>Total: <span className={`font-semibold ${parseInt(player.score) < 0 ? 'text-accent-green' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-white'}`}>
              {formatScore(player.score)}
            </span></span>
            <span>Today: <span className={`font-semibold ${parseInt(player.today) < 0 ? 'text-accent-green' : parseInt(player.today) > 0 ? 'text-red-400' : 'text-white'}`}>
              {formatScore(player.today)}
            </span></span>
          </div>
        </div>
      </div>

      {/* Scorecard */}
      <div className="overflow-x-auto">
        {/* Front 9 */}
        <table className="w-full mb-4 text-xs sm:text-sm">
          <thead>
            <tr className="text-text-muted">
              <th className="p-2 text-left bg-dark-tertiary">Hole</th>
              {front9.map(h => (
                <th key={h.hole} className="p-2 text-center bg-dark-tertiary w-8">{h.hole}</th>
              ))}
              <th className="p-2 text-center bg-dark-tertiary font-bold">Out</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-text-secondary">
              <td className="p-2 text-left bg-dark-secondary">Par</td>
              {front9.map(h => (
                <td key={h.hole} className="p-2 text-center bg-dark-secondary">{h.par}</td>
              ))}
              <td className="p-2 text-center bg-dark-secondary font-bold">{front9Par}</td>
            </tr>
            <tr>
              <td className="p-2 text-left bg-dark-tertiary text-white font-medium">Score</td>
              {front9.map(h => (
                <td key={h.hole} className="p-1 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${getScoreStyle(h.score, h.par)}`}>
                    {getScoreLabel(h.score, h.par)}
                  </span>
                </td>
              ))}
              <td className="p-2 text-center bg-dark-tertiary font-bold text-white">
                {front9.some(h => h.score !== null) ? front9Score : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Back 9 */}
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-text-muted">
              <th className="p-2 text-left bg-dark-tertiary">Hole</th>
              {back9.map(h => (
                <th key={h.hole} className="p-2 text-center bg-dark-tertiary w-8">{h.hole}</th>
              ))}
              <th className="p-2 text-center bg-dark-tertiary font-bold">In</th>
              <th className="p-2 text-center bg-dark-tertiary font-bold">Tot</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-text-secondary">
              <td className="p-2 text-left bg-dark-secondary">Par</td>
              {back9.map(h => (
                <td key={h.hole} className="p-2 text-center bg-dark-secondary">{h.par}</td>
              ))}
              <td className="p-2 text-center bg-dark-secondary font-bold">{back9Par}</td>
              <td className="p-2 text-center bg-dark-secondary font-bold">{front9Par + back9Par}</td>
            </tr>
            <tr>
              <td className="p-2 text-left bg-dark-tertiary text-white font-medium">Score</td>
              {back9.map(h => (
                <td key={h.hole} className="p-1 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${getScoreStyle(h.score, h.par)}`}>
                    {getScoreLabel(h.score, h.par)}
                  </span>
                </td>
              ))}
              <td className="p-2 text-center bg-dark-tertiary font-bold text-white">
                {back9.some(h => h.score !== null) ? back9Score : '-'}
              </td>
              <td className="p-2 text-center bg-dark-tertiary font-bold text-white">
                {(front9.some(h => h.score !== null) || back9.some(h => h.score !== null))
                  ? front9Score + back9Score
                  : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-dark-border text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-yellow-500"></span>
          <span className="text-text-secondary">Eagle</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red-500"></span>
          <span className="text-text-secondary">Birdie</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-dark-tertiary border border-dark-border"></span>
          <span className="text-text-secondary">Par</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-dark-secondary"></span>
          <span className="text-text-secondary">Bogey+</span>
        </div>
      </div>
    </Card>
  )
}

export default PlayerScoreCard
