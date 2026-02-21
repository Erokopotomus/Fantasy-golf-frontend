export default function DivergenceSummary({ entries }) {
  // Find entries with biggest divergence from baseline
  const divergences = entries
    .filter(e => e.baselineRank != null)
    .map(e => ({
      playerId: e.playerId,
      name: e.player?.name || 'Unknown',
      position: e.player?.position,
      rank: e.rank,
      baseline: e.baselineRank,
      delta: e.baselineRank - e.rank, // positive = user ranks higher
    }))
    .filter(d => Math.abs(d.delta) >= 3)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const risers = divergences.filter(d => d.delta > 0).slice(0, 3)
  const fallers = divergences.filter(d => d.delta < 0).slice(0, 3)

  if (risers.length === 0 && fallers.length === 0) return null

  return (
    <div className="mx-3 my-2 p-3 rounded-lg bg-dark-primary/60 border border-[var(--card-border)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary/50 mb-2">Your Biggest Bets</h3>
      <div className="space-y-1.5">
        {risers.map(d => (
          <div key={d.playerId} className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-mono font-bold w-10 text-right">{'\u2191'}{d.delta}</span>
            <span className="text-text-primary font-medium truncate">{d.name}</span>
            {d.position && <span className="text-text-primary/30 text-[10px]">{d.position}</span>}
            <span className="text-text-primary/25 text-[10px] ml-auto">You: #{d.rank} vs #{d.baseline}</span>
          </div>
        ))}
        {fallers.map(d => (
          <div key={d.playerId} className="flex items-center gap-2 text-xs">
            <span className="text-red-400 font-mono font-bold w-10 text-right">{'\u2193'}{Math.abs(d.delta)}</span>
            <span className="text-text-primary font-medium truncate">{d.name}</span>
            {d.position && <span className="text-text-primary/30 text-[10px]">{d.position}</span>}
            <span className="text-text-primary/25 text-[10px] ml-auto">You: #{d.rank} vs #{d.baseline}</span>
          </div>
        ))}
      </div>
      {divergences.length > 6 && (
        <p className="text-[10px] text-text-primary/25 mt-2">{divergences.length - 6} more divergences...</p>
      )}
    </div>
  )
}
