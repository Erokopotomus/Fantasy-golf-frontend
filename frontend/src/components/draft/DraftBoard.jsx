const DraftBoard = ({ picks, teams, rosterSize, currentPick, userTeamId, onViewPlayer, players }) => {
  const rounds = Array.from({ length: rosterSize }, (_, i) => i + 1)

  return (
    <div className="flex flex-col h-full bg-dark-secondary rounded-lg border border-dark-border overflow-hidden">
      {/* Team Column Headers */}
      <div className="flex-shrink-0">
        <div className="overflow-x-auto">
          <div
            className="grid gap-px min-w-[500px]"
            style={{ gridTemplateColumns: `44px repeat(${teams.length}, 1fr)` }}
          >
            <div className="bg-dark-tertiary px-1 py-2.5 text-text-muted text-[10px] font-semibold text-center">RD</div>
            {teams.map(team => (
              <div
                key={team.id}
                className={`px-1 py-2.5 text-[10px] font-semibold text-center truncate ${
                  team.id === userTeamId
                    ? 'bg-accent-green/25 text-accent-green border-b-2 border-b-accent-green'
                    : currentPick?.teamId === team.id
                      ? 'bg-yellow-500/15 text-yellow-400'
                      : 'bg-dark-tertiary text-text-muted'
                }`}
              >
                {team.id === userTeamId ? (
                  <span className="font-bold">YOU</span>
                ) : (
                  team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Round Rows */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <div className="min-w-[500px]">
          {rounds.map(round => {
            const isCurrentRound = currentPick?.round === round

            return (
              <div
                key={round}
                className={`grid gap-px ${isCurrentRound ? 'bg-dark-border' : ''}`}
                style={{ gridTemplateColumns: `44px repeat(${teams.length}, 1fr)` }}
              >
                <div className={`px-1 py-1 text-[10px] text-center flex items-center justify-center font-semibold ${
                  isCurrentRound ? 'text-accent-green bg-dark-secondary' : 'text-text-muted bg-dark-primary/80'
                }`}>
                  {round}
                </div>
                {teams.map(team => {
                  const pick = picks.find(p => p.teamId === team.id && p.round === round)
                  const isCurrent = currentPick?.teamId === team.id && currentPick?.round === round && !currentPick?.complete
                  const isUserTeamCell = team.id === userTeamId

                  return (
                    <div
                      key={team.id}
                      onClick={() => {
                        if (pick && onViewPlayer) {
                          const player = players?.find(p => p.id === pick.playerId)
                          if (player) onViewPlayer(player)
                        }
                      }}
                      className={`px-1 py-1 min-h-[44px] flex items-center justify-center transition-colors ${
                        pick ? 'cursor-pointer hover:brightness-125' : ''
                      } ${
                        isCurrent
                          ? 'bg-accent-green/20 ring-1 ring-inset ring-accent-green/60'
                          : pick
                            ? pick.playerRank <= 10
                              ? isUserTeamCell ? 'bg-yellow-500/10' : 'bg-yellow-500/5'
                              : pick.playerRank <= 25
                                ? isUserTeamCell ? 'bg-accent-green/10' : 'bg-accent-green/5'
                                : isUserTeamCell ? 'bg-accent-green/5' : round % 2 === 1 ? 'bg-dark-primary' : 'bg-dark-secondary/40'
                            : round % 2 === 1 ? 'bg-dark-primary/40' : 'bg-dark-secondary/20'
                      }`}
                    >
                      {pick ? (
                        <div className="text-center w-full truncate px-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              pick.playerRank <= 10 ? 'bg-yellow-400' :
                              pick.playerRank <= 25 ? 'bg-accent-green' :
                              pick.playerRank <= 40 ? 'bg-blue-400' :
                              'bg-text-muted/40'
                            }`} />
                          </div>
                          <p className={`text-[10px] leading-tight truncate ${
                            isUserTeamCell ? 'text-accent-green font-medium' : 'text-text-secondary'
                          }`}>
                            {pick.playerName?.split(' ').pop()}
                          </p>
                          <p className="text-[9px] text-text-muted">#{pick.playerRank}</p>
                        </div>
                      ) : isCurrent ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-muted/25">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DraftBoard
