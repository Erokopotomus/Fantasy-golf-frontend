import Card from '../common/Card'

const MatchupDetail = ({ matchup, homeTeam, awayTeam, homeRoster = [], awayRoster = [], currentUserId }) => {
  const isUserMatch = matchup?.home === currentUserId || matchup?.away === currentUserId
  const homeWon = matchup?.completed && matchup.homeScore > matchup.awayScore
  const awayWon = matchup?.completed && matchup.awayScore > matchup.homeScore

  if (!matchup) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          Select a matchup to view details
        </div>
      </Card>
    )
  }

  return (
    <Card className={isUserMatch ? 'ring-2 ring-gold/30' : ''}>
      {/* Header */}
      <div className="text-center mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${
          matchup.completed
            ? 'bg-gold/20 text-gold'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {matchup.completed ? 'Final' : 'In Progress'}
        </span>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-6">
          {/* Home Team */}
          <div className={`flex-1 text-right ${homeWon ? 'text-white' : 'text-text-secondary'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold ${
              matchup.home === currentUserId ? 'bg-gold/20 text-gold' : 'bg-dark-tertiary'
            }`}>
              {homeTeam?.avatar}
            </div>
            <p className={`font-semibold ${homeWon ? 'text-white' : ''}`}>
              {homeTeam?.name}
            </p>
            {matchup.home === currentUserId && (
              <p className="text-xs text-gold">You</p>
            )}
          </div>

          {/* Scores */}
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold ${homeWon ? 'text-gold' : 'text-white'}`}>
              {matchup.homeScore ?? '-'}
            </span>
            <span className="text-2xl text-text-muted">-</span>
            <span className={`text-4xl font-bold ${awayWon ? 'text-gold' : 'text-white'}`}>
              {matchup.awayScore ?? '-'}
            </span>
          </div>

          {/* Away Team */}
          <div className={`flex-1 text-left ${awayWon ? 'text-white' : 'text-text-secondary'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold ${
              matchup.away === currentUserId ? 'bg-gold/20 text-gold' : 'bg-dark-tertiary'
            }`}>
              {awayTeam?.avatar}
            </div>
            <p className={`font-semibold ${awayWon ? 'text-white' : ''}`}>
              {awayTeam?.name}
            </p>
            {matchup.away === currentUserId && (
              <p className="text-xs text-gold">You</p>
            )}
          </div>
        </div>
      </div>

      {/* Player Breakdown */}
      {(homeRoster.length > 0 || awayRoster.length > 0) && (
        <div className="border-t border-dark-border pt-4">
          <h4 className="text-sm font-medium text-text-secondary mb-4 text-center">
            Player Breakdown
          </h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Home Roster */}
            <div className="space-y-2">
              {homeRoster.map((player, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-dark-tertiary rounded">
                  <span className="text-sm text-white truncate">{player.name}</span>
                  <span className="text-sm font-semibold text-gold">+{player.points}</span>
                </div>
              ))}
            </div>

            {/* Away Roster */}
            <div className="space-y-2">
              {awayRoster.map((player, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-dark-tertiary rounded">
                  <span className="text-sm text-white truncate">{player.name}</span>
                  <span className="text-sm font-semibold text-gold">+{player.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default MatchupDetail
