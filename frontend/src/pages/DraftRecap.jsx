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

// R01: League-size normalized value labels — scale thresholds by totalTeams
// so a 4-team league doesn't compress all picks into "FAIR PICK"
function getValueLabel(adpDiff, totalTeams = 10) {
  const scale = 10 / (totalTeams || 10)
  const normalized = adpDiff * scale
  if (normalized >= 8) return { text: 'HIGHWAY ROBBERY', color: 'text-field' }
  if (normalized >= 5) return { text: 'GREAT VALUE', color: 'text-field' }
  if (normalized >= 2) return { text: 'NICE STEAL', color: 'text-field' }
  if (normalized >= 0) return { text: 'FAIR PICK', color: 'text-text-muted' }
  if (normalized >= -3) return { text: 'SLIGHT REACH', color: 'text-crown' }
  if (normalized >= -6) return { text: 'REACH', color: 'text-blaze' }
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

// R07: Format draft date nicely
function formatDraftDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

// R02: Generate team initials for avatar
function getTeamInitials(name) {
  if (!name) return '??'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
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

// R04: Clickable player name component — opens PlayerDrawer
function ClickablePlayer({ name, playerId, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick({ playerId, playerName: name }) }}
      className={`text-left hover:text-[var(--crown)] transition-colors cursor-pointer ${className}`}
    >
      {name}
    </button>
  )
}

// ─── Coach Commentary Generator ─────────────────────────────────────────────
// R02: Generates coach commentary for any team (not just user)

