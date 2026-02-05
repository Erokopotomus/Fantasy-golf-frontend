const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Sample player data
const players = [
  { name: 'Scottie Scheffler', country: 'USA', countryFlag: '🇺🇸', rank: 1, owgr: 12.50, sgTotal: 2.45, sgPutting: 0.35, sgApproach: 1.10, sgOffTee: 0.55 },
  { name: 'Rory McIlroy', country: 'NIR', countryFlag: '🇬🇧', rank: 2, owgr: 9.80, sgTotal: 2.10, sgPutting: 0.20, sgApproach: 0.95, sgOffTee: 0.65 },
  { name: 'Jon Rahm', country: 'ESP', countryFlag: '🇪🇸', rank: 3, owgr: 8.50, sgTotal: 1.95, sgPutting: 0.15, sgApproach: 0.90, sgOffTee: 0.60 },
  { name: 'Viktor Hovland', country: 'NOR', countryFlag: '🇳🇴', rank: 4, owgr: 7.20, sgTotal: 1.80, sgPutting: -0.10, sgApproach: 1.05, sgOffTee: 0.55 },
  { name: 'Patrick Cantlay', country: 'USA', countryFlag: '🇺🇸', rank: 5, owgr: 6.80, sgTotal: 1.70, sgPutting: 0.40, sgApproach: 0.85, sgOffTee: 0.25 },
  { name: 'Xander Schauffele', country: 'USA', countryFlag: '🇺🇸', rank: 6, owgr: 6.50, sgTotal: 1.65, sgPutting: 0.30, sgApproach: 0.80, sgOffTee: 0.35 },
  { name: 'Collin Morikawa', country: 'USA', countryFlag: '🇺🇸', rank: 7, owgr: 6.20, sgTotal: 1.55, sgPutting: 0.10, sgApproach: 1.00, sgOffTee: 0.25 },
  { name: 'Ludvig Åberg', country: 'SWE', countryFlag: '🇸🇪', rank: 8, owgr: 5.90, sgTotal: 1.50, sgPutting: 0.05, sgApproach: 0.85, sgOffTee: 0.40 },
  { name: 'Wyndham Clark', country: 'USA', countryFlag: '🇺🇸', rank: 9, owgr: 5.60, sgTotal: 1.45, sgPutting: 0.25, sgApproach: 0.70, sgOffTee: 0.30 },
  { name: 'Matt Fitzpatrick', country: 'ENG', countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 10, owgr: 5.30, sgTotal: 1.40, sgPutting: 0.35, sgApproach: 0.75, sgOffTee: 0.10 },
  { name: 'Tommy Fleetwood', country: 'ENG', countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 11, owgr: 5.10, sgTotal: 1.35, sgPutting: 0.20, sgApproach: 0.70, sgOffTee: 0.25 },
  { name: 'Hideki Matsuyama', country: 'JPN', countryFlag: '🇯🇵', rank: 12, owgr: 4.90, sgTotal: 1.30, sgPutting: 0.00, sgApproach: 0.85, sgOffTee: 0.25 },
  { name: 'Max Homa', country: 'USA', countryFlag: '🇺🇸', rank: 13, owgr: 4.70, sgTotal: 1.25, sgPutting: 0.15, sgApproach: 0.65, sgOffTee: 0.25 },
  { name: 'Tony Finau', country: 'USA', countryFlag: '🇺🇸', rank: 14, owgr: 4.50, sgTotal: 1.20, sgPutting: 0.10, sgApproach: 0.60, sgOffTee: 0.30 },
  { name: 'Sahith Theegala', country: 'USA', countryFlag: '🇺🇸', rank: 15, owgr: 4.30, sgTotal: 1.15, sgPutting: 0.25, sgApproach: 0.55, sgOffTee: 0.15 },
  { name: 'Brian Harman', country: 'USA', countryFlag: '🇺🇸', rank: 16, owgr: 4.10, sgTotal: 1.10, sgPutting: 0.45, sgApproach: 0.50, sgOffTee: -0.05 },
  { name: 'Tyrrell Hatton', country: 'ENG', countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 17, owgr: 3.90, sgTotal: 1.05, sgPutting: 0.20, sgApproach: 0.55, sgOffTee: 0.10 },
  { name: 'Russell Henley', country: 'USA', countryFlag: '🇺🇸', rank: 18, owgr: 3.70, sgTotal: 1.00, sgPutting: 0.30, sgApproach: 0.45, sgOffTee: 0.05 },
  { name: 'Justin Thomas', country: 'USA', countryFlag: '🇺🇸', rank: 19, owgr: 3.50, sgTotal: 0.95, sgPutting: 0.10, sgApproach: 0.50, sgOffTee: 0.15 },
  { name: 'Jordan Spieth', country: 'USA', countryFlag: '🇺🇸', rank: 20, owgr: 3.30, sgTotal: 0.90, sgPutting: 0.35, sgApproach: 0.40, sgOffTee: -0.05 },
  { name: 'Cameron Young', country: 'USA', countryFlag: '🇺🇸', rank: 21, owgr: 3.20, sgTotal: 0.88, sgPutting: -0.15, sgApproach: 0.55, sgOffTee: 0.28 },
  { name: 'Sungjae Im', country: 'KOR', countryFlag: '🇰🇷', rank: 22, owgr: 3.10, sgTotal: 0.85, sgPutting: 0.15, sgApproach: 0.45, sgOffTee: 0.05 },
  { name: 'Shane Lowry', country: 'IRL', countryFlag: '🇮🇪', rank: 23, owgr: 3.00, sgTotal: 0.82, sgPutting: 0.25, sgApproach: 0.40, sgOffTee: -0.03 },
  { name: 'Si Woo Kim', country: 'KOR', countryFlag: '🇰🇷', rank: 24, owgr: 2.90, sgTotal: 0.80, sgPutting: 0.10, sgApproach: 0.45, sgOffTee: 0.05 },
  { name: 'Keegan Bradley', country: 'USA', countryFlag: '🇺🇸', rank: 25, owgr: 2.80, sgTotal: 0.78, sgPutting: 0.20, sgApproach: 0.35, sgOffTee: 0.03 },
]

