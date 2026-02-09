import Card from '../common/Card'

const PlayoffBracket = ({ bracket, teams, currentUserId }) => {
  // Inject BYE placeholders into round 1 for bye teams
  const processedBracket = bracket && bracket.rounds && bracket.byeTeams?.length > 0
    ? {
        ...bracket,
        rounds: bracket.rounds.map((round, i) => {
          if (i !== 0) return round
          // Add bye matchups at the top of round 1 for display
          const byeMatchups = bracket.byeTeams.map(bt => ({
            isBye: true,
            seed1: bt.seed,
            team1: { userId: null, name: bt.teamName },
            team2: null,
            score1: null,
            score2: null,
            winner: null,
            completed: false,
          }))
          return { ...round, matchups: [...byeMatchups, ...round.matchups] }
        }),
      }
    : bracket

  if (!processedBracket || !processedBracket.rounds) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-dark-tertiary flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold font-display text-white mb-2">Playoffs Coming Soon</h3>
          <p className="text-text-muted text-sm">
            The playoff bracket will be generated after the regular season
          </p>
        </div>
      </Card>
    )
  }

  // Create team lookup
  const teamLookup = teams?.reduce((acc, team) => {
    acc[team.userId] = team
    return acc
  }, {}) || {}

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-white mb-4">
        Playoff Bracket ({processedBracket.numTeams} Teams)
      </h3>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max p-4">
          {processedBracket.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="flex flex-col justify-around">
              {/* Round Header */}
              <h4 className="text-sm font-medium text-text-secondary mb-4 text-center">
                {round.name}
              </h4>

              {/* Matchups */}
              <div className="flex flex-col gap-8 justify-around flex-1">
                {round.matchups.map((matchup, matchIndex) => {
                  const isBye = matchup.isBye
                  return (
                    <div
                      key={matchIndex}
                      className="bg-dark-tertiary rounded-lg p-3 w-48"
                    >
                      {/* Team 1 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded mb-1 ${
                          matchup.winner === matchup.team1?.userId
                            ? 'bg-gold/20'
                            : 'bg-dark-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {matchup.seed1 && (
                            <span className="text-xs text-text-muted w-4">{matchup.seed1}</span>
                          )}
                          <span className={`text-sm font-medium truncate ${
                            matchup.team1
                              ? matchup.team1.userId === currentUserId
                                ? 'text-gold'
                                : 'text-white'
                              : 'text-text-muted'
                          }`}>
                            {matchup.team1
                              ? teamLookup[matchup.team1.userId]?.name || matchup.team1.name || 'TBD'
                              : 'TBD'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          matchup.winner === matchup.team1?.userId ? 'text-gold' : 'text-text-secondary'
                        }`}>
                          {isBye ? '' : (matchup.score1 ?? '-')}
                        </span>
                      </div>

                      {/* Team 2 / BYE */}
                      <div
                        className={`flex items-center justify-between p-2 rounded ${
                          isBye
                            ? 'bg-dark-primary/50'
                            : matchup.winner === matchup.team2?.userId
                              ? 'bg-gold/20'
                              : 'bg-dark-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isBye ? (
                            <span className="text-sm font-medium text-text-muted italic">BYE</span>
                          ) : (
                            <>
                              {matchup.seed2 && (
                                <span className="text-xs text-text-muted w-4">{matchup.seed2}</span>
                              )}
                              <span className={`text-sm font-medium truncate ${
                                matchup.team2
                                  ? matchup.team2.userId === currentUserId
                                    ? 'text-gold'
                                    : 'text-white'
                                  : 'text-text-muted'
                              }`}>
                                {matchup.team2
                                  ? teamLookup[matchup.team2.userId]?.name || matchup.team2.name || 'TBD'
                                  : 'TBD'}
                              </span>
                            </>
                          )}
                        </div>
                        {!isBye && (
                          <span className={`text-sm font-bold ${
                            matchup.winner === matchup.team2?.userId ? 'text-gold' : 'text-text-secondary'
                          }`}>
                            {matchup.score2 ?? '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Champion */}
          <div className="flex flex-col justify-center">
            <h4 className="text-sm font-medium text-text-secondary mb-4 text-center">
              Champion
            </h4>
            <div className="bg-gradient-to-br from-yellow-500/20 to-dark-tertiary rounded-lg p-4 w-48 text-center border border-yellow-500/30">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                </svg>
              </div>
              <p className="text-yellow-500 font-semibold">
                {/* Find champion from last round */}
                {processedBracket.rounds[processedBracket.rounds.length - 1]?.matchups[0]?.winner
                  ? teamLookup[processedBracket.rounds[processedBracket.rounds.length - 1].matchups[0].winner]?.name || 'Champion'
                  : 'TBD'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PlayoffBracket
