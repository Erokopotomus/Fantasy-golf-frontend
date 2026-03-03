import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import NeuralCluster from '../components/common/NeuralCluster'
import SgRadarChart from '../components/players/SgRadarChart'
import PlayerDrawer from '../components/players/PlayerDrawer'
import { useDraftRecap } from '../hooks/useDraftHistory'

// ─── Grade Color Maps ────────────────────────────────────────────────────────

const gradeColors = {
  'A+': 'text-field', A: 'text-field', 'A-': 'text-field',
  'B+': 'text-blue-400', B: 'text-blue-400', 'B-': 'text-blue-400',
  'C+': 'text-crown', C: 'text-crown', 'C-': 'text-crown',
  'D+': 'text-blaze', D: 'text-blaze', 'D-': 'text-blaze',
  F: 'text-live-red',
}

const gradeBgColors = {
  'A+': 'bg-field-bright/20', A: 'bg-field-bright/20', 'A-': 'bg-field-bright/20',
  'B+': 'bg-blue-500/20', B: 'bg-blue-500/20', 'B-': 'bg-blue-500/20',
  'C+': 'bg-crown/20', C: 'bg-crown/20', 'C-': 'bg-crown/20',
  'D+': 'bg-orange-500/20', D: 'bg-orange-500/20', 'D-': 'bg-orange-500/20',
  F: 'bg-live-red/20',
}

const gradeBorderColors = {
  'A+': 'border-field/40', A: 'border-field/40', 'A-': 'border-field/40',
  'B+': 'border-blue-400/40', B: 'border-blue-400/40', 'B-': 'border-blue-400/40',
  'C+': 'border-crown/40', C: 'border-crown/40', 'C-': 'border-crown/40',
  'D+': 'border-blaze/40', D: 'border-blaze/40', 'D-': 'border-blaze/40',
  F: 'border-live-red/40',
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getGradeEmoji(grade) {
  if (!grade) return ''
  if (grade.startsWith('A')) return '🔥'
  if (grade.startsWith('B')) return '💪'
  if (grade.startsWith('C')) return '👊'
  if (grade.startsWith('D')) return '😬'
  return '💀'
}

function getGradeMessage(grade) {
  if (!grade) return ''
  if (grade === 'A+') return 'Legendary Draft'
  if (grade === 'A') return 'Elite Draft'
  if (grade === 'A-') return 'Outstanding Draft'
  if (grade.startsWith('B')) return 'Strong Draft'
  if (grade.startsWith('C')) return 'Solid Draft'
  if (grade.startsWith('D')) return 'Rough Day'
  return 'Rebuild Mode'
}

function getValueLabel(adpDiff) {
  if (adpDiff >= 8) return { text: 'HIGHWAY ROBBERY', color: 'text-field' }
  if (adpDiff >= 5) return { text: 'GREAT VALUE', color: 'text-field' }
  if (adpDiff >= 2) return { text: 'NICE STEAL', color: 'text-field' }
  if (adpDiff >= 0) return { text: 'FAIR PICK', color: 'text-text-muted' }
  if (adpDiff >= -3) return { text: 'SLIGHT REACH', color: 'text-crown' }
  if (adpDiff >= -6) return { text: 'REACH', color: 'text-blaze' }
  return { text: 'BIG REACH', color: 'text-live-red' }
}

function formatSg(val) {
  if (val == null) return '—'
  const num = parseFloat(val)
  if (isNaN(num)) return '—'
  return (num >= 0 ? '+' : '') + num.toFixed(2)
}

function sgColor(val) {
  if (val == null) return 'text-text-muted'
  if (val >= 2.0) return 'text-field'
  if (val >= 1.0) return 'text-field'
  if (val >= 0.5) return 'text-blue-400'
  if (val >= 0) return 'text-text-secondary'
  return 'text-live-red'
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1200, decimals = 0, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (value == null) return
    const target = parseFloat(value)
    if (isNaN(target)) return
    const start = performance.now()
    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(eased * target)
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [value, duration])

  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}</span>
}

// ─── Team SG Bar Chart ───────────────────────────────────────────────────────

