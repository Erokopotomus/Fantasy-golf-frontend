import Card from '../common/Card'

const DraftBoard = ({ picks, teams, rosterSize, currentPick }) => {
  const rounds = Array.from({ length: rosterSize }, (_, i) => i + 1)

  const getPickByPosition = (teamId, round) => {
    return picks.find(p => p.teamId === teamId && p.round === round)
  }

  const isCurrentPick = (teamId, round) => {
    return currentPick?.teamId === teamId && currentPick?.round === round
  }

  return (
    <Card className="overflow-hidden">
      <h3 className="text-lg font-semibold text-white mb-4">Draft Board</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="p-2 text-left text-text-muted text-xs font-medium sticky left-0 bg-dark-secondary">
                Round
              </th>
              {teams.map((team) => (
                <th
                  key={team.id}
                  className="p-2 text-center text-xs font-medium min-w-[100px]"
                >
                  <div className={`${team.isUser ? 'text-accent-green' : 'text-text-secondary'}`}>
                    {team.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round} className="border-b border-dark-border/50">
                <td className="p-2 text-text-muted text-sm font-medium sticky left-0 bg-dark-secondary">
                  {round}
                </td>
                {teams.map((team) => {
                  const pick = getPickByPosition(team.id, round)
                  const isCurrent = isCurrentPick(team.id, round)

                  return (
                    <td key={`${team.id}-${round}`} className="p-1">
                      <div
                        className={`
                          rounded-lg p-2 min-h-[60px] text-center transition-all
                          ${isCurrent
                            ? 'bg-accent-green/20 border-2 border-accent-green animate-pulse'
                            : pick
                              ? 'bg-dark-tertiary'
                              : 'bg-dark-primary/50'
                          }
                        `}
                      >
                        {pick ? (
                          <div>
                            <p className="text-white text-xs font-medium truncate">
                              {pick.playerName}
                            </p>
                            <p className="text-text-muted text-xs">
                              #{pick.playerRank}
                            </p>
                          </div>
                        ) : isCurrent ? (
                          <div className="text-accent-green text-xs">
                            Picking...
                          </div>
                        ) : null}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default DraftBoard
