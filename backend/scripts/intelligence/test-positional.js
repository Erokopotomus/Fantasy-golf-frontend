const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/positional')
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
    `Running positional extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}")`
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

  // Verify rows were persisted
  const rows = await prisma.managerCharacteristic.findMany({
    where: {
      userId,
      characteristicType: {
        in: ['r1_position_distribution', 'position_round_profile'],
      },
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
    if (r.characteristicType === 'r1_position_distribution') {
      const picks = r.rawEvidence?.picks || []
      console.log(`  rawEvidence: ${picks.length} R1 picks`)
      if (picks.length > 0) {
        console.log(
          '  sample (first 5):',
          JSON.stringify(picks.slice(0, 5), null, 2)
        )
      }
    } else {
      console.log(
        '  rawEvidence:',
        JSON.stringify(r.rawEvidence, null, 2)
      )
    }
  }

  const ourTypes = new Set([
    'r1_position_distribution',
    'position_round_profile',
  ])
  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNeither positional extractor produced data. Likely cause: no R1 picks resolved on this user, OR position strings were all missing/Other. Investigate.'
    )
    process.exit(1)
  }

  console.log(
    `\npositional smoke passed — ${ourOk.length} of 2 positional extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
