import Card from '../common/Card'

const TournamentHeader = ({ tournament }) => {
  if (!tournament) return null

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="bg-gradient-to-r from-dark-card to-dark-tertiary">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              tournament.status === 'live'
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : tournament.status === 'upcoming'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
            }`}>
              {tournament.status === 'live' ? '● LIVE' : tournament.status?.toUpperCase()}
            </span>
            <span className="text-text-muted text-sm">Round {tournament.currentRound || 1}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
          <p className="text-text-secondary">{tournament.course}</p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-text-muted">Dates</p>
            <p className="text-white font-medium">
              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Purse</p>
            <p className="text-white font-medium">{tournament.purse || '$20M'}</p>
          </div>
          {tournament.status === 'live' && (
            <div className="flex items-center gap-2 text-accent-green">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green"></span>
              </span>
              <span className="text-sm font-medium">Live Scoring</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default TournamentHeader
