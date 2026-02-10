/**
 * Course History Aggregator
 *
 * Aggregates Performance + RoundScore data into PlayerCourseHistory records.
 * These power the "Top Performers" table on CourseDetail and the Tournament Preview field analysis.
 */

async function aggregateAllCourseHistory(prisma) {
  console.log('[CourseHistory] Starting full aggregation...')

  // Get all (playerId, courseId) pairs with actual round data (not just field entries)
  const pairs = await prisma.$queryRaw`
    SELECT DISTINCT p."playerId", t."courseId"
    FROM performances p
    JOIN tournaments t ON t.id = p."tournamentId"
    WHERE t."courseId" IS NOT NULL
      AND p."round1" IS NOT NULL
  `

  if (pairs.length === 0) {
    console.log('[CourseHistory] No player-course pairs found')
    return { aggregated: 0 }
  }

  console.log(`[CourseHistory] Found ${pairs.length} player-course pairs`)

  // Batch aggregate using raw SQL for efficiency
  const stats = await prisma.$queryRaw`
    SELECT
      p."playerId",
      t."courseId",
      COUNT(DISTINCT p.id)::int as tournaments,
      COALESCE(SUM(
        CASE WHEN p."round1" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round2" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round3" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round4" IS NOT NULL THEN 1 ELSE 0 END
      ), 0)::int as rounds,
      ROUND(AVG(p."totalScore")::numeric, 2) as "avgScore",
      ROUND(AVG(p."totalToPar")::numeric, 2) as "avgToPar",
      MIN(CASE WHEN p.position IS NOT NULL AND p.status = 'ACTIVE' THEN p.position END) as "bestFinish",
      SUM(CASE WHEN p.position = 1 AND p.status = 'ACTIVE' THEN 1 ELSE 0 END)::int as wins,
      SUM(CASE WHEN p.position IS NOT NULL AND p.position <= 10 AND p.status = 'ACTIVE' THEN 1 ELSE 0 END)::int as top10s,
      COUNT(DISTINCT p.id)::int as cuts,
      SUM(CASE WHEN p.status = 'ACTIVE' OR p."round3" IS NOT NULL THEN 1 ELSE 0 END)::int as "cutsMade",
      ROUND(AVG(p."sgTotal")::numeric, 3) as "sgTotal",
      ROUND(AVG(p."sgPutting")::numeric, 3) as "sgPutting",
      ROUND(AVG(p."sgApproach")::numeric, 3) as "sgApproach",
      ROUND(AVG(p."sgOffTee")::numeric, 3) as "sgOffTee",
      MAX(t."endDate") as "lastPlayed"
    FROM performances p
    JOIN tournaments t ON t.id = p."tournamentId"
    WHERE t."courseId" IS NOT NULL
      AND p."round1" IS NOT NULL
    GROUP BY p."playerId", t."courseId"
  `

  let aggregated = 0

  // Batch upsert in chunks of 100
  const chunkSize = 100
  for (let i = 0; i < stats.length; i += chunkSize) {
    const chunk = stats.slice(i, i + chunkSize)
    const operations = chunk.map(s => prisma.playerCourseHistory.upsert({
      where: {
        playerId_courseId: {
          playerId: s.playerId,
          courseId: s.courseId,
        },
      },
      create: {
        playerId: s.playerId,
        courseId: s.courseId,
        rounds: s.rounds || 0,
        avgScore: s.avgScore ? parseFloat(s.avgScore) : null,
        avgToPar: s.avgToPar ? parseFloat(s.avgToPar) : null,
        bestFinish: s.bestFinish,
        wins: s.wins || 0,
        top10s: s.top10s || 0,
        cuts: s.cuts || 0,
        cutsMade: s.cutsMade || 0,
        sgTotal: s.sgTotal ? parseFloat(s.sgTotal) : null,
        sgPutting: s.sgPutting ? parseFloat(s.sgPutting) : null,
        sgApproach: s.sgApproach ? parseFloat(s.sgApproach) : null,
        sgOffTee: s.sgOffTee ? parseFloat(s.sgOffTee) : null,
        lastPlayed: s.lastPlayed,
      },
      update: {
        rounds: s.rounds || 0,
        avgScore: s.avgScore ? parseFloat(s.avgScore) : null,
        avgToPar: s.avgToPar ? parseFloat(s.avgToPar) : null,
        bestFinish: s.bestFinish,
        wins: s.wins || 0,
        top10s: s.top10s || 0,
        cuts: s.cuts || 0,
        cutsMade: s.cutsMade || 0,
        sgTotal: s.sgTotal ? parseFloat(s.sgTotal) : null,
        sgPutting: s.sgPutting ? parseFloat(s.sgPutting) : null,
        sgApproach: s.sgApproach ? parseFloat(s.sgApproach) : null,
        sgOffTee: s.sgOffTee ? parseFloat(s.sgOffTee) : null,
        lastPlayed: s.lastPlayed,
      },
    }))
    await prisma.$transaction(operations)
    aggregated += chunk.length
  }

  console.log(`[CourseHistory] Done: ${aggregated} records upserted`)
  return { aggregated }
}

