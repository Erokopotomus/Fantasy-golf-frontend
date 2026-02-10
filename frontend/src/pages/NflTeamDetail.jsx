import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import NewsCard from '../components/news/NewsCard'

const StatBar = ({ label, value, rank, suffix = '', of = 32, invert = false }) => {
  // invert: lower rank is better (e.g., points allowed)
  const pct = rank ? ((of - rank + 1) / of) * 100 : 0
  const color = rank <= 5 ? 'bg-emerald-500' : rank <= 16 ? 'bg-gold' : rank <= 26 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-mono font-medium">{value}{suffix} <span className="text-white/30 text-xs">({rank ? `#${rank}` : '-'})</span></span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function NflTeamDetail() {
  const { abbr } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [roster, setRoster] = useState([])
  const [schedule, setSchedule] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('roster')
  const [teamNews, setTeamNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [teamData, statsData] = await Promise.all([
          api.getNflTeam(abbr),
          api.getNflTeamStats(abbr).catch(() => null),
        ])
        setTeam(teamData.team)
        setRoster(teamData.roster || [])
        setSchedule(teamData.schedule || [])
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load team:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [abbr])

  if (loading) return <div className="max-w-6xl mx-auto px-4 pt-20 pb-8"><div className="text-center py-20 text-white/30">Loading...</div></div>
  if (!team) return <div className="max-w-6xl mx-auto px-4 pt-20 pb-8"><div className="text-center py-20 text-white/30">Team not found</div></div>

  // Group roster by position
  const posOrder = ['QB', 'RB', 'WR', 'TE', 'K']
  const rosterByPos = {}
  for (const p of roster) {
    const pos = p.nflPosition || 'OTH'
    if (!rosterByPos[pos]) rosterByPos[pos] = []
    rosterByPos[pos].push(p)
  }

  // Win/loss record from schedule
  const record = schedule.reduce((acc, g) => {
    if (g.status !== 'FINAL') return acc
    const teamScore = g.isHome ? g.homeScore : g.awayScore
    const oppScore = g.isHome ? g.awayScore : g.homeScore
    if (teamScore > oppScore) acc.wins++
    else if (teamScore < oppScore) acc.losses++
    else acc.ties++
    return acc
  }, { wins: 0, losses: 0, ties: 0 })

  // Lazy-load news on tab select
  useEffect(() => {
    if (tab !== 'news' || teamNews.length > 0) return
    setNewsLoading(true)
    api.getTeamNews(abbr, { limit: 15 })
      .then(data => setTeamNews(data.articles || []))
      .catch(() => setTeamNews([]))
      .finally(() => setNewsLoading(false))
  }, [tab, abbr])

  const tabs = ['roster', 'schedule', ...(stats ? ['stats'] : []), 'news']

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white/60 text-sm mb-4 inline-flex items-center gap-1">&larr; Back</button>

      {/* Team header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: team.primaryColor || '#333' }}
          >
            {team.abbreviation}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-white">{team.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/40 font-mono text-sm">{team.conference} {team.division}</span>
              {(record.wins > 0 || record.losses > 0) && (
                <span className="text-white/50 font-mono text-sm">
                  {record.wins}-{record.losses}{record.ties > 0 ? `-${record.ties}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-6 w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-colors ${
              tab === t ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t === 'stats' ? 'Team Stats' : t}
          </button>
        ))}
      </div>

      {/* ─── Roster Tab ─── */}
      {tab === 'roster' && (
        <div className="space-y-6">
          {posOrder.map(pos => {
            const players = rosterByPos[pos]
            if (!players || players.length === 0) return null
            return (
              <div key={pos}>
                <h3 className="text-white/40 text-xs font-mono uppercase tracking-wider mb-2">
                  {pos === 'QB' ? 'Quarterbacks' : pos === 'RB' ? 'Running Backs' : pos === 'WR' ? 'Wide Receivers' : pos === 'TE' ? 'Tight Ends' : 'Kickers'}
                </h3>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  {players.map(p => (
                    <Link
                      key={p.id}
                      to={`/nfl/players/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
                          {p.nflNumber || pos}
                        </div>
                      )}
                      <span className="text-white font-medium flex-1">{p.name}</span>
                      {p.nflNumber && <span className="text-white/20 font-mono text-sm">#{p.nflNumber}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Schedule Tab ─── */}
      {tab === 'schedule' && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/40 text-xs font-mono uppercase">WK</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-mono uppercase">Opponent</th>
                <th className="text-center px-4 py-3 text-white/40 text-xs font-mono uppercase">Result</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-mono uppercase">Venue</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(g => {
                const isFinal = g.status === 'FINAL'
                const teamScore = g.isHome ? g.homeScore : g.awayScore
                const oppScore = g.isHome ? g.awayScore : g.homeScore
                const won = isFinal && teamScore > oppScore
                const lost = isFinal && teamScore < oppScore

                return (
                  <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-sm text-white/50">{g.week}</td>
                    <td className="px-4 py-3">
                      <span className="text-white/40 text-sm mr-1">{g.isHome ? 'vs' : '@'}</span>
                      <Link to={`/nfl/teams/${g.opponent}`} className="text-white hover:text-gold text-sm">
                        {g.opponentName || g.opponent}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isFinal ? (
                        <span className={`font-mono text-sm font-bold ${won ? 'text-green-400' : lost ? 'text-red-400' : 'text-white/40'}`}>
                          {won ? 'W' : lost ? 'L' : 'T'} {teamScore}-{oppScore}
                        </span>
                      ) : (
                        <span className="text-white/20 text-sm">{g.kickoff ? new Date(g.kickoff).toLocaleDateString() : 'TBD'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/20 text-sm truncate max-w-[200px]">{g.venue || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Team Stats Tab ─── */}
      {tab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Quick numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'PPG', value: stats.offense.ppg, sub: `#${stats.offense.rank} in NFL` },
              { label: 'PA/G', value: stats.defense.papg, sub: `#${stats.defense.rank} in NFL` },
              { label: 'YPG', value: stats.offense.ypg, sub: `${stats.offense.totalYards.toLocaleString()} total` },
              { label: 'Turnovers', value: stats.offense.turnovers, sub: `${stats.offense.passing.interceptions} INT, ${stats.offense.turnovers - stats.offense.passing.interceptions} FUM` },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-white/40 text-xs font-mono uppercase mb-1">{s.label}</div>
                <div className="text-2xl font-mono font-bold text-white">{s.value}</div>
                <div className="text-white/30 text-xs mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Offense */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-display font-bold text-lg mb-4">Offense</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-white/40 text-xs font-mono uppercase tracking-wider">Passing</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/50">Yards</span><span className="text-white font-mono">{stats.offense.passing.yards.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">YPG</span><span className="text-white font-mono">{stats.offense.passing.ypg}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">TDs</span><span className="text-white font-mono">{stats.offense.passing.tds}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">INTs</span><span className="text-white font-mono">{stats.offense.passing.interceptions}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Comp/Att</span><span className="text-white font-mono">{stats.offense.passing.completions}/{stats.offense.passing.attempts}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Comp %</span><span className="text-white font-mono">{stats.offense.passing.attempts ? ((stats.offense.passing.completions / stats.offense.passing.attempts) * 100).toFixed(1) : 0}%</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-white/40 text-xs font-mono uppercase tracking-wider">Rushing</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/50">Yards</span><span className="text-white font-mono">{stats.offense.rushing.yards.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">YPG</span><span className="text-white font-mono">{stats.offense.rushing.ypg}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">TDs</span><span className="text-white font-mono">{stats.offense.rushing.tds}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Attempts</span><span className="text-white font-mono">{stats.offense.rushing.attempts.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">YPC</span><span className="text-white font-mono">{stats.offense.rushing.attempts ? (stats.offense.rushing.yards / stats.offense.rushing.attempts).toFixed(1) : 0}</span></div>
                </div>
              </div>
            </div>
            {stats.offense.epa && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-white/40 block text-xs mb-1">Total TDs</span><span className="text-white font-mono font-bold">{stats.offense.totalTds}</span></div>
                  <div><span className="text-white/40 block text-xs mb-1">Total EPA</span><span className="text-white font-mono font-bold">{stats.offense.epa.total}</span></div>
                  <div><span className="text-white/40 block text-xs mb-1">EPA/Game</span><span className="text-white font-mono font-bold">{stats.offense.epa.perGame}</span></div>
                  <div><span className="text-white/40 block text-xs mb-1">Points/Game</span><span className="text-white font-mono font-bold">{stats.offense.ppg}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Defense */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-display font-bold text-lg mb-4">Defense</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-white/40 block text-xs mb-1">Points Allowed/G</span><span className="text-white font-mono font-bold">{stats.defense.papg}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Sacks</span><span className="text-white font-mono font-bold">{stats.defense.sacks}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Interceptions</span><span className="text-white font-mono font-bold">{stats.defense.interceptions}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Defensive TDs</span><span className="text-white font-mono font-bold">{stats.defense.tds}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Fumbles Forced</span><span className="text-white font-mono font-bold">{stats.defense.fumblesForced}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Fumbles Recovered</span><span className="text-white font-mono font-bold">{stats.defense.fumblesRecovered}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Passes Defended</span><span className="text-white font-mono font-bold">{stats.defense.passesDefended}</span></div>
              <div><span className="text-white/40 block text-xs mb-1">Total Tackles</span><span className="text-white font-mono font-bold">{stats.defense.tackles.total.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Top Fantasy Players */}
          {stats.topPlayers && stats.topPlayers.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-white font-display font-bold">Top Fantasy Players <span className="text-white/30 text-sm font-mono">(Half PPR)</span></h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">#</th>
                    <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">Player</th>
                    <th className="text-center px-4 py-2 text-white/40 text-xs font-mono uppercase">Pos</th>
                    <th className="text-center px-4 py-2 text-white/40 text-xs font-mono uppercase">GP</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono uppercase">Total</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono uppercase">PPG</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPlayers.map((p, i) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-sm text-white/30">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link to={`/nfl/players/${p.id}`} className="flex items-center gap-2 hover:text-gold">
                          {p.headshotUrl ? (
                            <img src={p.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-white/10" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/10" />
                          )}
                          <span className="text-white text-sm font-medium">{p.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-center text-white/40 text-xs font-mono">{p.position}</td>
                      <td className="px-4 py-2.5 text-center text-white/40 text-sm font-mono">{p.games}</td>
                      <td className="px-4 py-2.5 text-right text-gold font-mono font-bold text-sm">{p.fantasyPts}</td>
                      <td className="px-4 py-2.5 text-right text-white/60 font-mono text-sm">{p.ptsPerGame}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-center text-white/20 text-xs font-mono">Data via nflverse | {stats.season} season</p>
        </div>
      )}

      {/* ─── News Tab ─── */}
      {tab === 'news' && (
        <div className="space-y-4">
          {newsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-28 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : teamNews.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <p className="text-4xl mb-3">📰</p>
              <p>No recent news for {team.name}</p>
            </div>
          ) : (
            teamNews.map(article => (
              <NewsCard key={article.id} item={article} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
