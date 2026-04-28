/**
 * One-off: create Trump National Doral (Blue Monster) course and link it to
 * the Cadillac Championship tournament so the Golf hub card renders properly.
 *
 * Run: node backend/scripts/add-cadillac-course.js
 */
const prisma = require('../src/lib/prisma')

const COURSE_EXTERNAL_ID = 'trump-national-doral-blue-monster'
const COURSE_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/d/da/DoralGolfResortNovember2010.jpg'

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { name: { contains: 'Cadillac', mode: 'insensitive' } },
    select: { id: true, name: true, startDate: true, courseId: true },
  })

  if (tournaments.length === 0) {
    console.error('No tournament found matching "Cadillac".')
    process.exit(1)
  }

  console.log(`Found ${tournaments.length} matching tournament(s):`)
  tournaments.forEach((t) =>
    console.log(`  - ${t.name} (${t.startDate.toISOString().slice(0, 10)}) courseId=${t.courseId || 'null'}`)
  )

  const course = await prisma.course.upsert({
    where: { externalId: COURSE_EXTERNAL_ID },
    update: {
      imageUrl: COURSE_IMAGE_URL,
    },
    create: {
      externalId: COURSE_EXTERNAL_ID,
      name: 'Trump National Doral',
      nickname: 'Blue Monster',
      city: 'Doral',
      state: 'FL',
      country: 'USA',
      timezone: 'America/New_York',
      par: 72,
      yardage: 7590,
      grassType: 'Bermuda',
      architect: 'Dick Wilson (1962); Gil Hanse renovation (2014)',
      yearBuilt: 1962,
      latitude: 25.8194,
      longitude: -80.3404,
      imageUrl: COURSE_IMAGE_URL,
    },
  })

  console.log(`\nCourse upserted: ${course.name} — ${course.nickname} (id=${course.id})`)
  console.log(`Image: ${course.imageUrl}`)

  const updates = await Promise.all(
    tournaments.map((t) =>
      prisma.tournament.update({
        where: { id: t.id },
        data: { courseId: course.id },
        select: { id: true, name: true, courseId: true },
      })
    )
  )

  console.log('\nLinked tournaments:')
  updates.forEach((t) => console.log(`  - ${t.name} → courseId=${t.courseId}`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
