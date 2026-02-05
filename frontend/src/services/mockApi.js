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

// Helper function to generate random hole scores for a round
const generateHoleScores = () => {
  const pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]
  return pars.map(par => {
    const rand = Math.random()
    if (rand < 0.02) return par - 2 // Eagle
    if (rand < 0.15) return par - 1 // Birdie
    if (rand < 0.70) return par // Par
    if (rand < 0.92) return par + 1 // Bogey
    return par + 2 // Double bogey
  })
}

// Calculate fantasy points based on tournament position
const calculateFantasyPoints = (status) => {
  if (!status) return 0
  const position = status.position
  if (position === '1st') return 100
  if (position === '2nd' || position === 'T2') return 75
  if (position === '3rd' || position === 'T3') return 60
  const posNum = parseInt(position.replace('T', ''))
  if (posNum <= 5) return 50
  if (posNum <= 10) return 35
  if (posNum <= 20) return 20
  if (posNum <= 30) return 10
  return 5
}

// ============================================
// MOCK DATA - Leagues, Teams, Players, Activity
// ============================================

const mockLeagues = [
  {
    id: 'league-1',
    name: 'Weekend Warriors',
    draftType: 'snake',
    format: 'full-league',
    memberCount: 8,
    maxMembers: 10,
    status: 'active',
    currentRound: 'The Players Championship',
    currentWeek: 4,
    userRank: 2,
    userPoints: 1245,
    leader: { name: 'Mike S.', points: 1312 },
    createdAt: '2024-01-15T00:00:00Z',
    settings: {
      rosterSize: 6,
      scoringType: 'standard',
      tradeDeadline: '2024-08-01',
      formatSettings: {
        segments: 4,
        pointsPerPosition: { 1: 100, 2: 75, 3: 60, top5: 50, top10: 35, top20: 20, top30: 10, made_cut: 5 }
      }
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
    draftType: 'auction',
    format: 'head-to-head',
    memberCount: 12,
    maxMembers: 12,
    status: 'active',
    currentRound: 'The Players Championship',
    currentWeek: 4,
    userRank: 5,
    userPoints: 2156,
    leader: { name: 'Rachel M.', points: 2489 },
    createdAt: '2024-02-01T00:00:00Z',
    settings: {
      rosterSize: 8,
      scoringType: 'strokes-gained',
      budget: 100,
      tradeDeadline: '2024-08-15',
      formatSettings: {
        playoffTeams: 4,
        playoffFormat: 'single-elimination',
        regularSeasonWeeks: 12,
        tiebreakers: ['total-points', 'head-to-head']
      }
    },
    standings: [
      { rank: 1, userId: 'user-9', name: 'Rachel M.', points: 2489, avatar: 'RM', wins: 3, losses: 1, ties: 0 },
      { rank: 2, userId: 'user-10', name: 'David H.', points: 2401, avatar: 'DH', wins: 3, losses: 1, ties: 0 },
      { rank: 3, userId: 'user-11', name: 'Lisa C.', points: 2345, avatar: 'LC', wins: 2, losses: 1, ties: 1 },
      { rank: 4, userId: 'user-12', name: 'Tom B.', points: 2278, avatar: 'TB', wins: 2, losses: 2, ties: 0 },
      { rank: 5, userId: '1', name: 'Demo User', points: 2156, avatar: 'DU', wins: 2, losses: 2, ties: 0 },
      { rank: 6, userId: 'user-13', name: 'Kate M.', points: 2089, avatar: 'KM', wins: 1, losses: 3, ties: 0 },
    ],
  },
  {
    id: 'league-3',
    name: 'Golf Buddies 2024',
    draftType: 'snake',
    format: 'roto',
    memberCount: 6,
    maxMembers: 8,
    status: 'active',
    currentRound: 'The Players Championship',
    currentWeek: 4,
    userRank: 1,
    userPoints: 876,
    leader: { name: 'Demo User', points: 876 },
    createdAt: '2024-03-01T00:00:00Z',
    settings: {
      rosterSize: 6,
      scoringType: 'standard',
      formatSettings: {
        categories: ['wins', 'top10s', 'cuts_made', 'birdies', 'eagles', 'scoring_avg']
      }
    },
    standings: [
      { rank: 1, userId: '1', name: 'Demo User', points: 876, avatar: 'DU', rotoPoints: 42 },
      { rank: 2, userId: 'user-14', name: 'Ben W.', points: 834, avatar: 'BW', rotoPoints: 38 },
      { rank: 3, userId: 'user-15', name: 'Amy G.', points: 798, avatar: 'AG', rotoPoints: 35 },
      { rank: 4, userId: 'user-16', name: 'Nick T.', points: 756, avatar: 'NT', rotoPoints: 32 },
      { rank: 5, userId: 'user-17', name: 'Sophie L.', points: 712, avatar: 'SL', rotoPoints: 28 },
      { rank: 6, userId: 'user-18', name: 'Dan R.', points: 678, avatar: 'DR', rotoPoints: 25 },
    ],
  },
  {
    id: 'league-4',
    name: 'Survivor Golf Club',
    draftType: 'snake',
    format: 'survivor',
    memberCount: 10,
    maxMembers: 12,
    status: 'active',
    currentRound: 'The Players Championship',
    currentWeek: 4,
    userRank: 3,
    userPoints: 445,
    leader: { name: 'Tyler M.', points: 512 },
    createdAt: '2024-01-20T00:00:00Z',
    settings: {
      rosterSize: 6,
      scoringType: 'standard',
      formatSettings: {
        eliminationsPerWeek: 1,
        buyBacks: { allowed: true, max: 1 }
      }
    },
    standings: [
      { rank: 1, userId: 'user-20', name: 'Tyler M.', points: 512, avatar: 'TM', status: 'alive' },
      { rank: 2, userId: 'user-21', name: 'Jen B.', points: 489, avatar: 'JB', status: 'alive' },
      { rank: 3, userId: '1', name: 'Demo User', points: 445, avatar: 'DU', status: 'alive' },
      { rank: 4, userId: 'user-22', name: 'Mark K.', points: 423, avatar: 'MK', status: 'alive' },
      { rank: 5, userId: 'user-23', name: 'Anna S.', points: 398, avatar: 'AS', status: 'alive' },
      { rank: 6, userId: 'user-24', name: 'Pete R.', points: 367, avatar: 'PR', status: 'alive' },
      { rank: 7, userId: 'user-25', name: 'Carol W.', points: 312, avatar: 'CW', status: 'alive' },
      { rank: 8, userId: 'user-26', name: 'Steve D.', points: 256, avatar: 'SD', status: 'buyback' },
      { rank: 9, userId: 'user-27', name: 'Laura T.', points: 189, avatar: 'LT', status: 'eliminated', eliminatedWeek: 3 },
      { rank: 10, userId: 'user-28', name: 'Dave M.', points: 145, avatar: 'DM', status: 'eliminated', eliminatedWeek: 2 },
    ],
  },
  {
    id: 'league-5',
    name: 'Pick Em Pool',
    draftType: 'none',
    format: 'one-and-done',
    memberCount: 8,
    maxMembers: 20,
    status: 'active',
    currentRound: 'The Players Championship',
    currentWeek: 4,
    userRank: 2,
    userPoints: 385,
    leader: { name: 'Kevin L.', points: 412 },
    createdAt: '2024-01-10T00:00:00Z',
    settings: {
      rosterSize: 1,
      scoringType: 'standard',
      formatSettings: {
        tiers: [
          { tier: 1, maxRank: 10, multiplier: 1.0 },
          { tier: 2, maxRank: 30, multiplier: 1.25 },
          { tier: 3, maxRank: 60, multiplier: 1.5 },
          { tier: 4, maxRank: null, multiplier: 2.0 }
        ],
        majorMultiplier: 1.5
      }
    },
    standings: [
      { rank: 1, userId: 'user-30', name: 'Kevin L.', points: 412, avatar: 'KL', usedPlayers: 4 },
      { rank: 2, userId: '1', name: 'Demo User', points: 385, avatar: 'DU', usedPlayers: 4 },
      { rank: 3, userId: 'user-31', name: 'Michelle R.', points: 356, avatar: 'MR', usedPlayers: 4 },
      { rank: 4, userId: 'user-32', name: 'Brian T.', points: 334, avatar: 'BT', usedPlayers: 4 },
      { rank: 5, userId: 'user-33', name: 'Stacy K.', points: 312, avatar: 'SK', usedPlayers: 3 },
      { rank: 6, userId: 'user-34', name: 'Rob W.', points: 289, avatar: 'RW', usedPlayers: 4 },
      { rank: 7, userId: 'user-35', name: 'Nancy P.', points: 267, avatar: 'NP', usedPlayers: 4 },
      { rank: 8, userId: 'user-36', name: 'Greg H.', points: 234, avatar: 'GH', usedPlayers: 3 },
    ],
  },
]

// Head-to-Head matchup data
const mockMatchups = {
  'league-2': {
    schedule: [
      {
        week: 1,
        tournament: 'Farmers Insurance Open',
        matchups: [
          { home: 'user-9', away: 'user-13', homeScore: 142, awayScore: 128, completed: true },
          { home: 'user-10', away: 'user-12', homeScore: 156, awayScore: 134, completed: true },
          { home: 'user-11', away: '1', homeScore: 145, awayScore: 138, completed: true },
        ]
      },
      {
        week: 2,
        tournament: 'AT&T Pebble Beach',
        matchups: [
          { home: 'user-9', away: 'user-12', homeScore: 167, awayScore: 143, completed: true },
          { home: 'user-10', away: '1', homeScore: 151, awayScore: 158, completed: true },
          { home: 'user-11', away: 'user-13', homeScore: 139, awayScore: 139, completed: true },
        ]
      },
      {
        week: 3,
        tournament: 'WM Phoenix Open',
        matchups: [
          { home: '1', away: 'user-9', homeScore: 172, awayScore: 165, completed: true },
          { home: 'user-12', away: 'user-11', homeScore: 148, awayScore: 152, completed: true },
          { home: 'user-13', away: 'user-10', homeScore: 134, awayScore: 156, completed: true },
        ]
      },
      {
        week: 4,
        tournament: 'The Players Championship',
        matchups: [
          { home: '1', away: 'user-11', homeScore: null, awayScore: null, completed: false },
          { home: 'user-9', away: 'user-10', homeScore: null, awayScore: null, completed: false },
          { home: 'user-12', away: 'user-13', homeScore: null, awayScore: null, completed: false },
        ]
      },
    ],
    playoffs: null, // No playoffs yet
  }
}

// Roto category standings
const mockRotoCategories = {
  'league-3': {
    categories: ['wins', 'top10s', 'cuts_made', 'birdies', 'eagles', 'scoring_avg'],
    categoryLabels: {
      wins: 'Wins',
      top10s: 'Top 10s',
      cuts_made: 'Cuts Made',
      birdies: 'Total Birdies',
      eagles: 'Total Eagles',
      scoring_avg: 'Scoring Avg'
    },
    standings: [
      {
        userId: '1', name: 'Demo User', avatar: 'DU', totalRotoPoints: 42,
        categories: {
          wins: { value: 2, rank: 1, points: 6 },
          top10s: { value: 8, rank: 2, points: 5 },
          cuts_made: { value: 12, rank: 1, points: 6 },
          birdies: { value: 156, rank: 3, points: 4 },
          eagles: { value: 8, rank: 1, points: 6 },
          scoring_avg: { value: 69.8, rank: 1, points: 6 },
        }
      },
      {
        userId: 'user-14', name: 'Ben W.', avatar: 'BW', totalRotoPoints: 38,
        categories: {
          wins: { value: 1, rank: 2, points: 5 },
          top10s: { value: 9, rank: 1, points: 6 },
          cuts_made: { value: 11, rank: 2, points: 5 },
          birdies: { value: 162, rank: 2, points: 5 },
          eagles: { value: 6, rank: 2, points: 5 },
          scoring_avg: { value: 70.2, rank: 3, points: 4 },
        }
      },
      {
        userId: 'user-15', name: 'Amy G.', avatar: 'AG', totalRotoPoints: 35,
        categories: {
          wins: { value: 1, rank: 2, points: 5 },
          top10s: { value: 7, rank: 3, points: 4 },
          cuts_made: { value: 10, rank: 3, points: 4 },
          birdies: { value: 168, rank: 1, points: 6 },
          eagles: { value: 5, rank: 3, points: 4 },
          scoring_avg: { value: 70.1, rank: 2, points: 5 },
        }
      },
      {
        userId: 'user-16', name: 'Nick T.', avatar: 'NT', totalRotoPoints: 32,
        categories: {
          wins: { value: 0, rank: 4, points: 3 },
          top10s: { value: 6, rank: 4, points: 3 },
          cuts_made: { value: 10, rank: 3, points: 4 },
          birdies: { value: 145, rank: 4, points: 3 },
          eagles: { value: 4, rank: 4, points: 3 },
          scoring_avg: { value: 70.5, rank: 4, points: 3 },
        }
      },
      {
        userId: 'user-17', name: 'Sophie L.', avatar: 'SL', totalRotoPoints: 28,
        categories: {
          wins: { value: 0, rank: 4, points: 3 },
          top10s: { value: 5, rank: 5, points: 2 },
          cuts_made: { value: 9, rank: 5, points: 2 },
          birdies: { value: 138, rank: 5, points: 2 },
          eagles: { value: 3, rank: 5, points: 2 },
          scoring_avg: { value: 70.8, rank: 5, points: 2 },
        }
      },
      {
        userId: 'user-18', name: 'Dan R.', avatar: 'DR', totalRotoPoints: 25,
        categories: {
          wins: { value: 0, rank: 4, points: 3 },
          top10s: { value: 4, rank: 6, points: 1 },
          cuts_made: { value: 8, rank: 6, points: 1 },
          birdies: { value: 125, rank: 6, points: 1 },
          eagles: { value: 2, rank: 6, points: 1 },
          scoring_avg: { value: 71.2, rank: 6, points: 1 },
        }
      },
    ]
  }
}

// Survivor format data
const mockSurvivorData = {
  'league-4': {
    currentWeek: 4,
    eliminationsPerWeek: 1,
    buyBacksAllowed: true,
    maxBuyBacks: 1,
    eliminations: [
      { week: 2, userId: 'user-28', name: 'Dave M.', points: 45, usedBuyBack: false },
      { week: 3, userId: 'user-27', name: 'Laura T.', points: 52, usedBuyBack: false },
    ],
    buyBacks: [
      { week: 3, userId: 'user-26', name: 'Steve D.', cost: 0 }
    ],
    teamsAlive: 8,
    teamsEliminated: 2,
  }
}

// One-and-Done picks data
const mockOneAndDonePicks = {
  'league-5': {
    currentTournament: 'tourney-1',
    userPicks: {
      '1': {
        usedPlayers: ['player-8', 'player-15', 'player-23', 'player-32'],
        picks: [
          { tournamentId: 'tourney-past-3', playerId: 'player-8', playerName: 'Ludvig Aberg', tier: 1, multiplier: 1.0, points: 75, position: 'T5' },
          { tournamentId: 'tourney-past-2', playerId: 'player-15', playerName: 'Sahith Theegala', tier: 2, multiplier: 1.25, points: 94, position: 'T8' },
          { tournamentId: 'tourney-past-1', playerId: 'player-23', playerName: 'Tom Kim', tier: 3, multiplier: 1.5, points: 105, position: 'T12' },
          { tournamentId: 'tourney-3', playerId: 'player-32', playerName: 'Rickie Fowler', tier: 4, multiplier: 2.0, points: 110, position: 'T15' },
        ],
        currentPick: null,
      },
      'user-30': {
        usedPlayers: ['player-1', 'player-12', 'player-25', 'player-38'],
        picks: [
          { tournamentId: 'tourney-past-3', playerId: 'player-1', playerName: 'Scottie Scheffler', tier: 1, multiplier: 1.0, points: 100, position: '1st' },
          { tournamentId: 'tourney-past-2', playerId: 'player-12', playerName: 'Matt Fitzpatrick', tier: 2, multiplier: 1.25, points: 81, position: 'T10' },
          { tournamentId: 'tourney-past-1', playerId: 'player-25', playerName: 'Keegan Bradley', tier: 3, multiplier: 1.5, points: 98, position: 'T9' },
          { tournamentId: 'tourney-3', playerId: 'player-38', playerName: 'Nick Taylor', tier: 4, multiplier: 2.0, points: 130, position: 'T8' },
        ],
        currentPick: null,
      }
    },
    tiers: [
      { tier: 1, maxRank: 10, multiplier: 1.0, label: 'Elite (1-10)' },
      { tier: 2, maxRank: 30, multiplier: 1.25, label: 'Star (11-30)' },
      { tier: 3, maxRank: 60, multiplier: 1.5, label: 'Rising (31-60)' },
      { tier: 4, maxRank: null, multiplier: 2.0, label: 'Sleeper (61+)' },
    ],
  }
}

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
  { id: 'player-9', name: 'Wyndham Clark', rank: 9, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.52, sgOffTee: 0.65, sgApproach: 0.62, sgAroundGreen: 0.15, sgPutting: 0.10, drivingDistance: 310.5, drivingAccuracy: 59.8, gir: 67.5, scoringAvg: 70.3 }, recentForm: ['T5', 'T8', '1st', 'T20', 'T12'], owned: false },
  { id: 'player-10', name: 'Max Homa', rank: 10, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.48, sgOffTee: 0.52, sgApproach: 0.71, sgAroundGreen: 0.14, sgPutting: 0.11, drivingDistance: 302.8, drivingAccuracy: 63.2, gir: 69.1, scoringAvg: 70.2 }, recentForm: ['T9', '1st', 'T18', 'T7', 'T11'], owned: false },
  { id: 'player-11', name: 'Tommy Fleetwood', rank: 11, country: 'ENG', countryFlag: '🇬🇧', stats: { sgTotal: 1.45, sgOffTee: 0.48, sgApproach: 0.74, sgAroundGreen: 0.12, sgPutting: 0.11, drivingDistance: 299.4, drivingAccuracy: 64.8, gir: 70.2, scoringAvg: 70.1 }, recentForm: ['T7', 'T14', 'T6', 'T9', '2nd'], owned: false },
  { id: 'player-12', name: 'Matt Fitzpatrick', rank: 12, country: 'ENG', countryFlag: '🇬🇧', stats: { sgTotal: 1.42, sgOffTee: 0.22, sgApproach: 0.85, sgAroundGreen: 0.20, sgPutting: 0.15, drivingDistance: 289.2, drivingAccuracy: 68.5, gir: 71.8, scoringAvg: 70.0 }, recentForm: ['T12', 'T5', 'T11', '1st', 'T8'], owned: false },
  { id: 'player-13', name: 'Brian Harman', rank: 13, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.38, sgOffTee: 0.18, sgApproach: 0.65, sgAroundGreen: 0.25, sgPutting: 0.30, drivingDistance: 285.7, drivingAccuracy: 70.2, gir: 68.4, scoringAvg: 70.3 }, recentForm: ['1st', 'T22', 'T15', 'T10', 'T19'], owned: false },
  { id: 'player-14', name: 'Hideki Matsuyama', rank: 14, country: 'JPN', countryFlag: '🇯🇵', stats: { sgTotal: 1.35, sgOffTee: 0.42, sgApproach: 0.78, sgAroundGreen: 0.08, sgPutting: 0.07, drivingDistance: 303.1, drivingAccuracy: 62.1, gir: 71.5, scoringAvg: 70.2 }, recentForm: ['T8', 'T11', 'T4', 'T16', 'T7'], owned: false },
  { id: 'player-15', name: 'Sahith Theegala', rank: 15, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.32, sgOffTee: 0.55, sgApproach: 0.58, sgAroundGreen: 0.10, sgPutting: 0.09, drivingDistance: 308.2, drivingAccuracy: 60.5, gir: 68.7, scoringAvg: 70.4 }, recentForm: ['T6', 'T9', '2nd', 'T13', 'T5'], owned: false },
  { id: 'player-16', name: 'Tony Finau', rank: 16, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.28, sgOffTee: 0.62, sgApproach: 0.52, sgAroundGreen: 0.08, sgPutting: 0.06, drivingDistance: 315.4, drivingAccuracy: 57.8, gir: 67.9, scoringAvg: 70.5 }, recentForm: ['T11', '1st', 'T9', 'T21', 'T14'], owned: false },
  { id: 'player-17', name: 'Cameron Young', rank: 17, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.25, sgOffTee: 0.85, sgApproach: 0.48, sgAroundGreen: -0.02, sgPutting: -0.06, drivingDistance: 322.1, drivingAccuracy: 54.3, gir: 66.8, scoringAvg: 70.6 }, recentForm: ['2nd', 'T7', 'T12', 'T5', 'T18'], owned: false },
  { id: 'player-18', name: 'Sungjae Im', rank: 18, country: 'KOR', countryFlag: '🇰🇷', stats: { sgTotal: 1.22, sgOffTee: 0.38, sgApproach: 0.62, sgAroundGreen: 0.12, sgPutting: 0.10, drivingDistance: 298.9, drivingAccuracy: 65.2, gir: 70.4, scoringAvg: 70.3 }, recentForm: ['T10', 'T15', 'T8', 'T12', '1st'], owned: false },
  { id: 'player-19', name: 'Corey Conners', rank: 19, country: 'CAN', countryFlag: '🇨🇦', stats: { sgTotal: 1.18, sgOffTee: 0.35, sgApproach: 0.72, sgAroundGreen: 0.06, sgPutting: 0.05, drivingDistance: 300.5, drivingAccuracy: 66.8, gir: 73.2, scoringAvg: 70.2 }, recentForm: ['T14', 'T6', 'T10', 'T9', 'T7'], owned: false },
  { id: 'player-20', name: 'Russell Henley', rank: 20, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.15, sgOffTee: 0.25, sgApproach: 0.68, sgAroundGreen: 0.12, sgPutting: 0.10, drivingDistance: 294.7, drivingAccuracy: 68.9, gir: 71.1, scoringAvg: 70.4 }, recentForm: ['T8', 'T12', 'T5', 'T18', 'T11'], owned: false },
  { id: 'player-21', name: 'Shane Lowry', rank: 21, country: 'IRL', countryFlag: '🇮🇪', stats: { sgTotal: 1.12, sgOffTee: 0.28, sgApproach: 0.55, sgAroundGreen: 0.18, sgPutting: 0.11, drivingDistance: 295.2, drivingAccuracy: 64.5, gir: 68.8, scoringAvg: 70.5 }, recentForm: ['T9', '1st', 'T20', 'T7', 'T13'], owned: false },
  { id: 'player-22', name: 'Jordan Spieth', rank: 22, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 1.08, sgOffTee: 0.15, sgApproach: 0.58, sgAroundGreen: 0.22, sgPutting: 0.13, drivingDistance: 292.8, drivingAccuracy: 62.8, gir: 67.5, scoringAvg: 70.6 }, recentForm: ['T15', 'T8', 'T12', 'T6', 'T22'], owned: false },
  { id: 'player-23', name: 'Tom Kim', rank: 23, country: 'KOR', countryFlag: '🇰🇷', stats: { sgTotal: 1.05, sgOffTee: 0.42, sgApproach: 0.52, sgAroundGreen: 0.06, sgPutting: 0.05, drivingDistance: 301.4, drivingAccuracy: 63.5, gir: 69.2, scoringAvg: 70.5 }, recentForm: ['1st', 'T11', 'T7', 'T19', 'T9'], owned: false },
  { id: 'player-24', name: 'Sepp Straka', rank: 24, country: 'AUT', countryFlag: '🇦🇹', stats: { sgTotal: 1.02, sgOffTee: 0.48, sgApproach: 0.45, sgAroundGreen: 0.05, sgPutting: 0.04, drivingDistance: 306.8, drivingAccuracy: 61.2, gir: 68.5, scoringAvg: 70.6 }, recentForm: ['T7', 'T14', '1st', 'T11', 'T16'], owned: false },
  { id: 'player-25', name: 'Keegan Bradley', rank: 25, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.98, sgOffTee: 0.38, sgApproach: 0.48, sgAroundGreen: 0.08, sgPutting: 0.04, drivingDistance: 299.5, drivingAccuracy: 63.8, gir: 69.5, scoringAvg: 70.7 }, recentForm: ['T12', 'T5', 'T9', '1st', 'T15'], owned: false },
  { id: 'player-26', name: 'Justin Thomas', rank: 26, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.95, sgOffTee: 0.35, sgApproach: 0.52, sgAroundGreen: 0.05, sgPutting: 0.03, drivingDistance: 304.2, drivingAccuracy: 60.5, gir: 68.2, scoringAvg: 70.8 }, recentForm: ['T18', 'T9', 'T14', 'T8', 'T21'], owned: false },
  { id: 'player-27', name: 'Adam Scott', rank: 27, country: 'AUS', countryFlag: '🇦🇺', stats: { sgTotal: 0.92, sgOffTee: 0.45, sgApproach: 0.42, sgAroundGreen: 0.03, sgPutting: 0.02, drivingDistance: 302.1, drivingAccuracy: 62.4, gir: 68.8, scoringAvg: 70.7 }, recentForm: ['T10', 'T16', 'T8', 'T12', 'T9'], owned: false },
  { id: 'player-28', name: 'Si Woo Kim', rank: 28, country: 'KOR', countryFlag: '🇰🇷', stats: { sgTotal: 0.88, sgOffTee: 0.32, sgApproach: 0.48, sgAroundGreen: 0.05, sgPutting: 0.03, drivingDistance: 297.8, drivingAccuracy: 64.2, gir: 69.1, scoringAvg: 70.8 }, recentForm: ['1st', 'T22', 'T11', 'T15', 'T8'], owned: false },
  { id: 'player-29', name: 'Tyrrell Hatton', rank: 29, country: 'ENG', countryFlag: '🇬🇧', stats: { sgTotal: 0.85, sgOffTee: 0.28, sgApproach: 0.45, sgAroundGreen: 0.08, sgPutting: 0.04, drivingDistance: 296.5, drivingAccuracy: 65.1, gir: 68.7, scoringAvg: 70.9 }, recentForm: ['T14', 'T7', 'T19', 'T10', 'T12'], owned: false },
  { id: 'player-30', name: 'Jason Day', rank: 30, country: 'AUS', countryFlag: '🇦🇺', stats: { sgTotal: 0.82, sgOffTee: 0.42, sgApproach: 0.35, sgAroundGreen: 0.03, sgPutting: 0.02, drivingDistance: 305.8, drivingAccuracy: 59.8, gir: 67.5, scoringAvg: 71.0 }, recentForm: ['1st', 'T15', 'T12', 'T24', 'T18'], owned: false },
  { id: 'player-31', name: 'Denny McCarthy', rank: 31, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.78, sgOffTee: -0.05, sgApproach: 0.32, sgAroundGreen: 0.18, sgPutting: 0.33, drivingDistance: 284.2, drivingAccuracy: 70.5, gir: 66.8, scoringAvg: 70.9 }, recentForm: ['T8', 'T11', 'T6', 'T17', 'T10'], owned: false },
  { id: 'player-32', name: 'Rickie Fowler', rank: 32, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.75, sgOffTee: 0.25, sgApproach: 0.38, sgAroundGreen: 0.08, sgPutting: 0.04, drivingDistance: 298.4, drivingAccuracy: 63.2, gir: 68.5, scoringAvg: 71.0 }, recentForm: ['T11', '2nd', 'T18', 'T9', 'T14'], owned: false },
  { id: 'player-33', name: 'Cameron Smith', rank: 33, country: 'AUS', countryFlag: '🇦🇺', stats: { sgTotal: 0.72, sgOffTee: 0.18, sgApproach: 0.25, sgAroundGreen: 0.12, sgPutting: 0.17, drivingDistance: 293.5, drivingAccuracy: 62.8, gir: 67.2, scoringAvg: 71.1 }, recentForm: ['T15', 'T8', '1st', 'T20', 'T12'], owned: false },
  { id: 'player-34', name: 'Brooks Koepka', rank: 34, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.68, sgOffTee: 0.52, sgApproach: 0.28, sgAroundGreen: -0.05, sgPutting: -0.07, drivingDistance: 315.2, drivingAccuracy: 56.5, gir: 66.8, scoringAvg: 71.2 }, recentForm: ['T9', 'T14', '1st', 'T18', 'T25'], owned: false },
  { id: 'player-35', name: 'Min Woo Lee', rank: 35, country: 'AUS', countryFlag: '🇦🇺', stats: { sgTotal: 0.65, sgOffTee: 0.48, sgApproach: 0.22, sgAroundGreen: -0.02, sgPutting: -0.03, drivingDistance: 311.8, drivingAccuracy: 58.2, gir: 67.5, scoringAvg: 71.1 }, recentForm: ['T12', 'T6', 'T15', 'T8', 'T19'], owned: false },
  { id: 'player-36', name: 'Taylor Moore', rank: 36, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.62, sgOffTee: 0.35, sgApproach: 0.28, sgAroundGreen: 0.02, sgPutting: -0.03, drivingDistance: 304.5, drivingAccuracy: 61.8, gir: 68.2, scoringAvg: 71.2 }, recentForm: ['1st', 'T17', 'T11', 'T22', 'T9'], owned: false },
  { id: 'player-37', name: 'Billy Horschel', rank: 37, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.58, sgOffTee: 0.22, sgApproach: 0.32, sgAroundGreen: 0.02, sgPutting: 0.02, drivingDistance: 297.2, drivingAccuracy: 65.5, gir: 68.8, scoringAvg: 71.1 }, recentForm: ['T14', 'T9', 'T7', 'T19', 'T11'], owned: false },
  { id: 'player-38', name: 'Nick Taylor', rank: 38, country: 'CAN', countryFlag: '🇨🇦', stats: { sgTotal: 0.55, sgOffTee: 0.18, sgApproach: 0.35, sgAroundGreen: 0.00, sgPutting: 0.02, drivingDistance: 295.8, drivingAccuracy: 66.2, gir: 69.5, scoringAvg: 71.2 }, recentForm: ['1st', 'T12', 'T18', 'T8', 'T15'], owned: false },
  { id: 'player-39', name: 'Akshay Bhatia', rank: 39, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.52, sgOffTee: 0.32, sgApproach: 0.22, sgAroundGreen: -0.02, sgPutting: 0.00, drivingDistance: 306.2, drivingAccuracy: 60.5, gir: 67.8, scoringAvg: 71.3 }, recentForm: ['T10', '1st', 'T14', 'T21', 'T8'], owned: false },
  { id: 'player-40', name: 'Sam Burns', rank: 40, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.48, sgOffTee: 0.28, sgApproach: 0.25, sgAroundGreen: -0.02, sgPutting: -0.03, drivingDistance: 302.5, drivingAccuracy: 62.8, gir: 68.5, scoringAvg: 71.3 }, recentForm: ['T16', 'T10', 'T8', 'T14', '1st'], owned: false },
  { id: 'player-41', name: 'Chris Kirk', rank: 41, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.45, sgOffTee: 0.15, sgApproach: 0.28, sgAroundGreen: 0.00, sgPutting: 0.02, drivingDistance: 294.8, drivingAccuracy: 67.2, gir: 69.2, scoringAvg: 71.2 }, recentForm: ['1st', 'T15', 'T12', 'T9', 'T18'], owned: false },
  { id: 'player-42', name: 'Harris English', rank: 42, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.42, sgOffTee: 0.25, sgApproach: 0.18, sgAroundGreen: 0.00, sgPutting: -0.01, drivingDistance: 300.2, drivingAccuracy: 63.5, gir: 68.2, scoringAvg: 71.4 }, recentForm: ['T12', 'T8', 'T17', 'T11', 'T14'], owned: false },
  { id: 'player-43', name: 'Mackenzie Hughes', rank: 43, country: 'CAN', countryFlag: '🇨🇦', stats: { sgTotal: 0.38, sgOffTee: 0.08, sgApproach: 0.28, sgAroundGreen: 0.00, sgPutting: 0.02, drivingDistance: 291.5, drivingAccuracy: 68.5, gir: 69.8, scoringAvg: 71.3 }, recentForm: ['T9', 'T14', 'T6', 'T20', 'T11'], owned: false },
  { id: 'player-44', name: 'Kurt Kitayama', rank: 44, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.35, sgOffTee: 0.42, sgApproach: 0.12, sgAroundGreen: -0.08, sgPutting: -0.11, drivingDistance: 310.5, drivingAccuracy: 57.2, gir: 66.5, scoringAvg: 71.5 }, recentForm: ['1st', 'T19', 'T10', 'T16', 'T22'], owned: false },
  { id: 'player-45', name: 'Adam Hadwin', rank: 45, country: 'CAN', countryFlag: '🇨🇦', stats: { sgTotal: 0.32, sgOffTee: 0.12, sgApproach: 0.22, sgAroundGreen: -0.02, sgPutting: 0.00, drivingDistance: 293.2, drivingAccuracy: 66.8, gir: 68.5, scoringAvg: 71.4 }, recentForm: ['T11', 'T7', 'T15', 'T12', 'T9'], owned: false },
  { id: 'player-46', name: 'Davis Riley', rank: 46, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.28, sgOffTee: 0.35, sgApproach: 0.08, sgAroundGreen: -0.05, sgPutting: -0.10, drivingDistance: 307.8, drivingAccuracy: 59.5, gir: 67.2, scoringAvg: 71.5 }, recentForm: ['T14', 'T10', 'T18', 'T8', 'T16'], owned: false },
  { id: 'player-47', name: 'Erik van Rooyen', rank: 47, country: 'RSA', countryFlag: '🇿🇦', stats: { sgTotal: 0.25, sgOffTee: 0.28, sgApproach: 0.12, sgAroundGreen: -0.05, sgPutting: -0.10, drivingDistance: 305.2, drivingAccuracy: 60.8, gir: 67.5, scoringAvg: 71.6 }, recentForm: ['T10', 'T15', 'T9', 'T21', 'T12'], owned: false },
  { id: 'player-48', name: 'Lucas Glover', rank: 48, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.22, sgOffTee: 0.18, sgApproach: 0.15, sgAroundGreen: -0.05, sgPutting: -0.06, drivingDistance: 298.5, drivingAccuracy: 64.2, gir: 68.8, scoringAvg: 71.5 }, recentForm: ['1st', '1st', 'T20', 'T14', 'T18'], owned: false },
  { id: 'player-49', name: 'J.T. Poston', rank: 49, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.18, sgOffTee: 0.05, sgApproach: 0.18, sgAroundGreen: -0.02, sgPutting: -0.03, drivingDistance: 292.8, drivingAccuracy: 67.5, gir: 69.2, scoringAvg: 71.5 }, recentForm: ['T12', 'T8', 'T14', 'T10', 'T17'], owned: false },
  { id: 'player-50', name: 'Andrew Putnam', rank: 50, country: 'USA', countryFlag: '🇺🇸', stats: { sgTotal: 0.15, sgOffTee: 0.08, sgApproach: 0.12, sgAroundGreen: -0.02, sgPutting: -0.03, drivingDistance: 294.5, drivingAccuracy: 66.2, gir: 68.5, scoringAvg: 71.6 }, recentForm: ['T15', 'T11', 'T9', 'T18', 'T13'], owned: false },
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

