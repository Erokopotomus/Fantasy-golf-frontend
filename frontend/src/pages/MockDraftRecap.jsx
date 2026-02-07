import { useParams, Link, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useMockDraftRecap } from '../hooks/useDraftHistory'

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

const MockDraftRecap = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { result, loading, error } = useMockDraftRecap(id)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
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

  const handleDraftAgain = () => {
    sessionStorage.setItem('mockDraftConfig', JSON.stringify({
      draftType: result.draftType,
      teamCount: result.teamCount,
      rosterSize: result.rosterSize,
      userPosition: result.userPosition,
    }))
    navigate('/mock-draft/room')
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
              <h1 className="text-2xl font-bold text-white">Mock Draft Recap</h1>
              <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                <span className="px-2 py-0.5 bg-dark-tertiary rounded text-xs capitalize">{result.draftType}</span>
                <span>{result.teamCount} teams</span>
                <span>{result.rosterSize} rounds</span>
                <span>{new Date(result.completedAt).toLocaleDateString()}</span>
                {result.dataSource === 'api' && (
                  <span className="px-1.5 py-0.5 bg-accent-green/15 text-accent-green text-[10px] font-semibold rounded">LIVE DATA</span>
                )}
              </div>
            </div>
          </div>

          {/* Grade Card */}
          <Card className="mb-6 border-accent-green/30">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${gradeBgColors[result.overallGrade] || 'bg-dark-tertiary'}`}>
                <span className={`text-4xl font-bold ${gradeColors[result.overallGrade] || 'text-text-muted'}`}>
                  {result.overallGrade || '—'}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">Your Draft Grade</h2>
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
            <h2 className="text-lg font-semibold text-white mb-4">Your Picks</h2>
            <div className="space-y-2">
              {userPicks.map((pick, i) => {
                const pg = pickGrades.find(g => g.pickNumber === pick.pickNumber) || pickGrades[i] || {}
                return (
                  <div key={pick.pickNumber || i} className="flex items-center justify-between p-3 bg-dark-primary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-sm w-8">R{pick.round}</span>
                      <span className="text-lg">{pick.playerFlag || ''}</span>
                      <div>
                        <p className="text-white font-medium">{pick.playerName}</p>
                        <p className="text-text-muted text-xs">
                          Pick #{pick.pickNumber} · Rank #{pick.playerRank || '—'}
                          {pg.adpDiff != null && pg.adpDiff > 3 && (
                            <span className="ml-2 text-green-400">Steal!</span>
                          )}
                          {pg.adpDiff != null && pg.adpDiff < -5 && (
                            <span className="ml-2 text-red-400">Reach</span>
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
              <h2 className="text-lg font-semibold text-white mb-4">Draft Board</h2>
              <div className="min-w-[500px]">
                <div className="grid gap-px bg-dark-border" style={{ gridTemplateColumns: `50px repeat(${result.teamCount}, 1fr)` }}>
                  {/* Headers */}
                  <div className="bg-dark-secondary p-2 text-xs text-text-muted">Rd</div>
                  {teamNames.map((name, i) => (
                    <div
                      key={i}
                      className={`bg-dark-secondary p-2 text-xs font-medium truncate ${
                        allPicks.some(p => p.teamIndex === i && p.isUser) ? 'text-accent-green border-b-2 border-accent-green' : 'text-text-secondary'
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
                            className={`bg-dark-primary p-1.5 text-xs ${isUserTeam ? 'bg-accent-green/5' : ''}`}
                          >
                            {pick ? (
                              <div className="truncate">
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

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" fullWidth onClick={handleDraftAgain}>
              Draft Again
            </Button>
            <Link to="/draft/history" className="flex-1">
              <Button fullWidth>Back to History</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MockDraftRecap
