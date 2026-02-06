import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'

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

// Player detail popup
const PlayerPopup = ({ player, onClose, onDraft, onQueue, isUserTurn, inQueue, isDrafted }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!player) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-dark-secondary border border-dark-border rounded-xl max-w-sm w-full shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            {player.headshot ? (
              <img src={player.headshot} alt="" className="w-11 h-11 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
            ) : (
              <span className="text-2xl">{player.flag}</span>
            )}
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">{player.name}</h3>
              <div className="flex items-center gap-1.5">
                <p className="text-text-muted text-sm">{player.country}</p>
                {player.primaryTour && (
                  <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                    player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                    player.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>{player.primaryTour}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs font-bold rounded">#{player.rank}</span>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-dark-primary rounded-lg p-2 text-center">
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">SG Total</p>
              <p className={`text-base font-bold ${player.sg >= 1 ? 'text-accent-green' : player.sg > 0 ? 'text-white' : 'text-red-400'}`}>
                {player.sg > 0 ? '+' : ''}{player.sg.toFixed(2)}
              </p>
            </div>
            <div className="bg-dark-primary rounded-lg p-2 text-center">
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Top 10</p>
              <p className="text-white text-base font-bold">{player.top10}%</p>
            </div>
            <div className="bg-dark-primary rounded-lg p-2 text-center">
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Cuts</p>
              <p className="text-white text-base font-bold">{player.cutsPct || 0}%</p>
            </div>
            <div className="bg-dark-primary rounded-lg p-2 text-center">
              <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Events</p>
              <p className="text-white text-base font-bold">{player.tournaments}</p>
            </div>
          </div>

          {/* SG Breakdown */}
          <div>
            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Strokes Gained</p>
            <div className="space-y-1.5">
              {[
                { label: 'OTT', value: player.sgOTT },
                { label: 'APP', value: player.sgAPP },
                { label: 'ATG', value: player.sgATG },
                { label: 'Putt', value: player.sgPutt },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-text-muted text-xs w-8 text-right">{label}</span>
                  <div className="flex-1 h-1.5 bg-dark-primary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value >= 0 ? 'bg-accent-green' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.abs(value) / 1.0 * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-11 text-right tabular-nums ${value > 0.3 ? 'text-accent-green' : value >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {value > 0 ? '+' : ''}{value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Form */}
          <div>
            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Recent Form</p>
            <div className="flex gap-1.5">
              {player.form.map((result, i) => {
                const pos = parseInt(result.replace('T', ''))
                return (
                  <span key={i} className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${
                    result === '1' ? 'bg-yellow-500/20 text-yellow-400' :
                    result === 'CUT' ? 'bg-red-500/15 text-red-400' :
                    pos <= 5 ? 'bg-accent-green/20 text-accent-green' :
                    pos <= 15 ? 'bg-emerald-500/10 text-emerald-400/70' :
                    pos <= 30 ? 'bg-dark-tertiary text-text-secondary' :
                    'bg-dark-tertiary text-text-muted'
                  }`}>
                    {result === '1' ? '1st' : result}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isDrafted && (
          <div className="flex gap-2 p-4 pt-0">
            <button
              onClick={() => { onQueue(player); onClose() }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                inQueue
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'bg-dark-primary text-white hover:bg-dark-tertiary border border-dark-border'
              }`}
            >
              {inQueue ? 'Queued' : 'Add to Queue'}
            </button>
            {isUserTurn && (
              <button
                onClick={() => { onDraft(player); onClose() }}
                className="flex-1 py-2.5 bg-accent-green text-white rounded-lg text-sm font-bold hover:bg-accent-green/90 transition-colors"
              >
                Draft Now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// AI draft chat flavor messages
const DRAFT_CHAT = {
  pick: [
    (n) => `${n} 🔥`,
    (n) => `Surprised ${n} was still there`,
    (n) => `Good pick, ${n} is underrated`,
    (n) => `${n}? Bold.`,
    (n) => `I wanted ${n}!`,
    (n) => `Nice, ${n} was on my board`,
    (n) => `${n} is going to ball out this year`,
    (n) => `Steal of the draft right there`,
  ],
  general: [
    'Let\'s go! 🏌️',
    'This draft is moving quick ⚡',
    'My team is looking solid 💪',
    'Some steals being made here',
    'GL everyone',
    'This is fun',
    'Who\'s everyone targeting?',
  ],
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
  const [activeTab, setActiveTab] = useState('board') // board, players, queue, myteam, chat
  const [bottomTab, setBottomTab] = useState('queue') // queue, myteam, picks, chat
  const [sortBy, setSortBy] = useState('rank') // rank, name, sg, top10
  const [sortDir, setSortDir] = useState('asc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [apiPlayers, setApiPlayers] = useState(null)
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const aiPickingRef = useRef(false)
  const timerRef = useRef(null)
  const boardRef = useRef(null)
  const chatEndRef = useRef(null)
  const picksRef = useRef([])
  const queueRef = useRef([])
  const allPlayersRef = useRef([])

  // Load config
  useEffect(() => {
    const stored = sessionStorage.getItem('mockDraftConfig')
    if (!stored) {
      navigate('/mock-draft')
      return
    }
    setConfig(JSON.parse(stored))
  }, [navigate])

  // Fetch real player data from API (falls back to MOCK_PLAYERS if unavailable)
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const data = await api.getPlayers({ limit: 300, sortBy: 'owgrRank', sortOrder: 'asc' })
        const players = data?.players
        if (Array.isArray(players) && players.length > 0) {
          setApiPlayers(players.map(p => ({
            id: p.id,
            name: p.name,
            rank: p.owgrRank || 999,
            country: p.country || 'Unknown',
            flag: p.countryFlag || '🏳️',
            primaryTour: p.primaryTour || null,
            sg: p.sgTotal || 0,
            sgOTT: p.sgOffTee || 0,
            sgAPP: p.sgApproach || 0,
            sgATG: p.sgAroundGreen || 0,
            sgPutt: p.sgPutting || 0,
            top10: p.events > 0 ? Math.round((p.top10s || 0) / p.events * 100) : 0,
            cutsPct: p.events > 0 ? Math.round((p.cutsMade || 0) / p.events * 100) : 0,
            tournaments: p.events || 0,
            form: p.recentForm || [],
            headshot: p.headshotUrl || null,
            wins: p.wins || 0,
          })))
        }
      } catch (err) {
        console.warn('Mock draft: using offline player data', err)
      } finally {
        setLoadingPlayers(false)
      }
    }
    fetchPlayers()
  }, [])

  // Use real API data if available, otherwise fall back to enriched mock data
  const allPlayers = useMemo(() => {
    if (apiPlayers) return apiPlayers
    // Fallback: compute stats from MOCK_PLAYERS
    return MOCK_PLAYERS.map(p => {
      const r = p.rank
      const variance = Math.sin(r * 1.7) * 0.25
      const sgOTT = +(p.sg * 0.28 + variance).toFixed(2)
      const sgAPP = +(p.sg * 0.35 - variance * 0.5).toFixed(2)
      const sgATG = +(p.sg * 0.18 + Math.cos(r * 2.3) * 0.12).toFixed(2)
      const sgPutt = +(p.sg - sgOTT - sgAPP - sgATG).toFixed(2)
      const top10 = Math.max(8, Math.round(65 - r * 0.95 + Math.sin(r * 0.7) * 6))
      const cutsPct = Math.max(50, Math.min(95, Math.round(90 - r * 0.6 + Math.sin(r * 2.1) * 8)))
      const form = Array.from({ length: 5 }, (_, i) => {
        const seed = Math.sin(r * 13 + i * 7) * 10000
        const val = Math.abs(Math.round(seed % 100))
        if (r > 35 && val > 70) return 'CUT'
        if (r > 20 && val > 85) return 'CUT'
        const base = Math.max(1, Math.round(r * 0.5 + (val % 20) - 5))
        if (base <= 1 && r <= 5) return '1'
        return base <= 1 ? 'T2' : `T${Math.min(base, 65)}`
      })
      const tournaments = Math.max(15, Math.min(30, Math.round(20 + r * 0.12 + Math.sin(r * 3.1) * 3)))
      return { ...p, sgOTT, sgAPP, sgATG, sgPutt, top10, cutsPct, form, tournaments, headshot: null, wins: 0 }
    })
  }, [apiPlayers])

  // Keep allPlayers ref in sync for timer/AI callbacks
  allPlayersRef.current = allPlayers

  const totalPicks = config ? config.teamCount * config.rosterSize : 0
  const draftedIds = picks.map(p => p.playerId)
  const availablePlayers = allPlayers.filter(p => !draftedIds.includes(p.id))

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
      else if (sortBy === 'top10') { aVal = a.top10; bVal = b.top10 }
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
            const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
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
      const available = allPlayersRef.current.filter(p => !draftedIds.includes(p.id))

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

  // Chat
  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      sender: 'You',
      text: chatInput.trim(),
      isUser: true,
    }])
    setChatInput('')
  }, [chatInput])

  // AI chat messages on picks
  useEffect(() => {
    if (picks.length === 0 || !config) return
    const lastPick = picks[picks.length - 1]
    if (lastPick.teamId === config.teams.find(t => t.isUser)?.id) return
    if (Math.random() > 0.35) return

    const templates = Math.random() > 0.25 ? DRAFT_CHAT.pick : DRAFT_CHAT.general
    const msg = typeof templates[0] === 'function'
      ? templates[Math.floor(Math.random() * templates.length)](lastPick.playerName.split(' ').pop())
      : templates[Math.floor(Math.random() * templates.length)]
    const otherTeams = config.teams.filter(t => !t.isUser && t.id !== lastPick.teamId)
    const sender = otherTeams[Math.floor(Math.random() * otherTeams.length)]

    const delay = setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `msg-ai-${Date.now()}`,
        sender: sender?.name || 'Team',
        text: msg,
        isUser: false,
      }])
    }, 600 + Math.random() * 2000)
    return () => clearTimeout(delay)
  }, [picks.length, config])

  // Welcome message on draft start
  useEffect(() => {
    if (isStarted) {
      setChatMessages([{
        id: 'msg-welcome',
        sender: 'System',
        text: 'Draft has started! Good luck everyone 🏌️',
        isSystem: true,
      }])
    }
  }, [isStarted])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'sg' || field === 'top10' ? 'desc' : 'asc')
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

  if (!config || loadingPlayers) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3" />
          {loadingPlayers && <p className="text-text-muted text-sm">Loading player data...</p>}
        </div>
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
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold text-sm sm:text-base leading-tight">Mock Draft</h1>
                  {apiPlayers && (
                    <span className="px-1.5 py-0.5 bg-accent-green/15 text-accent-green text-[9px] font-semibold rounded">
                      LIVE DATA
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-xs hidden sm:block">
                  {config.teamCount} teams · {config.rosterSize} rds · Snake · {allPlayers.length} players
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
          { key: 'chat', label: 'Chat' },
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
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ===== TOP: DRAFT BOARD (full width, ~45% on desktop) ===== */}
        <div className={`flex-col min-h-0 border-b-2 border-accent-green/30 ${
          activeTab === 'board' ? 'flex flex-1' : 'hidden'
        } lg:flex lg:flex-none lg:h-[45%]`}>
          {/* Board Column Headers */}
          <div className="flex-shrink-0 bg-dark-secondary border-b border-dark-border" ref={boardRef}>
            <div className="overflow-x-auto">
              <div className="grid gap-px min-w-[500px]"
                style={{ gridTemplateColumns: `44px repeat(${config.teamCount}, 1fr)` }}>
                <div className="bg-dark-tertiary px-1 py-2 text-text-muted text-[10px] font-semibold text-center">RD</div>
                {config.teams.map(team => (
                  <div
                    key={team.id}
                    className={`px-1 py-2.5 text-[10px] font-semibold text-center truncate ${
                      team.isUser
                        ? 'bg-accent-green/30 text-accent-green border-b-2 border-b-accent-green'
                        : pickInfo && config.teams[pickInfo.orderIndex]?.id === team.id
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-dark-tertiary text-text-muted'
                    }`}
                  >
                    {team.isUser ? (
                      <span className="font-bold">YOU</span>
                    ) : (
                      team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name
                    )}
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
                    <div className={`px-1 py-1 text-[10px] text-center flex flex-col items-center justify-center font-semibold ${
                      isCurrentRound ? 'text-accent-green bg-dark-secondary' : 'text-text-muted bg-dark-primary/80'
                    }`}>
                      <span>{round}</span>
                      <span className="text-[8px] opacity-50">{isReverse ? '←' : '→'}</span>
                    </div>
                    {config.teams.map((team, teamIdx) => {
                      // Fix snake alignment: each column always represents the same team
                      const actualPickIndex = isReverse
                        ? roundIdx * config.teamCount + (config.teamCount - 1 - teamIdx)
                        : roundIdx * config.teamCount + teamIdx
                      const pick = picks[actualPickIndex]
                      const isCurrent = actualPickIndex === currentPickNumber && isStarted
                      const isUserTeamCell = team.isUser

                      return (
                        <div
                          key={teamIdx}
                          onClick={() => {
                            if (pick) {
                              const enriched = allPlayers.find(p => p.id === pick.playerId)
                              if (enriched) setSelectedPlayer({ ...enriched, _drafted: true })
                            }
                          }}
                          className={`px-1 py-1 min-h-[44px] flex items-center justify-center transition-colors ${
                            pick ? 'cursor-pointer hover:brightness-125' : ''
                          } ${
                            isCurrent
                              ? 'bg-accent-green/25 ring-2 ring-inset ring-accent-green'
                              : pick
                                ? pick.playerRank <= 10
                                  ? isUserTeamCell ? 'bg-yellow-500/20' : 'bg-yellow-500/12'
                                  : pick.playerRank <= 25
                                    ? isUserTeamCell ? 'bg-accent-green/18' : 'bg-accent-green/10'
                                    : isUserTeamCell ? 'bg-accent-green/10' : roundIdx % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary/50'
                                : roundIdx % 2 === 0 ? 'bg-dark-primary/50' : 'bg-dark-secondary/25'
                          }`}
                        >
                          {pick ? (
                            <div className="text-center w-full truncate px-0.5">
                              <div className="flex items-center justify-center gap-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  pick.playerRank <= 10 ? 'bg-yellow-400' :
                                  pick.playerRank <= 25 ? 'bg-accent-green' :
                                  pick.playerRank <= 40 ? 'bg-blue-400' :
                                  'bg-text-muted/40'
                                }`} />
                                <span className="text-xs">{pick.playerFlag}</span>
                              </div>
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
                          ) : (
                            <span className="text-[9px] text-text-muted/30 tabular-nums">
                              {round}.{(actualPickIndex % config.teamCount) + 1}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== BOTTOM: PLAYER TABLE + SIDE PANEL ===== */}
        <div className={`flex-col min-h-0 overflow-hidden ${
          activeTab === 'board' ? 'hidden' : 'flex flex-1'
        } lg:flex lg:flex-1 lg:flex-row`}>

          {/* LEFT: Player Table (always visible on desktop, 'players' tab on mobile) */}
          <div className={`flex-col min-h-0 ${
            activeTab === 'players' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-none lg:w-[60%] lg:border-r lg:border-dark-border`}>
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
                    <div className="grid grid-cols-[30px_1fr_44px_36px_30px_44px_48px] px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                      <button onClick={() => handleSort('rank')} className="text-left hover:text-white transition-colors">
                        Rk <SortIcon field="rank" />
                      </button>
                      <button onClick={() => handleSort('name')} className="text-left hover:text-white transition-colors">
                        Player <SortIcon field="name" />
                      </button>
                      <button onClick={() => handleSort('sg')} className="text-right hover:text-white transition-colors">
                        SG <SortIcon field="sg" />
                      </button>
                      <button onClick={() => handleSort('top10')} className="text-right hover:text-white transition-colors">
                        T10 <SortIcon field="top10" />
                      </button>
                      <span className="text-center" title="Tournaments played">Evt</span>
                      <span className="text-center">Form</span>
                      <div />
                    </div>
                  </div>

                  {/* Player Rows */}
                  {filteredPlayers.map(player => {
                    const inQueue = queue.find(q => q.id === player.id)
                    return (
                      <div
                        key={player.id}
                        className={`grid grid-cols-[30px_1fr_44px_36px_30px_44px_48px] px-3 py-2 border-b border-dark-border/30 items-center transition-colors cursor-pointer hover:bg-dark-tertiary/50 ${
                          inQueue ? 'bg-accent-blue/5' : ''
                        }`}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <span className="text-text-muted text-xs">{player.rank}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          {player.headshot ? (
                            <img src={player.headshot} alt="" className="w-6 h-6 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                          ) : (
                            <span className="text-sm flex-shrink-0">{player.flag}</span>
                          )}
                          <span className="text-white text-sm truncate">{player.name}</span>
                        </div>
                        <span className={`text-xs text-right font-medium tabular-nums ${
                          player.sg >= 1 ? 'text-accent-green' : player.sg > 0 ? 'text-white' : 'text-red-400'
                        }`}>
                          {player.sg > 0 ? '+' : ''}{player.sg.toFixed(2)}
                        </span>
                        <span className="text-xs text-right text-text-secondary tabular-nums">
                          {player.top10}%
                        </span>
                        <span className="text-xs text-center text-text-muted tabular-nums">
                          {player.tournaments}
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          {player.form.slice(0, 4).map((f, i) => {
                            const pos = parseInt(f.replace('T', ''))
                            return (
                              <span key={i} className={`w-2 h-2 rounded-full ${
                                f === '1' ? 'bg-yellow-400' :
                                f === 'CUT' ? 'bg-red-400' :
                                pos <= 5 ? 'bg-accent-green' :
                                pos <= 15 ? 'bg-emerald-400/60' :
                                'bg-text-muted/30'
                              }`} title={f} />
                            )
                          })}
                        </div>
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
          </div>

          {/* RIGHT: Side Panel - Queue/Roster/Picks */}
          <div className={`flex-col min-h-0 ${
            activeTab === 'queue' || activeTab === 'myteam' || activeTab === 'chat' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-none lg:w-[40%]`}>
            {/* Desktop Side Panel Tabs */}
            <div className="hidden lg:flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
              {[
                { key: 'queue', label: `Queue (${queue.length})` },
                { key: 'myteam', label: `My Team (${userPicks.length}/${config.rosterSize})` },
                { key: 'picks', label: 'Picks' },
                { key: 'chat', label: 'Chat' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBottomTab(tab.key)}
                  className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                    bottomTab === tab.key
                      ? 'text-accent-green border-b-2 border-accent-green'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
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

            {/* === CHAT TAB === */}
            {(activeTab === 'chat' || (activeTab === 'board' && bottomTab === 'chat')) && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-text-muted text-sm">No messages yet</p>
                      <p className="text-text-muted text-xs mt-1">Chat with your league during the draft</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={msg.isSystem ? 'text-center' : ''}>
                        {msg.isSystem ? (
                          <p className="text-text-muted text-xs py-1">{msg.text}</p>
                        ) : (
                          <div className={`flex gap-2 ${msg.isUser ? 'justify-end' : ''}`}>
                            <div className={`max-w-[85%]`}>
                              {!msg.isUser && (
                                <p className="text-[10px] text-text-muted mb-0.5 font-medium">{msg.sender}</p>
                              )}
                              <div className={`px-2.5 py-1.5 rounded-lg text-sm ${
                                msg.isUser
                                  ? 'bg-accent-green/20 text-white rounded-br-sm'
                                  : 'bg-dark-primary text-text-secondary rounded-bl-sm'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat() }}
                  className="flex-shrink-0 p-2 border-t border-dark-border"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-1.5 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-accent-green focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-3 py-1.5 bg-accent-green text-white rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-accent-green/80 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Popup */}
      {selectedPlayer && (
        <PlayerPopup
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onDraft={handleMakePick}
          onQueue={(p) => {
            const inQ = queue.find(q => q.id === p.id)
            inQ ? handleRemoveFromQueue(p.id) : handleAddToQueue(p)
          }}
          isUserTurn={isUserTurn}
          inQueue={!!queue.find(q => q.id === selectedPlayer.id)}
          isDrafted={!!selectedPlayer._drafted}
        />
      )}
    </div>
  )
}

export default MockDraftRoom
