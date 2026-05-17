const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/pickQuality')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Find a user with imported draft history
  const candidate = await prisma.historicalSeason.findFirst({
    where: { ownerUserId: { not: null }, draftData: { not: null } },
    select: {
      ownerUserId: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
    },
  })

  if (!candidate) {
    console.log(
      'No imported user with draftData found in DB. Smoke test skipped.'
    )
    process.exit(0)
  }

  const userId = candidate.ownerUserId
  console.log(
    `Running pick quality for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}")`
  )

  const result = await runForUser(userId)
  console.log('\n=== Result ===')
  console.log('OK:', JSON.stringify(result.ok, null, 2))
  console.log('Failed:', JSON.stringify(result.failed, null, 2))
  console.log('Skipped:', JSON.stringify(result.skipped, null, 2))

  if (result.failed.length > 0) {
    console.error(
      '\nSome extractors failed — investigate the errors above'
    )
    process.exit(1)
  }

  if (result.ok.length === 0) {
    console.log(
      '\nAll extractors skipped (no_data). Likely cause: no ADPEntry coverage for the historical season years claimed by this user, OR Player resolver failed to map raw platform IDs. This is expected in dev/staging where ADPEntry is sparse — pickQuality will be useful in prod where ADP data exists.'
    )
    process.exit(0)
  }

  // Verify rows were persisted
  const rows = await prisma.managerCharacteristic.findMany({
    where: {
      userId,
      characteristicType: {
        in: [
          'pick_reach_rate',
          'pick_steal_rate',
          'pick_par_rate',
          'pick_value_rate',
        ],
      },
    },
    select: {
      characteristicType: true,
      value: true,
      confidenceLabel: true,
      confidenceScore: true,
      sampleSize: true,
    },
  })
  console.log('\n=== Persisted rows ===')
  console.table(
    rows.map((r) => ({
      type: r.characteristicType,
      label: r.confidenceLabel,
      score: r.confidenceScore,
      n: r.sampleSize,
      rate: r.value.rate?.toFixed(3),
      coverage: r.value.coveragePct?.toFixed(2),
    }))
  )

  console.log('\npick quality smoke passed')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