async function aggregateForCourse(courseId, prisma) {
  console.log(`[CourseHistory] Aggregating for course ${courseId}`)

  const stats = await prisma.$queryRaw`
    SELECT
      p."playerId",
      COUNT(DISTINCT p.id)::int as tournaments,
      COALESCE(SUM(
        CASE WHEN p."round1" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round2" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round3" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p."round4" IS NOT NULL THEN 1 ELSE 0 END
      ), 0)::int as rounds,
      ROUND(AVG(p."totalScore")::numeric, 2) as "avgScore",
      ROUND(AVG(p."totalToPar")::numeric, 2) as "avgToPar",
      MIN(CASE WHEN p.position IS NOT NULL AND p.status = 'ACTIVE' THEN p.position END) as "bestFinish",
      SUM(CASE WHEN p.position = 1 AND p.status = 'ACTIVE' THEN 1 ELSE 0 END)::int as wins,
      SUM(CASE WHEN p.position IS NOT NULL AND p.position <= 10 AND p.status = 'ACTIVE' THEN 1 ELSE 0 END)::int as top10s,
      COUNT(DISTINCT p.id)::int as cuts,
      SUM(CASE WHEN p.status = 'ACTIVE' OR p."round3" IS NOT NULL THEN 1 ELSE 0 END)::int as "cutsMade",
      ROUND(AVG(p."sgTotal")::numeric, 3) as "sgTotal",
      ROUND(AVG(p."sgPutting")::numeric, 3) as "sgPutting",
      ROUND(AVG(p."sgApproach")::numeric, 3) as "sgApproach",
      ROUND(AVG(p."sgOffTee")::numeric, 3) as "sgOffTee",
      MAX(t."endDate") as "lastPlayed"
    FROM performances p
    JOIN tournaments t ON t.id = p."tournamentId"
    WHERE t."courseId" = ${courseId}
      AND p."round1" IS NOT NULL
    GROUP BY p."playerId"
  `

  let aggregated = 0
  for (const s of stats) {
    await prisma.playerCourseHistory.upsert({
      where: {
        playerId_courseId: {
          playerId: s.playerId,
          courseId,
        },
      },
      create: {
        playerId: s.playerId,
        courseId,
        rounds: s.rounds || 0,
        avgScore: s.avgScore ? parseFloat(s.avgScore) : null,
        avgToPar: s.avgToPar ? parseFloat(s.avgToPar) : null,
        bestFinish: s.bestFinish,
        wins: s.wins || 0,
        top10s: s.top10s || 0,
        cuts: s.cuts || 0,
        cutsMade: s.cutsMade || 0,
        sgTotal: s.sgTotal ? parseFloat(s.sgTotal) : null,
        sgPutting: s.sgPutting ? parseFloat(s.sgPutting) : null,
        sgApproach: s.sgApproach ? parseFloat(s.sgApproach) : null,
        sgOffTee: s.sgOffTee ? parseFloat(s.sgOffTee) : null,
        lastPlayed: s.lastPlayed,
      },
      update: {
        rounds: s.rounds || 0,
        avgScore: s.avgScore ? parseFloat(s.avgScore) : null,
        avgToPar: s.avgToPar ? parseFloat(s.avgToPar) : null,
        bestFinish: s.bestFinish,
        wins: s.wins || 0,
        top10s: s.top10s || 0,
        cuts: s.cuts || 0,
        cutsMade: s.cutsMade || 0,
        sgTotal: s.sgTotal ? parseFloat(s.sgTotal) : null,
        sgPutting: s.sgPutting ? parseFloat(s.sgPutting) : null,
        sgApproach: s.sgApproach ? parseFloat(s.sgApproach) : null,
        sgOffTee: s.sgOffTee ? parseFloat(s.sgOffTee) : null,
        lastPlayed: s.lastPlayed,
      },
    })
    aggregated++
  }

  console.log(`[CourseHistory] Course ${courseId}: ${aggregated} records upserted`)
  return { aggregated }
}

module.exports = { aggregateAllCourseHistory, aggregateForCourse }
