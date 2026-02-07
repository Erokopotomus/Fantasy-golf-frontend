const TournamentHeader = ({ tournament, leaderboard = [] }) => {
  if (!tournament) return null

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPurse = (purse) => {
    if (!purse) return null
    const num = typeof purse === 'string' ? parseInt(purse.replace(/[^0-9]/g, '')) : purse
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num}`
  }

  const isLive = tournament.status === 'IN_PROGRESS' || tournament.status === 'live'
  const isCompleted = tournament.status === 'COMPLETED' || tournament.status === 'completed'
  const isUpcoming = tournament.status === 'UPCOMING' || tournament.status === 'upcoming'

  // Derive quick stats from leaderboard
  const activePlayers = leaderboard.filter(p => p.status !== 'CUT')
  const cutPlayers = leaderboard.filter(p => p.status === 'CUT')
  const leader = leaderboard[0]

  return (
    <div className="relative overflow-hidden rounded-xl border border-dark-border bg-dark-secondary">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 via-dark-secondary to-dark-secondary" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-secondary via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Top row: Status + Tour */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                Final
              </span>
            )}
            {isUpcoming && (
              <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
                Upcoming
              </span>
            )}
            {tournament.tour && (
              <span className="px-2 py-0.5 rounded bg-dark-tertiary text-text-muted text-xs font-medium">
                {tournament.tour}
              </span>
            )}
          </div>

          {/* Round indicators */}
          {!isUpcoming && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map(r => {
                const isCurrent = tournament.currentRound === r && isLive
                const isPast = isCompleted || (tournament.currentRound && r < tournament.currentRound)
                return (
                  <div
                    key={r}
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${isCurrent ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50' : ''}
                      ${isPast ? 'bg-dark-tertiary text-emerald-400' : ''}
                      ${!isCurrent && !isPast ? 'bg-dark-tertiary/50 text-text-muted' : ''}
                    `}
                  >
                    R{r}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tournament name + course */}
        <h1 className="text-2xl font-bold font-display text-white mb-1 tracking-tight">{tournament.name}</h1>
        {(tournament.course || tournament.location) && (
          <p className="text-text-secondary text-sm mb-4">{tournament.course || tournament.location}</p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wide">Dates</span>
            <p className="text-white font-medium">
              {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
            </p>
          </div>

          {tournament.purse && (
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wide">Purse</span>
              <p className="text-white font-medium">{formatPurse(tournament.purse)}</p>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wide">Field</span>
              <p className="text-white font-medium">
                {leaderboard.length} players{cutPlayers.length > 0 ? ` (${cutPlayers.length} cut)` : ''}
              </p>
            </div>
          )}

          {leader && (isCompleted || isLive) && (
            <div className="ml-auto text-right">
              <span className="text-text-muted text-xs uppercase tracking-wide">
                {isCompleted ? 'Winner' : 'Leader'}
              </span>
              <p className="text-white font-medium flex items-center gap-1.5 justify-end">
                {isCompleted && <span className="text-yellow-400">&#127942;</span>}
                <span className="text-lg">{leader.countryFlag}</span>
                {leader.name}
                <span className={`ml-1 font-bold ${leader.score < 0 ? 'text-emerald-400' : leader.score > 0 ? 'text-red-400' : 'text-white'}`}>
                  {leader.score > 0 ? `+${leader.score}` : leader.score === 0 ? 'E' : leader.score}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TournamentHeader
