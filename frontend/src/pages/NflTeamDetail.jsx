import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

export default function NflTeamDetail() {
  const { abbr } = useParams()
  const [team, setTeam] = useState(null)
  const [roster, setRoster] = useState([])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('roster')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.getNflTeam(abbr)
        setTeam(data.team)
        setRoster(data.roster || [])
        setSchedule(data.schedule || [])
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

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <Link to="/nfl/players" className="text-white/40 hover:text-white/60 text-sm mb-4 inline-block">&larr; Back</Link>

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
        {['roster', 'schedule'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-colors ${
              tab === t ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

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
    </div>
  )
}
