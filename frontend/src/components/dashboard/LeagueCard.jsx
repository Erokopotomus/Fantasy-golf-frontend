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

// Format icons as SVG paths
const FormatIcon = ({ format }) => {
  const icons = {
    HEAD_TO_HEAD: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    FULL_LEAGUE: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    ROTO: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    SURVIVOR: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    ONE_AND_DONE: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }
  return icons[format] || icons.FULL_LEAGUE
}

const sportColors = {
  GOLF: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/20' },
  NFL: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
}

const sportEmojis = {
  GOLF: '\u26F3',
  NFL: '\uD83C\uDFC8',
}

const LeagueCard = ({ league, onView, onManageLineup }) => {
  // Support both mock data shape and real API data shape
  const name = league.name
  const memberCount = league.memberCount || league._count?.members || 0
  const maxMembers = league.maxMembers || league.maxTeams || 10
  const draftType = league.type || league.draftType || 'SNAKE'
  const format = league.format || 'FULL_LEAGUE'
  const sport = (league.sport || 'GOLF').toUpperCase()
  const colors = sportColors[sport] || sportColors.GOLF

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
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Sport Icon */}
          <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
            <span className="text-lg leading-none">{sportEmojis[sport]}</span>
          </div>
          {/* Format Icon */}
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/20 flex items-center justify-center flex-shrink-0 text-gold">
            <FormatIcon format={format} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-text-primary font-semibold text-base sm:text-lg truncate group-hover:text-gold transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                isSnakeType
                  ? 'bg-gold/20 text-gold'
                  : 'bg-orange/20 text-orange'
              }`}>
                {draftLabel}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--surface-alt)] text-text-muted">
                {formatLabel}
              </span>
              <span className="text-text-muted text-xs">
                {memberCount}/{maxMembers} members
              </span>
            </div>
          </div>
        </div>
        {userRank ? (
          <div className="text-right flex-shrink-0 ml-3">
            <p className={`text-2xl font-mono font-bold ${
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
                : 'bg-gold/20 text-gold'
            }`}>
              {isPreDraft ? 'Pre-Draft' : 'Active'}
            </div>
          </div>
        )}
      </div>

      {/* Points section - only show if there are points */}
      {userPoints > 0 ? (
        <div className="bg-[var(--surface-alt)] rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-muted text-xs">Your Points</p>
              <p className="text-text-primary font-mono font-semibold text-lg">{userPoints.toLocaleString()}</p>
            </div>
            {userTeam && (
              <div className="text-right">
                <p className="text-text-muted text-xs">Record</p>
                <p className="text-text-secondary font-mono font-medium">
                  {userTeam.wins || 0}W - {userTeam.losses || 0}L
                </p>
              </div>
            )}
          </div>
        </div>
      ) : isPreDraft ? (
        <div className="bg-[var(--surface-alt)] rounded-lg p-3 mb-4">
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
        <div className="bg-[var(--surface-alt)] rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-muted text-xs">Your Points</p>
              <p className="text-text-primary font-semibold text-lg">0</p>
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
                  entry.userId === league.teams?.[0]?.userId ? 'bg-gold/10' : ''
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
                  <span className="text-text-primary text-sm truncate">
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
