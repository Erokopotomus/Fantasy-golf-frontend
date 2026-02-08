import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

const SCORING_LABELS = { standard: 'STD', ppr: 'PPR', half_ppr: 'Half' }

export default function NflPlayerDetail() {
  const { playerId } = useParams()
  const [player, setPlayer] = useState(null)
  const [gameLog, setGameLog] = useState([])
  const [seasonTotals, setSeasonTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scoringView, setScoringView] = useState('half_ppr')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.getNflPlayer(playerId)
        setPlayer(data.player)
        setGameLog(data.gameLog || [])
        setSeasonTotals(data.seasonTotals || null)
      } catch (err) {
        console.error('Failed to load NFL player:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [playerId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-white/30">Loading player...</div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-white/30">Player not found</div>
      </div>
    )
  }

  const posColor = {
    QB: 'text-red-400 bg-red-400/10 border-red-400/20',
    RB: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    WR: 'text-green-400 bg-green-400/10 border-green-400/20',
    TE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    K: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  }[player.nflPosition] || 'text-white/50 bg-white/5 border-white/10'

  const isQb = player.nflPosition === 'QB'
  const isK = player.nflPosition === 'K'

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      {/* Back link */}
      <Link to="/nfl/players" className="text-white/40 hover:text-white/60 text-sm mb-4 inline-block">&larr; Back to Players</Link>

      {/* Player Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-20 h-20 rounded-full object-cover bg-white/10" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-2xl font-bold">
              {player.nflPosition}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-white">{player.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full border font-mono text-sm font-bold ${posColor}`}>
                {player.nflPosition}
              </span>
              {player.nflTeamAbbr && (
                <Link to={`/nfl/teams/${player.nflTeamAbbr}`} className="text-white/60 hover:text-gold font-mono text-sm">
                  {player.nflTeamAbbr}
                </Link>
              )}
              {player.nflNumber && (
                <span className="text-white/30 font-mono text-sm">#{player.nflNumber}</span>
              )}
              {player.college && (
                <span className="text-white/30 text-sm">{player.college}</span>
              )}
            </div>
          </div>

          {/* Season fantasy points */}
          {seasonTotals && (
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-gold">
                {scoringView === 'ppr' ? seasonTotals.fantasyPtsPpr :
                 scoringView === 'half_ppr' ? seasonTotals.fantasyPtsHalf :
                 seasonTotals.fantasyPtsStd}
              </div>
              <div className="text-white/40 text-xs font-mono uppercase">Season FPTS</div>
              <div className="flex gap-1 mt-1">
                {['standard', 'half_ppr', 'ppr'].map(s => (
                  <button
                    key={s}
                    onClick={() => setScoringView(s)}
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      scoringView === s ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {SCORING_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Season Stats Summary */}
      {seasonTotals && seasonTotals.gamesPlayed > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Games" value={seasonTotals.gamesPlayed} />
          {isQb ? (
            <>
              <StatCard label="Pass YDs" value={seasonTotals.passYards?.toLocaleString()} />
              <StatCard label="Pass TDs" value={seasonTotals.passTds} accent />
              <StatCard label="INTs" value={seasonTotals.interceptions} negative />
              <StatCard label="Rush YDs" value={seasonTotals.rushYards?.toLocaleString()} />
              <StatCard label="Rush TDs" value={seasonTotals.rushTds} accent />
            </>
          ) : isK ? (
            <>
              <StatCard label="FG Made" value={seasonTotals.fgMade || 0} accent />
              <StatCard label="XP Made" value={seasonTotals.xpMade || 0} />
            </>
          ) : (
            <>
              <StatCard label="Rush YDs" value={seasonTotals.rushYards?.toLocaleString()} />
              <StatCard label="Rush TDs" value={seasonTotals.rushTds} accent />
              <StatCard label="REC" value={seasonTotals.receptions} />
              <StatCard label="Rec YDs" value={seasonTotals.recYards?.toLocaleString()} />
              <StatCard label="Rec TDs" value={seasonTotals.recTds} accent />
            </>
          )}
        </div>
      )}

      {/* Game Log */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-display font-bold text-white">Game Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">WK</th>
                <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">OPP</th>
                <th className="text-center px-4 py-2 text-white/40 text-xs font-mono uppercase">Result</th>
                {isQb ? (
                  <>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">CMP</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">ATT</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">YDS</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TD</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">INT</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">RUSH</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                  </>
                ) : isK ? (
                  <>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGM</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGA</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">XPM</th>
                  </>
                ) : (
                  <>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">RUSH</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.YDS</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TGT</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.YDS</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.TD</th>
                  </>
                )}
                <th className="text-right px-4 py-2 text-white/40 text-xs font-mono uppercase">FPTS</th>
              </tr>
            </thead>
            <tbody>
              {gameLog.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-white/20">No game data available</td></tr>
              ) : (
                gameLog.map(g => (
                  <tr key={g.gameId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 font-mono text-sm text-white/60">{g.week}</td>
                    <td className="px-4 py-2.5 font-mono text-sm text-white/70">
                      {g.isHome ? 'vs ' : '@ '}{g.opponent}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-sm text-white/40">{g.result}</td>
                    {isQb ? (
                      <>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.passCompletions ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.passAttempts ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.passYards ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-gold font-bold">{g.stats.passTds ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-red-400">{g.stats.interceptions ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.rushYards ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.rushTds ?? '-'}</td>
                      </>
                    ) : isK ? (
                      <>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.fgMade ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.fgAttempts ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.xpMade ?? '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.rushAttempts ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.rushYards ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.rushTds ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/40">{g.stats.targets ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.receptions ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.recYards ?? '-'}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.recTds ?? '-'}</td>
                      </>
                    )}
                    <td className="text-right px-4 py-2.5 font-mono text-sm font-bold text-gold">
                      {g.fantasyPts?.[scoringView] ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, negative }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
      <div className={`text-xl font-mono font-bold ${accent ? 'text-gold' : negative ? 'text-red-400' : 'text-white'}`}>
        {value ?? '-'}
      </div>
      <div className="text-white/40 text-xs font-mono uppercase mt-1">{label}</div>
    </div>
  )
}
