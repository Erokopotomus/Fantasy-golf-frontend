/**
 * Seed Course Coordinates — Lat/Lon for ~40 PGA Tour venues
 *
 * Same pattern as seedCourseProfiles.js — fuzzy match by course name and update.
 *
 * Usage: node prisma/seedCourseCoordinates.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COURSE_COORDINATES = [
  // Majors
  { name: 'Augusta National', lat: 33.5030, lon: -82.0215 },
  { name: 'Southern Hills', lat: 36.0800, lon: -95.9435 },
  { name: 'Royal Liverpool', lat: 53.3800, lon: -3.1905 },
  { name: 'Royal Troon', lat: 55.5380, lon: -4.6545 },
  { name: 'Pinehurst No. 2', lat: 35.1905, lon: -79.4669 },
  { name: 'Valhalla', lat: 38.2547, lon: -85.4980 },
  { name: 'Oakmont', lat: 40.5275, lon: -79.8275 },
  { name: 'Bethpage Black', lat: 40.7420, lon: -73.4550 },
  { name: 'Pebble Beach Golf Links', lat: 36.5680, lon: -121.9500 },
  { name: 'Shinnecock Hills', lat: 40.8930, lon: -72.4430 },
  { name: 'Winged Foot', lat: 41.0560, lon: -73.7880 },
  { name: 'Quail Hollow', lat: 35.1075, lon: -80.8475 },

  // Signature / Playoff Events
  { name: 'TPC Sawgrass', lat: 30.1970, lon: -81.3945 },
  { name: 'Riviera', lat: 34.0490, lon: -118.5040 },
  { name: 'Bay Hill', lat: 28.4605, lon: -81.5065 },
  { name: 'TPC Scottsdale', lat: 33.6420, lon: -111.9240 },
  { name: 'Muirfield Village', lat: 40.1175, lon: -83.1070 },
  { name: 'East Lake', lat: 33.7430, lon: -84.3205 },
  { name: 'TPC Southwind', lat: 35.0430, lon: -89.8060 },
  { name: 'Caves Valley', lat: 39.4255, lon: -76.7765 },

  // Regular Tour Stops
  { name: 'Torrey Pines South', lat: 32.8990, lon: -117.2520 },
  { name: 'Torrey Pines North', lat: 32.9015, lon: -117.2500 },
  { name: 'Waialae', lat: 21.2770, lon: -157.7630 },
  { name: 'Plantation Course at Kapalua', lat: 21.0030, lon: -156.6625 },
  { name: 'TPC Summerlin', lat: 36.1640, lon: -115.2965 },
  { name: 'Harbour Town', lat: 32.1340, lon: -80.8160 },
  { name: 'TPC San Antonio', lat: 29.5170, lon: -98.6215 },
  { name: 'Sedgefield', lat: 36.0650, lon: -79.8210 },
  { name: 'TPC Twin Cities', lat: 44.8575, lon: -93.4480 },
  { name: 'Detroit Golf Club', lat: 42.4050, lon: -83.1325 },
  { name: 'TPC Craig Ranch', lat: 33.1130, lon: -96.7860 },
  { name: 'Colonial', lat: 32.7360, lon: -97.3615 },
  { name: 'TPC River Highlands', lat: 41.6490, lon: -72.6610 },
  { name: 'Silverado', lat: 38.3280, lon: -122.2990 },
  { name: 'TPC Deere Run', lat: 41.4650, lon: -90.4205 },
  { name: 'Castle Pines', lat: 39.4590, lon: -104.8975 },
  { name: 'Olympia Fields', lat: 41.5180, lon: -87.6980 },
  { name: 'TPC Harding Park', lat: 37.7265, lon: -122.4935 },
  { name: 'Spyglass Hill', lat: 36.5815, lon: -121.9495 },
  { name: 'Monterey Peninsula', lat: 36.5850, lon: -121.9320 },
]

async function seed() {
  console.log('[Seed] Seeding course coordinates...')

  let matched = 0
  let skipped = 0

  for (const coord of COURSE_COORDINATES) {
    const courses = await prisma.course.findMany({
      where: {
        name: { contains: coord.name, mode: 'insensitive' },
      },
    })

    if (courses.length === 0) {
      skipped++
      continue
    }

    for (const course of courses) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          latitude: coord.lat,
          longitude: coord.lon,
        },
      })
      matched++
      console.log(`  Updated: ${course.name} → (${coord.lat}, ${coord.lon})`)
    }
  }

  console.log(`[Seed] Course coordinates done: ${matched} updated, ${skipped} not found in DB`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
