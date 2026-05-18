const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/auction')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Prefer a user who actually has auction draft data (Eric's primary use case
  // is auction). Fall back to any imported user if no auction data found.
  let candidate = await prisma.historicalSeason.findFirst({
    where: {
      ownerUserId: { not: null },
      AND: [
        { draftData: { not: null } },
        { draftData: { path: ['type'], equals: 'auction' } },
      ],
    },
    select: {
      ownerUserId: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
    },
  })

  if (!candidate) {
    // Fallback: any season — extractors will simply return null if no auction.
    candidate = await prisma.historicalSeason.findFirst({
      where: { ownerUserId: { not: null }, draftData: { not: null } },
      select: {
        ownerUserId: true,
        leagueId: true,
        seasonYear: true,
        ownerName: true,
      },
    })
  }

  if (!candidate) {
    console.log(
      'No imported user with draftData found in DB. Smoke test skipped.'
    )
    process.exit(0)
  }

  const userId = candidate.ownerUserId
  console.log(
    `Running auction extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}")`
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

  const ourTypes = new Set([
    'auction_overpay_rate',
    'auction_bargain_rate',
    'auction_spend_concentration',
  ])

  // Verify rows were persisted
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

    if (r.characteristicType === 'auction_spend_concentration') {
      const perDraft = r.rawEvidence?.perDraft || []
      console.log(`  rawEvidence: ${perDraft.length} drafts contributing`)
      if (perDraft.length > 0) {
        console.log(
          '  sample (first 2):',
          JSON.stringify(perDraft.slice(0, 2), null, 2)
        )
      }
    } else {
      const sample = r.rawEvidence?.sample || []
      console.log(`  rawEvidence: ${sample.length} sample picks`)
      console.log('  tiers summary:', JSON.stringify(r.rawEvidence?.tiers, null, 2))
      if (sample.length > 0) {
        console.log(
          '  sample (first 5):',
          JSON.stringify(sample.slice(0, 5), null, 2)
        )
      }
    }
  }

  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNone of the three auction extractors produced data. Likely causes: user has no auction draft data, OR no ADP coverage on any pick (overpay/bargain need ADP; concentration does not — if concentration ALSO skipped, the user truly has no qualifying auction picks).'
    )
    process.exit(1)
  }

  console.log(
    `\nauction smoke passed — ${ourOk.length} of 3 auction extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
