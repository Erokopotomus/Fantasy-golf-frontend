import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/common/Card'
import { useLeagueHistory } from '../hooks/useImports'
import api from '../services/api'
import LeagueChat from '../components/ai/LeagueChat'

function downloadCSV(filename, rows) {
  const escape = (val) => {
    if (val == null) return ''
    const s = String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = Object.keys(rows[0] || {}).map(escape).join(',')
  const body = rows.map(r => Object.values(r).map(escape).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const PLAYOFF_LABELS = {
  champion: { text: 'Champion', color: 'text-accent-gold bg-accent-gold/20' },
  runner_up: { text: 'Runner-Up', color: 'text-gray-300 bg-gray-500/20' },
  semifinal: { text: 'Semis', color: 'text-blue-400 bg-blue-500/20' },
  eliminated: { text: 'Playoffs', color: 'text-green-400 bg-green-500/20' },
  missed: { text: '', color: '' },
}

// ─── Season Timeline Card ─────────────────────────────────────────────────────
const SeasonCard = ({ year, teams }) => {
  const [expanded, setExpanded] = useState(false)
  const champion = teams.find(t => t.playoffResult === 'champion')

  return (
    <Card className="mb-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl font-mono font-bold text-accent-gold">{year}</span>
          <div>
            {champion && (
              <p className="text-sm text-white font-display font-bold flex items-center gap-1.5">
                <span className="text-accent-gold">🏆</span> {champion.ownerName || champion.teamName}
              </p>
            )}
            <p className="text-xs text-text-secondary font-mono">{teams.length} teams</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-dark-tertiary">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                  <th className="text-left pb-2 pl-2">#</th>
                  <th className="text-left pb-2">Team</th>
                  <th className="text-center pb-2">W</th>
                  <th className="text-center pb-2">L</th>
                  <th className="text-center pb-2">T</th>
                  <th className="text-right pb-2">PF</th>
                  <th className="text-right pb-2">PA</th>
                  <th className="text-right pb-2 pr-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => {
                  const playoff = PLAYOFF_LABELS[team.playoffResult] || {}
                  return (
                    <tr key={team.id || idx} className="border-t border-dark-tertiary/50 hover:bg-dark-tertiary/30">
                      <td className="py-2 pl-2 font-mono text-text-secondary">{team.finalStanding || idx + 1}</td>
                      <td className="py-2">
                        <p className="text-white font-display font-semibold text-sm">{team.ownerName || team.teamName}</p>
                        {team.teamName && team.teamName !== team.ownerName && (
                          <p className="text-xs text-text-secondary">{team.teamName}</p>
                        )}
                      </td>
                      <td className="py-2 text-center font-mono text-green-400">{team.wins}</td>
                      <td className="py-2 text-center font-mono text-red-400">{team.losses}</td>
                      <td className="py-2 text-center font-mono text-text-secondary">{team.ties || 0}</td>
                      <td className="py-2 text-right font-mono text-white">{team.pointsFor?.toFixed(1)}</td>
                      <td className="py-2 text-right font-mono text-text-secondary">{team.pointsAgainst?.toFixed(1)}</td>
                      <td className="py-2 text-right pr-2">
                        {playoff.text && (
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${playoff.color}`}>
                            {playoff.text}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Head-to-Head Tab ──────────────────────────────────────────────────────────
const HeadToHeadTab = ({ history }) => {
  const [ownerA, setOwnerA] = useState('')
  const [ownerB, setOwnerB] = useState('')

  // Get all unique owner names
  const owners = useMemo(() => {
    if (!history?.seasons) return []
    const nameSet = new Set()
    for (const teams of Object.values(history.seasons)) {
      for (const t of teams) {
        nameSet.add(t.ownerName || t.teamName)
      }
    }
    return Array.from(nameSet).sort()
  }, [history])

  // Build H2H matchup results from weeklyScores
  const h2hData = useMemo(() => {
    if (!ownerA || !ownerB || ownerA === ownerB || !history?.seasons) return null

    const matchups = []
    let winsA = 0, winsB = 0, ties = 0
    let totalPtsA = 0, totalPtsB = 0

    for (const [year, teams] of Object.entries(history.seasons)) {
      const teamA = teams.find(t => (t.ownerName || t.teamName) === ownerA)
      const teamB = teams.find(t => (t.ownerName || t.teamName) === ownerB)
      if (!teamA || !teamB) continue

      const scoresA = teamA.weeklyScores || []
      const scoresB = teamB.weeklyScores || []

      // Match by matchupId — if two teams share a matchupId in the same week they played each other
      for (const weekA of scoresA) {
        const weekB = scoresB.find(w => w.week === weekA.week && w.matchupId === weekA.matchupId)
        if (!weekB) continue

        const ptsA = weekA.points || 0
        const ptsB = weekB.points || 0
        totalPtsA += ptsA
        totalPtsB += ptsB

        let winner = null
        if (ptsA > ptsB) { winsA++; winner = ownerA }
        else if (ptsB > ptsA) { winsB++; winner = ownerB }
        else { ties++ }

        matchups.push({ year: parseInt(year), week: weekA.week, ptsA, ptsB, winner })
      }
    }

    matchups.sort((a, b) => b.year - a.year || b.week - a.week)

    return { winsA, winsB, ties, totalPtsA, totalPtsB, matchups }
  }, [ownerA, ownerB, history])

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-display font-bold text-white mb-4">Select Two Managers</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1">Manager 1</label>
            <select
              value={ownerA}
              onChange={e => setOwnerA(e.target.value)}
              className="w-full px-3 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
            >
              <option value="">Select...</option>
              {owners.filter(o => o !== ownerB).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1">Manager 2</label>
            <select
              value={ownerB}
              onChange={e => setOwnerB(e.target.value)}
              className="w-full px-3 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
            >
              <option value="">Select...</option>
              {owners.filter(o => o !== ownerA).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {h2hData && (
        <>
          {/* Summary */}
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-text-secondary font-mono mb-1">{ownerA}</p>
                <p className={`text-3xl font-mono font-bold ${h2hData.winsA > h2hData.winsB ? 'text-green-400' : 'text-white'}`}>
                  {h2hData.winsA}
                </p>
                <p className="text-xs text-text-secondary font-mono mt-1">{h2hData.totalPtsA.toFixed(1)} pts</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-xs text-text-secondary font-mono mb-1">vs</p>
                <p className="text-lg font-mono text-text-secondary">{h2hData.ties > 0 ? `${h2hData.ties}T` : '—'}</p>
                <p className="text-xs text-text-secondary font-mono mt-1">{h2hData.matchups.length} games</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary font-mono mb-1">{ownerB}</p>
                <p className={`text-3xl font-mono font-bold ${h2hData.winsB > h2hData.winsA ? 'text-green-400' : 'text-white'}`}>
                  {h2hData.winsB}
                </p>
                <p className="text-xs text-text-secondary font-mono mt-1">{h2hData.totalPtsB.toFixed(1)} pts</p>
              </div>
            </div>
          </Card>

          {/* Matchup History */}
          {h2hData.matchups.length > 0 ? (
            <Card>
              <h3 className="font-display font-bold text-white mb-3">Matchup History</h3>
              <div className="space-y-1">
                {h2hData.matchups.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dark-tertiary/30 text-sm"
                  >
                    <span className="font-mono text-text-secondary w-20">{m.year} W{m.week}</span>
                    <div className="flex-1 flex items-center justify-center gap-4">
                      <span className={`font-mono ${m.winner === ownerA ? 'text-green-400 font-bold' : 'text-white'}`}>
                        {m.ptsA.toFixed(1)}
                      </span>
                      <span className="text-text-secondary text-xs">—</span>
                      <span className={`font-mono ${m.winner === ownerB ? 'text-green-400 font-bold' : 'text-white'}`}>
                        {m.ptsB.toFixed(1)}
                      </span>
                    </div>
                    <span className={`text-xs font-mono w-20 text-right ${m.winner ? 'text-green-400' : 'text-text-secondary'}`}>
                      {m.winner || 'TIE'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <p className="text-text-secondary">No head-to-head matchups found between these managers.</p>
            </Card>
          )}
        </>
      )}

      {!h2hData && ownerA && ownerB && ownerA === ownerB && (
        <Card className="text-center py-8">
          <p className="text-text-secondary">Select two different managers to view their rivalry.</p>
        </Card>
      )}
    </div>
  )
}

// ─── Draft History Tab ─────────────────────────────────────────────────────────
const DraftHistoryTab = ({ history }) => {
  const years = history?.seasons ? Object.keys(history.seasons).sort((a, b) => b - a) : []
  const [selectedYear, setSelectedYear] = useState(years[0] || '')

  // Get draft data for selected year
  const draftInfo = useMemo(() => {
    if (!selectedYear || !history?.seasons?.[selectedYear]) return null
    const teams = history.seasons[selectedYear]
    // draftData is the same across all teams for a season (it's league-level)
    const teamWithDraft = teams.find(t => t.draftData?.picks?.length > 0)
    if (!teamWithDraft?.draftData) return null

    const draft = teamWithDraft.draftData
    // Build owner map from rosterId → ownerName
    const rosterMap = {}
    for (const t of teams) {
      // The rosterId in the draft picks corresponds to the team's position in the roster array
      // We need to map them using the index or a lookup
      rosterMap[teams.indexOf(t) + 1] = t.ownerName || t.teamName
    }

    // Group picks by round
    const rounds = {}
    for (const pick of draft.picks || []) {
      if (!rounds[pick.round]) rounds[pick.round] = []
      rounds[pick.round].push({
        ...pick,
        ownerName: rosterMap[pick.rosterId] || `Team ${pick.rosterId}`,
      })
    }

    // Sort picks within each round
    for (const round of Object.values(rounds)) {
      round.sort((a, b) => a.pick - b.pick)
    }

    return { type: draft.type, totalRounds: draft.rounds, rounds }
  }, [selectedYear, history])

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-text-secondary font-mono">Season:</span>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors ${
                selectedYear === y ? 'bg-accent-gold text-dark-primary' : 'bg-dark-tertiary text-text-secondary hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </Card>

      {/* Draft board */}
      {draftInfo ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">
              {selectedYear} Draft
            </h3>
            {draftInfo.type && (
              <span className="text-xs font-mono text-text-secondary bg-dark-tertiary px-2 py-1 rounded uppercase">
                {draftInfo.type}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(draftInfo.rounds).map(([round, picks]) => (
              <div key={round}>
                <h4 className="text-xs font-mono font-bold text-accent-gold uppercase tracking-wider mb-2">
                  Round {round}
                </h4>
                <div className="space-y-1">
                  {picks.map((pick, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-dark-tertiary/30"
                    >
                      <span className="text-xs font-mono text-text-secondary w-8">
                        {pick.pick}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white font-display font-semibold">
                          {pick.playerName || `Player ${pick.playerId}`}
                        </span>
                        {pick.position && (
                          <span className="ml-2 text-xs font-mono text-text-secondary">{pick.position}</span>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary font-mono">{pick.ownerName}</span>
                      {pick.amount && (
                        <span className="text-xs font-mono text-accent-gold">${pick.amount}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <p className="text-text-secondary">
            {selectedYear ? 'No draft data available for this season.' : 'Select a season to view draft results.'}
          </p>
        </Card>
      )}
    </div>
  )
}

// ─── Custom Data Tab ──────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  standings: { label: 'Standings', color: 'bg-blue-500/20 text-blue-400' },
  records: { label: 'Records', color: 'bg-accent-gold/20 text-accent-gold' },
  awards: { label: 'Awards', color: 'bg-purple-500/20 text-purple-400' },
  trophies: { label: 'Trophies', color: 'bg-yellow-500/20 text-yellow-400' },
  draft_history: { label: 'Draft History', color: 'bg-green-500/20 text-green-400' },
  transactions: { label: 'Transactions', color: 'bg-cyan-500/20 text-cyan-400' },
  custom_stats: { label: 'Custom Stats', color: 'bg-pink-500/20 text-pink-400' },
  punishments: { label: 'Punishments', color: 'bg-red-500/20 text-red-400' },
  nicknames: { label: 'Nicknames', color: 'bg-orange-500/20 text-orange-400' },
  other: { label: 'Other', color: 'bg-gray-500/20 text-gray-400' },
}

const SOURCE_BADGES = {
  spreadsheet: 'Custom',
  google_sheets: 'Sheets',
  website: 'Website',
}

const CustomDataTab = ({ leagueId }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    api.getCustomLeagueData(leagueId)
      .then(res => setData(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leagueId])

  const handleDelete = async (dataId) => {
    if (!confirm('Delete this custom data record?')) return
    try {
      await api.deleteCustomData(dataId)
      setData(prev => prev.filter(d => d.id !== dataId))
    } catch {
      // Ignore errors
    }
  }

  // Group by category
  const grouped = useMemo(() => {
    const groups = {}
    for (const d of data) {
      if (!groups[d.dataCategory]) groups[d.dataCategory] = []
      groups[d.dataCategory].push(d)
    }
    return groups
  }, [data])

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-dark-tertiary rounded w-1/3 mb-4" />
        <div className="h-4 bg-dark-tertiary rounded w-2/3" />
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-3xl mb-3">&#128203;</div>
        <h3 className="font-display font-bold text-white mb-2">No Custom Data Yet</h3>
        <p className="text-text-secondary text-sm mb-4">
          Import your league's custom records, awards, punishments, and more.
        </p>
        <Link
          to={`/import/custom?leagueId=${leagueId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-accent-gold/90"
        >
          Import Custom Data
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary font-mono">
          {data.length} record{data.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} categor{Object.keys(grouped).length !== 1 ? 'ies' : 'y'}
        </p>
        <Link
          to={`/import/custom?leagueId=${leagueId}`}
          className="text-accent-gold text-sm hover:underline"
        >
          Import More
        </Link>
      </div>

      {Object.entries(grouped).map(([category, items]) => {
        const catInfo = CATEGORY_LABELS[category] || CATEGORY_LABELS.other
        return (
          <Card key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-mono ${catInfo.color}`}>
                {catInfo.label}
              </span>
              <span className="text-xs text-text-secondary font-mono">
                {items.length} record{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className="bg-dark-tertiary/30 rounded-lg p-3"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-2">
                      {item.seasonYear && (
                        <span className="text-xs font-mono text-accent-gold">{item.seasonYear}</span>
                      )}
                      <span className="text-sm text-white font-display">
                        {item.sourceFileName || item.sourceType}
                      </span>
                      <span className="text-xs font-mono text-text-secondary bg-dark-tertiary px-1.5 py-0.5 rounded">
                        {SOURCE_BADGES[item.sourceType] || 'Custom'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary font-mono">
                        {item.data?.rows?.length || 0} rows
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                        className="text-text-secondary hover:text-red-400 text-xs"
                        title="Delete"
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>

                  {expandedId === item.id && item.data?.rows && (
                    <div className="mt-3 pt-3 border-t border-dark-tertiary overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-dark-tertiary">
                            {Object.keys(item.data.rows[0] || {}).map(key => (
                              <th key={key} className="text-left text-text-secondary py-1 pr-3">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.data.rows.slice(0, 20).map((row, idx) => (
                            <tr key={idx} className="border-b border-dark-tertiary/30">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="py-1 pr-3 text-white">
                                  {val != null ? String(val) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {item.data.rows.length > 20 && (
                        <p className="text-xs text-text-secondary mt-2">
                          Showing 20 of {item.data.rows.length} rows
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Main LeagueVault Component ────────────────────────────────────────────────
const LeagueVault = () => {
  const { leagueId } = useParams()
  const { history, loading, error } = useLeagueHistory(leagueId)
  const [tab, setTab] = useState('timeline')

  const allTimeRecords = useMemo(() => {
    if (!history?.seasons) return null
    const records = {
      championships: {},
      totalWins: {},
      totalLosses: {},
      totalPF: {},
      highestPF: { value: 0 },
      highestWeek: { value: 0 },
      biggestBlowout: { value: 0 },
      longestStreak: { value: 0 },
      mostChampionships: { name: '', count: 0 },
    }

    for (const [year, teams] of Object.entries(history.seasons)) {
      for (const t of teams) {
        const name = t.ownerName || t.teamName
        if (!records.championships[name]) records.championships[name] = 0
        if (!records.totalWins[name]) records.totalWins[name] = 0
        if (!records.totalLosses[name]) records.totalLosses[name] = 0
        if (!records.totalPF[name]) records.totalPF[name] = 0

        if (t.playoffResult === 'champion') records.championships[name]++
        records.totalWins[name] += t.wins || 0
        records.totalLosses[name] += t.losses || 0
        records.totalPF[name] += t.pointsFor || 0

        if (t.pointsFor > records.highestPF.value) {
          records.highestPF = { value: t.pointsFor, name, year: parseInt(year) }
        }

        // Scan weekly scores for records
        const weekly = t.weeklyScores || []
        for (const w of weekly) {
          if (w.points > records.highestWeek.value) {
            records.highestWeek = { value: w.points, name, year: parseInt(year), week: w.week }
          }
          const margin = Math.abs((w.points || 0) - (w.opponentPoints || 0))
          if (margin > records.biggestBlowout.value && w.opponentPoints > 0) {
            const winner = w.points > w.opponentPoints ? name : null
            if (winner) {
              records.biggestBlowout = { value: margin, name: winner, year: parseInt(year), week: w.week, score: `${w.points.toFixed(1)}-${w.opponentPoints.toFixed(1)}` }
            }
          }
        }

        // Compute longest win streak from weekly scores
        let streak = 0
        for (const w of weekly) {
          if (w.points > w.opponentPoints) {
            streak++
            if (streak > records.longestStreak.value) {
              records.longestStreak = { value: streak, name, year: parseInt(year) }
            }
          } else {
            streak = 0
          }
        }
      }
    }

    for (const [name, count] of Object.entries(records.championships)) {
      if (count > records.mostChampionships.count) {
        records.mostChampionships = { name, count }
      }
    }

    const allOwners = new Set([...Object.keys(records.totalWins)])
    records.allTime = Array.from(allOwners).map(name => ({
      name,
      wins: records.totalWins[name] || 0,
      losses: records.totalLosses[name] || 0,
      championships: records.championships[name] || 0,
      totalPF: records.totalPF[name] || 0,
      winPct: records.totalWins[name] / Math.max(1, records.totalWins[name] + records.totalLosses[name]),
    })).sort((a, b) => b.winPct - a.winPct)

    return records
  }, [history])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-dark-tertiary rounded w-1/3" />
              <div className="h-4 bg-dark-tertiary rounded w-1/2" />
              <Card className="h-48" />
              <Card className="h-48" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <Link to="/dashboard" className="text-accent-gold hover:text-accent-gold/80">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    )
  }

  const years = history?.seasons ? Object.keys(history.seasons).sort((a, b) => b - a) : []

  const handleExport = useCallback(() => {
    if (!history?.seasons) return
    const rows = []
    for (const [year, teams] of Object.entries(history.seasons)) {
      for (const t of teams) {
        rows.push({
          Season: year,
          Rank: t.finalStanding || '',
          Manager: t.ownerName || t.teamName || '',
          Team: t.teamName || '',
          Wins: t.wins || 0,
          Losses: t.losses || 0,
          Ties: t.ties || 0,
          PointsFor: t.pointsFor?.toFixed(1) || '0',
          PointsAgainst: t.pointsAgainst?.toFixed(1) || '0',
          PlayoffResult: t.playoffResult || '',
        })
      }
    }
    if (rows.length > 0) {
      downloadCSV(`league-vault-${leagueId}.csv`, rows)
    }
  }, [history, leagueId])

  const TABS = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'records', label: 'Records' },
    { id: 'h2h', label: 'H2H' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'custom', label: 'Custom' },
  ]

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to League
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mb-1">
                  League Vault
                </h1>
                <p className="text-text-secondary">
                  {history?.totalSeasons || 0} season{(history?.totalSeasons || 0) !== 1 ? 's' : ''} of history
                </p>
              </div>
              {years.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-text-secondary bg-dark-tertiary rounded-lg hover:text-white hover:bg-dark-tertiary/80 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-dark-secondary/50 rounded-lg p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-display font-bold transition-colors ${
                  tab === t.id ? 'bg-dark-tertiary text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Timeline Tab */}
          {tab === 'timeline' && (
            <div>
              {years.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-text-secondary mb-4">No history imported yet.</p>
                  <Link to="/import" className="text-accent-gold hover:text-accent-gold/80 font-display font-bold">
                    Import League History
                  </Link>
                </Card>
              ) : (
                years.map(year => (
                  <SeasonCard key={year} year={year} teams={history.seasons[year]} />
                ))
              )}
            </div>
          )}

          {/* Records Tab */}
          {tab === 'records' && allTimeRecords && (
            <div className="space-y-4">
              {/* Record cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Seasons</p>
                  <p className="text-2xl font-mono font-bold text-accent-gold">{years.length}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Most Titles</p>
                  <p className="text-lg font-display font-bold text-white truncate">{allTimeRecords.mostChampionships.name || '—'}</p>
                  {allTimeRecords.mostChampionships.count > 0 && (
                    <p className="text-xs font-mono text-accent-gold">{allTimeRecords.mostChampionships.count}x 🏆</p>
                  )}
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Best Season</p>
                  <p className="text-lg font-mono font-bold text-white">{allTimeRecords.highestPF.value?.toFixed(1) || '—'}</p>
                  {allTimeRecords.highestPF.name && (
                    <p className="text-xs text-text-secondary truncate">{allTimeRecords.highestPF.name} ({allTimeRecords.highestPF.year})</p>
                  )}
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Best Week</p>
                  <p className="text-lg font-mono font-bold text-white">{allTimeRecords.highestWeek.value?.toFixed(1) || '—'}</p>
                  {allTimeRecords.highestWeek.name && (
                    <p className="text-xs text-text-secondary truncate">{allTimeRecords.highestWeek.name} ({allTimeRecords.highestWeek.year} W{allTimeRecords.highestWeek.week})</p>
                  )}
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Biggest Blowout</p>
                  <p className="text-lg font-mono font-bold text-white">{allTimeRecords.biggestBlowout.value?.toFixed(1) || '—'}</p>
                  {allTimeRecords.biggestBlowout.name && (
                    <p className="text-xs text-text-secondary truncate">{allTimeRecords.biggestBlowout.name} ({allTimeRecords.biggestBlowout.score})</p>
                  )}
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-text-secondary font-mono uppercase mb-1">Win Streak</p>
                  <p className="text-lg font-mono font-bold text-white">{allTimeRecords.longestStreak.value || '—'}</p>
                  {allTimeRecords.longestStreak.name && (
                    <p className="text-xs text-text-secondary truncate">{allTimeRecords.longestStreak.name} ({allTimeRecords.longestStreak.year})</p>
                  )}
                </Card>
              </div>

              {/* All-Time Standings */}
              <Card>
                <h3 className="font-display font-bold text-white mb-3">All-Time Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                        <th className="text-left pb-2">#</th>
                        <th className="text-left pb-2">Manager</th>
                        <th className="text-center pb-2">W</th>
                        <th className="text-center pb-2">L</th>
                        <th className="text-center pb-2">Win%</th>
                        <th className="text-right pb-2">Total PF</th>
                        <th className="text-center pb-2">Titles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTimeRecords.allTime?.map((owner, idx) => (
                        <tr key={owner.name} className="border-t border-dark-tertiary/50">
                          <td className="py-2 font-mono text-text-secondary">{idx + 1}</td>
                          <td className="py-2 font-display font-semibold text-white">{owner.name}</td>
                          <td className="py-2 text-center font-mono text-green-400">{owner.wins}</td>
                          <td className="py-2 text-center font-mono text-red-400">{owner.losses}</td>
                          <td className="py-2 text-center font-mono text-white">{(owner.winPct * 100).toFixed(1)}%</td>
                          <td className="py-2 text-right font-mono text-text-secondary">{owner.totalPF.toFixed(1)}</td>
                          <td className="py-2 text-center font-mono text-accent-gold">
                            {owner.championships > 0 ? `${owner.championships}x 🏆` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* H2H Tab */}
          {tab === 'h2h' && <HeadToHeadTab history={history} />}

          {/* Drafts Tab */}
          {tab === 'drafts' && <DraftHistoryTab history={history} />}

          {/* Custom Data Tab */}
          {tab === 'custom' && <CustomDataTab leagueId={leagueId} />}
        </div>
      </main>
      <LeagueChat leagueId={leagueId} pageContext="vault" />
    </div>
  )
}

export default LeagueVault
