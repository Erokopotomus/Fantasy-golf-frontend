const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('../src/services/scoringService')

const prisma = new PrismaClient()

// Top 50 PGA Tour Players (2024-25 Season)
const players = [
  { name: 'Scottie Scheffler', country: 'USA', countryFlag: '🇺🇸', owgrRank: 1, owgr: 12.85, avgScore: 69.2, sgTotal: 2.45, sgPutting: 0.35, sgApproach: 0.95, sgOffTee: 0.72, sgAroundGreen: 0.43, top10s: 15, wins: 9, cutsMade: 22, primaryTour: 'PGA' },
  { name: 'Xander Schauffele', country: 'USA', countryFlag: '🇺🇸', owgrRank: 2, owgr: 10.24, avgScore: 69.5, sgTotal: 2.12, sgPutting: 0.42, sgApproach: 0.78, sgOffTee: 0.55, sgAroundGreen: 0.37, top10s: 14, wins: 4, cutsMade: 21, primaryTour: 'PGA' },
  { name: 'Rory McIlroy', country: 'NIR', countryFlag: '🇬🇧', owgrRank: 3, owgr: 9.15, avgScore: 69.6, sgTotal: 1.98, sgPutting: 0.15, sgApproach: 0.72, sgOffTee: 0.78, sgAroundGreen: 0.33, top10s: 12, wins: 3, cutsMade: 20, primaryTour: 'PGA' },
  { name: 'Collin Morikawa', country: 'USA', countryFlag: '🇺🇸', owgrRank: 4, owgr: 7.82, avgScore: 69.8, sgTotal: 1.85, sgPutting: 0.22, sgApproach: 0.92, sgOffTee: 0.42, sgAroundGreen: 0.29, top10s: 11, wins: 2, cutsMade: 19, primaryTour: 'PGA' },
  { name: 'Jon Rahm', country: 'ESP', countryFlag: '🇪🇸', owgrRank: 5, owgr: 7.45, avgScore: 69.7, sgTotal: 1.92, sgPutting: 0.28, sgApproach: 0.68, sgOffTee: 0.65, sgAroundGreen: 0.31, top10s: 10, wins: 2, cutsMade: 18, primaryTour: 'LIV' },
  { name: 'Ludvig Åberg', country: 'SWE', countryFlag: '🇸🇪', owgrRank: 6, owgr: 6.92, avgScore: 69.9, sgTotal: 1.78, sgPutting: 0.18, sgApproach: 0.72, sgOffTee: 0.58, sgAroundGreen: 0.30, top10s: 9, wins: 2, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Viktor Hovland', country: 'NOR', countryFlag: '🇳🇴', owgrRank: 7, owgr: 6.54, avgScore: 70.0, sgTotal: 1.65, sgPutting: 0.12, sgApproach: 0.75, sgOffTee: 0.52, sgAroundGreen: 0.26, top10s: 10, wins: 3, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Patrick Cantlay', country: 'USA', countryFlag: '🇺🇸', owgrRank: 8, owgr: 6.21, avgScore: 70.1, sgTotal: 1.58, sgPutting: 0.32, sgApproach: 0.62, sgOffTee: 0.38, sgAroundGreen: 0.26, top10s: 9, wins: 2, cutsMade: 19, primaryTour: 'PGA' },
  { name: 'Wyndham Clark', country: 'USA', countryFlag: '🇺🇸', owgrRank: 9, owgr: 5.88, avgScore: 70.0, sgTotal: 1.52, sgPutting: 0.25, sgApproach: 0.55, sgOffTee: 0.48, sgAroundGreen: 0.24, top10s: 8, wins: 2, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Tommy Fleetwood', country: 'ENG', countryFlag: '🇬🇧', owgrRank: 10, owgr: 5.62, avgScore: 70.2, sgTotal: 1.45, sgPutting: 0.20, sgApproach: 0.58, sgOffTee: 0.42, sgAroundGreen: 0.25, top10s: 8, wins: 1, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Hideki Matsuyama', country: 'JPN', countryFlag: '🇯🇵', owgrRank: 11, owgr: 5.38, avgScore: 70.1, sgTotal: 1.48, sgPutting: 0.08, sgApproach: 0.72, sgOffTee: 0.45, sgAroundGreen: 0.23, top10s: 9, wins: 2, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Shane Lowry', country: 'IRL', countryFlag: '🇮🇪', owgrRank: 12, owgr: 5.15, avgScore: 70.3, sgTotal: 1.38, sgPutting: 0.35, sgApproach: 0.48, sgOffTee: 0.32, sgAroundGreen: 0.23, top10s: 7, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Matt Fitzpatrick', country: 'ENG', countryFlag: '🇬🇧', owgrRank: 13, owgr: 4.92, avgScore: 70.2, sgTotal: 1.42, sgPutting: 0.28, sgApproach: 0.65, sgOffTee: 0.28, sgAroundGreen: 0.21, top10s: 7, wins: 1, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Sahith Theegala', country: 'USA', countryFlag: '🇺🇸', owgrRank: 14, owgr: 4.71, avgScore: 70.3, sgTotal: 1.35, sgPutting: 0.22, sgApproach: 0.52, sgOffTee: 0.38, sgAroundGreen: 0.23, top10s: 8, wins: 1, cutsMade: 19, primaryTour: 'PGA' },
  { name: 'Brian Harman', country: 'USA', countryFlag: '🇺🇸', owgrRank: 15, owgr: 4.52, avgScore: 70.4, sgTotal: 1.28, sgPutting: 0.45, sgApproach: 0.42, sgOffTee: 0.22, sgAroundGreen: 0.19, top10s: 6, wins: 1, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Tony Finau', country: 'USA', countryFlag: '🇺🇸', owgrRank: 16, owgr: 4.35, avgScore: 70.3, sgTotal: 1.32, sgPutting: 0.15, sgApproach: 0.52, sgOffTee: 0.45, sgAroundGreen: 0.20, top10s: 7, wins: 2, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Russell Henley', country: 'USA', countryFlag: '🇺🇸', owgrRank: 17, owgr: 4.18, avgScore: 70.4, sgTotal: 1.25, sgPutting: 0.32, sgApproach: 0.48, sgOffTee: 0.25, sgAroundGreen: 0.20, top10s: 6, wins: 1, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Sungjae Im', country: 'KOR', countryFlag: '🇰🇷', owgrRank: 18, owgr: 4.02, avgScore: 70.5, sgTotal: 1.22, sgPutting: 0.18, sgApproach: 0.48, sgOffTee: 0.35, sgAroundGreen: 0.21, top10s: 7, wins: 1, cutsMade: 20, primaryTour: 'PGA' },
  { name: 'Cameron Young', country: 'USA', countryFlag: '🇺🇸', owgrRank: 19, owgr: 3.88, avgScore: 70.4, sgTotal: 1.28, sgPutting: 0.12, sgApproach: 0.45, sgOffTee: 0.52, sgAroundGreen: 0.19, top10s: 6, wins: 0, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Keegan Bradley', country: 'USA', countryFlag: '🇺🇸', owgrRank: 20, owgr: 3.75, avgScore: 70.5, sgTotal: 1.18, sgPutting: 0.25, sgApproach: 0.42, sgOffTee: 0.32, sgAroundGreen: 0.19, top10s: 6, wins: 1, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Max Homa', country: 'USA', countryFlag: '🇺🇸', owgrRank: 21, owgr: 3.62, avgScore: 70.6, sgTotal: 1.15, sgPutting: 0.22, sgApproach: 0.45, sgOffTee: 0.28, sgAroundGreen: 0.20, top10s: 5, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Justin Thomas', country: 'USA', countryFlag: '🇺🇸', owgrRank: 22, owgr: 3.51, avgScore: 70.5, sgTotal: 1.18, sgPutting: 0.18, sgApproach: 0.52, sgOffTee: 0.32, sgAroundGreen: 0.16, top10s: 5, wins: 0, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Sepp Straka', country: 'AUT', countryFlag: '🇦🇹', owgrRank: 23, owgr: 3.42, avgScore: 70.6, sgTotal: 1.12, sgPutting: 0.28, sgApproach: 0.38, sgOffTee: 0.28, sgAroundGreen: 0.18, top10s: 5, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Tom Kim', country: 'KOR', countryFlag: '🇰🇷', owgrRank: 24, owgr: 3.31, avgScore: 70.7, sgTotal: 1.08, sgPutting: 0.22, sgApproach: 0.42, sgOffTee: 0.28, sgAroundGreen: 0.16, top10s: 6, wins: 2, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Corey Conners', country: 'CAN', countryFlag: '🇨🇦', owgrRank: 25, owgr: 3.22, avgScore: 70.6, sgTotal: 1.10, sgPutting: 0.08, sgApproach: 0.58, sgOffTee: 0.28, sgAroundGreen: 0.16, top10s: 5, wins: 1, cutsMade: 19, primaryTour: 'PGA' },
  { name: 'Jason Day', country: 'AUS', countryFlag: '🇦🇺', owgrRank: 26, owgr: 3.12, avgScore: 70.7, sgTotal: 1.05, sgPutting: 0.32, sgApproach: 0.35, sgOffTee: 0.22, sgAroundGreen: 0.16, top10s: 5, wins: 1, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Si Woo Kim', country: 'KOR', countryFlag: '🇰🇷', owgrRank: 27, owgr: 3.02, avgScore: 70.8, sgTotal: 1.02, sgPutting: 0.18, sgApproach: 0.42, sgOffTee: 0.25, sgAroundGreen: 0.17, top10s: 4, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Adam Scott', country: 'AUS', countryFlag: '🇦🇺', owgrRank: 28, owgr: 2.95, avgScore: 70.7, sgTotal: 1.05, sgPutting: 0.15, sgApproach: 0.45, sgOffTee: 0.28, sgAroundGreen: 0.17, top10s: 4, wins: 0, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Tyrrell Hatton', country: 'ENG', countryFlag: '🇬🇧', owgrRank: 29, owgr: 2.88, avgScore: 70.8, sgTotal: 0.98, sgPutting: 0.22, sgApproach: 0.38, sgOffTee: 0.22, sgAroundGreen: 0.16, top10s: 4, wins: 1, cutsMade: 15, primaryTour: 'LIV' },
  { name: 'Cameron Smith', country: 'AUS', countryFlag: '🇦🇺', owgrRank: 30, owgr: 2.78, avgScore: 70.9, sgTotal: 0.95, sgPutting: 0.42, sgApproach: 0.28, sgOffTee: 0.12, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 14, primaryTour: 'LIV' },
  { name: 'Bryson DeChambeau', country: 'USA', countryFlag: '🇺🇸', owgrRank: 31, owgr: 2.72, avgScore: 70.8, sgTotal: 0.98, sgPutting: 0.12, sgApproach: 0.35, sgOffTee: 0.38, sgAroundGreen: 0.13, top10s: 5, wins: 2, cutsMade: 14, primaryTour: 'LIV' },
  { name: 'Akshay Bhatia', country: 'USA', countryFlag: '🇺🇸', owgrRank: 32, owgr: 2.65, avgScore: 70.9, sgTotal: 0.92, sgPutting: 0.25, sgApproach: 0.35, sgOffTee: 0.18, sgAroundGreen: 0.14, top10s: 4, wins: 2, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Denny McCarthy', country: 'USA', countryFlag: '🇺🇸', owgrRank: 33, owgr: 2.58, avgScore: 70.9, sgTotal: 0.90, sgPutting: 0.52, sgApproach: 0.22, sgOffTee: 0.05, sgAroundGreen: 0.11, top10s: 5, wins: 0, cutsMade: 18, primaryTour: 'PGA' },
  { name: 'Chris Kirk', country: 'USA', countryFlag: '🇺🇸', owgrRank: 34, owgr: 2.52, avgScore: 71.0, sgTotal: 0.88, sgPutting: 0.28, sgApproach: 0.32, sgOffTee: 0.15, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Billy Horschel', country: 'USA', countryFlag: '🇺🇸', owgrRank: 35, owgr: 2.45, avgScore: 71.0, sgTotal: 0.85, sgPutting: 0.22, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.13, top10s: 4, wins: 0, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Robert MacIntyre', country: 'SCO', countryFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', owgrRank: 36, owgr: 2.38, avgScore: 71.0, sgTotal: 0.85, sgPutting: 0.18, sgApproach: 0.35, sgOffTee: 0.20, sgAroundGreen: 0.12, top10s: 4, wins: 2, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Min Woo Lee', country: 'AUS', countryFlag: '🇦🇺', owgrRank: 37, owgr: 2.32, avgScore: 71.1, sgTotal: 0.82, sgPutting: 0.15, sgApproach: 0.32, sgOffTee: 0.22, sgAroundGreen: 0.13, top10s: 4, wins: 1, cutsMade: 15, primaryTour: 'PGA' },
  { name: 'Taylor Moore', country: 'USA', countryFlag: '🇺🇸', owgrRank: 38, owgr: 2.25, avgScore: 71.1, sgTotal: 0.80, sgPutting: 0.20, sgApproach: 0.30, sgOffTee: 0.18, sgAroundGreen: 0.12, top10s: 3, wins: 1, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Davis Thompson', country: 'USA', countryFlag: '🇺🇸', owgrRank: 39, owgr: 2.18, avgScore: 71.1, sgTotal: 0.78, sgPutting: 0.18, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.10, top10s: 3, wins: 1, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Stephan Jaeger', country: 'GER', countryFlag: '🇩🇪', owgrRank: 40, owgr: 2.12, avgScore: 71.2, sgTotal: 0.75, sgPutting: 0.22, sgApproach: 0.28, sgOffTee: 0.15, sgAroundGreen: 0.10, top10s: 3, wins: 1, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Jordan Spieth', country: 'USA', countryFlag: '🇺🇸', owgrRank: 41, owgr: 2.08, avgScore: 71.2, sgTotal: 0.75, sgPutting: 0.28, sgApproach: 0.35, sgOffTee: 0.08, sgAroundGreen: 0.04, top10s: 3, wins: 0, cutsMade: 14, primaryTour: 'PGA' },
  { name: 'Sam Burns', country: 'USA', countryFlag: '🇺🇸', owgrRank: 42, owgr: 2.02, avgScore: 71.2, sgTotal: 0.72, sgPutting: 0.18, sgApproach: 0.28, sgOffTee: 0.15, sgAroundGreen: 0.11, top10s: 3, wins: 0, cutsMade: 15, primaryTour: 'PGA' },
  { name: 'Nick Dunlap', country: 'USA', countryFlag: '🇺🇸', owgrRank: 43, owgr: 1.98, avgScore: 71.2, sgTotal: 0.72, sgPutting: 0.15, sgApproach: 0.30, sgOffTee: 0.18, sgAroundGreen: 0.09, top10s: 3, wins: 2, cutsMade: 15, primaryTour: 'PGA' },
  { name: 'Aaron Rai', country: 'ENG', countryFlag: '🇬🇧', owgrRank: 44, owgr: 1.92, avgScore: 71.3, sgTotal: 0.70, sgPutting: 0.12, sgApproach: 0.32, sgOffTee: 0.18, sgAroundGreen: 0.08, top10s: 3, wins: 1, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Austin Eckroat', country: 'USA', countryFlag: '🇺🇸', owgrRank: 45, owgr: 1.88, avgScore: 71.3, sgTotal: 0.68, sgPutting: 0.20, sgApproach: 0.25, sgOffTee: 0.15, sgAroundGreen: 0.08, top10s: 3, wins: 1, cutsMade: 15, primaryTour: 'PGA' },
  { name: 'Eric Cole', country: 'USA', countryFlag: '🇺🇸', owgrRank: 46, owgr: 1.82, avgScore: 71.3, sgTotal: 0.68, sgPutting: 0.15, sgApproach: 0.28, sgOffTee: 0.18, sgAroundGreen: 0.07, top10s: 3, wins: 0, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Thomas Detry', country: 'BEL', countryFlag: '🇧🇪', owgrRank: 47, owgr: 1.78, avgScore: 71.4, sgTotal: 0.65, sgPutting: 0.18, sgApproach: 0.25, sgOffTee: 0.15, sgAroundGreen: 0.07, top10s: 3, wins: 0, cutsMade: 16, primaryTour: 'PGA' },
  { name: 'Maverick McNealy', country: 'USA', countryFlag: '🇺🇸', owgrRank: 48, owgr: 1.72, avgScore: 71.4, sgTotal: 0.65, sgPutting: 0.22, sgApproach: 0.22, sgOffTee: 0.12, sgAroundGreen: 0.09, top10s: 3, wins: 0, cutsMade: 17, primaryTour: 'PGA' },
  { name: 'Jake Knapp', country: 'USA', countryFlag: '🇺🇸', owgrRank: 49, owgr: 1.68, avgScore: 71.4, sgTotal: 0.62, sgPutting: 0.12, sgApproach: 0.22, sgOffTee: 0.20, sgAroundGreen: 0.08, top10s: 2, wins: 1, cutsMade: 15, primaryTour: 'PGA' },
  { name: 'J.T. Poston', country: 'USA', countryFlag: '🇺🇸', owgrRank: 50, owgr: 1.62, avgScore: 71.4, sgTotal: 0.62, sgPutting: 0.28, sgApproach: 0.20, sgOffTee: 0.08, sgAroundGreen: 0.06, top10s: 3, wins: 0, cutsMade: 16, primaryTour: 'PGA' },
]

// 2024-25 PGA Tour Schedule
const tournaments = [
  // January - Signature Events
  { name: 'The Sentry', location: 'Kapalua Resort (Plantation) - Maui, Hawaii', startDate: new Date('2025-01-02'), endDate: new Date('2025-01-05'), purse: 20000000, status: 'COMPLETED', tour: 'PGA', isSignature: true },
  { name: 'Sony Open in Hawaii', location: 'Waialae Country Club - Honolulu, Hawaii', startDate: new Date('2025-01-09'), endDate: new Date('2025-01-12'), purse: 8500000, status: 'COMPLETED', tour: 'PGA' },
  { name: 'The American Express', location: 'PGA West (Stadium) - La Quinta, California', startDate: new Date('2025-01-16'), endDate: new Date('2025-01-19'), purse: 8400000, status: 'COMPLETED', tour: 'PGA' },
  { name: 'Farmers Insurance Open', location: 'Torrey Pines (South) - San Diego, California', startDate: new Date('2025-01-22'), endDate: new Date('2025-01-25'), purse: 9300000, status: 'COMPLETED', tour: 'PGA' },
  { name: 'AT&T Pebble Beach Pro-Am', location: 'Pebble Beach Golf Links - Pebble Beach, California', startDate: new Date('2025-01-30'), endDate: new Date('2025-02-02'), purse: 20000000, status: 'COMPLETED', tour: 'PGA', isSignature: true },

  // February
  { name: 'WM Phoenix Open', location: 'TPC Scottsdale (Stadium) - Scottsdale, Arizona', startDate: new Date('2025-02-06'), endDate: new Date('2025-02-09'), purse: 20000000, status: 'IN_PROGRESS', currentRound: 2, tour: 'PGA', isSignature: true },
  { name: 'The Genesis Invitational', location: 'Riviera Country Club - Pacific Palisades, California', startDate: new Date('2025-02-13'), endDate: new Date('2025-02-16'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'Mexico Open at Vidanta', location: 'Vidanta Vallarta - Vallarta, Mexico', startDate: new Date('2025-02-20'), endDate: new Date('2025-02-23'), purse: 8300000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'Cognizant Classic', location: 'PGA National (Champion) - Palm Beach Gardens, Florida', startDate: new Date('2025-02-27'), endDate: new Date('2025-03-02'), purse: 9000000, status: 'UPCOMING', tour: 'PGA' },

  // March
  { name: 'Arnold Palmer Invitational', location: 'Bay Hill Club & Lodge - Orlando, Florida', startDate: new Date('2025-03-06'), endDate: new Date('2025-03-09'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'THE PLAYERS Championship', location: 'TPC Sawgrass (Stadium) - Ponte Vedra Beach, Florida', startDate: new Date('2025-03-13'), endDate: new Date('2025-03-16'), purse: 25000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'Valspar Championship', location: 'Innisbrook Resort (Copperhead) - Palm Harbor, Florida', startDate: new Date('2025-03-20'), endDate: new Date('2025-03-23'), purse: 8300000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'Texas Children\'s Houston Open', location: 'Memorial Park Golf Course - Houston, Texas', startDate: new Date('2025-03-27'), endDate: new Date('2025-03-30'), purse: 9100000, status: 'UPCOMING', tour: 'PGA' },

  // April - Masters Month
  { name: 'Valero Texas Open', location: 'TPC San Antonio (Oaks) - San Antonio, Texas', startDate: new Date('2025-04-03'), endDate: new Date('2025-04-06'), purse: 8800000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'Masters Tournament', location: 'Augusta National Golf Club - Augusta, Georgia', startDate: new Date('2025-04-10'), endDate: new Date('2025-04-13'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isMajor: true },
  { name: 'RBC Heritage', location: 'Harbour Town Golf Links - Hilton Head, South Carolina', startDate: new Date('2025-04-17'), endDate: new Date('2025-04-20'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'Zurich Classic of New Orleans', location: 'TPC Louisiana - Avondale, Louisiana', startDate: new Date('2025-04-24'), endDate: new Date('2025-04-27'), purse: 8800000, status: 'UPCOMING', tour: 'PGA', format: 'TEAM' },

  // May
  { name: 'THE CJ CUP Byron Nelson', location: 'TPC Craig Ranch - McKinney, Texas', startDate: new Date('2025-05-01'), endDate: new Date('2025-05-04'), purse: 9500000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'Wells Fargo Championship', location: 'Quail Hollow Club - Charlotte, North Carolina', startDate: new Date('2025-05-08'), endDate: new Date('2025-05-11'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'PGA Championship', location: 'Quail Hollow Club - Charlotte, North Carolina', startDate: new Date('2025-05-15'), endDate: new Date('2025-05-18'), purse: 18500000, status: 'UPCOMING', tour: 'PGA', isMajor: true },
  { name: 'Charles Schwab Challenge', location: 'Colonial Country Club - Fort Worth, Texas', startDate: new Date('2025-05-22'), endDate: new Date('2025-05-25'), purse: 9100000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'RBC Canadian Open', location: 'Hamilton Golf & Country Club - Hamilton, Ontario', startDate: new Date('2025-05-29'), endDate: new Date('2025-06-01'), purse: 9400000, status: 'UPCOMING', tour: 'PGA' },

  // June
  { name: 'the Memorial Tournament', location: 'Muirfield Village Golf Club - Dublin, Ohio', startDate: new Date('2025-06-05'), endDate: new Date('2025-06-08'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'U.S. Open', location: 'Oakmont Country Club - Oakmont, Pennsylvania', startDate: new Date('2025-06-12'), endDate: new Date('2025-06-15'), purse: 21500000, status: 'UPCOMING', tour: 'PGA', isMajor: true },
  { name: 'Travelers Championship', location: 'TPC River Highlands - Cromwell, Connecticut', startDate: new Date('2025-06-19'), endDate: new Date('2025-06-22'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isSignature: true },
  { name: 'Rocket Mortgage Classic', location: 'Detroit Golf Club - Detroit, Michigan', startDate: new Date('2025-06-26'), endDate: new Date('2025-06-29'), purse: 8300000, status: 'UPCOMING', tour: 'PGA' },

  // July
  { name: 'John Deere Classic', location: 'TPC Deere Run - Silvis, Illinois', startDate: new Date('2025-07-03'), endDate: new Date('2025-07-06'), purse: 7600000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'Genesis Scottish Open', location: 'The Renaissance Club - North Berwick, Scotland', startDate: new Date('2025-07-10'), endDate: new Date('2025-07-13'), purse: 9000000, status: 'UPCOMING', tour: 'DP World' },
  { name: 'The Open Championship', location: 'Royal Portrush Golf Club - Portrush, Northern Ireland', startDate: new Date('2025-07-17'), endDate: new Date('2025-07-20'), purse: 17000000, status: 'UPCOMING', tour: 'PGA', isMajor: true },
  { name: '3M Open', location: 'TPC Twin Cities - Blaine, Minnesota', startDate: new Date('2025-07-24'), endDate: new Date('2025-07-27'), purse: 8300000, status: 'UPCOMING', tour: 'PGA' },

  // August - FedExCup Playoffs
  { name: 'Wyndham Championship', location: 'Sedgefield Country Club - Greensboro, North Carolina', startDate: new Date('2025-08-07'), endDate: new Date('2025-08-10'), purse: 8300000, status: 'UPCOMING', tour: 'PGA' },
  { name: 'FedEx St. Jude Championship', location: 'TPC Southwind - Memphis, Tennessee', startDate: new Date('2025-08-14'), endDate: new Date('2025-08-17'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isPlayoff: true },
  { name: 'BMW Championship', location: 'Caves Valley Golf Club - Owings Mills, Maryland', startDate: new Date('2025-08-21'), endDate: new Date('2025-08-24'), purse: 20000000, status: 'UPCOMING', tour: 'PGA', isPlayoff: true },
  { name: 'TOUR Championship', location: 'East Lake Golf Club - Atlanta, Georgia', startDate: new Date('2025-08-28'), endDate: new Date('2025-08-31'), purse: 100000000, status: 'UPCOMING', tour: 'PGA', isPlayoff: true },
]

// Seeded random number generator for reproducible data
function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Generate realistic performance data for a tournament
 * @param {Object[]} dbPlayers - All players from DB
 * @param {Object} tournament - Tournament record
 * @param {number} seed - Random seed
 * @returns {{ performances: Object[], roundScores: Object[] }}
 */
function generateTournamentPerformances(dbPlayers, tournament, seed) {
  const rng = seededRandom(seed)
  const coursePar = 72

  // Pick 40-48 players for this tournament
  const fieldSize = 40 + Math.floor(rng() * 9)
  // Shuffle players deterministically and take fieldSize
  const shuffled = [...dbPlayers].sort((a, b) => rng() - 0.5)
  const field = shuffled.slice(0, fieldSize)

  const performances = []
  const roundScores = []

  for (const player of field) {
    // Base scoring ability from sgTotal (higher SG = lower scores)
    const sgBase = player.sgTotal || 0.5
    const baseScore = coursePar - sgBase

    // Generate 4 round scores with variance
    const rounds = []
    let totalStrokes = 0
    for (let r = 1; r <= 4; r++) {
      const variance = (rng() - 0.5) * 6 // +/- 3 strokes variance
      const roundScore = Math.round(baseScore + variance)
      rounds.push(roundScore)
      totalStrokes += roundScore
    }

    const totalToPar = totalStrokes - coursePar * 4

    // Generate per-round hole distributions
    for (let r = 1; r <= 4; r++) {
      const score = rounds[r - 1]
      const toPar = score - coursePar
      const stats = generateHoleDistribution(toPar, rng)

      roundScores.push({
        tournamentId: tournament.id,
        playerId: player.id,
        roundNumber: r,
        score,
        toPar,
        eagles: stats.eagles,
        birdies: stats.birdies,
        pars: stats.pars,
        bogeys: stats.bogeys,
        doubleBogeys: stats.doubleBogeys,
        worseThanDouble: stats.worseThanDouble,
        bogeyFree: stats.bogeys === 0 && stats.doubleBogeys === 0 && stats.worseThanDouble === 0,
        consecutiveBirdies: stats.birdies >= 3 ? Math.min(stats.birdies, 3 + Math.floor(rng() * 2)) : Math.floor(rng() * Math.min(stats.birdies, 3)),
      })
    }

    // Aggregate hole stats across all rounds
    const playerRounds = roundScores.filter((rs) => rs.playerId === player.id && rs.tournamentId === tournament.id)
    const totalEagles = playerRounds.reduce((s, r) => s + r.eagles, 0)
    const totalBirdies = playerRounds.reduce((s, r) => s + r.birdies, 0)
    const totalPars = playerRounds.reduce((s, r) => s + r.pars, 0)
    const totalBogeys = playerRounds.reduce((s, r) => s + r.bogeys, 0)
    const totalDoubles = playerRounds.reduce((s, r) => s + r.doubleBogeys, 0)
    const totalWorse = playerRounds.reduce((s, r) => s + r.worseThanDouble, 0)

    // SG for this tournament (slight variance from career)
    const sgTournament = sgBase + (rng() - 0.5) * 0.8

    performances.push({
      tournamentId: tournament.id,
      playerId: player.id,
      totalScore: totalStrokes,
      totalToPar,
      round1: rounds[0],
      round2: rounds[1],
      round3: rounds[2],
      round4: rounds[3],
      eagles: totalEagles,
      birdies: totalBirdies,
      pars: totalPars,
      bogeys: totalBogeys,
      doubleBogeys: totalDoubles,
      worseThanDouble: totalWorse,
      sgTotal: Math.round(sgTournament * 100) / 100,
      status: 'ACTIVE',
      _roundScoresForCalc: playerRounds, // temp, used for fantasy calc
    })
  }

  // Sort by totalToPar to assign positions
  performances.sort((a, b) => a.totalToPar - b.totalToPar)

  // Bottom ~8 players get CUT status
  const cutCount = Math.min(8, Math.floor(fieldSize * 0.18))
  for (let i = performances.length - cutCount; i < performances.length; i++) {
    performances[i].status = 'CUT'
    // CUT players only have 2 rounds
    performances[i].round3 = null
    performances[i].round4 = null
    performances[i].totalScore = performances[i].round1 + performances[i].round2
    performances[i].totalToPar = performances[i].totalScore - coursePar * 2
  }

  // Re-sort active players by totalToPar, then cut players at end
  const active = performances.filter((p) => p.status === 'ACTIVE').sort((a, b) => a.totalToPar - b.totalToPar)
  const cut = performances.filter((p) => p.status === 'CUT').sort((a, b) => a.totalToPar - b.totalToPar)

  // Assign positions with ties
  let pos = 1
  for (let i = 0; i < active.length; i++) {
    if (i > 0 && active[i].totalToPar === active[i - 1].totalToPar) {
      active[i].position = active[i - 1].position
      active[i].positionTied = true
      active[i - 1].positionTied = true
    } else {
      active[i].position = pos
    }
    pos++
  }
  // Cut players don't get a position
  for (const p of cut) {
    p.position = null
  }

  const allPerfs = [...active, ...cut]

  // Calculate fantasy points for each performance
  const scoringConfig = getDefaultScoringConfig('standard')
  for (const perf of allPerfs) {
    const perfForCalc = {
      ...perf,
      roundScores: perf._roundScoresForCalc || [],
    }
    const { total } = calculateFantasyPoints(perfForCalc, scoringConfig)
    perf.fantasyPoints = total
    delete perf._roundScoresForCalc
  }

  return { performances: allPerfs, roundScores }
}

/**
 * Generate realistic hole distribution for a round
 */
function generateHoleDistribution(toPar, rng) {
  // Start with a baseline par-level round
  let eagles = 0
  let birdies = 0
  let pars = 14
  let bogeys = 0
  let doubleBogeys = 0
  let worseThanDouble = 0

  // Adjust based on toPar
  if (toPar <= -6) {
    // Exceptional round (-6 or better)
    birdies = 7 + Math.floor(rng() * 2)
    eagles = Math.floor(rng() * 2)
    bogeys = Math.max(0, 1 + Math.floor(rng() * 2) - 1)
  } else if (toPar <= -3) {
    birdies = 4 + Math.floor(rng() * 3)
    eagles = rng() < 0.15 ? 1 : 0
    bogeys = Math.max(0, Math.floor(rng() * 2))
  } else if (toPar <= 0) {
    birdies = 2 + Math.floor(rng() * 3)
    eagles = rng() < 0.05 ? 1 : 0
    bogeys = birdies + eagles - Math.abs(toPar) // balance to hit toPar
    if (bogeys < 0) bogeys = 0
  } else if (toPar <= 3) {
    birdies = 1 + Math.floor(rng() * 2)
    bogeys = 2 + Math.floor(rng() * 3)
    doubleBogeys = rng() < 0.3 ? 1 : 0
  } else {
    // Bad round (+4 or worse)
    birdies = Math.floor(rng() * 2)
    bogeys = 3 + Math.floor(rng() * 3)
    doubleBogeys = 1 + Math.floor(rng() * 2)
    worseThanDouble = rng() < 0.2 ? 1 : 0
  }

  // Ensure it sums to 18 holes and matches toPar
  pars = 18 - eagles - birdies - bogeys - doubleBogeys - worseThanDouble
  if (pars < 0) {
    // Reduce excess
    const excess = -pars
    bogeys = Math.max(0, bogeys - excess)
    pars = 18 - eagles - birdies - bogeys - doubleBogeys - worseThanDouble
  }
  if (pars < 0) pars = 0

  // Verify toPar consistency, adjust birdies/bogeys slightly if needed
  const calcToPar = -2 * eagles - birdies + bogeys + 2 * doubleBogeys + 3 * worseThanDouble
  const diff = toPar - calcToPar
  if (diff > 0 && pars > 0) {
    // Need more over-par: convert pars to bogeys
    const adjust = Math.min(diff, pars)
    bogeys += adjust
    pars -= adjust
  } else if (diff < 0 && pars > 0) {
    // Need more under-par: convert pars to birdies
    const adjust = Math.min(-diff, pars)
    birdies += adjust
    pars -= adjust
  }

  return { eagles, birdies, pars, bogeys, doubleBogeys, worseThanDouble }
}

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

  // Clear dependent data first (order matters for foreign keys)
  console.log('🧹 Clearing existing data...')
  await prisma.holeScore.deleteMany()
  await prisma.roundScore.deleteMany()
  await prisma.performance.deleteMany()
  await prisma.liveScore.deleteMany()
  await prisma.draftPick.deleteMany()
  await prisma.rosterEntry.deleteMany()
  await prisma.playerPrediction.deleteMany()
  await prisma.playerDFSEntry.deleteMany()
  await prisma.playerCourseHistory.deleteMany()
  await prisma.pick.deleteMany()

  // Clear and reseed players
  console.log('🏌️ Seeding players...')
  await prisma.player.deleteMany()
  const dbPlayers = []
  for (const player of players) {
    const created = await prisma.player.create({ data: player })
    dbPlayers.push(created)
  }
  console.log(`   ✅ Created ${players.length} players`)

  // Clear and reseed tournaments
  console.log('🏆 Seeding tournaments...')
  await prisma.tournament.deleteMany()
  const dbTournaments = []
  for (const tournament of tournaments) {
    const created = await prisma.tournament.create({ data: tournament })
    dbTournaments.push(created)
  }
  console.log(`   ✅ Created ${tournaments.length} tournaments`)

  // Generate performance data for COMPLETED tournaments
  console.log('📊 Generating performance data for completed tournaments...')
  const completedTournaments = dbTournaments.filter((t) => t.status === 'COMPLETED')
  let totalPerfs = 0
  let totalRounds = 0

  for (let i = 0; i < completedTournaments.length; i++) {
    const tournament = completedTournaments[i]
    const seed = 42 + i * 1000 // deterministic seed per tournament
    const { performances, roundScores } = generateTournamentPerformances(dbPlayers, tournament, seed)

    // Insert performances
    for (const perf of performances) {
      await prisma.performance.create({ data: perf })
    }
    totalPerfs += performances.length

    // Insert round scores (skip rounds for CUT players after round 2)
    for (const rs of roundScores) {
      const perf = performances.find((p) => p.playerId === rs.playerId)
      if (perf && perf.status === 'CUT' && rs.roundNumber > 2) continue
      await prisma.roundScore.create({ data: rs })
    }
    totalRounds += roundScores.filter((rs) => {
      const perf = performances.find((p) => p.playerId === rs.playerId)
      return !(perf && perf.status === 'CUT' && rs.roundNumber > 2)
    }).length

    const cutCount = performances.filter((p) => p.status === 'CUT').length
    console.log(`   ✅ ${tournament.name}: ${performances.length} players (${cutCount} cuts)`)
  }

  console.log('')
  console.log('✨ Seed complete!')
  console.log(`   - 1 demo user (demo@example.com / password123)`)
  console.log(`   - ${players.length} PGA Tour players`)
  console.log(`   - ${tournaments.length} tournaments (2024-25 season)`)
  console.log(`   - ${totalPerfs} performance records`)
  console.log(`   - ${totalRounds} round score records`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
