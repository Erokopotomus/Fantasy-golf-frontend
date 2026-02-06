import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

// Inline player data for mock drafts (no API dependency)
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Scottie Scheffler', rank: 1, country: 'USA', flag: '🇺🇸', sg: 2.45 },
  { id: 'p2', name: 'Rory McIlroy', rank: 2, country: 'NIR', flag: '🇬🇧', sg: 2.12 },
  { id: 'p3', name: 'Jon Rahm', rank: 3, country: 'ESP', flag: '🇪🇸', sg: 1.98 },
  { id: 'p4', name: 'Viktor Hovland', rank: 4, country: 'NOR', flag: '🇳🇴', sg: 1.87 },
  { id: 'p5', name: 'Patrick Cantlay', rank: 5, country: 'USA', flag: '🇺🇸', sg: 1.76 },
  { id: 'p6', name: 'Xander Schauffele', rank: 6, country: 'USA', flag: '🇺🇸', sg: 1.72 },
  { id: 'p7', name: 'Collin Morikawa', rank: 7, country: 'USA', flag: '🇺🇸', sg: 1.65 },
  { id: 'p8', name: 'Ludvig Aberg', rank: 8, country: 'SWE', flag: '🇸🇪', sg: 1.58 },
  { id: 'p9', name: 'Wyndham Clark', rank: 9, country: 'USA', flag: '🇺🇸', sg: 1.52 },
  { id: 'p10', name: 'Max Homa', rank: 10, country: 'USA', flag: '🇺🇸', sg: 1.48 },
  { id: 'p11', name: 'Tommy Fleetwood', rank: 11, country: 'ENG', flag: '🇬🇧', sg: 1.45 },
  { id: 'p12', name: 'Matt Fitzpatrick', rank: 12, country: 'ENG', flag: '🇬🇧', sg: 1.42 },
  { id: 'p13', name: 'Brian Harman', rank: 13, country: 'USA', flag: '🇺🇸', sg: 1.38 },
  { id: 'p14', name: 'Hideki Matsuyama', rank: 14, country: 'JPN', flag: '🇯🇵', sg: 1.35 },
  { id: 'p15', name: 'Sahith Theegala', rank: 15, country: 'USA', flag: '🇺🇸', sg: 1.32 },
  { id: 'p16', name: 'Tony Finau', rank: 16, country: 'USA', flag: '🇺🇸', sg: 1.28 },
  { id: 'p17', name: 'Cameron Young', rank: 17, country: 'USA', flag: '🇺🇸', sg: 1.25 },
  { id: 'p18', name: 'Sungjae Im', rank: 18, country: 'KOR', flag: '🇰🇷', sg: 1.22 },
  { id: 'p19', name: 'Corey Conners', rank: 19, country: 'CAN', flag: '🇨🇦', sg: 1.18 },
  { id: 'p20', name: 'Russell Henley', rank: 20, country: 'USA', flag: '🇺🇸', sg: 1.15 },
  { id: 'p21', name: 'Shane Lowry', rank: 21, country: 'IRL', flag: '🇮🇪', sg: 1.12 },
  { id: 'p22', name: 'Jordan Spieth', rank: 22, country: 'USA', flag: '🇺🇸', sg: 1.08 },
  { id: 'p23', name: 'Tom Kim', rank: 23, country: 'KOR', flag: '🇰🇷', sg: 1.05 },
  { id: 'p24', name: 'Sepp Straka', rank: 24, country: 'AUT', flag: '🇦🇹', sg: 1.02 },
  { id: 'p25', name: 'Keegan Bradley', rank: 25, country: 'USA', flag: '🇺🇸', sg: 0.98 },
  { id: 'p26', name: 'Justin Thomas', rank: 26, country: 'USA', flag: '🇺🇸', sg: 0.95 },
  { id: 'p27', name: 'Adam Scott', rank: 27, country: 'AUS', flag: '🇦🇺', sg: 0.92 },
  { id: 'p28', name: 'Si Woo Kim', rank: 28, country: 'KOR', flag: '🇰🇷', sg: 0.88 },
  { id: 'p29', name: 'Tyrrell Hatton', rank: 29, country: 'ENG', flag: '🇬🇧', sg: 0.85 },
  { id: 'p30', name: 'Jason Day', rank: 30, country: 'AUS', flag: '🇦🇺', sg: 0.82 },
  { id: 'p31', name: 'Denny McCarthy', rank: 31, country: 'USA', flag: '🇺🇸', sg: 0.78 },
  { id: 'p32', name: 'Rickie Fowler', rank: 32, country: 'USA', flag: '🇺🇸', sg: 0.75 },
  { id: 'p33', name: 'Cameron Smith', rank: 33, country: 'AUS', flag: '🇦🇺', sg: 0.72 },
  { id: 'p34', name: 'Brooks Koepka', rank: 34, country: 'USA', flag: '🇺🇸', sg: 0.68 },
  { id: 'p35', name: 'Min Woo Lee', rank: 35, country: 'AUS', flag: '🇦🇺', sg: 0.65 },
  { id: 'p36', name: 'Taylor Moore', rank: 36, country: 'USA', flag: '🇺🇸', sg: 0.62 },
  { id: 'p37', name: 'Billy Horschel', rank: 37, country: 'USA', flag: '🇺🇸', sg: 0.58 },
  { id: 'p38', name: 'Nick Taylor', rank: 38, country: 'CAN', flag: '🇨🇦', sg: 0.55 },
  { id: 'p39', name: 'Akshay Bhatia', rank: 39, country: 'USA', flag: '🇺🇸', sg: 0.52 },
  { id: 'p40', name: 'Sam Burns', rank: 40, country: 'USA', flag: '🇺🇸', sg: 0.48 },
  { id: 'p41', name: 'Chris Kirk', rank: 41, country: 'USA', flag: '🇺🇸', sg: 0.45 },
  { id: 'p42', name: 'Harris English', rank: 42, country: 'USA', flag: '🇺🇸', sg: 0.42 },
  { id: 'p43', name: 'Mackenzie Hughes', rank: 43, country: 'CAN', flag: '🇨🇦', sg: 0.38 },
  { id: 'p44', name: 'Kurt Kitayama', rank: 44, country: 'USA', flag: '🇺🇸', sg: 0.35 },
  { id: 'p45', name: 'Adam Hadwin', rank: 45, country: 'CAN', flag: '🇨🇦', sg: 0.32 },
  { id: 'p46', name: 'Davis Riley', rank: 46, country: 'USA', flag: '🇺🇸', sg: 0.28 },
  { id: 'p47', name: 'Erik van Rooyen', rank: 47, country: 'RSA', flag: '🇿🇦', sg: 0.25 },
  { id: 'p48', name: 'Lucas Glover', rank: 48, country: 'USA', flag: '🇺🇸', sg: 0.22 },
  { id: 'p49', name: 'J.T. Poston', rank: 49, country: 'USA', flag: '🇺🇸', sg: 0.18 },
  { id: 'p50', name: 'Andrew Putnam', rank: 50, country: 'USA', flag: '🇺🇸', sg: 0.15 },
  { id: 'p51', name: 'Emiliano Grillo', rank: 51, country: 'ARG', flag: '🇦🇷', sg: 0.12 },
  { id: 'p52', name: 'Taylor Pendrith', rank: 52, country: 'CAN', flag: '🇨🇦', sg: 0.10 },
  { id: 'p53', name: 'Thomas Detry', rank: 53, country: 'BEL', flag: '🇧🇪', sg: 0.08 },
  { id: 'p54', name: 'Byeong Hun An', rank: 54, country: 'KOR', flag: '🇰🇷', sg: 0.05 },
  { id: 'p55', name: 'Christiaan Bezuidenhout', rank: 55, country: 'RSA', flag: '🇿🇦', sg: 0.02 },
  { id: 'p56', name: 'Austin Eckroat', rank: 56, country: 'USA', flag: '🇺🇸', sg: -0.02 },
  { id: 'p57', name: 'Ben Griffin', rank: 57, country: 'USA', flag: '🇺🇸', sg: -0.05 },
  { id: 'p58', name: 'Alex Noren', rank: 58, country: 'SWE', flag: '🇸🇪', sg: -0.08 },
  { id: 'p59', name: 'Stephan Jaeger', rank: 59, country: 'GER', flag: '🇩🇪', sg: -0.10 },
  { id: 'p60', name: 'Jake Knapp', rank: 60, country: 'USA', flag: '🇺🇸', sg: -0.12 },
]

