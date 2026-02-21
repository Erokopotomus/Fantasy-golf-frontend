import Card from '../common/Card'

const MyPlayersPanel = ({ players, onSelectPlayer, selectedPlayerId }) => {
  const formatScore = (score) => {
    if (score == null) return '–'
    const num = parseInt(score)
    if (num > 0) return `+${num}`
    if (num === 0) return 'E'
    return `${score}`
  }

  const totalPoints = players.reduce((sum, p) => sum + (p.fantasyPoints || 0), 0)

  return (
    <div className="rounded-xl border border-dark-border bg-dark-secondary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-900/20 to-dark-secondary border-b border-dark-border">
        <h3 className="text-base font-bold text-text-primary">My Team</h3>
        <div className="text-right">
          <span className="text-[10px] text-text-muted uppercase tracking-wide">Fantasy Pts</span>
          <p className="text-xl font-bold font-display text-emerald-400 leading-tight">{totalPoints}</p>
        </div>
      </div>

      {/* Player list */}
      <div className="divide-y divide-dark-border/30">
        {players.map((player) => (
          <div
            key={player.id}
            onClick={() => onSelectPlayer?.(player)}
            className={`
              flex items-center justify-between px-4 py-3 cursor-pointer transition-all
              ${selectedPlayerId === player.id
                ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400'
                : 'hover:bg-dark-tertiary/50 border-l-2 border-l-transparent'}
            `}
          >
            <div className="flex items-center gap-3">
              {player.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-lg">
                  {player.countryFlag}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-text-primary">{player.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span>{player.position}</span>
                  <span className="text-text-muted/50">|</span>
                  <span>{player.thru === 'F' ? 'Final' : `Thru ${player.thru}`}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${parseInt(player.score) < 0 ? 'text-emerald-400' : parseInt(player.score) > 0 ? 'text-red-400' : 'text-text-primary'}`}>
                {formatScore(player.score)}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium">
                {player.fantasyPoints || 0} pts
              </p>
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="text-center py-10 text-text-muted">
            <svg className="w-10 h-10 mx-auto mb-3 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium">No players rostered</p>
            <p className="text-xs mt-1">Set your lineup before the tournament</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyPlayersPanel
