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
        ...leagueData,
        joinCode,
        memberCount: 1,
        status: 'draft-pending',
        userRank: 1,
        userPoints: 0,
        createdAt: new Date().toISOString(),
        settings: {
          rosterSize: leagueData.rosterSize,
          scoringType: leagueData.scoringType,
          budget: leagueData.budget,
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
}

export default mockApi
