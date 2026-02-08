/**
 * Comprehensive Course Seed — Full course records for ~40+ PGA Tour venues
 *
 * Creates or updates Course records with name, location, specs, architect,
 * and importance weights. Idempotent — safe to run multiple times.
 *
 * Usage: node prisma/seedCourseData.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COURSES = [
  // ─── Majors ───────────────────────────────────────────────────────────────
  {
    name: 'Augusta National Golf Club',
    nickname: 'Augusta National',
    city: 'Augusta', state: 'GA', country: 'United States',
    par: 72, yardage: 7545, grassType: 'Bentgrass/Bermuda', architect: 'Alister MacKenzie & Bobby Jones', yearBuilt: 1933, elevation: 400,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.15,
  },
  {
    name: 'Southern Hills Country Club',
    nickname: 'Southern Hills',
    city: 'Tulsa', state: 'OK', country: 'United States',
    par: 70, yardage: 7556, grassType: 'Bermuda/Zoysia', architect: 'Perry Maxwell', yearBuilt: 1936, elevation: 700,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Royal Liverpool Golf Club',
    nickname: 'Hoylake',
    city: 'Hoylake', state: 'Merseyside', country: 'England',
    par: 72, yardage: 7370, grassType: 'Fescue', architect: 'Jack Morris & George Morris', yearBuilt: 1869, elevation: 30,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.25,
  },
  {
    name: 'Royal Troon Golf Club',
    nickname: 'Royal Troon',
    city: 'Troon', state: 'South Ayrshire', country: 'Scotland',
    par: 71, yardage: 7385, grassType: 'Fescue', architect: 'Willie Fernie', yearBuilt: 1878, elevation: 20,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.25,
  },
  {
    name: 'Pinehurst Resort & Country Club (No. 2)',
    nickname: 'Pinehurst No. 2',
    city: 'Pinehurst', state: 'NC', country: 'United States',
    par: 72, yardage: 7588, grassType: 'Bermuda/Wiregrass', architect: 'Donald Ross', yearBuilt: 1907, elevation: 560,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.30, puttingImportance: 0.20,
  },
  {
    name: 'Valhalla Golf Club',
    nickname: 'Valhalla',
    city: 'Louisville', state: 'KY', country: 'United States',
    par: 72, yardage: 7700, grassType: 'Bentgrass', architect: 'Jack Nicklaus', yearBuilt: 1986, elevation: 550,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Oakmont Country Club',
    nickname: 'Oakmont',
    city: 'Oakmont', state: 'PA', country: 'United States',
    par: 70, yardage: 7255, grassType: 'Bentgrass/Poa annua', architect: 'Henry Fownes', yearBuilt: 1903, elevation: 1000,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Bethpage State Park (Black Course)',
    nickname: 'Bethpage Black',
    city: 'Farmingdale', state: 'NY', country: 'United States',
    par: 71, yardage: 7468, grassType: 'Bentgrass/Poa annua', architect: 'A.W. Tillinghast', yearBuilt: 1936, elevation: 100,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Pebble Beach Golf Links',
    nickname: 'Pebble Beach',
    city: 'Pebble Beach', state: 'CA', country: 'United States',
    par: 72, yardage: 7075, grassType: 'Poa annua', architect: 'Jack Neville & Douglas Grant', yearBuilt: 1919, elevation: 80,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Shinnecock Hills Golf Club',
    nickname: 'Shinnecock Hills',
    city: 'Southampton', state: 'NY', country: 'United States',
    par: 70, yardage: 7445, grassType: 'Fescue/Bentgrass', architect: 'William Flynn', yearBuilt: 1891, elevation: 50,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Winged Foot Golf Club (West)',
    nickname: 'Winged Foot',
    city: 'Mamaroneck', state: 'NY', country: 'United States',
    par: 72, yardage: 7477, grassType: 'Bentgrass/Poa annua', architect: 'A.W. Tillinghast', yearBuilt: 1923, elevation: 200,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Quail Hollow Club',
    nickname: 'Quail Hollow',
    city: 'Charlotte', state: 'NC', country: 'United States',
    par: 72, yardage: 7600, grassType: 'Bermuda', architect: 'George Cobb', yearBuilt: 1961, elevation: 650,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },

  // ─── Signature / Playoff / Elevated Events ────────────────────────────────
  {
    name: 'TPC Sawgrass (Stadium Course)',
    nickname: 'TPC Sawgrass',
    city: 'Ponte Vedra Beach', state: 'FL', country: 'United States',
    par: 72, yardage: 7256, grassType: 'Bermuda', architect: 'Pete Dye', yearBuilt: 1980, elevation: 15,
    drivingImportance: 0.20, approachImportance: 0.35, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Riviera Country Club',
    nickname: 'Riviera',
    city: 'Pacific Palisades', state: 'CA', country: 'United States',
    par: 71, yardage: 7322, grassType: 'Kikuyu/Poa annua', architect: 'George C. Thomas Jr.', yearBuilt: 1927, elevation: 300,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Bay Hill Club & Lodge',
    nickname: 'Bay Hill',
    city: 'Orlando', state: 'FL', country: 'United States',
    par: 72, yardage: 7466, grassType: 'Bermuda', architect: 'Dick Wilson', yearBuilt: 1961, elevation: 100,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'TPC Scottsdale (Stadium Course)',
    nickname: 'TPC Scottsdale',
    city: 'Scottsdale', state: 'AZ', country: 'United States',
    par: 71, yardage: 7261, grassType: 'Bermuda/Ryegrass', architect: 'Tom Weiskopf & Jay Morrish', yearBuilt: 1986, elevation: 1500,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Muirfield Village Golf Club',
    nickname: 'Muirfield Village',
    city: 'Dublin', state: 'OH', country: 'United States',
    par: 72, yardage: 7533, grassType: 'Bentgrass', architect: 'Jack Nicklaus & Desmond Muirhead', yearBuilt: 1974, elevation: 900,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'East Lake Golf Club',
    nickname: 'East Lake',
    city: 'Atlanta', state: 'GA', country: 'United States',
    par: 72, yardage: 7346, grassType: 'Bermuda', architect: 'Donald Ross', yearBuilt: 1904, elevation: 1000,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'TPC Southwind',
    nickname: 'TPC Southwind',
    city: 'Memphis', state: 'TN', country: 'United States',
    par: 70, yardage: 7244, grassType: 'Bermuda', architect: 'Ron Prichard', yearBuilt: 1988, elevation: 330,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Caves Valley Golf Club',
    nickname: 'Caves Valley',
    city: 'Owings Mills', state: 'MD', country: 'United States',
    par: 72, yardage: 7542, grassType: 'Bentgrass', architect: 'Tom Fazio', yearBuilt: 1991, elevation: 600,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },

  // ─── Regular Tour Stops ────────────────────────────────────────────────────
  {
    name: 'Torrey Pines Golf Course (South)',
    nickname: 'Torrey Pines South',
    city: 'La Jolla', state: 'CA', country: 'United States',
    par: 72, yardage: 7765, grassType: 'Kikuyu/Poa annua', architect: 'William Bell / Rees Jones', yearBuilt: 1957, elevation: 350,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Waialae Country Club',
    nickname: 'Waialae',
    city: 'Honolulu', state: 'HI', country: 'United States',
    par: 70, yardage: 7044, grassType: 'Bermuda', architect: 'Seth Raynor', yearBuilt: 1927, elevation: 20,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.30,
  },
  {
    name: 'Plantation Course at Kapalua',
    nickname: 'Kapalua Plantation',
    city: 'Kapalua', state: 'HI', country: 'United States',
    par: 73, yardage: 7596, grassType: 'Paspalum/Bermuda', architect: 'Ben Crenshaw & Bill Coore', yearBuilt: 1991, elevation: 600,
    drivingImportance: 0.35, approachImportance: 0.25, aroundGreenImportance: 0.15, puttingImportance: 0.25,
  },
  {
    name: 'TPC Summerlin',
    nickname: 'TPC Summerlin',
    city: 'Las Vegas', state: 'NV', country: 'United States',
    par: 72, yardage: 7255, grassType: 'Bermuda/Ryegrass', architect: 'Bobby Weed', yearBuilt: 1991, elevation: 2800,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Harbour Town Golf Links',
    nickname: 'Harbour Town',
    city: 'Hilton Head Island', state: 'SC', country: 'United States',
    par: 71, yardage: 7188, grassType: 'Bermuda/Paspalum', architect: 'Pete Dye & Jack Nicklaus', yearBuilt: 1969, elevation: 10,
    drivingImportance: 0.15, approachImportance: 0.35, aroundGreenImportance: 0.25, puttingImportance: 0.25,
  },
  {
    name: 'TPC San Antonio (Oaks Course)',
    nickname: 'TPC San Antonio',
    city: 'San Antonio', state: 'TX', country: 'United States',
    par: 72, yardage: 7522, grassType: 'Bermuda', architect: 'Greg Norman & Sergio Garcia', yearBuilt: 2010, elevation: 1000,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Sedgefield Country Club',
    nickname: 'Sedgefield',
    city: 'Greensboro', state: 'NC', country: 'United States',
    par: 70, yardage: 7131, grassType: 'Bermuda', architect: 'Donald Ross', yearBuilt: 1926, elevation: 830,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.25,
  },
  {
    name: 'TPC Twin Cities',
    nickname: 'TPC Twin Cities',
    city: 'Blaine', state: 'MN', country: 'United States',
    par: 71, yardage: 7431, grassType: 'Bentgrass', architect: 'Arnold Palmer', yearBuilt: 2000, elevation: 880,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Detroit Golf Club',
    nickname: 'Detroit Golf Club',
    city: 'Detroit', state: 'MI', country: 'United States',
    par: 72, yardage: 7370, grassType: 'Bentgrass/Poa annua', architect: 'Donald Ross', yearBuilt: 1916, elevation: 630,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.30,
  },
  {
    name: 'TPC Craig Ranch',
    nickname: 'TPC Craig Ranch',
    city: 'McKinney', state: 'TX', country: 'United States',
    par: 72, yardage: 7468, grassType: 'Bermuda', architect: 'Tom Weiskopf', yearBuilt: 2004, elevation: 600,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Colonial Country Club',
    nickname: 'Colonial',
    city: 'Fort Worth', state: 'TX', country: 'United States',
    par: 70, yardage: 7204, grassType: 'Bermuda', architect: 'John Bredemus / Perry Maxwell', yearBuilt: 1936, elevation: 650,
    drivingImportance: 0.20, approachImportance: 0.35, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'TPC River Highlands',
    nickname: 'TPC River Highlands',
    city: 'Cromwell', state: 'CT', country: 'United States',
    par: 70, yardage: 6841, grassType: 'Bentgrass', architect: 'Pete Dye', yearBuilt: 1928, elevation: 50,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.30,
  },
  {
    name: 'Silverado Resort (North Course)',
    nickname: 'Silverado',
    city: 'Napa', state: 'CA', country: 'United States',
    par: 72, yardage: 7203, grassType: 'Bentgrass/Poa annua', architect: 'Robert Trent Jones Jr.', yearBuilt: 1955, elevation: 300,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'TPC Deere Run',
    nickname: 'TPC Deere Run',
    city: 'Silvis', state: 'IL', country: 'United States',
    par: 71, yardage: 7289, grassType: 'Bentgrass', architect: 'D.A. Weibring', yearBuilt: 2000, elevation: 600,
    drivingImportance: 0.20, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.30,
  },
  {
    name: 'Castle Pines Golf Club',
    nickname: 'Castle Pines',
    city: 'Castle Rock', state: 'CO', country: 'United States',
    par: 72, yardage: 7559, grassType: 'Bentgrass/Bluegrass', architect: 'Jack Nicklaus', yearBuilt: 1981, elevation: 6200,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Olympia Fields Country Club (North)',
    nickname: 'Olympia Fields',
    city: 'Olympia Fields', state: 'IL', country: 'United States',
    par: 70, yardage: 7366, grassType: 'Bentgrass', architect: 'Willie Park Jr.', yearBuilt: 1915, elevation: 720,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'TPC Harding Park',
    nickname: 'TPC Harding Park',
    city: 'San Francisco', state: 'CA', country: 'United States',
    par: 72, yardage: 7251, grassType: 'Bentgrass/Poa annua', architect: 'Willie Watson / Jack Fleming', yearBuilt: 1925, elevation: 200,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Spyglass Hill Golf Course',
    nickname: 'Spyglass Hill',
    city: 'Pebble Beach', state: 'CA', country: 'United States',
    par: 72, yardage: 7041, grassType: 'Poa annua', architect: 'Robert Trent Jones Sr.', yearBuilt: 1966, elevation: 200,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Monterey Peninsula Country Club (Shore Course)',
    nickname: 'Monterey Peninsula',
    city: 'Pebble Beach', state: 'CA', country: 'United States',
    par: 71, yardage: 6958, grassType: 'Poa annua', architect: 'Seth Raynor / Rees Jones', yearBuilt: 1926, elevation: 100,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Torrey Pines Golf Course (North)',
    nickname: 'Torrey Pines North',
    city: 'La Jolla', state: 'CA', country: 'United States',
    par: 72, yardage: 7258, grassType: 'Kikuyu/Poa annua', architect: 'William Bell', yearBuilt: 1957, elevation: 350,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.25,
  },
  {
    name: 'Copperhead Course at Innisbrook',
    nickname: 'Copperhead',
    city: 'Palm Harbor', state: 'FL', country: 'United States',
    par: 71, yardage: 7340, grassType: 'Bermuda', architect: 'Larry Packard', yearBuilt: 1972, elevation: 60,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
  {
    name: 'Congaree Golf Club',
    nickname: 'Congaree',
    city: 'Ridgeland', state: 'SC', country: 'United States',
    par: 71, yardage: 7655, grassType: 'Bermuda/Paspalum', architect: 'Tom Fazio', yearBuilt: 2018, elevation: 30,
    drivingImportance: 0.30, approachImportance: 0.30, aroundGreenImportance: 0.20, puttingImportance: 0.20,
  },
  {
    name: 'Aronimink Golf Club',
    nickname: 'Aronimink',
    city: 'Newtown Square', state: 'PA', country: 'United States',
    par: 70, yardage: 7267, grassType: 'Bentgrass', architect: 'Donald Ross', yearBuilt: 1928, elevation: 350,
    drivingImportance: 0.25, approachImportance: 0.30, aroundGreenImportance: 0.25, puttingImportance: 0.20,
  },
]

async function seed() {
  console.log('[Seed] Seeding comprehensive course data...')

  let created = 0
  let updated = 0

  for (const course of COURSES) {
    // Case-insensitive search by name
    const existing = await prisma.course.findFirst({
      where: { name: { equals: course.name, mode: 'insensitive' } },
    })

    // Also try matching by nickname
    let match = existing
    if (!match && course.nickname) {
      match = await prisma.course.findFirst({
        where: { name: { contains: course.nickname, mode: 'insensitive' } },
      })
    }

    const data = {
      name: course.name,
      nickname: course.nickname || null,
      city: course.city || null,
      state: course.state || null,
      country: course.country || null,
      par: course.par || null,
      yardage: course.yardage || null,
      grassType: course.grassType || null,
      architect: course.architect || null,
      yearBuilt: course.yearBuilt || null,
      elevation: course.elevation || null,
      drivingImportance: course.drivingImportance || null,
      approachImportance: course.approachImportance || null,
      aroundGreenImportance: course.aroundGreenImportance || null,
      puttingImportance: course.puttingImportance || null,
    }

    if (match) {
      await prisma.course.update({ where: { id: match.id }, data })
      updated++
      console.log(`  Updated: ${course.name}`)
    } else {
      await prisma.course.create({ data })
      created++
      console.log(`  Created: ${course.name}`)
    }
  }

  console.log(`[Seed] Course data done: ${created} created, ${updated} updated, ${COURSES.length} total`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
