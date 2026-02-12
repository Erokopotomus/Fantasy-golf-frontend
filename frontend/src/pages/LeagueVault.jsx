import { useState, useMemo, useCallback, useEffect, Component } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/common/Card'
import { useLeagueHistory } from '../hooks/useImports'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import LeagueChat from '../components/ai/LeagueChat'

// Error boundary to catch rendering crashes
class VaultErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-primary pt-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h2 className="text-red-400 font-bold text-lg mb-2">League Vault Error</h2>
              <p className="text-red-300 text-sm font-mono whitespace-pre-wrap break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
              <p className="text-red-300/50 text-xs font-mono mt-2 whitespace-pre-wrap break-all">
                {this.state.error?.stack?.slice(0, 500)}
              </p>
              <Link to="/leagues" className="inline-block mt-4 text-accent-gold hover:underline text-sm">
                Back to Leagues
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
  third_place: { text: '3rd Place', color: 'text-blue-400 bg-blue-500/20' },
  semifinal: { text: 'Semis', color: 'text-blue-400 bg-blue-500/20' },
  playoffs: { text: 'Playoffs', color: 'text-green-400 bg-green-500/20' },
  eliminated: { text: '', color: '' },
  missed: { text: '', color: '' },
}

// ─── Season Timeline Card ─────────────────────────────────────────────────────
const SeasonCard = ({ year, teams, isCommissioner, onDeleteEntries }) => {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const champion = teams.find(t => t.playoffResult === 'champion')

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === teams.length) setSelected(new Set())
    else setSelected(new Set(teams.map(t => t.id).filter(Boolean)))
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    const count = ids.length
    if (!confirm(`Are you sure you want to delete ${count} entr${count === 1 ? 'y' : 'ies'} from ${year}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await onDeleteEntries(ids)
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

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
          {/* Edit mode toggle */}
          {isCommissioner && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => { setEditing(e => !e); setSelected(new Set()) }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${editing ? 'bg-rose/15 text-rose' : 'text-text-secondary hover:text-white hover:bg-dark-tertiary'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          )}
          {/* Bulk delete bar */}
          {editing && selected.size > 0 && (
            <div className="mb-3 flex items-center justify-between bg-rose/10 border border-rose/30 rounded-lg px-3 py-2">
              <span className="text-sm text-rose font-mono">{selected.size} selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-rose text-white rounded-lg text-xs font-display font-bold hover:bg-rose/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : `Delete ${selected.size} Entr${selected.size === 1 ? 'y' : 'ies'}`}
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                  {editing && (
                    <th className="w-8 pb-2 pl-2">
                      <input
                        type="checkbox"
                        checked={selected.size === teams.length && teams.length > 0}
                        onChange={toggleAll}
                        className="accent-[#D4607A]"
                      />
                    </th>
                  )}
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
                  const isEmpty = !team.wins && !team.losses && !team.pointsFor
                  const isChecked = selected.has(team.id)
                  return (
                    <tr
                      key={team.id || idx}
                      className={`border-t border-dark-tertiary/50 hover:bg-dark-tertiary/30 ${isEmpty ? 'opacity-40' : ''} ${editing && isChecked ? 'bg-rose/5' : ''}`}
                    >
                      {editing && (
                        <td className="py-2 pl-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(team.id)}
                            className="accent-[#D4607A]"
                          />
                        </td>
                      )}
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

// ─── Owner Profile Tab ────────────────────────────────────────────────────────
const OwnerProfileTab = ({ history }) => {
  const [selectedOwner, setSelectedOwner] = useState('')
  const [expandedYear, setExpandedYear] = useState(null)

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

  const profileData = useMemo(() => {
    if (!selectedOwner || !history?.seasons) return null

    // a) Matchup lookup: year-week-matchupId → [{ name, points }]
    const matchupLookup = {}
    for (const [year, teams] of Object.entries(history.seasons)) {
      for (const t of teams) {
        const name = t.ownerName || t.teamName
        for (const w of (t.weeklyScores || [])) {
          if (w.matchupId != null) {
            const key = `${year}-${w.week}-${w.matchupId}`
            if (!matchupLookup[key]) matchupLookup[key] = []
            matchupLookup[key].push({ name, points: w.points || 0 })
          }
        }
      }
    }

    // Collect this owner's seasons
    const ownerSeasons = []
    for (const [year, teams] of Object.entries(history.seasons)) {
      const team = teams.find(t => (t.ownerName || t.teamName) === selectedOwner)
      if (team) ownerSeasons.push({ year: parseInt(year), ...team })
    }
    ownerSeasons.sort((a, b) => b.year - a.year)

    if (ownerSeasons.length === 0) return null

    // b) Career summary
    let totalW = 0, totalL = 0, totalT = 0, totalPF = 0, totalPA = 0
    let championships = 0, runnerUps = 0, thirdPlaces = 0, playoffApps = 0, lastPlaces = 0

    for (const s of ownerSeasons) {
      totalW += s.wins || 0
      totalL += s.losses || 0
      totalT += s.ties || 0
      totalPF += s.pointsFor || 0
      totalPA += s.pointsAgainst || 0
      if (s.playoffResult === 'champion') championships++
      if (s.playoffResult === 'runner_up') runnerUps++
      if (s.playoffResult === 'third_place') thirdPlaces++
      if (['champion', 'runner_up', 'third_place', 'semifinal', 'playoffs'].includes(s.playoffResult)) playoffApps++
      // Last place = highest finalStanding in the season
      const teamsInYear = history.seasons[String(s.year)] || []
      const maxStanding = Math.max(...teamsInYear.map(t => t.finalStanding || 0))
      if (s.finalStanding && s.finalStanding === maxStanding && maxStanding > 1) lastPlaces++
    }

    const totalGames = totalW + totalL + totalT
    const winPct = totalGames > 0 ? (totalW / totalGames * 100).toFixed(1) : '0.0'

    // c) Career highlights
    let bestRecord = null, highestAvg = null, lowestAvg = null
    let highestWeek = null, lowestWeek = null
    let biggestWin = null, biggestLoss = null

    for (const s of ownerSeasons) {
      const games = (s.wins || 0) + (s.losses || 0) + (s.ties || 0)
      const wp = games > 0 ? (s.wins || 0) / games : 0
      if (!bestRecord || wp > bestRecord.wp || (wp === bestRecord.wp && (s.wins || 0) > bestRecord.wins)) {
        bestRecord = { wp, wins: s.wins || 0, losses: s.losses || 0, ties: s.ties || 0, teamName: s.teamName, year: s.year }
      }

      const weekly = s.weeklyScores || []
      if (weekly.length > 0) {
        const weekPts = weekly.map(w => w.points || 0).filter(p => p > 0)
        if (weekPts.length > 0) {
          const avg = weekPts.reduce((a, b) => a + b, 0) / weekPts.length
          if (!highestAvg || avg > highestAvg.avg) {
            highestAvg = { avg, teamName: s.teamName, year: s.year }
          }
          if (!lowestAvg || avg < lowestAvg.avg) {
            lowestAvg = { avg, teamName: s.teamName, year: s.year }
          }
        }
      }

      for (const w of weekly) {
        const pts = w.points || 0
        if (pts > 0 && (!highestWeek || pts > highestWeek.pts)) {
          highestWeek = { pts, year: s.year, week: w.week }
        }
        if (pts > 0 && (!lowestWeek || pts < lowestWeek.pts)) {
          lowestWeek = { pts, year: s.year, week: w.week }
        }

        // Find opponent via matchup lookup
        const matchKey = w.matchupId != null ? `${s.year}-${w.week}-${w.matchupId}` : null
        const opponents = matchKey ? matchupLookup[matchKey] : null
        const opp = opponents?.find(o => o.name !== selectedOwner)
        const oppPts = opp ? opp.points : (w.opponentPoints || 0)
        const oppName = opp ? opp.name : null

        if (oppPts > 0 || pts > 0) {
          const margin = pts - oppPts
          if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) {
            biggestWin = { margin, opponent: oppName || '?', year: s.year, week: w.week, pf: pts, pa: oppPts }
          }
          if (margin < 0 && (!biggestLoss || margin < biggestLoss.margin)) {
            biggestLoss = { margin, opponent: oppName || '?', year: s.year, week: w.week, pf: pts, pa: oppPts }
          }
        }
      }
    }

    const highlights = [
      { label: 'Best Record', value: bestRecord ? `${bestRecord.wins}-${bestRecord.losses}${bestRecord.ties ? `-${bestRecord.ties}` : ''} (${(bestRecord.wp * 100).toFixed(0)}%)` : '—', context: bestRecord ? `${bestRecord.teamName} · ${bestRecord.year}` : '' },
      { label: 'Highest Season Avg', value: highestAvg ? highestAvg.avg.toFixed(1) : '—', context: highestAvg ? `${highestAvg.teamName} · ${highestAvg.year}` : '' },
      { label: 'Lowest Season Avg', value: lowestAvg ? lowestAvg.avg.toFixed(1) : '—', context: lowestAvg ? `${lowestAvg.teamName} · ${lowestAvg.year}` : '' },
      { label: 'Highest Weekly Score', value: highestWeek ? highestWeek.pts.toFixed(1) : '—', context: highestWeek ? `${highestWeek.year} Week ${highestWeek.week}` : '' },
      { label: 'Lowest Weekly Score', value: lowestWeek ? lowestWeek.pts.toFixed(1) : '—', context: lowestWeek ? `${lowestWeek.year} Week ${lowestWeek.week}` : '' },
      { label: 'Biggest Win', value: biggestWin ? `+${biggestWin.margin.toFixed(1)}` : '—', context: biggestWin ? `vs ${biggestWin.opponent} · ${biggestWin.year} W${biggestWin.week} (${biggestWin.pf.toFixed(1)}-${biggestWin.pa.toFixed(1)})` : '', color: 'text-green-400' },
      { label: 'Biggest Loss', value: biggestLoss ? biggestLoss.margin.toFixed(1) : '—', context: biggestLoss ? `vs ${biggestLoss.opponent} · ${biggestLoss.year} W${biggestLoss.week} (${biggestLoss.pf.toFixed(1)}-${biggestLoss.pa.toFixed(1)})` : '', color: 'text-red-400' },
    ]

    // d) H2H records vs all opponents
    const h2hMap = {} // opponentName → { w, l, t, pf, pa }
    for (const s of ownerSeasons) {
      for (const w of (s.weeklyScores || [])) {
        const matchKey = w.matchupId != null ? `${s.year}-${w.week}-${w.matchupId}` : null
        const opponents = matchKey ? matchupLookup[matchKey] : null
        const opp = opponents?.find(o => o.name !== selectedOwner)
        if (!opp) continue

        if (!h2hMap[opp.name]) h2hMap[opp.name] = { w: 0, l: 0, t: 0, pf: 0, pa: 0 }
        const pts = w.points || 0
        h2hMap[opp.name].pf += pts
        h2hMap[opp.name].pa += opp.points
        if (pts > opp.points) h2hMap[opp.name].w++
        else if (pts < opp.points) h2hMap[opp.name].l++
        else h2hMap[opp.name].t++
      }
    }
    const h2hRecords = Object.entries(h2hMap)
      .map(([name, r]) => ({ name, ...r, margin: r.pf - r.pa }))
      .sort((a, b) => b.w - a.w || a.l - b.l)

    // e) Season-by-season table
    const seasonTable = ownerSeasons.map(s => {
      const weekly = (s.weeklyScores || []).filter(w => (w.points || 0) > 0)
      const pfAvg = weekly.length > 0 ? (weekly.reduce((sum, w) => sum + (w.points || 0), 0) / weekly.length) : 0
      const paScores = weekly.map(w => {
        const matchKey = w.matchupId != null ? `${s.year}-${w.week}-${w.matchupId}` : null
        const opponents = matchKey ? matchupLookup[matchKey] : null
        const opp = opponents?.find(o => o.name !== selectedOwner)
        return opp ? opp.points : (w.opponentPoints || 0)
      }).filter(p => p > 0)
      const paAvg = paScores.length > 0 ? paScores.reduce((a, b) => a + b, 0) / paScores.length : 0

      // End-of-season streak
      let streak = 0, streakType = ''
      for (let i = weekly.length - 1; i >= 0; i--) {
        const w = weekly[i]
        const matchKey = w.matchupId != null ? `${s.year}-${w.week}-${w.matchupId}` : null
        const opponents = matchKey ? matchupLookup[matchKey] : null
        const opp = opponents?.find(o => o.name !== selectedOwner)
        const oppPts = opp ? opp.points : (w.opponentPoints || 0)
        const won = (w.points || 0) > oppPts
        const lost = (w.points || 0) < oppPts
        const result = won ? 'W' : lost ? 'L' : 'T'
        if (streak === 0) { streakType = result; streak = 1 }
        else if (result === streakType) streak++
        else break
      }

      return {
        year: s.year,
        place: s.finalStanding,
        teamName: s.teamName,
        record: `${s.wins || 0}-${s.losses || 0}${s.ties ? `-${s.ties}` : ''}`,
        wins: s.wins || 0,
        losses: s.losses || 0,
        ties: s.ties || 0,
        pf: s.pointsFor || 0,
        pa: s.pointsAgainst || 0,
        pfAvg,
        paAvg,
        streak: streak > 0 ? `${streakType}${streak}` : '—',
        playoffResult: s.playoffResult,
      }
    })

    // f) Weekly matchup log grouped by year
    const weeklyLog = {}
    for (const s of ownerSeasons) {
      const weeks = []
      for (const w of (s.weeklyScores || [])) {
        const pts = w.points || 0
        if (pts === 0) continue
        const matchKey = w.matchupId != null ? `${s.year}-${w.week}-${w.matchupId}` : null
        const opponents = matchKey ? matchupLookup[matchKey] : null
        const opp = opponents?.find(o => o.name !== selectedOwner)
        const oppPts = opp ? opp.points : (w.opponentPoints || 0)
        const oppName = opp ? opp.name : '?'
        const result = pts > oppPts ? 'W' : pts < oppPts ? 'L' : 'T'
        weeks.push({ week: w.week, result, opponent: oppName, pf: pts, pa: oppPts, margin: pts - oppPts })
      }
      if (weeks.length > 0) {
        weeks.sort((a, b) => a.week - b.week)
        weeklyLog[s.year] = weeks
      }
    }

    return {
      summary: { totalW, totalL, totalT, winPct, totalPF, totalPA, championships, runnerUps, thirdPlaces, playoffApps, lastPlaces, seasons: ownerSeasons.length },
      highlights,
      h2hRecords,
      seasonTable,
      weeklyLog,
    }
  }, [selectedOwner, history])

  const RESULT_BADGE = {
    W: 'bg-green-500/20 text-green-400',
    L: 'bg-red-500/20 text-red-400',
    T: 'bg-gray-500/20 text-gray-400',
  }

  return (
    <div className="space-y-4">
      {/* Owner selector */}
      <Card>
        <label className="block text-xs text-text-secondary font-mono mb-1">Select a Manager</label>
        <select
          value={selectedOwner}
          onChange={e => { setSelectedOwner(e.target.value); setExpandedYear(null) }}
          className="w-full px-3 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
        >
          <option value="">Select...</option>
          {owners.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Card>

      {!selectedOwner && (
        <Card className="text-center py-8">
          <p className="text-text-secondary">Select a manager to view their career profile.</p>
        </Card>
      )}

      {profileData && (
        <>
          {/* Section 1 — Header Card */}
          <Card>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-display font-bold text-white mb-1">{selectedOwner}</h2>
              <p className="text-sm font-mono text-text-secondary">
                {profileData.summary.totalW}-{profileData.summary.totalL}{profileData.summary.totalT > 0 ? `-${profileData.summary.totalT}` : ''} ({profileData.summary.winPct}%) · {profileData.summary.seasons} season{profileData.summary.seasons !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-dark-tertiary/40 rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-accent-gold">{profileData.summary.championships}</p>
                <p className="text-xs font-mono text-text-secondary mt-1">Titles</p>
              </div>
              <div className="bg-dark-tertiary/40 rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-white">{profileData.summary.runnerUps}</p>
                <p className="text-xs font-mono text-text-secondary mt-1">Runner-Up</p>
              </div>
              <div className="bg-dark-tertiary/40 rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-white">{profileData.summary.thirdPlaces}</p>
                <p className="text-xs font-mono text-text-secondary mt-1">3rd Place</p>
              </div>
              <div className="bg-dark-tertiary/40 rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-white">{profileData.summary.playoffApps}</p>
                <p className="text-xs font-mono text-text-secondary mt-1">Playoffs</p>
              </div>
            </div>
          </Card>

          {/* Section 2 — Career Highlights */}
          <Card>
            <h3 className="font-display font-bold text-white mb-3">Career Highlights</h3>
            <div className="space-y-2">
              {profileData.highlights.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-dark-tertiary/20">
                  <span className="text-sm text-text-secondary">{h.label}</span>
                  <div className="text-right">
                    <span className={`text-sm font-mono font-bold ${h.color || 'text-white'}`}>{h.value}</span>
                    {h.context && <p className="text-xs text-text-secondary">{h.context}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Section 3 — H2H Records */}
          {profileData.h2hRecords.length > 0 && (
            <Card>
              <h3 className="font-display font-bold text-white mb-3">Head-to-Head Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                      <th className="text-left pb-2">Opponent</th>
                      <th className="text-center pb-2">W</th>
                      <th className="text-center pb-2">L</th>
                      <th className="text-center pb-2">T</th>
                      <th className="text-right pb-2">PF</th>
                      <th className="text-right pb-2">PA</th>
                      <th className="text-right pb-2 pr-2">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.h2hRecords.map(r => (
                      <tr key={r.name} className="border-t border-dark-tertiary/50">
                        <td className="py-2 font-display font-semibold text-white">{r.name}</td>
                        <td className="py-2 text-center font-mono text-green-400">{r.w}</td>
                        <td className="py-2 text-center font-mono text-red-400">{r.l}</td>
                        <td className="py-2 text-center font-mono text-text-secondary">{r.t || '—'}</td>
                        <td className="py-2 text-right font-mono text-white">{r.pf.toFixed(1)}</td>
                        <td className="py-2 text-right font-mono text-text-secondary">{r.pa.toFixed(1)}</td>
                        <td className={`py-2 text-right pr-2 font-mono font-bold ${r.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {r.margin >= 0 ? '+' : ''}{r.margin.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Section 4 — Season-by-Season */}
          <Card>
            <h3 className="font-display font-bold text-white mb-3">Season-by-Season</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                    <th className="text-left pb-2">Year</th>
                    <th className="text-center pb-2">#</th>
                    <th className="text-left pb-2">Team</th>
                    <th className="text-center pb-2">W</th>
                    <th className="text-center pb-2">L</th>
                    <th className="text-center pb-2">T</th>
                    <th className="text-right pb-2">PF</th>
                    <th className="text-right pb-2">PA</th>
                    <th className="text-right pb-2">Avg</th>
                    <th className="text-right pb-2 pr-2">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {profileData.seasonTable.map(s => {
                    const playoff = PLAYOFF_LABELS[s.playoffResult] || {}
                    return (
                      <tr key={s.year} className="border-t border-dark-tertiary/50 hover:bg-dark-tertiary/20">
                        <td className="py-2 font-mono font-bold text-accent-gold">{s.year}</td>
                        <td className="py-2 text-center font-mono text-text-secondary">{s.place || '—'}</td>
                        <td className="py-2 font-display text-white text-xs">
                          <span>{s.teamName}</span>
                          {playoff.text && (
                            <span className={`ml-1.5 text-xs font-mono px-1 py-0.5 rounded ${playoff.color}`}>{playoff.text}</span>
                          )}
                        </td>
                        <td className="py-2 text-center font-mono text-green-400">{s.wins}</td>
                        <td className="py-2 text-center font-mono text-red-400">{s.losses}</td>
                        <td className="py-2 text-center font-mono text-text-secondary">{s.ties || '—'}</td>
                        <td className="py-2 text-right font-mono text-white">{s.pf.toFixed(1)}</td>
                        <td className="py-2 text-right font-mono text-text-secondary">{s.pa.toFixed(1)}</td>
                        <td className="py-2 text-right font-mono text-white">{s.pfAvg > 0 ? s.pfAvg.toFixed(1) : '—'}</td>
                        <td className="py-2 text-right pr-2 font-mono text-text-secondary">{s.streak}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-accent-gold/30">
                    <td className="py-2 font-mono font-bold text-accent-gold" colSpan={3}>Career Totals</td>
                    <td className="py-2 text-center font-mono font-bold text-green-400">{profileData.summary.totalW}</td>
                    <td className="py-2 text-center font-mono font-bold text-red-400">{profileData.summary.totalL}</td>
                    <td className="py-2 text-center font-mono font-bold text-text-secondary">{profileData.summary.totalT || '—'}</td>
                    <td className="py-2 text-right font-mono font-bold text-white">{profileData.summary.totalPF.toFixed(1)}</td>
                    <td className="py-2 text-right font-mono font-bold text-text-secondary">{profileData.summary.totalPA.toFixed(1)}</td>
                    <td className="py-2 text-right font-mono font-bold text-white">{profileData.summary.winPct}%</td>
                    <td className="py-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Section 5 — Weekly Matchup Log */}
          {Object.keys(profileData.weeklyLog).length > 0 && (
            <Card>
              <h3 className="font-display font-bold text-white mb-3">Weekly Matchup Log</h3>
              <div className="space-y-1">
                {Object.entries(profileData.weeklyLog)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .map(([year, weeks]) => (
                    <div key={year}>
                      <button
                        onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-dark-tertiary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-accent-gold">{year}</span>
                          <span className="text-xs font-mono text-text-secondary">{weeks.length} weeks</span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-text-secondary transition-transform ${expandedYear === year ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedYear === year && (
                        <div className="ml-2 mb-3 border-l-2 border-dark-tertiary pl-3 space-y-0.5">
                          {weeks.map(w => (
                            <div
                              key={w.week}
                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-dark-tertiary/20 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-text-secondary w-8">W{w.week}</span>
                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${RESULT_BADGE[w.result]}`}>
                                  {w.result}
                                </span>
                                <span className="text-white text-xs font-display">vs {w.opponent}</span>
                              </div>
                              <div className="flex items-center gap-3 font-mono text-xs">
                                <span className="text-white">{w.pf.toFixed(1)}</span>
                                <span className="text-text-secondary">-</span>
                                <span className="text-text-secondary">{w.pa.toFixed(1)}</span>
                                <span className={`w-14 text-right font-bold ${w.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {w.margin >= 0 ? '+' : ''}{w.margin.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
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

// ─── Add Season Modal ─────────────────────────────────────────────────────────
const AddSeasonModal = ({ leagueId, onClose, onAdded }) => {
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [teamCount, setTeamCount] = useState(12)
  const [teams, setTeams] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      ownerName: '', wins: 0, losses: 0, pointsFor: 0, playoffResult: i === 0 ? 'champion' : '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateTeamCount = (count) => {
    const n = Math.max(2, Math.min(20, count))
    setTeamCount(n)
    setTeams(prev => {
      if (n > prev.length) {
        return [...prev, ...Array.from({ length: n - prev.length }, () => ({
          ownerName: '', wins: 0, losses: 0, pointsFor: 0, playoffResult: '',
        }))]
      }
      return prev.slice(0, n)
    })
  }

  const updateTeam = (idx, field, value) => {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const handleSave = async () => {
    const filledTeams = teams.filter(t => t.ownerName.trim())
    if (filledTeams.length === 0) {
      setError('Add at least one team with a name')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = filledTeams.map((t, i) => ({
        ownerName: t.ownerName.trim(),
        teamName: t.ownerName.trim(),
        finalStanding: i + 1,
        wins: parseInt(t.wins) || 0,
        losses: parseInt(t.losses) || 0,
        pointsFor: parseFloat(t.pointsFor) || 0,
        playoffResult: t.playoffResult || null,
      }))
      await api.addManualSeason(leagueId, year, payload)
      onAdded()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-dark-tertiary flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Add Season Manually</h2>
            <p className="text-xs text-text-secondary mt-1">For years before your digital league history</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary font-mono mb-1">Season Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || 2020)}
                className="w-full px-3 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary font-mono mb-1">Number of Teams</label>
              <input
                type="number"
                value={teamCount}
                onChange={e => updateTeamCount(parseInt(e.target.value) || 12)}
                min={2}
                max={20}
                className="w-full px-3 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-mono mb-2">
              Teams (order = final standing, fill in what you know)
            </label>
            <div className="space-y-2">
              {teams.map((team, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary w-5 text-right">{idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Manager name"
                    value={team.ownerName}
                    onChange={e => updateTeam(idx, 'ownerName', e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    placeholder="W"
                    value={team.wins || ''}
                    onChange={e => updateTeam(idx, 'wins', e.target.value)}
                    className="w-12 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    placeholder="L"
                    value={team.losses || ''}
                    onChange={e => updateTeam(idx, 'losses', e.target.value)}
                    className="w-12 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center focus:outline-none focus:border-accent-gold"
                  />
                  <select
                    value={team.playoffResult}
                    onChange={e => updateTeam(idx, 'playoffResult', e.target.value)}
                    className="w-28 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm focus:outline-none focus:border-accent-gold"
                  >
                    <option value="">—</option>
                    <option value="champion">Champion</option>
                    <option value="runner_up">Runner-Up</option>
                    <option value="third_place">3rd Place</option>
                    <option value="playoffs">Playoffs</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-dark-tertiary flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-accent-gold/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Season'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Manage Owners Modal ─────────────────────────────────────────────────────
const ManageOwnersModal = ({ leagueId, allRawNames, existingAliases, onClose, onSaved }) => {
  // Reconstruct groups from existing aliases: { canonicalName → [ownerName, ...] }
  const [groups, setGroups] = useState(() => {
    const g = {}
    for (const a of existingAliases) {
      if (!g[a.canonicalName]) g[a.canonicalName] = new Set()
      g[a.canonicalName].add(a.ownerName)
      g[a.canonicalName].add(a.canonicalName)
    }
    // Convert sets to arrays
    const result = {}
    for (const [canonical, names] of Object.entries(g)) {
      result[canonical] = Array.from(names)
    }
    return result
  })
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Track inactive owners (canonical names that are marked inactive)
  const [inactiveOwners, setInactiveOwners] = useState(() => {
    const s = new Set()
    for (const a of existingAliases) {
      if (a.isActive === false) s.add(a.canonicalName)
    }
    return s
  })

  // Names that are already in a group
  const groupedNames = useMemo(() => {
    const s = new Set()
    for (const names of Object.values(groups)) {
      for (const n of names) s.add(n)
    }
    return s
  }, [groups])

  // Ungrouped names
  const ungrouped = useMemo(() =>
    allRawNames.filter(n => !groupedNames.has(n)).sort()
  , [allRawNames, groupedNames])

  // All resolved owner names (canonical names for groups + ungrouped names)
  const allResolvedOwners = useMemo(() => {
    const owners = new Set([...Object.keys(groups), ...ungrouped])
    return Array.from(owners).sort()
  }, [groups, ungrouped])

  const toggleActive = (name) => {
    setInactiveOwners(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleSelect = (name) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleGroup = () => {
    if (selected.size < 2) return
    const names = Array.from(selected)
    // Default canonical name: longest name (likely most complete)
    const canonical = names.reduce((a, b) => a.length >= b.length ? a : b)
    setGroups(prev => ({ ...prev, [canonical]: names }))
    setSelected(new Set())
  }

  const handleUngroup = (canonical, nameToRemove) => {
    setGroups(prev => {
      const next = { ...prev }
      const remaining = next[canonical].filter(n => n !== nameToRemove)
      if (remaining.length < 2) {
        // If only 1 left, dissolve the group
        delete next[canonical]
      } else {
        next[canonical] = remaining
        // If we removed the canonical, pick new one
        if (nameToRemove === canonical) {
          const newCanonical = remaining[0]
          next[newCanonical] = remaining
          delete next[canonical]
        }
      }
      return next
    })
  }

  const handleDissolveGroup = (canonical) => {
    setGroups(prev => {
      const next = { ...prev }
      delete next[canonical]
      return next
    })
  }

  const updateCanonical = (oldCanonical, newCanonical) => {
    if (!newCanonical.trim() || newCanonical === oldCanonical) return
    setGroups(prev => {
      const next = { ...prev }
      const names = next[oldCanonical]
      delete next[oldCanonical]
      next[newCanonical.trim()] = names
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Build aliases array: aliased names + inactive owner entries
      const aliases = []
      for (const [canonical, names] of Object.entries(groups)) {
        const active = !inactiveOwners.has(canonical)
        for (const name of names) {
          if (name !== canonical || !active) {
            aliases.push({ ownerName: name, canonicalName: canonical, isActive: active })
          }
        }
      }
      // Also save inactive status for ungrouped owners
      for (const name of ungrouped) {
        if (inactiveOwners.has(name)) {
          aliases.push({ ownerName: name, canonicalName: name, isActive: false })
        }
      }
      await api.saveOwnerAliases(leagueId, aliases)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-dark-tertiary flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Manage Owners</h2>
            <p className="text-xs text-text-secondary mt-1">Group names that belong to the same person across seasons</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Existing groups */}
          {Object.entries(groups).length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Grouped</h3>
              <div className="space-y-2">
                {Object.entries(groups).map(([canonical, names]) => (
                  <div key={canonical} className="bg-dark-tertiary/40 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-text-secondary">Display as:</span>
                      <input
                        type="text"
                        value={canonical}
                        onChange={e => updateCanonical(canonical, e.target.value)}
                        className="flex-1 px-2 py-1 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm font-display font-semibold focus:outline-none focus:border-accent-gold"
                      />
                      <button
                        onClick={() => handleDissolveGroup(canonical)}
                        className="text-xs text-text-secondary hover:text-red-400 font-mono"
                        title="Dissolve group"
                      >
                        Ungroup All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {names.map(name => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-dark-primary/50 rounded text-xs text-white font-mono"
                        >
                          {name}
                          <button
                            onClick={() => handleUngroup(canonical, name)}
                            className="text-text-secondary hover:text-red-400 ml-0.5"
                            title="Remove from group"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ungrouped names */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                Ungrouped ({ungrouped.length})
              </h3>
              {selected.size >= 2 && (
                <button
                  onClick={handleGroup}
                  className="px-3 py-1 text-xs font-mono font-bold text-dark-primary bg-gold rounded-lg hover:bg-gold-bright transition-colors"
                >
                  Group Selected ({selected.size})
                </button>
              )}
            </div>
            {ungrouped.length === 0 ? (
              <p className="text-xs text-text-secondary italic">All names are grouped.</p>
            ) : (
              <div className="space-y-1">
                {ungrouped.map(name => (
                  <label
                    key={name}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selected.has(name) ? 'bg-gold/10 border border-gold/30' : 'bg-dark-tertiary/30 border border-transparent hover:bg-dark-tertiary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(name)}
                      onChange={() => toggleSelect(name)}
                      className="accent-[#E8B84D]"
                    />
                    <span className="text-sm text-white font-display">{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Active / Inactive toggles */}
          <div>
            <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
              Active Managers ({allResolvedOwners.length - inactiveOwners.size} of {allResolvedOwners.length})
            </h3>
            <p className="text-xs text-text-secondary mb-2">Inactive managers are hidden from Records by default.</p>
            <div className="space-y-1">
              {allResolvedOwners.map(name => {
                const active = !inactiveOwners.has(name)
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${active ? 'bg-dark-tertiary/30' : 'bg-dark-tertiary/10 opacity-50'}`}
                  >
                    <span className={`text-sm font-display ${active ? 'text-white' : 'text-text-secondary line-through'}`}>{name}</span>
                    <button
                      onClick={() => toggleActive(name)}
                      className={`text-xs font-mono px-2 py-1 rounded transition-colors ${active ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-text-secondary bg-dark-tertiary/30 hover:bg-dark-tertiary/50'}`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Sticky action bar when names are selected */}
        {selected.size >= 2 && (
          <div className="px-5 py-3 border-t border-gold/30 bg-gold/10">
            <button
              onClick={handleGroup}
              className="w-full py-2.5 bg-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-gold-bright transition-colors"
            >
              Group {selected.size} Selected Names
            </button>
          </div>
        )}

        <div className="p-5 border-t border-dark-tertiary bg-dark-secondary flex items-center justify-between">
          <span className="text-xs text-text-secondary font-mono">
            {Object.keys(groups).length} group{Object.keys(groups).length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-gold-bright disabled:opacity-50 shadow-lg shadow-gold/30"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main LeagueVault Component ────────────────────────────────────────────────
const LeagueVault = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { history, loading, error, refetch } = useLeagueHistory(leagueId)
  const [tab, setTab] = useState('timeline')
  const [showAddSeason, setShowAddSeason] = useState(false)
  const [showManageOwners, setShowManageOwners] = useState(false)
  const [aliases, setAliases] = useState([])
  const [league, setLeague] = useState(null)

  // Fetch league info (for commissioner check) and aliases on mount
  useEffect(() => {
    api.getLeague(leagueId).then(res => setLeague(res.league || res)).catch(() => {})
    api.getOwnerAliases(leagueId).then(res => setAliases(res.aliases || [])).catch(() => {})
  }, [leagueId])

  const isCommissioner = league?.ownerId === user?.id

  // Build alias map: rawName → canonicalName
  const aliasMap = useMemo(() => {
    const map = {}
    for (const a of aliases) {
      map[a.ownerName] = a.canonicalName
    }
    return map
  }, [aliases])

  const resolveOwner = useCallback((name) => aliasMap[name] || name, [aliasMap])

  // Build set of inactive canonical owner names from aliases
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const inactiveOwnerSet = useMemo(() => {
    const s = new Set()
    for (const a of aliases) {
      if (a.isActive === false) s.add(a.canonicalName)
    }
    return s
  }, [aliases])

  // Collect all unique raw owner names (pre-resolution) for the modal
  const allRawNames = useMemo(() => {
    if (!history?.seasons) return []
    const nameSet = new Set()
    for (const teams of Object.values(history.seasons)) {
      for (const t of (Array.isArray(teams) ? teams : [])) {
        const name = t.ownerName || t.teamName
        if (name) nameSet.add(String(name))
      }
    }
    // Also include canonical names from existing aliases (they may not appear as raw names)
    for (const a of aliases) {
      nameSet.add(a.canonicalName)
    }
    return Array.from(nameSet)
  }, [history, aliases])

  // Sanitize: strip large JSON fields, enforce types, and apply alias resolution
  const sanitizedSeasons = useMemo(() => {
    if (!history?.seasons) return null
    const clean = {}
    for (const [year, teams] of Object.entries(history.seasons)) {
      clean[year] = (Array.isArray(teams) ? teams : []).map(t => ({
        id: t.id,
        seasonYear: t.seasonYear,
        teamName: String(t.teamName || ''),
        ownerName: resolveOwner(String(t.ownerName || '')),
        rawOwnerName: String(t.ownerName || ''),
        ownerUserId: t.ownerUserId,
        finalStanding: Number(t.finalStanding) || 0,
        wins: Number(t.wins) || 0,
        losses: Number(t.losses) || 0,
        ties: Number(t.ties) || 0,
        pointsFor: Number(t.pointsFor) || 0,
        pointsAgainst: Number(t.pointsAgainst) || 0,
        playoffResult: String(t.playoffResult || ''),
        weeklyScores: Array.isArray(t.weeklyScores) ? t.weeklyScores : [],
        draftData: t.draftData,
      }))
    }
    return clean
  }, [history, resolveOwner])

  const allTimeRecords = useMemo(() => {
    if (!sanitizedSeasons) return null
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

    // Build matchup lookup: year-week-matchupId → [{ name, points }]
    const matchupLookup = {}
    for (const [year, teams] of Object.entries(sanitizedSeasons)) {
      for (const t of teams) {
        const name = t.ownerName || t.teamName
        for (const w of (t.weeklyScores || [])) {
          if (w.matchupId != null) {
            const key = `${year}-${w.week}-${w.matchupId}`
            if (!matchupLookup[key]) matchupLookup[key] = []
            matchupLookup[key].push({ name, points: w.points })
          }
        }
      }
    }

    for (const [year, teams] of Object.entries(sanitizedSeasons)) {
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
              // Find opponent name from matchup lookup
              const key = w.matchupId != null ? `${year}-${w.week}-${w.matchupId}` : null
              const opponents = key ? matchupLookup[key] : null
              const loser = opponents?.find(o => o.name !== name)?.name || '?'
              records.biggestBlowout = { value: margin, winner, loser, year: parseInt(year), week: w.week, score: `${w.points.toFixed(1)}-${w.opponentPoints.toFixed(1)}` }
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
  }, [sanitizedSeasons])

  const years = sanitizedSeasons ? Object.keys(sanitizedSeasons).sort((a, b) => b - a) : []

  const handleDeleteEntries = useCallback(async (ids) => {
    try {
      await api.deleteHistoricalEntries(ids)
      await refetch()
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }, [refetch])

  const handleExport = useCallback(() => {
    if (!sanitizedSeasons) return
    const rows = []
    for (const [year, teams] of Object.entries(sanitizedSeasons)) {
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
  }, [sanitizedSeasons, leagueId])

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
            <p className="text-red-400 mb-4">{String(error)}</p>
            <Link to="/dashboard" className="text-accent-gold hover:text-accent-gold/80">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    )
  }

  const TABS = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'records', label: 'Records' },
    { id: 'h2h', label: 'H2H' },
    { id: 'profiles', label: 'Profiles' },
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
              <div className="flex items-center gap-2">
                {isCommissioner && years.length > 0 && (
                  <button
                    onClick={() => setShowManageOwners(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded-lg hover:bg-accent-gold/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Owners
                  </button>
                )}
                <button
                  onClick={() => setShowAddSeason(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded-lg hover:bg-accent-gold/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Season
                </button>
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
                  <SeasonCard key={year} year={year} teams={sanitizedSeasons[year] || []} isCommissioner={isCommissioner} onDeleteEntries={handleDeleteEntries} />
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
                  {allTimeRecords.biggestBlowout.winner && (
                    <p className="text-xs text-text-secondary truncate">{allTimeRecords.biggestBlowout.winner} over {allTimeRecords.biggestBlowout.loser}</p>
                  )}
                  {allTimeRecords.biggestBlowout.score && (
                    <p className="text-xs text-text-secondary/60 font-mono truncate">{allTimeRecords.biggestBlowout.score}</p>
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-white">All-Time Standings</h3>
                  {inactiveOwnerSet.size > 0 && (
                    <button
                      onClick={() => setShowActiveOnly(prev => !prev)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-colors ${showActiveOnly ? 'bg-green-500/15 text-green-400' : 'bg-dark-tertiary text-text-secondary'}`}
                    >
                      {showActiveOnly ? 'Active Only' : 'All Managers'}
                    </button>
                  )}
                </div>
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
                      {(showActiveOnly && inactiveOwnerSet.size > 0
                        ? allTimeRecords.allTime?.filter(o => !inactiveOwnerSet.has(o.name))
                        : allTimeRecords.allTime
                      )?.map((owner, idx) => (
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
          {tab === 'h2h' && <HeadToHeadTab history={{ ...history, seasons: sanitizedSeasons || {} }} />}

          {/* Profiles Tab */}
          {tab === 'profiles' && <OwnerProfileTab history={{ ...history, seasons: sanitizedSeasons || {} }} />}

          {/* Drafts Tab */}
          {tab === 'drafts' && <DraftHistoryTab history={{ ...history, seasons: sanitizedSeasons || {} }} />}

          {/* Custom Data Tab */}
          {tab === 'custom' && <CustomDataTab leagueId={leagueId} />}
        </div>
      </main>
      <LeagueChat leagueId={leagueId} pageContext="vault" />

      {showAddSeason && (
        <AddSeasonModal
          leagueId={leagueId}
          onClose={() => setShowAddSeason(false)}
          onAdded={() => refetch()}
        />
      )}

      {showManageOwners && (
        <ManageOwnersModal
          leagueId={leagueId}
          allRawNames={allRawNames}
          existingAliases={aliases}
          onClose={() => setShowManageOwners(false)}
          onSaved={() => {
            api.getOwnerAliases(leagueId).then(res => setAliases(res.aliases || [])).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

function LeagueVaultWithBoundary() {
  return (
    <VaultErrorBoundary>
      <LeagueVault />
    </VaultErrorBoundary>
  )
}

export default LeagueVaultWithBoundary
