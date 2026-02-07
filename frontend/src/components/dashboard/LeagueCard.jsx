import Card from '../common/Card'
import Button from '../common/Button'
import DraftCountdown from '../DraftCountdown'

const formatMap = {
  FULL_LEAGUE: 'Full League',
  HEAD_TO_HEAD: 'H2H',
  ROTO: 'Roto',
  SURVIVOR: 'Survivor',
  ONE_AND_DONE: 'One & Done',
}

const draftTypeMap = {
  SNAKE: 'Snake',
  AUCTION: 'Auction',
  NONE: 'No Draft',
}

const LeagueCard = ({ league, onView, onManageLineup }) => {
  // Support both mock data shape and real API data shape
  const name = league.name
  const memberCount = league.memberCount || league._count?.members || 0
  const maxMembers = league.maxMembers || league.maxTeams || 10
  const draftType = league.type || league.draftType || 'SNAKE'
  const format = league.format || 'FULL_LEAGUE'

  // User's team data from API
  const userTeam = league.teams?.[0]
  const userPoints = league.userPoints ?? userTeam?.totalPoints ?? 0
  const userRank = league.userRank || null
  const standings = league.standings || null

  const draftLabel = draftTypeMap[draftType] || (draftType === 'snake' ? 'Snake' : draftType === 'auction' ? 'Auction' : draftType)
  const formatLabel = formatMap[format] || format
  const isSnakeType = draftType === 'SNAKE' || draftType === 'snake'

  // Determine league status
  const hasDraft = league.drafts?.length > 0
  const draftStatus = hasDraft ? league.drafts[0].status : null
  const isPreDraft = !hasDraft || draftStatus === 'PENDING'

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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isSnakeType
                ? 'bg-accent-green/20 text-accent-green'
                : 'bg-accent-blue/20 text-accent-blue'
            }`}>
              {draftLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-tertiary text-text-muted">
              {formatLabel}
            </span>
            <span className="text-text-muted text-xs">
              {memberCount}/{maxMembers} members
            </span>
          </div>
        </div>
        {userRank ? (
          <div className="text-right flex-shrink-0 ml-3">
            <p className={`text-2xl font-bold ${
              userRank === 1 ? 'text-yellow-400' :
              userRank === 2 ? 'text-gray-300' :
              userRank === 3 ? 'text-amber-600' : 'text-text-secondary'
            }`}>
              {userRank === 1 ? '1st' : userRank === 2 ? '2nd' : userRank === 3 ? '3rd' : `${userRank}th`}
            </p>
            <p className="text-text-muted text-xs">of {memberCount}</p>
          </div>
        ) : (
          <div className="text-right flex-shrink-0 ml-3">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              isPreDraft
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-accent-green/20 text-accent-green'
            }`}>
              {isPreDraft ? 'Pre-Draft' : 'Active'}
            </div>
          </div>
        )}
      </div>

      {/* Points section - only show if there are points */}
      {userPoints > 0 ? (
        <div className="bg-dark-primary rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-muted text-xs">Your Points</p>
              <p className="text-white font-semibold text-lg">{userPoints.toLocaleString()}</p>
            </div>
            {userTeam && (
              <div className="text-right">
                <p className="text-text-muted text-xs">Record</p>
                <p className="text-text-secondary font-medium">
                  {userTeam.wins || 0}W - {userTeam.losses || 0}L
                </p>
              </div>
            )}
          </div>
        </div>
      ) : isPreDraft ? (
        <div className="bg-dark-primary rounded-lg p-3 mb-4">
          {league.drafts?.[0]?.scheduledFor ? (
            <DraftCountdown compact scheduledFor={league.drafts[0].scheduledFor} />
          ) : (
            <div className="text-center">
              <p className="text-text-muted text-sm">Draft hasn't started yet</p>
              <p className="text-text-secondary text-xs mt-1">
                {memberCount < maxMembers
                  ? `Waiting for ${maxMembers - memberCount} more member${maxMembers - memberCount !== 1 ? 's' : ''}`
                  : 'Ready to draft!'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-dark-primary rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-muted text-xs">Your Points</p>
              <p className="text-white font-semibold text-lg">0</p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs">Team</p>
              <p className="text-text-secondary font-medium text-sm truncate max-w-[120px]">
                {userTeam?.name || 'My Team'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Standings - if available */}
      {standings && standings.length > 0 && (
        <div className="mb-4">
          <p className="text-text-muted text-xs mb-2">Top 3</p>
          <div className="space-y-1.5">
            {standings.slice(0, 3).map((entry, idx) => (
              <div
                key={entry.id || entry.userId || idx}
                className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                  entry.userId === league.teams?.[0]?.userId ? 'bg-accent-green/10' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 text-center font-medium ${
                    idx === 0 ? 'text-yellow-400' :
                    idx === 1 ? 'text-gray-300' :
                    idx === 2 ? 'text-amber-600' : 'text-text-muted'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-white text-sm truncate">
                    {entry.name || entry.user?.name || 'Team'}
                  </span>
                </div>
                <span className="text-text-secondary font-medium">
                  {(entry.totalPoints || entry.points || 0).toLocaleString()}
                </span>
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
          {isPreDraft ? 'League Home' : 'Manage Lineup'}
        </Button>
      </div>
    </Card>
  )
}

export default LeagueCard