// Sample tournaments
const tournaments = [
  { name: 'The Masters', course: 'Augusta National', location: 'Augusta, GA', startDate: new Date('2026-04-09'), endDate: new Date('2026-04-12'), purse: 20000000, status: 'UPCOMING' },
  { name: 'PGA Championship', course: 'Valhalla Golf Club', location: 'Louisville, KY', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-17'), purse: 17500000, status: 'UPCOMING' },
  { name: 'U.S. Open', course: 'Oakmont Country Club', location: 'Oakmont, PA', startDate: new Date('2026-06-18'), endDate: new Date('2026-06-21'), purse: 21500000, status: 'UPCOMING' },
  { name: 'The Open Championship', course: 'Royal Portrush', location: 'Northern Ireland', startDate: new Date('2026-07-16'), endDate: new Date('2026-07-19'), purse: 17000000, status: 'UPCOMING' },
  { name: 'The Players Championship', course: 'TPC Sawgrass', location: 'Ponte Vedra Beach, FL', startDate: new Date('2026-03-12'), endDate: new Date('2026-03-15'), purse: 25000000, status: 'IN_PROGRESS', currentRound: 2 },
]

async function main() {
  console.log('Seeding database...')

  // Create demo user
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
  console.log('Created demo user:', demoUser.email)

  // Create players
  for (const player of players) {
    await prisma.player.upsert({
      where: { name: player.name },
      update: player,
      create: player
    })
  }
  console.log(`Created ${players.length} players`)

  // Create tournaments
  for (const tournament of tournaments) {
    await prisma.tournament.upsert({
      where: { name: tournament.name },
      update: tournament,
      create: tournament
    })
  }
  console.log(`Created ${tournaments.length} tournaments`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
