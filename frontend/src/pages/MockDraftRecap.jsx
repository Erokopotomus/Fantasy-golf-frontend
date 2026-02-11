import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useMockDraftRecap } from '../hooks/useDraftHistory'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const gradeColors = {
  'A+': 'text-green-400', A: 'text-green-400', 'A-': 'text-green-400',
  'B+': 'text-blue-400', B: 'text-blue-400', 'B-': 'text-blue-400',
  'C+': 'text-yellow-400', C: 'text-yellow-400', 'C-': 'text-yellow-400',
  'D+': 'text-orange-400', D: 'text-orange-400', 'D-': 'text-orange-400',
  F: 'text-red-400',
}

const gradeBgColors = {
  'A+': 'bg-green-500/20', A: 'bg-green-500/20', 'A-': 'bg-green-500/20',
  'B+': 'bg-blue-500/20', B: 'bg-blue-500/20', 'B-': 'bg-blue-500/20',
  'C+': 'bg-yellow-500/20', C: 'bg-yellow-500/20', 'C-': 'bg-yellow-500/20',
  'D+': 'bg-orange-500/20', D: 'bg-orange-500/20', 'D-': 'bg-orange-500/20',
  F: 'bg-red-500/20',
}

const NFL_POS_COLORS = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-emerald-500/20 text-emerald-400',
  WR: 'bg-blue-500/20 text-blue-400',
  TE: 'bg-orange-500/20 text-orange-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-teal-500/20 text-teal-400',
}

