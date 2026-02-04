// Mock API Service
// Simulates backend responses for testing UI flows

// Simulated delay to mimic network latency
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Mock database (persisted in localStorage for session continuity)
const getUsers = () => {
  const users = localStorage.getItem('mockUsers')
  return users ? JSON.parse(users) : []
}

const saveUsers = (users) => {
  localStorage.setItem('mockUsers', JSON.stringify(users))
}

// Initialize with a demo user
const initMockData = () => {
  const users = getUsers()
  if (users.length === 0) {
    saveUsers([
      {
        id: '1',
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'password123', // In real app, this would be hashed
        createdAt: new Date().toISOString(),
      }
    ])
  }
}

// Initialize on load
initMockData()

// Generate a fake JWT token
const generateToken = (userId) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  }))
  const signature = btoa('mock-signature')
  return `${header}.${payload}.${signature}`
}

// ============================================
// MOCK DATA - Leagues, Teams, Players, Activity
// ============================================

const mockLeagues = [
  {
    id: 'league-1',
    name: 'Weekend Warriors',
    type: 'snake',
    memberCount: 8,
    maxMembers: 10,
    status: 'active',
    currentRound: 'The Players Championship',
    userRank: 2,
    userPoints: 1245,
    leader: { name: 'Mike S.', points: 1312 },
    createdAt: '2024-01-15T00:00:00Z',
    settings: {
      rosterSize: 6,
      scoringType: 'standard',
      tradeDeadline: '2024-08-01',
    },
    standings: [
      { rank: 1, userId: 'user-2', name: 'Mike S.', points: 1312, avatar: 'MS' },
      { rank: 2, userId: '1', name: 'Demo User', points: 1245, avatar: 'DU' },
      { rank: 3, userId: 'user-3', name: 'Sarah K.', points: 1198, avatar: 'SK' },
      { rank: 4, userId: 'user-4', name: 'James T.', points: 1156, avatar: 'JT' },
      { rank: 5, userId: 'user-5', name: 'Emma W.', points: 1089, avatar: 'EW' },
      { rank: 6, userId: 'user-6', name: 'Chris L.', points: 1034, avatar: 'CL' },
      { rank: 7, userId: 'user-7', name: 'Alex R.', points: 987, avatar: 'AR' },
      { rank: 8, userId: 'user-8', name: 'Jordan P.', points: 912, avatar: 'JP' },
    ],
  },
  {
    id: 'league-2',
    name: 'Office Masters League',
    type: 'auction',
    memberCount: 12,
    maxMembers: 12,
    status: 'active',
    currentRound: 'The Players Championship',
    userRank: 5,
    userPoints: 2156,
    leader: { name: 'Rachel M.', points: 2489 },
    createdAt: '2024-02-01T00:00:00Z',
    settings: {
      rosterSize: 8,
      scoringType: 'strokes-gained',
      budget: 100,
      tradeDeadline: '2024-08-15',
    },
    standings: [
      { rank: 1, userId: 'user-9', name: 'Rachel M.', points: 2489, avatar: 'RM' },
      { rank: 2, userId: 'user-10', name: 'David H.', points: 2401, avatar: 'DH' },
      { rank: 3, userId: 'user-11', name: 'Lisa C.', points: 2345, avatar: 'LC' },
      { rank: 4, userId: 'user-12', name: 'Tom B.', points: 2278, avatar: 'TB' },
      { rank: 5, userId: '1', name: 'Demo User', points: 2156, avatar: 'DU' },
      { rank: 6, userId: 'user-13', name: 'Kate M.', points: 2089, avatar: 'KM' },
    ],
  },
  {
    id: 'league-3',
    name: 'Golf Buddies 2024',
    type: 'snake',
    memberCount: 6,
    maxMembers: 8,
    status: 'active',
    currentRound: 'The Players Championship',
    userRank: 1,
    userPoints: 876,
    leader: { name: 'Demo User', points: 876 },
    createdAt: '2024-03-01T00:00:00Z',
    settings: {
      rosterSize: 6,
      scoringType: 'standard',
    },
    standings: [
      { rank: 1, userId: '1', name: 'Demo User', points: 876, avatar: 'DU' },
      { rank: 2, userId: 'user-14', name: 'Ben W.', points: 834, avatar: 'BW' },
      { rank: 3, userId: 'user-15', name: 'Amy G.', points: 798, avatar: 'AG' },
      { rank: 4, userId: 'user-16', name: 'Nick T.', points: 756, avatar: 'NT' },
      { rank: 5, userId: 'user-17', name: 'Sophie L.', points: 712, avatar: 'SL' },
      { rank: 6, userId: 'user-18', name: 'Dan R.', points: 678, avatar: 'DR' },
    ],
  },
]

