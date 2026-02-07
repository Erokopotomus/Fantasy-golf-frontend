import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'
import useDraftSounds from '../hooks/useDraftSounds'
import { track, Events } from '../services/analytics'

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
const PlayerPopup = ({ player, onClose, onDraft, onNominate, onQueue, isUserTurn, isUserNominator, isAuction, inQueue, isDrafted }) => {
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
            {isAuction ? (
              isUserNominator && (
                <button
                  onClick={() => { onNominate(player); onClose() }}
                  className="flex-1 py-2.5 bg-yellow-500 text-dark-primary rounded-lg text-sm font-bold hover:bg-yellow-400 transition-colors"
                >
                  Nominate
                </button>
              )
            ) : (
              isUserTurn && (
                <button
                  onClick={() => { onDraft(player); onClose() }}
                  className="flex-1 py-2.5 bg-accent-green text-white rounded-lg text-sm font-bold hover:bg-accent-green/90 transition-colors"
                >
                  Draft Now
                </button>
              )
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

const SPEED_CONFIG = {
  normal:  { aiDelay: 800, aiJitter: 400, toastDuration: 2000 },
  fast:    { aiDelay: 250, aiJitter: 150, toastDuration: 1200 },
  instant: { aiDelay: 40,  aiJitter: 20,  toastDuration: 600  },
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
  const [draftSpeed, setDraftSpeed] = useState('fast')
  const timerRef = useRef(null)
  const boardRef = useRef(null)
  const chatEndRef = useRef(null)
  const picksRef = useRef([])
  const queueRef = useRef([])
  const allPlayersRef = useRef([])
  const draftSpeedRef = useRef('fast')

  // Auction draft state
  const [auctionPhase, setAuctionPhase] = useState('nominating') // 'nominating' | 'bidding'
  const [budgets, setBudgets] = useState({})
  const [nominatorIndex, setNominatorIndex] = useState(0)
  const [currentNom, setCurrentNom] = useState(null) // { player, currentBid, highBidderTeamId }
  const [nomBidInput, setNomBidInput] = useState(1)
  const [nomExpanded, setNomExpanded] = useState(false)
  const auctionPhaseRef = useRef('nominating')
  const currentNomRef = useRef(null)
  const budgetsRef = useRef({})
  const nominatorIndexRef = useRef(0)
  const nominateRef = useRef(null)
  const placeBidRef = useRef(null)
  const awardPlayerRef = useRef(null)

  // Sound effects
  const { soundEnabled, toggleSound, initSounds, playPick, playYourTurn, playTimerWarning, playDraftStart, playBid, playDraftComplete } = useDraftSounds()

  // Auto-pick
  const [autoPick, setAutoPick] = useState(() => sessionStorage.getItem('mockDraftAutoPick') === 'true')
  const autoPickRef = useRef(autoPick)

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
            top5s: p.top5s || 0,
            top10s: p.top10s || 0,
            top25s: p.top25s || 0,
            cutsMade: p.cutsMade || 0,
            earnings: p.earnings || 0,
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
      const winsEst = r <= 3 ? 2 : r <= 10 ? 1 : 0
      const top5sEst = Math.max(0, Math.round(tournaments * Math.max(0, (40 - r) / 100)))
      const top10sEst = Math.round(tournaments * top10 / 100)
      const top25sEst = Math.round(tournaments * Math.min(80, top10 + 25) / 100)
      const cutsMadeEst = Math.round(tournaments * cutsPct / 100)
      return { ...p, sgOTT, sgAPP, sgATG, sgPutt, top10, cutsPct, form, tournaments, headshot: null, wins: winsEst, top5s: top5sEst, top10s: top10sEst, top25s: top25sEst, cutsMade: cutsMadeEst, earnings: 0 }
    })
  }, [apiPlayers])

  // Keep allPlayers ref in sync for timer/AI callbacks
  allPlayersRef.current = allPlayers
  draftSpeedRef.current = draftSpeed

  const totalPicks = config ? config.teamCount * config.rosterSize : 0
  const draftedIds = picks.map(p => p.playerId)
  const availablePlayers = allPlayers.filter(p => !draftedIds.includes(p.id))

  // Current pick info
  const currentPickNumber = picks.length
  const pickInfo = config ? getPickInfo(currentPickNumber, config.teamCount) : null
  const isAuction = config?.draftType === 'auction'
  const currentTeam = isAuction
    ? (config?.teams ? config.teams[nominatorIndex % config.teamCount] : null)
    : config?.teams?.[pickInfo?.orderIndex]
  const isUserTurn = !isAuction && currentTeam?.isUser && isStarted && !isComplete
  const nominatorTeam = isAuction && config?.teams ? config.teams[nominatorIndex % config.teamCount] : null
  const isUserNominator = isAuction && nominatorTeam?.isUser && isStarted && !isComplete && auctionPhase === 'nominating'
  const userTeamId = config?.teams?.find(t => t.isUser)?.id
  const isUserBidding = isAuction && auctionPhase === 'bidding' && currentNom && currentNom.highBidderTeamId !== userTeamId

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
    playPick()

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
      setTimeout(() => setRecentPick(null), SPEED_CONFIG[draftSpeedRef.current].toastDuration)

      const newPicks = [...prev, pick]
      if (newPicks.length >= config.teamCount * config.rosterSize) {
        setIsComplete(true)
      }

      return newPicks
    })

    setQueue(prev => prev.filter(q => q.id !== player.id))
  }, [config, playPick])

  // Auction: nominate a player with a starting bid
  const handleNominate = useCallback((player, startBid) => {
    if (auctionPhaseRef.current !== 'nominating') return
    const bid = Math.max(1, startBid || 1)
    const nomTeam = config.teams[nominatorIndexRef.current % config.teamCount]
    const nom = { player, currentBid: bid, highBidderTeamId: nomTeam.id, nominatedByTeamId: nomTeam.id }
    setCurrentNom(nom)
    currentNomRef.current = nom
    setAuctionPhase('bidding')
    auctionPhaseRef.current = 'bidding'
    setTimer(15)
    setNomBidInput(bid + 1)
  }, [config])

  // Auction: place a bid
  const handlePlaceBid = useCallback((amount, teamId) => {
    if (auctionPhaseRef.current !== 'bidding' || !currentNomRef.current) return
    const nom = currentNomRef.current
    if (amount <= nom.currentBid) return
    const bTeamId = teamId || userTeamId
    if (!bTeamId || budgetsRef.current[bTeamId] < amount) return
    if (nom.highBidderTeamId === bTeamId) return
    const updated = { ...nom, currentBid: amount, highBidderTeamId: bTeamId }
    setCurrentNom(updated)
    currentNomRef.current = updated
    setTimer(15)
    setNomBidInput(amount + 1)
    playBid()
  }, [userTeamId, playBid])

  // Auction: award current nomination to highest bidder
  const handleAwardPlayer = useCallback(() => {
    const nom = currentNomRef.current
    if (!nom || !config) return
    clearInterval(timerRef.current)
    playPick()
    setBudgets(prev => {
      const updated = { ...prev, [nom.highBidderTeamId]: prev[nom.highBidderTeamId] - nom.currentBid }
      budgetsRef.current = updated
      return updated
    })
    setPicks(prev => {
      const pickNumber = prev.length
      const team = config.teams.find(t => t.id === nom.highBidderTeamId)
      const pick = {
        id: `pick-${pickNumber + 1}`,
        pickNumber: pickNumber + 1,
        round: Math.ceil((pickNumber + 1) / config.teamCount),
        teamId: nom.highBidderTeamId,
        teamName: team?.name || 'Unknown',
        playerId: nom.player.id,
        playerName: nom.player.name,
        playerFlag: nom.player.flag,
        playerRank: nom.player.rank,
        amount: nom.currentBid,
      }
      setRecentPick(pick)
      setTimeout(() => setRecentPick(null), SPEED_CONFIG[draftSpeedRef.current].toastDuration)
      const newPicks = [...prev, pick]
      if (newPicks.length >= config.teamCount * config.rosterSize) {
        setIsComplete(true)
      }
      return newPicks
    })
    setQueue(prev => prev.filter(q => q.id !== nom.player.id))
    setCurrentNom(null)
    currentNomRef.current = null
    setNomExpanded(false)
    setAuctionPhase('nominating')
    auctionPhaseRef.current = 'nominating'
    setNominatorIndex(prev => {
      const next = (prev + 1) % config.teamCount
      nominatorIndexRef.current = next
      return next
    })
  }, [config, playPick])

  // Keep refs in sync
  makePickRef.current = handleMakePick
  picksRef.current = picks
  queueRef.current = queue
  auctionPhaseRef.current = auctionPhase
  currentNomRef.current = currentNom
  budgetsRef.current = budgets
  nominatorIndexRef.current = nominatorIndex
  nominateRef.current = handleNominate
  placeBidRef.current = handlePlaceBid
  awardPlayerRef.current = handleAwardPlayer
  autoPickRef.current = autoPick

  // Sound: your turn alert
  const prevIsUserTurnRef = useRef(false)
  const prevIsUserNominatorRef = useRef(false)
  useEffect(() => {
    if (isUserTurn && !prevIsUserTurnRef.current) playYourTurn()
    prevIsUserTurnRef.current = isUserTurn
  }, [isUserTurn, playYourTurn])
  useEffect(() => {
    if (isUserNominator && !prevIsUserNominatorRef.current) playYourTurn()
    prevIsUserNominatorRef.current = isUserNominator
  }, [isUserNominator, playYourTurn])

  // Sound + tracking: draft complete
  const prevIsCompleteRef = useRef(false)
  useEffect(() => {
    if (isComplete && !prevIsCompleteRef.current) {
      playDraftComplete()
      track(Events.MOCK_DRAFT_COMPLETED, { draftType: config?.draftType, teams: config?.teams?.length })
    }
    prevIsCompleteRef.current = isComplete
  }, [isComplete, playDraftComplete, config])

  // Auto-pick: snake — immediately pick after short delay when it's user's turn
  useEffect(() => {
    if (!autoPickRef.current || !isUserTurn || !isStarted || isPaused || isComplete) return
    const timeout = setTimeout(() => {
      if (!autoPickRef.current) return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
      if (queuePick) {
        makePickRef.current?.(queuePick)
      } else {
        const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
        if (best) makePickRef.current?.(best)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [isUserTurn, isStarted, isPaused, isComplete])

  // Auto-pick: auction nomination — auto-nominate when it's user's turn to nominate
  useEffect(() => {
    if (!autoPickRef.current || !isUserNominator || !isStarted || isPaused || isComplete) return
    const timeout = setTimeout(() => {
      if (!autoPickRef.current || auctionPhaseRef.current !== 'nominating') return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
      if (queuePick) {
        nominateRef.current?.(queuePick, 1)
      } else {
        const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
        if (best) nominateRef.current?.(best, 1)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [isUserNominator, isStarted, isPaused, isComplete])

  // Universal pick timer — handles snake picks and auction nomination/bidding phases
  useEffect(() => {
    if (!isStarted || isPaused || isComplete) return

    if (isAuction) {
      if (auctionPhase === 'bidding') {
        // Bidding countdown — timer was set to 15 by handleNominate/handlePlaceBid
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current)
              awardPlayerRef.current?.()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        // Nomination phase countdown
        setTimer(config?.pickTimer || 30)
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current)
              // Auto-nominate for user if they time out
              const nomTeam = config.teams[nominatorIndexRef.current % config.teamCount]
              if (nomTeam?.isUser) {
                const draftedSet = new Set(picksRef.current.map(p => p.playerId))
                const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
                if (best) nominateRef.current?.(best, 1)
              }
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } else {
      // Snake draft timer — short timer for AI turns as safety net
      setTimer(isUserTurn ? (config?.pickTimer || 90) : 8)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            // Auto-pick: user timeout OR AI fallback (AI effect should have picked, this is safety net)
            const draftedSet = new Set(picksRef.current.map(p => p.playerId))
            if (isUserTurn) {
              const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
              if (queuePick) {
                makePickRef.current?.(queuePick)
              } else {
                const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
                if (best) makePickRef.current?.(best)
              }
            } else {
              // AI safety net: force pick if AI effect didn't fire
              const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
              if (available.length > 0) {
                const topN = Math.min(4, available.length)
                makePickRef.current?.(available[Math.floor(Math.random() * topN)])
              }
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(timerRef.current)
  }, [isUserTurn, isStarted, isPaused, isComplete, currentPickNumber, isAuction, auctionPhase])

  // Sound: timer warning ticks every second from 10 down to 1 when it's user's action
  useEffect(() => {
    if (timer >= 1 && timer <= 10 && isStarted && !isPaused && (isUserTurn || isUserNominator || (isAuction && auctionPhase === 'bidding'))) {
      playTimerWarning(timer)
    }
  }, [timer, isStarted, isPaused, isUserTurn, isUserNominator, isAuction, auctionPhase, playTimerWarning])

  // Snake AI picks — cleanup-based cancellation (no ref guard needed)
  useEffect(() => {
    if (isAuction) return
    if (!isStarted || isPaused || isComplete || isUserTurn) return
    if (!config || currentPickNumber >= totalPicks) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const aiDelay = speedCfg.aiDelay + Math.random() * speedCfg.aiJitter
    const timeout = setTimeout(() => {
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
      if (available.length === 0) return

      const topN = Math.min(4, available.length)
      const selectedPlayer = available[Math.floor(Math.random() * topN)]
      makePickRef.current?.(selectedPlayer)
    }, aiDelay)

    return () => clearTimeout(timeout)
  }, [currentPickNumber, isStarted, isPaused, isComplete, isUserTurn, config, totalPicks, isAuction])

  // Auction AI: auto-nominate when it's an AI team's turn
  useEffect(() => {
    if (!isAuction || !isStarted || isPaused || isComplete) return
    if (auctionPhase !== 'nominating') return
    if (nominatorTeam?.isUser) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const delay = speedCfg.aiDelay + Math.random() * speedCfg.aiJitter
    const timeout = setTimeout(() => {
      if (auctionPhaseRef.current !== 'nominating') return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
      if (available.length === 0) return
      const topN = Math.min(4, available.length)
      const player = available[Math.floor(Math.random() * topN)]
      nominateRef.current?.(player, 1)
    }, delay)

    return () => clearTimeout(timeout)
  }, [isAuction, isStarted, isPaused, isComplete, auctionPhase, nominatorTeam, nominatorIndex])

  // Auction AI: evaluate bids from AI teams after each nomination/bid
  useEffect(() => {
    if (!isAuction || !isStarted || isPaused || isComplete) return
    if (auctionPhase !== 'bidding' || !currentNom) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const timeouts = []

    config.teams.forEach(team => {
      if (team.isUser) return
      if (team.id === currentNom.highBidderTeamId) return

      const budget = budgetsRef.current[team.id] || 0
      const teamPicks = picksRef.current.filter(p => p.teamId === team.id)
      const remainingSlots = config.rosterSize - teamPicks.length
      if (remainingSlots <= 0 || budget <= currentNom.currentBid) return

      const fairValue = Math.max(2, Math.round(budget / remainingSlots))
      const rank = currentNom.player?.rank || 50
      const playerValue = Math.max(2, Math.round(fairValue * (1 + Math.max(0, 50 - rank) / 80)))
      if (currentNom.currentBid >= playerValue) return

      const bidChance = Math.min(0.7, 0.5 * (1 - currentNom.currentBid / playerValue))
      if (Math.random() > bidChance) return

      const bidAmount = Math.min(
        currentNom.currentBid + Math.ceil(Math.random() * 3),
        playerValue,
        budget
      )
      if (bidAmount <= currentNom.currentBid) return

      const delay = speedCfg.aiDelay * 3 + Math.random() * 4000
      const timeout = setTimeout(() => {
        if (auctionPhaseRef.current !== 'bidding') return
        const nom = currentNomRef.current
        if (!nom || nom.highBidderTeamId === team.id) return
        if (bidAmount <= nom.currentBid) return
        if (budgetsRef.current[team.id] < bidAmount) return
        placeBidRef.current?.(bidAmount, team.id)
      }, delay)
      timeouts.push(timeout)
    })

    return () => timeouts.forEach(t => clearTimeout(t))
  }, [isAuction, isStarted, isPaused, isComplete, auctionPhase, currentNom, config])

  const handleStartDraft = () => {
    initSounds()
    playDraftStart()
    track(Events.MOCK_DRAFT_STARTED, { draftType: config?.draftType, teams: config?.teams?.length, rosterSize: config?.rosterSize })
    setIsStarted(true)
    setIsPaused(false)
    if (config?.draftType === 'auction') {
      const initialBudgets = {}
      config.teams.forEach(t => { initialBudgets[t.id] = t.budget || 100 })
      setBudgets(initialBudgets)
      budgetsRef.current = initialBudgets
    }
  }

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      if (!prev) {
        clearInterval(timerRef.current)
      }
      return !prev
    })
  }, [])

  // Spacebar toggles pause/resume
  useEffect(() => {
    if (!isStarted || isComplete) return
    const handler = (e) => {
      if (e.code !== 'Space') return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      e.preventDefault()
      handleTogglePause()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStarted, isComplete, handleTogglePause])

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
    // Reduce chat frequency at instant speed to avoid flooding
    const chatChance = draftSpeedRef.current === 'instant' ? 0.10 : 0.35
    if (Math.random() > chatChance) return

    const templates = Math.random() > 0.25 ? DRAFT_CHAT.pick : DRAFT_CHAT.general
    const msg = typeof templates[0] === 'function'
      ? templates[Math.floor(Math.random() * templates.length)](lastPick.playerName.split(' ').pop())
      : templates[Math.floor(Math.random() * templates.length)]
    const otherTeams = config.teams.filter(t => !t.isUser && t.id !== lastPick.teamId)
    const sender = otherTeams[Math.floor(Math.random() * otherTeams.length)]

    const chatDelay = draftSpeedRef.current === 'instant' ? 50 : 600 + Math.random() * 2000
    const delay = setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `msg-ai-${Date.now()}`,
        sender: sender?.name || 'Team',
        text: msg,
        isUser: false,
      }])
    }, chatDelay)
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

  // Draft Complete — save to backend and redirect to recap
  useEffect(() => {
    if (!isComplete || !config) return

    // Build data for save
    const allPicksData = picks.map(p => ({
      pickNumber: p.pickNumber,
      round: p.round,
      teamIndex: config.teams.findIndex(t => t.id === p.teamId),
      teamName: config.teams.find(t => t.id === p.teamId)?.name || '',
      playerId: p.playerId || p.id,
      playerName: p.playerName,
      playerRank: p.playerRank,
      isUser: p.teamId === userTeam?.id,
    }))

    const userPicksData = userPicks.map(p => ({
      pickNumber: p.pickNumber,
      round: p.round,
      playerId: p.playerId || p.id,
      playerName: p.playerName,
      playerRank: p.playerRank,
      playerFlag: p.playerFlag,
    }))

    const teamNamesList = config.teams.map(t => t.name)

    api.saveMockDraft({
      draftType: config.draftType || 'snake',
      teamCount: config.teamCount || config.teams.length,
      rosterSize: config.rosterSize || Math.max(...picks.map(p => p.round), 6),
      userPosition: config.teams.findIndex(t => t.isUser) + 1,
      dataSource: apiPlayers ? 'api' : 'mock',
      picks: allPicksData,
      userPicks: userPicksData,
      teamNames: teamNamesList,
    }).then(saved => {
      navigate(`/draft/history/mock/${saved.id}`, { replace: true })
    }).catch(() => {
      // Fallback: stay on current completion screen
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])

  // Draft Complete Screen (fallback if save fails)
  if (isComplete) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Grading your draft...</p>
        </div>
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
                  {config.teamCount} teams · {config.rosterSize} rds · {isAuction ? 'Auction' : 'Snake'} · {allPlayers.length} players
                  {isAuction && budgets[userTeamId] !== undefined && (
                    <span className="text-yellow-400 ml-1">${budgets[userTeamId]}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Center: Current Pick Status */}
            {isStarted && (isAuction || currentTeam) && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold ${
                isPaused
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : (isUserTurn || isUserNominator)
                    ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                    : isAuction && auctionPhase === 'bidding'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-dark-tertiary text-text-secondary'
              }`}>
                {isPaused ? 'PAUSED' : isAuction ? (
                  auctionPhase === 'bidding' && currentNom ? (
                    <>
                      <span className="text-white">{currentNom.player?.name?.split(' ').pop()}</span>
                      <span className="text-yellow-400 font-bold">${currentNom.currentBid}</span>
                      <span className="text-text-muted">·</span>
                      <span>{config.teams.find(t => t.id === currentNom.highBidderTeamId)?.name}</span>
                    </>
                  ) : isUserNominator ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                      </span>
                      YOUR NOMINATION
                    </>
                  ) : `${nominatorTeam?.name} nominating...`
                ) : (
                  <>
                    {isUserTurn && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                      </span>
                    )}
                    {isUserTurn ? 'YOUR PICK' : `${currentTeam?.name} picking...`}
                  </>
                )}
              </div>
            )}

            {/* Right: Speed + Pause + Pick counter + Timer + Start */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {!isStarted ? (
                <Button onClick={handleStartDraft} size="sm">
                  Start Draft
                </Button>
              ) : (
                <>
                  {/* Speed selector */}
                  <div className="hidden sm:flex items-center bg-dark-primary rounded-lg border border-dark-border overflow-hidden">
                    {[
                      { key: 'normal', label: '1x' },
                      { key: 'fast', label: '2x' },
                      { key: 'instant', label: '>>' },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => setDraftSpeed(s.key)}
                        className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                          draftSpeed === s.key
                            ? 'bg-accent-green/20 text-accent-green'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Sound toggle */}
                  <button
                    onClick={toggleSound}
                    className={`p-1.5 rounded-lg transition-colors ${
                      soundEnabled
                        ? 'bg-dark-primary text-text-secondary hover:text-white border border-dark-border'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                    title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                  >
                    {soundEnabled ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>

                  {/* Pause/Play button */}
                  <button
                    onClick={handleTogglePause}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isPaused
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-dark-primary text-text-secondary hover:text-white border border-dark-border'
                    }`}
                    title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
                  >
                    {isPaused ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    )}
                  </button>

                  <div className="text-right hidden sm:block">
                    {isAuction ? (
                      <>
                        <p className="text-text-muted text-[10px] leading-tight">BUDGET</p>
                        <p className="text-yellow-400 text-xs font-semibold">${budgets[userTeamId] ?? 0}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-text-muted text-[10px] leading-tight">ROUND {pickInfo?.round || 1}</p>
                        <p className="text-white text-xs font-semibold">{currentPickNumber + 1}/{totalPicks}</p>
                      </>
                    )}
                  </div>
                  <div className="sm:hidden text-white text-xs font-semibold">
                    {isAuction
                      ? <span className="text-yellow-400">${budgets[userTeamId] ?? 0}</span>
                      : <>R{pickInfo?.round} · {currentPickNumber + 1}/{totalPicks}</>
                    }
                  </div>
                  {isStarted && !isPaused && (
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-base tabular-nums ${
                      (isUserTurn || isUserNominator || (isAuction && auctionPhase === 'bidding')) && timer <= 5 ? 'bg-red-500/20 text-red-400' :
                      (isUserTurn || isUserNominator) && timer <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                      (isUserTurn || isUserNominator) ? 'bg-accent-green/20 text-accent-green' :
                      isAuction && auctionPhase === 'bidding' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-dark-primary text-text-secondary border border-dark-border'
                    }`}>
                      {formatTime(timer)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile: Current pick banner */}
          {isStarted && (isAuction || currentTeam) && (
            <div className={`sm:hidden mt-1.5 px-3 py-1.5 rounded-lg text-center text-xs font-semibold ${
              isPaused
                ? 'bg-yellow-500/20 text-yellow-400'
                : (isUserTurn || isUserNominator)
                  ? 'bg-accent-green/20 text-accent-green'
                  : isAuction && auctionPhase === 'bidding'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-dark-tertiary text-text-secondary'
            }`}>
              {isPaused ? (
                <span className="flex items-center justify-center gap-1.5">
                  PAUSED
                  <span className="text-[10px] font-normal opacity-70">tap play to resume</span>
                </span>
              ) : isAuction ? (
                auctionPhase === 'bidding' && currentNom
                  ? <span>{currentNom.player?.name?.split(' ').pop()} · <span className="text-yellow-400">${currentNom.currentBid}</span></span>
                  : isUserNominator
                    ? <span className="flex items-center justify-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                        </span>
                        YOUR NOMINATION
                      </span>
                    : `${nominatorTeam?.name} nominating...`
              ) : isUserTurn ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                  </span>
                  YOUR PICK
                </span>
              ) : `${currentTeam?.name} picking...`}
            </div>
          )}

          {/* Mobile speed selector + sound toggle */}
          {isStarted && (
            <div className="sm:hidden flex items-center justify-center gap-1 mt-1.5">
              <span className="text-text-muted text-[10px] mr-1">Speed:</span>
              {[
                { key: 'normal', label: '1x' },
                { key: 'fast', label: '2x' },
                { key: 'instant', label: '>>' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setDraftSpeed(s.key)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    draftSpeed === s.key
                      ? 'bg-accent-green/20 text-accent-green'
                      : 'text-text-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="text-dark-border mx-1">|</span>
              <button
                onClick={toggleSound}
                className={`p-0.5 rounded transition-colors ${soundEnabled ? 'text-text-muted' : 'text-red-400'}`}
              >
                {soundEnabled ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>
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
              <p className="text-xs opacity-80">
                {recentPick.amount ? `$${recentPick.amount} · ` : `#${recentPick.pickNumber} · `}{recentPick.teamName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== AUCTION BIDDING BAR ===== */}
      {isAuction && isStarted && auctionPhase === 'bidding' && currentNom && (() => {
        const np = currentNom.player
        const enriched = np ? allPlayers.find(p => p.id === np.id) || np : null
        return (
        <div className="bg-yellow-500/[0.06] border-b-2 border-yellow-500/50 flex-shrink-0 z-20 shadow-[0_2px_12px_rgba(234,179,8,0.08)]">
          {/* Main bar */}
          <div className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
            <button
              onClick={() => setNomExpanded(prev => !prev)}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left group px-2 py-1.5 -mx-2 -my-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors"
            >
              {enriched?.headshot ? (
                <img src={enriched.headshot} alt="" className="w-10 h-10 rounded-full object-cover bg-dark-tertiary flex-shrink-0 ring-2 ring-yellow-500/50 shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center ring-2 ring-yellow-500/50 flex-shrink-0">
                  <span className="text-xl">{enriched?.flag}</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-bold text-sm truncate group-hover:text-yellow-400 transition-colors">{enriched?.name}</p>
                  {enriched?.primaryTour && (
                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${
                      enriched.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                      enriched.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{enriched.primaryTour}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <span>#{enriched?.rank}</span>
                  <span>·</span>
                  <span>SG {enriched?.sg > 0 ? '+' : ''}{enriched?.sg?.toFixed(2)}</span>
                  <span>·</span>
                  <span>Nom {config.teams.find(t => t.id === currentNom.nominatedByTeamId)?.name}</span>
                </div>
              </div>
              <div className="flex flex-col items-center flex-shrink-0">
                <svg className={`w-4 h-4 text-yellow-500/60 group-hover:text-yellow-400 transition-all ${nomExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {!nomExpanded && <span className="text-[8px] text-yellow-500/40 group-hover:text-yellow-400/70 transition-colors">Stats</span>}
              </div>
            </button>
            <div className="text-center px-4 py-1.5 flex-shrink-0 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-400/70 text-[10px] font-semibold tracking-wider">CURRENT BID</p>
              <p className="text-yellow-400 font-bold text-xl">${currentNom.currentBid}</p>
              <p className="text-text-muted text-[10px] truncate">
                {config.teams.find(t => t.id === currentNom.highBidderTeamId)?.name}
              </p>
            </div>
            {isUserBidding && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setNomBidInput(prev => Math.max(currentNom.currentBid + 1, prev - 1))}
                  className="w-7 h-7 bg-dark-primary rounded text-text-muted hover:text-white flex items-center justify-center text-sm font-bold"
                >-</button>
                <span className="text-white font-bold text-sm w-8 text-center tabular-nums">${nomBidInput}</span>
                <button
                  onClick={() => setNomBidInput(prev => Math.min(budgets[userTeamId] || 0, prev + 1))}
                  className="w-7 h-7 bg-dark-primary rounded text-text-muted hover:text-white flex items-center justify-center text-sm font-bold"
                >+</button>
                <button
                  onClick={() => handlePlaceBid(nomBidInput)}
                  disabled={nomBidInput <= currentNom.currentBid || nomBidInput > (budgets[userTeamId] || 0)}
                  className="px-3 py-1.5 bg-yellow-500 text-dark-primary rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors disabled:opacity-30"
                >
                  BID
                </button>
              </div>
            )}
            {!isUserBidding && currentNom.highBidderTeamId === userTeamId && (
              <span className="text-accent-green text-xs font-bold px-2 py-1 bg-accent-green/15 rounded-lg flex-shrink-0">WINNING</span>
            )}
          </div>

          {/* Expanded player profile card */}
          {nomExpanded && enriched && (
            <div className="px-3 sm:px-4 pb-3 animate-fade-in">
              <div className="bg-dark-primary rounded-lg border border-dark-border/50 p-3">
                {/* Stats grid */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[
                    { label: 'Events', value: enriched.tournaments },
                    { label: 'Wins', value: enriched.wins, highlight: enriched.wins > 0 },
                    { label: 'Top 5s', value: enriched.top5s },
                    { label: 'Top 10s', value: enriched.top10s },
                    { label: 'Top 25s', value: enriched.top25s },
                    { label: 'Cuts', value: `${enriched.cutsMade}/${enriched.tournaments}` },
                    { label: 'Cut %', value: `${enriched.cutsPct}%` },
                  ].map(stat => (
                    <div key={stat.label} className="text-center py-1.5">
                      <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${stat.highlight ? 'text-yellow-400' : 'text-white'}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* SG breakdown */}
                <div className="mt-2.5 pt-2.5 border-t border-dark-border/40">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: 'SG Total', value: enriched.sg },
                      { label: 'OTT', value: enriched.sgOTT },
                      { label: 'APP', value: enriched.sgAPP },
                      { label: 'ATG', value: enriched.sgATG },
                      { label: 'Putt', value: enriched.sgPutt },
                    ].map(stat => (
                      <div key={stat.label} className="text-center py-1">
                        <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</p>
                        <p className={`text-xs font-bold tabular-nums ${stat.value > 0.3 ? 'text-accent-green' : stat.value >= 0 ? 'text-white' : 'text-red-400'}`}>
                          {stat.value > 0 ? '+' : ''}{stat.value?.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent form */}
                {enriched.form?.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-dark-border/40">
                    <p className="text-text-muted text-[9px] uppercase tracking-wider mb-1.5">Recent Form</p>
                    <div className="flex gap-1.5">
                      {enriched.form.map((result, i) => {
                        const pos = parseInt(result.replace('T', ''))
                        return (
                          <span key={i} className={`flex-1 text-center py-1 rounded text-xs font-medium ${
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
                )}
              </div>
            </div>
          )}
        </div>
        )
      })()}

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
                        : isAuction && nominatorTeam?.id === team.id
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : !isAuction && pickInfo && config.teams[pickInfo.orderIndex]?.id === team.id
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-dark-tertiary text-text-muted'
                    }`}
                  >
                    {team.isUser ? (
                      <span className="font-bold">YOU</span>
                    ) : (
                      team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name
                    )}
                    {isAuction && isStarted && (
                      <div className="text-[8px] text-yellow-400/70 font-normal">${budgets[team.id] ?? 0}</div>
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
                      {!isAuction && <span className="text-[8px] opacity-50">{isReverse ? '←' : '→'}</span>}
                    </div>
                    {config.teams.map((team, teamIdx) => {
                      // Auction: fill each team's column top-to-bottom; Snake: snake pattern
                      let pick, isCurrent
                      if (isAuction) {
                        const teamPicks = picks.filter(p => p.teamId === team.id)
                        pick = teamPicks[roundIdx] || null
                        isCurrent = false // no single "current cell" in auction
                      } else {
                        const actualPickIndex = isReverse
                          ? roundIdx * config.teamCount + (config.teamCount - 1 - teamIdx)
                          : roundIdx * config.teamCount + teamIdx
                        pick = picks[actualPickIndex]
                        isCurrent = actualPickIndex === currentPickNumber && isStarted
                      }
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
                              <p className="text-[9px] text-text-muted">
                                {isAuction && pick.amount ? `$${pick.amount}` : `#${pick.playerRank}`}
                              </p>
                            </div>
                          ) : isCurrent ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                            </span>
                          ) : (
                            <span className="text-[9px] text-text-muted/30 tabular-nums">
                              {isAuction ? '—' : `${round}.${teamIdx + 1}`}
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
                          {isAuction ? (
                            isUserNominator && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleNominate(player, 1) }}
                                className="px-2 py-1 bg-yellow-500 text-dark-primary text-[10px] rounded font-semibold hover:bg-yellow-400 transition-colors"
                              >
                                Nom
                              </button>
                            )
                          ) : (
                            isUserTurn && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMakePick(player) }}
                                className="px-2 py-1 bg-accent-green text-white text-[10px] rounded font-semibold hover:bg-accent-green/80 transition-colors"
                              >
                                Draft
                              </button>
                            )
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
                {/* Auto-pick toggle */}
                <div className="flex-shrink-0 px-3 pt-3 pb-1">
                  <div className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg border border-dark-border">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Auto-Pick</span>
                    </div>
                    <button
                      onClick={() => {
                        setAutoPick(prev => {
                          const next = !prev
                          autoPickRef.current = next
                          sessionStorage.setItem('mockDraftAutoPick', String(next))
                          return next
                        })
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        autoPick ? 'bg-accent-green' : 'bg-dark-tertiary'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        autoPick ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-3 pt-2">
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
                            {isAuction ? (
                              isUserNominator && (
                                <button
                                  onClick={() => handleNominate(player, 1)}
                                  className="px-2 py-1 bg-yellow-500 text-dark-primary text-[10px] rounded font-semibold hover:bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Nom
                                </button>
                              )
                            ) : (
                              isUserTurn && (
                                <button
                                  onClick={() => handleMakePick(player)}
                                  className="px-2 py-1 bg-accent-green text-white text-[10px] rounded font-semibold hover:bg-accent-green/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Draft
                                </button>
                              )
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
          onNominate={(p) => handleNominate(p, 1)}
          onQueue={(p) => {
            const inQ = queue.find(q => q.id === p.id)
            inQ ? handleRemoveFromQueue(p.id) : handleAddToQueue(p)
          }}
          isUserTurn={isUserTurn}
          isUserNominator={isUserNominator}
          isAuction={isAuction}
          inQueue={!!queue.find(q => q.id === selectedPlayer.id)}
          isDrafted={!!selectedPlayer._drafted}
        />
      )}
    </div>
  )
}

export default MockDraftRoom
