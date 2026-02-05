import { Link } from 'react-router-dom'

const MatchupCard = ({ matchup, homeTeam, awayTeam, leagueId, currentUserId, detailed = false }) => {
  const isUserMatch = matchup.home === currentUserId || matchup.away === currentUserId
  const homeWon = matchup.completed && matchup.homeScore > matchup.awayScore
  const awayWon = matchup.completed && matchup.awayScore > matchup.homeScore
  const isTie = matchup.completed && matchup.homeScore === matchup.awayScore

  return (
    <div
      className={`bg-dark-tertiary rounded-lg overflow-hidden ${
        isUserMatch ? 'ring-2 ring-accent-green/50' : ''
      }`}
    >
      {/* Matchup Header */}
      <div className="px-4 py-2 bg-dark-primary/50 border-b border-dark-border flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {matchup.completed ? 'Final' : 'In Progress'}
        </span>
        {isUserMatch && (
          <span className="text-xs text-accent-green font-medium">Your Matchup</span>
        )}
      </div>

      {/* Teams */}
      <div className="p-4 space-y-3">
        {/* Home Team */}
        <div className={`flex items-center justify-between ${homeWon ? 'text-white' : 'text-text-secondary'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              matchup.home === currentUserId ? 'bg-accent-green/20 text-accent-green' : 'bg-dark-primary text-text-secondary'
            }`}>
              {homeTeam?.avatar || '?'}
            </div>
            <div>
              <p className={`font-medium ${homeWon ? 'text-white' : ''}`}>
                {homeTeam?.name || 'Unknown'}
                {matchup.home === currentUserId && <span className="text-xs text-accent-green ml-1">(You)</span>}
              </p>
              {detailed && homeTeam && (
                <p className="text-xs text-text-muted">
                  {homeTeam.wins || 0}-{homeTeam.losses || 0}{homeTeam.ties ? `-${homeTeam.ties}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${homeWon ? 'text-accent-green' : ''}`}>
              {matchup.homeScore ?? '-'}
            </span>
            {homeWon && (
              <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-dark-border"></div>
          <span className="text-xs text-text-muted">vs</span>
          <div className="flex-1 h-px bg-dark-border"></div>
        </div>

        {/* Away Team */}
        <div className={`flex items-center justify-between ${awayWon ? 'text-white' : 'text-text-secondary'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              matchup.away === currentUserId ? 'bg-accent-green/20 text-accent-green' : 'bg-dark-primary text-text-secondary'
            }`}>
              {awayTeam?.avatar || '?'}
            </div>
            <div>
              <p className={`font-medium ${awayWon ? 'text-white' : ''}`}>
                {awayTeam?.name || 'Unknown'}
                {matchup.away === currentUserId && <span className="text-xs text-accent-green ml-1">(You)</span>}
              </p>
              {detailed && awayTeam && (
                <p className="text-xs text-text-muted">
                  {awayTeam.wins || 0}-{awayTeam.losses || 0}{awayTeam.ties ? `-${awayTeam.ties}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${awayWon ? 'text-accent-green' : ''}`}>
              {matchup.awayScore ?? '-'}
            </span>
            {awayWon && (
              <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Tie indicator */}
        {isTie && (
          <div className="text-center py-1">
            <span className="text-xs text-yellow-400 font-medium px-2 py-0.5 bg-yellow-400/10 rounded">
              TIE
            </span>
          </div>
        )}
      </div>

      {/* View Details Link */}
      {detailed && leagueId && (
        <Link
          to={`/leagues/${leagueId}/matchups`}
          className="block px-4 py-2 text-center text-sm text-accent-green hover:bg-accent-green/10 transition-colors border-t border-dark-border"
        >
          View Details
        </Link>
      )}
    </div>
  )
}

export default MatchupCard