const mockPlayers = [
  {
    id: 'player-1',
    name: 'Scottie Scheffler',
    rank: 1,
    country: 'USA',
    countryFlag: '🇺🇸',
    imageUrl: null,
    stats: {
      sgTotal: 2.45,
      sgOffTee: 0.78,
      sgApproach: 1.12,
      sgAroundGreen: 0.32,
      sgPutting: 0.23,
      drivingDistance: 307.2,
      drivingAccuracy: 62.4,
      gir: 72.1,
      scoringAvg: 69.2,
    },
    recentForm: ['1st', '3rd', 'T8', '2nd', 'T5'],
    tournamentStatus: { position: 'T3', score: -8, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-2',
    name: 'Rory McIlroy',
    rank: 2,
    country: 'NIR',
    countryFlag: '🇬🇧',
    imageUrl: null,
    stats: {
      sgTotal: 2.12,
      sgOffTee: 0.92,
      sgApproach: 0.89,
      sgAroundGreen: 0.18,
      sgPutting: 0.13,
      drivingDistance: 318.4,
      drivingAccuracy: 58.9,
      gir: 68.7,
      scoringAvg: 69.8,
    },
    recentForm: ['2nd', 'T12', '1st', 'T6', 'T3'],
    tournamentStatus: { position: 'T7', score: -6, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-3',
    name: 'Jon Rahm',
    rank: 3,
    country: 'ESP',
    countryFlag: '🇪🇸',
    imageUrl: null,
    stats: {
      sgTotal: 1.98,
      sgOffTee: 0.67,
      sgApproach: 0.95,
      sgAroundGreen: 0.21,
      sgPutting: 0.15,
      drivingDistance: 305.8,
      drivingAccuracy: 61.2,
      gir: 70.3,
      scoringAvg: 69.5,
    },
    recentForm: ['T4', '1st', 'T15', '3rd', 'T2'],
    tournamentStatus: { position: '1st', score: -11, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-4',
    name: 'Viktor Hovland',
    rank: 4,
    country: 'NOR',
    countryFlag: '🇳🇴',
    imageUrl: null,
    stats: {
      sgTotal: 1.87,
      sgOffTee: 0.56,
      sgApproach: 1.02,
      sgAroundGreen: 0.12,
      sgPutting: 0.17,
      drivingDistance: 301.2,
      drivingAccuracy: 63.8,
      gir: 71.2,
      scoringAvg: 69.9,
    },
    recentForm: ['T8', 'T5', '2nd', 'T11', '1st'],
    tournamentStatus: { position: 'T12', score: -4, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-5',
    name: 'Patrick Cantlay',
    rank: 5,
    country: 'USA',
    countryFlag: '🇺🇸',
    imageUrl: null,
    stats: {
      sgTotal: 1.76,
      sgOffTee: 0.34,
      sgApproach: 0.87,
      sgAroundGreen: 0.28,
      sgPutting: 0.27,
      drivingDistance: 298.6,
      drivingAccuracy: 67.3,
      gir: 69.8,
      scoringAvg: 70.1,
    },
    recentForm: ['T6', 'T9', 'T4', 'T8', 'T7'],
    tournamentStatus: { position: 'T18', score: -2, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-6',
    name: 'Xander Schauffele',
    rank: 6,
    country: 'USA',
    countryFlag: '🇺🇸',
    imageUrl: null,
    stats: {
      sgTotal: 1.72,
      sgOffTee: 0.45,
      sgApproach: 0.78,
      sgAroundGreen: 0.24,
      sgPutting: 0.25,
      drivingDistance: 304.1,
      drivingAccuracy: 64.5,
      gir: 70.8,
      scoringAvg: 69.7,
    },
    recentForm: ['3rd', '2nd', 'T9', 'T5', 'T12'],
    tournamentStatus: { position: 'T5', score: -7, thru: 'F', round: 2 },
    owned: true,
  },
  {
    id: 'player-7',
    name: 'Collin Morikawa',
    rank: 7,
    country: 'USA',
    countryFlag: '🇺🇸',
    imageUrl: null,
    stats: {
      sgTotal: 1.65,
      sgOffTee: 0.28,
      sgApproach: 1.08,
      sgAroundGreen: 0.15,
      sgPutting: 0.14,
      drivingDistance: 296.3,
      drivingAccuracy: 66.1,
      gir: 72.4,
      scoringAvg: 70.0,
    },
    recentForm: ['T11', 'T3', 'T7', '1st', 'T14'],
    tournamentStatus: null,
    owned: false,
  },
  {
    id: 'player-8',
    name: 'Ludvig Aberg',
    rank: 8,
    country: 'SWE',
    countryFlag: '🇸🇪',
    imageUrl: null,
    stats: {
      sgTotal: 1.58,
      sgOffTee: 0.72,
      sgApproach: 0.68,
      sgAroundGreen: 0.09,
      sgPutting: 0.09,
      drivingDistance: 312.7,
      drivingAccuracy: 60.2,
      gir: 68.9,
      scoringAvg: 70.2,
    },
    recentForm: ['2nd', 'T6', 'T13', 'T4', '3rd'],
    tournamentStatus: { position: 'T2', score: -9, thru: 'F', round: 2 },
    owned: false,
  },
]

const mockTournaments = [
  {
    id: 'tourney-1',
    name: 'The Players Championship',
    course: 'TPC Sawgrass',
    location: 'Ponte Vedra Beach, FL',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    purse: 25000000,
    status: 'upcoming',
    lineupSet: true,
    defending: 'Scottie Scheffler',
    fieldSize: 144,
  },
  {
    id: 'tourney-2',
    name: 'The Masters',
    course: 'Augusta National',
    location: 'Augusta, GA',
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    purse: 18000000,
    status: 'upcoming',
    lineupSet: false,
    defending: 'Jon Rahm',
    fieldSize: 90,
  },
  {
    id: 'tourney-3',
    name: 'Arnold Palmer Invitational',
    course: 'Bay Hill Club',
    location: 'Orlando, FL',
    startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    purse: 20000000,
    status: 'completed',
    lineupSet: true,
    winner: 'Scottie Scheffler',
    fieldSize: 120,
  },
  {
    id: 'tourney-4',
    name: 'PGA Championship',
    course: 'Valhalla Golf Club',
    location: 'Louisville, KY',
    startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
    purse: 17500000,
    status: 'upcoming',
    lineupSet: false,
    defending: 'Brooks Koepka',
    fieldSize: 156,
  },
]

const mockActivity = [
  {
    id: 'activity-1',
    type: 'trade',
    league: 'Weekend Warriors',
    leagueId: 'league-1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Mike S.', avatar: 'MS' },
    description: 'traded Collin Morikawa to Sarah K. for Tommy Fleetwood',
    players: ['Collin Morikawa', 'Tommy Fleetwood'],
  },
  {
    id: 'activity-2',
    type: 'pickup',
    league: 'Weekend Warriors',
    leagueId: 'league-1',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Demo User', avatar: 'DU' },
    description: 'picked up Ludvig Aberg from waivers',
    players: ['Ludvig Aberg'],
  },
  {
    id: 'activity-3',
    type: 'drop',
    league: 'Office Masters League',
    leagueId: 'league-2',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Rachel M.', avatar: 'RM' },
    description: 'dropped Justin Thomas',
    players: ['Justin Thomas'],
  },
  {
    id: 'activity-4',
    type: 'score',
    league: 'Golf Buddies 2024',
    leagueId: 'league-3',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    user: { name: 'System', avatar: 'SY' },
    description: 'Scottie Scheffler finished T3 at Arnold Palmer Invitational (+85 pts)',
    players: ['Scottie Scheffler'],
  },
  {
    id: 'activity-5',
    type: 'lineup',
    league: 'Weekend Warriors',
    leagueId: 'league-1',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    user: { name: 'James T.', avatar: 'JT' },
    description: 'set lineup for The Players Championship',
    players: [],
  },
  {
    id: 'activity-6',
    type: 'trade',
    league: 'Office Masters League',
    leagueId: 'league-2',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user: { name: 'David H.', avatar: 'DH' },
    description: 'proposed trade: Rory McIlroy for Viktor Hovland + Jordan Spieth',
    players: ['Rory McIlroy', 'Viktor Hovland', 'Jordan Spieth'],
  },
  {
    id: 'activity-7',
    type: 'join',
    league: 'Golf Buddies 2024',
    leagueId: 'league-3',
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Dan R.', avatar: 'DR' },
    description: 'joined the league',
    players: [],
  },
  {
    id: 'activity-8',
    type: 'score',
    league: 'Weekend Warriors',
    leagueId: 'league-1',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user: { name: 'System', avatar: 'SY' },
    description: 'Jon Rahm won Arnold Palmer Invitational (+120 pts)',
    players: ['Jon Rahm'],
  },
  {
    id: 'activity-9',
    type: 'pickup',
    league: 'Office Masters League',
    leagueId: 'league-2',
    timestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Lisa C.', avatar: 'LC' },
    description: 'picked up Wyndham Clark from free agents',
    players: ['Wyndham Clark'],
  },
  {
    id: 'activity-10',
    type: 'lineup',
    league: 'Golf Buddies 2024',
    leagueId: 'league-3',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Ben W.', avatar: 'BW' },
    description: 'benched Bryson DeChambeau for Arnold Palmer Invitational',
    players: ['Bryson DeChambeau'],
  },
]

const mockUserStats = {
  totalPoints: 4277,
  activeLeagues: 3,
  bestFinish: 1,
  winRate: 33,
  totalWins: 2,
  totalTrades: 5,
  seasonRank: 156,
  weeklyChange: '+12',
}

// Mock API endpoints
export const mockApi = {
  // Auth endpoints
  auth: {
    async login(email, password) {
      await delay(800) // Simulate network delay

      const users = getUsers()
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

      if (!user) {
        throw new Error('No account found with this email')
      }

      if (user.password !== password) {
        throw new Error('Incorrect password')
      }

      const token = generateToken(user.id)
      const { password: _, ...userWithoutPassword } = user

      return {
        token,
        user: userWithoutPassword,
      }
    },

    async register(name, email, password) {
      await delay(1000) // Simulate network delay

      const users = getUsers()

      // Check if email already exists
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists')
      }

      // Validate inputs
      if (!name || name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters')
      }

      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      // Create new user
      const newUser = {
        id: String(Date.now()),
        name: name.trim(),
        email: email.toLowerCase(),
        password, // In real app, this would be hashed
        createdAt: new Date().toISOString(),
      }

      users.push(newUser)
      saveUsers(users)

      const token = generateToken(newUser.id)
      const { password: _, ...userWithoutPassword } = newUser

      return {
        token,
        user: userWithoutPassword,
      }
    },

    async getCurrentUser(token) {
      await delay(300)

      if (!token) {
        throw new Error('No token provided')
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const users = getUsers()
        const user = users.find(u => u.id === payload.userId)

        if (!user) {
          throw new Error('User not found')
        }

        const { password: _, ...userWithoutPassword } = user
        return userWithoutPassword
      } catch {
        throw new Error('Invalid token')
      }
    },
  },

  // League endpoints
  leagues: {
    async getAll() {
      await delay(500)
      return mockLeagues
    },

    async getById(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league) {
        throw new Error('League not found')
      }
      return league
    },

    async create(leagueData) {
      await delay(800)
      return {
        id: String(Date.now()),
        ...leagueData,
        createdAt: new Date().toISOString(),
        members: 1,
      }
    },

    async join(code) {
      await delay(600)
      throw new Error('Invalid league code')
    },
  },

  // Tournament endpoints
  tournaments: {
    async getUpcoming() {
      await delay(400)
      return mockTournaments.filter(t => t.status === 'upcoming')
    },

    async getAll() {
      await delay(400)
      return mockTournaments
    },

    async getCurrent() {
      await delay(300)
      // Return the next upcoming tournament
      const upcoming = mockTournaments
        .filter(t => t.status === 'upcoming')
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      return upcoming[0] || null
    },
  },

  // Player endpoints
  players: {
    async search(query) {
      await delay(300)

      if (!query) return mockPlayers

      return mockPlayers.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    },

    async getById(playerId) {
      await delay(200)
      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) {
        throw new Error('Player not found')
      }
      return player
    },

    async getRoster() {
      await delay(400)
      return mockPlayers.filter(p => p.owned)
    },
  },

  // Activity endpoints
  activity: {
    async getAll(limit = 10) {
      await delay(400)
      return mockActivity.slice(0, limit)
    },

    async getByLeague(leagueId, limit = 10) {
      await delay(300)
      return mockActivity
        .filter(a => a.leagueId === leagueId)
        .slice(0, limit)
    },
  },

  // User stats endpoints
  stats: {
    async get() {
      await delay(300)
      return mockUserStats
    },
  },
}

export default mockApi