const MockDraftRecap = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { result, loading, error } = useMockDraftRecap(id)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(null) // board id on success
  const [importError, setImportError] = useState(null)
  const [boardComparison, setBoardComparison] = useState(null)

  useEffect(() => {
    if (!id || !user) return
    api.getBoardComparison(id)
      .then(res => setBoardComparison(res.comparison?.comparisonData || null))
      .catch(() => {})
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-red-400 mb-4">{error || 'Mock draft not found'}</p>
          <Link to="/draft/history"><Button>Back to History</Button></Link>
        </Card>
      </div>
    )
  }

  const pickGrades = result.pickGrades || []
  const userPicks = result.userPicks || []
  const allPicks = result.picks || []
  const teamNames = result.teamNames || []

  // Detect sport from saved data (sport record or pick data)
  const sport = result?.sport?.slug || (result?.picks?.[0]?.playerPosition ? 'nfl' : 'golf')

  const handleImportToBoard = async () => {
    if (!userPicks.length) return
    setImporting(true)
    setImportError(null)
    try {
      const boardName = `Mock Draft – ${new Date(result.completedAt).toLocaleDateString()}`
      const boardSport = result?.sport?.slug || (result?.picks?.[0]?.playerPosition ? 'nfl' : 'golf')
      const data = await api.createDraftBoard({
        name: boardName,
        sport: boardSport,
        scoringFormat: boardSport === 'nfl' ? 'ppr' : 'standard',
        boardType: 'overall',
      })
      const board = data.board
      const entries = userPicks.map((pick, i) => ({
        playerId: pick.playerId,
        rank: i + 1,
        tier: null,
        notes: null,
      }))
      await api.saveDraftBoardEntries(board.id, entries)
      setImportSuccess(board.id)
    } catch (err) {
      setImportError(err.message || 'Failed to import')
    } finally {
      setImporting(false)
    }
  }

  const handleDraftAgain = () => {
    sessionStorage.setItem('mockDraftConfig', JSON.stringify({
      sport,
      draftType: result.draftType,
      teamCount: result.teamCount,
      rosterSize: result.rosterSize,
      userPosition: result.userPosition,
    }))
    navigate('/mock-draft')
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/draft/history" className="text-text-secondary hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold font-display text-white">Mock Draft Recap</h1>
              <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                  sport === 'nfl' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>{sport}</span>
                <span className="px-2 py-0.5 bg-dark-tertiary rounded text-xs capitalize">{result.draftType}</span>
                <span>{result.teamCount} teams</span>
                <span>{result.rosterSize} rounds</span>
                <span>{new Date(result.completedAt).toLocaleDateString()}</span>
                {result.dataSource === 'api' && (
                  <span className="px-1.5 py-0.5 bg-gold/15 text-gold text-[10px] font-semibold rounded">LIVE DATA</span>
                )}
              </div>
            </div>
          </div>

          {/* Grade Card */}
          <Card className="mb-6 border-gold/30">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${gradeBgColors[result.overallGrade] || 'bg-dark-tertiary'}`}>
                <span className={`text-4xl font-bold ${gradeColors[result.overallGrade] || 'text-text-muted'}`}>
                  {result.overallGrade || '—'}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold font-display text-white mb-1">Your Draft Grade</h2>
                <p className="text-text-secondary text-sm mb-3">Score: {result.overallScore}/100</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {result.bestPick && (
                    <div>
                      <span className="text-text-muted">Best: </span>
                      <span className="text-green-400">{result.bestPick.playerName} ({result.bestPick.grade})</span>
                    </div>
                  )}
                  {result.worstPick && (
                    <div>
                      <span className="text-text-muted">Worst: </span>
                      <span className="text-red-400">{result.worstPick.playerName} ({result.worstPick.grade})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Pick-by-Pick Grades */}
          <Card className="mb-6">
            <h2 className="text-lg font-semibold font-display text-white mb-4">Your Picks</h2>
            <div className="space-y-2">
              {userPicks.map((pick, i) => {
                const pg = pickGrades.find(g => g.pickNumber === pick.pickNumber) || pickGrades[i] || {}
                return (
                  <div key={pick.pickNumber || i} className="flex items-center justify-between p-3 bg-dark-primary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-sm w-8">R{pick.round}</span>
                      {sport === 'nfl' && pick.playerPosition ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${NFL_POS_COLORS[pick.playerPosition] || ''}`}>
                          {pick.playerPosition}
                        </span>
                      ) : (
                        <span className="text-lg">{pick.playerFlag || ''}</span>
                      )}
                      <div>
                        <p className="text-white font-medium">{pick.playerName}</p>
                        <p className="text-text-muted text-xs">
                          Pick #{pick.pickNumber} · Rank #{pick.playerRank || '—'}
                          {pick.pickTag && (
                            <span className={`ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded ${
                              pick.pickTag === 'STEAL' ? 'bg-emerald-500/20 text-emerald-400' :
                              pick.pickTag === 'PLAN' ? 'bg-blue-500/20 text-blue-400' :
                              pick.pickTag === 'VALUE' ? 'bg-gold/20 text-gold' :
                              pick.pickTag === 'REACH' ? 'bg-orange-500/20 text-orange-400' :
                              pick.pickTag === 'FALLBACK' ? 'bg-purple-500/20 text-purple-400' :
                              pick.pickTag === 'PANIC' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-white/10 text-white/40'
                            }`}>{pick.pickTag}</span>
                          )}
                          {!pick.pickTag && pg.adpDiff != null && pg.adpDiff > 3 && (
                            <span className="ml-2 text-green-400">Steal!</span>
                          )}
                          {!pick.pickTag && pg.adpDiff != null && pg.adpDiff < -5 && (
                            <span className="ml-2 text-red-400">Reach</span>
                          )}
                          {pick.boardRankAtPick && (
                            <span className="ml-1.5 text-[9px] text-white/20 font-mono">B#{pick.boardRankAtPick}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {pg.adpDiff != null && (
                        <span className={`text-xs ${pg.adpDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pg.adpDiff >= 0 ? '+' : ''}{pg.adpDiff}
                        </span>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gradeBgColors[pg.grade] || 'bg-dark-tertiary'}`}>
                        <span className={`text-sm font-bold ${gradeColors[pg.grade] || 'text-text-muted'}`}>
                          {pg.grade || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Draft Board */}
          {allPicks.length > 0 && teamNames.length > 0 && (
            <Card className="mb-6 overflow-x-auto">
              <h2 className="text-lg font-semibold font-display text-white mb-4">Draft Board</h2>
              <div className="min-w-[500px]">
                <div className="grid gap-px bg-dark-border" style={{ gridTemplateColumns: `50px repeat(${result.teamCount}, 1fr)` }}>
                  {/* Headers */}
                  <div className="bg-dark-secondary p-2 text-xs text-text-muted">Rd</div>
                  {teamNames.map((name, i) => (
                    <div
                      key={i}
                      className={`bg-dark-secondary p-2 text-xs font-medium truncate ${
                        allPicks.some(p => p.teamIndex === i && p.isUser) ? 'text-gold border-b-2 border-gold' : 'text-text-secondary'
                      }`}
                    >
                      {name}
                    </div>
                  ))}
                  {/* Picks by round */}
                  {Array.from({ length: result.rosterSize }, (_, r) => {
                    const round = r + 1
                    return [
                      <div key={`r-${round}`} className="bg-dark-primary p-2 text-xs text-text-muted flex items-center">{round}</div>,
                      ...Array.from({ length: result.teamCount }, (_, teamIdx) => {
                        const pick = allPicks.find(p => p.round === round && p.teamIndex === teamIdx)
                        const isUserTeam = pick?.isUser
                        const pg = isUserTeam ? pickGrades.find(g => g.pickNumber === pick?.pickNumber) : null
                        return (
                          <div
                            key={`${round}-${teamIdx}`}
                            className={`bg-dark-primary p-1.5 text-xs ${isUserTeam ? 'bg-gold/5' : ''}`}
                          >
                            {pick ? (
                              <div className="truncate">
                                {sport === 'nfl' && pick.playerPosition && (
                                  <span className={`text-[8px] font-bold mr-0.5 ${NFL_POS_COLORS[pick.playerPosition]?.split(' ')[1] || ''}`}>
                                    {pick.playerPosition}
                                  </span>
                                )}
                                <span className="text-white text-xs">{pick.playerName?.split(' ').pop()}</span>
                                {pg && (
                                  <span className={`ml-1 text-[10px] font-bold ${gradeColors[pg.grade] || ''}`}>{pg.grade}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </div>
                        )
                      }),
                    ]
                  }).flat()}
                </div>
              </div>
            </Card>
          )}

          {/* Sleepers & Reaches */}
          {(pickGrades.filter(pg => pg.round >= 3 && pg.score >= 80).length > 0 || pickGrades.filter(pg => pg.score < 60).length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {pickGrades.filter(pg => pg.round >= 3 && pg.score >= 80).length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-green-400 mb-3">Sleeper Picks</h3>
                  <div className="space-y-2">
                    {pickGrades.filter(pg => pg.round >= 3 && pg.score >= 80).map(s => (
                      <div key={s.pickNumber} className="flex items-center justify-between text-sm">
                        <span className="text-white">{s.playerName}</span>
                        <span className="text-green-400">R{s.round} · +{s.adpDiff}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {pickGrades.filter(pg => pg.score < 60).length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-red-400 mb-3">Reaches</h3>
                  <div className="space-y-2">
                    {pickGrades.filter(pg => pg.score < 60).map(r => (
                      <div key={r.pickNumber} className="flex items-center justify-between text-sm">
                        <span className="text-white">{r.playerName}</span>
                        <span className="text-red-400">R{r.round} · {r.adpDiff}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Board vs Reality */}
          {boardComparison && (
            <Card className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Board vs. Reality</h3>
                <span className="text-xs font-mono text-gold">
                  {boardComparison.picksMatchingBoard}/{boardComparison.totalPicks} followed
                </span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-dark-primary rounded-lg p-3 text-center">
                  <div className="text-lg font-mono font-bold text-emerald-400">{boardComparison.picksMatchingBoard}</div>
                  <div className="text-[10px] text-white/40">On Plan</div>
                </div>
                <div className="bg-dark-primary rounded-lg p-3 text-center">
                  <div className="text-lg font-mono font-bold text-orange-400">{boardComparison.picksDeviatingFromBoard}</div>
                  <div className="text-[10px] text-white/40">Deviated</div>
                </div>
                <div className="bg-dark-primary rounded-lg p-3 text-center">
                  <div className="text-lg font-mono font-bold text-white/60">
                    {boardComparison.averageBoardRankDeviation != null ? `${boardComparison.averageBoardRankDeviation}` : '—'}
                  </div>
                  <div className="text-[10px] text-white/40">Avg Deviation</div>
                </div>
              </div>

              {/* Pick comparison rows */}
              <div className="space-y-1.5">
                {(boardComparison.picks || []).map((pick, i) => {
                  const devAbs = pick.deviation != null ? Math.abs(pick.deviation) : null
                  const deviationColor = !pick.wasOnBoard ? 'text-rose-400' :
                    devAbs === null ? 'text-white/30' :
                    devAbs <= 3 ? 'text-emerald-400' :
                    devAbs <= 8 ? 'text-yellow-400' : 'text-rose-400'

                  return (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-dark-primary/50">
                      <span className="text-[10px] font-mono text-white/30 w-6 text-right shrink-0">#{pick.draftPosition}</span>
                      <span className="text-xs text-white truncate flex-1">{pick.playerName}</span>
                      {pick.pickTag && (
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${
                          pick.pickTag === 'STEAL' ? 'bg-emerald-500/20 text-emerald-400' :
                          pick.pickTag === 'PLAN' ? 'bg-blue-500/20 text-blue-400' :
                          pick.pickTag === 'VALUE' ? 'bg-gold/20 text-gold' :
                          pick.pickTag === 'REACH' ? 'bg-orange-500/20 text-orange-400' :
                          pick.pickTag === 'FALLBACK' ? 'bg-purple-500/20 text-purple-400' :
                          pick.pickTag === 'PANIC' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-white/10 text-white/40'
                        }`}>{pick.pickTag}</span>
                      )}
                      {pick.wasOnBoard ? (
                        <span className={`text-[10px] font-mono shrink-0 w-10 text-right ${deviationColor}`}>
                          B#{pick.boardRank}{pick.deviation != null && pick.deviation !== 0 ? ` (${pick.deviation > 0 ? '+' : ''}${pick.deviation})` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-rose-400/60 shrink-0">Off Board</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Board players not drafted */}
              {(boardComparison.boardPlayersNotDrafted || []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <h4 className="text-[11px] text-white/40 mb-2">Targeted but didn't draft</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {boardComparison.boardPlayersNotDrafted.slice(0, 8).map((p, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]">
                        {p.playerName} <span className="text-white/15">B#{p.boardRank}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <Button variant="outline" fullWidth onClick={handleDraftAgain}>
                Draft Again
              </Button>
              <Link to="/draft/history" className="flex-1">
                <Button fullWidth>Back to History</Button>
              </Link>
            </div>
            {user && userPicks.length > 0 && (
              <div>
                {importSuccess ? (
                  <Link
                    to={`/lab/${importSuccess}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Board created — View Board
                  </Link>
                ) : (
                  <button
                    onClick={handleImportToBoard}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gold/30 rounded-lg text-gold text-sm font-semibold hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {importing ? 'Importing...' : 'Import to Board'}
                  </button>
                )}
                {importError && <p className="text-red-400 text-xs mt-1 text-center">{importError}</p>}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default MockDraftRecap
