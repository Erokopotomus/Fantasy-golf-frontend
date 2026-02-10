/**
 * seedHoleData.js — Derive Hole records from existing HoleScore data
 *
 * For each course with tournament HoleScore data, aggregate the most common
 * par value per hole number (mode). Also compute avg score per hole.
 *
 * Usage: node backend/prisma/seedHoleData.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedHoleData() {
  console.log('🕳️  Deriving Hole records from HoleScore data...\n')

  // Get all courses that have tournaments with HoleScore data
  const coursesWithData = await prisma.$queryRaw`
    SELECT DISTINCT c.id as "courseId", c.name as "courseName"
    FROM courses c
    JOIN tournaments t ON t."courseId" = c.id
    JOIN hole_scores hs ON hs."tournamentId" = t.id
    ORDER BY c.name
  `

  console.log(`Found ${coursesWithData.length} courses with hole score data\n`)

  let totalHoles = 0

  for (const row of coursesWithData) {
    // Get the most common par per hole number for this course
    const holeStats = await prisma.$queryRaw`
      SELECT
        hs."holeNumber",
        hs.par,
        COUNT(*) as cnt
      FROM "hole_scores" hs
      JOIN tournaments t ON hs."tournamentId" = t.id
      WHERE t."courseId" = ${row.courseId}
        AND hs.par IS NOT NULL
        AND hs."holeNumber" BETWEEN 1 AND 18
      GROUP BY hs."holeNumber", hs.par
      ORDER BY hs."holeNumber", cnt DESC
    `

    // Pick the most frequent par for each hole
    const holeParMap = {}
    for (const stat of holeStats) {
      const holeNum = stat.holeNumber
      if (!holeParMap[holeNum]) {
        holeParMap[holeNum] = { par: stat.par, count: Number(stat.cnt) }
      }
    }

    const holeNumbers = Object.keys(holeParMap).map(Number).sort((a, b) => a - b)

    if (holeNumbers.length === 0) continue

    // Upsert each hole
    for (const num of holeNumbers) {
      const { par } = holeParMap[num]
      await prisma.hole.upsert({
        where: {
          courseId_number: {
            courseId: row.courseId,
            number: num,
          },
        },
        update: { par },
        create: {
          courseId: row.courseId,
          number: num,
          par,
        },
      })
      totalHoles++
    }

    console.log(`  ✅ ${row.courseName}: ${holeNumbers.length} holes (par ${holeNumbers.map(n => holeParMap[n].par).join('-')})`)
  }

  console.log(`\n🎯 Created/updated ${totalHoles} hole records across ${coursesWithData.length} courses`)
}

seedHoleData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
