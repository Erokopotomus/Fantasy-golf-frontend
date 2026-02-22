import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import { useLeagueHistory } from '../hooks/useImports'
import useMatchups from '../hooks/useMatchups'
import PlayoffBracket from '../components/matchups/PlayoffBracket'
import { useAuth } from '../context/AuthContext'

const PLAYOFF_LABELS = {
  champion: { text: 'Champion', color: 'text-accent-gold bg-accent-gold/20' },
  runner_up: { text: 'Runner-Up', color: 'text-gray-300 bg-gray-500/20' },
  third_place: { text: '3rd Place', color: 'text-blue-400 bg-blue-500/20' },
  semifinal: { text: 'Semis', color: 'text-blue-400 bg-blue-500/20' },
  playoffs: { text: 'Playoffs', color: 'text-green-400 bg-green-500/20' },
  eliminated: { text: '', color: '' },
  missed: { text: '', color: '' },
}

const PlayoffHistory = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { history, loading: historyLoading, error: historyError } = useLeagueHistory(leagueId)
  const { playoffs, standings: matchupStandings } = useMatchups(leagueId)

  // All available years from history, sorted descending
  const years = useMemo(() => {
    if (!history?.seasons) return []
    return Object.keys(history.seasons).sort((a, b) => Number(b) - Number(a))
  }, [history])

  const [selectedYear, setSelectedYear] = useState(null)
  const activeYear = selectedYear || years[0] || null

  // Aggregate playoff stats across all seasons
  const { recordCards, ownerTable } = useMemo(() => {
    if (!history?.seasons) return { recordCards: [], ownerTable: [] }

    const ownerStats = {} // keyed by ownerName

    for (const [, teams] of Object.entries(history.seasons)) {
      for (const team of teams) {
        const name = team.ownerName || team.teamName || 'Unknown'
        if (!ownerStats[name]) {
          ownerStats[name] = { name, championships: 0, runnerUps: 0, appearances: 0, seasons: 0, playoffWins: 0, playoffGames: 0 }
        }
        ownerStats[name].seasons++

        const pr = team.playoffResult
        if (!pr || pr === 'missed' || pr === 'eliminated') continue

        ownerStats[name].appearances++

        if (pr === 'champion') {
          ownerStats[name].championships++
          // Champion typically wins ~3 games (semis, finals + possibly earlier round)
          // Estimate: champion gets 2-3 wins, runner-up 1-2, semifinal 0-1
          ownerStats[name].playoffWins += 3
          ownerStats[name].playoffGames += 3
        } else if (pr === 'runner_up') {
          ownerStats[name].runnerUps++
          ownerStats[name].playoffWins += 2
          ownerStats[name].playoffGames += 3
        } else if (pr === 'third_place') {
          ownerStats[name].playoffWins += 1
          ownerStats[name].playoffGames += 2
        } else if (pr === 'semifinal') {
          ownerStats[name].playoffGames += 1
        } else if (pr === 'playoffs') {
          ownerStats[name].playoffGames += 1
        }
      }
    }

    const owners = Object.values(ownerStats)

    // Record cards
    const mostChamps = owners.filter(o => o.championships > 0).sort((a, b) => b.championships - a.championships)[0]
    const mostAppearances = owners.filter(o => o.appearances > 0).sort((a, b) => b.appearances - a.appearances)[0]
    const mostRunnerUps = owners.filter(o => o.runnerUps > 0).sort((a, b) => b.runnerUps - a.runnerUps)[0]
    const bestWinPct = owners
      .filter(o => o.appearances >= 2 && o.playoffGames > 0)
      .map(o => ({ ...o, winPct: o.playoffWins / o.playoffGames }))
      .sort((a, b) => b.winPct - a.winPct)[0]

    const cards = []
    if (mostChamps) cards.push({ title: 'Most Championships', value: mostChamps.name, stat: mostChamps.championships, icon: 'trophy', isGold: true })
    if (mostAppearances) cards.push({ title: 'Most Playoff Appearances', value: mostAppearances.name, stat: mostAppearances.appearances, icon: 'appearances' })
    if (mostRunnerUps) cards.push({ title: 'Most Runner-Ups', value: mostRunnerUps.name, stat: mostRunnerUps.runnerUps, icon: 'runner' })
    if (bestWinPct) cards.push({ title: 'Best Playoff Win %', value: bestWinPct.name, stat: `${(bestWinPct.winPct * 100).toFixed(0)}%`, icon: 'winpct' })

    // Owner table: only owners with ≥1 playoff appearance, sorted by championships desc then appearances desc
    const table = owners
      .filter(o => o.appearances > 0)
      .sort((a, b) => b.championships - a.championships || b.appearances - a.appearances)

    return { recordCards: cards, ownerTable: table }
  }, [history])

  // Selected season teams
  const seasonTeams = useMemo(() => {
    if (!activeYear || !history?.seasons?.[activeYear]) return []
    return [...history.seasons[activeYear]].sort((a, b) => (a.finalStanding || 99) - (b.finalStanding || 99))
  }, [activeYear, history])

  const seasonChampion = seasonTeams.find(t => t.playoffResult === 'champion')

  // Check if selected year is current and bracket exists
  const currentYear = new Date().getFullYear().toString()
  const showBracket = activeYear === currentYear && playoffs?.rounds?.length > 0

  if (historyLoading) {
    return (
      <div className="min-h-screen">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary">Loading playoff history...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (historyError) {
    return (
      <div className="min-h-screen">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{historyError}</p>
              <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">
                Back to League
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const hasHistory = years.length > 0

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to={`/leagues/${leagueId}`}
                className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                League Home
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">Playoff History</h1>
            </div>
            {hasHistory && (
              <select
                value={activeYear || ''}
                onChange={e => setSelectedYear(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:border-gold focus:outline-none"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>

          {!hasHistory ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-display text-text-primary mb-2">No Playoff History</h2>
              <p className="text-text-secondary mb-4">Import your league history to see playoff records across seasons.</p>
              <Link to="/import" className="text-gold hover:underline text-sm">
                Import League History
              </Link>
            </Card>
          ) : (
            <>
              {/* Record Cards */}
              {recordCards.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {recordCards.map(card => (
                    <Card
                      key={card.title}
                      className={card.isGold ? 'border-accent-gold/30 bg-gradient-to-br from-accent-gold/10 to-[var(--surface)]' : ''}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {card.icon === 'trophy' && (
                          <span className="text-lg">🏆</span>
                        )}
                        {card.icon === 'appearances' && (
                          <span className="text-lg">📊</span>
                        )}
                        {card.icon === 'runner' && (
                          <span className="text-lg">🥈</span>
                        )}
                        {card.icon === 'winpct' && (
                          <span className="text-lg">🎯</span>
                        )}
                        <p className="text-xs text-text-muted leading-tight">{card.title}</p>
                      </div>
                      <p className="text-text-primary font-display font-bold text-sm truncate">{card.value}</p>
                      <p className={`text-2xl font-bold font-mono ${card.isGold ? 'text-accent-gold' : 'text-text-primary'}`}>
                        {card.stat}
                      </p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Owner Playoff History Table */}
              {ownerTable.length > 0 && (
                <Card className="mb-6">
                  <h2 className="text-lg font-display font-bold text-text-primary mb-4">Owner Playoff Records</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] text-xs text-text-muted uppercase tracking-wider">
                          <th className="pb-3 text-left">Owner</th>
                          <th className="pb-3 text-center">Champs</th>
                          <th className="pb-3 text-center">Runner-Ups</th>
                          <th className="pb-3 text-center">Appearances</th>
                          <th className="pb-3 text-center">Seasons</th>
                          <th className="pb-3 text-center">Playoff Win %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerTable.map((owner, i) => (
                          <tr key={owner.name} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-alt)] transition-colors">
                            <td className="py-3 text-text-primary font-medium">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono w-5 ${i === 0 && owner.championships > 0 ? 'text-accent-gold' : 'text-text-muted'}`}>
                                  {i + 1}.
                                </span>
                                {owner.name}
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className={owner.championships > 0 ? 'text-accent-gold font-bold' : 'text-text-muted'}>
                                {owner.championships}
                              </span>
                            </td>
                            <td className="py-3 text-center text-text-secondary">{owner.runnerUps}</td>
                            <td className="py-3 text-center text-text-secondary">{owner.appearances}</td>
                            <td className="py-3 text-center text-text-muted">{owner.seasons}</td>
                            <td className="py-3 text-center text-text-secondary font-mono">
                              {owner.playoffGames > 0 ? `${((owner.playoffWins / owner.playoffGames) * 100).toFixed(0)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Selected Season Results */}
              {activeYear && seasonTeams.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-bold text-text-primary mb-4">{activeYear} Season</h2>

                  {/* Champion highlight card */}
                  {seasonChampion && (
                    <Card className="border-accent-gold/30 bg-gradient-to-r from-accent-gold/10 to-[var(--surface)] mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🏆</span>
                        </div>
                        <div>
                          <p className="text-xs text-accent-gold font-mono uppercase tracking-wider">{activeYear} Champion</p>
                          <p className="text-xl font-display font-bold text-text-primary">{seasonChampion.teamName || seasonChampion.ownerName}</p>
                          <p className="text-sm text-text-secondary">
                            {seasonChampion.ownerName}
                            {seasonChampion.wins != null && ` · ${seasonChampion.wins}-${seasonChampion.losses || 0}${seasonChampion.ties ? `-${seasonChampion.ties}` : ''}`}
                            {seasonChampion.pointsFor > 0 && ` · ${Number(seasonChampion.pointsFor).toLocaleString(undefined, { maximumFractionDigits: 1 })} PF`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Current year bracket */}
                  {showBracket && (
                    <div className="mb-4">
                      <PlayoffBracket bracket={playoffs} teams={matchupStandings} currentUserId={user?.id} />
                    </div>
                  )}

                  {/* Season standings table */}
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] text-xs text-text-muted uppercase tracking-wider">
                            <th className="pb-3 text-left w-10">#</th>
                            <th className="pb-3 text-left">Team</th>
                            <th className="pb-3 text-left">Owner</th>
                            <th className="pb-3 text-center">Record</th>
                            <th className="pb-3 text-right">PF</th>
                            <th className="pb-3 text-right">PA</th>
                            <th className="pb-3 text-right">Playoff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seasonTeams.map((team, i) => {
                            const label = PLAYOFF_LABELS[team.playoffResult] || {}
                            return (
                              <tr key={team.id || i} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-alt)] transition-colors">
                                <td className={`py-3 font-bold ${
                                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-500' : 'text-text-muted'
                                }`}>
                                  {team.finalStanding || i + 1}
                                </td>
                                <td className="py-3 text-text-primary font-medium truncate max-w-[160px]">
                                  {team.teamName || '—'}
                                </td>
                                <td className="py-3 text-text-secondary truncate max-w-[120px]">
                                  {team.ownerName || '—'}
                                </td>
                                <td className="py-3 text-center text-text-secondary font-mono">
                                  {team.wins != null ? `${team.wins}-${team.losses || 0}${team.ties ? `-${team.ties}` : ''}` : '—'}
                                </td>
                                <td className="py-3 text-right text-text-primary font-mono">
                                  {team.pointsFor > 0 ? Number(team.pointsFor).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                                </td>
                                <td className="py-3 text-right text-text-muted font-mono">
                                  {team.pointsAgainst > 0 ? Number(team.pointsAgainst).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                                </td>
                                <td className="py-3 text-right">
                                  {label.text ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${label.color}`}>
                                      {label.text}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default PlayoffHistory
