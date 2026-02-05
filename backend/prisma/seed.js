const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Top 50 PGA Tour Players (2024-25 Season)
const players = [
  { name: 'Scottie Scheffler', country: 'USA', countryFlag: '🇺🇸', rank: 1, owgr: 12.85, avgScore: 69.2, sgTotal: 2.45, sgPutting: 0.35, sgApproach: 0.95, sgOffTee: 0.72, sgAroundGreen: 0.43, top10s: 15, wins: 9, cutsMade: 22 },
  { name: 'Xander Schauffele', country: 'USA', countryFlag: '🇺🇸', rank: 2, owgr: 10.24, avgScore: 69.5, sgTotal: 2.12, sgPutting: 0.42, sgApproach: 0.78, sgOffTee: 0.55, sgAroundGreen: 0.37, top10s: 14, wins: 4, cutsMade: 21 },
  { name: 'Rory McIlroy', country: 'NIR', countryFlag: '🇬🇧', rank: 3, owgr: 9.15, avgScore: 69.6, sgTotal: 1.98, sgPutting: 0.15, sgApproach: 0.72, sgOffTee: 0.78, sgAroundGreen: 0.33, top10s: 12, wins: 3, cutsMade: 20 },
  { name: 'Collin Morikawa', country: 'USA', countryFlag: '🇺🇸', rank: 4, owgr: 7.82, avgScore: 69.8, sgTotal: 1.85, sgPutting: 0.22, sgApproach: 0.92, sgOffTee: 0.42, sgAroundGreen: 0.29, top10s: 11, wins: 2, cutsMade: 19 },
  { name: 'Jon Rahm', country: 'ESP', countryFlag: '🇪🇸', rank: 5, owgr: 7.45, avgScore: 69.7, sgTotal: 1.92, sgPutting: 0.28, sgApproach: 0.68, sgOffTee: 0.65, sgAroundGreen: 0.31, top10s: 10, wins: 2, cutsMade: 18 },
  { name: 'Ludvig Åberg', country: 'SWE', countryFlag: '🇸🇪', rank: 6, owgr: 6.92, avgScore: 69.9, sgTotal: 1.78, sgPutting: 0.18, sgApproach: 0.72, sgOffTee: 0.58, sgAroundGreen: 0.30, top10s: 9, wins: 2, cutsMade: 17 },
  { name: 'Viktor Hovland', country: 'NOR', countryFlag: '🇳🇴', rank: 7, owgr: 6.54, avgScore: 70.0, sgTotal: 1.65, sgPutting: 0.12, sgApproach: 0.75, sgOffTee: 0.52, sgAroundGreen: 0.26, top10s: 10, wins: 3, cutsMade: 18 },
  { name: 'Patrick Cantlay', country: 'USA', countryFlag: '🇺🇸', rank: 8, owgr: 6.21, avgScore: 70.1, sgTotal: 1.58, sgPutting: 0.32, sgApproach: 0.62, sgOffTee: 0.38, sgAroundGreen: 0.26, top10s: 9, wins: 2, cutsMade: 19 },
  { name: 'Wyndham Clark', country: 'USA', countryFlag: '🇺🇸', rank: 9, owgr: 5.88, avgScore: 70.0, sgTotal: 1.52, sgPutting: 0.25, sgApproach: 0.55, sgOffTee: 0.48, sgAroundGreen: 0.24, top10s: 8, wins: 2, cutsMade: 17 },
  { name: 'Tommy Fleetwood', country: 'ENG', countryFlag: '🇬🇧', rank: 10, owgr: 5.62, avgScore: 70.2, sgTotal: 1.45, sgPutting: 0.20, sgApproach: 0.58, sgOffTee: 0.42, sgAroundGreen: 0.25, top10s: 8, wins: 1, cutsMade: 18 },
  { name: 'Hideki Matsuyama', country: 'JPN', countryFlag: '🇯🇵', rank: 11, owgr: 5.38, avgScore: 70.1, sgTotal: 1.48, sgPutting: 0.08, sgApproach: 0.72, sgOffTee: 0.45, sgAroundGreen: 0.23, top10s: 9, wins: 2, cutsMade: 16 },
  { name: 'Shane Lowry', country: 'IRL', countryFlag: '🇮🇪', rank: 12, owgr: 5.15, avgScore: 70.3, sgTotal: 1.38, sgPutting: 0.35, sgApproach: 0.48, sgOffTee: 0.32, sgAroundGreen: 0.23, top10s: 7, wins: 1, cutsMade: 17 },
  { name: 'Matt Fitzpatrick', country: 'ENG', countryFlag: '🇬🇧', rank: 13, owgr: 4.92, avgScore: 70.2, sgTotal: 1.42, sgPutting: 0.28, sgApproach: 0.65, sgOffTee: 0.28, sgAroundGreen: 0.21, top10s: 7, wins: 1, cutsMade: 18 },
  { name: 'Sahith Theegala', country: 'USA', countryFlag: '🇺🇸', rank: 14, owgr: 4.71, avgScore: 70.3, sgTotal: 1.35, sgPutting: 0.22, sgApproach: 0.52, sgOffTee: 0.38, sgAroundGreen: 0.23, top10s: 8, wins: 1, cutsMade: 19 },
  { name: 'Brian Harman', country: 'USA', countryFlag: '🇺🇸', rank: 15, owgr: 4.52, avgScore: 70.4, sgTotal: 1.28, sgPutting: 0.45, sgApproach: 0.42, sgOffTee: 0.22, sgAroundGreen: 0.19, top10s: 6, wins: 1, cutsMade: 18 },
  { name: 'Tony Finau', country: 'USA', countryFlag: '🇺🇸', rank: 16, owgr: 4.35, avgScore: 70.3, sgTotal: 1.32, sgPutting: 0.15, sgApproach: 0.52, sgOffTee: 0.45, sgAroundGreen: 0.20, top10s: 7, wins: 2, cutsMade: 17 },
  { name: 'Russell Henley', country: 'USA', countryFlag: '🇺🇸', rank: 17, owgr: 4.18, avgScore: 70.4, sgTotal: 1.25, sgPutting: 0.32, sgApproach: 0.48, sgOffTee: 0.25, sgAroundGreen: 0.20, top10s: 6, wins: 1, cutsMade: 18 },
  { name: 'Sungjae Im', country: 'KOR', countryFlag: '🇰🇷', rank: 18, owgr: 4.02, avgScore: 70.5, sgTotal: 1.22, sgPutting: 0.18, sgApproach: 0.48, sgOffTee: 0.35, sgAroundGreen: 0.21, top10s: 7, wins: 1, cutsMade: 20 },
  { name: 'Cameron Young', country: 'USA', countryFlag: '🇺🇸', rank: 19, owgr: 3.88, avgScore: 70.4, sgTotal: 1.28, sgPutting: 0.12, sgApproach: 0.45, sgOffTee: 0.52, sgAroundGreen: 0.19, top10s: 6, wins: 0, cutsMade: 17 },
  { name: 'Keegan Bradley', country: 'USA', countryFlag: '🇺🇸', rank: 20, owgr: 3.75, avgScore: 70.5, sgTotal: 1.18, sgPutting: 0.25, sgApproach: 0.42, sgOffTee: 0.32, sgAroundGreen: 0.19, top10s: 6, wins: 1, cutsMade: 18 },
  { name: 'Max Homa', country: 'USA', countryFlag: '🇺🇸', rank: 21, owgr: 3.62, avgScore: 70.6, sgTotal: 1.15, sgPutting: 0.22, sgApproach: 0.45, sgOffTee: 0.28, sgAroundGreen: 0.20, top10s: 5, wins: 1, cutsMade: 17 },
  { name: 'Justin Thomas', country: 'USA', countryFlag: '🇺🇸', rank: 22, owgr: 3.51, avgScore: 70.5, sgTotal: 1.18, sgPutting: 0.18, sgApproach: 0.52, sgOffTee: 0.32, sgAroundGreen: 0.16, top10s: 5, wins: 0, cutsMade: 16 },
  { name: 'Sepp Straka', country: 'AUT', countryFlag: '🇦🇹', rank: 23, owgr: 3.42, avgScore: 70.6, sgTotal: 1.12, sgPutting: 0.28, sgApproach: 0.38, sgOffTee: 0.28, sgAroundGreen: 0.18, top10s: 5, wins: 1, cutsMade: 17 },
  { name: 'Tom Kim', country: 'KOR', countryFlag: '🇰🇷', rank: 24, owgr: 3.31, avgScore: 70.7, sgTotal: 1.08, sgPutting: 0.22, sgApproach: 0.42, sgOffTee: 0.28, sgAroundGreen: 0.16, top10s: 6, wins: 2, cutsMade: 18 },
  { name: 'Corey Conners', country: 'CAN', countryFlag: '🇨🇦', rank: 25, owgr: 3.22, avgScore: 70.6, sgTotal: 1.10, sgPutting: 0.08, sgApproach: 0.58, sgOffTee: 0.28, sgAroundGreen: 0.16, top10s: 5, wins: 1, cutsMade: 19 },
  { name: 'Jason Day', country: 'AUS', countryFlag: '🇦🇺', rank: 26, owgr: 3.12, avgScore: 70.7, sgTotal: 1.05, sgPutting: 0.32, sgApproach: 0.35, sgOffTee: 0.22, sgAroundGreen: 0.16, top10s: 5, wins: 1, cutsMade: 16 },
  { name: 'Si Woo Kim', country: 'KOR', countryFlag: '🇰🇷', rank: 27, owgr: 3.02, avgScore: 70.8, sgTotal: 1.02, sgPutting: 0.18, sgApproach: 0.42, sgOffTee: 0.25, sgAroundGreen: 0.17, top10s: 4, wins: 1, cutsMade: 17 },
  { name: 'Adam Scott', country: 'AUS', countryFlag: '🇦🇺', rank: 28, owgr: 2.95, avgScore: 70.7, sgTotal: 1.05, sgPutting: 0.15, sgApproach: 0.45, sgOffTee: 0.28, sgAroundGreen: 0.17, top10s: 4, wins: 0, cutsMade: 16 },
  { name: 'Tyrrell Hatton', country: 'ENG', countryFlag: '🇬🇧', rank: 29, owgr: 2.88, avgScore: 70.8, sgTotal: 0.98, sgPutting: 0.22, sgApproach: 0.38, sgOffTee: 0.22, sgAroundGreen: 0.16, top10s: 4, wins: 1, cutsMade: 15 },
  { name: 'Cameron Smith', country: 'AUS', countryFlag: '🇦🇺', rank: 30, owgr: 2.78, avgScore: 70.9, sgTotal: 0.95, sgPutting: 0.42, sgApproach: 0.28, sgOffTee: 0.12, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 14 },
  { name: 'Bryson DeChambeau', country: 'USA', countryFlag: '🇺🇸', rank: 31, owgr: 2.72, avgScore: 70.8, sgTotal: 0.98, sgPutting: 0.12, sgApproach: 0.35, sgOffTee: 0.38, sgAroundGreen: 0.13, top10s: 5, wins: 2, cutsMade: 14 },
  { name: 'Akshay Bhatia', country: 'USA', countryFlag: '🇺🇸', rank: 32, owgr: 2.65, avgScore: 70.9, sgTotal: 0.92, sgPutting: 0.25, sgApproach: 0.35, sgOffTee: 0.18, sgAroundGreen: 0.14, top10s: 4, wins: 2, cutsMade: 16 },
  { name: 'Denny McCarthy', country: 'USA', countryFlag: '🇺🇸', rank: 33, owgr: 2.58, avgScore: 70.9, sgTotal: 0.90, sgPutting: 0.52, sgApproach: 0.22, sgOffTee: 0.05, sgAroundGreen: 0.11, top10s: 5, wins: 0, cutsMade: 18 },
  { name: 'Chris Kirk', country: 'USA', countryFlag: '🇺🇸', rank: 34, owgr: 2.52, avgScore: 71.0, sgTotal: 0.88, sgPutting: 0.28, sgApproach: 0.32, sgOffTee: 0.15, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 17 },
  { name: 'Billy Horschel', country: 'USA', countryFlag: '🇺🇸', rank: 35, owgr: 2.45, avgScore: 71.0, sgTotal: 0.85, sgPutting: 0.22, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.13, top10s: 4, wins: 0, cutsMade: 16 },
  { name: 'Robert MacIntyre', country: 'SCO', countryFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', rank: 36, owgr: 2.38, avgScore: 71.0, sgTotal: 0.85, sgPutting: 0.18, sgApproach: 0.35, sgOffTee: 0.20, sgAroundGreen: 0.12, top10s: 4, wins: 2, cutsMade: 16 },
  { name: 'Min Woo Lee', country: 'AUS', countryFlag: '🇦🇺', rank: 37, owgr: 2.32, avgScore: 71.1, sgTotal: 0.82, sgPutting: 0.15, sgApproach: 0.32, sgOffTee: 0.22, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 15 },
  { name: 'Taylor Moore', country: 'USA', countryFlag: '🇺🇸', rank: 38, owgr: 2.25, avgScore: 71.1, sgTotal: 0.80, sgPutting: 0.20, sgApproach: 0.30, sgOffTee: 0.18, sgAroundGreen: 0.12, top10s: 3, wins: 1, cutsMade: 16 },
  { name: 'Davis Thompson', country: 'USA', countryFlag: '🇺🇸', rank: 39, owgr: 2.18, avgScore: 71.1, sgTotal: 0.78, sgPutting: 0.18, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.10, top10s: 3, wins: 1, cutsMade: 17 },
  { name: 'Stephan Jaeger', country: 'GER', countryFlag: '🇩🇪', rank: 40, owgr: 2.12, avgScore: 71.2, sgTotal: 0.75, sgPutting: 0.22, sgApproach: 0.28, sgOffTee: 0.15, sgAroundGreen: 0.10, top10s: 3, wins: 1, cutsMade: 16 },
  { name: 'Jordan Spieth', country: 'USA', countryFlag: '🇺🇸', rank: 41, owgr: 2.08, avgScore: 71.2, sgTotal: 0.75, sgPutting: 0.28, sgApproach: 0.35, sgOffTee: 0.08, sgAroundGreen: 0.04, top10s: 3, wins: 0, cutsMade: 14 },
  { name: 'Sam Burns', country: 'USA', countryFlag: '🇺🇸', rank: 42, owgr: 2.02, avgScore: 71.2, sgTotal: 0.72, sgPutting: 0.18, sgApproach: 0.28, sgOffTee: 0.15, sgAroundGreen: 0.11, top10s: 3, wins: 0, cutsMade: 15 },
  { name: 'Nick Dunlap', country: 'USA', countryFlag: '🇺🇸', rank: 43, owgr: 1.98, avgScore: 71.2, sgTotal: 0.72, sgPutting: 0.15, sgApproach: 0.30, sgOffTee: 0.18, sgAroundGreen: 0.09, top10s: 3, wins: 2, cutsMade: 15 },
  { name: 'Aaron Rai', country: 'ENG', countryFlag: '🇬🇧', rank: 44, owgr: 1.92, avgScore: 71.3, sgTotal: 0.70, sgPutting: 0.12, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.08, top10s: 3, wins: 1, cutsMade: 16 },
  { name: 'Austin Eckroat', country: 'USA', countryFlag: '🇺🇸', rank: 45, owgr: 1.88, avgScore: 71.3, sgTotal: 0.68, sgPutting: 0.20, sgApproach: 0.25, sgOffTee: 0.15, sgAroundGreen: 0.08, top10s: 3, wins: 1, cutsMade: 15 },
  { name: 'Eric Cole', country: 'USA', countryFlag: '🇺🇸', rank: 46, owgr: 1.82, avgScore: 71.3, sgTotal: 0.68, sgPutting: 0.15, sgApproach: 0.28, sgOffTee: 0.18, sgAroundGreen: 0.07, top10s: 3, wins: 0, cutsMade: 17 },
  { name: 'Thomas Detry', country: 'BEL', countryFlag: '🇧🇪', rank: 47, owgr: 1.78, avgScore: 71.4, sgTotal: 0.65, sgPutting: 0.18, sgApproach: 0.25, sgOffTee: 0.15, sgAroundGreen: 0.07, top10s: 3, wins: 0, cutsMade: 16 },
  { name: 'Maverick McNealy', country: 'USA', countryFlag: '🇺🇸', rank: 48, owgr: 1.72, avgScore: 71.4, sgTotal: 0.65, sgPutting: 0.22, sgApproach: 0.22, sgOffTee: 0.12, sgAroundGreen: 0.09, top10s: 3, wins: 0, cutsMade: 17 },
  { name: 'Jake Knapp', country: 'USA', countryFlag: '🇺🇸', rank: 49, owgr: 1.68, avgScore: 71.4, sgTotal: 0.62, sgPutting: 0.12, sgApproach: 0.22, sgOffTee: 0.20, sgAroundGreen: 0.08, top10s: 2, wins: 1, cutsMade: 15 },
  { name: 'J.T. Poston', country: 'USA', countryFlag: '🇺🇸', rank: 50, owgr: 1.62, avgScore: 71.4, sgTotal: 0.62, sgPutting: 0.28, sgApproach: 0.20, sgOffTee: 0.08, sgAroundGreen: 0.06, top10s: 3, wins: 0, cutsMade: 16 },
]

// 2024-25 PGA Tour Schedule
const tournaments = [
  // January
  { name: 'The Sentry', course: 'Kapalua Resort (Plantation)', location: 'Maui, Hawaii', startDate: new Date('2025-01-02'), endDate: new Date('2025-01-05'), purse: 20000000, status: 'COMPLETED' },
  { name: 'Sony Open in Hawaii', course: 'Waialae Country Club', location: 'Honolulu, Hawaii', startDate: new Date('2025-01-09'), endDate: new Date('2025-01-12'), purse: 8500000, status: 'COMPLETED' },
  { name: 'The American Express', course: 'PGA West (Stadium)', location: 'La Quinta, California', startDate: new Date('2025-01-16'), endDate: new Date('2025-01-19'), purse: 8400000, status: 'COMPLETED' },
  { name: 'Farmers Insurance Open', course: 'Torrey Pines (South)', location: 'San Diego, California', startDate: new Date('2025-01-22'), endDate: new Date('2025-01-25'), purse: 9300000, status: 'COMPLETED' },
  { name: 'AT&T Pebble Beach Pro-Am', course: 'Pebble Beach Golf Links', location: 'Pebble Beach, California', startDate: new Date('2025-01-30'), endDate: new Date('2025-02-02'), purse: 20000000, status: 'COMPLETED' },

  // February
  { name: 'WM Phoenix Open', course: 'TPC Scottsdale (Stadium)', location: 'Scottsdale, Arizona', startDate: new Date('2025-02-06'), endDate: new Date('2025-02-09'), purse: 20000000, status: 'IN_PROGRESS', currentRound: 2 },
  { name: 'The Genesis Invitational', course: 'Riviera Country Club', location: 'Pacific Palisades, California', startDate: new Date('2025-02-13'), endDate: new Date('2025-02-16'), purse: 20000000, status: 'UPCOMING' },
  { name: 'Mexico Open at Vidanta', course: 'Vidanta Vallarta', location: 'Vallarta, Mexico', startDate: new Date('2025-02-20'), endDate: new Date('2025-02-23'), purse: 8300000, status: 'UPCOMING' },
  { name: 'Cognizant Classic', course: 'PGA National (Champion)', location: 'Palm Beach Gardens, Florida', startDate: new Date('2025-02-27'), endDate: new Date('2025-03-02'), purse: 9000000, status: 'UPCOMING' },

  // March
  { name: 'Arnold Palmer Invitational', course: 'Bay Hill Club & Lodge', location: 'Orlando, Florida', startDate: new Date('2025-03-06'), endDate: new Date('2025-03-09'), purse: 20000000, status: 'UPCOMING' },
  { name: 'THE PLAYERS Championship', course: 'TPC Sawgrass (Stadium)', location: 'Ponte Vedra Beach, Florida', startDate: new Date('2025-03-13'), endDate: new Date('2025-03-16'), purse: 25000000, status: 'UPCOMING' },
  { name: 'Valspar Championship', course: 'Innisbrook Resort (Copperhead)', location: 'Palm Harbor, Florida', startDate: new Date('2025-03-20'), endDate: new Date('2025-03-23'), purse: 8300000, status: 'UPCOMING' },
  { name: 'Texas Children\'s Houston Open', course: 'Memorial Park Golf Course', location: 'Houston, Texas', startDate: new Date('2025-03-27'), endDate: new Date('2025-03-30'), purse: 9100000, status: 'UPCOMING' },

  // April - Masters Month
  { name: 'Valero Texas Open', course: 'TPC San Antonio (Oaks)', location: 'San Antonio, Texas', startDate: new Date('2025-04-03'), endDate: new Date('2025-04-06'), purse: 8800000, status: 'UPCOMING' },
  { name: 'Masters Tournament', course: 'Augusta National Golf Club', location: 'Augusta, Georgia', startDate: new Date('2025-04-10'), endDate: new Date('2025-04-13'), purse: 20000000, status: 'UPCOMING' },
  { name: 'RBC Heritage', course: 'Harbour Town Golf Links', location: 'Hilton Head, South Carolina', startDate: new Date('2025-04-17'), endDate: new Date('2025-04-20'), purse: 20000000, status: 'UPCOMING' },
  { name: 'Zurich Classic of New Orleans', course: 'TPC Louisiana', location: 'Avondale, Louisiana', startDate: new Date('2025-04-24'), endDate: new Date('2025-04-27'), purse: 8800000, status: 'UPCOMING' },

  // May
  { name: 'THE CJ CUP Byron Nelson', course: 'TPC Craig Ranch', location: 'McKinney, Texas', startDate: new Date('2025-05-01'), endDate: new Date('2025-05-04'), purse: 9500000, status: 'UPCOMING' },
  { name: 'Wells Fargo Championship', course: 'Quail Hollow Club', location: 'Charlotte, North Carolina', startDate: new Date('2025-05-08'), endDate: new Date('2025-05-11'), purse: 20000000, status: 'UPCOMING' },
  { name: 'PGA Championship', course: 'Quail Hollow Club', location: 'Charlotte, North Carolina', startDate: new Date('2025-05-15'), endDate: new Date('2025-05-18'), purse: 18500000, status: 'UPCOMING' },
  { name: 'Charles Schwab Challenge', course: 'Colonial Country Club', location: 'Fort Worth, Texas', startDate: new Date('2025-05-22'), endDate: new Date('2025-05-25'), purse: 9100000, status: 'UPCOMING' },
  { name: 'RBC Canadian Open', course: 'Hamilton Golf & Country Club', location: 'Hamilton, Ontario', startDate: new Date('2025-05-29'), endDate: new Date('2025-06-01'), purse: 9400000, status: 'UPCOMING' },

  // June
  { name: 'the Memorial Tournament', course: 'Muirfield Village Golf Club', location: 'Dublin, Ohio', startDate: new Date('2025-06-05'), endDate: new Date('2025-06-08'), purse: 20000000, status: 'UPCOMING' },
  { name: 'U.S. Open', course: 'Oakmont Country Club', location: 'Oakmont, Pennsylvania', startDate: new Date('2025-06-12'), endDate: new Date('2025-06-15'), purse: 21500000, status: 'UPCOMING' },
  { name: 'Travelers Championship', course: 'TPC River Highlands', location: 'Cromwell, Connecticut', startDate: new Date('2025-06-19'), endDate: new Date('2025-06-22'), purse: 20000000, status: 'UPCOMING' },
  { name: 'Rocket Mortgage Classic', course: 'Detroit Golf Club', location: 'Detroit, Michigan', startDate: new Date('2025-06-26'), endDate: new Date('2025-06-29'), purse: 8300000, status: 'UPCOMING' },

  // July
  { name: 'John Deere Classic', course: 'TPC Deere Run', location: 'Silvis, Illinois', startDate: new Date('2025-07-03'), endDate: new Date('2025-07-06'), purse: 7600000, status: 'UPCOMING' },
  { name: 'Genesis Scottish Open', course: 'The Renaissance Club', location: 'North Berwick, Scotland', startDate: new Date('2025-07-10'), endDate: new Date('2025-07-13'), purse: 9000000, status: 'UPCOMING' },
  { name: 'The Open Championship', course: 'Royal Portrush Golf Club', location: 'Portrush, Northern Ireland', startDate: new Date('2025-07-17'), endDate: new Date('2025-07-20'), purse: 17000000, status: 'UPCOMING' },
  { name: '3M Open', course: 'TPC Twin Cities', location: 'Blaine, Minnesota', startDate: new Date('2025-07-24'), endDate: new Date('2025-07-27'), purse: 8300000, status: 'UPCOMING' },

  // August - FedExCup Playoffs
  { name: 'Wyndham Championship', course: 'Sedgefield Country Club', location: 'Greensboro, North Carolina', startDate: new Date('2025-08-07'), endDate: new Date('2025-08-10'), purse: 8300000, status: 'UPCOMING' },
  { name: 'FedEx St. Jude Championship', course: 'TPC Southwind', location: 'Memphis, Tennessee', startDate: new Date('2025-08-14'), endDate: new Date('2025-08-17'), purse: 20000000, status: 'UPCOMING' },
  { name: 'BMW Championship', course: 'Caves Valley Golf Club', location: 'Owings Mills, Maryland', startDate: new Date('2025-08-21'), endDate: new Date('2025-08-24'), purse: 20000000, status: 'UPCOMING' },
  { name: 'TOUR Championship', course: 'East Lake Golf Club', location: 'Atlanta, Georgia', startDate: new Date('2025-08-28'), endDate: new Date('2025-08-31'), purse: 100000000, status: 'UPCOMING' },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo user
  console.log('👤 Creating demo user...')
  const hashedPassword = await bcrypt.hash('password123', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
      avatar: 'D'
    }
  })
  console.log(`   ✅ Demo user: ${demoUser.email}`)

  // Clear and reseed players
  console.log('🏌️ Seeding players...')
  await prisma.player.deleteMany()
  for (const player of players) {
    await prisma.player.create({ data: player })
  }
  console.log(`   ✅ Created ${players.length} players`)

  // Clear and reseed tournaments
  console.log('🏆 Seeding tournaments...')
  await prisma.tournament.deleteMany()
  for (const tournament of tournaments) {
    await prisma.tournament.create({ data: tournament })
  }
  console.log(`   ✅ Created ${tournaments.length} tournaments`)

  console.log('')
  console.log('✨ Seed complete!')
  console.log(`   - 1 demo user (demo@example.com / password123)`)
  console.log(`   - ${players.length} PGA Tour players`)
  console.log(`   - ${tournaments.length} tournaments (2024-25 season)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