// Mock news data
const mockNews = [
  {
    id: 'news-1',
    type: 'injury',
    priority: 'high',
    playerId: 'player-6',
    playerName: 'Xander Schauffele',
    playerFlag: '🇺🇸',
    headline: 'Xander Schauffele withdraws from The Players Championship',
    summary: 'Schauffele has withdrawn citing a back injury. He is expected to miss 2-3 weeks.',
    impact: 'negative',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: 'PGA Tour',
  },
  {
    id: 'news-2',
    type: 'trending',
    priority: 'medium',
    playerId: 'player-8',
    playerName: 'Ludvig Aberg',
    playerFlag: '🇸🇪',
    headline: 'Ludvig Aberg surges in ownership after Masters runner-up',
    summary: 'Add percentage up 45% this week. Rostered in 67% of leagues.',
    impact: 'positive',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    source: 'Clutch HQ',
  },
  {
    id: 'news-3',
    type: 'withdrawal',
    priority: 'high',
    playerId: 'player-26',
    playerName: 'Justin Thomas',
    playerFlag: '🇺🇸',
    headline: 'Justin Thomas WD from upcoming tournament',
    summary: 'Thomas has withdrawn to rest ahead of major championship season.',
    impact: 'negative',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    source: 'PGA Tour',
  },
  {
    id: 'news-4',
    type: 'hot',
    priority: 'medium',
    playerId: 'player-1',
    playerName: 'Scottie Scheffler',
    playerFlag: '🇺🇸',
    headline: 'Scottie Scheffler leads strokes gained this season',
    summary: 'World #1 averaging +2.45 SG Total, the highest mark in 5 years.',
    impact: 'positive',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    source: 'DataGolf',
  },
  {
    id: 'news-5',
    type: 'injury',
    priority: 'low',
    playerId: 'player-22',
    playerName: 'Jordan Spieth',
    playerFlag: '🇺🇸',
    headline: 'Jordan Spieth dealing with wrist discomfort',
    summary: 'Spieth mentioned minor wrist issues but plans to play through.',
    impact: 'neutral',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    source: 'Golf Channel',
  },
  {
    id: 'news-6',
    type: 'cold',
    priority: 'medium',
    playerId: 'player-34',
    playerName: 'Brooks Koepka',
    playerFlag: '🇺🇸',
    headline: 'Brooks Koepka struggles continue',
    summary: 'Missed cut in 3 of last 5 events. Consider benching.',
    impact: 'negative',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    source: 'Clutch HQ',
  },
  {
    id: 'news-7',
    type: 'course-fit',
    priority: 'medium',
    playerId: 'player-3',
    playerName: 'Jon Rahm',
    playerFlag: '🇪🇸',
    headline: 'Jon Rahm historically dominates at TPC Sawgrass',
    summary: '3 top-5 finishes in last 4 appearances. Course suits his game.',
    impact: 'positive',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source: 'Course Fit Analysis',
  },
  {
    id: 'news-8',
    type: 'roster-alert',
    priority: 'high',
    playerId: null,
    playerName: null,
    playerFlag: null,
    headline: 'Lineup deadline in 2 hours!',
    summary: 'The Players Championship lineups lock at 7:00 AM ET Thursday.',
    impact: 'neutral',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    source: 'System',
  },
  {
    id: 'news-9',
    type: 'trending',
    priority: 'low',
    playerId: 'player-15',
    playerName: 'Sahith Theegala',
    playerFlag: '🇺🇸',
    headline: 'Sahith Theegala generating buzz as sleeper pick',
    summary: 'Strong recent form and favorable course history. Under-owned.',
    impact: 'positive',
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    source: 'Clutch HQ',
  },
  {
    id: 'news-10',
    type: 'hot',
    priority: 'medium',
    playerId: 'player-2',
    playerName: 'Rory McIlroy',
    playerFlag: '🇬🇧',
    headline: 'Rory McIlroy putting improvement paying dividends',
    summary: 'Up to +0.35 SG Putting over last 8 rounds, a career-best stretch.',
    impact: 'positive',
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    source: 'DataGolf',
  },
]

