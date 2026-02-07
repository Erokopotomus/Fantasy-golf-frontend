import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useDraftRecap } from '../hooks/useDraftHistory'

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

const DraftRecap = () => {
  const { draftId } = useParams()
  const { draft, loading, error } = useDraftRecap(draftId)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-red-400 mb-4">{error || 'Draft not found'}</p>
          <Link to="/draft/history"><Button>Back to History</Button></Link>
        </Card>
      </div>
    )
  }

  const userGrade = draft.grades?.find(g => g.teamId === draft.userTeamId)
  const userPicks = draft.picks?.filter(p => p.teamId === draft.userTeamId) || []
  const userPickGrades = userGrade?.pickGrades || []
  const sortedTeamGrades = [...(draft.grades || [])].sort((a, b) => b.overallScore - a.overallScore)

  // Build draft board structure
  const teams = [...new Map(draft.picks.map(p => [p.teamId, { id: p.teamId, name: p.teamName }])).values()]
  const rounds = Math.max(...draft.picks.map(p => p.round), 0)

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/draft/history" className="text-text-secondary hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{draft.leagueName}</h1>
              <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                <span className="px-2 py-0.5 bg-dark-tertiary rounded text-xs">{draft.draftType} Draft</span>
                <span>{draft.teamCount} teams</span>
                <span>{draft.totalRounds} rounds</span>
                {draft.endTime && <span>{new Date(draft.endTime).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          {/* Your Grade Card */}
          {userGrade && (
            <Card className="mb-6 border-accent-green/30">
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${gradeBgColors[userGrade.overallGrade] || 'bg-dark-tertiary'}`}>
                  <span className={`text-4xl font-bold ${gradeColors[userGrade.overallGrade] || 'text-text-muted'}`}>
                    {userGrade.overallGrade}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white mb-1">Your Draft Grade</h2>
                  <p className="text-text-secondary text-sm mb-3">Score: {userGrade.overallScore}/100</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {userGrade.bestPick && (
                      <div>
                        <span className="text-text-muted">Best pick: </span>
                        <span className="text-green-400">{userGrade.bestPick.playerName} ({userGrade.bestPick.grade})</span>
                      </div>
                    )}
                    {userGrade.worstPick && (
                      <div>
                        <span className="text-text-muted">Worst pick: </span>
                        <span className="text-red-400">{userGrade.worstPick.playerName} ({userGrade.worstPick.grade})</span>
                      </div>
                    )}
                    <div>
                      <span className="text-text-muted">Total value: </span>
                      <span className={userGrade.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {userGrade.totalValue >= 0 ? '+' : ''}{userGrade.totalValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Your Picks */}
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Picks</h2>
            <div className="space-y-2">
              {userPicks.map((pick, i) => {
                const pg = userPickGrades.find(g => g.pickNumber === pick.pickNumber) || {}
                return (
                  <div key={pick.pickNumber} className="flex items-center justify-between p-3 bg-dark-primary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-sm w-8">R{pick.round}</span>
                      {pick.headshotUrl ? (
                        <img src={pick.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-xs text-text-muted">
                          {pick.countryFlag || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{pick.playerName}</p>
                        <p className="text-text-muted text-xs">
                          Pick #{pick.pickNumber} · Rank #{pick.playerRank || '—'}
                          {pg.adpDiff != null && (
                            <span className={`ml-2 ${pg.adpDiff > 0 ? 'text-green-400' : pg.adpDiff < 0 ? 'text-red-400' : 'text-text-muted'}`}>
                              {pg.adpDiff > 0 ? 'Steal' : pg.adpDiff < -5 ? 'Reach' : ''}
                            </span>
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
                      <span className={`text-sm font-bold ${gradeColors[pg.grade] || 'text-text-muted'}`}>
                        {pg.grade || '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Draft Board */}
          <Card className="mb-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Draft Board</h2>
            <div className="min-w-[600px]">
              {/* Team headers */}
              <div className="grid gap-px bg-dark-border" style={{ gridTemplateColumns: `60px repeat(${teams.length}, 1fr)` }}>
                <div className="bg-dark-secondary p-2 text-xs text-text-muted font-medium">Rd</div>
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={`bg-dark-secondary p-2 text-xs font-medium truncate ${team.id === draft.userTeamId ? 'text-accent-green border-b-2 border-accent-green' : 'text-text-secondary'}`}
                  >
                    {team.name}
                  </div>
                ))}
                {/* Picks */}
                {Array.from({ length: rounds }, (_, r) => {
                  const round = r + 1
                  return [
                    <div key={`r-${round}`} className="bg-dark-primary p-2 text-xs text-text-muted font-medium flex items-center">{round}</div>,
                    ...teams.map(team => {
                      const pick = draft.picks.find(p => p.round === round && p.teamId === team.id)
                      const pg = draft.grades?.find(g => g.teamId === team.id)?.pickGrades?.find(g => g.pickNumber === pick?.pickNumber)
                      return (
                        <div
                          key={`${round}-${team.id}`}
                          className={`bg-dark-primary p-1.5 text-xs ${team.id === draft.userTeamId ? 'bg-accent-green/5' : ''}`}
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

          {/* Team Grades Leaderboard */}
          {sortedTeamGrades.length > 0 && (
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">All Teams Grades</h2>
              <div className="space-y-2">
                {sortedTeamGrades.map((grade, i) => (
                  <div
                    key={grade.teamId}
                    className={`flex items-center gap-4 p-3 rounded-lg ${grade.teamId === draft.userTeamId ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-dark-primary'}`}
                  >
                    <span className="text-text-muted text-sm w-6">{i + 1}</span>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gradeBgColors[grade.overallGrade] || 'bg-dark-tertiary'}`}>
                      <span className={`text-lg font-bold ${gradeColors[grade.overallGrade] || 'text-text-muted'}`}>{grade.overallGrade}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${grade.teamId === draft.userTeamId ? 'text-accent-green' : 'text-white'}`}>
                        {grade.teamName} {grade.teamId === draft.userTeamId && '(You)'}
                      </p>
                      <p className="text-text-muted text-xs">Score: {grade.overallScore}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className={grade.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {grade.totalValue >= 0 ? '+' : ''}{grade.totalValue}
                      </p>
                      <p className="text-text-muted text-xs">value</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Sleepers & Reaches */}
          {userGrade && (userGrade.sleepers?.length > 0 || userGrade.reaches?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {userGrade.sleepers?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Sleepers
                  </h3>
                  <div className="space-y-2">
                    {userGrade.sleepers.map(s => (
                      <div key={s.pickNumber} className="flex items-center justify-between text-sm">
                        <span className="text-white">{s.playerName}</span>
                        <span className="text-green-400">R{s.round} · +{s.adpDiff}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {userGrade.reaches?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Reaches
                  </h3>
                  <div className="space-y-2">
                    {userGrade.reaches.map(r => (
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

          <div className="flex gap-4">
            <Link to="/draft/history" className="flex-1">
              <Button variant="outline" fullWidth>Back to History</Button>
            </Link>
            <Link to="/draft" className="flex-1">
              <Button fullWidth>Draft Center</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DraftRecap
