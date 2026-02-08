const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const NFL_TEAMS = [
  { abbreviation: 'ARI', name: 'Arizona Cardinals', city: 'Arizona', conference: 'NFC', division: 'West', primaryColor: '#97233F', secondaryColor: '#000000' },
  { abbreviation: 'ATL', name: 'Atlanta Falcons', city: 'Atlanta', conference: 'NFC', division: 'South', primaryColor: '#A71930', secondaryColor: '#000000' },
  { abbreviation: 'BAL', name: 'Baltimore Ravens', city: 'Baltimore', conference: 'AFC', division: 'North', primaryColor: '#241773', secondaryColor: '#9E7C0C' },
  { abbreviation: 'BUF', name: 'Buffalo Bills', city: 'Buffalo', conference: 'AFC', division: 'East', primaryColor: '#00338D', secondaryColor: '#C60C30' },
  { abbreviation: 'CAR', name: 'Carolina Panthers', city: 'Carolina', conference: 'NFC', division: 'South', primaryColor: '#0085CA', secondaryColor: '#101820' },
  { abbreviation: 'CHI', name: 'Chicago Bears', city: 'Chicago', conference: 'NFC', division: 'North', primaryColor: '#0B162A', secondaryColor: '#C83803' },
  { abbreviation: 'CIN', name: 'Cincinnati Bengals', city: 'Cincinnati', conference: 'AFC', division: 'North', primaryColor: '#FB4F14', secondaryColor: '#000000' },
  { abbreviation: 'CLE', name: 'Cleveland Browns', city: 'Cleveland', conference: 'AFC', division: 'North', primaryColor: '#311D00', secondaryColor: '#FF3C00' },
  { abbreviation: 'DAL', name: 'Dallas Cowboys', city: 'Dallas', conference: 'NFC', division: 'East', primaryColor: '#003594', secondaryColor: '#869397' },
  { abbreviation: 'DEN', name: 'Denver Broncos', city: 'Denver', conference: 'AFC', division: 'West', primaryColor: '#FB4F14', secondaryColor: '#002244' },
  { abbreviation: 'DET', name: 'Detroit Lions', city: 'Detroit', conference: 'NFC', division: 'North', primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  { abbreviation: 'GB',  name: 'Green Bay Packers', city: 'Green Bay', conference: 'NFC', division: 'North', primaryColor: '#203731', secondaryColor: '#FFB612' },
  { abbreviation: 'HOU', name: 'Houston Texans', city: 'Houston', conference: 'AFC', division: 'South', primaryColor: '#03202F', secondaryColor: '#A71930' },
  { abbreviation: 'IND', name: 'Indianapolis Colts', city: 'Indianapolis', conference: 'AFC', division: 'South', primaryColor: '#002C5F', secondaryColor: '#A2AAAD' },
  { abbreviation: 'JAX', name: 'Jacksonville Jaguars', city: 'Jacksonville', conference: 'AFC', division: 'South', primaryColor: '#006778', secondaryColor: '#9F792C' },
  { abbreviation: 'KC',  name: 'Kansas City Chiefs', city: 'Kansas City', conference: 'AFC', division: 'West', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  { abbreviation: 'LV',  name: 'Las Vegas Raiders', city: 'Las Vegas', conference: 'AFC', division: 'West', primaryColor: '#000000', secondaryColor: '#A5ACAF' },
  { abbreviation: 'LAC', name: 'Los Angeles Chargers', city: 'Los Angeles', conference: 'AFC', division: 'West', primaryColor: '#0080C6', secondaryColor: '#FFC20E' },
  { abbreviation: 'LAR', name: 'Los Angeles Rams', city: 'Los Angeles', conference: 'NFC', division: 'West', primaryColor: '#003594', secondaryColor: '#FFA300' },
  { abbreviation: 'MIA', name: 'Miami Dolphins', city: 'Miami', conference: 'AFC', division: 'East', primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  { abbreviation: 'MIN', name: 'Minnesota Vikings', city: 'Minnesota', conference: 'NFC', division: 'North', primaryColor: '#4F2683', secondaryColor: '#FFC62F' },
  { abbreviation: 'NE',  name: 'New England Patriots', city: 'New England', conference: 'AFC', division: 'East', primaryColor: '#002244', secondaryColor: '#C60C30' },
  { abbreviation: 'NO',  name: 'New Orleans Saints', city: 'New Orleans', conference: 'NFC', division: 'South', primaryColor: '#D3BC8D', secondaryColor: '#101820' },
  { abbreviation: 'NYG', name: 'New York Giants', city: 'New York', conference: 'NFC', division: 'East', primaryColor: '#0B2265', secondaryColor: '#A71930' },
  { abbreviation: 'NYJ', name: 'New York Jets', city: 'New York', conference: 'AFC', division: 'East', primaryColor: '#125740', secondaryColor: '#000000' },
  { abbreviation: 'PHI', name: 'Philadelphia Eagles', city: 'Philadelphia', conference: 'NFC', division: 'East', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  { abbreviation: 'PIT', name: 'Pittsburgh Steelers', city: 'Pittsburgh', conference: 'AFC', division: 'North', primaryColor: '#FFB612', secondaryColor: '#101820' },
  { abbreviation: 'SF',  name: 'San Francisco 49ers', city: 'San Francisco', conference: 'NFC', division: 'West', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
  { abbreviation: 'SEA', name: 'Seattle Seahawks', city: 'Seattle', conference: 'NFC', division: 'West', primaryColor: '#002244', secondaryColor: '#69BE28' },
  { abbreviation: 'TB',  name: 'Tampa Bay Buccaneers', city: 'Tampa Bay', conference: 'NFC', division: 'South', primaryColor: '#D50A0A', secondaryColor: '#34302B' },
  { abbreviation: 'TEN', name: 'Tennessee Titans', city: 'Tennessee', conference: 'AFC', division: 'South', primaryColor: '#0C2340', secondaryColor: '#4B92DB' },
  { abbreviation: 'WAS', name: 'Washington Commanders', city: 'Washington', conference: 'NFC', division: 'East', primaryColor: '#5A1414', secondaryColor: '#FFB612' },
]

async function seed() {
  console.log('Seeding 32 NFL teams...')

  for (const team of NFL_TEAMS) {
    await prisma.nflTeam.upsert({
      where: { abbreviation: team.abbreviation },
      update: { name: team.name, city: team.city, conference: team.conference, division: team.division, primaryColor: team.primaryColor, secondaryColor: team.secondaryColor },
      create: team,
    })
  }

  console.log(`Done: ${NFL_TEAMS.length} NFL teams seeded.`)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
