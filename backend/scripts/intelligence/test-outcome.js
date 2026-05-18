const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/outcome')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Pick a user who has at least one HistoricalSeason with finalStanding set.
  // Most owner-linked seasons will have it (it's a fundamental field every
  // importer surfaces).
  let candidate = await prisma.historicalSeason.findFirst({
    where: {
      ownerUserId: { not: null },
      finalStanding: { not: null },
    },
    select: {
      ownerUserId: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  if (!candidate) {
    candidate = await prisma.historicalSeason.findFirst({
      where: { ownerUserId: { not: null } },
      select: {
        ownerUserId: true,
        leagueId: true,
        seasonYear: true,
        ownerName: true,
        import: { select: { sourcePlatform: true } },
      },
    })
  }

  if (!candidate) {
    console.log('No imported user found in DB. Smoke test skipped.')
    process.exit(0)
  }

  const userId = candidate.ownerUserId
  console.log(
    `Running outcome extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}", platform ${candidate.import?.sourcePlatform || 'unknown'})`
  )

  const result = await runForUser(userId)
  console.log('\n=== Result ===')
  console.log('OK:', JSON.stringify(result.ok, null, 2))
  console.log('Failed:', JSON.stringify(result.failed, null, 2))
  console.log('Skipped:', JSON.stringify(result.skipped, null, 2))

  if (result.failed.length > 0) {
    console.error('\nSome extractors failed — investigate the errors above')
    process.exit(1)
  }

  const ourTypes = new Set([
    'finish_volatility',
    'championship_rate',
    'playoff_rate',
    'career_trajectory_slope',
  ])

  const rows = await prisma.managerCharacteristic.findMany({
    where: {
      userId,
      characteristicType: { in: [...ourTypes] },
    },
    select: {
      characteristicType: true,
      value: true,
      confidenceLabel: true,
      confidenceScore: true,
      sampleSize: true,
      consistencyPct: true,
      effectSize: true,
      rawEvidence: true,
    },
  })

  console.log('\n=== Persisted rows ===')
  for (const r of rows) {
    console.log(`\n--- ${r.characteristicType} ---`)
    console.log('  label:', r.confidenceLabel)
    console.log('  score:', r.confidenceScore)
    console.log('  sampleSize:', r.sampleSize)
    console.log('  consistencyPct:', r.consistencyPct)
    console.log('  effectSize:', r.effectSize)
    console.log('  value:', JSON.stringify(r.value, null, 2))
    const perSeason = r.rawEvidence?.perSeason || []
    if (perSeason.length > 0) {
      console.log(`  perSeason: ${perSeason.length} seasons`)
      console.log(
        '  sample (first 3):',
        JSON.stringify(perSeason.slice(0, 3), null, 2)
      )
    }
    const championshipSeasons = r.rawEvidence?.championshipSeasons
    if (Array.isArray(championshipSeasons)) {
      console.log(
        `  championshipSeasons: ${championshipSeasons.length}`,
        JSON.stringify(championshipSeasons, null, 2)
      )
    }
    const playoffSeasons = r.rawEvidence?.playoffSeasons
    if (Array.isArray(playoffSeasons)) {
      console.log(`  playoffSeasons: ${playoffSeasons.length}`)
      console.log(
        '  sample (first 5):',
        JSON.stringify(playoffSeasons.slice(0, 5), null, 2)
      )
    }
    const dataPoints = r.rawEvidence?.dataPoints
    if (Array.isArray(dataPoints)) {
      console.log(
        `  dataPoints: ${dataPoints.length}`,
        JSON.stringify(dataPoints, null, 2)
      )
    }
    if (r.rawEvidence?.normalizationNote) {
      console.log('  normalizationNote:', r.rawEvidence.normalizationNote)
    }
    if (r.rawEvidence?.definitionNote) {
      console.log('  definitionNote:', r.rawEvidence.definitionNote)
    }
    if (r.rawEvidence?.baselineRate != null) {
      console.log('  baselineRate:', r.rawEvidence.baselineRate)
      console.log('  avgLeagueSize:', r.rawEvidence.avgLeagueSize)
    }
  }

  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNo outcome extractor produced data. Likely causes:\n' +
        '  - User has <2 HistoricalSeason rows with finalStanding.\n' +
        '  - User has <2 classifiable playoffResult values (rate extractors).\n' +
        '  - User has <3 finalStanding rows (career_trajectory_slope).\n'
    )
    process.exit(1)
  }

  console.log(
    `\noutcome smoke passed — ${ourOk.length} of 4 outcome extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