function getCoachCommentary({ grade, avgSg, steals, bestSgPick, isUserTeam, teamName }) {
  const teamRef = isUserTeam ? 'You' : teamName
  const possessive = isUserTeam ? 'Your' : `${teamName}'s`
  const verb = isUserTeam ? 'secured' : 'secured'

  if (grade?.startsWith('A')) {
    return `Dominant draft. ${teamRef} ${verb} an average SG Total of ${avgSg?.toFixed(2) || '—'} across the roster — that's elite-level talent acquisition. ${steals.length > 0 ? `${steals.length} steal${steals.length > 1 ? 's' : ''} that could define the season.` : 'Every pick was surgical.'}`
  }
  if (grade?.startsWith('B')) {
    return `Strong draft with real upside. ${possessive} roster average SG of ${avgSg?.toFixed(2) || '—'} puts ${isUserTeam ? 'you' : 'them'} in contention. ${steals.length > 0 ? `Watch ${steals[0].playerName} — that's ${isUserTeam ? 'your' : 'their'} breakout candidate.` : 'Consistency across rounds was the strength.'}`
  }
  if (grade?.startsWith('C')) {
    return `Workable draft. Average SG of ${avgSg?.toFixed(2) || '—'} means ${isUserTeam ? "you've" : "they've"} got a path to the playoffs, but the waiver wire will be ${isUserTeam ? 'your' : 'their'} best friend. ${bestSgPick ? `${bestSgPick.playerName} is the anchor — build around that.` : ''}`
  }
  return `Tough draw, but it's a long season. ${bestSgPick ? `${bestSgPick.playerName} gives ${isUserTeam ? 'you' : 'them'} a foundation.` : ''} ${isUserTeam ? 'Hit' : 'They should hit'} the waiver wire hard and make smart trades. Championships aren't won on draft day.`
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DraftRecap = () => {
  const { draftId } = useParams()
  const { draft, loading, error } = useDraftRecap(draftId)
  const [activeSection, setActiveSection] = useState('overview')
  const [drawerPlayer, setDrawerPlayer] = useState(null)
  const [revealStep, setRevealStep] = useState(0)
  // R02: Selected team (defaults to user's team once draft loads)
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  // R02: Set default selected team to user's team when draft loads
  useEffect(() => {
    if (draft && !selectedTeamId) {
      setSelectedTeamId(draft.userTeamId)
    }
  }, [draft, selectedTeamId])

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

  // R02: Derive data for the selected team (not just the user's team)
  const activeTeamId = selectedTeamId || draft.userTeamId
  const isViewingOwnTeam = activeTeamId === draft.userTeamId
  const activeGrade = draft.grades?.find(g => g.teamId === activeTeamId)
  const activePicks = draft.picks?.filter(p => p.teamId === activeTeamId) || []
  const activePickGrades = activeGrade?.pickGrades || []
  const sortedTeamGrades = [...(draft.grades || [])].sort((a, b) => b.overallScore - a.overallScore)
  const activeRank = sortedTeamGrades.findIndex(g => g.teamId === activeTeamId) + 1
  const activeTeamName = activePicks[0]?.teamName || activeGrade?.teamName || 'Team'

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

  // R02: Active team SG data for radar chart
  const activeTeamForRadar = activePicks.filter(p => p.sgTotal != null).map(p => ({
    name: p.playerName,
    sgTotal: p.sgTotal,
    sgOffTee: p.sgOffTee || null,
    sgApproach: p.sgApproach || null,
    sgAroundGreen: p.sgAroundGreen || null,
    sgPutting: p.sgPutting || null,
  }))

  // Quick stat computations for the active team
  const activeSgValues = activePicks.map(p => p.sgTotal).filter(v => v != null)
  const activeAvgSg = activeSgValues.length > 0 ? activeSgValues.reduce((a, b) => a + b, 0) / activeSgValues.length : null
  const activeSgRank = teamSgRanking.findIndex(t => t.teamId === activeTeamId) + 1
  const bestSgPick = [...activePicks].sort((a, b) => (b.sgTotal || -99) - (a.sgTotal || -99))[0]
  const steals = activePickGrades.filter(pg => pg.adpDiff >= 3)
  const reaches = activePickGrades.filter(pg => pg.adpDiff <= -5)

  // Draft board
  const teams = [...new Map(draft.picks.map(p => [p.teamId, { id: p.teamId, name: p.teamName }])).values()]
  const rounds = Math.max(...draft.picks.map(p => p.round), 0)
  const totalTeams = draft.teamCount || teams.length

  // R04: Open drawer helper
  const openDrawer = (pick) => setDrawerPlayer(pick)

  const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'roster', label: isViewingOwnTeam ? 'Your Roster' : 'Roster' },
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
              R07: DRAFT RECAP BANNER — gold gradient, league info, team avatars
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-700 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-6 rounded-xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #D4930D 0%, #F06820 40%, #D4930D 70%, #B8860B 100%)' }}>
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <div className="relative px-5 py-5 sm:px-8 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* Trophy icon */}
                      <svg className="w-6 h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 3h14c.55 0 1 .45 1 1v2c0 2.21-1.79 4-4 4h-.17c-.41 1.16-1.22 2.12-2.27 2.71L14 13.1V16h3a1 1 0 011 1v2H6v-2a1 1 0 011-1h3v-2.89l-.56-.39A5.98 5.98 0 017.17 10H7c-2.21 0-4-1.79-4-4V4c0-.55.45-1 1-1zm0 2v1c0 1.1.9 2 2 2h.06A6.04 6.04 0 015 6V5zm14 0v1a6.04 6.04 0 01-2.06 2H17c1.1 0 2-.9 2-2V5z" />
                      </svg>
                      <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Draft Recap
                      </h1>
                    </div>
                    <p className="text-white/80 text-sm font-medium">
                      {draft.leagueName}
                    </p>
                    <p className="text-white/60 text-xs font-mono mt-1">
                      {draft.draftType} draft
                      {draft.completedAt ? ` · ${formatDraftDate(draft.completedAt)}` : ''}
                      {' · '}{totalTeams} teams · {draft.totalRounds} rounds
                    </p>
                  </div>
                  <NeuralCluster size="sm" intensity="active" />
                </div>

                {/* R07: Team initials/avatars row */}
                <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                  {teams.map(team => {
                    const teamGrade = draft.grades?.find(g => g.teamId === team.id)
                    return (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        title={team.name}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                          team.id === activeTeamId
                            ? 'bg-white text-[#D4930D] ring-2 ring-white scale-110'
                            : 'bg-white/20 text-white hover:bg-white/40'
                        }`}
                      >
                        {getTeamInitials(team.name)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              R02: TEAM SELECTOR — horizontal tabs
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-500 ${revealStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 mb-4 overflow-x-auto">
              {teams.map(team => {
                const teamGrade = draft.grades?.find(g => g.teamId === team.id)
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      team.id === activeTeamId
                        ? 'bg-[var(--crown)] text-slate'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="truncate max-w-[120px]">{team.name}</span>
                    {team.id === draft.userTeamId && <span className="text-[10px] opacity-70">(You)</span>}
                    {teamGrade && (
                      <span className={`text-[10px] font-bold ${team.id === activeTeamId ? 'text-slate/70' : gradeColors[teamGrade.overallGrade] || ''}`}>
                        {teamGrade.overallGrade}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              HERO GRADE REVEAL — now shows selected team's grade
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-700 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Card className={`mb-6 border ${gradeBorderColors[activeGrade?.overallGrade] || 'border-[var(--card-border)]'} overflow-hidden relative`}>
              {/* Gradient glow behind grade */}
              <div className="absolute top-0 right-0 w-40 h-40 opacity-10 rounded-full blur-3xl"
                style={{ background: activeGrade?.overallGrade?.startsWith('A') ? '#10B981' : activeGrade?.overallGrade?.startsWith('B') ? '#3B82F6' : '#D4930D' }}
              />

              <div className="relative">
                {/* Top line */}
                <div className="flex items-center gap-2 mb-4">
                  <NeuralCluster size="sm" intensity="active" />
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    {isViewingOwnTeam ? 'Draft Intelligence Report' : `${activeTeamName}'s Draft Report`}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Grade ring - big and proud */}
                  {activeGrade && (
                    <div className="flex flex-col items-center gap-2">
                      <GradeRing score={activeGrade.overallScore} grade={activeGrade.overallGrade} size={100} />
                      <span className="text-xs font-mono text-text-muted">{activeGrade.overallScore}/100</span>
                    </div>
                  )}

                  {/* Info block */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-1">
                      {getGradeEmoji(activeGrade?.overallGrade)} {getGradeMessage(activeGrade?.overallGrade)}
                    </h1>
                    <p className="text-text-secondary mb-3">
                      {isViewingOwnTeam ? '' : `${activeTeamName} · `}
                      {draft.leagueName} · {draft.draftType} draft · {totalTeams} teams · {draft.totalRounds} rounds
                    </p>

                    {/* Rank badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-alt)] border border-[var(--card-border)]">
                      <span className="text-xs text-text-muted">Draft rank:</span>
                      <span className="font-mono font-bold text-text-primary">
                        {activeRank}/{totalTeams}
                      </span>
                      {activeRank === 1 && <span className="text-xs">👑</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              QUICK STATS ROW — for selected team
              ══════════════════════════════════════════════════════════════════ */}
          <div className={`transition-all duration-700 delay-200 ${revealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Avg SG Total</p>
                <p className={`text-2xl font-mono font-bold ${sgColor(activeAvgSg)}`}>
                  {activeAvgSg != null ? <AnimatedNumber value={activeAvgSg} decimals={2} prefix={activeAvgSg >= 0 ? '+' : ''} duration={1500} /> : '—'}
                </p>
                <p className="text-text-muted text-[10px] font-mono mt-1">
                  SG Rank: {activeSgRank}/{totalTeams}
                </p>
              </Card>

              <Card className="text-center py-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wide mb-1">Total Value</p>
                <p className={`text-2xl font-mono font-bold ${(activeGrade?.totalValue || 0) >= 0 ? 'text-field' : 'text-live-red'}`}>
                  <AnimatedNumber value={activeGrade?.totalValue || 0} prefix={(activeGrade?.totalValue || 0) >= 0 ? '+' : ''} duration={1500} />
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

              {/* R06: Radar Chart — size 320 for readability, with value labels */}
              {activeTeamForRadar.length > 0 && activeTeamForRadar.some(p => p.sgOffTee != null) && (
                <Card className="mb-6">
                  <h2 className="text-lg font-semibold font-display text-text-primary mb-2">
                    {isViewingOwnTeam ? "Your Team's" : `${activeTeamName}'s`} SG DNA
                  </h2>
                  <p className="text-text-muted text-xs mb-4">Where the roster's strengths and weaknesses lie — each axis shows Strokes Gained proficiency.</p>
                  <div className="flex justify-center">
                    <SgRadarChart players={activeTeamForRadar.slice(0, 5)} size={320} showAxisValues />
                  </div>
                  {activeTeamForRadar.length > 5 && (
                    <p className="text-center text-text-muted text-[10px] font-mono mt-2">Showing top 5 picks. Full SG breakdown in roster tab.</p>
                  )}
                </Card>
              )}

              {/* R04: Sleepers & Reaches — now with clickable player names */}
              {activeGrade && (activeGrade.sleepers?.length > 0 || activeGrade.reaches?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {activeGrade.sleepers?.length > 0 && (
                    <Card className="border-field/20">
                      <h3 className="text-sm font-semibold text-field mb-3 flex items-center gap-2">
                        <span className="text-base">🎯</span> Sleeper Picks
                      </h3>
                      <div className="space-y-2">
                        {activeGrade.sleepers.map(s => (
                          <div key={s.pickNumber} className="flex items-center justify-between p-2 bg-field/5 rounded-lg">
                            <ClickablePlayer
                              name={s.playerName}
                              playerId={s.playerId}
                              onClick={openDrawer}
                              className="text-text-primary text-sm font-medium hover:underline"
                            />
                            <span className="text-field text-xs font-mono font-bold">R{s.round} · +{s.adpDiff} value</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {activeGrade.reaches?.length > 0 && (
                    <Card className="border-live-red/20">
                      <h3 className="text-sm font-semibold text-live-red mb-3 flex items-center gap-2">
                        <span className="text-base">⚠️</span> Reaches
                      </h3>
                      <div className="space-y-2">
                        {activeGrade.reaches.map(r => (
                          <div key={r.pickNumber} className="flex items-center justify-between p-2 bg-live-red/5 rounded-lg">
                            <ClickablePlayer
                              name={r.playerName}
                              playerId={r.playerId}
                              onClick={openDrawer}
                              className="text-text-primary text-sm font-medium hover:underline"
                            />
                            <span className="text-live-red text-xs font-mono font-bold">R{r.round} · {r.adpDiff} value</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* R05: AI Coach line — text-base for readability (was text-sm) */}
              <Card className="mb-6 border-[var(--crown)]/20 bg-gradient-to-r from-[var(--surface)] to-[var(--crown)]/5">
                <div className="flex items-start gap-3">
                  <NeuralCluster size="sm" intensity="calm" />
                  <div>
                    <p className="text-xs font-mono text-[var(--crown)] uppercase tracking-wide mb-1">Coach's Take</p>
                    <p className="text-text-primary text-base font-editorial italic leading-relaxed">
                      {getCoachCommentary({
                        grade: activeGrade?.overallGrade,
                        avgSg: activeAvgSg,
                        steals,
                        bestSgPick,
                        isUserTeam: isViewingOwnTeam,
                        teamName: activeTeamName,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ROSTER TAB — Selected team's picks with full SG breakdown
              ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'roster' && (
            <div>
              <Card className="mb-6">
                <h2 className="text-lg font-semibold font-display text-text-primary mb-4">
                  {isViewingOwnTeam ? 'Your Roster' : `${activeTeamName}'s Roster`} — Pick by Pick
                </h2>
                <div className="space-y-2">
                  {activePicks.map((pick) => {
                    const pg = activePickGrades.find(g => g.pickNumber === pick.pickNumber) || {}
                    const valueLabel = getValueLabel(pg.adpDiff, totalTeams)
                    return (
                      <div
                        key={pick.pickNumber}
                        className="flex items-center gap-3 p-3 bg-[var(--bg-alt)] rounded-lg hover:bg-[var(--bg-alt)]/80 transition-colors cursor-pointer group"
                        onClick={() => openDrawer(pick)}
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

                        {/* Player info — R04: name is clickable */}
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

              {/* SG Stats table for selected team's roster */}
              {activePicks.some(p => p.sgTotal != null) && (
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
                        {activePicks.map(pick => (
                          <tr
                            key={pick.pickNumber}
                            className="border-b border-[var(--card-border)]/50 hover:bg-[var(--bg-alt)] cursor-pointer"
                            onClick={() => openDrawer(pick)}
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
                          <td className={`text-right py-2 px-2 font-mono ${sgColor(activeAvgSg)}`}>
                            {activeAvgSg != null ? formatSg(activeAvgSg) : '—'}
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
                          onClick={() => setSelectedTeamId(grade.teamId)}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer ${
                            grade.teamId === activeTeamId
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
                            <p className={`font-medium truncate ${grade.teamId === activeTeamId ? 'text-[var(--crown)]' : 'text-text-primary'}`}>
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
                        className={`bg-[var(--surface)] p-2 text-xs font-medium truncate ${team.id === activeTeamId ? 'text-[var(--crown)] border-b-2 border-[var(--crown)]' : 'text-text-secondary'}`}
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
                                team.id === activeTeamId ? 'bg-[var(--crown)]/5' : ''
                              }`}
                              onClick={() => pick && openDrawer(pick)}
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
