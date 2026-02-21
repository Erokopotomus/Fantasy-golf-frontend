import Card from '../common/Card'

const PlayerFormChart = ({ recentForm, tournamentHistory }) => {
  // Convert form positions to chart data
  const getPositionValue = (pos) => {
    if (!pos) return 0
    if (typeof pos === 'number') return pos
    if (pos === 'CUT' || pos === 'WD' || pos === 'DQ') return 50
    const num = parseInt(String(pos).replace('T', '').replace(/[a-z]/gi, ''))
    return isNaN(num) ? 50 : num
  }

  const getPositionColor = (pos) => {
    const num = getPositionValue(pos)
    if (num === 1) return 'bg-yellow-400'
    if (num <= 3) return 'bg-gold'
    if (num <= 10) return 'bg-green-500'
    if (num <= 25) return 'bg-blue-400'
    return 'bg-dark-border'
  }

  const hasFormData = (recentForm || []).filter(p => p !== 'CUT' && p !== 'WD' && p !== 'DQ').length >= 2
  const hasTournaments = tournamentHistory && tournamentHistory.length > 1

  if (!hasFormData && !hasTournaments) return null

  const maxPosition = Math.max(...(recentForm || []).map(getPositionValue), 30)

  return (
    <Card>
      <h4 className="text-sm font-semibold text-text-muted mb-4">Recent Form</h4>

      {/* Form Chart */}
      <div className="flex items-end justify-between gap-2 h-32 mb-4">
        {(recentForm || []).slice(0, 8).map((pos, index) => {
          const value = getPositionValue(pos)
          const height = Math.max(20, 100 - (value / maxPosition) * 80)

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t ${getPositionColor(pos)} transition-all`}
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-text-primary font-medium mt-1">{pos}</span>
            </div>
          )
        })}
      </div>

      {/* Recent Tournaments */}
      {tournamentHistory && tournamentHistory.length > 0 && (
        <div className="border-t border-dark-border pt-4">
          <h5 className="text-xs font-semibold text-text-muted mb-2">Last 5 Tournaments</h5>
          <div className="space-y-2">
            {tournamentHistory.slice(0, 5).map((t, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary truncate flex-1 mr-2">{t.name}</span>
                <span className={`font-medium ${getPositionValue(t.position) <= 10 ? 'text-gold' : 'text-text-primary'}`}>
                  {t.position}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default PlayerFormChart