const getPickInfo = (pickNumber, teamCount) => {
  const round = Math.floor(pickNumber / teamCount) + 1
  const pickInRound = pickNumber % teamCount
  const isReverse = round % 2 === 0
  const orderIndex = isReverse ? teamCount - 1 - pickInRound : pickInRound
  return { round, pickInRound, orderIndex }
}

const MockDraftRoom = () => {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [picks, setPicks] = useState([])
  const [queue, setQueue] = useState([])
  const [timer, setTimer] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [recentPick, setRecentPick] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('board') // board, players, queue, myteam
  const [bottomTab, setBottomTab] = useState('players') // players, queue, myteam, picks
  const [sortBy, setSortBy] = useState('rank') // rank, name, sg
  const [sortDir, setSortDir] = useState('asc')
  const aiPickingRef = useRef(false)
  const timerRef = useRef(null)
  const boardRef = useRef(null)
  const picksRef = useRef([])
  const queueRef = useRef([])

  // Load config
  useEffect(() => {
    const stored = sessionStorage.getItem('mockDraftConfig')
    if (!stored) {
      navigate('/mock-draft')
      return
    }
    setConfig(JSON.parse(stored))
  }, [navigate])

  const totalPicks = config ? config.teamCount * config.rosterSize : 0
  const draftedIds = picks.map(p => p.playerId)
  const availablePlayers = MOCK_PLAYERS.filter(p => !draftedIds.includes(p.id))

  // Current pick info
  const currentPickNumber = picks.length
  const pickInfo = config ? getPickInfo(currentPickNumber, config.teamCount) : null
  const currentTeam = config?.teams?.[pickInfo?.orderIndex]
  const isUserTurn = currentTeam?.isUser && isStarted && !isComplete

  // Sort and filter players
  const filteredPlayers = useMemo(() => {
    let result = availablePlayers
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      let aVal, bVal
      if (sortBy === 'name') { aVal = a.name; bVal = b.name }
      else if (sortBy === 'sg') { aVal = a.sg; bVal = b.sg }
      else { aVal = a.rank; bVal = b.rank }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return result
  }, [availablePlayers, searchQuery, sortBy, sortDir])

  // Stable ref for makePick to avoid stale closures in timers
  const makePickRef = useRef(null)

  const handleMakePick = useCallback((player) => {
    if (!config) return

    clearInterval(timerRef.current)

    setPicks(prev => {
      const pickNumber = prev.length
      const info = getPickInfo(pickNumber, config.teamCount)
      const team = config.teams[info.orderIndex]

      const pick = {
        id: `pick-${pickNumber + 1}`,
        pickNumber: pickNumber + 1,
        round: info.round,
        teamId: team.id,
        teamName: team.name,
        playerId: player.id,
        playerName: player.name,
        playerFlag: player.flag,
        playerRank: player.rank,
      }

      setRecentPick(pick)
      setTimeout(() => setRecentPick(null), 2500)

      const newPicks = [...prev, pick]
      if (newPicks.length >= config.teamCount * config.rosterSize) {
        setIsComplete(true)
      }

      return newPicks
    })

    setQueue(prev => prev.filter(q => q.id !== player.id))
  }, [config])

  // Keep refs in sync
  makePickRef.current = handleMakePick
  picksRef.current = picks
  queueRef.current = queue

  // Timer for user's turn
  useEffect(() => {
    if (!isStarted || isPaused || isComplete) return
    if (!isUserTurn) return

    setTimer(config?.pickTimer || 90)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          const draftedSet = new Set(picksRef.current.map(p => p.playerId))
          const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
          if (queuePick) {
            makePickRef.current?.(queuePick)
          } else {
            const best = MOCK_PLAYERS.find(p => !draftedSet.has(p.id))
            if (best) makePickRef.current?.(best)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [isUserTurn, isStarted, isPaused, isComplete, currentPickNumber])

  // AI picks
  useEffect(() => {
    if (!isStarted || isPaused || isComplete || isUserTurn || aiPickingRef.current) return
    if (!config || currentPickNumber >= totalPicks) return

    aiPickingRef.current = true

    const aiDelay = 1200 + Math.random() * 2000
    const timeout = setTimeout(() => {
      const available = MOCK_PLAYERS.filter(p => !draftedIds.includes(p.id))

      if (available.length === 0) {
        aiPickingRef.current = false
        return
      }

      const topN = Math.min(4, available.length)
      const randomIndex = Math.floor(Math.random() * topN)
      const selectedPlayer = available[randomIndex]

      makePickRef.current?.(selectedPlayer)
      aiPickingRef.current = false
    }, aiDelay)

    return () => clearTimeout(timeout)
  }, [currentPickNumber, isStarted, isPaused, isComplete, isUserTurn, config, totalPicks, draftedIds])

  const handleStartDraft = () => {
    setIsStarted(true)
    setIsPaused(false)
  }

  const handleAddToQueue = (player) => {
    setQueue(prev => {
      if (prev.find(q => q.id === player.id)) return prev
      return [...prev, player]
    })
  }

  const handleRemoveFromQueue = (playerId) => {
    setQueue(prev => prev.filter(q => q.id !== playerId))
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'sg' ? 'desc' : 'asc')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTeamPicks = (teamId) => picks.filter(p => p.teamId === teamId)
  const userTeam = config?.teams?.find(t => t.isUser)
  const userPicks = userTeam ? getTeamPicks(userTeam.id) : []

  // Auto-scroll board to current pick
  useEffect(() => {
    if (boardRef.current && isStarted && pickInfo) {
      const rows = boardRef.current.querySelectorAll('[data-round]')
      const currentRow = rows[pickInfo.round - 1]
      if (currentRow) {
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [currentPickNumber, isStarted])

  if (!config) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
      </div>
    )
  }

  // Draft Complete Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Mock Draft Complete!</h1>
              <p className="text-text-secondary">Here's how your team turned out.</p>
            </div>

            {/* Your Team */}
            <Card className="mb-6 border-accent-green/30">
              <h2 className="text-lg font-semibold text-white mb-4">Your Team</h2>
              <div className="space-y-2">
                {userPicks.map((pick) => (
                  <div key={pick.id} className="flex items-center justify-between p-3 bg-dark-primary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-sm w-6">R{pick.round}</span>
                      <span className="text-lg">{pick.playerFlag}</span>
                      <div>
                        <p className="text-white font-medium">{pick.playerName}</p>
                        <p className="text-text-muted text-xs">Pick #{pick.pickNumber} · Rank #{pick.playerRank}</p>
                      </div>
                    </div>
                    <span className="text-text-secondary text-sm">#{pick.playerRank}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* All Teams */}
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">All Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.teams.map(team => {
                  const teamPicks = getTeamPicks(team.id)
                  return (
                    <div key={team.id} className={`p-4 rounded-lg ${team.isUser ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-dark-primary'}`}>
                      <h3 className={`font-semibold mb-2 ${team.isUser ? 'text-accent-green' : 'text-white'}`}>
                        {team.name} {team.isUser && '(You)'}
                      </h3>
                      <div className="space-y-1">
                        {teamPicks.map(pick => (
                          <div key={pick.id} className="flex items-center gap-2 text-sm">
                            <span>{pick.playerFlag}</span>
                            <span className="text-text-secondary">{pick.playerName}</span>
                            <span className="text-text-muted text-xs ml-auto">#{pick.playerRank}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" fullWidth onClick={() => navigate('/mock-draft')}>
                New Mock Draft
              </Button>
              <Button fullWidth onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null
    return (
      <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    )
  }

  return (
    <div className="h-screen bg-dark-primary flex flex-col overflow-hidden">
      {/* ===== HEADER BAR ===== */}
      <div className="bg-dark-secondary border-b border-dark-border flex-shrink-0 z-30">
        <div className="px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  if (confirm('Leave mock draft? Progress will be lost.')) navigate('/mock-draft')
                }}
                className="text-text-secondary hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-sm sm:text-base leading-tight">Mock Draft</h1>
                <p className="text-text-muted text-xs hidden sm:block">
                  {config.teamCount} teams · {config.rosterSize} rds · Snake
                </p>
              </div>
            </div>

            {/* Center: Current Pick Status */}
            {isStarted && currentTeam && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold ${
                isUserTurn
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                  : 'bg-dark-tertiary text-text-secondary'
              }`}>
                {isUserTurn && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                  </span>
                )}
                {isUserTurn ? 'YOUR PICK' : `${currentTeam.name} picking...`}
              </div>
            )}

            {/* Right: Pick counter + Timer + Start */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {!isStarted ? (
                <Button onClick={handleStartDraft} size="sm">
                  Start Draft
                </Button>
              ) : (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-text-muted text-[10px] leading-tight">ROUND {pickInfo?.round || 1}</p>
                    <p className="text-white text-xs font-semibold">{currentPickNumber + 1}/{totalPicks}</p>
                  </div>
                  <div className="sm:hidden text-white text-xs font-semibold">
                    R{pickInfo?.round} · {currentPickNumber + 1}/{totalPicks}
                  </div>
                  {isUserTurn && (
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-base tabular-nums ${
                      timer <= 10 ? 'bg-red-500/20 text-red-400' :
                      timer <= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-accent-green/20 text-accent-green'
                    }`}>
                      {formatTime(timer)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile: Current pick banner */}
          {isStarted && currentTeam && (
            <div className={`sm:hidden mt-1.5 px-3 py-1.5 rounded-lg text-center text-xs font-semibold ${
              isUserTurn
                ? 'bg-accent-green/20 text-accent-green'
                : 'bg-dark-tertiary text-text-secondary'
            }`}>
              {isUserTurn ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                  </span>
                  YOUR PICK
                </span>
              ) : `${currentTeam.name} picking...`}
            </div>
          )}
        </div>
      </div>

      {/* Pick Announcement Toast */}
      {recentPick && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 ${
            recentPick.teamId === userTeam?.id
              ? 'bg-accent-green text-white'
              : 'bg-dark-secondary border border-dark-border text-white'
          }`}>
            <span className="text-base">{recentPick.playerFlag}</span>
            <div>
              <p className="font-semibold text-sm">{recentPick.playerName}</p>
              <p className="text-xs opacity-80">#{recentPick.pickNumber} · {recentPick.teamName}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE TAB BAR ===== */}
      <div className="lg:hidden flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
        {[
          { key: 'board', label: 'Board' },
          { key: 'players', label: 'Players' },
          { key: 'queue', label: `Queue${queue.length ? ` (${queue.length})` : ''}` },
          { key: 'myteam', label: `Team (${userPicks.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
              activeTab === tab.key
                ? 'text-accent-green border-b-2 border-accent-green'
                : 'text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ===== LEFT: DRAFT BOARD (desktop: left 55%, mobile: full when active) ===== */}
        <div className={`lg:w-[55%] lg:border-r lg:border-dark-border flex flex-col min-h-0 ${
          activeTab !== 'board' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Board Column Headers */}
          <div className="flex-shrink-0 bg-dark-secondary border-b border-dark-border" ref={boardRef}>
            <div className="overflow-x-auto">
              <div className="grid gap-px min-w-[500px]"
                style={{ gridTemplateColumns: `44px repeat(${config.teamCount}, 1fr)` }}>
                <div className="bg-dark-tertiary px-1 py-2 text-text-muted text-[10px] font-semibold text-center">RD</div>
                {config.teams.map(team => (
                  <div
                    key={team.id}
                    className={`px-1 py-2 text-[10px] font-semibold text-center truncate ${
                      team.isUser
                        ? 'bg-accent-green/20 text-accent-green'
                        : pickInfo && config.teams[pickInfo.orderIndex]?.id === team.id
                          ? 'bg-yellow-500/15 text-yellow-400'
                          : 'bg-dark-tertiary text-text-muted'
                    }`}
                  >
                    {team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name}
                    {team.isUser && <span className="ml-1 text-[8px] opacity-70">YOU</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Board Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            <div className="min-w-[500px]">
              {Array.from({ length: config.rosterSize }, (_, roundIdx) => {
                const round = roundIdx + 1
                const isReverse = round % 2 === 0
                const isCurrentRound = pickInfo?.round === round

                return (
                  <div
                    key={round}
                    data-round={round}
                    className={`grid gap-px ${isCurrentRound ? 'bg-dark-border' : ''}`}
                    style={{ gridTemplateColumns: `44px repeat(${config.teamCount}, 1fr)` }}
                  >
                    <div className={`px-1 py-1 text-[10px] text-center flex items-center justify-center font-semibold ${
                      isCurrentRound ? 'text-accent-green bg-dark-secondary' : 'text-text-muted bg-dark-primary/80'
                    }`}>
                      {round}
                    </div>
                    {config.teams.map((_, teamIdx) => {
                      const orderIdx = isReverse ? config.teamCount - 1 - teamIdx : teamIdx
                      const absolutePick = roundIdx * config.teamCount + teamIdx
                      const pick = picks[absolutePick]
                      const team = config.teams[orderIdx]
                      const isCurrent = absolutePick === currentPickNumber && isStarted
                      const isUserTeamCell = team?.isUser

                      return (
                        <div
                          key={teamIdx}
                          className={`px-1 py-1 min-h-[40px] flex items-center justify-center transition-colors ${
                            isCurrent
                              ? 'bg-accent-green/20 ring-1 ring-inset ring-accent-green/60'
                              : pick
                                ? isUserTeamCell ? 'bg-accent-green/5' : roundIdx % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary/50'
                                : roundIdx % 2 === 0 ? 'bg-dark-primary/40' : 'bg-dark-secondary/20'
                          }`}
                        >
                          {pick ? (
                            <div className="text-center w-full truncate px-0.5">
                              <span className="text-xs">{pick.playerFlag}</span>
                              <p className={`text-[10px] leading-tight truncate ${
                                isUserTeamCell ? 'text-accent-green font-medium' : 'text-text-secondary'
                              }`}>
                                {pick.playerName.split(' ').pop()}
                              </p>
                              <p className="text-[9px] text-text-muted">#{pick.playerRank}</p>
                            </div>
                          ) : isCurrent ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== RIGHT: PLAYER POOL + QUEUE/TEAM (desktop: right 45%, mobile: tabs) ===== */}
        <div className={`lg:w-[45%] flex flex-col min-h-0 ${
          activeTab === 'board' ? 'hidden lg:flex' : 'flex'
        }`}>

          {/* Desktop Bottom Tabs */}
          <div className="hidden lg:flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
            {[
              { key: 'players', label: `Players (${availablePlayers.length})` },
              { key: 'queue', label: `Queue (${queue.length})` },
              { key: 'myteam', label: `My Team (${userPicks.length}/${config.rosterSize})` },
              { key: 'picks', label: 'Picks' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setBottomTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  bottomTab === tab.key
                    ? 'text-accent-green border-b-2 border-accent-green'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content
              Mobile: activeTab drives content (board tab is handled by parent hiding this panel)
              Desktop: activeTab stays 'board', so bottomTab drives content */}
          <div className="flex-1 overflow-hidden">

            {/* === PLAYERS TAB === */}
            {(activeTab === 'players' || (activeTab === 'board' && bottomTab === 'players')) && (
              <div className="h-full flex flex-col">
                {/* Search Bar */}
                <div className="flex-shrink-0 p-3 bg-dark-secondary/50">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-accent-green focus:outline-none"
                    />
                  </div>
                </div>

                {/* Player Table */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Table Header */}
                  <div className="sticky top-0 bg-dark-secondary z-10 border-b border-dark-border">
                    <div className="grid grid-cols-[40px_1fr_70px_60px] px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                      <button onClick={() => handleSort('rank')} className="text-left hover:text-white transition-colors">
                        Rk <SortIcon field="rank" />
                      </button>
                      <button onClick={() => handleSort('name')} className="text-left hover:text-white transition-colors">
                        Player <SortIcon field="name" />
                      </button>
                      <button onClick={() => handleSort('sg')} className="text-right hover:text-white transition-colors">
                        SG <SortIcon field="sg" />
                      </button>
                      <div />
                    </div>
                  </div>

                  {/* Player Rows */}
                  {filteredPlayers.map(player => {
                    const inQueue = queue.find(q => q.id === player.id)
                    return (
                      <div
                        key={player.id}
                        className={`grid grid-cols-[40px_1fr_70px_60px] px-3 py-2 border-b border-dark-border/30 items-center transition-colors ${
                          isUserTurn ? 'hover:bg-accent-green/10 cursor-pointer' : ''
                        } ${inQueue ? 'bg-accent-blue/5' : ''}`}
                        onClick={() => isUserTurn && handleMakePick(player)}
                      >
                        <span className="text-text-muted text-xs">{player.rank}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm flex-shrink-0">{player.flag}</span>
                          <span className="text-white text-sm truncate">{player.name}</span>
                        </div>
                        <span className={`text-xs text-right font-medium ${
                          player.sg >= 1 ? 'text-accent-green' : player.sg > 0 ? 'text-white' : 'text-red-400'
                        }`}>
                          {player.sg > 0 ? '+' : ''}{player.sg.toFixed(2)}
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          {isUserTurn && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMakePick(player) }}
                              className="px-2 py-1 bg-accent-green text-white text-[10px] rounded font-semibold hover:bg-accent-green/80 transition-colors"
                            >
                              Draft
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              inQueue ? handleRemoveFromQueue(player.id) : handleAddToQueue(player)
                            }}
                            className={`p-1 rounded transition-colors ${
                              inQueue ? 'text-accent-blue' : 'text-text-muted hover:text-accent-blue'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill={inQueue ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {filteredPlayers.length === 0 && (
                    <div className="text-center py-8 text-text-muted text-sm">
                      {searchQuery ? 'No players match your search' : 'All players have been drafted'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === QUEUE TAB === */}
            {(activeTab === 'queue' || (activeTab === 'board' && bottomTab === 'queue')) && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  {queue.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <p className="text-text-muted text-sm font-medium mb-1">Your Queue is Empty</p>
                      <p className="text-text-muted text-xs">Bookmark players from the Players tab to build your auto-pick queue</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {queue.map((player, i) => (
                        <div key={player.id} className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg group">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-accent-blue text-xs font-bold w-5 text-center">{i + 1}</span>
                            <span className="text-sm">{player.flag}</span>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{player.name}</p>
                              <p className="text-text-muted text-xs">#{player.rank} · SG {player.sg > 0 ? '+' : ''}{player.sg.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isUserTurn && (
                              <button
                                onClick={() => handleMakePick(player)}
                                className="px-2 py-1 bg-accent-green text-white text-[10px] rounded font-semibold hover:bg-accent-green/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Draft
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveFromQueue(player.id)}
                              className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === MY TEAM TAB === */}
            {(activeTab === 'myteam' || (activeTab === 'board' && bottomTab === 'myteam')) && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  {userPicks.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-text-muted text-sm font-medium mb-1">No Picks Yet</p>
                      <p className="text-text-muted text-xs">Your drafted players will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {userPicks.map(pick => (
                        <div key={pick.id} className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-accent-green text-xs font-bold w-5 text-center">R{pick.round}</span>
                            <span className="text-sm">{pick.playerFlag}</span>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{pick.playerName}</p>
                              <p className="text-text-muted text-xs">Pick #{pick.pickNumber} · Rank #{pick.playerRank}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Empty slots */}
                      {Array.from({ length: config.rosterSize - userPicks.length }, (_, i) => (
                        <div key={`empty-${i}`} className="flex items-center p-2.5 rounded-lg border border-dashed border-dark-border/50">
                          <span className="text-text-muted text-xs w-5 text-center">R{userPicks.length + i + 1}</span>
                          <span className="text-text-muted text-xs ml-3">—</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === PICKS TAB (desktop only) === */}
            {(activeTab === 'board' && bottomTab === 'picks') && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  {picks.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-text-muted text-sm">No picks yet — start the draft!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...picks].reverse().map(pick => (
                        <div key={pick.id} className={`flex items-center justify-between p-2.5 rounded-lg ${
                          pick.teamId === userTeam?.id ? 'bg-accent-green/10' : 'bg-dark-primary'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-text-muted text-xs font-bold w-6 text-right">#{pick.pickNumber}</span>
                            <span className="text-sm">{pick.playerFlag}</span>
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">{pick.playerName}</p>
                              <p className="text-text-muted text-xs">R{pick.round} · {pick.teamName}</p>
                            </div>
                          </div>
                          <span className="text-text-muted text-xs flex-shrink-0">#{pick.playerRank}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MockDraftRoom