// Mock roster data
const mockRoster = [
  { ...mockPlayers[0], isActive: true, status: 'active' },
  { ...mockPlayers[1], isActive: true, status: 'active' },
  { ...mockPlayers[2], isActive: true, status: 'questionable' },
  { ...mockPlayers[3], isActive: true, status: 'active' },
  { ...mockPlayers[4], isActive: false, status: 'active' },
  { ...mockPlayers[5], isActive: false, status: 'injured' },
]

const mockPendingTrades = [
  {
    id: 'trade-1',
    isIncoming: true,
    otherTeamName: 'Mike S.',
    playersOffered: [{ id: 'player-7', name: 'Collin Morikawa', countryFlag: '🇺🇸' }],
    playersRequested: [{ id: 'player-5', name: 'Patrick Cantlay', countryFlag: '🇺🇸' }],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Mock chat messages per league
const mockChatMessages = {
  'league-1': [
    {
      id: 'msg-1',
      type: 'system',
      content: 'League "Weekend Warriors" was created',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-2',
      type: 'system',
      content: 'Draft completed! Good luck everyone!',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-3',
      type: 'message',
      userId: 'user-2',
      userName: 'Mike S.',
      userAvatar: 'MS',
      content: 'Great draft everyone! Excited for the season.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-4',
      type: 'message',
      userId: '1',
      userName: 'Demo User',
      userAvatar: 'DU',
      content: 'Same here! I think I got a solid team this year.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'msg-5',
      type: 'message',
      userId: 'user-3',
      userName: 'Sarah K.',
      userAvatar: 'SK',
      content: 'Anyone watching The Players this weekend?',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-6',
      type: 'activity',
      activityType: 'trade',
      content: 'Mike S. traded Collin Morikawa to Sarah K. for Tommy Fleetwood',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-7',
      type: 'message',
      userId: 'user-4',
      userName: 'James T.',
      userAvatar: 'JT',
      content: 'Wow that trade is interesting. Sarah might have won that one.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'msg-8',
      type: 'message',
      userId: 'user-2',
      userName: 'Mike S.',
      userAvatar: 'MS',
      content: 'We\'ll see about that! Morikawa has been struggling with his putter lately.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'msg-9',
      type: 'activity',
      activityType: 'waiver',
      content: 'Demo User picked up Ludvig Aberg from waivers',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-10',
      type: 'message',
      userId: 'user-5',
      userName: 'Emma W.',
      userAvatar: 'EW',
      content: 'Nice pickup! Aberg has been on fire lately 🔥',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'msg-11',
      type: 'message',
      userId: '1',
      userName: 'Demo User',
      userAvatar: 'DU',
      content: 'Thanks! I had my eye on him for a while. His ball striking is elite.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'msg-12',
      type: 'message',
      userId: 'user-6',
      userName: 'Chris L.',
      userAvatar: 'CL',
      content: 'Anyone want to make a trade? Looking to move Cantlay.',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-13',
      type: 'message',
      userId: 'user-3',
      userName: 'Sarah K.',
      userAvatar: 'SK',
      content: '@Chris L. I might be interested. What are you looking for?',
      timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-14',
      type: 'activity',
      activityType: 'lineup',
      content: 'Lineup deadline for The Players Championship is in 2 hours!',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-15',
      type: 'message',
      userId: 'user-7',
      userName: 'Alex R.',
      userAvatar: 'AR',
      content: 'Thanks for the reminder! Almost forgot to set my lineup.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'league-2': [
    {
      id: 'msg-201',
      type: 'system',
      content: 'League "Office Masters League" was created',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-202',
      type: 'message',
      userId: 'user-9',
      userName: 'Rachel M.',
      userAvatar: 'RM',
      content: 'Welcome everyone to the Office Masters League!',
      timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-203',
      type: 'message',
      userId: 'user-10',
      userName: 'David H.',
      userAvatar: 'DH',
      content: 'This is going to be fun. Good luck to all!',
      timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'league-3': [
    {
      id: 'msg-301',
      type: 'system',
      content: 'League "Golf Buddies 2024" was created',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-302',
      type: 'message',
      userId: '1',
      userName: 'Demo User',
      userAvatar: 'DU',
      content: 'Hey everyone! Glad we could get the gang together for some fantasy golf.',
      timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

// Get/save chat messages from localStorage for persistence
const getChatMessages = (leagueId) => {
  const key = `mockChat_${leagueId}`
  const stored = localStorage.getItem(key)
  if (stored) {
    return JSON.parse(stored)
  }
  // Initialize with mock data if exists
  return mockChatMessages[leagueId] || []
}

const saveChatMessages = (leagueId, messages) => {
  const key = `mockChat_${leagueId}`
  localStorage.setItem(key, JSON.stringify(messages))
}

// Mock draft data
const mockDraftState = {
  id: 'draft-1',
  leagueId: 'league-1',
  type: 'snake',
  status: 'active',
  currentRound: 1,
  currentPick: 3,
  timerSeconds: 90,
  teams: [
    { id: 'team-1', name: 'Demo User', isUser: true, budget: 100 },
    { id: 'team-2', name: 'Mike S.', isUser: false, budget: 100 },
    { id: 'team-3', name: 'Sarah K.', isUser: false, budget: 100 },
    { id: 'team-4', name: 'James T.', isUser: false, budget: 100 },
    { id: 'team-5', name: 'Emma W.', isUser: false, budget: 100 },
    { id: 'team-6', name: 'Chris L.', isUser: false, budget: 100 },
    { id: 'team-7', name: 'Alex R.', isUser: false, budget: 100 },
    { id: 'team-8', name: 'Jordan P.', isUser: false, budget: 100 },
  ],
  picks: [
    { id: 'pick-1', pickNumber: 1, round: 1, roundPick: 1, teamId: 'team-1', teamName: 'Demo User', playerId: 'player-1', playerName: 'Scottie Scheffler', playerFlag: '🇺🇸', playerRank: 1 },
    { id: 'pick-2', pickNumber: 2, round: 1, roundPick: 2, teamId: 'team-2', teamName: 'Mike S.', playerId: 'player-2', playerName: 'Rory McIlroy', playerFlag: '🇬🇧', playerRank: 2 },
  ],
  draftOrder: ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6', 'team-7', 'team-8'],
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
      // Generate a 6-character join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const newLeague = {
        id: `league-${Date.now()}`,
        name: leagueData.name,
        draftType: leagueData.draftType || 'snake',
        format: leagueData.format || 'full-league',
        joinCode,
        memberCount: 1,
        maxMembers: leagueData.maxMembers || 10,
        status: leagueData.format === 'one-and-done' ? 'active' : 'draft-pending',
        currentWeek: 1,
        userRank: 1,
        userPoints: 0,
        createdAt: new Date().toISOString(),
        settings: {
          rosterSize: leagueData.format === 'one-and-done' ? 1 : (leagueData.rosterSize || 6),
          scoringType: leagueData.scoringType || 'standard',
          budget: leagueData.budget,
          formatSettings: leagueData.formatSettings || {},
        },
        standings: [],
      }
      mockLeagues.push(newLeague)
      return newLeague
    },

    async validateCode(code) {
      await delay(600)
      // Mock validation - check for test codes
      const testLeagues = {
        'ABC123': {
          id: 'league-test',
          name: 'Test League',
          type: 'snake',
          commissioner: 'John D.',
          memberCount: 4,
          maxMembers: 10,
          scoringType: 'standard',
          rosterSize: 6,
        },
        'XYZ789': {
          id: 'league-test-2',
          name: 'Auction Masters',
          type: 'auction',
          commissioner: 'Sarah M.',
          memberCount: 8,
          maxMembers: 8,
          scoringType: 'strokes-gained',
          rosterSize: 8,
        },
      }

      const league = testLeagues[code.toUpperCase()]
      if (!league) {
        throw new Error('Invalid league code. Please check and try again.')
      }
      return league
    },

    async join(code) {
      await delay(600)
      // Check if league exists and has space
      const league = await this.validateCode(code)
      if (league.memberCount >= league.maxMembers) {
        throw new Error('This league is full')
      }
      // In a real app, this would add the user to the league
      return {
        ...league,
        memberCount: league.memberCount + 1,
        joined: true,
      }
    },

    async getStandings(leagueId) {
      await delay(500)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league) {
        throw new Error('League not found')
      }

      // Generate standings data from league standings
      const standings = (league.standings || []).map((team, index) => ({
        id: `team-${index}`,
        userId: team.userId,
        name: team.name || `Team ${index + 1}`,
        ownerName: team.name,
        avatar: team.avatar || '⛳',
        rank: index + 1,
        wins: Math.floor(Math.random() * 5) + 1,
        losses: Math.floor(Math.random() * 4),
        ties: Math.floor(Math.random() * 2),
        totalPoints: team.points || 0,
        avgPoints: team.points ? team.points / 4 : 0,
        trend: Math.floor(Math.random() * 5) - 2, // -2 to +2
      }))

      // Generate weekly results (past tournaments)
      const weeklyResults = [
        {
          tournamentId: 'tourney-3',
          tournamentName: 'Arnold Palmer Invitational',
          dates: 'Mar 7-10',
          status: 'completed',
          results: standings.map((team, idx) => ({
            teamId: team.id,
            userId: team.userId,
            teamName: team.name,
            points: Math.floor(Math.random() * 100) + 50,
          })).sort((a, b) => b.points - a.points),
        },
        {
          tournamentId: 'tourney-past-1',
          tournamentName: 'Genesis Invitational',
          dates: 'Feb 15-18',
          status: 'completed',
          results: standings.map((team, idx) => ({
            teamId: team.id,
            userId: team.userId,
            teamName: team.name,
            points: Math.floor(Math.random() * 100) + 50,
          })).sort((a, b) => b.points - a.points),
        },
        {
          tournamentId: 'tourney-past-2',
          tournamentName: 'WM Phoenix Open',
          dates: 'Feb 8-11',
          status: 'completed',
          results: standings.map((team, idx) => ({
            teamId: team.id,
            userId: team.userId,
            teamName: team.name,
            points: Math.floor(Math.random() * 100) + 50,
          })).sort((a, b) => b.points - a.points),
        },
        {
          tournamentId: 'tourney-past-3',
          tournamentName: 'AT&T Pebble Beach',
          dates: 'Feb 1-4',
          status: 'completed',
          results: standings.map((team, idx) => ({
            teamId: team.id,
            userId: team.userId,
            teamName: team.name,
            points: Math.floor(Math.random() * 100) + 50,
          })).sort((a, b) => b.points - a.points),
        },
      ]

      return { standings, weeklyResults }
    },
  },

  // Matchups endpoints (Head-to-Head format)
  matchups: {
    async getSchedule(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league || league.format !== 'head-to-head') {
        throw new Error('League not found or not a head-to-head league')
      }
      return mockMatchups[leagueId] || { schedule: [], playoffs: null }
    },

    async getCurrentWeek(leagueId) {
      await delay(300)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league) throw new Error('League not found')

      const matchupData = mockMatchups[leagueId]
      if (!matchupData) return null

      const currentWeek = league.currentWeek || 1
      const weekData = matchupData.schedule.find(w => w.week === currentWeek)
      return weekData || null
    },

    async getPlayoffBracket(leagueId) {
      await delay(400)
      const matchupData = mockMatchups[leagueId]
      return matchupData?.playoffs || null
    },
  },

  // Roto endpoints
  roto: {
    async getCategories(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league || league.format !== 'roto') {
        throw new Error('League not found or not a roto league')
      }
      return mockRotoCategories[leagueId] || null
    },

    async getCategoryStandings(leagueId) {
      await delay(500)
      const rotoData = mockRotoCategories[leagueId]
      if (!rotoData) throw new Error('Roto data not found')
      return rotoData.standings
    },
  },

  // Survivor endpoints
  survivor: {
    async getStatus(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league || league.format !== 'survivor') {
        throw new Error('League not found or not a survivor league')
      }
      return mockSurvivorData[leagueId] || null
    },

    async useBuyBack(leagueId, userId) {
      await delay(600)
      // Mock buy-back logic
      const survivorData = mockSurvivorData[leagueId]
      if (!survivorData) throw new Error('Survivor data not found')

      // Check if user is eliminated and has buy-back available
      const league = mockLeagues.find(l => l.id === leagueId)
      const userStanding = league?.standings?.find(s => s.userId === userId)

      if (!userStanding || userStanding.status !== 'eliminated') {
        throw new Error('User not eligible for buy-back')
      }

      return { success: true, message: 'Buy-back successful!' }
    },
  },

  // One-and-Done endpoints
  oneAndDone: {
    async getPicks(leagueId, userId) {
      await delay(400)
      const oadData = mockOneAndDonePicks[leagueId]
      if (!oadData) throw new Error('One-and-Done data not found')

      return {
        userPicks: oadData.userPicks[userId] || { usedPlayers: [], picks: [], currentPick: null },
        tiers: oadData.tiers,
        currentTournament: oadData.currentTournament,
      }
    },

    async makePick(leagueId, userId, playerId, tournamentId) {
      await delay(600)
      const oadData = mockOneAndDonePicks[leagueId]
      if (!oadData) throw new Error('One-and-Done data not found')

      const userPicks = oadData.userPicks[userId]
      if (userPicks?.usedPlayers?.includes(playerId)) {
        throw new Error('You have already used this player')
      }

      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) throw new Error('Player not found')

      // Determine tier based on rank
      const tier = oadData.tiers.find(t =>
        t.maxRank === null || player.rank <= t.maxRank
      )

      return {
        success: true,
        pick: {
          tournamentId,
          playerId,
          playerName: player.name,
          tier: tier?.tier || 4,
          multiplier: tier?.multiplier || 2.0,
        }
      }
    },

    async getLeaderboard(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league || league.format !== 'one-and-done') {
        throw new Error('League not found or not a one-and-done league')
      }
      return league.standings || []
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

    async getById(tournamentId) {
      await delay(300)
      return mockTournaments.find(t => t.id === tournamentId) || null
    },

    async getScoring(tournamentId, leagueId = null) {
      await delay(400)
      const tournament = mockTournaments.find(t => t.id === tournamentId) || mockTournaments[0]

      // Generate leaderboard from players with tournament status
      const playersInTournament = mockPlayers
        .filter(p => p.tournamentStatus)
        .map(p => ({
          ...p,
          ...p.tournamentStatus,
          today: Math.floor(Math.random() * 5) - 2, // Random today score
          holes: generateHoleScores(),
        }))
        .sort((a, b) => {
          const aScore = parseInt(a.score) || 0
          const bScore = parseInt(b.score) || 0
          return aScore - bScore
        })

      // My players (owned players with tournament status)
      const myPlayers = mockPlayers
        .filter(p => p.owned && p.tournamentStatus)
        .map(p => {
          const leaderboardEntry = playersInTournament.find(lp => lp.id === p.id)
          return {
            ...p,
            ...p.tournamentStatus,
            today: leaderboardEntry?.today || 0,
            holes: leaderboardEntry?.holes || generateHoleScores(),
            fantasyPoints: calculateFantasyPoints(p.tournamentStatus),
          }
        })

      return {
        tournament: {
          ...tournament,
          status: 'in-progress',
          currentRound: 2,
          cut: -2,
        },
        leaderboard: playersInTournament,
        myPlayers,
      }
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

    async getAll(params = {}) {
      await delay(400)
      return {
        players: mockPlayers,
        total: mockPlayers.length,
      }
    },

    async compare(playerIds) {
      await delay(300)
      const players = mockPlayers.filter(p => playerIds.includes(p.id))
      return players
    },

    async getProfile(playerId) {
      await delay(400)
      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) {
        throw new Error('Player not found')
      }

      // Generate course history
      const courses = [
        { name: 'TPC Sawgrass', par: 72 },
        { name: 'Augusta National', par: 72 },
        { name: 'Pebble Beach', par: 72 },
        { name: 'St Andrews', par: 72 },
        { name: 'Torrey Pines', par: 72 },
      ]

      const courseHistory = courses.map(course => ({
        ...course,
        rounds: Math.floor(Math.random() * 20) + 4,
        avgScore: course.par + (Math.random() * 4 - 2),
        bestFinish: ['1st', 'T2', 'T3', 'T5', 'T8', 'T12'][Math.floor(Math.random() * 6)],
        wins: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
      }))

      // Generate tournament history
      const tournamentNames = [
        'The Players Championship',
        'Arnold Palmer Invitational',
        'Genesis Invitational',
        'WM Phoenix Open',
        'AT&T Pebble Beach',
        'Farmers Insurance Open',
        'The American Express',
        'Sony Open',
      ]

      const tournamentHistory = tournamentNames.map((name, i) => ({
        name,
        position: player.recentForm?.[i % player.recentForm.length] || 'T25',
        score: Math.floor(Math.random() * 16) - 12,
        earnings: `$${(Math.random() * 2000000 + 100000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
      }))

      return {
        player,
        courseHistory,
        tournamentHistory,
      }
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

  // Draft endpoints
  draft: {
    async getState(leagueId) {
      await delay(600)
      const league = mockLeagues.find(l => l.id === leagueId)
      if (!league) {
        throw new Error('League not found')
      }

      // Mark already drafted players
      const draftedIds = mockDraftState.picks.map(p => p.playerId)
      const players = mockPlayers.map(p => ({
        ...p,
        drafted: draftedIds.includes(p.id),
        draftedBy: mockDraftState.picks.find(pick => pick.playerId === p.id)?.teamId,
      }))

      // Determine current pick info
      const currentPickIndex = mockDraftState.picks.length
      const rosterSize = league.settings?.rosterSize || 6
      const totalTeams = mockDraftState.teams.length
      const currentRound = Math.floor(currentPickIndex / totalTeams) + 1
      const isReverseRound = currentRound % 2 === 0
      const pickInRound = currentPickIndex % totalTeams
      const orderIndex = isReverseRound ? totalTeams - 1 - pickInRound : pickInRound
      const currentTeamId = mockDraftState.draftOrder[orderIndex]
      const currentTeam = mockDraftState.teams.find(t => t.id === currentTeamId)

      return {
        draft: {
          ...mockDraftState,
          type: league.type,
        },
        league,
        players,
        picks: mockDraftState.picks,
        queue: [],
        currentPick: {
          round: currentRound,
          pick: currentPickIndex + 1,
          teamId: currentTeamId,
          teamName: currentTeam?.name,
        },
        currentBid: null,
        userBudget: league.settings?.budget || 100,
        timerSeconds: 90,
        isUserTurn: currentTeamId === 'team-1',
        isPaused: mockDraftState.status === 'paused',
      }
    },

    async makePick(draftId, playerId) {
      await delay(400)
      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) throw new Error('Player not found')
      if (player.drafted) throw new Error('Player already drafted')

      const pickNumber = mockDraftState.picks.length + 1
      const totalTeams = mockDraftState.teams.length
      const round = Math.floor((pickNumber - 1) / totalTeams) + 1
      const roundPick = ((pickNumber - 1) % totalTeams) + 1

      const pick = {
        id: `pick-${pickNumber}`,
        pickNumber,
        round,
        roundPick,
        teamId: 'team-1',
        teamName: 'Demo User',
        playerId: player.id,
        playerName: player.name,
        playerFlag: player.countryFlag,
        playerRank: player.rank,
      }

      mockDraftState.picks.push(pick)
      return pick
    },

    async nominatePlayer(draftId, playerId, startingBid) {
      await delay(400)
      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) throw new Error('Player not found')

      return {
        id: `bid-${Date.now()}`,
        player,
        nominatedBy: 'Demo User',
        amount: startingBid,
        highBidder: 'Demo User',
        timerSeconds: 15,
      }
    },

    async placeBid(draftId, amount) {
      await delay(200)
      return {
        amount,
        highBidder: 'You',
        timerSeconds: 15,
      }
    },

    async addToQueue(draftId, playerId) {
      await delay(100)
      return { success: true }
    },

    async removeFromQueue(draftId, playerId) {
      await delay(100)
      return { success: true }
    },

    async reorderQueue(draftId, playerIds) {
      await delay(100)
      return { success: true }
    },

    async startDraft(draftId) {
      await delay(300)
      mockDraftState.status = 'active'
      return { success: true }
    },

    async pauseDraft(draftId) {
      await delay(300)
      mockDraftState.status = 'paused'
      return { success: true }
    },
  },

  // Roster endpoints
  roster: {
    async getRoster(leagueId) {
      await delay(500)
      return mockRoster
    },

    async setLineup(leagueId, tournamentId, playerIds) {
      await delay(400)
      // Update active status in mock roster
      mockRoster.forEach(p => {
        p.isActive = playerIds.includes(p.id)
      })
      return { success: true, activePlayerIds: playerIds }
    },

    async dropPlayer(leagueId, playerId) {
      await delay(400)
      const index = mockRoster.findIndex(p => p.id === playerId)
      if (index === -1) throw new Error('Player not found on roster')
      mockRoster.splice(index, 1)
      return { success: true }
    },
  },

  // Waiver endpoints
  waivers: {
    async getAvailable(leagueId) {
      await delay(500)
      // Return players not on roster
      const rosterIds = mockRoster.map(p => p.id)
      return mockPlayers.filter(p => !rosterIds.includes(p.id))
    },

    async claimPlayer(leagueId, playerId, dropPlayerId) {
      await delay(600)
      const player = mockPlayers.find(p => p.id === playerId)
      if (!player) throw new Error('Player not found')

      // If dropping a player, remove them
      if (dropPlayerId) {
        const dropIndex = mockRoster.findIndex(p => p.id === dropPlayerId)
        if (dropIndex !== -1) {
          mockRoster.splice(dropIndex, 1)
        }
      }

      // Add new player to roster
      mockRoster.push({ ...player, isActive: false, status: 'active' })

      return { success: true, player }
    },
  },

  // Trade endpoints
  trades: {
    async getAll(leagueId) {
      await delay(400)
      const league = mockLeagues.find(l => l.id === leagueId)

      // Generate league members with rosters
      const members = (league?.standings || [])
        .filter(s => s.userId !== '1') // Exclude current user
        .map(s => ({
          id: s.userId,
          name: s.name,
          roster: mockPlayers.slice(6, 12).map(p => ({ ...p })), // Give them some players
        }))

      // Trade history
      const history = [
        {
          id: 'trade-h1',
          description: 'You traded Patrick Cantlay to Mike S. for Collin Morikawa',
          date: 'Feb 1, 2024',
          status: 'completed',
        },
        {
          id: 'trade-h2',
          description: 'Sarah K. traded Tommy Fleetwood to you for Ludvig Aberg',
          date: 'Jan 28, 2024',
          status: 'completed',
        },
      ]

      return {
        pending: mockPendingTrades,
        history,
        members,
      }
    },

    async getPending(leagueId) {
      await delay(400)
      return mockPendingTrades
    },

    async propose(leagueId, tradeData) {
      await delay(500)
      const newTrade = {
        id: `trade-${Date.now()}`,
        isIncoming: false,
        otherTeamName: tradeData.toTeamName,
        playersOffered: tradeData.playersOffered.map(id => {
          const player = mockRoster.find(p => p.id === id)
          return { id, name: player?.name || 'Unknown', countryFlag: player?.countryFlag || '' }
        }),
        playersRequested: tradeData.playersRequested.map(id => ({
          id,
          name: 'Requested Player',
          countryFlag: '🏌️',
        })),
        createdAt: new Date().toISOString(),
      }
      mockPendingTrades.push(newTrade)
      return newTrade
    },

    async accept(tradeId) {
      await delay(400)
      const index = mockPendingTrades.findIndex(t => t.id === tradeId)
      if (index !== -1) {
        mockPendingTrades.splice(index, 1)
      }
      return { success: true }
    },

    async reject(tradeId) {
      await delay(400)
      const index = mockPendingTrades.findIndex(t => t.id === tradeId)
      if (index !== -1) {
        mockPendingTrades.splice(index, 1)
      }
      return { success: true }
    },

    async cancel(tradeId) {
      await delay(400)
      const index = mockPendingTrades.findIndex(t => t.id === tradeId)
      if (index !== -1) {
        mockPendingTrades.splice(index, 1)
      }
      return { success: true }
    },
  },

  // Chat endpoints
  chat: {
    async getMessages(leagueId, limit = 50) {
      await delay(300)
      const messages = getChatMessages(leagueId)
      // Return most recent messages
      return messages.slice(-limit)
    },

    async sendMessage(leagueId, userId, userName, userAvatar, content) {
      await delay(200)
      const messages = getChatMessages(leagueId)
      const newMessage = {
        id: `msg-${Date.now()}`,
        type: 'message',
        userId,
        userName,
        userAvatar,
        content,
        timestamp: new Date().toISOString(),
      }
      messages.push(newMessage)
      saveChatMessages(leagueId, messages)
      return newMessage
    },

    async postSystemMessage(leagueId, content, activityType = null) {
      await delay(100)
      const messages = getChatMessages(leagueId)
      const newMessage = {
        id: `msg-${Date.now()}`,
        type: activityType ? 'activity' : 'system',
        activityType,
        content,
        timestamp: new Date().toISOString(),
      }
      messages.push(newMessage)
      saveChatMessages(leagueId, messages)
      return newMessage
    },

    async getUnreadCount(leagueId, lastReadTimestamp) {
      await delay(100)
      const messages = getChatMessages(leagueId)
      if (!lastReadTimestamp) return messages.length
      return messages.filter(m => new Date(m.timestamp) > new Date(lastReadTimestamp)).length
    },

    // Simulates real-time updates by returning messages after a timestamp
    async pollMessages(leagueId, afterTimestamp) {
      await delay(100)
      const messages = getChatMessages(leagueId)
      if (!afterTimestamp) return messages
      return messages.filter(m => new Date(m.timestamp) > new Date(afterTimestamp))
    },
  },

  // Global search endpoint
  search: {
    async query(searchQuery, options = {}) {
      await delay(300)

      if (!searchQuery || searchQuery.trim().length < 2) {
        return { players: [], leagues: [], tournaments: [], news: [] }
      }

      const query = searchQuery.toLowerCase().trim()
      const { types = ['players', 'leagues', 'tournaments', 'news'], limit = 5 } = options

      const results = {
        players: [],
        leagues: [],
        tournaments: [],
        news: [],
      }

      // Search players
      if (types.includes('players')) {
        results.players = mockPlayers
          .filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.country.toLowerCase().includes(query)
          )
          .slice(0, limit)
          .map(p => ({
            id: p.id,
            type: 'player',
            name: p.name,
            subtitle: `Rank #${p.rank} · ${p.countryFlag} ${p.country}`,
            icon: p.countryFlag,
            url: `/players/${p.id}`,
          }))
      }

      // Search leagues
      if (types.includes('leagues')) {
        results.leagues = mockLeagues
          .filter(l =>
            l.name.toLowerCase().includes(query) ||
            l.type.toLowerCase().includes(query)
          )
          .slice(0, limit)
          .map(l => ({
            id: l.id,
            type: 'league',
            name: l.name,
            subtitle: `${l.type} · ${l.memberCount}/${l.maxMembers} members`,
            icon: '🏆',
            url: `/leagues/${l.id}`,
          }))
      }

      // Search tournaments
      if (types.includes('tournaments')) {
        results.tournaments = mockTournaments
          .filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.course.toLowerCase().includes(query) ||
            t.location.toLowerCase().includes(query)
          )
          .slice(0, limit)
          .map(t => ({
            id: t.id,
            type: 'tournament',
            name: t.name,
            subtitle: `${t.course} · ${t.location}`,
            icon: '⛳',
            url: `/tournaments/${t.id}`,
          }))
      }

      // Search news
      if (types.includes('news')) {
        results.news = mockNews
          .filter(n =>
            n.headline.toLowerCase().includes(query) ||
            (n.playerName && n.playerName.toLowerCase().includes(query)) ||
            n.summary.toLowerCase().includes(query)
          )
          .slice(0, limit)
          .map(n => ({
            id: n.id,
            type: 'news',
            name: n.headline,
            subtitle: n.playerName ? `${n.playerFlag} ${n.playerName}` : n.source,
            icon: n.type === 'injury' ? '🏥' : n.type === 'trending' ? '📈' : '📰',
            url: n.playerId ? `/players/${n.playerId}` : '/news',
          }))
      }

      return results
    },
  },

  // News endpoints
  news: {
    async getAll(options = {}) {
      await delay(400)
      let news = [...mockNews]

      // Filter by type if specified
      if (options.type) {
        news = news.filter(n => n.type === options.type)
      }

      // Filter by priority if specified
      if (options.priority) {
        news = news.filter(n => n.priority === options.priority)
      }

      // Filter by player ID if specified
      if (options.playerId) {
        news = news.filter(n => n.playerId === options.playerId)
      }

      // Sort by timestamp (newest first)
      news.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      // Limit results
      if (options.limit) {
        news = news.slice(0, options.limit)
      }

      return news
    },

    async getHighPriority() {
      await delay(300)
      return mockNews
        .filter(n => n.priority === 'high')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    },

    async getByPlayer(playerId) {
      await delay(300)
      return mockNews
        .filter(n => n.playerId === playerId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    },

    async getInjuryReports() {
      await delay(300)
      return mockNews
        .filter(n => n.type === 'injury' || n.type === 'withdrawal')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    },

    async getTrending() {
      await delay(300)
      return mockNews
        .filter(n => n.type === 'trending' || n.type === 'hot')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    },
  },
}

export default mockApi
