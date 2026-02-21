import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const SCORING_LABELS = { standard: 'STD', ppr: 'PPR', half_ppr: 'Half' }

export default function NflCompare() {
  const [searchParams] = useSearchParams()
  const p1Id = searchParams.get('p1')
  const p2Id = searchParams.get('p2')

  const [scoringView, setScoringView] = useState('half_ppr')
  const [globalSeasons, setGlobalSeasons] = useState([])

  // Player 1 state
  const [p1, setP1] = useState(null)
  const [p1GameLog, setP1GameLog] = useState([])
  const [p1Totals, setP1Totals] = useState(null)
  const [p1Loading, setP1Loading] = useState(true)
  const [p1Season, setP1Season] = useState('')
  const [p1Seasons, setP1Seasons] = useState([])

  // Player 2 state
  const [p2, setP2] = useState(null)
  const [p2GameLog, setP2GameLog] = useState([])
  const [p2Totals, setP2Totals] = useState(null)
  const [p2Loading, setP2Loading] = useState(true)
  const [p2Season, setP2Season] = useState('')
  const [p2Seasons, setP2Seasons] = useState([])

  // Fetch global seasons for default
  useEffect(() => {
    api.getNflSeasons().then(data => {
      setGlobalSeasons(data.seasons || [])
    }).catch(() => {})
  }, [])

  const loadPlayer = useCallback(async (playerId, targetSeason, setPlayer, setGameLog, setTotals, setLoading, setSeasons, setSeason) => {
    setLoading(true)
    try {
      const data = await api.getNflPlayer(playerId, { season: targetSeason || undefined })
      setPlayer(data.player)
      setGameLog(data.gameLog || [])
      setTotals(data.seasonTotals || null)
      if (data.availableSeasons?.length) {
        setSeasons(data.availableSeasons)
        if (!targetSeason) setSeason(String(data.availableSeasons[0]))
      }
    } catch (err) {
      console.error('Failed to load player:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load for both players
  useEffect(() => {
    if (p1Id) loadPlayer(p1Id, null, setP1, setP1GameLog, setP1Totals, setP1Loading, setP1Seasons, setP1Season)
    if (p2Id) loadPlayer(p2Id, null, setP2, setP2GameLog, setP2Totals, setP2Loading, setP2Seasons, setP2Season)
  }, [p1Id, p2Id, loadPlayer])

  // Reload on season change
  useEffect(() => {
    if (p1Id && p1Season) loadPlayer(p1Id, p1Season, setP1, setP1GameLog, setP1Totals, setP1Loading, setP1Seasons, setP1Season)
  }, [p1Season]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (p2Id && p2Season) loadPlayer(p2Id, p2Season, setP2, setP2GameLog, setP2Totals, setP2Loading, setP2Seasons, setP2Season)
  }, [p2Season]) // eslint-disable-line react-hooks/exhaustive-deps

  const scoringKey = scoringView === 'ppr' ? 'fantasyPtsPpr' : scoringView === 'half_ppr' ? 'fantasyPtsHalf' : 'fantasyPtsStd'

  const getFpts = (totals) => {
    if (!totals) return null
    return totals[scoringKey]
  }

  // Determine which stat rows to show based on positions
  const getCompareStatRows = () => {
    const pos1 = p1?.nflPosition
    const pos2 = p2?.nflPosition
    if (pos1 === pos2) {
      if (pos1 === 'QB') return [
        { key: 'passYards', label: 'Pass Yards', fmt: 'loc' },
        { key: 'passTds', label: 'Pass TDs', accent: true },
        { key: 'interceptions', label: 'Interceptions', negative: true },
        { key: 'rushYards', label: 'Rush Yards', fmt: 'loc' },
        { key: 'rushTds', label: 'Rush TDs', accent: true },
      ]
      if (pos1 === 'K') return [
        { key: 'fgMade', label: 'FG Made', accent: true },
        { key: 'fgAttempts', label: 'FG Attempts' },
        { key: 'xpMade', label: 'XP Made' },
        { key: 'xpAttempts', label: 'XP Attempts' },
      ]
      if (pos1 === 'DST') return [
        { key: 'sacks', label: 'Sacks', accent: true },
        { key: 'defInterceptions', label: 'Interceptions' },
        { key: 'fumblesRecovered', label: 'Fumbles Recovered' },
        { key: 'fumblesForced', label: 'Fumbles Forced' },
        { key: 'defTds', label: 'Defensive TDs', accent: true },
      ]
      return [
        { key: 'rushYards', label: 'Rush Yards', fmt: 'loc' },
        { key: 'rushTds', label: 'Rush TDs', accent: true },
        { key: 'receptions', label: 'Receptions' },
        { key: 'recYards', label: 'Rec Yards', fmt: 'loc' },
        { key: 'recTds', label: 'Rec TDs', accent: true },
        { key: 'targets', label: 'Targets' },
      ]
    }
    // Mixed positions
    return [
      { key: 'passYards', label: 'Pass Yards', fmt: 'loc' },
      { key: 'rushYards', label: 'Rush Yards', fmt: 'loc' },
      { key: 'recYards', label: 'Rec Yards', fmt: 'loc' },
      { key: 'receptions', label: 'Receptions' },
      { key: 'fumblesLost', label: 'Fumbles Lost', negative: true },
    ]
  }

  const fmtVal = (val, fmt) => {
    if (val == null) return '-'
    if (fmt === 'loc') return Number(val).toLocaleString()
    return val
  }

  const lowerIsBetter = ['interceptions', 'fumblesLost']
  const compareStat = (key, v1, v2) => {
    if (v1 == null || v2 == null) return 0
    if (v1 === v2) return 0
    if (lowerIsBetter.includes(key)) return v1 < v2 ? 1 : 2
    return v1 > v2 ? 1 : 2
  }

  if (!p1Id || !p2Id) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-text-primary/30">Select two players to compare</div>
      </div>
    )
  }

  const statRows = (p1 && p2) ? getCompareStatRows() : []

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
      {/* Back link */}
      <Link to="/nfl/players" className="text-text-primary/40 hover:text-text-primary/60 text-sm mb-4 inline-block">&larr; Back to Players</Link>

      {/* Title + scoring toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary">Player Comparison</h1>
        <div className="flex gap-1 bg-dark-tertiary/5 rounded-lg p-1">
          {['standard', 'half_ppr', 'ppr'].map(s => (
            <button
              key={s}
              onClick={() => setScoringView(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold transition-colors ${
                scoringView === s ? 'bg-gold/20 text-gold' : 'text-text-primary/50 hover:text-text-primary/70'
              }`}
            >
              {SCORING_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Player Headers (side by side) ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <PlayerHeader player={p1} totals={p1Totals} loading={p1Loading} season={p1Season}
          seasons={p1Seasons} onSeasonChange={setP1Season} fpts={getFpts(p1Totals)} />
        <PlayerHeader player={p2} totals={p2Totals} loading={p2Loading} season={p2Season}
          seasons={p2Seasons} onSeasonChange={setP2Season} fpts={getFpts(p2Totals)} />
      </div>

      {/* ── Stat Comparison Grid ───────────────────────────────────── */}
      {p1 && p2 && p1Totals && p2Totals && (
        <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-mono font-bold text-text-primary/50 uppercase tracking-wider mb-4">Season Stats</h2>

          {/* Games played */}
          <StatCompareRow label="Games Played" v1={p1Totals.gamesPlayed} v2={p2Totals.gamesPlayed} statKey="gamesPlayed" />

          {statRows.map(row => (
            <StatCompareRow
              key={row.key}
              label={row.label}
              v1={p1Totals[row.key]}
              v2={p2Totals[row.key]}
              statKey={row.key}
              fmt={row.fmt}
              accent={row.accent}
              negative={row.negative}
            />
          ))}

          {/* Fantasy Points */}
          <div className="mt-2 pt-2 border-t border-stone/30">
            <StatCompareRow
              label="Fantasy Points"
              v1={getFpts(p1Totals)}
              v2={getFpts(p2Totals)}
              statKey="fantasyPts"
              fmt="pts"
              accent
            />
            <StatCompareRow
              label="Points Per Game"
              v1={p1Totals.gamesPlayed > 0 ? getFpts(p1Totals) / p1Totals.gamesPlayed : null}
              v2={p2Totals.gamesPlayed > 0 ? getFpts(p2Totals) / p2Totals.gamesPlayed : null}
              statKey="ppg"
              fmt="pts"
              accent
            />
          </div>
        </div>
      )}

      {/* ── Game Logs (side by side) ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <GameLogPanel
          player={p1} gameLog={p1GameLog} loading={p1Loading} season={p1Season}
          scoringView={scoringView}
        />
        <GameLogPanel
          player={p2} gameLog={p2GameLog} loading={p2Loading} season={p2Season}
          scoringView={scoringView}
        />
      </div>
    </div>
  )
}

// ─── Player Header Card ──────────────────────────────────────────────────────

function PlayerHeader({ player, totals, loading, season, seasons, onSeasonChange, fpts }) {
  if (loading && !player) {
    return (
      <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl p-5">
        <div className="text-center text-text-primary/30 py-6">Loading...</div>
      </div>
    )
  }
  if (!player) return null

  const posColor = {
    QB: 'text-red-400 bg-red-400/10 border-red-400/20',
    RB: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    WR: 'text-green-400 bg-green-400/10 border-green-400/20',
    TE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    K: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    DST: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  }[player.nflPosition] || 'text-text-primary/50 bg-dark-tertiary/5 border-stone/30'

  return (
    <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl p-5">
      <div className="flex items-center gap-4">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-16 h-16 rounded-full object-cover bg-dark-tertiary/10" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-dark-tertiary/10 flex items-center justify-center text-text-primary/30 text-xl font-bold">
            {player.nflPosition}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link to={`/nfl/players/${player.id}`} className="text-xl font-display font-bold text-text-primary hover:text-gold transition-colors">
            {player.name}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full border font-mono text-xs font-bold ${posColor}`}>
              {player.nflPosition}
            </span>
            <span className="text-text-primary/50 font-mono text-xs">{player.nflTeamAbbr}</span>
            {player.nflNumber && <span className="text-text-primary/30 font-mono text-xs">#{player.nflNumber}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-gold">
            {fpts != null ? Number(fpts).toFixed(2) : '-'}
          </div>
          <div className="text-text-primary/40 text-xs font-mono uppercase">FPTS</div>
        </div>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone/20">
          <select
            value={season}
            onChange={e => onSeasonChange(e.target.value)}
            className="bg-[#1a1917] border border-stone/30 rounded-lg px-3 py-1.5 text-text-primary text-sm font-mono focus:border-gold/50 focus:outline-none w-full"
          >
            {seasons.map(yr => (
              <option key={yr} value={yr} className="bg-[#1a1917] text-text-primary">{yr} Season</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── Stat Comparison Row ─────────────────────────────────────────────────────

function StatCompareRow({ label, v1, v2, statKey, fmt, accent, negative }) {
  const lowerIsBetter = ['interceptions', 'fumblesLost']
  let winner = 0
  if (v1 != null && v2 != null) {
    const n1 = Number(v1), n2 = Number(v2)
    if (n1 !== n2) {
      if (lowerIsBetter.includes(statKey)) winner = n1 < n2 ? 1 : 2
      else winner = n1 > n2 ? 1 : 2
    }
  }

  const formatVal = (val) => {
    if (val == null) return '-'
    if (fmt === 'pts') return Number(val).toFixed(2)
    if (fmt === 'loc') return Number(val).toLocaleString()
    return val
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-1.5">
      <div className={`text-right font-mono text-sm pr-4 ${
        winner === 1 ? 'text-gold font-bold' : 'text-text-primary/60'
      }`}>
        {formatVal(v1)}
        {winner === 1 && <span className="ml-1 text-gold/50 text-xs">&#9650;</span>}
      </div>
      <div className="text-center text-text-primary/30 text-xs font-mono w-32 truncate">
        {label}
      </div>
      <div className={`text-left font-mono text-sm pl-4 ${
        winner === 2 ? 'text-gold font-bold' : 'text-text-primary/60'
      }`}>
        {winner === 2 && <span className="mr-1 text-gold/50 text-xs">&#9650;</span>}
        {formatVal(v2)}
      </div>
    </div>
  )
}

// ─── Game Log Panel ──────────────────────────────────────────────────────────

function GameLogPanel({ player, gameLog, loading, season, scoringView }) {
  if (!player) return null

  const isQb = player.nflPosition === 'QB'
  const isK = player.nflPosition === 'K'
  const isDst = player.nflPosition === 'DST'

  return (
    <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-stone/30 flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-text-primary">
          {season ? `${season} Game Log` : 'Game Log'}
        </h3>
        {loading && <span className="text-text-primary/30 text-xs font-mono">Loading...</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone/30">
              <th className="text-left px-2 py-2 text-text-primary/40 font-mono">WK</th>
              <th className="text-left px-2 py-2 text-text-primary/40 font-mono">OPP</th>
              {isQb ? (
                <>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">YDS</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">TD</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">INT</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">RSH</th>
                </>
              ) : isK ? (
                <>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">FGM</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">XPM</th>
                </>
              ) : isDst ? (
                <>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">SCK</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">INT</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">TD</th>
                </>
              ) : (
                <>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">RSH</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">REC</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">YDS</th>
                  <th className="text-right px-1.5 py-2 text-text-primary/40 font-mono">TD</th>
                </>
              )}
              <th className="text-right px-2 py-2 text-gold/50 font-mono font-bold">PTS</th>
            </tr>
          </thead>
          <tbody>
            {gameLog.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6 text-text-primary/20">No game data</td></tr>
            ) : (
              gameLog.map(g => (
                <tr key={g.gameId} className="border-b border-stone/20 hover:bg-dark-tertiary/5">
                  <td className="px-2 py-1.5 font-mono text-text-primary/50">{g.week}</td>
                  <td className="px-2 py-1.5 font-mono text-text-primary/60">
                    {g.isHome ? 'v' : '@'}{g.opponent}
                  </td>
                  {isQb ? (
                    <>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/70">{g.stats.passYards ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-gold font-bold">{g.stats.passTds ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-red-400">{g.stats.interceptions ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/50">{g.stats.rushYards ?? '-'}</td>
                    </>
                  ) : isK ? (
                    <>
                      <td className="text-right px-1.5 py-1.5 font-mono text-gold">{g.stats.fgMade ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/60">{g.stats.xpMade ?? '-'}</td>
                    </>
                  ) : isDst ? (
                    <>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/70">{g.stats.sacks ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/70">{g.stats.defInterceptions ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-gold">{g.stats.defTds ?? '-'}</td>
                    </>
                  ) : (
                    <>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/50">{g.stats.rushYards ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/60">{g.stats.receptions ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-text-primary/70">{g.stats.recYards ?? '-'}</td>
                      <td className="text-right px-1.5 py-1.5 font-mono text-gold">{g.stats.recTds ?? '-'}</td>
                    </>
                  )}
                  <td className="text-right px-2 py-1.5 font-mono font-bold text-gold">
                    {g.fantasyPts?.[scoringView] != null ? Number(g.fantasyPts[scoringView]).toFixed(1) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
