/**
 * Seed Course Profiles — Importance weights for ~40 PGA Tour venues
 *
 * Values represent how much each SG component matters at the course (0-1 scale).
 * Sum of all 4 values should be ~1.0 for each course.
 *
 * Based on course characteristics: fairway width, green complexity, rough severity,
 * green speed, course length, and historical SG correlations.
 *
 * Usage: node prisma/seedCourseProfiles.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COURSE_PROFILES = [
  // Majors
  { name: 'Augusta National', driving: 0.30, approach: 0.30, aroundGreen: 0.25, putting: 0.15 },
  { name: 'Southern Hills', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Royal Liverpool', driving: 0.20, approach: 0.30, aroundGreen: 0.25, putting: 0.25 },
  { name: 'Royal Troon', driving: 0.20, approach: 0.30, aroundGreen: 0.25, putting: 0.25 },
  { name: 'Pinehurst No. 2', driving: 0.20, approach: 0.30, aroundGreen: 0.30, putting: 0.20 },
  { name: 'Valhalla', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'Oakmont', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Bethpage Black', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'Pebble Beach Golf Links', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Shinnecock Hills', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Winged Foot', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Quail Hollow', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },

  // Signature / Playoff Events
  { name: 'TPC Sawgrass', driving: 0.20, approach: 0.35, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Riviera', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Bay Hill', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'TPC Scottsdale', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Muirfield Village', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'East Lake', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'TPC Southwind', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Caves Valley', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },

  // Regular Tour Stops
  { name: 'Torrey Pines South', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'Torrey Pines North', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Waialae', driving: 0.20, approach: 0.30, aroundGreen: 0.20, putting: 0.30 },
  { name: 'Plantation Course at Kapalua', driving: 0.35, approach: 0.25, aroundGreen: 0.15, putting: 0.25 },
  { name: 'TPC Summerlin', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Harbour Town', driving: 0.15, approach: 0.35, aroundGreen: 0.25, putting: 0.25 },
  { name: 'TPC San Antonio', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'Sedgefield', driving: 0.20, approach: 0.30, aroundGreen: 0.25, putting: 0.25 },
  { name: 'TPC Twin Cities', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Detroit Golf Club', driving: 0.20, approach: 0.30, aroundGreen: 0.20, putting: 0.30 },
  { name: 'TPC Craig Ranch', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'Colonial', driving: 0.20, approach: 0.35, aroundGreen: 0.25, putting: 0.20 },
  { name: 'TPC River Highlands', driving: 0.20, approach: 0.30, aroundGreen: 0.20, putting: 0.30 },
  { name: 'Silverado', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
  { name: 'TPC Deere Run', driving: 0.20, approach: 0.30, aroundGreen: 0.20, putting: 0.30 },
  { name: 'Castle Pines', driving: 0.30, approach: 0.30, aroundGreen: 0.20, putting: 0.20 },
  { name: 'Olympia Fields', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'TPC Harding Park', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Spyglass Hill', driving: 0.25, approach: 0.30, aroundGreen: 0.25, putting: 0.20 },
  { name: 'Monterey Peninsula', driving: 0.25, approach: 0.30, aroundGreen: 0.20, putting: 0.25 },
]

async function seed() {
  console.log('[Seed] Seeding course profiles...')

  let matched = 0
  let skipped = 0

  for (const profile of COURSE_PROFILES) {
    // Fuzzy match by name (contains, case-insensitive)
    const courses = await prisma.course.findMany({
      where: {
        name: { contains: profile.name, mode: 'insensitive' },
      },
    })

    if (courses.length === 0) {
      // Also try matching tournament location (courses may not exist yet)
      skipped++
      continue
    }

    for (const course of courses) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          drivingImportance: profile.driving,
          approachImportance: profile.approach,
          aroundGreenImportance: profile.aroundGreen,
          puttingImportance: profile.putting,
        },
      })
      matched++
      console.log(`  Updated: ${course.name}`)
    }
  }

  console.log(`[Seed] Course profiles done: ${matched} updated, ${skipped} not found in DB`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
