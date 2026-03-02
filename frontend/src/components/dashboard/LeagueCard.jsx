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

const sportColors = {
  GOLF: { bg: 'bg-field-bright/15', text: 'text-field', border: 'border-field-bright/20', accent: 'border-l-field-bright' },
  NFL: { bg: 'bg-orange-500/15', text: 'text-blaze', border: 'border-orange-500/20', accent: 'border-l-orange-500' },
}

const sportEmojis = {
  GOLF: '\u26F3',
  NFL: '\uD83C\uDFC8',
}

const LeagueCard = ({ league, onView, onManageLineup }) => {
  const name = league.name
  const memberCount = league.memberCount || league._count?.members || 0
  const maxMembers = league.maxMembers || league.maxTeams || 10
  const draftType = league.type || league.draftType || 'SNAKE'
  const format = league.format || 'FULL_LEAGUE'
  const sport = (league.sport || 'GOLF').toUpperCase()
  const colors = sportColors[sport] || sportColors.GOLF

  const userTeam = league.teams?.[0]
  const userPoints = league.userPoints ?? userTeam?.totalPoints ?? 0
  const userRank = league.userRank || null
  const standings = league.standings || null

  const draftLabel = draftTypeMap[draftType] || (draftType === 'snake' ? 'Snake' : draftType === 'auction' ? 'Auction' : draftType)
  const formatLabel = formatMap[format] || format
  const isSnakeType = draftType === 'SNAKE' || draftType === 'snake'

  const hasDraft = league.drafts?.length > 0
  const draftStatus = hasDraft ? league.drafts[0].status : null
  const isPreDraft = !hasDraft || draftStatus === 'PENDING'

  const handleCardClick = () => onView?.(league)
  const handleButtonClick = (e, callback) => {
    e.stopPropagation()
    callback?.(league)
  }

  return (
    <Card
      className={`group cursor-pointer border-l-[3px] ${colors.accent} !p-4`}
      hover
      onClick={handleCardClick}
    >
      {/* Header row: sport emoji + name + tags + status */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
          <span className="text-sm leading-none">{sportEmojis[sport]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-text-primary font-semibold text-sm sm:text-base truncate group-hover:text-[var(--crown)] transition-colors leading-tight">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-mono px-1.5 py-px rounded-full ${
              isSnakeType ? 'bg-[var(--crown)]/15 text-[var(--crown)]' : 'bg-orange-500/15 text-blaze'
            }`}>
              {draftLabel}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {formatLabel}
            </span>
            <span className="text-text-muted/50 text-[10px]">&middot;</span>
            <span className="text-text-muted text-[10px]">
              {memberCount}/{maxMembers}
            </span>
          </div>
        </div>
        {/* Status or rank */}
        {userRank ? (
          <div className="text-right flex-shrink-0">
            <p className={`text-lg font-mono font-bold leading-tight ${
              userRank === 1 ? 'text-crown' :
              userRank === 2 ? 'text-gray-400 dark:text-gray-300' :
              userRank === 3 ? 'text-amber-700 dark:text-amber-500' : 'text-text-secondary'
            }`}>
              {userRank === 1 ? '1st' : userRank === 2 ? '2nd' : userRank === 3 ? '3rd' : `${userRank}th`}
            </p>
            <p className="text-text-muted text-[10px]">of {memberCount}</p>
          </div>
        ) : (
          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold flex-shrink-0 ${
            isPreDraft ? 'bg-crown/15 text-crown' : 'bg-[var(--crown)]/15 text-[var(--crown)]'
          }`}>
            {isPreDraft ? 'Pre-Draft' : 'Active'}
          </span>
        )}
      </div>

      {/* Content section — compact, context-dependent */}
      {userPoints > 0 ? (
        <div className="flex items-center gap-4 px-2 py-2 bg-[var(--bg-alt)] rounded-lg mb-3">
          <div>
            <p className="text-text-primary font-mono font-semibold text-base leading-tight">{userPoints.toLocaleString()}</p>
            <p className="text-text-muted text-[10px]">pts</p>
          </div>
          {userTeam && (
            <div className="border-l border-[var(--card-border)] pl-3">
              <p className="text-text-secondary font-mono text-sm leading-tight">
                {userTeam.wins || 0}W-{userTeam.losses || 0}L
              </p>
              <p className="text-text-muted text-[10px] truncate max-w-[100px]">{userTeam.name || 'My Team'}</p>
            </div>
          )}
        </div>
      ) : isPreDraft ? (
        <div className="px-2 py-2 bg-[var(--bg-alt)] rounded-lg mb-3 text-center">
          {league.drafts?.[0]?.scheduledFor ? (
            <DraftCountdown compact scheduledFor={league.drafts[0].scheduledFor} />
          ) : (
            <p className="text-text-muted text-xs">
              {memberCount < maxMembers
                ? `Waiting for ${maxMembers - memberCount} more member${maxMembers - memberCount !== 1 ? 's' : ''}`
                : 'Ready to draft!'}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-2 py-2 bg-[var(--bg-alt)] rounded-lg mb-3">
          <p className="text-text-muted text-xs">Season hasn't started</p>
          <span className="text-text-muted/30">&middot;</span>
          <p className="text-text-secondary text-xs truncate">{userTeam?.name || 'My Team'}</p>
        </div>
      )}

      {/* Standings - compact inline */}
      {standings && standings.length > 0 && (
        <div className="mb-3">
          <div className="space-y-1">
            {standings.slice(0, 3).map((entry, idx) => (
              <div
                key={entry.id || entry.userId || idx}
                className={`flex items-center justify-between text-xs py-0.5 px-2 rounded ${
                  entry.userId === league.teams?.[0]?.userId ? 'bg-[var(--crown)]/8' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 text-center font-semibold ${
                    idx === 0 ? 'text-crown' :
                    idx === 1 ? 'text-gray-400 dark:text-gray-300' :
                    idx === 2 ? 'text-amber-700 dark:text-amber-500' : 'text-text-muted'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-text-primary text-xs truncate">
                    {entry.name || entry.user?.name || 'Team'}
                  </span>
                </div>
                <span className="text-text-secondary font-mono text-xs">
                  {(entry.totalPoints || entry.points || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — compact */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 !py-1.5 !text-xs"
          onClick={(e) => handleButtonClick(e, onView)}
        >
          View League
        </Button>
        <Button
          size="sm"
          className="flex-1 !py-1.5 !text-xs"
          onClick={(e) => handleButtonClick(e, onManageLineup)}
        >
          {isPreDraft ? 'League Home' : 'Manage Lineup'}
        </Button>
      </div>
    </Card>
  )
}

export default LeagueCard
