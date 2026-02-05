import Card from '../common/Card'
import Button from '../common/Button'

const LeagueCard = ({ league, onView, onManageLineup }) => {
  const { name, type, memberCount, maxMembers, userRank, userPoints, leader, standings } = league

  const getRankDisplay = (rank) => {
    if (rank === 1) return { text: '1st', color: 'text-yellow-400' }
    if (rank === 2) return { text: '2nd', color: 'text-gray-300' }
    if (rank === 3) return { text: '3rd', color: 'text-amber-600' }
    return { text: `${rank}th`, color: 'text-text-secondary' }
  }

  const rankDisplay = getRankDisplay(userRank)
  const pointsBehind = userRank > 1 ? leader.points - userPoints : 0

  const handleCardClick = () => {
    onView?.(league)
  }

  const handleButtonClick = (e, callback) => {
    e.stopPropagation()
    callback?.(league)
  }

  return (
    <Card className="group cursor-pointer" hover onClick={handleCardClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold text-base sm:text-lg truncate group-hover:text-accent-green transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              type === 'snake'
                ? 'bg-accent-green/20 text-accent-green'
                : 'bg-accent-blue/20 text-accent-blue'
            }`}>
              {type === 'snake' ? 'Snake' : 'Auction'}
            </span>
            <span className="text-text-muted text-xs">
              {memberCount}/{maxMembers} members
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className={`text-2xl font-bold ${rankDisplay.color}`}>
            {rankDisplay.text}
          </p>
          <p className="text-text-muted text-xs">of {memberCount}</p>
        </div>
      </div>

      <div className="bg-dark-primary rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-text-muted text-xs">Your Points</p>
            <p className="text-white font-semibold text-lg">{userPoints.toLocaleString()}</p>
          </div>
          {userRank > 1 && (
            <div className="text-right">
              <p className="text-text-muted text-xs">Behind Leader</p>
              <p className="text-red-400 font-medium">-{pointsBehind}</p>
            </div>
          )}
          {userRank === 1 && (
            <div className="text-right">
              <p className="text-text-muted text-xs">Lead</p>
              <p className="text-accent-green font-medium">
                +{standings && standings[1] ? userPoints - standings[1].points : 0}
              </p>
            </div>
          )}
        </div>
      </div>

      {standings && standings.length > 0 && (
        <div className="mb-4">
          <p className="text-text-muted text-xs mb-2">Top 3</p>
          <div className="space-y-1.5">
            {standings.slice(0, 3).map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                  entry.userId === '1' ? 'bg-accent-green/10' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 text-center font-medium ${
                    entry.rank === 1 ? 'text-yellow-400' :
                    entry.rank === 2 ? 'text-gray-300' :
                    entry.rank === 3 ? 'text-amber-600' : 'text-text-muted'
                  }`}>
                    {entry.rank}
                  </span>
                  <div className="w-6 h-6 bg-dark-tertiary rounded-full flex items-center justify-center text-xs text-text-secondary">
                    {entry.avatar}
                  </div>
                  <span className={`${entry.userId === '1' ? 'text-accent-green' : 'text-white'}`}>
                    {entry.name}
                  </span>
                </div>
                <span className="text-text-secondary font-medium">{entry.points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={(e) => handleButtonClick(e, onView)}
        >
          View League
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={(e) => handleButtonClick(e, onManageLineup)}
        >
          Manage Lineup
        </Button>
      </div>
    </Card>
  )
}

export default LeagueCard
