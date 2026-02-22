const DraftBoard = ({ picks, teams, rosterSize, currentPick, userTeamId, onViewPlayer, players }) => {
  const rounds = Array.from({ length: rosterSize }, (_, i) => i + 1)

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] rounded-lg border border-[var(--card-border)] overflow-hidden">
      {/* Team Column Headers */}
      <div className="flex-shrink-0">
        <div className="overflow-x-auto">
          <div
            className="grid gap-px min-w-[500px]"
            style={{ gridTemplateColumns: `44px repeat(${teams.length}, 1fr)` }}
          >
            <div className="bg-[var(--bg-alt)] px-1 py-2.5 text-text-muted text-[10px] font-semibold text-center">RD</div>
            {teams.map(team => (
              <div
                key={team.id}
                className={`px-1 py-2.5 text-[10px] font-semibold text-center truncate ${
                  team.id === userTeamId
                    ? 'bg-gold/30 text-gold border-b-2 border-b-gold'
                    : currentPick?.teamId === team.id
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-[var(--bg-alt)] text-text-muted'
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
            const isReverse = round % 2 === 0

            return (
              <div
                key={round}
                className={`grid gap-px ${isCurrentRound ? 'bg-[var(--card-border)]' : ''}`}
                style={{ gridTemplateColumns: `44px repeat(${teams.length}, 1fr)` }}
              >
                <div className={`px-1 py-1 text-[10px] text-center flex flex-col items-center justify-center font-semibold ${
                  isCurrentRound ? 'text-gold bg-[var(--surface)]' : 'text-text-muted bg-[var(--bg-alt)]'
                }`}>
                  <span>{round}</span>
                  <span className="text-[8px] opacity-50">{isReverse ? '←' : '→'}</span>
                </div>
                {teams.map((team, teamIdx) => {
                  const pick = picks.find(p => p.teamId === team.id && p.round === round)
                  const isCurrent = currentPick?.teamId === team.id && currentPick?.round === round && !currentPick?.complete
                  const isUserTeamCell = team.id === userTeamId
                  const pickInRound = teamIdx + 1

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
                          ? 'bg-gold/25 ring-2 ring-inset ring-gold'
                          : pick
                            ? pick.playerRank <= 10
                              ? isUserTeamCell ? 'bg-yellow-500/20' : 'bg-yellow-500/12'
                              : pick.playerRank <= 25
                                ? isUserTeamCell ? 'bg-gold/18' : 'bg-gold/10'
                                : isUserTeamCell ? 'bg-gold/10' : round % 2 === 1 ? 'bg-[var(--surface)]' : 'bg-[var(--bg-alt)]'
                            : round % 2 === 1 ? 'bg-[var(--surface)]' : 'bg-[var(--bg-alt)]'
                      }`}
                    >
                      {pick ? (
                        <div className="text-center w-full truncate px-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              pick.playerRank <= 10 ? 'bg-yellow-400' :
                              pick.playerRank <= 25 ? 'bg-gold' :
                              pick.playerRank <= 40 ? 'bg-blue-400' :
                              'bg-[var(--card-border)]'
                            }`} />
                          </div>
                          <p className={`text-[10px] leading-tight truncate ${
                            isUserTeamCell ? 'text-gold font-medium' : 'text-text-secondary'
                          }`}>
                            {pick.playerName?.split(' ').pop()}
                          </p>
                          <p className="text-[9px] text-text-muted">#{pick.playerRank}</p>
                        </div>
                      ) : isCurrent ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-muted/30 tabular-nums">
                          {round}.{pickInRound}
                        </span>
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
