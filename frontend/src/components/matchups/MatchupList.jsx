import MatchupCard from './MatchupCard'

const MatchupList = ({ week, teams, leagueId, currentUserId }) => {
  if (!week || !week.matchups) {
    return (
      <div className="text-center py-8 text-text-muted">
        No matchups available
      </div>
    )
  }

  // Create a lookup for team info
  const teamLookup = teams.reduce((acc, team) => {
    acc[team.userId] = team
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-display text-white">Week {week.week}</h3>
          {week.tournament && (
            <p className="text-sm text-text-muted">{week.tournament}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          week.matchups.every(m => m.completed)
            ? 'bg-gold/20 text-gold'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {week.matchups.every(m => m.completed)
            ? 'Complete'
            : week.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
            ? 'In Progress'
            : 'Upcoming'}
        </span>
      </div>

      {/* Matchups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {week.matchups.map((matchup, index) => (
          <MatchupCard
            key={index}
            matchup={matchup}
            homeTeam={teamLookup[matchup.home]}
            awayTeam={teamLookup[matchup.away]}
            leagueId={leagueId}
            currentUserId={currentUserId}
            detailed
          />
        ))}
      </div>
    </div>
  )
}

export default MatchupList
