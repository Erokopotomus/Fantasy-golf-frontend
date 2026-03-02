import { useState, useMemo } from 'react'
import Card from '../common/Card'
import { usePlayoffIntelligence } from '../../hooks/usePlayoffIntelligence'

const TROPHY = (
  <svg className="w-5 h-5 text-crown" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
    <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
  </svg>
)

const PlayoffHistoryTab = ({ history, aliasMap = {}, avatarMap = {} }) => {
  const { championshipHistory, brackets, playoffRecords, dynastyData, hasPlayoffData } = usePlayoffIntelligence(history, aliasMap)
  const [selectedYear, setSelectedYear] = useState(null)
  const [recordsSort, setRecordsSort] = useState({ key: 'championships', dir: 'desc' })
  const [showConsolation, setShowConsolation] = useState(false)

  const bracketYear = selectedYear || (championshipHistory.length > 0 ? championshipHistory[0].year : null)
  const activeBracket = bracketYear ? brackets[String(bracketYear)] : null

  if (!hasPlayoffData) {
    return (
      <Card className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-crown/10 flex items-center justify-center mx-auto mb-4">
          {TROPHY}
        </div>
        <p className="text-text-secondary mb-2">No playoff data available yet.</p>
        <p className="text-text-muted text-sm">Import league history to see playoff brackets and records.</p>
      </Card>
    )
  }

  const sortedRecords = useMemo(() => {
    if (!playoffRecords) return []
    return [...playoffRecords].sort((a, b) => {
      const aVal = a[recordsSort.key] ?? 0
      const bVal = b[recordsSort.key] ?? 0
      return recordsSort.dir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [playoffRecords, recordsSort])

  const handleSort = (key) => {
    setRecordsSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
  }

  const SortIcon = ({ field }) => {
    if (recordsSort.key !== field) return null
    return <span className="ml-0.5 text-[8px]">{recordsSort.dir === 'desc' ? '▼' : '▲'}</span>
  }

  return (
    <div className="space-y-6">

      {/* Championship History */}
      <Card>
        <h3 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
          {TROPHY}
          Championship History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-2 px-2 text-text-muted font-mono text-xs uppercase">Year</th>
                <th className="text-left py-2 px-2 text-text-muted font-mono text-xs uppercase">Champion</th>
                <th className="text-left py-2 px-2 text-text-muted font-mono text-xs uppercase">Runner-Up</th>
                <th className="text-right py-2 px-2 text-text-muted font-mono text-xs uppercase">Score</th>
                <th className="text-right py-2 px-2 text-text-muted font-mono text-xs uppercase">Margin</th>
              </tr>
            </thead>
            <tbody>
              {championshipHistory.map(c => (
                <tr
                  key={c.year}
                  onClick={() => setSelectedYear(c.year)}
                  className={`border-b border-[var(--card-border)] cursor-pointer hover:bg-[var(--bg-alt)] transition-colors ${
                    bracketYear === c.year ? 'bg-crown/5' : ''
                  }`}
                >
                  <td className="py-2.5 px-2 font-mono font-bold text-text-primary">{c.year}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      {avatarMap[c.champion] ? (
                        <img src={avatarMap[c.champion]} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-crown/20 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-crown">{c.champion?.[0]}</span>
                        </div>
                      )}
                      <span className="font-medium text-crown">{c.champion}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-text-secondary">{c.runnerUp || '—'}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-secondary">
                    {c.championshipScore != null ? `${c.championshipScore.toFixed(1)} – ${c.runnerUpScore.toFixed(1)}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {c.margin != null ? (
                      <span className={c.margin > 30 ? 'text-crown font-bold' : c.margin < 5 ? 'text-live-red' : 'text-text-secondary'}>
                        {c.margin > 0 ? '+' : ''}{c.margin.toFixed(1)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Playoff Bracket for Selected Year */}
      {bracketYear && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-text-primary">
              {bracketYear} Playoff Bracket
            </h3>
            <div className="flex items-center gap-2">
              {activeBracket?.consolationBracket && (
                <button
                  onClick={() => setShowConsolation(!showConsolation)}
                  className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                    showConsolation ? 'bg-text-muted/20 text-text-primary' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {showConsolation ? 'Main Bracket' : 'Consolation'}
                </button>
              )}
              <select
                value={bracketYear}
                onChange={e => { setSelectedYear(parseInt(e.target.value)); setShowConsolation(false) }}
                className="text-xs bg-[var(--bg-alt)] border border-[var(--card-border)] rounded px-2 py-1 text-text-primary"
              >
                {championshipHistory.map(c => (
                  <option key={c.year} value={c.year}>{c.year}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const bracket = showConsolation ? activeBracket?.consolationBracket : activeBracket?.mainBracket
            if (!bracket || !bracket.rounds?.length) {
              // Fallback: show results from playoffResult fields
              const seasonTeams = history?.seasons?.[String(bracketYear)] || []
              const playoffTeams = seasonTeams
                .filter(t => t.playoffResult && t.playoffResult !== 'missed' && t.playoffResult !== 'eliminated')
                .map(t => ({
                  owner: aliasMap[t.ownerName] || t.ownerName,
                  result: t.playoffResult,
                  standing: t.finalStanding,
                }))
                .sort((a, b) => (a.standing || 99) - (b.standing || 99))

              if (playoffTeams.length === 0) {
                return <p className="text-text-muted text-sm text-center py-6">No detailed bracket data for {bracketYear}.</p>
              }

              return (
                <div className="space-y-2">
                  {playoffTeams.map((t, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                        t.result === 'champion' ? 'bg-crown/10 border border-crown/30' :
                        t.result === 'runner_up' ? 'bg-gray-500/10 border border-gray-500/20' :
                        'bg-[var(--bg-alt)]'
                      }`}
                    >
                      <span className="font-mono text-xs text-text-muted w-4">#{t.standing || '?'}</span>
                      <span className={`font-medium ${t.result === 'champion' ? 'text-crown' : 'text-text-primary'}`}>
                        {t.owner}
                      </span>
                      <span className={`ml-auto text-xs font-mono uppercase ${
                        t.result === 'champion' ? 'text-crown' :
                        t.result === 'runner_up' ? 'text-gray-400' :
                        'text-text-muted'
                      }`}>
                        {t.result === 'champion' ? 'Champion' :
                         t.result === 'runner_up' ? 'Runner-Up' :
                         t.result === 'third_place' ? '3rd Place' :
                         t.result === 'semifinal' ? 'Semis' : 'Playoffs'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }

            // Render bracket rounds
            return (
              <div className="overflow-x-auto">
                <div className="flex gap-6 min-w-max py-2">
                  {bracket.rounds.map((round, ri) => (
                    <div key={ri} className="flex flex-col">
                      <h4 className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wide mb-3 text-center">
                        {round.name}
                      </h4>
                      <div className="flex flex-col gap-4 justify-around flex-1">
                        {round.matchups.map((m, mi) => (
                          <div key={mi} className="bg-[var(--bg-alt)] rounded-lg w-52 overflow-hidden border border-[var(--card-border)]">
                            <MatchupRow
                              owner={m.team1}
                              score={m.score1}
                              isWinner={m.winner === m.team1}
                              avatarMap={avatarMap}
                            />
                            <div className="border-t border-[var(--card-border)]" />
                            <MatchupRow
                              owner={m.team2}
                              score={m.score2}
                              isWinner={m.winner === m.team2}
                              avatarMap={avatarMap}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Champion column */}
                  {!showConsolation && (
                    <div className="flex flex-col justify-center">
                      <h4 className="text-xs font-mono font-semibold text-crown uppercase tracking-wide mb-3 text-center">
                        Champion
                      </h4>
                      <div className="bg-gradient-to-br from-crown/15 to-transparent rounded-lg p-4 w-40 text-center border border-crown/30">
                        <div className="w-10 h-10 rounded-full bg-crown/20 flex items-center justify-center mx-auto mb-2">
                          {TROPHY}
                        </div>
                        <p className="text-crown font-bold font-display text-sm">
                          {championshipHistory.find(c => c.year === bracketYear)?.champion || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </Card>
      )}

      {/* Playoff Records */}
      {sortedRecords.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold font-display text-text-primary mb-4">Playoff Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-2 px-2 text-text-muted font-mono text-[10px] uppercase">Owner</th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('championships')}>
                    Titles<SortIcon field="championships" />
                  </th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('runnerUps')}>
                    2nd<SortIcon field="runnerUps" />
                  </th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('playoffAppearances')}>
                    Apps<SortIcon field="playoffAppearances" />
                  </th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('playoffWinPct')}>
                    Win%<SortIcon field="playoffWinPct" />
                  </th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('playoffElevation')}>
                    Elev.<SortIcon field="playoffElevation" />
                  </th>
                  <th className="text-center py-2 px-2 text-text-muted font-mono text-[10px] uppercase cursor-pointer hover:text-text-primary" onClick={() => handleSort('maxConsecPlayoffs')}>
                    Streak<SortIcon field="maxConsecPlayoffs" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map(r => (
                  <tr key={r.owner} className="border-b border-[var(--card-border)] hover:bg-[var(--bg-alt)] transition-colors">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {avatarMap[r.owner] ? (
                          <img src={avatarMap[r.owner]} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[var(--bg-alt)] flex items-center justify-center">
                            <span className="text-[8px] font-bold text-text-muted">{r.owner?.[0]}</span>
                          </div>
                        )}
                        <span className="font-medium text-text-primary">{r.owner}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {r.championships > 0 ? (
                        <span className="text-crown font-bold">{r.championships}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-text-secondary">{r.runnerUps}</td>
                    <td className="py-2 px-2 text-center font-mono text-text-secondary">{r.playoffAppearances}</td>
                    <td className="py-2 px-2 text-center font-mono text-text-secondary">
                      {r.totalPlayoffGames > 0 ? `${(r.playoffWinPct * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {r.totalPlayoffGames > 0 ? (
                        <span className={r.playoffElevation > 0 ? 'text-field' : r.playoffElevation < -5 ? 'text-live-red' : 'text-text-secondary'}>
                          {r.playoffElevation > 0 ? '+' : ''}{r.playoffElevation}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-text-secondary">{r.maxConsecPlayoffs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-text-muted mt-2 font-mono">
            Elev. = playoff scoring avg vs regular season avg. Streak = most consecutive playoff appearances.
          </p>
        </Card>
      )}

      {/* Dynasty & Records Highlights */}
      {dynastyData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Biggest Blowout */}
          {dynastyData.biggestBlowout && (
            <Card>
              <p className="text-xs text-text-muted font-mono uppercase mb-2">Biggest Championship Blowout</p>
              <p className="text-lg font-bold font-display text-crown mb-1">{dynastyData.biggestBlowout.champion}</p>
              <p className="text-sm text-text-secondary">
                {dynastyData.biggestBlowout.year} — beat {dynastyData.biggestBlowout.runnerUp}
              </p>
              {dynastyData.biggestBlowout.margin != null && (
                <p className="text-xl font-mono font-bold text-crown mt-1">
                  +{dynastyData.biggestBlowout.margin.toFixed(1)}
                </p>
              )}
              {dynastyData.biggestBlowout.championshipScore != null && (
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {dynastyData.biggestBlowout.championshipScore.toFixed(1)} – {dynastyData.biggestBlowout.runnerUpScore.toFixed(1)}
                </p>
              )}
            </Card>
          )}

          {/* Closest Championship */}
          {dynastyData.closestGame && dynastyData.closestGame !== dynastyData.biggestBlowout && (
            <Card>
              <p className="text-xs text-text-muted font-mono uppercase mb-2">Closest Championship</p>
              <p className="text-lg font-bold font-display text-text-primary mb-1">{dynastyData.closestGame.champion}</p>
              <p className="text-sm text-text-secondary">
                {dynastyData.closestGame.year} — vs {dynastyData.closestGame.runnerUp}
              </p>
              {dynastyData.closestGame.margin != null && (
                <p className="text-xl font-mono font-bold text-live-red mt-1">
                  {Math.abs(dynastyData.closestGame.margin).toFixed(1)} pts
                </p>
              )}
              {dynastyData.closestGame.championshipScore != null && (
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {dynastyData.closestGame.championshipScore.toFixed(1)} – {dynastyData.closestGame.runnerUpScore.toFixed(1)}
                </p>
              )}
            </Card>
          )}

          {/* Dynasty Streaks */}
          {dynastyData.streaks.length > 0 && (
            <Card className="sm:col-span-2">
              <p className="text-xs text-text-muted font-mono uppercase mb-3">Dynasties (Back-to-Back+)</p>
              <div className="space-y-2">
                {dynastyData.streaks.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-crown/5 border border-crown/20">
                    <span className="text-2xl font-bold font-mono text-crown">{s.count}x</span>
                    <div>
                      <p className="font-bold font-display text-text-primary">{s.owner}</p>
                      <p className="text-xs text-text-muted font-mono">{s.years.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Most Last-Place Finishes */}
          {playoffRecords && (() => {
            const lastPlaceKing = [...playoffRecords].sort((a, b) => b.lastPlaceFinishes - a.lastPlaceFinishes)[0]
            if (!lastPlaceKing || lastPlaceKing.lastPlaceFinishes === 0) return null
            return (
              <Card>
                <p className="text-xs text-text-muted font-mono uppercase mb-2">Most Last-Place Finishes</p>
                <p className="text-lg font-bold font-display text-text-primary mb-1">{lastPlaceKing.owner}</p>
                <p className="text-2xl font-mono font-bold text-live-red">{lastPlaceKing.lastPlaceFinishes}</p>
                <p className="text-xs text-text-muted mt-1">out of {lastPlaceKing.totalSeasons} seasons</p>
              </Card>
            )
          })()}

          {/* Longest Drought */}
          {playoffRecords && (() => {
            const withDroughts = playoffRecords.filter(r => r.championships > 0 && r.drought > 0)
            if (withDroughts.length === 0) return null
            const longestDrought = withDroughts.sort((a, b) => (b.drought || 0) - (a.drought || 0))[0]
            return (
              <Card>
                <p className="text-xs text-text-muted font-mono uppercase mb-2">Longest Championship Drought</p>
                <p className="text-lg font-bold font-display text-text-primary mb-1">{longestDrought.owner}</p>
                <p className="text-2xl font-mono font-bold text-text-secondary">{longestDrought.drought} yrs</p>
                <p className="text-xs text-text-muted mt-1">
                  Last title: {longestDrought.championshipYears[longestDrought.championshipYears.length - 1]}
                </p>
              </Card>
            )
          })()}
        </div>
      )}
    </div>
  )
}

const MatchupRow = ({ owner, score, isWinner, avatarMap = {} }) => {
  if (!owner) {
    return (
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-text-muted italic">BYE</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2 ${isWinner ? 'bg-crown/10' : ''}`}>
      <div className="flex items-center gap-2">
        {avatarMap[owner] ? (
          <img src={avatarMap[owner]} alt="" className="w-4 h-4 rounded-full" />
        ) : (
          <div className="w-4 h-4 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <span className="text-[7px] font-bold text-text-muted">{owner?.[0]}</span>
          </div>
        )}
        <span className={`text-sm truncate max-w-[120px] ${isWinner ? 'font-bold text-crown' : 'text-text-primary'}`}>
          {owner}
        </span>
      </div>
      <span className={`text-sm font-mono ${isWinner ? 'font-bold text-crown' : 'text-text-secondary'}`}>
        {score != null ? score.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export default PlayoffHistoryTab