function TeamSgBarChart({ teams }) {
  if (!teams || teams.length === 0) return null
  const maxSg = Math.max(...teams.map(t => t.avgSg || 0), 0.01)

  return (
    <div className="space-y-2">
      {teams.map((team, i) => (
        <div key={team.teamId} className="flex items-center gap-3">
          <span className="text-text-muted text-xs w-5 text-right font-mono">{i + 1}</span>
          <div className="w-24 truncate text-xs font-medium text-text-primary">{team.teamName}</div>
          <div className="flex-1 h-6 bg-[var(--bg-alt)] rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.max((team.avgSg / maxSg) * 100, 4)}%`,
                background: i === 0
                  ? 'linear-gradient(90deg, #D4930D, #F06820)'
                  : i === 1
                    ? 'linear-gradient(90deg, #6B7280, #9CA3AF)'
                    : i === 2
                      ? 'linear-gradient(90deg, #92400E, #B45309)'
                      : 'var(--stone)',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono font-bold text-white drop-shadow-sm">
              {team.avgSg?.toFixed(2) || '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pick Grade Progress Ring ────────────────────────────────────────────────

function GradeRing({ score, grade, size = 64 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--card-border)" strokeWidth={4} opacity={0.3} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={grade?.startsWith('A') ? '#10B981' : grade?.startsWith('B') ? '#3B82F6' : grade?.startsWith('C') ? '#D4930D' : grade?.startsWith('D') ? '#F06820' : '#E83838'}
          strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${gradeColors[grade] || 'text-text-muted'}`}>{grade}</span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DraftRecap = () => {
  const { draftId } = useParams()
  const { draft, loading, error } = useDraftRecap(draftId)
  const [activeSection, setActiveSection] = useState('overview')
  const [drawerPlayer, setDrawerPlayer] = useState(null)
  const [revealStep, setRevealStep] = useState(0)

  // Cinematic reveal: step through sections
  useEffect(() => {
    if (!draft) return
    const timers = [
      setTimeout(() => setRevealStep(1), 300),   // hero card
      setTimeout(() => setRevealStep(2), 800),   // stats row
      setTimeout(() => setRevealStep(3), 1200),  // team roster SG
      setTimeout(() => setRevealStep(4), 1600),  // team grades
      setTimeout(() => setRevealStep(5), 2000),  // draft board + rest
    ]
    return () => timers.forEach(clearTimeout)
  }, [draft])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <NeuralCluster size="lg" intensity="thinking" />
        <p className="text-text-secondary font-editorial italic animate-pulse">Analyzing your draft...</p>
      </div>
    )
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-live-red mb-4">{error || 'Draft not found'}</p>
          <Link to="/draft/history"><Button>Back to History</Button></Link>
        </Card>
      </div>
    )
  }

  const userGrade = draft.grades?.find(g => g.teamId === draft.userTeamId)
  const userPicks = draft.picks?.filter(p => p.teamId === draft.userTeamId) || []
  const userPickGrades = userGrade?.pickGrades || []
  const sortedTeamGrades = [...(draft.grades || [])].sort((a, b) => b.overallScore - a.overallScore)
  const userRank = sortedTeamGrades.findIndex(g => g.teamId === draft.userTeamId) + 1

  // Build team rosters with SG averages
  const teamRosters = new Map()
  for (const pick of draft.picks) {
    if (!teamRosters.has(pick.teamId)) {
      teamRosters.set(pick.teamId, { teamId: pick.teamId, teamName: pick.teamName, picks: [] })
    }
    teamRosters.get(pick.teamId).picks.push(pick)
  }
  const teamSgRanking = [...teamRosters.values()].map(t => {
    const sgValues = t.picks.map(p => p.sgTotal).filter(v => v != null)
    return {
      teamId: t.teamId,
      teamName: t.teamName,
      avgSg: sgValues.length > 0 ? sgValues.reduce((a, b) => a + b, 0) / sgValues.length : 0,
      totalSg: sgValues.reduce((a, b) => a + b, 0),
      playerCount: sgValues.length,
    }
  }).sort((a, b) => b.avgSg - a.avgSg)

  // User team SG data for radar chart
  const userTeamForRadar = userPicks.filter(p => p.sgTotal != null).map(p => ({
    name: p.playerName,
    sgTotal: p.sgTotal,
    sgOffTee: p.sgOffTee || null,
    sgApproach: p.sgApproach || null,
    sgAroundGreen: p.sgAroundGreen || null,
    sgPutting: p.sgPutting || null,
  }))

  // Quick stat computations
  const userSgValues = userPicks.map(p => p.sgTotal).filter(v => v != null)
  const userAvgSg = userSgValues.length > 0 ? userSgValues.reduce((a, b) => a + b, 0) / userSgValues.length : null
  const userSgRank = teamSgRanking.findIndex(t => t.teamId === draft.userTeamId) + 1
  const bestSgPick = [...userPicks].sort((a, b) => (b.sgTotal || -99) - (a.sgTotal || -99))[0]
  const steals = userPickGrades.filter(pg => pg.adpDiff >= 3)
  const reaches = userPickGrades.filter(pg => pg.adpDiff <= -5)

  // Draft board
  const teams = [...new Map(draft.picks.map(p => [p.teamId, { id: p.teamId, name: p.teamName }])).values()]
  const rounds = Math.max(...draft.picks.map(p => p.round), 0)

  const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'roster', label: 'Your Roster' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'board', label: 'Draft Board' },
  ]

  return (
    <div className="min-h-screen">
      <main className="pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Back nav */}
          <Link to={`/leagues/${draft.leagueId}`} className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to League
          </Link>

          {/* ══════════════════════════════════════════════════════════════════
              HERO GRADE REVEAL
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-700 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Card className={`mb-6 border ${gradeBorderColors[userGrade?.overallGrade] || 'border-[var(--card-border)]'} overflow-hidden relative`}>
              {/* Gradient glow behind grade */}
              <div className="absolute top-0 right-0 w-40 h-40 opacity-10 rounded-full blur-3xl"
                style={{ background: userGrade?.overallGrade?.startsWith('A') ? '#10B981' : userGrade?.overallGrade?.startsWith('B') ? '#3B82F6' : '#D4930D' }}
              />

              <div className="relative">
                {/* Top line */}
                <div className="flex items-center gap-2 mb-4">
                  <NeuralCluster size="sm" intensity="active" />
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Draft Intelligence Report</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Grade ring - big and proud */}
                  {userGrade && (
                    <div className="flex flex-col items-center gap-2">
                      <GradeRing score={userGrade.overallScore} grade={userGrade.overallGrade} size={100} />
                      <span className="text-xs font-mono text-text-muted">{userGrade.overallScore}/100</span>
                    </div>
                  )}

                  {/* Info block */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-1">
                      {getGradeEmoji(userGrade?.overallGrade)} {getGradeMessage(userGrade?.overallGrade)}
                    </h1>
                    <p className="text-text-secondary mb-3">
                      {draft.leagueName} · {draft.draftType} draft · {draft.teamCount} teams · {draft.totalRounds} rounds
                    </p>

                    {/* Rank badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-alt)] border border-[var(--card-border)]">
                      <span className="text-xs text-text-muted">Draft rank:</span>
                      <span className="font-mono font-bold text-text-primary">
                        {userRank}/{draft.teamCount}
                      </span>
                      {userRank === 1 && <span className="text-xs">👑</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              QUICK STATS ROW
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-700 delay-200 ${revealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Avg SG Total</p>
                <p className={`text-2xl font-mono font-bold ${sgColor(userAvgSg)}`}>
                  {userAvgSg != null ? <AnimatedNumber value={userAvgSg} decimals={2} prefix={userAvgSg >= 0 ? '+' : ''} duration={1500} /> : '—'}
                </p>
                <p className="text-text-muted text-[10px] font-mono mt-1">
                  SG Rank: {userSgRank}/{draft.teamCount}
                </p>
              </Card>

              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Total Value</p>
                <p className={`text-2xl font-mono font-bold ${(userGrade?.totalValue || 0) >= 0 ? 'text-field' : 'text-live-red'}`}>
                  <AnimatedNumber value={userGrade?.totalValue || 0} prefix={(userGrade?.totalValue || 0) >= 0 ? '+' : ''} duration={1500} />
                </p>
                <p className="text-text-muted text-[10px] font-mono mt-1">ADP value captured</p>
              </Card>

              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Steals</p>
                <p className="text-2xl font-mono font-bold text-field">
                  <AnimatedNumber value={steals.length} duration={1000} />
                </p>
                <p className="text-text-muted text-[10px] font-mono mt-1">picks 3+ below ADP</p>
              </Card>

              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Best Pick SG</p>
                <p className={`text-2xl font-mono font-bold ${sgColor(bestSgPick?.sgTotal)}`}>
                  {bestSgPick?.sgTotal != null ? formatSg(bestSgPick.sgTotal) : '—'}
                </p>
                <p className="text-text-muted text-[10px] font-mono mt-1 truncate">{bestSgPick?.playerName || '—'}</p>
              </Card>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              SECTION TABS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 mb-6 overflow-x-auto">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === s.id ? 'bg-[var(--crown)] text-slate' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              OVERVIEW TAB
              ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'overview' && (
            <div className={`transition-all duration-700 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

              {/* SG Power Ranking */}
              <Card className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold font-display text-text-primary">Team SG Power Ranking</h2>
                  <span className="text-xs font-mono text-text-muted px-2 py-0.5 bg-[var(--bg-alt)] rounded">by avg Strokes Gained</span>
                </div>
                <TeamSgBarChart teams={teamSgRanking} />
              </Card>

              {/* Radar Chart — if SG data exists for user's players */}
              {userTeamForRadar.length > 0 && userTeamForRadar.some(p => p.sgOffTee != null) && (
                <Card className="mb-6">
                  <h2 className="text-lg font-semibold font-display text-text-primary mb-2">Your Team's SG DNA</h2>
                  <p className="text-text-muted text-xs mb-4">Where your roster's strengths and weaknesses lie — each axis shows Strokes Gained proficiency.</p>
                  <div className="flex justify-center">
                    <SgRadarChart players={userTeamForRadar.slice(0, 5)} size={300} />
                  </div>
                  {userTeamForRadar.length > 5 && (
                    <p className="text-center text-text-muted text-[10px] font-mono mt-2">Showing top 5 picks. Full SG breakdown in roster tab.</p>
                  )}
                </Card>
              )}

              {/* Sleepers & Reaches side by side */}
              {userGrade && (userGrade.sleepers?.length > 0 || userGrade.reaches?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {userGrade.sleepers?.length > 0 && (
                    <Card className="border-field/20">
                      <h3 className="text-sm font-semibold text-field mb-3 flex items-center gap-2">
                        <span className="text-base">🎯</span> Sleeper Picks
                      </h3>
                      <div className="space-y-2">
                        {userGrade.sleepers.map(s => (
                          <div key={s.pickNumber} className="flex items-center justify-between p-2 bg-field/5 rounded-lg">
                            <span className="text-text-primary text-sm font-medium">{s.playerName}</span>
                            <span className="text-field text-xs font-mono font-bold">R{s.round} · +{s.adpDiff} value</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {userGrade.reaches?.length > 0 && (
                    <Card className="border-live-red/20">
                      <h3 className="text-sm font-semibold text-live-red mb-3 flex items-center gap-2">
                        <span className="text-base">⚠️</span> Reaches
                      </h3>
                      <div className="space-y-2">
                        {userGrade.reaches.map(r => (
                          <div key={r.pickNumber} className="flex items-center justify-between p-2 bg-live-red/5 rounded-lg">
                            <span className="text-text-primary text-sm font-medium">{r.playerName}</span>
                            <span className="text-live-red text-xs font-mono font-bold">R{r.round} · {r.adpDiff} value</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* AI Coach line */}
              <Card className="mb-6 border-[var(--crown)]/20 bg-gradient-to-r from-[var(--surface)] to-[var(--crown)]/5">
                <div className="flex items-start gap-3">
                  <NeuralCluster size="sm" intensity="calm" />
                  <div>
                    <p className="text-xs font-mono text-[var(--crown)] uppercase tracking-wide mb-1">Coach's Take</p>
                    <p className="text-text-primary text-sm font-editorial italic leading-relaxed">
                      {userGrade?.overallGrade?.startsWith('A')
                        ? `Dominant draft. You secured an average SG Total of ${userAvgSg?.toFixed(2) || '—'} across your roster — that's elite-level talent acquisition. ${steals.length > 0 ? `${steals.length} steal${steals.length > 1 ? 's' : ''} that could define your season.` : 'Every pick was surgical.'}`
                        : userGrade?.overallGrade?.startsWith('B')
                          ? `Strong draft with real upside. Your roster's average SG of ${userAvgSg?.toFixed(2) || '—'} puts you in contention. ${steals.length > 0 ? `Watch ${steals[0].playerName} — that's your breakout candidate.` : 'Consistency across rounds was your strength.'}`
                          : userGrade?.overallGrade?.startsWith('C')
                            ? `Workable draft. Average SG of ${userAvgSg?.toFixed(2) || '—'} means you've got a path to the playoffs, but the waiver wire will be your best friend. ${bestSgPick ? `${bestSgPick.playerName} is your anchor — build around that.` : ''}`
                            : `Tough draw, but it's a long season. ${bestSgPick ? `${bestSgPick.playerName} gives you a foundation.` : ''} Hit the waiver wire hard and make smart trades. Championships aren't won on draft day.`
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ROSTER TAB — Your Picks with full SG breakdown
              ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'roster' && (
            <div>
              <Card className="mb-6">
                <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Your Roster — Pick by Pick</h2>
                <div className="space-y-2">
                  {userPicks.map((pick) => {
                    const pg = userPickGrades.find(g => g.pickNumber === pick.pickNumber) || {}
                    const valueLabel = getValueLabel(pg.adpDiff)
                    return (
                      <div
                        key={pick.pickNumber}
                        className="flex items-center gap-3 p-3 bg-[var(--bg-alt)] rounded-lg hover:bg-[var(--bg-alt)]/80 transition-colors cursor-pointer group"
                        onClick={() => setDrawerPlayer(pick)}
                      >
                        {/* Round badge */}
                        <div className="flex flex-col items-center w-10 shrink-0">
                          <span className="text-text-muted text-[10px] font-mono">R{pick.round}</span>
                          <GradeRing score={pg.score || 70} grade={pg.grade} size={40} />
                        </div>

                        {/* Headshot */}
                        {pick.headshotUrl ? (
                          <img src={pick.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-[var(--crown)] transition-colors shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-sm text-text-muted shrink-0">
                            {pick.countryFlag || '?'}
                          </div>
                        )}

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium group-hover:text-[var(--crown)] transition-colors truncate">
                            {pick.playerName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>Pick #{pick.pickNumber}</span>
                            <span>·</span>
                            <span>Rank #{pick.playerRank || '—'}</span>
                            {pick.sgTotal != null && (
                              <>
                                <span>·</span>
                                <span className={`font-mono font-bold ${sgColor(pick.sgTotal)}`}>SG {formatSg(pick.sgTotal)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Value tag */}
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-mono font-bold ${valueLabel.color} block`}>{valueLabel.text}</span>
                          {pg.adpDiff != null && (
                            <span className={`text-xs font-mono ${pg.adpDiff >= 0 ? 'text-field' : 'text-live-red'}`}>
                              {pg.adpDiff >= 0 ? '+' : ''}{pg.adpDiff}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* SG Stats table for user's roster */}
              {userPicks.some(p => p.sgTotal != null) && (
                <Card className="mb-6">
                  <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Roster SG Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-text-muted text-xs font-mono border-b border-[var(--card-border)]">
                          <th className="text-left py-2 pr-4">Player</th>
                          <th className="text-right py-2 px-2">Total</th>
                          <th className="text-right py-2 px-2">OTT</th>
                          <th className="text-right py-2 px-2">APP</th>
                          <th className="text-right py-2 px-2">ARG</th>
                          <th className="text-right py-2 px-2">PUTT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPicks.map(pick => (
                          <tr
                            key={pick.pickNumber}
                            className="border-b border-[var(--card-border)]/50 hover:bg-[var(--bg-alt)] cursor-pointer"
                            onClick={() => setDrawerPlayer(pick)}
                          >
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                {pick.headshotUrl ? (
                                  <img src={pick.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-[10px] text-text-muted">{pick.countryFlag || '?'}</div>
                                )}
                                <span className="text-text-primary font-medium truncate">{pick.playerName}</span>
                              </div>
                            </td>
                            <td className={`text-right py-2 px-2 font-mono font-bold ${sgColor(pick.sgTotal)}`}>{formatSg(pick.sgTotal)}</td>
                            <td className={`text-right py-2 px-2 font-mono text-xs ${sgColor(pick.sgOffTee)}`}>{formatSg(pick.sgOffTee)}</td>
                            <td className={`text-right py-2 px-2 font-mono text-xs ${sgColor(pick.sgApproach)}`}>{formatSg(pick.sgApproach)}</td>
                            <td className={`text-right py-2 px-2 font-mono text-xs ${sgColor(pick.sgAroundGreen)}`}>{formatSg(pick.sgAroundGreen)}</td>
                            <td className={`text-right py-2 px-2 font-mono text-xs ${sgColor(pick.sgPutting)}`}>{formatSg(pick.sgPutting)}</td>
                          </tr>
                        ))}
                        {/* Team average row */}
                        <tr className="font-bold bg-[var(--bg-alt)]">
                          <td className="py-2 pr-4 text-text-muted text-xs">TEAM AVG</td>
                          <td className={`text-right py-2 px-2 font-mono ${sgColor(userAvgSg)}`}>
                            {userAvgSg != null ? formatSg(userAvgSg) : '—'}
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              LEADERBOARD TAB — All Teams Grades
              ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'leaderboard' && (
            <div className={`transition-all duration-700 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {sortedTeamGrades.length > 0 && (
                <Card className="mb-6">
                  <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Draft Leaderboard</h2>
                  <div className="space-y-2">
                    {sortedTeamGrades.map((grade, i) => {
                      const teamSg = teamSgRanking.find(t => t.teamId === grade.teamId)
                      return (
                        <div
                          key={grade.teamId}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                            grade.teamId === draft.userTeamId
                              ? 'bg-[var(--crown)]/10 border border-[var(--crown)]/30'
                              : 'bg-[var(--bg-alt)] hover:bg-[var(--bg-alt)]/80'
                          }`}
                        >
                          <span className={`text-lg font-bold w-8 text-center ${
                            i === 0 ? 'text-[var(--crown)]' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-text-muted'
                          }`}>
                            {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </span>

                          <GradeRing score={grade.overallScore} grade={grade.overallGrade} size={48} />

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${grade.teamId === draft.userTeamId ? 'text-[var(--crown)]' : 'text-text-primary'}`}>
                              {grade.teamName} {grade.teamId === draft.userTeamId && '(You)'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                              <span className="font-mono">Score: {grade.overallScore}</span>
                              {teamSg && <span className={`font-mono ${sgColor(teamSg.avgSg)}`}>Avg SG: {teamSg.avgSg.toFixed(2)}</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-mono font-bold ${grade.totalValue >= 0 ? 'text-field' : 'text-live-red'}`}>
                              {grade.totalValue >= 0 ? '+' : ''}{grade.totalValue}
                            </p>
                            <p className="text-text-muted text-[10px] font-mono">value</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAFT BOARD TAB
              ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'board' && (
            <div className={`transition-all duration-700 ${revealStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Card className="mb-6 overflow-x-auto">
                <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Full Draft Board</h2>
                <div className="min-w-[600px]">
                  <div className="grid gap-px bg-[var(--card-border)]" style={{ gridTemplateColumns: `60px repeat(${teams.length}, 1fr)` }}>
                    <div className="bg-[var(--surface)] p-2 text-xs text-text-muted font-medium">Rd</div>
                    {teams.map(team => (
                      <div
                        key={team.id}
                        className={`bg-[var(--surface)] p-2 text-xs font-medium truncate ${team.id === draft.userTeamId ? 'text-[var(--crown)] border-b-2 border-[var(--crown)]' : 'text-text-secondary'}`}
                      >
                        {team.name}
                      </div>
                    ))}
                    {Array.from({ length: rounds }, (_, r) => {
                      const round = r + 1
                      return [
                        <div key={`r-${round}`} className="bg-[var(--bg-alt)] p-2 text-xs text-text-muted font-medium flex items-center">{round}</div>,
                        ...teams.map(team => {
                          const pick = draft.picks.find(p => p.round === round && p.teamId === team.id)
                          const pg = draft.grades?.find(g => g.teamId === team.id)?.pickGrades?.find(g => g.pickNumber === pick?.pickNumber)
                          return (
                            <div
                              key={`${round}-${team.id}`}
                              className={`bg-[var(--bg-alt)] p-1.5 text-xs cursor-pointer hover:bg-[var(--surface)] transition-colors ${
                                team.id === draft.userTeamId ? 'bg-[var(--crown)]/5' : ''
                              }`}
                              onClick={() => pick && setDrawerPlayer(pick)}
                              title={pick ? `${pick.playerName} — ${pg?.grade || ''}` : ''}
                            >
                              {pick ? (
                                <div className="truncate">
                                  <span className="text-text-primary text-xs">{pick.playerName?.split(' ').pop()}</span>
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
            </div>
          )}

          {/* Bottom CTAs */}
          <div className="flex gap-4 mt-6">
            <Link to={`/leagues/${draft.leagueId}`} className="flex-1">
              <Button variant="outline" fullWidth>Back to League</Button>
            </Link>
            <Link to="/draft/history" className="flex-1">
              <Button variant="outline" fullWidth>Draft History</Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Player Drawer */}
      {drawerPlayer && (
        <PlayerDrawer
          player={{ id: drawerPlayer.playerId, name: drawerPlayer.playerName }}
          onClose={() => setDrawerPlayer(null)}
        />
      )}
    </div>
  )
}

export default DraftRecap
